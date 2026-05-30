@echo off
title SpookyChat Launcher
color 0B
echo ======================================================================
echo 🛸 SpookyChat Quantum-Entangled Messenger Launcher
echo ======================================================================
echo.

:: Check if Node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  color 0C
  echo [ERROR] Node.js was not found in your system PATH.
  echo Please install Node.js from https://nodejs.org to run SpookyChat.
  echo.
  pause
  exit /b
)

:: Clean up any existing process listening on port 5000 to prevent port conflict
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
taskkill /IM ngrok.exe /F >nul 2>&1

:: 1. Start Node server in the background
echo [*] Launching Node.js Quantum Grid Server...
start "SpookyChat Server Broker" /B node server.js

:: Wait for database & port 5000 initialization
timeout /t 3 /nobreak >nul

:: 2. Open client interface as a standalone web app widget
echo [*] Launching standalone quantum app widget...
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=http://localhost:5000
) else (
  start msedge --app=http://localhost:5000
)

:: 3. Launch ngrok static domain tunnel
echo [*] Exposing quantum channel to the internet via ngrok static domain...
echo.
echo ----------------------------------------------------------------------
echo Launching ngrok tunnel (Port 5000)...
echo Public Address: https://zackary-unfertilising-helen.ngrok-free.dev
echo Press Ctrl+C in this window to stop the tunnel and server.
echo ----------------------------------------------------------------------
echo.

ngrok http 5000 --url=https://zackary-unfertilising-helen.ngrok-free.dev

:: Clean up node server when tunnel terminates
echo.
echo [*] Shutting down Node.js server...
taskkill /FI "WINDOWTITLE eq SpookyChat Server Broker" /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM ngrok.exe /F >nul 2>&1
echo System Offline.
pause
