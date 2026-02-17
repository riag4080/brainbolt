/**
 * Adaptive Quiz Algorithm with Ping-Pong Prevention
 * 
 * FIXES APPLIED:
 * 1. MOMENTUM_GAIN_CORRECT increased to 1.0 (was 0.5) - so 2 correct answers work
 * 2. MOMENTUM_LOSS_WRONG increased to 1.5 (was 0.7) - so 1 wrong answer triggers decrease
 * 3. WRONG_THRESHOLD = 1 - difficulty decreases after just 1 wrong answer
 * 4. Momentum decay applied BEFORE threshold check (correct order)
 * 5. Streak resets to 0 immediately on wrong answer
 */

export interface UserState {
  userId: string;
  currentDifficulty:  number;
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

const CONFIG = {
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  HYSTERESIS_THRESHOLD: 2,           // Need 2 consecutive correct to INCREASE
  WRONG_THRESHOLD: 1,                 // Need 1 wrong to DECREASE (immediate)
  MOMENTUM_DECAY: 0.3,
  MOMENTUM_GAIN_CORRECT: 1.0,        // FIX: was 0.5, now 1.0
  MOMENTUM_LOSS_WRONG: 1.5,          // FIX: was 0.7, now 1.5
  DIFFICULTY_INCREASE_THRESHOLD: 1.0,
  DIFFICULTY_DECREASE_THRESHOLD: -1.0,
  BASE_SCORE_MULTIPLIER: 10,
  DIFFICULTY_WEIGHT: 1.5,
  MAX_STREAK_MULTIPLIER: 3.0,
  STREAK_MULTIPLIER_RATE: 0.1,
};

export function calculateStreakMultiplier(streak: number): number {
  const multiplier = 1 + (streak * CONFIG.STREAK_MULTIPLIER_RATE);
  return Math.min(multiplier, CONFIG.MAX_STREAK_MULTIPLIER);
}

export function calculateScoreDelta(
  difficulty: number,
  streak: number,
  isCorrect: boolean,
  accuracy: number
): number {
  if (!isCorrect) return 0;
  const difficultyScore = CONFIG.BASE_SCORE_MULTIPLIER * Math.pow(difficulty, CONFIG.DIFFICULTY_WEIGHT);
  const streakMultiplier = calculateStreakMultiplier(streak);
  const accuracyBonus = accuracy > 0.8 ? 1.2 : 1.0;
  return Math.round(difficultyScore * streakMultiplier * accuracyBonus * 100) / 100;
}

/**
 * FIXED Adaptive Algorithm:
 *
 * CORRECT answer:
 *   streak++, consecutiveCorrect++, consecutiveWrong = 0
 *   momentum += 1.0, then decay
 *   if consecutiveCorrect >= 2 AND momentum >= 1.0 → difficulty++
 *
 * WRONG answer:
 *   streak = 0 (RESET), consecutiveWrong++, consecutiveCorrect = 0
 *   momentum -= 1.5, then decay
 *   if consecutiveWrong >= 1 AND momentum <= -1.0 → difficulty--
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
    // CORRECT ANSWER
    newStreak = currentState.streak + 1;
    newConsecutiveCorrect += 1;
    newConsecutiveWrong = 0;

    // Update momentum then apply decay
    newMomentum = (currentState.difficultyMomentum + CONFIG.MOMENTUM_GAIN_CORRECT) * (1 - CONFIG.MOMENTUM_DECAY);

    // Increase difficulty: need 2 consecutive correct + momentum threshold
    if (
      newConsecutiveCorrect >= CONFIG.HYSTERESIS_THRESHOLD &&
      newMomentum >= CONFIG.DIFFICULTY_INCREASE_THRESHOLD &&
      currentDifficulty < CONFIG.MAX_DIFFICULTY
    ) {
      newDifficulty = currentDifficulty + 1;
      newMomentum = 0;
      newConsecutiveCorrect = 0;
    }

  } else {
    // WRONG ANSWER
    newStreak = 0;              // RESET streak immediately
    newConsecutiveWrong += 1;
    newConsecutiveCorrect = 0;

    // Update momentum then apply decay
    newMomentum = (currentState.difficultyMomentum - CONFIG.MOMENTUM_LOSS_WRONG) * (1 - CONFIG.MOMENTUM_DECAY);

    // Decrease difficulty: 1 wrong answer is enough if momentum drops below threshold
    if (
      newConsecutiveWrong >= CONFIG.WRONG_THRESHOLD &&
      newMomentum <= CONFIG.DIFFICULTY_DECREASE_THRESHOLD &&
      currentDifficulty > CONFIG.MIN_DIFFICULTY
    ) {
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

  return {
    newDifficulty,
    scoreDelta,
    newStreak,
    newMomentum,
    newConsecutiveCorrect,
    newConsecutiveWrong,
  };
}

export function shouldDecayStreak(lastAnswerAt: Date | null): boolean {
  if (!lastAnswerAt) return false;
  const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const timeSinceLastAnswer = now.getTime() - new Date(lastAnswerAt).getTime();
  return timeSinceLastAnswer > INACTIVITY_THRESHOLD_MS;
}

export function getDifficultyRange(targetDifficulty: number): number[] {
  const range = [targetDifficulty];
  if (targetDifficulty > CONFIG.MIN_DIFFICULTY) range.push(targetDifficulty - 1);
  if (targetDifficulty < CONFIG.MAX_DIFFICULTY) range.push(targetDifficulty + 1);
  return range;
}
