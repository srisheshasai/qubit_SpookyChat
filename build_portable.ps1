$stage = "d:\programs\Qubit_communication\spookychat-portable"

# 1. Clean and create stage directory
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage

# 2. Copy favicon for desktop shortcut icon branding
Copy-Item -Path "d:\programs\Qubit_communication\favicon.ico" -Destination "$stage\favicon.ico"

# 3. Create the client-only startup batch file pointing to your central server
$batContent = @"
@echo off
title SpookyChat Client Connect
color 0B
echo ======================================================================
echo 🛸 SpookyChat Quantum-Entangled Client App
echo ======================================================================
echo.
echo Connecting to the main SpookyChat Server on the Quantum Grid...
echo Server URL: https://zackary-unfertilising-helen.ngrok-free.dev
echo.
echo ----------------------------------------------------------------------
echo Please wait while the secure application window launches.
echo You can close this command window once the app is open.
echo ----------------------------------------------------------------------
echo.

:: Open standalone Chrome/Edge window pointing to the central ngrok server
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=https://zackary-unfertilising-helen.ngrok-free.dev
) else (
  start msedge --app=https://zackary-unfertilising-helen.ngrok-free.dev
)

timeout /t 2 >nul
exit
"@

$batContent | Out-File -FilePath "$stage\SpookyChat.bat" -Encoding ASCII

# 4. Create shortcut installer Install-Shortcut.ps1
$shortcutScript = @"
`$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
`$WshShell = New-Object -ComObject WScript.Shell
`$Shortcut = `$WshShell.CreateShortcut("`$DesktopPath\SpookyChat-Client.lnk")
`$Shortcut.TargetPath = "`$PSScriptRoot\SpookyChat.bat"
`$Shortcut.WorkingDirectory = "`$PSScriptRoot"
`$Shortcut.IconLocation = "`$PSScriptRoot\favicon.ico"
`$Shortcut.Save()
write-output "SpookyChat Desktop shortcut created at `$DesktopPath\SpookyChat-Client.lnk"
pause
"@

$shortcutScript | Out-File -FilePath "$stage\Install-Shortcut.ps1" -Encoding UTF8

# 5. Compress archive
$zipPath = "d:\programs\Qubit_communication\spookychat-portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path $stage -DestinationPath $zipPath
write-output "Client-only portable zip generated successfully at $zipPath"
