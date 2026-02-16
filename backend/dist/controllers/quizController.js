"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNext = getNext;
exports.postAnswer = postAnswer;
exports.getMetrics = getMetrics;
exports.getScoreLeaderboard = getScoreLeaderboard;
exports.getStreakLeaderboard = getStreakLeaderboard;
const quizService_1 = require("../services/quizService");
const uuid_1 = require("uuid");
async function getNext(req, res) {
    try {
        const userId = req.userId;
        const sessionId = req.query.sessionId || (0, uuid_1.v4)();
        const result = await (0, quizService_1.getNextQuestion)(userId, sessionId);
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
    }
    catch (error) {
        console.error('Error getting next question:', error);
        res.status(500).json({ error: 'Failed to get next question' });
    }
}
async function postAnswer(req, res) {
    try {
        const userId = req.userId;
        const { sessionId, questionId, answer, stateVersion, answerIdempotencyKey, } = req.body;
        if (!sessionId || !questionId || !answer || stateVersion === undefined) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const idempotencyKey = answerIdempotencyKey || (0, uuid_1.v4)();
        const result = await (0, quizService_1.submitAnswer)(userId, sessionId, questionId, answer, stateVersion, idempotencyKey);
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
    }
    catch (error) {
        console.error('Error submitting answer:', error);
        if (error.message === 'State version mismatch - please retry') {
            res.status(409).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to submit answer' });
    }
}
async function getMetrics(req, res) {
    try {
        const userId = req.userId;
        const metrics = await (0, quizService_1.getUserMetrics)(userId);
        res.json(metrics);
    }
    catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
}
async function getScoreLeaderboard(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const userId = req.userId;
        const result = await (0, quizService_1.getLeaderboard)('score', limit, userId);
        res.json({
            leaderboard: result.leaderboard,
            userRank: result.userRank,
        });
    }
    catch (error) {
        console.error('Error getting score leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
}
async function getStreakLeaderboard(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const userId = req.userId;
        const result = await (0, quizService_1.getLeaderboard)('streak', limit, userId);
        res.json({
            leaderboard: result.leaderboard,
            userRank: result.userRank,
        });
    }
    catch (error) {
        console.error('Error getting streak leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
}
//# sourceMappingURL=quizController.js.map