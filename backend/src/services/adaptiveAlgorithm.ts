/**
 * Adaptive Quiz Algorithm with Ping-Pong Prevention
 *
 * Assignment Requirements:
 * - Correct answers increase difficulty within bounds
 * - Wrong answers decrease difficulty within bounds
 * - Ping-pong stabilizer via momentum + hysteresis
 * - Streak increments on correct, resets on wrong
 * - Streak multiplier capped at 3.0x
 * - Score = difficulty weight × streak multiplier × accuracy bonus
 * - Streak decay after inactivity (24h)
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

const CONFIG = {
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,

  // Ping-pong prevention: symmetric hysteresis
  // Need 2 consecutive correct to INCREASE
  // Need 2 consecutive wrong to DECREASE
  CORRECT_THRESHOLD: 2,
  WRONG_THRESHOLD: 2,

  // Momentum tuned so that exactly 2 consecutive answers
  // always crosses the ±1.0 threshold:
  //   After answer 1: (0 + 1.5) × 0.7 = 1.05  ← just below threshold (no change on 1st)
  //   After answer 2: (1.05 + 1.5) × 0.7 = 1.785 ← crosses threshold ✅
  MOMENTUM_DECAY: 0.3,
  MOMENTUM_GAIN_CORRECT: 1.5,
  MOMENTUM_LOSS_WRONG: 1.5,

  DIFFICULTY_INCREASE_THRESHOLD: 1.0,
  DIFFICULTY_DECREASE_THRESHOLD: -1.0,

  // Scoring
  BASE_SCORE_MULTIPLIER: 10,
  DIFFICULTY_WEIGHT: 1.5,
  MAX_STREAK_MULTIPLIER: 3.0,
  STREAK_MULTIPLIER_RATE: 0.1,
};

/**
 * Calculate streak multiplier: 1 + streak * 0.1, capped at 3.0x
 * streak=0  → 1.0x
 * streak=5  → 1.5x
 * streak=20 → 3.0x (cap)
 */
export function calculateStreakMultiplier(streak: number): number {
  const multiplier = 1 + (streak * CONFIG.STREAK_MULTIPLIER_RATE);
  return Math.min(multiplier, CONFIG.MAX_STREAK_MULTIPLIER);
}

/**
 * Score formula (assignment requirement):
 *   Base Score     = 10 × difficulty^1.5
 *   Streak Mult    = min(1 + streak×0.1, 3.0)
 *   Accuracy Bonus = 1.2x if accuracy > 80%, else 1.0x
 *   Final          = Base × StreakMult × AccuracyBonus
 *
 * NOTE: streak passed here is the NEW streak (after increment),
 * so the correct answer immediately benefits from the streak it just built.
 */
export function calculateScoreDelta(
  difficulty: number,
  newStreak: number,      // FIX: use newStreak (post-increment), not old streak
  isCorrect: boolean,
  accuracy: number
): number {
  if (!isCorrect) return 0;

  const difficultyScore = CONFIG.BASE_SCORE_MULTIPLIER * Math.pow(difficulty, CONFIG.DIFFICULTY_WEIGHT);
  const streakMultiplier = calculateStreakMultiplier(newStreak);
  const accuracyBonus = accuracy > 0.8 ? 1.2 : 1.0;

  return Math.round(difficultyScore * streakMultiplier * accuracyBonus * 100) / 100;
}

/**
 * Adaptive Difficulty Algorithm:
 *
 * CORRECT answer:
 *   1. streak++, consecutiveCorrect++, consecutiveWrong = 0
 *   2. momentum = (momentum + 1.0) × (1 - 0.3)   [gain then decay]
 *   3. if consecutiveCorrect >= 2 AND momentum >= 1.0 → difficulty++, reset counters
 *
 * WRONG answer:
 *   1. streak = 0 (reset), consecutiveWrong++, consecutiveCorrect = 0
 *   2. momentum = (momentum - 1.0) × (1 - 0.3)   [loss then decay]
 *   3. if consecutiveWrong >= 2 AND momentum <= -1.0 → difficulty--, reset counters
 *
 * Ping-Pong Prevention:
 *   - Symmetric hysteresis: BOTH directions require 2 consecutive answers
 *   - Momentum acts as confidence buffer (must cross ±1.0 threshold)
 *   - After difficulty change, momentum resets to 0 (prevents cascading)
 *   - Example: correct→wrong→correct will NOT oscillate difficulty because
 *     consecutiveCorrect never reaches 2 before reset
 */
