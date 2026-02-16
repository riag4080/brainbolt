# Demo Video Guide

## Video Requirements Checklist

### 1. Project Setup & Running (2-3 minutes)
- [ ] Show the project structure in a file explorer
- [ ] Open terminal and run: `./build-and-run.sh`
- [ ] Show Docker containers starting up
- [ ] Open browser to http://localhost:3000
- [ ] Show backend health check: http://localhost:3001/health

### 2. User Flow Demo (5-7 minutes)

#### Registration & Login
- [ ] Click "Register" on landing page
- [ ] Fill in: username, email, password
- [ ] Show successful registration
- [ ] Logout and login again to demonstrate login flow

#### Quiz Gameplay
- [ ] Answer first question (correct) - show score increase
- [ ] Answer second question (correct) - show streak building
- [ ] Answer third question (correct) - show difficulty increase
- [ ] Answer one wrong - show streak reset and difficulty decrease
- [ ] Continue answering to demonstrate adaptive algorithm
- [ ] Show score multiplier increasing with streak

#### Real-Time Updates
- [ ] Open browser dev tools → Network tab
- [ ] Submit answer
- [ ] Show API response with new scores/streak/difficulty
- [ ] Show immediate UI update

#### Leaderboards
- [ ] Navigate to leaderboard
- [ ] Show top scores
- [ ] Show user's rank updating after answer
- [ ] Switch to streak leaderboard

#### Metrics Dashboard
- [ ] Show difficulty histogram
- [ ] Show accuracy percentage
- [ ] Show recent performance

### 3. Backend Code Walkthrough (5-7 minutes)

#### Adaptive Algorithm
- [ ] Open: `backend/src/services/adaptiveAlgorithm.ts`
- [ ] Explain momentum concept
- [ ] Show hysteresis threshold (prevent ping-pong)
- [ ] Show difficulty bounds [1, 10]
- [ ] Explain score calculation formula

#### Database Schema
- [ ] Open: `backend/init.sql`
- [ ] Show users table
- [ ] Show questions table with 30 seeded questions
- [ ] Show user_state with momentum tracking
- [ ] Point out indexes for performance

#### Quiz Service
- [ ] Open: `backend/src/services/quizService.ts`
- [ ] Show getUserState with caching
- [ ] Show submitAnswer with transaction
- [ ] Point out optimistic locking (state_version)
- [ ] Show idempotency key handling

#### API Endpoints
- [ ] Open: `backend/src/controllers/quizController.ts`
- [ ] Show GET /quiz/next endpoint
- [ ] Show POST /quiz/answer endpoint
- [ ] Explain response structure

#### Caching Strategy
- [ ] Open: `backend/src/config/redis.ts`
- [ ] Show cache key generators
- [ ] Explain TTL values
- [ ] Show invalidation strategy

### 4. Frontend Code Walkthrough (5-7 minutes)

#### Design System
- [ ] Open: `frontend/src/lib/tokens.ts`
- [ ] Show design tokens (no hardcoded values)
- [ ] Open: `frontend/tailwind.config.js`
- [ ] Show how tokens are used

#### Component Library
- [ ] Show component structure
- [ ] Point out reusable components
- [ ] Show responsive design classes

#### State Management
- [ ] Open: `frontend/src/hooks/useAuth.ts`
- [ ] Show auth hook implementation
- [ ] Open quiz page to show state management

#### API Integration
- [ ] Open: `frontend/src/lib/api.ts`
- [ ] Show axios client setup
- [ ] Show JWT token attachment
- [ ] Show API functions

#### Pages
- [ ] Show SSR in index.tsx
- [ ] Show CSR in quiz.tsx
- [ ] Point out lazy loading usage

### 5. Docker Setup (2-3 minutes)
- [ ] Open: `docker-compose.yml`
- [ ] Explain services: postgres, redis, backend, frontend
- [ ] Show health checks
- [ ] Show volume configuration
- [ ] Show environment variables

### 6. Edge Cases Demonstration (3-4 minutes)

#### Ping-Pong Prevention
- [ ] Answer correct, correct, wrong, correct
- [ ] Show difficulty doesn't rapidly oscillate
- [ ] Explain momentum is preventing ping-pong

#### Idempotency
- [ ] Show network tab
- [ ] Submit same answer twice (simulate network retry)
- [ ] Show same result returned

#### Boundary Conditions
- [ ] Get to difficulty 10
- [ ] Answer more correct questions
- [ ] Show difficulty stays at 10

#### Inactivity Decay
- [ ] Explain 24-hour decay (show code)
- [ ] Cannot demonstrate live, but explain logic

### 7. Documentation Review (2-3 minutes)
- [ ] Open: `README.md`
- [ ] Open: `LOW_LEVEL_DESIGN.md`
- [ ] Open: `COMPLETE_PROJECT_GUIDE.md`
- [ ] Mention all requirements covered

### Total Time: 25-30 minutes

## Recording Tips

1. **Preparation**
   - Clean up browser tabs
   - Increase terminal font size
   - Use a clean desktop background
   - Test microphone levels

2. **Screen Recording Settings**
   - 1080p or higher resolution
   - 30fps minimum
   - Clear audio
   - Show cursor

3. **Presentation Style**
   - Speak clearly and at moderate pace
   - Explain what you're doing before doing it
   - Highlight key code sections
   - Show enthusiasm about the features

4. **Code Highlighting**
   - Use a good IDE theme (light or dark)
   - Zoom in on code (125-150%)
   - Highlight important lines
   - Add comments if helpful

5. **Demo Flow**
   - Start with overview
   - Build complexity gradually
   - Show both happy path and edge cases
   - End with summary

## Video Hosting

- Upload to YouTube (unlisted)
- Or Google Drive (public link)
- Include link in README.md
- Name: `BrainBolt_Demo_YourName.mp4`

## Checklist Before Recording

- [ ] All services running
- [ ] Fresh database (reset if needed)
- [ ] Code is clean and formatted
- [ ] README is up to date
- [ ] All requirements implemented
- [ ] Tested end-to-end at least once
