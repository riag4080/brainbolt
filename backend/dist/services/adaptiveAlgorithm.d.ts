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
/**
 * Calculate streak multiplier with cap
 */
export declare function calculateStreakMultiplier(streak: number): number;
/**
 * Calculate score delta based on difficulty, streak, and accuracy
 */
export declare function calculateScoreDelta(difficulty: number, streak: number, isCorrect: boolean, accuracy: number): number;
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
export declare function calculateAdaptiveDifficulty(currentState: UserState, isCorrect: boolean, currentDifficulty: number): AdaptiveResult;
/**
 * Check if user has been inactive and should have streak decay
 * Returns true if streak should be reset
 */
export declare function shouldDecayStreak(lastAnswerAt: Date | null): boolean;
/**
 * Get difficulty range for question selection
 * Allows selecting from nearby difficulty levels for variety
 */
export declare function getDifficultyRange(targetDifficulty: number): number[];
//# sourceMappingURL=adaptiveAlgorithm.d.ts.map