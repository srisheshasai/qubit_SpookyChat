import os
import shutil
import zipfile

root_dir = r"d:\programs\Qubit_communication"
stage_dir = os.path.join(root_dir, "spookychat-render-portable")
zip_path = os.path.join(root_dir, "spookychat-render-portable.zip")

print("Initializing Render Portable Builder...")

# 1. Clean and create stage directory
if os.path.exists(stage_dir):
    print(f"Cleaning existing stage directory: {stage_dir}")
    shutil.rmtree(stage_dir)
os.makedirs(stage_dir, exist_ok=True)

# 2. Copy favicon.ico
favicon_src = os.path.join(root_dir, "favicon.ico")
favicon_dest = os.path.join(stage_dir, "favicon.ico")
if os.path.exists(favicon_src):
    shutil.copy2(favicon_src, favicon_dest)
    print("Copied favicon.ico to staging folder.")

# 3. Create the client-only startup batch file pointing to the Render URL
bat_content = """@echo off
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
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if defined CHROME_PATH (
  start "" "%CHROME_PATH%" --app=https://qubit-spookychat.onrender.com
) else (
  start msedge --app=https://qubit-spookychat.onrender.com
)

timeout /t 2 >nul
exit
"""

with open(os.path.join(stage_dir, "SpookyChat.bat"), "w", newline="\r\n") as f:
    f.write(bat_content)
print("Created SpookyChat.bat.")

# 4. Create shortcut installer Install-Shortcut.ps1
shortcut_script = """$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\SpookyChat-Live.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\\SpookyChat.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.IconLocation = "$PSScriptRoot\\favicon.ico"
$Shortcut.Save()
write-output "SpookyChat Live Desktop shortcut created at $DesktopPath\\SpookyChat-Live.lnk"
pause
"""

with open(os.path.join(stage_dir, "Install-Shortcut.ps1"), "w", encoding="utf-8", newline="\n") as f:
    f.write(shortcut_script)
print("Created Install-Shortcut.ps1.")

# 5. Compress archive using standard python zipfile
if os.path.exists(zip_path):
    os.remove(zip_path)

print("Compressing archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    for root, dirs, files in os.walk(stage_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, root_dir)
            zip_file.write(file_path, arcname)

print("Render portable zip generated successfully using python at:", zip_path)
