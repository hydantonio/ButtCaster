
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow=null, overlayWindow=null, serverProc=null;

function createMain(){
  mainWindow = new BrowserWindow({
    width: 1380, height: 900, minWidth: 1120, minHeight: 760,
    title: 'ButtCaster — Control',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: '#111318'
  });
  mainWindow.on('closed', ()=> mainWindow=null);
  mainWindow.loadURL('http://localhost:3000/control.html');
}

function startServer(){
  const node = process.execPath;
  const srv = path.join(__dirname, '..', 'server', 'index.js');
  serverProc = spawn(node, [srv], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  serverProc.on('exit', ()=>{ serverProc=null; });
}

function createOverlay(){
  if(overlayWindow){ overlayWindow.focus(); return; }
  overlayWindow = new BrowserWindow({
    width: 1280, height: 720,
    title: 'ButtCaster — Overlay',
    transparent: true, frame: true, backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  overlayWindow.on('closed', ()=> overlayWindow=null);
  overlayWindow.loadURL('http://localhost:3000/overlay.html');
}

ipcMain.on('open-overlay', ()=> createOverlay());
ipcMain.on('open-overlay-browser', ()=> shell.openExternal('http://localhost:3000/overlay.html'));

const gotLock = app.requestSingleInstanceLock();
if(!gotLock){ app.quit(); } else {
  app.on('second-instance', ()=>{ if(mainWindow){ if(mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(()=>{ startServer(); setTimeout(createMain, 700); });
  app.on('window-all-closed', ()=> { /* keep running */ });
  app.on('before-quit', ()=> { if(serverProc){ try{ serverProc.kill(); }catch(e){} } });
}
