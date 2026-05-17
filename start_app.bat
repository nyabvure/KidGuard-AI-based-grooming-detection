@echo off
title KidGuard
cd /d "%~dp0"

echo.
echo  ================================================
echo   KidGuard - Starting Application
echo  ================================================
echo.

REM Check Python venv exists
if not exist "venv\Scripts\activate.bat" (
    echo  [ERROR] Virtual environment not found.
    echo  Run this first:
    echo    python -m venv venv
    echo    venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

REM Check node_modules exists
if not exist "frontend\node_modules" (
    echo  [ERROR] Frontend dependencies not installed.
    echo  Run this first:
    echo    cd frontend ^&^& npm install
    pause
    exit /b 1
)

REM Start backend in a new window
echo  Starting backend on http://127.0.0.1:8000 ...
start "KidGuard Backend" cmd /k "cd /d "%~dp0" && call venv\Scripts\activate.bat && cd backend && python -X utf8 -m uvicorn server:app --reload --host 127.0.0.1 --port 8000"

REM Give backend 2 seconds to start
timeout /t 2 /nobreak > nul

REM Start frontend in a new window
echo  Starting frontend on http://localhost:3000 ...
start "KidGuard Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo  ================================================
echo   Both servers are starting in separate windows.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://localhost:3000
echo  ================================================
echo.
echo  Close this window once both are running.
pause
