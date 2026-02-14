@echo off
echo Pushing Admin Login Debug Updates to GitHub...
cd "c:\TRK Project"
git add .
git commit -m "Fix: Add UI feedback for loading state on Admin Login button"
git push origin main
echo Done!
pause
