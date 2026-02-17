# 🧠 BrainBolt - Adaptive Infinite Quiz Platform

An intelligent quiz platform that adapts difficulty in real-time based on your performance, featuring live leaderboards and comprehensive metrics.

Demo Video Link :  https://drive.google.com/file/d/1enUuLit7udSEqNOZODOPEkcCUdvi901N/view?usp=sharing

## ✨ Features

### 🎯 Core Features
- **Adaptive Difficulty**: Questions adapt based on your performance with ping-pong prevention
- **Streak System**: Build streaks for score multipliers (capped at 3.0x)
- **Live Leaderboards**: Real-time rankings for both score and streak
- **Comprehensive Metrics**: Track accuracy, difficulty progression, and recent performance
- **Real-time Updates**: All stats update immediately after each answer

### 🛡️ Technical Highlights
- **Ping-Pong Prevention**: Momentum-based algorithm prevents rapid difficulty oscillation
- **Strong Consistency**: Optimistic locking ensures data integrity
- **Idempotent Operations**: Duplicate answer submissions handled gracefully
- **Caching Strategy**: Redis caching with intelligent invalidation
- **Rate Limiting**: Protects against abuse (100 req/15min, 30 answers/min)
- **Containerized**: Full Docker setup with one-command deployment

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum
- Ports 3000, 3001, 5432, 6379 available

### Single Command Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd brainbolt-quiz

# Run everything
./build-and-run.sh
```

### Manual Setup

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

## 📁 Project Structure

```
brainbolt-quiz/
├── docker-compose.yml              # Container orchestration
├── build-and-run.sh               # Single command setup
├── COMPLETE_PROJECT_GUIDE.md      # Detailed technical guide
│
├── backend/                        # Node.js + TypeScript + Express
│   ├── Dockerfile
│   ├── init.sql                   # Database schema + 30 seed questions
│   ├── src/
│   │   ├── config/                # Database & Redis configuration
│   │   ├── controllers/           # API request handlers
│   │   ├── services/
│   │   │   ├── adaptiveAlgorithm.ts  # Core adaptive logic
│   │   │   ├── quizService.ts        # Quiz business logic
│   │   │   └── authService.ts        # Authentication
│   │   ├── middleware/            # Auth & rate limiting
│   │   └── routes/                # API endpoints
│   └── package.json
│
└── frontend/                       # Next.js + React + TypeScript
    ├── Dockerfile
    ├── tailwind.config.js         # Design system tokens
    ├── src/
    │   ├── components/            # Reusable component library
    │   ├── pages/                 # Next.js pages (SSR + CSR)
    │   ├── lib/
    │   │   ├── tokens.ts          # Design system tokens (no hardcoded CSS)
    │   │   └── api.ts             # API client
    │   ├── hooks/                 # Custom React hooks
    │   └── types/                 # TypeScript definitions
    └── package.json
```

## 🎮 How It Works

### Adaptive Algorithm

The system uses a sophisticated momentum-based algorithm to adjust difficulty:

1. **Correct Answer**:
   - Streak increases
   - Momentum +0.5
   - Difficulty increases if: momentum ≥ 1.0 AND 2+ consecutive correct

2. **Wrong Answer**:
   - Streak resets to 0
   - Momentum -0.7
   - Difficulty decreases if: momentum ≤ -1.0

3. **Ping-Pong Prevention**:
   - Hysteresis band: requires 2 consecutive correct to increase
   - Momentum decay: 30% decay per answer
   - Prevents rapid oscillation between difficulty levels

### Scoring Formula

```
Base Score = 10 × (difficulty^1.5)
Streak Multiplier = 1 + (streak × 0.1), capped at 3.0x
Accuracy Bonus = 1.2x if accuracy > 80%

