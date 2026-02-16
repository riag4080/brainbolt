-- BrainBolt Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions table with varying difficulty
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    prompt TEXT NOT NULL,
    choices JSONB NOT NULL,
    correct_answer_hash VARCHAR(255) NOT NULL,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User state table for real-time tracking
CREATE TABLE IF NOT EXISTS user_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_difficulty INTEGER NOT NULL DEFAULT 5 CHECK (current_difficulty BETWEEN 1 AND 10),
    streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    total_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    last_question_id UUID REFERENCES questions(id),
    last_answer_at TIMESTAMP WITH TIME ZONE,
    state_version INTEGER NOT NULL DEFAULT 0,
    difficulty_momentum DECIMAL(5, 2) NOT NULL DEFAULT 0, -- For ping-pong prevention
    consecutive_correct INTEGER NOT NULL DEFAULT 0, -- For stabilizer
    consecutive_wrong INTEGER NOT NULL DEFAULT 0, -- For stabilizer
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Answer log for analytics and audit
CREATE TABLE IF NOT EXISTS answer_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    difficulty INTEGER NOT NULL,
    answer TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    score_delta DECIMAL(10, 2) NOT NULL,
    streak_at_answer INTEGER NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(255) UNIQUE,
    session_id UUID
);

-- Leaderboard score table (materialized for performance)
CREATE TABLE IF NOT EXISTS leaderboard_score (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    total_score DECIMAL(10, 2) NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard streak table (materialized for performance)
CREATE TABLE IF NOT EXISTS leaderboard_streak (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    max_streak INTEGER NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_state_user_id ON user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_log_user_id ON answer_log(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_log_answered_at ON answer_log(answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_answer_log_idempotency ON answer_log(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboard_score_total ON leaderboard_score(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak_max ON leaderboard_streak(max_streak DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak_current ON leaderboard_streak(current_streak DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_state_updated_at BEFORE UPDATE ON user_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_score_updated_at BEFORE UPDATE ON leaderboard_score
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_streak_updated_at BEFORE UPDATE ON leaderboard_streak
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed questions with varying difficulty
INSERT INTO questions (difficulty, prompt, choices, correct_answer_hash, tags) VALUES
-- Difficulty 1-2 (Easy)
(1, 'What is 2 + 2?', '["3", "4", "5", "6"]', '4', ARRAY['math', 'basic']),
(1, 'What color is the sky on a clear day?', '["Blue", "Green", "Red", "Yellow"]', 'Blue', ARRAY['general']),
(2, 'What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 'Paris', ARRAY['geography']),
(2, 'How many days are in a week?', '["5", "6", "7", "8"]', '7', ARRAY['general']),

-- Difficulty 3-4 (Medium)
(3, 'What is 15 × 7?', '["95", "105", "115", "125"]', '105', ARRAY['math']),
(3, 'Who painted the Mona Lisa?', '["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"]', 'Leonardo da Vinci', ARRAY['art', 'history']),
(4, 'What is the chemical symbol for gold?', '["Go", "Gd", "Au", "Ag"]', 'Au', ARRAY['science', 'chemistry']),
(4, 'In which year did World War II end?', '["1943", "1944", "1945", "1946"]', '1945', ARRAY['history']),

-- Difficulty 5-6 (Medium-Hard)
(5, 'What is the square root of 144?', '["10", "11", "12", "13"]', '12', ARRAY['math']),
(5, 'Who wrote "Romeo and Juliet"?', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]', 'William Shakespeare', ARRAY['literature']),
(6, 'What is the speed of light in vacuum (approximately)?', '["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"]', '300,000 km/s', ARRAY['science', 'physics']),
(6, 'Which planet is known as the Red Planet?', '["Venus", "Mars", "Jupiter", "Saturn"]', 'Mars', ARRAY['science', 'astronomy']),

-- Difficulty 7-8 (Hard)
(7, 'What is 23 × 47?', '["1071", "1081", "1091", "1101"]', '1081', ARRAY['math']),
(7, 'In what year was the first iPhone released?', '["2005", "2006", "2007", "2008"]', '2007', ARRAY['technology', 'history']),
(8, 'What is the capital of Kazakhstan?', '["Almaty", "Astana", "Nur-Sultan", "Bishkek"]', 'Astana', ARRAY['geography']),
(8, 'Who developed the theory of general relativity?', '["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"]', 'Albert Einstein', ARRAY['science', 'physics']),

-- Difficulty 9-10 (Very Hard)
(9, 'What is the cube root of 2744?', '["13", "14", "15", "16"]', '14', ARRAY['math']),
(9, 'Which programming language was developed by Guido van Rossum?', '["Java", "Python", "Ruby", "JavaScript"]', 'Python', ARRAY['technology', 'programming']),
(10, 'What is the smallest prime number greater than 100?', '["101", "103", "107", "109"]', '101', ARRAY['math']),
(10, 'In which year did the Byzantine Empire fall?', '["1443", "1453", "1463", "1473"]', '1453', ARRAY['history']),

-- More questions across all difficulty levels
(1, 'What is 5 - 3?', '["1", "2", "3", "4"]', '2', ARRAY['math', 'basic']),
(2, 'How many continents are there?', '["5", "6", "7", "8"]', '7', ARRAY['geography']),
(3, 'What is the largest ocean on Earth?', '["Atlantic", "Indian", "Pacific", "Arctic"]', 'Pacific', ARRAY['geography']),
(4, 'What is H2O commonly known as?', '["Oxygen", "Hydrogen", "Water", "Carbon dioxide"]', 'Water', ARRAY['science', 'chemistry']),
(5, 'Who was the first President of the United States?', '["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"]', 'George Washington', ARRAY['history']),
(6, 'What is the powerhouse of the cell?', '["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"]', 'Mitochondria', ARRAY['science', 'biology']),
(7, 'What is the most abundant gas in Earth''s atmosphere?', '["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"]', 'Nitrogen', ARRAY['science']),
(8, 'What is the name of the longest river in the world?', '["Amazon", "Nile", "Yangtze", "Mississippi"]', 'Nile', ARRAY['geography']),
(9, 'What year was the Declaration of Independence signed?', '["1774", "1775", "1776", "1777"]', '1776', ARRAY['history']),
(10, 'What is the SI unit of electric current?', '["Volt", "Ampere", "Ohm", "Watt"]', 'Ampere', ARRAY['science', 'physics']);
