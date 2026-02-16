import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { metricsAPI } from '@/lib/api';

interface UserMetrics {
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyHistogram?: Record<number, number>;
  recentPerformance?: Array<{ correct: boolean; difficulty: number }>;
}

export default function Metrics() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadMetrics();
    }
  }, [user, authLoading]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await metricsAPI.getUserMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => router.push('/quiz')}
            className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow"
          >
            ← Back to Quiz
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow"
          >
            🏆 Leaderboard
          </button>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-6">
            📊 Your Metrics
          </h1>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : metrics ? (
            <div className="space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted mb-1">
                    Total Score
                  </div>
                  <div className="text-3xl font-bold text-primary-600">
                    {metrics.totalScore.toFixed(2)}
                  </div>
                </div>

                <div className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted mb-1">
                    Current Streak
                  </div>
                  <div className="text-3xl font-bold text-success-600">
                    {metrics.streak}
                  </div>
                </div>

                <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted mb-1">
                    Max Streak
                  </div>
                  <div className="text-3xl font-bold text-warning-600">
                    {metrics.maxStreak}
                  </div>
                </div>

                <div className="bg-info-50 dark:bg-info-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted mb-1">
                    Difficulty
                  </div>
                  <div className="text-3xl font-bold text-info-600">
                    {metrics.currentDifficulty}
                  </div>
                </div>
              </div>

              {/* Accuracy Stats */}
              <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-4">
                  Performance Overview
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                      Total Questions
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                      {metrics.totalQuestions}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                      Correct Answers
                    </div>
                    <div className="text-2xl font-bold text-success-600">
                      {metrics.correctAnswers}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                      Accuracy
                    </div>
                    <div className="text-2xl font-bold text-primary-600">
                      {metrics.accuracy.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Accuracy Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-4">
                    <div
                      className="bg-primary-600 h-4 rounded-full transition-all"
                      style={{ width: `${metrics.accuracy}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Difficulty Histogram */}
              {metrics.difficultyHistogram && Array.isArray(metrics.difficultyHistogram) && metrics.difficultyHistogram.length > 0 && (
                <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-4">
                    Questions by Difficulty
                  </h2>
                  <div className="space-y-2">
                    {metrics.difficultyHistogram
                      .sort((a: any, b: any) => Number(a.difficulty) - Number(b.difficulty))
                      .map((item: any) => {
                        const difficulty = item.difficulty;
                        const count = Number(item.count);
                        return (
                          <div key={difficulty} className="flex items-center gap-3">
                            <div className="w-24 text-sm text-gray-600 dark:text-dark-text-muted">
                              Level {difficulty}
                            </div>
                            <div className="flex-1">
                              <div className="bg-gray-200 dark:bg-dark-border rounded-full h-6">
                                <div
                                  className="bg-primary-600 h-6 rounded-full flex items-center justify-end px-2"
                                  style={{
                                    width: `${(count / metrics.totalQuestions) * 100}%`,
                                  }}
                                >
                                  <span className="text-xs text-white font-semibold">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Recent Performance */}
              {metrics.recentPerformance && metrics.recentPerformance.length > 0 && (
                <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-4">
                    Recent Performance (Last 10)
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {metrics.recentPerformance.map((item, index) => (
                      <div
                        key={index}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                          item.correct
                            ? 'bg-success-500 text-white'
                            : 'bg-error-500 text-white'
                        }`}
                        title={`Difficulty ${item.difficulty}`}
                      >
                        {item.correct ? '✓' : '✗'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={loadMetrics}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🔄 Refresh Metrics
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No metrics available yet. Start answering questions!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
