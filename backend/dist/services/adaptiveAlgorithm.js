"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStreakMultiplier = calculateStreakMultiplier;
exports.calculateScoreDelta = calculateScoreDelta;
exports.calculateAdaptiveDifficulty = calculateAdaptiveDifficulty;
exports.shouldDecayStreak = shouldDecayStreak;
exports.getDifficultyRange = getDifficultyRange;

// FIXED Configuration - correct momentum values
const CONFIG = {
    MIN_DIFFICULTY: 1,
    MAX_DIFFICULTY: 10,
    HYSTERESIS_THRESHOLD: 2,        // 2 consecutive correct to INCREASE
    WRONG_THRESHOLD: 1,              // 1 wrong to DECREASE
    MOMENTUM_DECAY: 0.3,
    MOMENTUM_GAIN_CORRECT: 1.0,     // FIXED: was 0.5
    MOMENTUM_LOSS_WRONG: 1.5,       // FIXED: was 0.7
    DIFFICULTY_INCREASE_THRESHOLD: 1.0,
    DIFFICULTY_DECREASE_THRESHOLD: -1.0,
    BASE_SCORE_MULTIPLIER: 10,
    DIFFICULTY_WEIGHT: 1.5,
    MAX_STREAK_MULTIPLIER: 3.0,
    STREAK_MULTIPLIER_RATE: 0.1,
};

function calculateStreakMultiplier(streak) {
    const multiplier = 1 + (streak * CONFIG.STREAK_MULTIPLIER_RATE);
    return Math.min(multiplier, CONFIG.MAX_STREAK_MULTIPLIER);
}

function calculateScoreDelta(difficulty, streak, isCorrect, accuracy) {
    if (!isCorrect) return 0;
    const difficultyScore = CONFIG.BASE_SCORE_MULTIPLIER * Math.pow(difficulty, CONFIG.DIFFICULTY_WEIGHT);
    const streakMultiplier = calculateStreakMultiplier(streak);
    const accuracyBonus = accuracy > 0.8 ? 1.2 : 1.0;
    return Math.round(difficultyScore * streakMultiplier * accuracyBonus * 100) / 100;
}

function calculateAdaptiveDifficulty(currentState, isCorrect, currentDifficulty) {
    let newDifficulty = currentDifficulty;
    let newMomentum = currentState.difficultyMomentum;
    let newConsecutiveCorrect = currentState.consecutiveCorrect;
    let newConsecutiveWrong = currentState.consecutiveWrong;
    let newStreak = currentState.streak;

    if (isCorrect) {
        // CORRECT ANSWER
        newStreak = currentState.streak + 1;
        newConsecutiveCorrect += 1;
        newConsecutiveWrong = 0;

        // Update momentum + apply decay BEFORE threshold check
        newMomentum = (currentState.difficultyMomentum + CONFIG.MOMENTUM_GAIN_CORRECT) * (1 - CONFIG.MOMENTUM_DECAY);

        // Increase difficulty: need 2 consecutive correct
        if (newConsecutiveCorrect >= CONFIG.HYSTERESIS_THRESHOLD &&
            newMomentum >= CONFIG.DIFFICULTY_INCREASE_THRESHOLD &&
            currentDifficulty < CONFIG.MAX_DIFFICULTY) {
            newDifficulty = currentDifficulty + 1;
            newMomentum = 0;
            newConsecutiveCorrect = 0;
        }
    } else {
        // WRONG ANSWER
        newStreak = 0;  // RESET streak immediately
        newConsecutiveWrong += 1;
        newConsecutiveCorrect = 0;

        // Update momentum + apply decay BEFORE threshold check
        newMomentum = (currentState.difficultyMomentum - CONFIG.MOMENTUM_LOSS_WRONG) * (1 - CONFIG.MOMENTUM_DECAY);

        // Decrease difficulty: 1 wrong is enough
        if (newConsecutiveWrong >= CONFIG.WRONG_THRESHOLD &&
            newMomentum <= CONFIG.DIFFICULTY_DECREASE_THRESHOLD &&
            currentDifficulty > CONFIG.MIN_DIFFICULTY) {
            newDifficulty = currentDifficulty - 1;
            newMomentum = 0;
            newConsecutiveWrong = 0;
        }
    }

    // Clamp momentum
    newMomentum = Math.max(-3, Math.min(3, newMomentum));
    // Clamp difficulty to [1, 10]
    newDifficulty = Math.max(CONFIG.MIN_DIFFICULTY, Math.min(CONFIG.MAX_DIFFICULTY, newDifficulty));

    const accuracy = currentState.totalQuestions > 0
        ? currentState.correctAnswers / currentState.totalQuestions
        : 1.0;

    const scoreDelta = calculateScoreDelta(
        currentDifficulty,
        currentState.streak,
        isCorrect,
        accuracy
    );

    return { newDifficulty, scoreDelta, newStreak, newMomentum, newConsecutiveCorrect, newConsecutiveWrong };
}

function shouldDecayStreak(lastAnswerAt) {
    if (!lastAnswerAt) return false;
    const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    return (now.getTime() - new Date(lastAnswerAt).getTime()) > INACTIVITY_THRESHOLD_MS;
}

function getDifficultyRange(targetDifficulty) {
    const range = [targetDifficulty];
    if (targetDifficulty > CONFIG.MIN_DIFFICULTY) range.push(targetDifficulty - 1);
    if (targetDifficulty < CONFIG.MAX_DIFFICULTY) range.push(targetDifficulty + 1);
    return range;
}
