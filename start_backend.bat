@echo off
title KidGuard Backend
cd /d "%~dp0"
call venv\Scripts\activate.bat
cd backend
echo.
echo  KidGuard Backend starting on http://127.0.0.1:8000
echo  Using virtual environment: venv
echo.
python -X utf8 -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
pause
