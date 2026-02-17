import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from './_app';
import { quizAPI } from '@/lib/api';
import { Question, AnswerResponse } from '@/types';

// Separate stats state so UI updates INSTANTLY after submit
interface QuizStats {
  score: number;
  streak: number;
  difficulty: number;
}

export default function Quiz() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);

  // FIX: Separate stats state - updates IMMEDIATELY after answer
  const [stats, setStats] = useState<QuizStats>({
    score: 0,
    streak: 0,
    difficulty: 5,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadNextQuestion();
    }
  }, [user, authLoading]);

  const loadNextQuestion = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      setSelectedAnswer('');
      const res = await quizAPI.getNext();
      setQuestion(res.data);
      // Sync stats from question data
      setStats({
        score: res.data.currentScore || 0,
        streak: res.data.currentStreak || 0,
        difficulty: res.data.currentDifficulty || 5,
      });
    } catch (err) {
      console.error('Error loading question:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question || submitting) return;

    try {
      setSubmitting(true);

      const res = await quizAPI.submitAnswer({
        sessionId: question.sessionId,
        questionId: question.questionId,
        answer: selectedAnswer,
        stateVersion: question.stateVersion,
      });

      const data = res.data;
      setFeedback(data);

      // FIX: Update stats IMMEDIATELY from response - no waiting for next question!
      setStats({
        score: data.totalScore ?? (stats.score + (data.scoreDelta || 0)),
        streak: data.newStreak ?? 0,
        difficulty: data.newDifficulty ?? stats.difficulty,
      });

    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Navigation Bar */}
        <div className="mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow font-semibold"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => router.push('/metrics')}
              className="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg shadow hover:shadow-md transition-shadow font-semibold"
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
            <span className="px-3 py-2 bg-white dark:bg-dark-surface rounded-lg shadow text-sm font-medium text-gray-700 dark:text-dark-text">
              👤 {user?.username}
            </span>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow hover:shadow-md transition-all font-semibold"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8">

          {/* Stats Header - FIX: Now uses separate stats state, updates instantly */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
              🧠 BrainBolt
            </h1>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Score</div>
                <div className="text-2xl font-bold text-primary-600 transition-all">
                  {Math.round(stats.score)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Streak</div>
                <div className="text-2xl font-bold text-success-600 transition-all">
                  {stats.streak} 🔥
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Difficulty</div>
                <div className="text-2xl font-bold text-warning-600 transition-all">
                  {stats.difficulty}/10
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Panel - shows IMMEDIATELY after submit */}
          {feedback && (
            <div className={`mb-6 p-6 rounded-xl border-2 ${
              feedback.correct
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="text-2xl font-bold mb-3">
                {feedback.correct ? '✅ Correct!' : '❌ Wrong!'}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Points Earned</div>
                  <div className="text-xl font-bold text-primary-600">
                    +{feedback.scoreDelta || 0}
                  </div>
                </div>
                <div className="text-center bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Streak</div>
                  <div className="text-xl font-bold text-success-600">
                    {feedback.newStreak} 🔥
                  </div>
                </div>
                <div className="text-center bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Difficulty</div>
                  <div className="text-xl font-bold text-warning-600">
                    {feedback.newDifficulty}/10
                  </div>
                </div>
              </div>
              <button
                onClick={loadNextQuestion}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Next Question →'}
              </button>
            </div>
          )}

          {/* Question Panel */}
          {!feedback && question && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-dark-bg px-3 py-1 rounded-full">
                    Difficulty {question.difficulty}/10
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text">
                  {question.prompt}
                </h2>
              </div>

              <div className="space-y-3 mb-8">
                {question.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(choice)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      selectedAnswer === choice
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                        : 'border-gray-200 dark:border-dark-border hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-dark-text">
                      {choice}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitting}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit Answer'}
              </button>
            </>
          )}

          {/* Loading state for initial load */}
          {loading && !question && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4 animate-bounce">🧠</div>
              <div className="text-gray-500">Loading your question...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
