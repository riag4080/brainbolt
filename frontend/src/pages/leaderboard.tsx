import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from './_app';
import { leaderboardAPI } from '@/lib/api';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore?: number;
  maxStreak?: number;
  rank: number;
}

export default function Leaderboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'score' | 'streak'>('score');
  const [scoreLeaderboard, setScoreLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRankScore, setUserRankScore] = useState<number | null>(null);
  const [userRankStreak, setUserRankStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadLeaderboards();
    }
  }, [user, authLoading]);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);
      const [scoreRes, streakRes] = await Promise.all([
        leaderboardAPI.getScoreLeaderboard(),
        leaderboardAPI.getStreakLeaderboard(),
      ]);
      
      setScoreLeaderboard(scoreRes.data.leaderboard);
      setUserRankScore(scoreRes.data.userRank);
      setStreakLeaderboard(streakRes.data.leaderboard);
      setUserRankStreak(streakRes.data.userRank);
    } catch (err) {
      console.error('Error loading leaderboards:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentLeaderboard = activeTab === 'score' ? scoreLeaderboard : streakLeaderboard;
  const userRank = activeTab === 'score' ? userRankScore : userRankStreak;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/quiz')}
              className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow"
            >
              ← Back to Quiz
            </button>
            <button
              onClick={() => router.push('/metrics')}
              className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow"
            >
              📊 My Metrics
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="px-3 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-all text-xl"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow font-semibold"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-6">
            🏆 Leaderboard
          </h1>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('score')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                activeTab === 'score'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-muted hover:bg-gray-200'
              }`}
            >
              Total Score
            </button>
            <button
              onClick={() => setActiveTab('streak')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                activeTab === 'streak'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-muted hover:bg-gray-200'
              }`}
            >
              Max Streak
            </button>
          </div>

          {/* User Rank */}
          {userRank !== null && (
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-500">
              <div className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Your Rank: #{userRank}
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-2">
              {currentLeaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    entry.userId === user.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                      : 'bg-gray-50 dark:bg-dark-bg'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-400 w-8">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-dark-text">
                        {entry.username}
                        {entry.userId === user.id && (
                          <span className="ml-2 text-sm text-primary-600">(You)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary-600">
                    {activeTab === 'score' 
                      ? ((entry as any).score ? Number((entry as any).score).toFixed(2) : '0.00')
                      : ((entry as any).score || 0)
                    }
                  </div>
                </div>
              ))}
              
              {currentLeaderboard.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No entries yet. Be the first!
                </div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadLeaderboards}
            className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            🔄 Refresh Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
