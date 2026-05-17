@echo off
title KidGuard - Stopping
echo.
echo  ================================================
echo   KidGuard - Stopping Application
echo  ================================================
echo.

REM Stop backend (uvicorn on port 8000)
echo  Stopping backend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Stop frontend (node on port 3000)
echo  Stopping frontend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Both servers stopped.
echo  ================================================
echo.
pause
