# BrainBolt - Adaptive Infinite Quiz Platform

## Complete Implementation Guide

### Architecture Overview

This is a full-stack adaptive quiz platform with:
- **Backend**: Node.js + TypeScript + Express + PostgreSQL + Redis
- **Frontend**: Next.js + React + TypeScript + Tailwind CSS
- **Infrastructure**: Docker + Docker Compose

### Key Features Implemented

#### 1. Adaptive Algorithm ✓
- **Ping-pong Prevention**: Momentum-based system with hysteresis bands
- **Edge Cases Handled**:
  - Alternating correct/wrong answers (momentum decay)
  - Boundary conditions (difficulty 1-10 clamping)
  - Consecutive answer tracking
  - Inactivity streak decay (24 hours)

#### 2. Scoring System ✓
- Base score weighted by difficulty (difficulty^1.5)
- Streak multiplier (capped at 3.0x)
- Accuracy bonus for >80% accuracy
- Real-time updates with optimistic locking

#### 3. Streak System ✓
- Increments on correct, resets on wrong
- Max streak tracking
- Multiplier capped at 3.0x
- Decay after 24h inactivity

#### 4. Live Leaderboards ✓
- Two leaderboards: Total Score & Max Streak
- Real-time rank updates after each answer
- Cached with 10s TTL for performance
- Shows user's current rank

#### 5. Real-Time Updates ✓
- All metrics update immediately
- State versioning for consistency
- Cache invalidation on updates
- Idempotent answer submission

### Database Schema

```sql
-- Core tables with indexes
users (id, username, email, password_hash)
questions (id, difficulty, prompt, choices, correct_answer_hash, tags)
user_state (user_id, current_difficulty, streak, max_streak, total_score, 
            difficulty_momentum, consecutive_correct, consecutive_wrong, state_version)
answer_log (id, user_id, question_id, difficulty, answer, correct, 
            score_delta, streak_at_answer, idempotency_key)
leaderboard_score (user_id, username, total_score, accuracy)
leaderboard_streak (user_id, username, max_streak, current_streak)

-- Performance indexes on all critical columns
```

### Caching Strategy

**Redis Keys & TTLs:**
- `user:state:{userId}` - 5 minutes
- `questions:difficulty:{difficulty}` - 1 hour
- `leaderboard:score` - 10 seconds
- `leaderboard:streak` - 10 seconds
- `user:metrics:{userId}` - 1 minute

**Invalidation:**
- User state: On answer submission
- Leaderboards: On any score/streak update
- Question pools: No invalidation (static data)

### API Endpoints

All endpoints under `/v1`:

```
POST /auth/register - Register new user
POST /auth/login - Login
GET  /auth/me - Get current user

GET  /quiz/next - Get next question
POST /quiz/answer - Submit answer (idempotent)
GET  /quiz/metrics - Get user statistics

GET  /leaderboard/score - Top scores
GET  /leaderboard/streak - Top streaks
```

### Adaptive Algorithm Pseudocode

```
function calculateAdaptiveDifficulty(currentState, isCorrect, currentDifficulty):
  if isCorrect:
    streak++
    consecutiveCorrect++
    consecutiveWrong = 0
    momentum += 0.5
    
    if momentum >= 1.0 AND consecutiveCorrect >= 2 AND difficulty < 10:
      difficulty++
      momentum = 0
      consecutiveCorrect = 0
  else:
    streak = 0
    consecutiveWrong++
    consecutiveCorrect = 0
    momentum -= 0.7
    
    if momentum <= -1.0 AND difficulty > 1:
      difficulty--
      momentum = 0
      consecutiveWrong = 0
  
  momentum *= 0.7  // Decay
  momentum = clamp(momentum, -3, 3)
  difficulty = clamp(difficulty, 1, 10)
  
  scoreDelta = calculateScore(difficulty, oldStreak, isCorrect, accuracy)
  return {difficulty, scoreDelta, streak, momentum}
```

### Edge Cases Handled

1. **Ping-Pong Instability**: Momentum + hysteresis prevents rapid oscillation
2. **Boundary Conditions**: Difficulty clamped to [1, 10]
3. **Duplicate Submissions**: Idempotency keys prevent double scoring
4. **State Conflicts**: Optimistic locking with state versions
5. **Inactivity**: Streak resets after 24 hours
6. **Race Conditions**: Database transactions with FOR UPDATE
7. **Cache Consistency**: Immediate invalidation on writes

### Non-Functional Requirements

✓ Strong consistency for user state (optimistic locking + transactions)
✓ Idempotent answer submission (idempotency keys)
✓ Rate limiting (100 req/15min general, 30 answers/min)
✓ Stateless app servers (all state in DB/Redis)
✓ Containerized (Docker + docker-compose)
✓ Single command deployment

### Performance Optimizations

- Connection pooling (PostgreSQL)
- Redis caching with smart TTLs
- Database indexes on all query paths
- Lazy loading & code splitting (frontend)
- SSR for landing page
- Memoization for expensive computations

### Frontend Architecture

**Component Library Structure:**
```
components/
  ui/           - Reusable UI components (Button, Card, etc.)
  quiz/         - Quiz-specific components
  leaderboard/  - Leaderboard components
  layout/       - Layout components
```

**State Management:**
- Zustand for global state
- React hooks for local state
- API client with axios

**Design System:**
- All values from design tokens
- No hardcoded CSS
- Light/dark mode support
- Responsive breakpoints

### Running the Project

```bash
# Single command to run everything
docker-compose up --build

# Access points:
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Database: localhost:5432
# Redis:    localhost:6379
```

### Project Structure

```
brainbolt-quiz/
├── docker-compose.yml          # Orchestration
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── init.sql                # Database schema + seed data
│   └── src/
│       ├── index.ts            # Express server
│       ├── config/             # DB & Redis config
│       ├── controllers/        # Request handlers
│       ├── services/           # Business logic
│       ├── middleware/         # Auth, rate limiting
│       ├── routes/             # API routes
│       └── utils/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── src/
        ├── pages/              # Next.js pages (SSR + CSR)
        ├── components/         # Reusable components
        ├── lib/                # Utilities & API client
        ├── hooks/              # Custom hooks
        ├── types/              # TypeScript types
        └── styles/             # Global styles
```

### Testing the System

1. **Register a user**: POST /auth/register
2. **Login**: POST /auth/login (get token)
3. **Get question**: GET /quiz/next (use token)
4. **Answer**: POST /quiz/answer
5. **Check leaderboard**: GET /leaderboard/score

### Video Demo Requirements

Show in demo:
1. User registration/login
2. Answering questions with difficulty changes
3. Streak building and resetting
4. Score calculations
5. Leaderboard updates in real-time
6. Metrics dashboard
7. Code walkthrough (frontend & backend)
8. Docker setup

