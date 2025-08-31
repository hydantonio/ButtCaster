@echo off
setlocal
cd /d %~dp0
where node >NUL 2>&1 || (echo Please install Node.js 18+ && pause && exit /b 1)
where npm >NUL 2>&1 || (echo Please install Node.js (npm) && pause && exit /b 1)
echo Installing Electron (first run only, please wait)...
call npm install --no-audit --no-fund > NUL 2>&1
call npx electron --version >NUL 2>&1 || call npm i -D electron >NUL 2>&1
echo Launching ButtCaster App...
start "" cmd /c "npm run app"