Final Score = Base Score × Streak Multiplier × Accuracy Bonus
```

## 📊 API Endpoints

### Authentication
```
POST /v1/auth/register    - Create account
POST /v1/auth/login       - Login
GET  /v1/auth/me          - Get current user
```

### Quiz
```
GET  /v1/quiz/next        - Get next question
POST /v1/quiz/answer      - Submit answer (idempotent)
GET  /v1/quiz/metrics     - Get user statistics
```

### Leaderboards
```
GET /v1/leaderboard/score   - Top scores
GET /v1/leaderboard/streak  - Top streaks
```

## 🏗️ Architecture

### Backend Stack
- **Runtime**: Node.js 18 + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (with indexes)
- **Cache**: Redis 7 (smart TTL strategy)
- **Auth**: JWT + bcrypt

### Frontend Stack
- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS (design tokens only)
- **State**: Zustand
- **HTTP**: Axios
- **Animations**: Framer Motion

### Database Schema

**Core Tables**:
- `users` - User accounts
- `questions` - 30 pre-seeded questions (difficulty 1-10)
- `user_state` - Current user state with momentum tracking
- `answer_log` - Audit log with idempotency
- `leaderboard_score` - Materialized score rankings
- `leaderboard_streak` - Materialized streak rankings

**Key Indexes**:
- Questions by difficulty
- Leaderboards sorted by score/streak
- Answer log by user and timestamp
- Idempotency key for duplicate detection

## 🔐 Security Features

- JWT authentication with 7-day expiry
- Password hashing with bcrypt (10 rounds)
- Rate limiting on all endpoints
- CORS protection
- Helmet.js security headers
- SQL injection prevention (parameterized queries)

## 🎯 Edge Cases Handled

1. **Ping-Pong Instability**: Momentum + hysteresis prevents alternating difficulty
2. **Duplicate Submissions**: Idempotency keys prevent double scoring
3. **State Conflicts**: Optimistic locking with version numbers
4. **Inactivity**: Streak resets after 24 hours
5. **Boundary Conditions**: Difficulty clamped to [1, 10]
6. **Race Conditions**: Database transactions with row locking

## 📈 Performance Optimizations

### Backend
- PostgreSQL connection pooling (max 20)
- Redis caching with smart TTLs
- Indexes on all query paths
- Materialized leaderboard tables

### Frontend
- Next.js SSR for landing page
- Code splitting & lazy loading
- React.memo for expensive components
- Optimistic UI updates

## 🧪 Testing

### Test User Flow
```bash
# 1. Register
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# 2. Login (get token)
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"testuser","password":"password123"}'

# 3. Get question
curl -X GET http://localhost:3001/v1/quiz/next \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Submit answer
curl -X POST http://localhost:3001/v1/quiz/answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"...","questionId":"...","answer":"...","stateVersion":0}'
```

## 📹 Demo Video

The demo video shows:
1. ✅ User registration and login
2. ✅ Answering questions with real-time difficulty changes
3. ✅ Streak building and score multipliers
4. ✅ Leaderboard updates
5. ✅ Metrics dashboard
6. ✅ Frontend code walkthrough
7. ✅ Backend code walkthrough
8. ✅ Docker setup demonstration

## 🛠️ Development

### Local Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend (`.env`):
```
DATABASE_URL=postgresql://brainbolt:brainbolt123@localhost:5432/brainbolt
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

Frontend (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🛑 Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v
```

## 📚 Additional Documentation

- See `COMPLETE_PROJECT_GUIDE.md` for detailed technical documentation
- See `backend/src/services/adaptiveAlgorithm.ts` for algorithm details
- See `frontend/src/lib/tokens.ts` for design system tokens

## 🎓 Assignment Requirements

### ✅ Completed Requirements

- [x] Adaptive algorithm with ping-pong prevention
- [x] User score/metrics model with edge cases
- [x] Streak system with capped multiplier
- [x] Live leaderboards (score & streak)
- [x] Real-time updates
- [x] Idempotent answer submission
- [x] Rate limiting
- [x] Strong consistency
- [x] Stateless app servers
- [x] Containerization
- [x] Single command deployment
- [x] Design system tokens
- [x] Component library
- [x] Responsive design
- [x] SSR + CSR
- [x] TypeScript throughout
- [x] Low-level design documentation

## 👨‍💻 Author

Created for the BrainBolt assignment.

## 📄 License

MIT License - See LICENSE file for details

---

**Happy Quizzing! 🎉**
