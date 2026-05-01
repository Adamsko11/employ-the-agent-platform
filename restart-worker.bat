@echo off
echo Killing all node processes in worker folder...
for /f "tokens=2 delims=," %%i in ('tasklist /v /fo csv ^| findstr /i "Employ.the.Agent.*Worker"') do taskkill /F /PID %%~i 2>nul
taskkill /F /FI "WINDOWTITLE eq Employ the Agent — Worker*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Administrator: Employ the Agent — Worker*" 2>nul
timeout /t 1 /nobreak >nul

REM Nuclear option: kill ALL node.exe (will also kill the web dev server)
REM taskkill /F /IM node.exe 2>nul

echo Starting fresh worker in DEMO mode...
start "Employ the Agent — Worker" cmd /k "cd /d %~dp0worker && npm start"
timeout /t 2 /nobreak >nul
echo Done. Check the new cmd window — it should say [DEMO]
