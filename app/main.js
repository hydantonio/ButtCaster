
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
let server = null, win = null;

function startServer(){
  if(server) return;
  server = fork(path.join(__dirname,'../server/index.js'), {
    cwd: path.join(__dirname,'..'),
    stdio:'ignore',
    windowsHide:true
  });
  server.on('exit', ()=> server=null);
}

function waitForServer(url, cb){
  const start = Date.now();
  (function check(){
    http.get(url, ()=> cb(true)).on('error', ()=>{
      if(Date.now() - start > 10000) return cb(false);
      setTimeout(check, 200);
    });
  })();
}

function createWindow(){
  const { width, height, x, y } = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({ x, y, width, height, backgroundColor: '#00000000', autoHideMenuBar: true });
  win.loadFile(path.join(__dirname,'../web/splash.html'));
  waitForServer('http://localhost:3000/', (ok)=>{
    if(ok) win.loadURL('http://localhost:3000/control.html');
    else win.webContents.executeJavaScript("document.querySelector('.tip').textContent='Server failed to start';");
  });
  win.on('closed', ()=>{ if(server) server.kill(); });
}

app.whenReady().then(()=>{ startServer(); createWindow(); });
app.on('window-all-closed', ()=> app.quit());
