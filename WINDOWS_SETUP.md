# 🪟 Windows Users - Quick Start Guide

## ⚡ Option 1: Using Batch File (Recommended)

Sabse easy way - double click karo:

1. **`build-and-run.bat`** file ko double-click karo
2. Bas! Automatic sab kuch ho jayega

Ya command line se:
```cmd
build-and-run.bat
```

---

## ⚡ Option 2: Using PowerShell Script

PowerShell mein:

```powershell
# First time - execution policy set karo (agar error aaye)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run script
.\build-and-run.ps1
```

---

## ⚡ Option 3: Direct Docker Compose (Manual)

Agar scripts kaam na karein:

```cmd
# Step 1: Previous cleanup
docker-compose down -v

# Step 2: Build
docker-compose build

# Step 3: Run
docker-compose up -d

# Step 4: Check logs
docker-compose logs -f
```

---

## 🐛 Common Windows Issues & Solutions

### Issue 1: "Docker is not running"
**Solution:**
1. Docker Desktop kholo
2. Wait karo jab tak whale icon green na ho jaye
3. Phir script run karo

### Issue 2: "build-and-run.sh" not working
**Solution:**
- Bash script Linux/Mac ke liye hai
- Windows pe `.bat` ya `.ps1` use karo
- Ya Git Bash install karo

### Issue 3: Port already in use
**Solution:**
```cmd
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Kill process (replace PID with actual process ID)
taskkill /PID <process_id> /F
```

### Issue 4: PowerShell script blocked
**Error:** "cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Type 'Y' for Yes
```

### Issue 5: WSL2 not installed (for Docker)
**Solution:**
1. Open PowerShell as Administrator:
```powershell
wsl --install
```
2. Restart computer
3. Install Docker Desktop
4. Enable WSL2 backend in Docker settings

### Issue 6: Drive not shared in Docker
**Solution:**
1. Open Docker Desktop
2. Go to Settings → Resources → File Sharing
3. Add your C: drive
4. Apply & Restart

---

## 📋 Step-by-Step Instructions

### First Time Setup:

```cmd
1. Ensure Docker Desktop is running (green whale icon in taskbar)

2. Open PowerShell or Command Prompt in project folder
   - Shift + Right Click in folder → "Open PowerShell window here"
   - Or use 'cd' command to navigate

3. Run one of these:
   build-and-run.bat          (Batch file)
   .\build-and-run.ps1        (PowerShell)

4. Wait 5-10 minutes for first build

5. When done, browser will open automatically to http://localhost:3000
```

---

## 🔍 Verify Installation

```cmd
# Check if containers are running
docker-compose ps

# Should show:
# - brainbolt-quiz-postgres-1   running   5432/tcp
# - brainbolt-quiz-redis-1      running   6379/tcp
# - brainbolt-quiz-backend-1    running   3001/tcp
# - brainbolt-quiz-frontend-1   running   3000/tcp
```

---

## 🌐 Access the Application

After successful build:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 🛑 Stop the Application

```cmd
# Option 1: Stop containers but keep data
docker-compose stop

# Option 2: Stop and remove containers (keeps data)
docker-compose down

# Option 3: Complete cleanup (removes everything)
docker-compose down -v
```

---

## 📊 View Logs

```cmd
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis

# Exit logs: Press Ctrl+C
```

---

## 🔄 Restart Services

```cmd
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

---

## 💾 Files You Need

Make sure these files are in your project folder:

```
brainbolt-quiz-FIXED-v2/
├── build-and-run.bat        ← Windows batch file
├── build-and-run.ps1        ← PowerShell script
├── build-and-run.sh         ← Linux/Mac (ignore on Windows)
├── docker-compose.yml       ← Required!
├── backend/
│   ├── Dockerfile           ← Required!
│   └── ...
└── frontend/
    ├── Dockerfile           ← Required!
    └── ...
```

---

## ⚠️ Important Notes for Windows Users

1. **Docker Desktop must be running** before you run any script
2. **First build takes 5-10 minutes** - be patient!
3. **Use CMD or PowerShell**, not Git Bash for these scripts
4. **Antivirus might slow down** Docker - temporarily disable if too slow
5. **WSL2 backend** is recommended for Docker Desktop on Windows

---

## 🆘 Still Not Working?

Try these in order:

### 1. Clean Docker completely
```cmd
docker-compose down -v
docker system prune -a --volumes
```

### 2. Restart Docker Desktop
- Right-click Docker Desktop in taskbar
- Click "Quit Docker Desktop"
- Start it again
- Wait for green whale icon

### 3. Check Docker resources
- Docker Desktop → Settings → Resources
- Ensure at least:
  - CPUs: 4
  - Memory: 4GB
  - Disk: 20GB

### 4. Run step-by-step manually
```cmd
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

Watch for any red error messages and share them if you need help.

---

## ✅ Success Indicators

You'll know it's working when:

✅ All 4 containers show "running" in `docker-compose ps`  
✅ http://localhost:3001/health returns `{"status":"ok"}`  
✅ http://localhost:3000 shows the BrainBolt homepage  
✅ No error logs in `docker-compose logs`  

---

**Happy Coding! 🚀**

Agar koi problem ho, toh error message copy karke share karna!
