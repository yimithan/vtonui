@echo off
title Gemini Virtual Try-On
echo ============================================
echo   Gemini Virtual Try-On - Launcher
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo.
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
) else (
    echo [OK] Dependencies already installed.
)

echo.
echo [INFO] Starting development server...
echo [INFO] The app will open at http://localhost:3000
echo [INFO] Press Ctrl+C to stop the server.
echo.

call npm run dev
