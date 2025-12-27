@echo off
cls
title SAMD Medical Directory Server
color 0A

echo.
echo ========================================
echo   SAMD Medical Directory Server
echo ========================================
echo.

REM Step 1: Kill ONLY our specific Python server (app.py)
echo [1/4] Stopping old servers...
wmic process where "name='python.exe' and commandline like '%%app.py%%'" call terminate >nul 2>&1
timeout /t 2 >nul

REM Step 2: Clear cache
echo [2/4] Clearing cache...
if exist __pycache__ rd /s /q __pycache__ 2>nul

REM Step 3: Open browser
echo [3/4] Opening browser...
start http://localhost:8080
timeout /t 1 >nul

REM Step 4: Start server
echo [4/4] Starting server...
echo.
echo ========================================
echo   OTP codes will appear below
echo ========================================
echo.

python app.py

echo.
echo.
echo Server stopped. Press any key to exit...
pause >nul