export function calculateAdaptiveDifficulty(
  currentState: UserState,
  isCorrect: boolean,
  questionDifficulty: number
): AdaptiveResult {
  let newDifficulty = questionDifficulty;
  let newMomentum = currentState.difficultyMomentum;
  let newConsecutiveCorrect = currentState.consecutiveCorrect;
  let newConsecutiveWrong = currentState.consecutiveWrong;
  let newStreak = currentState.streak;

  if (isCorrect) {
    // ── CORRECT ANSWER ──────────────────────────────────────────
    newStreak = currentState.streak + 1;        // streak increments
    newConsecutiveCorrect += 1;
    newConsecutiveWrong = 0;

    // Momentum: gain first, then apply decay
    newMomentum = (currentState.difficultyMomentum + CONFIG.MOMENTUM_GAIN_CORRECT)
                  * (1 - CONFIG.MOMENTUM_DECAY);

    // Increase difficulty: need CORRECT_THRESHOLD consecutive correct + positive momentum
    if (
      newConsecutiveCorrect >= CONFIG.CORRECT_THRESHOLD &&
      newMomentum >= CONFIG.DIFFICULTY_INCREASE_THRESHOLD &&
      questionDifficulty < CONFIG.MAX_DIFFICULTY
    ) {
      newDifficulty = questionDifficulty + 1;
      newMomentum = 0;              // reset momentum after difficulty change
      newConsecutiveCorrect = 0;    // reset counter (need to re-earn the increase)
    }

  } else {
    // ── WRONG ANSWER ─────────────────────────────────────────────
    newStreak = 0;                  // streak RESETS immediately on wrong
    newConsecutiveWrong += 1;
    newConsecutiveCorrect = 0;

    // Momentum: loss first, then apply decay
    newMomentum = (currentState.difficultyMomentum - CONFIG.MOMENTUM_LOSS_WRONG)
                  * (1 - CONFIG.MOMENTUM_DECAY);

    // Decrease difficulty: need WRONG_THRESHOLD consecutive wrong + negative momentum
    if (
      newConsecutiveWrong >= CONFIG.WRONG_THRESHOLD &&
      newMomentum <= CONFIG.DIFFICULTY_DECREASE_THRESHOLD &&
      questionDifficulty > CONFIG.MIN_DIFFICULTY
    ) {
      newDifficulty = questionDifficulty - 1;
      newMomentum = 0;              // reset momentum after difficulty change
      newConsecutiveWrong = 0;      // reset counter
    }
  }

  // Clamp momentum to [-3, 3]
  newMomentum = Math.max(-3, Math.min(3, newMomentum));

  // Clamp difficulty to [1, 10]
  newDifficulty = Math.max(CONFIG.MIN_DIFFICULTY, Math.min(CONFIG.MAX_DIFFICULTY, newDifficulty));

  // Calculate accuracy for score bonus
  const accuracy = currentState.totalQuestions > 0
    ? currentState.correctAnswers / currentState.totalQuestions
    : 1.0;

  // FIX: Pass newStreak so score reflects the streak earned ON this answer
  const scoreDelta = calculateScoreDelta(
    questionDifficulty,
    newStreak,
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
 * Streak decay: resets streak if user has been inactive for 24+ hours
 */
export function shouldDecayStreak(lastAnswerAt: Date | null): boolean {
  if (!lastAnswerAt) return false;
  const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  const now = new Date();
  const timeSinceLastAnswer = now.getTime() - new Date(lastAnswerAt).getTime();
  return timeSinceLastAnswer > INACTIVITY_THRESHOLD_MS;
}

/**
 * Returns question difficulty pool: target ± 1 for variety
 */
export function getDifficultyRange(targetDifficulty: number): number[] {
  const range = [targetDifficulty];
  if (targetDifficulty > CONFIG.MIN_DIFFICULTY) range.push(targetDifficulty - 1);
  if (targetDifficulty < CONFIG.MAX_DIFFICULTY) range.push(targetDifficulty + 1);
  return range;
}
