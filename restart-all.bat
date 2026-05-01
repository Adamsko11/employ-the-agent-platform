@echo off
echo Stopping all dev processes (web + worker)...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting web (Next.js) and worker (DEMO mode)...
start "Employ the Agent — Web" cmd /k "cd /d %~dp0web && npm run dev"
timeout /t 2 /nobreak >nul
start "Employ the Agent — Worker" cmd /k "cd /d %~dp0worker && npm start"
echo.
echo Both servers restarted.
echo Web:    http://localhost:3000
echo Worker: see new window — should show [DEMO]
timeout /t 2 /nobreak >nul
