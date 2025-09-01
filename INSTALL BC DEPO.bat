@echo off
setlocal
cd /d %~dp0
if not exist logs mkdir logs
where node >NUL 2>&1
if errorlevel 1 (
  echo [ERRORE] Node.js 18+ richiesto (https://nodejs.org).
  pause
  exit /b 1
)
start "ButtCaster Server" cmd /c node server/index.js 1>>logs\server.log 2>&1
ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:3000/control.html?v=48"
