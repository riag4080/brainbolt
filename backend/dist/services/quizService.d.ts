import { UserState } from './adaptiveAlgorithm';
interface Question {
    id: string;
    difficulty: number;
    prompt: string;
    choices: string[];
    correctAnswerHash: string;
    tags: string[];
}
export declare function getUserState(userId: string): Promise<UserState>;
export declare function getNextQuestion(userId: string, sessionId: string): Promise<{
    question: Question;
    userState: UserState;
    sessionId: string;
}>;
export declare function submitAnswer(userId: string, sessionId: string, questionId: string, answer: string, stateVersion: number, idempotencyKey: string): Promise<{
    correct: boolean;
    newDifficulty: number;
    newStreak: number;
    scoreDelta: number;
    totalScore: number;
    stateVersion: number;
    leaderboardRankScore: number;
    leaderboardRankStreak: number;
}>;
export declare function getUserMetrics(userId: string): Promise<any>;
export declare function getLeaderboard(type: 'score' | 'streak', limit?: number, userId?: string): Promise<{
    leaderboard: any;
    userRank: number | null;
}>;
export {};
//# sourceMappingURL=quizService.d.ts.map