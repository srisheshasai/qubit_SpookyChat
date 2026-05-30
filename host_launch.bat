@echo off
title SpookyChat Render Connect
color 0B
echo ======================================================================
echo * SpookyChat Live Render Connection Launcher
echo ======================================================================
echo.
echo Connecting to the live SpookyChat grid hosted on Render...
echo Server URL: https://qubit-spookychat.onrender.com
echo.
echo ----------------------------------------------------------------------
echo Please wait while the secure application window launches.
echo You can close this command window once the app is open.
echo ----------------------------------------------------------------------
echo.

:: Open standalone Chrome/Edge window pointing to the live Render URL
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=https://qubit-spookychat.onrender.com
) else (
  start msedge --app=https://qubit-spookychat.onrender.com
)

timeout /t 2 >nul
exit
