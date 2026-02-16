import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { answerLimiter } from '../middleware/rateLimiter';
import * as quizController from '../controllers/quizController';
import * as authController from '../controllers/authController';

const router = Router();

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);

// Quiz routes (all require authentication)
router.get('/quiz/next', authenticate, quizController.getNext);
router.post('/quiz/answer', authenticate, answerLimiter, quizController.postAnswer);
router.get('/quiz/metrics', authenticate, quizController.getMetrics);

// Leaderboard routes
router.get('/leaderboard/score', authenticate, quizController.getScoreLeaderboard);
router.get('/leaderboard/streak', authenticate, quizController.getStreakLeaderboard);

export default router;
