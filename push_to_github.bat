@echo off
echo Pushing changes to GitHub...
cd "c:\TRK Project"
git add .
git commit -m "Deployment complete: Lucky Draw contract and production env setup"
git push origin main
echo Done!
pause
