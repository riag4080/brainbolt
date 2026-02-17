"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStreakMultiplier = calculateStreakMultiplier;
exports.calculateScoreDelta = calculateScoreDelta;
exports.calculateAdaptiveDifficulty = calculateAdaptiveDifficulty;
exports.shouldDecayStreak = shouldDecayStreak;
exports.getDifficultyRange = getDifficultyRange;

/**
 * ADAPTIVE ALGORITHM - FINAL FIXED VERSION
 * 
 * DIFFICULTY LOGIC:
 *   1 correct answer  → difficulty +1 (increase)
 *   1 wrong answer    → difficulty -1 (decrease)
 *   Min difficulty = 1, Max difficulty = 10
 * 
 * STREAK LOGIC:
 *   correct answer → streak++ (keeps building)
 *   wrong answer   → streak = 0 (IMMEDIATE RESET)
 *   maxStreak is tracked separately (never resets)
 * 
 * SCORE LOGIC:
 *   correct → Base(10) × Difficulty^1.5 × StreakMultiplier × AccuracyBonus
 *   wrong   → 0 points
 */

const CONFIG = {
    MIN_DIFFICULTY: 1,
    MAX_DIFFICULTY: 10,
    MOMENTUM_DECAY: 0.3,
    MOMENTUM_GAIN_CORRECT: 1.5,
    MOMENTUM_LOSS_WRONG: 1.5,
    DIFFICULTY_INCREASE_THRESHOLD: 1.0,
    DIFFICULTY_DECREASE_THRESHOLD: -1.0,
    BASE_SCORE_MULTIPLIER: 10,
    DIFFICULTY_WEIGHT: 1.5,
    MAX_STREAK_MULTIPLIER: 3.0,
    STREAK_MULTIPLIER_RATE: 0.1,
};

function calculateStreakMultiplier(streak) {
    return Math.min(1 + (streak * CONFIG.STREAK_MULTIPLIER_RATE), CONFIG.MAX_STREAK_MULTIPLIER);
}

function calculateScoreDelta(difficulty, streak, isCorrect, accuracy) {
    if (!isCorrect) return 0;
    const base = CONFIG.BASE_SCORE_MULTIPLIER * Math.pow(difficulty, CONFIG.DIFFICULTY_WEIGHT);
    const streakMult = calculateStreakMultiplier(streak);
    const accuracyBonus = accuracy > 0.8 ? 1.2 : 1.0;
    return Math.round(base * streakMult * accuracyBonus * 100) / 100;
}

function calculateAdaptiveDifficulty(currentState, isCorrect, currentDifficulty) {
    let newDifficulty = currentDifficulty;
    let newStreak;
    let newMomentum;
    let newConsecutiveCorrect = currentState.consecutiveCorrect;
    let newConsecutiveWrong = currentState.consecutiveWrong;

    if (isCorrect) {
        // ✅ CORRECT
        newStreak = currentState.streak + 1;  // streak badhta hai
        newConsecutiveCorrect += 1;
        newConsecutiveWrong = 0;

        // momentum update + decay
        newMomentum = (currentState.difficultyMomentum + CONFIG.MOMENTUM_GAIN_CORRECT) * (1 - CONFIG.MOMENTUM_DECAY);

        // 1 correct = difficulty increase
        if (newMomentum >= CONFIG.DIFFICULTY_INCREASE_THRESHOLD && currentDifficulty < CONFIG.MAX_DIFFICULTY) {
            newDifficulty = currentDifficulty + 1;
            newMomentum = 0;
            newConsecutiveCorrect = 0;
        }
    } else {
        // ❌ WRONG
        newStreak = 0;  // streak RESET karo
        newConsecutiveWrong += 1;
        newConsecutiveCorrect = 0;

        // momentum update + decay
        newMomentum = (currentState.difficultyMomentum - CONFIG.MOMENTUM_LOSS_WRONG) * (1 - CONFIG.MOMENTUM_DECAY);

        // 1 wrong = difficulty decrease
        if (newMomentum <= CONFIG.DIFFICULTY_DECREASE_THRESHOLD && currentDifficulty > CONFIG.MIN_DIFFICULTY) {
            newDifficulty = currentDifficulty - 1;
            newMomentum = 0;
            newConsecutiveWrong = 0;
        }
    }

    // clamp momentum [-3, 3]
    newMomentum = Math.max(-3, Math.min(3, newMomentum));
    // clamp difficulty [1, 10]
    newDifficulty = Math.max(CONFIG.MIN_DIFFICULTY, Math.min(CONFIG.MAX_DIFFICULTY, newDifficulty));

    // score uses OLD streak (before this answer)
    const accuracy = currentState.totalQuestions > 0
        ? currentState.correctAnswers / currentState.totalQuestions
        : 1.0;

    const scoreDelta = calculateScoreDelta(currentDifficulty, currentState.streak, isCorrect, accuracy);

    return { newDifficulty, scoreDelta, newStreak, newMomentum, newConsecutiveCorrect, newConsecutiveWrong };
}

function shouldDecayStreak(lastAnswerAt) {
    if (!lastAnswerAt) return false;
    const MS_24H = 24 * 60 * 60 * 1000;
    return (new Date().getTime() - new Date(lastAnswerAt).getTime()) > MS_24H;
}

function getDifficultyRange(targetDifficulty) {
    const range = [targetDifficulty];
    if (targetDifficulty > 1) range.push(targetDifficulty - 1);
    if (targetDifficulty < 10) range.push(targetDifficulty + 1);
    return range;
}
