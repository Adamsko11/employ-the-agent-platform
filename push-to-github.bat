@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Pushing Employ the Agent Platform to GitHub
echo  Repo: https://github.com/Adamsko11/employ-the-agent-platform
echo ============================================
echo.

if not exist ".git" (
  echo Initialising git repo...
  git init
  git branch -M main
)

echo Configuring git identity (per-repo, won't change global)...
git config user.email "adam@evit-org.com"
git config user.name "Adam Skoneczny"

echo Staging all files (node_modules and .env excluded by .gitignore)...
git add .

echo Sanity-check no env files staged...
git status --porcelain | findstr /R "\.env" >nul
if not errorlevel 1 (
  echo ERROR: .env files appear to be staged. Aborting.
  pause
  exit /b 1
)

echo Creating commit...
git commit -m "Initial commit — Employ the Agent platform v1" 2>nul

echo Setting up remote...
git remote remove origin 2>nul
git remote add origin https://github.com/Adamsko11/employ-the-agent-platform.git

echo Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo ============================================
  echo  Push failed.
  echo  If GitHub asked for auth, sign in via browser when prompted,
  echo  or run: git config --global credential.helper manager
  echo  Then re-run this script.
  echo ============================================
) else (
  echo.
  echo ============================================
  echo  PUSHED!
  echo  https://github.com/Adamsko11/employ-the-agent-platform
  echo.
  echo  Next: import this repo on Vercel:
  echo  https://vercel.com/new
  echo ============================================
)

pause
