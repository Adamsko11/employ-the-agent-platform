@echo off
setlocal
cd /d "%~dp0"
echo Zipping web folder for Vercel drag-and-drop deploy...
powershell -Command "Compress-Archive -Path 'web\src','web\public','web\package.json','web\package-lock.json','web\next.config.ts','web\tsconfig.json','web\postcss.config.mjs','web\tailwind.config.ts','web\vercel.json','web\.gitignore' -DestinationPath 'web-for-vercel.zip' -Force"
echo Created: web-for-vercel.zip
echo.
echo To deploy via web UI:
echo   1. Go to https://vercel.com/new
echo   2. Click "Browse" or drag this zip onto the page
echo   3. Set env vars (see deploy-vercel.bat for list)
echo.
pause
