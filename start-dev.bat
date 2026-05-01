@echo off
setlocal
cd /d "%~dp0"
echo Starting web (Next.js) and worker (agent runtime)...
echo Two new windows will open.
start "Employ the Agent — Web" cmd /k "cd /d %~dp0web && npm run dev"
timeout /t 2 /nobreak >nul
start "Employ the Agent — Worker" cmd /k "cd /d %~dp0worker && npm start"
echo.
echo Web:    http://localhost:3000
echo Worker: see new window
echo.
pause
