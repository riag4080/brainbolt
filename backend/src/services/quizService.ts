import { query, getClient } from '../config/database';
import redisClient, { getCacheKey, CACHE_TTL, invalidateCache } from '../config/redis';
import {
  calculateAdaptiveDifficulty,
  shouldDecayStreak,
  getDifficultyRange,
  UserState,
} from './adaptiveAlgorithm';

interface Question {
  id: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  correctAnswerHash: string;
  tags: string[];
}

export async function getUserState(userId: string): Promise<UserState> {
  const cacheKey = getCacheKey.userState(userId);
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  const result = await query(
    `SELECT * FROM user_state WHERE user_id = $1`,
    [userId]
  );

  let userState: UserState;

  if (result.rows.length === 0) {
    const insertResult = await query(
      `INSERT INTO user_state (user_id, current_difficulty, streak, max_streak, total_score, total_questions, correct_answers, difficulty_momentum, consecutive_correct, consecutive_wrong, state_version)
       VALUES ($1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       RETURNING *`,
      [userId]
    );
    userState = mapRowToUserState(insertResult.rows[0]);
  } else {
    userState = mapRowToUserState(result.rows[0]);

    if (shouldDecayStreak(result.rows[0].last_answer_at)) {
      userState.streak = 0;
      await query(
        `UPDATE user_state SET streak = 0 WHERE user_id = $1`,
        [userId]
      );
    }
  }

  await redisClient.setEx(cacheKey, CACHE_TTL.USER_STATE, JSON.stringify(userState));

  return userState;
}

function mapRowToUserState(row: any): UserState {
  return {
    userId: row.user_id,
    currentDifficulty: row.current_difficulty,
    streak: row.streak,
    maxStreak: row.max_streak,
    totalScore: parseFloat(row.total_score),
    totalQuestions: row.total_questions,
    correctAnswers: row.correct_answers,
    difficultyMomentum: parseFloat(row.difficulty_momentum),
    consecutiveCorrect: row.consecutive_correct,
    consecutiveWrong: row.consecutive_wrong,
    stateVersion: row.state_version,
  };
}

export async function getNextQuestion(
  userId: string,
  sessionId: string
): Promise<{
  question: Question;
  userState: UserState;
  sessionId: string;
}> {
  const userState = await getUserState(userId);
  const difficultyRange = getDifficultyRange(userState.currentDifficulty);

  const cacheKey = getCacheKey.questionPool(userState.currentDifficulty);
  let questions: Question[] = [];

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    questions = JSON.parse(cached);
  } else {
    const result = await query(
      `SELECT id, difficulty, prompt, choices, correct_answer_hash, tags
       FROM questions
       WHERE difficulty = ANY($1)
       ORDER BY RANDOM()
       LIMIT 20`,
      [difficultyRange]
    );

    questions = result.rows.map((row: any) => ({
      id: row.id,
      difficulty: row.difficulty,
      prompt: row.prompt,
      choices: row.choices,
      correctAnswerHash: row.correct_answer_hash,
      tags: row.tags || [],
    }));

    await redisClient.setEx(cacheKey, CACHE_TTL.QUESTION_POOL, JSON.stringify(questions));
  }

  if (questions.length === 0) {
    throw new Error('No questions available for current difficulty');
  }

  const question = questions[Math.floor(Math.random() * questions.length)];

  return {
    question,
    userState,
    sessionId,
  };
}

