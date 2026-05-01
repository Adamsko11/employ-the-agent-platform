@echo off
setlocal
cd /d "%~dp0web"
echo ============================================
echo  Deploying web to Vercel
echo ============================================
echo.
echo You'll be prompted to:
echo   1. Log in to Vercel (browser opens) — first time only
echo   2. Link the project (answer "no" if asked to link to existing)
echo   3. Confirm settings (defaults are fine)
echo.
echo After deploy, set env vars in Vercel dashboard:
echo   NEXT_PUBLIC_SUPABASE_URL
echo   NEXT_PUBLIC_SUPABASE_ANON_KEY
echo   SUPABASE_SERVICE_ROLE_KEY
echo   ALERT_EMAIL_TO=aps@evit-org.com
echo   ALERT_EMAIL_FROM=alerts@employtheagent.com
echo   CRON_SECRET=^<long random string^>
echo   RESEND_API_KEY=^<from resend.com^>
echo.
pause
echo.
echo Running: npx vercel --prod
call npx vercel --prod
echo.
echo ============================================
echo  Done. Visit your Vercel dashboard:
echo  https://vercel.com/dashboard
echo ============================================
pause
