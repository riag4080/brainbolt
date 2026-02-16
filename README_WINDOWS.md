# 🪟 BrainBolt - Windows Setup Guide

## Quick Start for Windows

### Prerequisites
1. **Docker Desktop** installed and running
   - Download: https://www.docker.com/products/docker-desktop/
   - Make sure it's running (whale icon in system tray)

### Method 1: Using PowerShell (Easiest)

1. Open **PowerShell** (normal mode, no admin needed)

2. Navigate to project folder:
   ```powershell
   cd path\to\brainbolt-quiz
   ```

3. Run the project:
   ```powershell
   docker-compose up --build
   ```

4. Open browser:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Method 2: Using Batch File

1. Open **Command Prompt** or **PowerShell**

2. Navigate to project:
   ```bash
   cd path\to\brainbolt-quiz
   ```

3. Run:
   ```bash
   build-and-run.bat
   ```

### Method 3: Using Git Bash (if installed)

1. Open **Git Bash**

2. Navigate to project:
   ```bash
   cd /c/path/to/brainbolt-quiz
   ```

3. Run:
   ```bash
   chmod +x build-and-run.sh
   ./build-and-run.sh
   ```

## Troubleshooting

### "Docker is not running"
1. Start **Docker Desktop** from Start Menu
2. Wait for whale icon to appear in system tray
3. Try again

### Port Already in Use
```powershell
# Find what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process (replace PID with actual number)
taskkill /PID <process_id> /F
```

### WSL Error
If you see WSL error:
1. Open **PowerShell as Administrator**
2. Run:
   ```powershell
   wsl --update
   wsl --install
   ```
3. Restart computer
4. Start Docker Desktop
5. Try again

### Clean Reset
```powershell
# Stop everything and remove data
docker-compose down -v

# Remove all Docker images (optional)
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## Stopping the Application

### Option 1: Ctrl+C in terminal where it's running

### Option 2: PowerShell command
```powershell
docker-compose down
```

### Option 3: Docker Desktop
- Open Docker Desktop
- Go to Containers tab
- Click stop on brainbolt containers

## File Paths on Windows

Windows uses backslashes `\` for paths:
```
C:\Users\YourName\Projects\brainbolt-quiz
```

In commands, use forward slashes `/` or escape backslashes `\\`.

## Running Individual Services

### Backend only:
```powershell
docker-compose up backend postgres redis
```

### Frontend only (after backend is running):
```powershell
docker-compose up frontend
```

## Development on Windows

### Backend Development
```powershell
cd backend
npm install
npm run dev
```

### Frontend Development
```powershell
cd frontend
npm install
npm run dev
```

## Common Windows Issues

### Line Ending Issues
If you get errors about `\r`:
```powershell
# Install dos2unix (via Git Bash or WSL)
dos2unix build-and-run.sh

# Or in PowerShell:
(Get-Content build-and-run.sh) | Set-Content -NoNewline build-and-run.sh
```

### Permission Issues
Run PowerShell or Command Prompt as **Administrator** if you get permission errors.

### Network Issues
Make sure Windows Firewall allows Docker:
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Find Docker Desktop and allow it

## IDE Setup (VS Code on Windows)

1. Install VS Code: https://code.visualstudio.com/
2. Install extensions:
   - Docker
   - Remote - Containers
   - ESLint
   - Prettier

3. Open project:
   ```
   code path\to\brainbolt-quiz
   ```

## Next Steps

Once running:
1. Open http://localhost:3000
2. Register a new user
3. Start playing quiz
4. Check leaderboards

See main `README.md` for full documentation.

## Need Help?

- Check Docker Desktop logs
- Run: `docker-compose logs -f`
- Make sure all ports (3000, 3001, 5432, 6379) are free
