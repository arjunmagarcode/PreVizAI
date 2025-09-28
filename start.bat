@echo off
echo ========================================
echo     PreViz AI - Setup and Start
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)
echo ✓ Node.js is installed

echo.
echo [2/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.11+ first.
    pause
    exit /b 1
)
echo ✓ Python is installed

echo.
echo [3/4] Installing dependencies...
echo Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Starting the application...
echo.
echo ========================================
echo     Starting PreViz AI Application
echo ========================================
echo.
echo Frontend will be available at: http://localhost:3000
echo Backend will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop both servers
echo.

call npm run dev:full

pause
