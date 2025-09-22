@echo off
REM Quran Apps Directory - Development Starter Script (Windows)
REM This script sets up and starts the development environment on Windows

setlocal enabledelayedexpansion

echo ================================
echo   Quran Apps Directory - Dev Setup
echo ================================
echo.

echo [INFO] Starting development environment setup...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js version 20 or higher.
    echo [ERROR] Visit: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [INFO] Node.js version detected ✓
    node --version
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm.
    pause
    exit /b 1
) else (
    echo [INFO] npm version detected ✓
    npm --version
)

echo.

REM Kill processes on port 4200
echo [INFO] Checking for processes on port 4200...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200') do (
    echo [WARN] Found process using port 4200. Terminating...
    taskkill /PID %%a /F >nul 2>&1
)
echo [INFO] Port 4200 cleared ✓

REM Install dependencies
echo [INFO] Installing dependencies...
if not exist "node_modules" (
    echo [INFO] node_modules not found. Running npm install with legacy peer deps...
    npm install --legacy-peer-deps
) else (
    echo [INFO] node_modules found. Checking for updates...
    npm install --legacy-peer-deps
)

if errorlevel 1 (
    echo [WARN] Standard installation failed. Trying clean install...
    rmdir /s /q node_modules 2>nul
    del package-lock.json 2>nul
    npm cache clean --force
    echo [INFO] Installing fresh dependencies...
    npm install --legacy-peer-deps
)

echo [INFO] Dependencies installed ✓
echo.

REM Start development server
echo [INFO] Starting development server...
echo [INFO] The application will be available at: http://localhost:4200
echo [INFO] Press Ctrl+C to stop the server
echo.
echo [INFO] Opening browser in 3 seconds...

REM Start the server
start /B npm start

REM Wait and open browser
timeout /t 3 /nobreak >nul
start http://localhost:4200

REM Wait for user to stop the server
echo.
echo Press any key to stop the development server...
pause >nul

REM Kill the npm process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [INFO] Development server stopped.
pause