export async function submitAnswer(
  userId: string,
  sessionId: string,
  questionId: string,
  answer: string,
  stateVersion: number,
  idempotencyKey: string
): Promise<{
  correct: boolean;
  newDifficulty: number;
  newStreak: number;
  scoreDelta: number;
  totalScore: number;
  stateVersion: number;
  leaderboardRankScore: number;
  leaderboardRankStreak: number;
}> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const idempotencyCheck = await client.query(
      `SELECT * FROM answer_log WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (idempotencyCheck.rows.length > 0) {
      // FIX: Return actual totalScore from user_state, not just scoreDelta
      const cached = idempotencyCheck.rows[0];
      await client.query('COMMIT');

      const currentStateResult = await query(
        `SELECT total_score, state_version FROM user_state WHERE user_id = $1`,
        [userId]
      );
      const actualTotalScore = parseFloat(currentStateResult.rows[0]?.total_score || '0');
      const actualStateVersion = parseInt(currentStateResult.rows[0]?.state_version || '0');

      const ranks = await getLeaderboardRanks(userId);

      return {
        correct: cached.correct,
        newDifficulty: cached.difficulty,
        newStreak: cached.streak_at_answer,
        scoreDelta: parseFloat(cached.score_delta),
        totalScore: actualTotalScore,
        stateVersion: actualStateVersion,
        leaderboardRankScore: ranks.scoreRank,
        leaderboardRankStreak: ranks.streakRank,
      };
    }

    const stateResult = await client.query(
      `SELECT * FROM user_state WHERE user_id = $1 AND state_version = $2 FOR UPDATE`,
      [userId, stateVersion]
    );

    if (stateResult.rows.length === 0) {
      throw new Error('State version mismatch - please retry');
    }

    const currentState = mapRowToUserState(stateResult.rows[0]);

    const questionResult = await client.query(
      `SELECT difficulty, correct_answer_hash FROM questions WHERE id = $1`,
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      throw new Error('Question not found');
    }

    const question = questionResult.rows[0];
    const isCorrect = question.correct_answer_hash === answer;

    // FIX: Pass currentState.currentDifficulty (user's level), NOT question.difficulty
    // question.difficulty can be ±1 of user level (from getDifficultyRange pool)
    // The adaptive algorithm must update the USER's level, not the question's level
    const adaptiveResult = calculateAdaptiveDifficulty(
      currentState,
      isCorrect,
      currentState.currentDifficulty   // ← FIXED: was question.difficulty
    );

    const newTotalScore = currentState.totalScore + adaptiveResult.scoreDelta;
    const newCorrectAnswers = isCorrect ? currentState.correctAnswers + 1 : currentState.correctAnswers;
    const newMaxStreak = Math.max(currentState.maxStreak, adaptiveResult.newStreak);
    const newStateVersion = currentState.stateVersion + 1;

    await client.query(
      `UPDATE user_state
       SET current_difficulty = $1,
           streak = $2,
           max_streak = $3,
           total_score = $4,
           total_questions = total_questions + 1,
           correct_answers = $5,
           last_question_id = $6,
           last_answer_at = NOW(),
           state_version = $7,
           difficulty_momentum = $8,
           consecutive_correct = $9,
           consecutive_wrong = $10
       WHERE user_id = $11`,
      [
        adaptiveResult.newDifficulty,
        adaptiveResult.newStreak,
        newMaxStreak,
        newTotalScore,
        newCorrectAnswers,
        questionId,
        newStateVersion,
        adaptiveResult.newMomentum,
        adaptiveResult.newConsecutiveCorrect,
        adaptiveResult.newConsecutiveWrong,
        userId,
      ]
    );

    await client.query(
      `INSERT INTO answer_log (user_id, question_id, difficulty, answer, correct, score_delta, streak_at_answer, idempotency_key, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        questionId,
        question.difficulty,
        answer,
        isCorrect,
        adaptiveResult.scoreDelta,
        adaptiveResult.newStreak,   // FIX: log the new streak (post-answer), not old
        idempotencyKey,
        sessionId,
      ]
    );

    await updateLeaderboards(client, userId, newTotalScore, newMaxStreak, adaptiveResult.newStreak);

    await client.query('COMMIT');

    await invalidateCache.userState(userId);
    await invalidateCache.leaderboards();
    await invalidateCache.userRanks(userId);

    const ranks = await getLeaderboardRanks(userId);

    return {
      correct: isCorrect,
      newDifficulty: adaptiveResult.newDifficulty,
      newStreak: adaptiveResult.newStreak,
      scoreDelta: adaptiveResult.scoreDelta,
      totalScore: newTotalScore,
      stateVersion: newStateVersion,
      leaderboardRankScore: ranks.scoreRank,
      leaderboardRankStreak: ranks.streakRank,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateLeaderboards(
  client: any,
  userId: string,
  totalScore: number,
  maxStreak: number,
  currentStreak: number
) {
  const userResult = await client.query(
    `SELECT username FROM users WHERE id = $1`,
    [userId]
  );
  const username = userResult.rows[0]?.username || 'Unknown';

  const stateResult = await client.query(
    `SELECT total_questions, correct_answers FROM user_state WHERE user_id = $1`,
    [userId]
  );
  const accuracy = stateResult.rows[0].total_questions > 0
    ? (stateResult.rows[0].correct_answers / stateResult.rows[0].total_questions) * 100
    : 0;

  await client.query(
    `INSERT INTO leaderboard_score (user_id, username, total_score, total_questions, accuracy)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET total_score = $3, total_questions = $4, accuracy = $5, updated_at = NOW()`,
    [userId, username, totalScore, stateResult.rows[0].total_questions, accuracy]
  );

  await client.query(
    `INSERT INTO leaderboard_streak (user_id, username, max_streak, current_streak)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET max_streak = $3, current_streak = $4, updated_at = NOW()`,
    [userId, username, maxStreak, currentStreak]
  );
}

async function getLeaderboardRanks(userId: string): Promise<{
  scoreRank: number;
  streakRank: number;
}> {
  const scoreRankResult = await query(
    `SELECT COUNT(*) + 1 as rank
     FROM leaderboard_score
     WHERE total_score > (SELECT total_score FROM leaderboard_score WHERE user_id = $1)`,
    [userId]
  );

  const streakRankResult = await query(
    // FIX: Rank by current_streak (live leaderboard requirement)
    `SELECT COUNT(*) + 1 as rank
     FROM leaderboard_streak
     WHERE current_streak > (SELECT current_streak FROM leaderboard_streak WHERE user_id = $1)`,
    [userId]
  );

  return {
    scoreRank: parseInt(scoreRankResult.rows[0]?.rank || '0'),
    streakRank: parseInt(streakRankResult.rows[0]?.rank || '0'),
  };
}

export async function getUserMetrics(userId: string) {
  const cacheKey = getCacheKey.userMetrics(userId);
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const userState = await getUserState(userId);

  const histogramResult = await query(
    `SELECT difficulty, COUNT(*) as count
     FROM answer_log
     WHERE user_id = $1
     GROUP BY difficulty
     ORDER BY difficulty`,
    [userId]
  );

  const recentResult = await query(
    `SELECT correct, difficulty, answered_at
     FROM answer_log
     WHERE user_id = $1
     ORDER BY answered_at DESC
     LIMIT 10`,
    [userId]
  );

  const accuracy = userState.totalQuestions > 0
    ? (userState.correctAnswers / userState.totalQuestions) * 100
    : 0;

  const metrics = {
    currentDifficulty: userState.currentDifficulty,
    streak: userState.streak,
    maxStreak: userState.maxStreak,
    totalScore: userState.totalScore,
    accuracy: Math.round(accuracy * 100) / 100,
    totalQuestions: userState.totalQuestions,
    correctAnswers: userState.correctAnswers,
    difficultyHistogram: histogramResult.rows,
    recentPerformance: recentResult.rows,
  };

  await redisClient.setEx(cacheKey, CACHE_TTL.USER_METRICS, JSON.stringify(metrics));

  return metrics;
}

export async function getLeaderboard(
  type: 'score' | 'streak',
  limit: number = 100,
  userId?: string
) {
  const cacheKey = type === 'score' 
    ? getCacheKey.leaderboardScore() 
    : getCacheKey.leaderboardStreak();

  const cached = await redisClient.get(cacheKey);
  let leaderboard;

  if (cached) {
    leaderboard = JSON.parse(cached);
  } else {
    const query_text = type === 'score'
      ? `SELECT user_id, username, total_score as score, accuracy, total_questions
         FROM leaderboard_score
         ORDER BY total_score DESC
         LIMIT $1`
      // FIX: Assignment requires "current user streak" leaderboard.
      // Show current_streak as primary score, max_streak as secondary info.
      // Rank by current_streak DESC (live leaderboard), then max_streak as tiebreak.
      : `SELECT user_id, username, current_streak as score, max_streak
         FROM leaderboard_streak
         WHERE current_streak > 0
         ORDER BY current_streak DESC, max_streak DESC
         LIMIT $1`;

    const result = await query(query_text, [limit]);
    leaderboard = result.rows;

    await redisClient.setEx(cacheKey, CACHE_TTL.LEADERBOARD, JSON.stringify(leaderboard));
  }

  let userRank = null;
  if (userId) {
    const ranks = await getLeaderboardRanks(userId);
    userRank = type === 'score' ? ranks.scoreRank : ranks.streakRank;
  }

  return {
    leaderboard,
    userRank,
  };
}
