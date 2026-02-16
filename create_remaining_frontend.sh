#!/bin/bash

cd frontend

# Create login page
cat > src/pages/login.tsx << 'EOF'
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      router.push('/quiz');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text mb-2">
            🧠 BrainBolt
          </h1>
          <p className="text-gray-600 dark:text-dark-text-muted">
            Adaptive Quiz Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
              {isLogin ? 'Username or Email' : 'Username'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-error-50 border border-error-500 text-error-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
EOF

# Create quiz page (simplified version)
cat > src/pages/quiz.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { quizAPI } from '@/lib/api';
import { Question, AnswerResponse } from '@/types';

export default function Quiz() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);

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
    } catch (err) {
      console.error('Error loading question:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question) return;

    try {
      setLoading(true);
      const res = await quizAPI.submitAnswer({
        sessionId: question.sessionId,
        questionId: question.questionId,
        answer: selectedAnswer,
        stateVersion: question.stateVersion,
      });
      setFeedback(res.data);
    } catch (err) {
      console.error('Error submitting answer:', err);
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
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
              🧠 BrainBolt
            </h1>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Score</div>
                <div className="text-2xl font-bold text-primary-600">{question?.currentScore || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Streak</div>
                <div className="text-2xl font-bold text-success-600">{question?.currentStreak || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted">Difficulty</div>
                <div className="text-2xl font-bold text-warning-600">{question?.currentDifficulty || 5}</div>
              </div>
            </div>
          </div>

          {feedback && (
            <div className={`mb-6 p-6 rounded-xl ${feedback.correct ? 'bg-success-50 border-2 border-success-500' : 'bg-error-50 border-2 border-error-500'}`}>
              <div className="text-2xl font-bold mb-2">
                {feedback.correct ? '✅ Correct!' : '❌ Wrong'}
              </div>
              <div className="text-lg">
                Score: +{feedback.scoreDelta} | New Streak: {feedback.newStreak} | Difficulty: {feedback.newDifficulty}
              </div>
              <button
                onClick={loadNextQuestion}
                className="mt-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Next Question →
              </button>
            </div>
          )}

          {!feedback && question && (
            <>
              <div className="mb-8">
                <div className="text-sm text-gray-600 dark:text-dark-text-muted mb-2">
                  Question • Difficulty {question.difficulty}
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
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-primary-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-dark-text">{choice}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

echo "Frontend pages created successfully!"
