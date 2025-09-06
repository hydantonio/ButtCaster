const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const nodeHttp = require('http');
const fs = require('fs');

let server = null, win = null;

function startServer(){
  if(server) return;
  const candidate = path.join(process.cwd(),'server','index.js');
  const serverPath = fs.existsSync(candidate) ? candidate : path.join(__dirname,'../server/index.js');
  if(!fs.existsSync(serverPath)){
    console.error('[ButtCaster] server/index.js not found');
    return;
  }
  server = fork(serverPath, {
    cwd: path.dirname(serverPath),
    stdio:'inherit',
    windowsHide:true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  });
  server.on('exit', code=>{
    if(code) console.error(`[ButtCaster] server exited with code ${code}`);
    server=null;
  });
  server.on('error', err=>{ console.error('[ButtCaster] failed to start server', err); server=null; });
}

function waitForServer(url, cb){
  const start = Date.now();
  (function check(){
    nodeHttp.get(url, ()=> cb(true)).on('error', ()=>{
      if(Date.now() - start > 10000) return cb(false);
      setTimeout(check, 200);
    });
  })();
}

function createWindow(){
  const { width, height, x, y } = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({ x, y, width, height, backgroundColor: '#00000000', autoHideMenuBar: true });
  win.loadFile(path.join(__dirname,'../web/splash.html'));
  const readyAt = Date.now() + 5000;
  waitForServer('http://localhost:3000/', (ok)=>{
    const delay = Math.max(0, readyAt - Date.now());
    setTimeout(()=>{
      if(ok) win.loadURL('http://localhost:3000/control.html');
      else win.webContents
        .executeJavaScript("document.querySelector('.tip').textContent='Server failed to start';")
        .catch(err => console.error('[ButtCaster] failed to update splash screen', err));
    }, delay);
  });
  win.on('closed', ()=>{ if(server) server.kill(); });
}

app.whenReady().then(()=>{ startServer(); createWindow(); });
app.on('window-all-closed', ()=> app.quit());

