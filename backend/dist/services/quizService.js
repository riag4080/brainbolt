"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserState = getUserState;
exports.getNextQuestion = getNextQuestion;
exports.submitAnswer = submitAnswer;
exports.getUserMetrics = getUserMetrics;
exports.getLeaderboard = getLeaderboard;
const database_1 = require("../config/database");
const redis_1 = __importStar(require("../config/redis"));
const adaptiveAlgorithm_1 = require("./adaptiveAlgorithm");
async function getUserState(userId) {
    const cacheKey = redis_1.getCacheKey.userState(userId);
    const cached = await redis_1.default.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const result = await (0, database_1.query)(`SELECT * FROM user_state WHERE user_id = $1`, [userId]);
    let userState;
    if (result.rows.length === 0) {
        const insertResult = await (0, database_1.query)(`INSERT INTO user_state (user_id, current_difficulty, streak, max_streak, total_score, total_questions, correct_answers, difficulty_momentum, consecutive_correct, consecutive_wrong, state_version)
       VALUES ($1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       RETURNING *`, [userId]);
        userState = mapRowToUserState(insertResult.rows[0]);
    }
    else {
        userState = mapRowToUserState(result.rows[0]);
        if ((0, adaptiveAlgorithm_1.shouldDecayStreak)(result.rows[0].last_answer_at)) {
            userState.streak = 0;
            await (0, database_1.query)(`UPDATE user_state SET streak = 0 WHERE user_id = $1`, [userId]);
        }
    }
    await redis_1.default.setEx(cacheKey, redis_1.CACHE_TTL.USER_STATE, JSON.stringify(userState));
    return userState;
}
function mapRowToUserState(row) {
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
async function getNextQuestion(userId, sessionId) {
    const userState = await getUserState(userId);
    const difficultyRange = (0, adaptiveAlgorithm_1.getDifficultyRange)(userState.currentDifficulty);
    const cacheKey = redis_1.getCacheKey.questionPool(userState.currentDifficulty);
    let questions = [];
    const cached = await redis_1.default.get(cacheKey);
    if (cached) {
        questions = JSON.parse(cached);
    }
    else {
        const result = await (0, database_1.query)(`SELECT id, difficulty, prompt, choices, correct_answer_hash, tags
       FROM questions
       WHERE difficulty = ANY($1)
       ORDER BY RANDOM()
       LIMIT 20`, [difficultyRange]);
        questions = result.rows.map((row) => ({
            id: row.id,
            difficulty: row.difficulty,
            prompt: row.prompt,
            choices: row.choices,
            correctAnswerHash: row.correct_answer_hash,
            tags: row.tags || [],
        }));
        await redis_1.default.setEx(cacheKey, redis_1.CACHE_TTL.QUESTION_POOL, JSON.stringify(questions));
    }
    if (questions.length === 0) {
        throw new Error('No questions available for current difficulty');
    }
    // FIX: Exclude last question to prevent same question repeating
    const filtered = userState.lastQuestionId
        ? questions.filter(q => q.id !== userState.lastQuestionId)
        : questions;
    const pool = filtered.length > 0 ? filtered : questions;
    const question = pool[Math.floor(Math.random() * pool.length)];
    return {
        question,
        userState,
        sessionId,
    };
}
async function submitAnswer(userId, sessionId, questionId, answer, stateVersion, idempotencyKey) {
    const client = await (0, database_1.getClient)();
    try {
        await client.query('BEGIN');
        const idempotencyCheck = await client.query(`SELECT * FROM answer_log WHERE idempotency_key = $1`, [idempotencyKey]);
        if (idempotencyCheck.rows.length > 0) {
            const cached = idempotencyCheck.rows[0];
            await client.query('COMMIT');
            const ranks = await getLeaderboardRanks(userId);
            return {
                correct: cached.correct,
                newDifficulty: cached.difficulty,
                newStreak: cached.correct ? cached.streak_at_answer + 1 : 0,
                scoreDelta: parseFloat(cached.score_delta),
                totalScore: parseFloat(cached.score_delta),
                stateVersion: stateVersion + 1,
                leaderboardRankScore: ranks.scoreRank,
                leaderboardRankStreak: ranks.streakRank,
            };
        }
        const stateResult = await client.query(`SELECT * FROM user_state WHERE user_id = $1 AND state_version = $2 FOR UPDATE`, [userId, stateVersion]);
        if (stateResult.rows.length === 0) {
            throw new Error('State version mismatch - please retry');
        }
        const currentState = mapRowToUserState(stateResult.rows[0]);
        const questionResult = await client.query(`SELECT difficulty, correct_answer_hash FROM questions WHERE id = $1`, [questionId]);
        if (questionResult.rows.length === 0) {
            throw new Error('Question not found');
        }
        const question = questionResult.rows[0];
        const isCorrect = question.correct_answer_hash === answer;
        const adaptiveResult = (0, adaptiveAlgorithm_1.calculateAdaptiveDifficulty)(currentState, isCorrect, question.difficulty);
        const newTotalScore = currentState.totalScore + adaptiveResult.scoreDelta;
        const newCorrectAnswers = isCorrect ? currentState.correctAnswers + 1 : currentState.correctAnswers;
        const newMaxStreak = Math.max(currentState.maxStreak, adaptiveResult.newStreak);
        const newStateVersion = currentState.stateVersion + 1;
        await client.query(`UPDATE user_state
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
       WHERE user_id = $11`, [
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
        ]);
        await client.query(`INSERT INTO answer_log (user_id, question_id, difficulty, answer, correct, score_delta, streak_at_answer, idempotency_key, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            userId,
            questionId,
            question.difficulty,
            answer,
            isCorrect,
            adaptiveResult.scoreDelta,
            currentState.streak,
            idempotencyKey,
            sessionId,
        ]);
        await updateLeaderboards(client, userId, newTotalScore, newMaxStreak, adaptiveResult.newStreak);
        await client.query('COMMIT');
        await redis_1.invalidateCache.userState(userId);
        await redis_1.invalidateCache.leaderboards();
        await redis_1.invalidateCache.userRanks(userId);
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function updateLeaderboards(client, userId, totalScore, maxStreak, currentStreak) {
    const userResult = await client.query(`SELECT username FROM users WHERE id = $1`, [userId]);
    const username = userResult.rows[0]?.username || 'Unknown';
    const stateResult = await client.query(`SELECT total_questions, correct_answers FROM user_state WHERE user_id = $1`, [userId]);
    const accuracy = stateResult.rows[0].total_questions > 0
        ? (stateResult.rows[0].correct_answers / stateResult.rows[0].total_questions) * 100
        : 0;
    await client.query(`INSERT INTO leaderboard_score (user_id, username, total_score, total_questions, accuracy)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET total_score = $3, total_questions = $4, accuracy = $5, updated_at = NOW()`, [userId, username, totalScore, stateResult.rows[0].total_questions, accuracy]);
    await client.query(`INSERT INTO leaderboard_streak (user_id, username, max_streak, current_streak)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET max_streak = $3, current_streak = $4, updated_at = NOW()`, [userId, username, maxStreak, currentStreak]);
}
async function getLeaderboardRanks(userId) {
    const scoreRankResult = await (0, database_1.query)(`SELECT COUNT(*) + 1 as rank
     FROM leaderboard_score
     WHERE total_score > (SELECT total_score FROM leaderboard_score WHERE user_id = $1)`, [userId]);
    const streakRankResult = await (0, database_1.query)(`SELECT COUNT(*) + 1 as rank
     FROM leaderboard_streak
     WHERE max_streak > (SELECT max_streak FROM leaderboard_streak WHERE user_id = $1)`, [userId]);
    return {
        scoreRank: parseInt(scoreRankResult.rows[0]?.rank || '0'),
        streakRank: parseInt(streakRankResult.rows[0]?.rank || '0'),
    };
}
async function getUserMetrics(userId) {
    const cacheKey = redis_1.getCacheKey.userMetrics(userId);
    const cached = await redis_1.default.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const userState = await getUserState(userId);
    const histogramResult = await (0, database_1.query)(`SELECT difficulty, COUNT(*) as count
     FROM answer_log
     WHERE user_id = $1
     GROUP BY difficulty
     ORDER BY difficulty`, [userId]);
    const recentResult = await (0, database_1.query)(`SELECT correct, difficulty, answered_at
     FROM answer_log
     WHERE user_id = $1
     ORDER BY answered_at DESC
     LIMIT 10`, [userId]);
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
    await redis_1.default.setEx(cacheKey, redis_1.CACHE_TTL.USER_METRICS, JSON.stringify(metrics));
    return metrics;
}
async function getLeaderboard(type, limit = 100, userId) {
    const cacheKey = type === 'score'
        ? redis_1.getCacheKey.leaderboardScore()
        : redis_1.getCacheKey.leaderboardStreak();
    const cached = await redis_1.default.get(cacheKey);
    let leaderboard;
    if (cached) {
        leaderboard = JSON.parse(cached);
    }
    else {
        const query_text = type === 'score'
            ? `SELECT user_id, username, total_score as score, accuracy, total_questions
         FROM leaderboard_score
         ORDER BY total_score DESC
         LIMIT $1`
            : `SELECT user_id, username, max_streak as score, current_streak
         FROM leaderboard_streak
         ORDER BY max_streak DESC
         LIMIT $1`;
        const result = await (0, database_1.query)(query_text, [limit]);
        leaderboard = result.rows;
        await redis_1.default.setEx(cacheKey, redis_1.CACHE_TTL.LEADERBOARD, JSON.stringify(leaderboard));
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
//# sourceMappingURL=quizService.js.map
