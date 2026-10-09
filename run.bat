@echo off
title Study Notebook - Dev Server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [Study Notebook] Installing packages for the first time...
  call npm.cmd install --no-fund --no-audit
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo [Study Notebook] Starting dev server...
echo   - The browser will open automatically.
echo   - Close this window to stop the server.
echo.
call npm.cmd run dev -- --host --open

pause
