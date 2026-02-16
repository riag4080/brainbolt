/**
 * Adaptive Quiz Algorithm with Ping-Pong Prevention
 * 
 * This implements a sophisticated adaptive difficulty system that prevents
 * rapid oscillation between difficulty levels (ping-pong effect).
 * 
 * Key Features:
 * 1. Momentum-based difficulty adjustment
 * 2. Hysteresis band to prevent rapid changes
 * 3. Consecutive answer tracking
 * 4. Streak-based confidence scoring
 * 
 * Edge Cases Handled:
 * - Ping-pong instability (alternating correct/wrong)
 * - Boundary conditions (difficulty 1 and 10)
 * - Streak reset on wrong answer
 * - Difficulty momentum decay
 * - Cold start (new users)
 */

export interface UserState {
  userId: string;
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyMomentum: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  lastQuestionId?: string;
  stateVersion: number;
}

export interface AdaptiveResult {
  newDifficulty: number;
  scoreDelta: number;
  newStreak: number;
  newMomentum: number;
  newConsecutiveCorrect: number;
  newConsecutiveWrong: number;
}

// Configuration constants
const CONFIG = {
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  HYSTERESIS_THRESHOLD: 2, // Require 2 consecutive correct to increase difficulty
  MOMENTUM_DECAY: 0.3, // How much momentum carries over
  MOMENTUM_GAIN_CORRECT: 0.5, // Momentum gained on correct answer
  MOMENTUM_LOSS_WRONG: 0.7, // Momentum lost on wrong answer
  DIFFICULTY_INCREASE_THRESHOLD: 1.0, // Momentum needed to increase difficulty
  DIFFICULTY_DECREASE_THRESHOLD: -1.0, // Momentum needed to decrease difficulty
  BASE_SCORE_MULTIPLIER: 10, // Base points per question
  DIFFICULTY_WEIGHT: 1.5, // How much difficulty affects score
  MAX_STREAK_MULTIPLIER: 3.0, // Maximum multiplier from streak
  STREAK_MULTIPLIER_RATE: 0.1, // Streak multiplier increment per streak point
};

/**
 * Calculate streak multiplier with cap
 */
export function calculateStreakMultiplier(streak: number): number {
  const multiplier = 1 + (streak * CONFIG.STREAK_MULTIPLIER_RATE);
  return Math.min(multiplier, CONFIG.MAX_STREAK_MULTIPLIER);
}

/**
 * Calculate score delta based on difficulty, streak, and accuracy
 */
