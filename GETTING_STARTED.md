# 🚀 Getting Started with BrainBolt

## What You Have

This is a **complete, production-ready** adaptive quiz platform with:
- ✅ Full backend (Node.js + TypeScript + PostgreSQL + Redis)
- ✅ Full frontend (Next.js + React + TypeScript + Tailwind)
- ✅ Docker containerization
- ✅ 30 pre-seeded questions
- ✅ Adaptive algorithm with ping-pong prevention
- ✅ Live leaderboards
- ✅ Comprehensive documentation

## Quick Start (5 Minutes)

### Step 1: Prerequisites

Install these if you don't have them:
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/
- **Git**: https://git-scm.com/downloads

### Step 2: Run the Project

```bash
# Make the script executable
chmod +x build-and-run.sh

# Run everything with ONE command
./build-and-run.sh
```

That's it! The script will:
1. Build all Docker images
2. Start PostgreSQL, Redis, Backend, and Frontend
3. Initialize the database with 30 questions
4. Make everything available at:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://localhost:3001

### Step 3: Test It Out

1. Open http://localhost:3000
2. Click "Register"
3. Create an account
4. Start answering questions!
5. Watch your score, streak, and difficulty change in real-time

## Project Structure

```
brainbolt-quiz/
├── README.md                      ← Start here for overview
├── LOW_LEVEL_DESIGN.md           ← Technical deep dive
├── COMPLETE_PROJECT_GUIDE.md     ← Implementation details
├── DEMO_VIDEO_GUIDE.md           ← How to record demo
├── docker-compose.yml            ← Orchestrates everything
├── build-and-run.sh              ← One-command setup
│
├── backend/                      ← Node.js API
│   ├── src/
│   │   ├── services/
│   │   │   ├── adaptiveAlgorithm.ts  ← Core algorithm
│   │   │   ├── quizService.ts        ← Quiz logic
│   │   │   └── authService.ts        ← Auth
│   │   ├── controllers/          ← API handlers
│   │   ├── middleware/           ← Auth, rate limiting
│   │   └── config/               ← DB, Redis
│   └── init.sql                  ← Database schema + seeds
│
└── frontend/                     ← Next.js app
    ├── src/
    │   ├── pages/                ← Routes
    │   ├── components/           ← UI components
    │   ├── lib/                  ← API client, tokens
    │   └── hooks/                ← React hooks
    └── tailwind.config.js        ← Design system
```

## Key Features Implemented

### 1. Adaptive Difficulty ✓
- Starts at difficulty 5
- Increases on correct answers (with 2-answer hysteresis)
- Decreases on wrong answers
- Prevents ping-pong oscillation with momentum tracking

### 2. Scoring System ✓
- Base score: 10 × (difficulty^1.5)
- Streak multiplier: 1 + (streak × 0.1), capped at 3.0x
- Accuracy bonus: 1.2x if accuracy > 80%

### 3. Streak System ✓
- Increments on correct
- Resets on wrong
- Decays after 24 hours inactivity
- Max streak tracked for leaderboard

### 4. Live Leaderboards ✓
- Score leaderboard (total points)
- Streak leaderboard (max streak)
- Real-time rank updates
- Shows your position

### 5. Edge Cases ✓
- Ping-pong prevention (momentum + hysteresis)
- Duplicate answer submission (idempotency)
- State conflicts (optimistic locking)
- Boundary conditions (difficulty 1-10)
- Inactivity decay (24 hours)

## API Endpoints

All under `/v1`:

**Auth**:
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

**Quiz**:
- `GET /quiz/next` - Get next question
- `POST /quiz/answer` - Submit answer
- `GET /quiz/metrics` - Get stats

**Leaderboards**:
- `GET /leaderboard/score` - Top scores
- `GET /leaderboard/streak` - Top streaks

## Testing

### Manual Testing
```bash
# 1. Register
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# 2. Login
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"test","password":"test123"}'

# 3. Get question (use token from login)
curl -X GET http://localhost:3001/v1/quiz/next \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Browser Testing
1. Open http://localhost:3000
2. Register a user
3. Answer questions
4. Watch metrics update
5. Check leaderboards

## Troubleshooting

### Ports Already in Use
```bash
# Check what's using ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill processes or change ports in docker-compose.yml
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up --build
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop Everything
```bash
docker-compose down

# Or to remove volumes too (reset DB)
docker-compose down -v
```

## Next Steps

1. **Read Documentation**:
   - `README.md` - Overview
   - `LOW_LEVEL_DESIGN.md` - Technical details
   - `COMPLETE_PROJECT_GUIDE.md` - Implementation guide

2. **Record Demo Video**:
   - Follow `DEMO_VIDEO_GUIDE.md`
   - Show all features working
   - Explain code walkthrough

3. **Customize**:
   - Add more questions in `backend/init.sql`
   - Adjust difficulty algorithm in `backend/src/services/adaptiveAlgorithm.ts`
   - Customize frontend design

## Assignment Submission Checklist

- [x] Public GitHub repository
- [x] Single command to run (`./build-and-run.sh`)
- [x] Working backend with all endpoints
- [x] Working frontend with component library
- [x] Database schema with indexes
- [x] Caching with Redis
- [x] Adaptive algorithm with ping-pong prevention
- [x] Streak system with multiplier cap
- [x] Live leaderboards
- [x] Real-time updates
- [x] Idempotent operations
- [x] Rate limiting
- [x] Design system tokens (no hardcoded CSS)
- [x] TypeScript throughout
- [x] Docker containerization
- [x] Low-Level Design document
- [ ] Demo video (you need to record this!)

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify Docker is running
3. Ensure ports are available
4. Reset with: `docker-compose down -v && ./build-and-run.sh`

## License

MIT License - Free to use and modify

---

**Happy Coding! 🎉**

Need help? All documentation is in this folder.
