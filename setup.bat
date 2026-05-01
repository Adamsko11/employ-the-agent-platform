@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo  Employ the Agent — Platform Setup
echo ============================================
echo.

echo [1/3] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install from https://nodejs.org first.
  pause
  exit /b 1
)
node --version

echo.
echo [2/3] Installing web dependencies (this will take a couple minutes)...
cd web
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo Web install FAILED. Check the error above.
  cd ..
  pause
  exit /b 1
)
cd ..

echo.
echo [3/3] Installing worker dependencies...
cd worker
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo Worker install FAILED.
  cd ..
  pause
  exit /b 1
)
cd ..

echo.
echo ============================================
echo  Setup complete!
echo  Next: copy .env.example to .env.local in web/
echo        copy .env.example to .env in worker/
echo        fill in keys, then run start-dev.bat
echo ============================================
pause
