@echo off
echo ========================================
echo TRK Project - Git Setup & Push Script
echo ========================================
echo.

echo [1/4] Initializing Git repository...
git init
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git init failed. Is Git installed?
    pause
    exit /b 1
)

echo.
echo [2/4] Adding remote 'original'...
git remote add original https://github.com/ayushhh98/TRK-Project.git
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Remote 'original' might already exist. Proceeding...
)

echo.
echo [3/4] Staging and Committing files...
git add .
git commit -m "Production Release: Backend & Frontend Ready"

echo.
echo [4/4] Pushing to GitHub (original/master)...
git push -u original master

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Push failed!
    echo Common reasons:
    echo 1. You are not logged in (try 'git login' or use a credential manager)
    echo 2. The remote repository already has history (try 'git pull' first)
    echo 3. Permission denied (check your GitHub access)
) else (
    echo.
    echo [SUCCESS] Code usage pushed successfully!
)
echo.
pause
