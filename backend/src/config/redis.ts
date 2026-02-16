import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  USER_STATE: 300, // 5 minutes
  QUESTION_POOL: 3600, // 1 hour
  LEADERBOARD: 10, // 10 seconds for real-time feel
  USER_METRICS: 60, // 1 minute
};

// Cache key generators
export const getCacheKey = {
  userState: (userId: string) => `user:state:${userId}`,
  questionPool: (difficulty: number) => `questions:difficulty:${difficulty}`,
  leaderboardScore: () => 'leaderboard:score',
  leaderboardStreak: () => 'leaderboard:streak',
  userMetrics: (userId: string) => `user:metrics:${userId}`,
  userRankScore: (userId: string) => `user:rank:score:${userId}`,
  userRankStreak: (userId: string) => `user:rank:streak:${userId}`,
};

// Cache invalidation helpers
export const invalidateCache = {
  userState: async (userId: string) => {
    await redisClient.del(getCacheKey.userState(userId));
    await redisClient.del(getCacheKey.userMetrics(userId));
  },
  leaderboards: async () => {
    await redisClient.del(getCacheKey.leaderboardScore());
    await redisClient.del(getCacheKey.leaderboardStreak());
  },
  userRanks: async (userId: string) => {
    await redisClient.del(getCacheKey.userRankScore(userId));
    await redisClient.del(getCacheKey.userRankStreak(userId));
  },
};

export default redisClient;
