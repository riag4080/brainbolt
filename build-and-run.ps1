# BrainBolt - Build and Run Script (PowerShell)
# Run this in PowerShell: .\build-and-run.ps1

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   BrainBolt - Building and Running" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -NoNewline
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Clean up previous containers
Write-Host "[STEP 1/4] Cleaning up previous containers..." -ForegroundColor Yellow
docker-compose down -v 2>$null
Write-Host ""

# Build containers
Write-Host "[STEP 2/4] Building containers..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes on first run. Please wait..." -ForegroundColor Gray
Write-Host ""
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Build failed! Check error messages above." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "[STEP 3/4] Starting services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start services!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Wait for services
Write-Host "[STEP 4/4] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host ""

# Check backend health
Write-Host "Checking backend health..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 2>$null
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " WARNING" -ForegroundColor Yellow
    Write-Host "Backend might still be starting. Give it a minute..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   BrainBolt is now running!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:     " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API:  " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host "Database:     " -NoNewline
Write-Host "localhost:5432" -ForegroundColor Cyan
Write-Host "Redis:        " -NoNewline
Write-Host "localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   Useful Commands" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "View logs:           docker-compose logs -f"
Write-Host "View backend logs:   docker-compose logs -f backend"
Write-Host "View frontend logs:  docker-compose logs -f frontend"
Write-Host "Stop services:       docker-compose down"
Write-Host "Restart:             docker-compose restart"
Write-Host ""
Write-Host "Opening frontend in browser..." -ForegroundColor Gray
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
Write-Host ""
Write-Host "Services are running in the background." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit (services will keep running)"
