@echo off
title Toll Plaza VMS & UFD Central Controller
color 0B

echo =====================================================================
echo    TOLL PLAZA VARIABLE MESSAGE SIGN (VMS) CONTROLLER - PRODUCTION
echo    NHAI / IHMCL Highway ATMS & Lane Signage Operations Center
echo =====================================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ to run the VMS controller.
    pause
    exit /b
)

:: Check dependencies
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies...
    call npm install --omit=dev
)

echo [INFO] Starting Toll Plaza VMS Server...
echo [INFO] Access Dashboard at: http://localhost:3000
echo.

:: Open default browser after a brief pause
start "" http://localhost:3000

:: Run the Node.js production server
node server.js

pause
