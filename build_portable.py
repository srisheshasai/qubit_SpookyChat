import os
import shutil
import zipfile
import subprocess

root_dir = r"d:\programs\Qubit_communication"
stage_dir = os.path.join(root_dir, "spookychat-portable")
zip_path = os.path.join(root_dir, "spookychat-portable.zip")

print("Initializing Python Full Portable Builder...")

# 1. Clean and create stage directory structures
if os.path.exists(stage_dir):
    print(f"Cleaning existing stage directory: {stage_dir}")
    shutil.rmtree(stage_dir)
os.makedirs(stage_dir, exist_ok=True)
os.makedirs(os.path.join(stage_dir, "bin"), exist_ok=True)
os.makedirs(os.path.join(stage_dir, "client"), exist_ok=True)

# 2. Copy binaries (Node.exe)
node_src = r"C:\Program Files\nodejs\node.exe"
node_dest = os.path.join(stage_dir, "bin", "node.exe")
if os.path.exists(node_src):
    shutil.copy2(node_src, node_dest)
    print("Bundled local node.exe binary.")
else:
    print("Error: node.exe not found at C:\\Program Files\\nodejs\\node.exe")
    exit(1)

# 3. Copy application source files
shutil.copy2(os.path.join(root_dir, "server.js"), os.path.join(stage_dir, "server.js"))
shutil.copy2(os.path.join(root_dir, "database.js"), os.path.join(stage_dir, "database.js"))
shutil.copy2(os.path.join(root_dir, "package.json"), os.path.join(stage_dir, "package.json"))
shutil.copy2(os.path.join(root_dir, "favicon.ico"), os.path.join(stage_dir, "favicon.ico"))

# Copy spookychat.db (sqlite file)
db_src = os.path.join(root_dir, "spookychat.db")
db_dest = os.path.join(stage_dir, "spookychat.db")
if os.path.exists(db_src):
    shutil.copy2(db_src, db_dest)
    print("Bundled spookychat.db database.")

# 4. Copy client built assets
shutil.copytree(os.path.join(root_dir, "client", "dist"), os.path.join(stage_dir, "client", "dist"))
print("Bundled client compiled assets.")

# 5. Install production dependencies inside the staging folder
print("Installing production npm dependencies inside portable bundle...")
subprocess.run("npm install --production", shell=True, cwd=stage_dir, check=True)
print("Dependencies installed successfully.")

# 6. Create the interactive startup batch file
bat_content = """@echo off
title SpookyChat Connection Console
color 0B
echo ======================================================================
echo * SpookyChat Quantum-Entangled Messenger Launcher
echo ======================================================================
echo.
echo Select your quantum connection grid:
echo.
echo [1] Connect to Central Server (Chat with host on ngrok)
echo     - Connects directly to the developer's laptop server at:
echo       https://zackary-unfertilising-helen.ngrok-free.dev
echo.
echo [2] Run Private Local Server (Offline/Local network grid)
echo     - Boots a local Node.js database server on your PC at:
echo       http://localhost:5000
echo.
echo ----------------------------------------------------------------------
set /p CHOICE="Enter connection gate option (1 or 2): "
echo ----------------------------------------------------------------------
echo.

if "%CHOICE%"=="1" goto central
if "%CHOICE%"=="2" goto local
echo Invalid choice. Exiting.
timeout /t 3 >nul
exit

:central
echo [*] Connecting to Central Server...
set "CHROME_PATH="
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=https://zackary-unfertilising-helen.ngrok-free.dev
) else (
  start msedge --app=https://zackary-unfertilising-helen.ngrok-free.dev
)
exit

:local
:: Clean up any existing process listening on port 5000 to prevent port conflict
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: 1. Start Node server in the background using local node runtime
echo [*] Launching Portable Node.js Quantum Grid Server...
start "SpookyChat Server Broker" /B bin\\node.exe server.js

:: Wait for port 5000 initialization
timeout /t 3 /nobreak >nul

:: 2. Open client interface in standalone app window
echo [*] Launching standalone quantum app widget...
set "CHROME_PATH="
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=http://localhost:5000
) else (
  start msedge --app=http://localhost:5000
)

echo.
echo ----------------------------------------------------------------------
echo SpookyChat Portable Server is running locally on http://localhost:5000
echo.
echo To shutdown the server and close the app, press any key in this window.
echo ----------------------------------------------------------------------
echo.
pause

:: Clean up node server
echo.
echo [*] Shutting down Node.js server...
taskkill /FI "WINDOWTITLE eq SpookyChat Server Broker" /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
echo System Offline.
timeout /t 2 >nul
exit
"""

with open(os.path.join(stage_dir, "SpookyChat.bat"), "w", newline="\r\n") as f:
    f.write(bat_content)
print("Created SpookyChat.bat.")

# 7. Create shortcut installer Install-Shortcut.ps1
shortcut_script = """$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\SpookyChat-Client.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\\SpookyChat.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.IconLocation = "$PSScriptRoot\\favicon.ico"
$Shortcut.Save()
write-output "SpookyChat Desktop shortcut created at $DesktopPath\\SpookyChat-Client.lnk"
pause
"""

with open(os.path.join(stage_dir, "Install-Shortcut.ps1"), "w", encoding="utf-8", newline="\n") as f:
    f.write(shortcut_script)
print("Created Install-Shortcut.ps1.")

# 8. Compress archive using standard python zipfile
if os.path.exists(zip_path):
    os.remove(zip_path)

print("Compressing archive (this might take a moment due to node.exe size)...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    for root, dirs, files in os.walk(stage_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, root_dir)
            zip_file.write(file_path, arcname)

print("Full portable zip generated successfully using python at:", zip_path)
