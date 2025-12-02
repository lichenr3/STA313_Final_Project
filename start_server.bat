@echo off
echo ========================================
echo Starting Local Web Server
echo ========================================
echo.
echo This will start a local server on port 8000
echo Open your browser and go to:
echo   http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3 or use VS Code Live Server extension
    pause
    exit /b 1
)

echo Starting Python HTTP server...
echo.
python -m http.server 8000

pause
