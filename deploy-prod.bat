@echo off
echo Starting Production Deployment to Vercel...
echo.
echo NOTE: You may need to log in via browser if this is your first time.
echo.
call npx vercel --prod
pause
