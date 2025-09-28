# PreViz AI - Setup and Start Script
# PowerShell version for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     PreViz AI - Setup and Start" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "[1/4] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check Python installation  
Write-Host "[2/4] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✓ Python is installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed. Please install Python 3.11+ first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
Write-Host "Installing Node.js dependencies..." -ForegroundColor White
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "✓ Node.js dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install Node.js dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if environment files exist
Write-Host "[4/4] Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  WARNING: .env.local not found. Please configure your OpenAI API key:" -ForegroundColor Yellow
    Write-Host "   Create .env.local with: NEXT_PUBLIC_OPENAI_API_KEY=your_key_here" -ForegroundColor White
}
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  WARNING: backend\.env not found. Please configure your backend environment." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     Starting PreViz AI Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start the application
try {
    npm run dev:full
} catch {
    Write-Host "Error starting the application. Check your configuration and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
