declare const redisClient: any;
export declare const connectRedis: () => Promise<void>;
export declare const CACHE_TTL: {
    USER_STATE: number;
    QUESTION_POOL: number;
    LEADERBOARD: number;
    USER_METRICS: number;
};
export declare const getCacheKey: {
    userState: (userId: string) => string;
    questionPool: (difficulty: number) => string;
    leaderboardScore: () => string;
    leaderboardStreak: () => string;
    userMetrics: (userId: string) => string;
    userRankScore: (userId: string) => string;
    userRankStreak: (userId: string) => string;
};
export declare const invalidateCache: {
    userState: (userId: string) => Promise<void>;
    leaderboards: () => Promise<void>;
    userRanks: (userId: string) => Promise<void>;
};
export default redisClient;
//# sourceMappingURL=redis.d.ts.map