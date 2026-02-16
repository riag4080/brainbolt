@echo off
echo.
echo ======================================
echo    BrainBolt - Building and Running
echo ======================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Clean up previous containers
echo [STEP 1/4] Cleaning up previous containers...
docker-compose down -v 2>nul
echo.

REM Build containers
echo [STEP 2/4] Building containers (this may take 5-10 minutes first time)...
docker-compose build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Check the error messages above.
    echo.
    pause
    exit /b 1
)
echo.

REM Start services
echo [STEP 3/4] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start services!
    echo.
    pause
    exit /b 1
)
echo.

REM Wait for services
echo [STEP 4/4] Waiting for services to be ready...
timeout /t 15 /nobreak >nul
echo.

REM Check backend health
echo Checking backend health...
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend might still be starting. Give it a minute...
) else (
    echo [OK] Backend is healthy!
)
echo.

echo ======================================
echo    BrainBolt is now running!
echo ======================================
echo.
echo Frontend:     http://localhost:3000
echo Backend API:  http://localhost:3001
echo Database:     localhost:5432
echo Redis:        localhost:6379
echo.
echo ======================================
echo    Useful Commands
echo ======================================
echo View logs:           docker-compose logs -f
echo View backend logs:   docker-compose logs -f backend
echo View frontend logs:  docker-compose logs -f frontend
echo Stop services:       docker-compose down
echo Restart:             docker-compose restart
echo.
echo Opening frontend in browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo Press any key to exit (services will keep running)...
pause >nul
