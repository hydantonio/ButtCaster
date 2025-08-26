@echo off
setlocal ENABLEDELAYEDEXPANSION
title ButtCaster — Chromium App
cd /d "%~dp0"
where node >nul 2>nul || (echo [ERROR] Node.js non trovato. Installa Node 18+ e riprova. & pause & exit /b 1)
echo [1/3] Installo dipendenze (prima volta può durare)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [WARN] npm install ha dato un errore. Pulisco cache ed installo Electron...
  call npm cache clean --force
  call npm install electron --save --no-audit --no-fund
)
echo [2/3] Avvio l'app Chromium...
start "" http://localhost:3000/control.html
npm start
endlocal
