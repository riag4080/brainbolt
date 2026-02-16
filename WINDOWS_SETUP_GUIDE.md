# Windows Setup - Complete Guide

## Problem: Files not found after download

### Solution 1: Re-download Properly

1. **Download the folder again**
2. **Right-click** on downloaded file
3. **Extract All** → Choose location
4. **Open folder** in File Explorer
5. **Verify** you see these files:
   - docker-compose.yml
   - backend/ folder
   - frontend/ folder
   - README.md

### Solution 2: Manual File Creation

If download keeps failing, create files manually:

#### Step 1: Create folder structure
```powershell
mkdir C:\BrainBolt
cd C:\BrainBolt
mkdir backend
mkdir frontend
mkdir backend\src
mkdir frontend\src
```

#### Step 2: Download from GitHub
I'll create a GitHub-ready version. You can:
1. Create new GitHub repo
2. Upload files there
3. Clone to your computer
4. Run docker-compose

### Solution 3: Direct Docker Commands

If you have the files but docker-compose not working:

```powershell
# Navigate to correct folder
cd C:\Users\tiyag\Downloads\brainbolt-quiz

# Check if docker-compose.yml exists
dir docker-compose.yml

# If file exists, try:
docker compose up --build
# (Note: No hyphen between docker and compose)

# Or try:
docker-compose.exe up --build
```

### Solution 4: Check Docker Desktop

1. Open **Docker Desktop**
2. Go to **Settings** → **General**
3. Make sure **"Use Docker Compose V2"** is enabled
4. Restart Docker Desktop
5. Try again:
   ```powershell
   docker compose up --build
   ```

## Verification Steps

```powershell
# Step 1: Check Docker is running
docker --version
docker ps

# Step 2: Check you're in right folder
pwd
dir

# Step 3: Check docker-compose file exists
cat docker-compose.yml
# OR
type docker-compose.yml

# Step 4: Try running
docker compose up --build
```

## Common Issues

### Issue 1: "docker-compose: command not found"
**Solution**: Use `docker compose` (with space) instead of `docker-compose`

### Issue 2: "no configuration file provided"
**Solution**: You're not in the right folder. Do:
```powershell
cd path\to\folder\with\docker-compose.yml
```

### Issue 3: Files extracted incorrectly
**Solution**: 
1. Delete extracted folder
2. Right-click downloaded file
3. "Extract All" → New location
4. Open the INNER folder (not outer)

## Alternative: Use GitHub

Since you need to upload to GitHub anyway:

### Step 1: Create GitHub Repo
1. Go to github.com
2. New Repository
3. Name: brainbolt-quiz
4. Public
5. Create

### Step 2: Upload Files
You can upload directly via GitHub web interface:
1. Click "uploading an existing file"
2. Drag all folders
3. Commit

### Step 3: Clone to Your Computer
```powershell
git clone https://github.com/YOUR_USERNAME/brainbolt-quiz.git
cd brainbolt-quiz
docker compose up --build
```

## Need Help?

Try this in PowerShell:

```powershell
# Show current location
pwd

# List all files
dir

# Show docker-compose content (if it exists)
type docker-compose.yml

# Check Docker
docker --version
docker info
```

Send me the output and I can help debug!
