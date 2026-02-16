import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Auth API
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  login: (usernameOrEmail: string, password: string) =>
    api.post('/auth/login', { usernameOrEmail, password }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Quiz API
export const quizAPI = {
  getNext: (sessionId?: string) =>
    api.get('/quiz/next', { params: { sessionId } }),
  submitAnswer: (data: any) => api.post('/quiz/answer', data),
};

// Metrics API
export const metricsAPI = {
  getUserMetrics: () => api.get('/quiz/metrics'),
};

// Leaderboard API
export const leaderboardAPI = {
  getScoreLeaderboard: (limit?: number) =>
    api.get('/leaderboard/score', { params: { limit } }),
  getStreakLeaderboard: (limit?: number) =>
    api.get('/leaderboard/streak', { params: { limit } }),
};