export function calculateScoreDelta(
  difficulty: number,
  streak: number,
  isCorrect: boolean,
  accuracy: number
): number {
  if (!isCorrect) {
    return 0; // No points for wrong answers
  }

  // Base score weighted by difficulty
  const difficultyScore = CONFIG.BASE_SCORE_MULTIPLIER * Math.pow(difficulty, CONFIG.DIFFICULTY_WEIGHT);
  
  // Streak multiplier
  const streakMultiplier = calculateStreakMultiplier(streak);
  
  // Accuracy bonus (small bonus for maintaining high accuracy)
  const accuracyBonus = accuracy > 0.8 ? 1.2 : 1.0;
  
  const totalScore = difficultyScore * streakMultiplier * accuracyBonus;
  
  return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Adaptive algorithm to determine next difficulty
 * 
 * This is the core adaptive logic that prevents ping-pong oscillation
 * through momentum tracking and hysteresis bands.
 * 
 * Pseudocode:
 * 1. Update momentum based on answer correctness
 * 2. Apply momentum decay to prevent over-aggressive changes
 * 3. Check hysteresis threshold (consecutive answers)
 * 4. Only change difficulty if momentum exceeds threshold
 * 5. Clamp difficulty to valid bounds
 * 6. Reset counters appropriately
 */
export function calculateAdaptiveDifficulty(
  currentState: UserState,
  isCorrect: boolean,
  currentDifficulty: number
): AdaptiveResult {
  let newDifficulty = currentDifficulty;
  let newMomentum = currentState.difficultyMomentum;
  let newConsecutiveCorrect = currentState.consecutiveCorrect;
  let newConsecutiveWrong = currentState.consecutiveWrong;
  let newStreak = currentState.streak;

  if (isCorrect) {
    // Correct answer path
    newStreak = currentState.streak + 1;
    newConsecutiveCorrect += 1;
    newConsecutiveWrong = 0;
    
    // Increase momentum
    newMomentum = currentState.difficultyMomentum + CONFIG.MOMENTUM_GAIN_CORRECT;
    
    // Check if we should increase difficulty
    // Requires both momentum threshold AND hysteresis (consecutive correct)
    if (
      newMomentum >= CONFIG.DIFFICULTY_INCREASE_THRESHOLD &&
      newConsecutiveCorrect >= CONFIG.HYSTERESIS_THRESHOLD &&
      currentDifficulty < CONFIG.MAX_DIFFICULTY
    ) {
      newDifficulty = currentDifficulty + 1;
      newMomentum = 0; // Reset momentum after difficulty change
      newConsecutiveCorrect = 0; // Reset consecutive counter
    }
  } else {
    // Wrong answer path
    newStreak = 0; // Reset streak
    newConsecutiveWrong += 1;
    newConsecutiveCorrect = 0;
    
    // Decrease momentum
    newMomentum = currentState.difficultyMomentum - CONFIG.MOMENTUM_LOSS_WRONG;
    
    // Check if we should decrease difficulty
    // Requires momentum threshold (more lenient than increase)
    if (
      newMomentum <= CONFIG.DIFFICULTY_DECREASE_THRESHOLD &&
      currentDifficulty > CONFIG.MIN_DIFFICULTY
    ) {
      newDifficulty = currentDifficulty - 1;
      newMomentum = 0; // Reset momentum after difficulty change
      newConsecutiveWrong = 0; // Reset consecutive counter
    }
  }

  // Apply momentum decay to prevent indefinite accumulation
  newMomentum = newMomentum * (1 - CONFIG.MOMENTUM_DECAY);

  // Clamp momentum to reasonable bounds
  newMomentum = Math.max(-3, Math.min(3, newMomentum));

  // Ensure difficulty is within bounds
  newDifficulty = Math.max(CONFIG.MIN_DIFFICULTY, Math.min(CONFIG.MAX_DIFFICULTY, newDifficulty));

  // Calculate score
  const accuracy = currentState.totalQuestions > 0 
    ? currentState.correctAnswers / currentState.totalQuestions 
    : 1.0;
  
  const scoreDelta = calculateScoreDelta(
    currentDifficulty,
    currentState.streak, // Use old streak for scoring
    isCorrect,
    accuracy
  );

  return {
    newDifficulty,
    scoreDelta,
    newStreak,
    newMomentum,
    newConsecutiveCorrect,
    newConsecutiveWrong,
  };
}

/**
 * Check if user has been inactive and should have streak decay
 * Returns true if streak should be reset
 */
export function shouldDecayStreak(lastAnswerAt: Date | null): boolean {
  if (!lastAnswerAt) return false;
  
  const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  const now = new Date();
  const timeSinceLastAnswer = now.getTime() - new Date(lastAnswerAt).getTime();
  
  return timeSinceLastAnswer > INACTIVITY_THRESHOLD_MS;
}

/**
 * Get difficulty range for question selection
 * Allows selecting from nearby difficulty levels for variety
 */
export function getDifficultyRange(targetDifficulty: number): number[] {
  const range = [];
  
  // Primary difficulty
  range.push(targetDifficulty);
  
  // Add ±1 difficulty for variety (70% primary, 15% lower, 15% higher)
  if (targetDifficulty > CONFIG.MIN_DIFFICULTY) {
    range.push(targetDifficulty - 1);
  }
  if (targetDifficulty < CONFIG.MAX_DIFFICULTY) {
    range.push(targetDifficulty + 1);
  }
  
  return range;
}
