export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Question {
  questionId: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  sessionId: string;
  stateVersion: number;
  currentScore: number;
  currentStreak: number;
  currentDifficulty: number;
}

export interface AnswerResponse {
  correct: boolean;
  newDifficulty: number;
  newStreak: number;
  scoreDelta: number;
  totalScore: number;
  stateVersion: number;
  leaderboardRankScore: number;
  leaderboardRankStreak: number;
}

export interface UserMetrics {
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyHistogram: Array<{ difficulty: number; count: number }>;
  recentPerformance: Array<{ correct: boolean; difficulty: number; answered_at: string }>;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  accuracy?: number;
  total_questions?: number;
  current_streak?: number;
}

export interface Leaderboard {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}
