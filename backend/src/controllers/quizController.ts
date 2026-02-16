import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getNextQuestion,
  submitAnswer,
  getUserMetrics,
  getLeaderboard,
} from '../services/quizService';
import { v4 as uuidv4 } from 'uuid';

export async function getNext(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const sessionId = req.query.sessionId as string || uuidv4();

    const result = await getNextQuestion(userId, sessionId);

    res.json({
      questionId: result.question.id,
      difficulty: result.question.difficulty,
      prompt: result.question.prompt,
      choices: result.question.choices,
      sessionId: result.sessionId,
      stateVersion: result.userState.stateVersion,
      currentScore: result.userState.totalScore,
      currentStreak: result.userState.streak,
      currentDifficulty: result.userState.currentDifficulty,
    });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
}

export async function postAnswer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      sessionId,
      questionId,
      answer,
      stateVersion,
      answerIdempotencyKey,
    } = req.body;

    if (!sessionId || !questionId || !answer || stateVersion === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const idempotencyKey = answerIdempotencyKey || uuidv4();

    const result = await submitAnswer(
      userId,
      sessionId,
      questionId,
      answer,
      stateVersion,
      idempotencyKey
    );

    res.json({
      correct: result.correct,
      newDifficulty: result.newDifficulty,
      newStreak: result.newStreak,
      scoreDelta: result.scoreDelta,
      totalScore: result.totalScore,
      stateVersion: result.stateVersion,
      leaderboardRankScore: result.leaderboardRankScore,
      leaderboardRankStreak: result.leaderboardRankStreak,
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    
    if (error.message === 'State version mismatch - please retry') {
      res.status(409).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

export async function getMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const metrics = await getUserMetrics(userId);

    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
}

export async function getScoreLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const userId = req.userId;

    const result = await getLeaderboard('score', limit, userId);

    res.json({
      leaderboard: result.leaderboard,
      userRank: result.userRank,
    });
  } catch (error) {
    console.error('Error getting score leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
}

export async function getStreakLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const userId = req.userId;

    const result = await getLeaderboard('streak', limit, userId);

    res.json({
      leaderboard: result.leaderboard,
      userRank: result.userRank,
    });
  } catch (error) {
    console.error('Error getting streak leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
}
