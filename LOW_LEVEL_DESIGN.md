# BrainBolt - Low Level Design (LLD)

## Table of Contents
1. [Class/Module Responsibilities](#classmodule-responsibilities)
2. [API Schemas](#api-schemas)
3. [Database Schema](#database-schema)
4. [Cache Strategy](#cache-strategy)
5. [Adaptive Algorithm Pseudocode](#adaptive-algorithm-pseudocode)
6. [Score Calculation Pseudocode](#score-calculation-pseudocode)
7. [Leaderboard Update Strategy](#leaderboard-update-strategy)
8. [Edge Cases](#edge-cases)

---

## Class/Module Responsibilities

### Backend Modules

#### 1. `config/database.ts`
**Responsibility**: PostgreSQL connection management
- Export `query()` function for parameterized queries
- Export `getClient()` for transaction support
- Connection pooling (max 20 connections)
- Query logging for debugging

#### 2. `config/redis.ts`
**Responsibility**: Redis caching configuration
- Export `redisClient` for cache operations
- Define cache TTLs for different data types
- Export `getCacheKey` generators for consistency
- Export `invalidateCache` helpers

#### 3. `services/adaptiveAlgorithm.ts`
**Responsibility**: Core adaptive difficulty logic
**Functions**:
- `calculateAdaptiveDifficulty()`: Main algorithm
- `calculateStreakMultiplier()`: Streak bonus calculation
- `calculateScoreDelta()`: Score computation
- `shouldDecayStreak()`: Inactivity check
- `getDifficultyRange()`: Question pool selection

**Key Algorithm**:
- Momentum tracking to prevent ping-pong
- Hysteresis band (2 consecutive correct required)
- Difficulty bounds [1, 10]
- Momentum decay factor (0.3)

#### 4. `services/quizService.ts`
**Responsibility**: Quiz business logic
**Functions**:
- `getUserState()`: Fetch/create user state (cached)
- `getNextQuestion()`: Select adaptive question
- `submitAnswer()`: Process answer with idempotency
- `getUserMetrics()`: Aggregate user statistics
- `getLeaderboard()`: Fetch rankings

**Transaction Handling**:
- Uses database transactions for answer submission
- Optimistic locking with state version
- Idempotency check before processing

#### 5. `services/authService.ts`
**Responsibility**: Authentication & user management
**Functions**:
- `registerUser()`: Create account with hashed password
- `loginUser()`: Verify credentials, return JWT
- `verifyToken()`: Decode and validate JWT
- `getUserById()`: Fetch user details

#### 6. `controllers/quizController.ts`
**Responsibility**: HTTP request handling for quiz endpoints
**Endpoints**:
- `getNext()`: GET /v1/quiz/next
- `postAnswer()`: POST /v1/quiz/answer
- `getMetrics()`: GET /v1/quiz/metrics
- `getScoreLeaderboard()`: GET /v1/leaderboard/score
- `getStreakLeaderboard()`: GET /v1/leaderboard/streak

#### 7. `controllers/authController.ts`
**Responsibility**: HTTP request handling for auth endpoints
**Endpoints**:
- `register()`: POST /v1/auth/register
- `login()`: POST /v1/auth/login
- `getCurrentUser()`: GET /v1/auth/me

#### 8. `middleware/auth.ts`
**Responsibility**: JWT authentication middleware
- Extract Bearer token from Authorization header
- Verify token validity
- Attach userId to request object
- Return 401 on failure

#### 9. `middleware/rateLimiter.ts`
**Responsibility**: Rate limiting protection
- `apiLimiter`: 100 requests per 15 minutes
- `authLimiter`: 5 requests per 15 minutes
- `answerLimiter`: 30 answers per minute

---

## API Schemas

### 1. POST /v1/auth/register

**Request**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 chars)"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "token": "jwt-string"
}
```

**Errors**:
- 400: Missing fields or invalid password
- 409: Username/email already exists

### 2. POST /v1/auth/login

**Request**:
```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "token": "jwt-string"
}
```

**Errors**:
- 400: Missing fields
- 401: Invalid credentials

### 3. GET /v1/quiz/next

**Headers**:
```
Authorization: Bearer <token>
```

**Query Params**:
```
sessionId?: string (optional, generated if not provided)
```

**Response** (200):
```json
{
  "questionId": "uuid",
  "difficulty": "number (1-10)",
  "prompt": "string",
  "choices": ["string"],
  "sessionId": "uuid",
  "stateVersion": "number",
  "currentScore": "number",
  "currentStreak": "number",
  "currentDifficulty": "number"
}
```

### 4. POST /v1/quiz/answer

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "sessionId": "uuid",
  "questionId": "uuid",
  "answer": "string",
  "stateVersion": "number",
  "answerIdempotencyKey": "string (optional)"
}
```

**Response** (200):
```json
{
  "correct": "boolean",
  "newDifficulty": "number",
  "newStreak": "number",
  "scoreDelta": "number",
  "totalScore": "number",
  "stateVersion": "number",
  "leaderboardRankScore": "number",
  "leaderboardRankStreak": "number"
}
```

**Errors**:
- 400: Missing required fields
- 409: State version mismatch (retry required)

### 5. GET /v1/quiz/metrics

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "currentDifficulty": "number",
  "streak": "number",
  "maxStreak": "number",
  "totalScore": "number",
  "accuracy": "number",
  "totalQuestions": "number",
  "correctAnswers": "number",
  "difficultyHistogram": [
    {"difficulty": "number", "count": "number"}
  ],
  "recentPerformance": [
    {
      "correct": "boolean",
      "difficulty": "number",
      "answered_at": "timestamp"
    }
  ]
}
```

### 6. GET /v1/leaderboard/score

**Headers**:
```
Authorization: Bearer <token>
```

**Query Params**:
```
limit?: number (default 100, max 100)
```

**Response** (200):
```json
{
  "leaderboard": [
    {
      "user_id": "uuid",
      "username": "string",
      "score": "number",
      "accuracy": "number",
      "total_questions": "number"
    }
  ],
  "userRank": "number | null"
}
```

### 7. GET /v1/leaderboard/streak

**Response** (200):
```json
{
  "leaderboard": [
    {
      "user_id": "uuid",
      "username": "string",
      "score": "number (max_streak)",
      "current_streak": "number"
    }
  ],
  "userRank": "number | null"
}
```

---

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### questions
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    prompt TEXT NOT NULL,
    choices JSONB NOT NULL,
    correct_answer_hash VARCHAR(255) NOT NULL,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_difficulty ON questions(difficulty);
```

#### user_state
```sql
CREATE TABLE user_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_difficulty INTEGER NOT NULL DEFAULT 5 
        CHECK (current_difficulty BETWEEN 1 AND 10),
    streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    total_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    last_question_id UUID REFERENCES questions(id),
    last_answer_at TIMESTAMP WITH TIME ZONE,
    state_version INTEGER NOT NULL DEFAULT 0,
    difficulty_momentum DECIMAL(5, 2) NOT NULL DEFAULT 0,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    consecutive_wrong INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_state_user_id ON user_state(user_id);
```

#### answer_log
```sql
CREATE TABLE answer_log (
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

CREATE INDEX idx_answer_log_user_id ON answer_log(user_id);
CREATE INDEX idx_answer_log_answered_at ON answer_log(answered_at DESC);
CREATE INDEX idx_answer_log_idempotency 
    ON answer_log(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

#### leaderboard_score
```sql
CREATE TABLE leaderboard_score (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    total_score DECIMAL(10, 2) NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_score_total ON leaderboard_score(total_score DESC);
```

#### leaderboard_streak
```sql
CREATE TABLE leaderboard_streak (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    max_streak INTEGER NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_streak_max ON leaderboard_streak(max_streak DESC);
CREATE INDEX idx_leaderboard_streak_current 
    ON leaderboard_streak(current_streak DESC);
```

### Relationships
- `user_state.user_id` → `users.id` (1:1)
- `answer_log.user_id` → `users.id` (N:1)
- `answer_log.question_id` → `questions.id` (N:1)
- `leaderboard_score.user_id` → `users.id` (1:1)
- `leaderboard_streak.user_id` → `users.id` (1:1)

---

## Cache Strategy

### Redis Keys

| Key Pattern | TTL | Invalidation Trigger |
|------------|-----|---------------------|
| `user:state:{userId}` | 5 min | On answer submission |
| `questions:difficulty:{difficulty}` | 1 hour | Never (static data) |
| `leaderboard:score` | 10 sec | On any score update |
| `leaderboard:streak` | 10 sec | On any streak update |
| `user:metrics:{userId}` | 1 min | On answer submission |
| `user:rank:score:{userId}` | 10 sec | On leaderboard change |
| `user:rank:streak:{userId}` | 10 sec | On leaderboard change |

### Cache Flow

**Read Path**:
```
1. Check Redis cache
2. If HIT: Return cached data
3. If MISS:
   a. Query PostgreSQL
   b. Store in Redis with TTL
   c. Return data
```

**Write Path (Answer Submission)**:
```
1. Process answer in PostgreSQL transaction
2. Invalidate user state cache
3. Invalidate user metrics cache
4. Invalidate leaderboard caches
5. Invalidate user rank caches
6. Next read will refresh from DB
```

### Cache Invalidation Strategy

**Eager Invalidation** (Immediate):
- User state on answer submission
- Leaderboards on any score/streak change
- User ranks on leaderboard change

**Lazy Invalidation** (TTL-based):
- Question pools (never change)
- User metrics (low criticality)

**Why This Works**:
- Ensures strong consistency for critical data
- Reduces cache stampede with reasonable TTLs
- Balances freshness vs performance

---

## Adaptive Algorithm Pseudocode

```python
# Configuration Constants
MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 10
HYSTERESIS_THRESHOLD = 2  # Consecutive correct to increase difficulty
MOMENTUM_DECAY = 0.3
MOMENTUM_GAIN_CORRECT = 0.5
MOMENTUM_LOSS_WRONG = 0.7
DIFFICULTY_INCREASE_THRESHOLD = 1.0
DIFFICULTY_DECREASE_THRESHOLD = -1.0

function calculateAdaptiveDifficulty(currentState, isCorrect, currentDifficulty):
    # Initialize variables
    newDifficulty = currentDifficulty
    newMomentum = currentState.difficultyMomentum
    newConsecutiveCorrect = currentState.consecutiveCorrect
    newConsecutiveWrong = currentState.consecutiveWrong
    newStreak = currentState.streak
    
    if isCorrect:
        # Correct Answer Path
        newStreak = currentState.streak + 1
        newConsecutiveCorrect += 1
        newConsecutiveWrong = 0
        
        # Increase momentum
        newMomentum = currentState.difficultyMomentum + MOMENTUM_GAIN_CORRECT
        
        # Check conditions for difficulty increase
        if (newMomentum >= DIFFICULTY_INCREASE_THRESHOLD 
            AND newConsecutiveCorrect >= HYSTERESIS_THRESHOLD 
            AND currentDifficulty < MAX_DIFFICULTY):
            
            newDifficulty = currentDifficulty + 1
            newMomentum = 0  # Reset momentum
            newConsecutiveCorrect = 0  # Reset counter
    
    else:
        # Wrong Answer Path
        newStreak = 0  # Reset streak
        newConsecutiveWrong += 1
        newConsecutiveCorrect = 0
        
        # Decrease momentum
        newMomentum = currentState.difficultyMomentum - MOMENTUM_LOSS_WRONG
        
        # Check conditions for difficulty decrease
        if (newMomentum <= DIFFICULTY_DECREASE_THRESHOLD 
            AND currentDifficulty > MIN_DIFFICULTY):
            
            newDifficulty = currentDifficulty - 1
            newMomentum = 0  # Reset momentum
            newConsecutiveWrong = 0  # Reset counter
    
    # Apply momentum decay
    newMomentum = newMomentum * (1 - MOMENTUM_DECAY)
    
    # Clamp momentum to bounds
    newMomentum = clamp(newMomentum, -3, 3)
    
    # Ensure difficulty within bounds
    newDifficulty = clamp(newDifficulty, MIN_DIFFICULTY, MAX_DIFFICULTY)
    
    return {
        newDifficulty,
        newStreak,
        newMomentum,
        newConsecutiveCorrect,
        newConsecutiveWrong
    }
```

---

## Score Calculation Pseudocode

```python
# Configuration
BASE_SCORE_MULTIPLIER = 10
DIFFICULTY_WEIGHT = 1.5
MAX_STREAK_MULTIPLIER = 3.0
STREAK_MULTIPLIER_RATE = 0.1

function calculateScoreDelta(difficulty, streak, isCorrect, accuracy):
    if not isCorrect:
        return 0  # No points for wrong answers
    
    # Base score weighted by difficulty
    difficultyScore = BASE_SCORE_MULTIPLIER * pow(difficulty, DIFFICULTY_WEIGHT)
    
    # Streak multiplier (capped)
    streakMultiplier = 1 + (streak * STREAK_MULTIPLIER_RATE)
    streakMultiplier = min(streakMultiplier, MAX_STREAK_MULTIPLIER)
    
    # Accuracy bonus
    accuracyBonus = 1.2 if accuracy > 0.8 else 1.0
    
    # Total score
    totalScore = difficultyScore * streakMultiplier * accuracyBonus
    
    # Round to 2 decimal places
    return round(totalScore, 2)

function calculateStreakMultiplier(streak):
    multiplier = 1 + (streak * STREAK_MULTIPLIER_RATE)
    return min(multiplier, MAX_STREAK_MULTIPLIER)
```

**Example Calculations**:

| Difficulty | Streak | Accuracy | Base | Streak Mult | Acc Bonus | Final Score |
|-----------|--------|----------|------|-------------|-----------|-------------|
| 5 | 0 | 0.50 | 112 | 1.0x | 1.0x | 112 |
| 5 | 10 | 0.85 | 112 | 2.0x | 1.2x | 269 |
| 10 | 15 | 0.90 | 316 | 2.5x | 1.2x | 949 |

---

## Leaderboard Update Strategy

### Update Flow

```python
function updateLeaderboards(transaction, userId, totalScore, maxStreak, currentStreak):
    # Get username
    username = getUsernameFromDB(userId)
    
    # Calculate accuracy
    userState = getUserState(userId)
    accuracy = (userState.correctAnswers / userState.totalQuestions) * 100
    
    # Update score leaderboard (UPSERT)
    UPSERT INTO leaderboard_score (user_id, username, total_score, total_questions, accuracy)
    VALUES (userId, username, totalScore, userState.totalQuestions, accuracy)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_score = totalScore,
        total_questions = userState.totalQuestions,
        accuracy = accuracy,
        updated_at = NOW()
    
    # Update streak leaderboard (UPSERT)
    UPSERT INTO leaderboard_streak (user_id, username, max_streak, current_streak)
    VALUES (userId, username, maxStreak, currentStreak)
    ON CONFLICT (user_id)
    DO UPDATE SET
        max_streak = maxStreak,
        current_streak = currentStreak,
        updated_at = NOW()
    
    # Invalidate caches
    invalidateCache('leaderboard:score')
    invalidateCache('leaderboard:streak')
    invalidateCache('user:rank:score:' + userId)
    invalidateCache('user:rank:streak:' + userId)
```

### Rank Calculation

```python
function getUserScoreRank(userId):
    # Count users with higher score
    rank = COUNT(*) + 1
    FROM leaderboard_score
    WHERE total_score > (
        SELECT total_score 
        FROM leaderboard_score 
        WHERE user_id = userId
    )
    
    return rank

function getUserStreakRank(userId):
    # Count users with higher max streak
    rank = COUNT(*) + 1
    FROM leaderboard_streak
    WHERE max_streak > (
        SELECT max_streak 
        FROM leaderboard_streak 
        WHERE user_id = userId
    )
    
    return rank
```

### Real-Time Guarantee

**Transaction Sequence**:
1. BEGIN TRANSACTION
2. Lock user_state row (FOR UPDATE)
3. Update user_state
4. Insert into answer_log
5. Update leaderboard_score (UPSERT)
6. Update leaderboard_streak (UPSERT)
7. COMMIT TRANSACTION
8. Invalidate all relevant caches
9. Return response with fresh rank

This ensures atomicity and prevents race conditions.

---

## Edge Cases

### 1. Ping-Pong Instability

**Problem**: User alternates correct/wrong, causing difficulty to oscillate between two levels.

**Example**:
```
Difficulty 5: Correct → Difficulty 6
Difficulty 6: Wrong → Difficulty 5
Difficulty 5: Correct → Difficulty 6
... (infinite loop)
```

**Solution**:
- **Hysteresis Band**: Require 2 consecutive correct to increase
- **Momentum Tracking**: Accumulate momentum, don't change on single answer
- **Decay**: 30% momentum decay prevents indefinite accumulation

**Implementation**:
```python
# Won't increase difficulty on first correct after wrong
if (momentum >= 1.0 AND consecutiveCorrect >= 2):
    difficulty++
```

### 2. Boundary Conditions

**Problem**: Difficulty tries to go below 1 or above 10.

**Solution**: Clamp to bounds
```python
newDifficulty = clamp(newDifficulty, 1, 10)
```

**Edge Case**: User at difficulty 10 keeps getting correct
- Difficulty stays at 10
- Momentum continues to accumulate and decay
- Score continues to increase with streak

### 3. Duplicate Answer Submission

**Problem**: Network issues cause same answer to be submitted twice.

**Solution**: Idempotency keys
```python
# Check idempotency before processing
existingAnswer = findAnswerByIdempotencyKey(idempotencyKey)
if existingAnswer:
    return cachedResult(existingAnswer)

# Otherwise process normally
processAnswer(...)
```

**Guarantees**:
- Same idempotency key always returns same result
- No double scoring
- No double streak increment

### 4. State Version Conflicts

**Problem**: Two concurrent answer submissions for same user.

**Solution**: Optimistic locking
```sql
SELECT * FROM user_state 
WHERE user_id = ? AND state_version = ? 
FOR UPDATE
```

**Flow**:
1. Read state with version N
2. User submits with version N
3. Update checks version is still N
4. If mismatch: return 409 Conflict, client retries

### 5. Inactivity Streak Decay

**Problem**: User doesn't play for days, should streak reset?

**Solution**: Time-based decay (24 hours)
```python
function shouldDecayStreak(lastAnswerAt):
    INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000  # 24 hours
    timeSinceLastAnswer = now() - lastAnswerAt
    return timeSinceLastAnswer > INACTIVITY_THRESHOLD
```

**Implementation**:
- Check on every `getNextQuestion()` call
- Reset streak to 0 if threshold exceeded
- Max streak preserved for leaderboard

### 6. Race Condition on Leaderboard Update

**Problem**: Two users update leaderboard simultaneously.

**Solution**: Database-level UPSERT
```sql
INSERT INTO leaderboard_score (...)
ON CONFLICT (user_id)
DO UPDATE SET ...
```

**Why it works**:
- Database handles concurrency
- Each user updates own row
- No cross-user interference

### 7. Cache Stampede

**Problem**: Cache expires, many requests hit database simultaneously.

**Solution**:
- Reasonable TTLs (not too short)
- Immediate invalidation on writes
- Connection pooling prevents DB overload

### 8. Cold Start (New User)

**Problem**: New user has no history, how to initialize?

**Solution**:
```python
# Default values
currentDifficulty = 5  # Middle difficulty
streak = 0
momentum = 0
consecutiveCorrect = 0
consecutiveWrong = 0
```

**Rationale**:
- Difficulty 5 is neither too easy nor too hard
- System adapts quickly based on performance

### 9. All Questions at Difficulty Exhausted

**Problem**: User needs difficulty 8 question but all were recently shown.

**Solution**: Difficulty range selection
```python
difficultyRange = [targetDifficulty, targetDifficulty ± 1]
questions = getQuestions(difficultyRange)
questions = filterOut(lastQuestionId)
```

**Fallback**: If still empty, allow repetition of last question

### 10. Negative Scores

**Problem**: Can users get negative scores?

**Solution**: No
```python
if not isCorrect:
    return 0  # No penalty, just no points
```

**Rationale**: 
- Encourages participation
- Wrong answers already penalize via streak reset and difficulty decrease

---

## Summary

This LLD provides:
✅ Complete class/module breakdown with responsibilities  
✅ Detailed API request/response schemas  
✅ Full database schema with indexes  
✅ Redis caching strategy with TTLs and invalidation  
✅ Pseudocode for adaptive algorithm  
✅ Pseudocode for score calculation  
✅ Leaderboard update strategy  
✅ Comprehensive edge case handling  

All implementation details are production-ready and handle real-world scenarios.
