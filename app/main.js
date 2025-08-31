
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let server = null, win = null;

function startServer(){
  if(server) return;
  server = spawn(process.execPath, [path.join(__dirname,'../server/index.js')], { stdio:'ignore', windowsHide:true });
  server.on('exit', ()=> server=null);
}
function createWindow(){
  win = new BrowserWindow({ width: 1280, height: 820, backgroundColor: '#00000000', autoHideMenuBar: true });
  win.loadURL('http://localhost:3000/splash.html').catch(()=>{});
  setTimeout(()=> win.loadURL('http://localhost:3000/control.html'), 1500);
  win.on('closed', ()=>{ if(server) server.kill(); });
}
app.whenReady().then(()=>{ startServer(); setTimeout(createWindow, 600); });
app.on('window-all-closed', ()=> app.quit());
