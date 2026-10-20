@echo off
:: Switch to the directory where this batch file is located (even if Run as Administrator)
cd /d "%~dp0"
title Tecsidel Toll Plaza VMS and UFD Central Controller
color 0B

echo =====================================================================
echo    TECSIDEL TOLL PLAZA VMS CONTROLLER - PRODUCTION RUNNER
echo    NHAI / IHMCL Highway ATMS and Lane Signage Operations Center
echo =====================================================================
echo.

:: 1. Check if Node.js is in PATH or common installation directories
set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        set "PATH=%PATH%;C:\Program Files\nodejs"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files (x86)\nodejs\node.exe"
        set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\node"
    )
)

:: Re-verify if node is available
"%NODE_CMD%" -v >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo =====================================================================
    echo [ERROR] Node.js is NOT installed on this computer!
    echo =====================================================================
    echo The Toll Plaza VMS Server requires Node.js runtime to communicate
    echo with physical VMS displays and run the local socket engine.
    echo.
    echo Please install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    echo Press [O] to automatically open the Node.js download page, or any other key to exit.
    set /p USER_CHOICE="Your Choice: "
    if /i "%USER_CHOICE%"=="O" (
        start "" https://nodejs.org/en/download
    )
    exit /b
)

echo [OK] Node.js detected:
"%NODE_CMD%" -v
echo.

:: 2. Check dependencies
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies (express, ws)...
    call npm install --omit=dev
)

echo [INFO] Starting Tecsidel Toll Plaza VMS Server...
echo [INFO] Access Dashboard at: http://localhost:3000
echo.

:: 3. Open default browser after a brief delay
start "" http://localhost:3000

:: 4. Run the Node.js production server
"%NODE_CMD%" server.js

pause
