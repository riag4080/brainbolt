"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCache = exports.getCacheKey = exports.CACHE_TTL = exports.connectRedis = void 0;
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};
exports.connectRedis = connectRedis;
// Cache TTL configurations (in seconds)
exports.CACHE_TTL = {
    USER_STATE: 300, // 5 minutes
    QUESTION_POOL: 3600, // 1 hour
    LEADERBOARD: 10, // 10 seconds for real-time feel
    USER_METRICS: 60, // 1 minute
};
// Cache key generators
exports.getCacheKey = {
    userState: (userId) => `user:state:${userId}`,
    questionPool: (difficulty) => `questions:difficulty:${difficulty}`,
    leaderboardScore: () => 'leaderboard:score',
    leaderboardStreak: () => 'leaderboard:streak',
    userMetrics: (userId) => `user:metrics:${userId}`,
    userRankScore: (userId) => `user:rank:score:${userId}`,
    userRankStreak: (userId) => `user:rank:streak:${userId}`,
};
// Cache invalidation helpers
exports.invalidateCache = {
    userState: async (userId) => {
        await redisClient.del(exports.getCacheKey.userState(userId));
        await redisClient.del(exports.getCacheKey.userMetrics(userId));
    },
    leaderboards: async () => {
        await redisClient.del(exports.getCacheKey.leaderboardScore());
        await redisClient.del(exports.getCacheKey.leaderboardStreak());
    },
    userRanks: async (userId) => {
        await redisClient.del(exports.getCacheKey.userRankScore(userId));
        await redisClient.del(exports.getCacheKey.userRankStreak(userId));
    },
};
exports.default = redisClient;
//# sourceMappingURL=redis.js.map