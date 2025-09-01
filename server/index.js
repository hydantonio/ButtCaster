// server/index.js — v54 (CJS)
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const path = require('path');
const { connectIntiface, vibrateAll } = require('./intiface.js');

const app = express();
// Attach Express as the HTTP request handler so Socket.IO's internal
// listener can run before Express processes a request. Creating the
// server without a request listener and then attaching Express with
// `server.on('request', app)` caused both listeners to fire for Socket.IO
// requests, resulting in "Can't set headers after they are sent" errors
// when Express attempted to handle Socket.IO's already‑served responses.
// Using `http.createServer(app)` restores the typical Express + Socket.IO
// integration where Socket.IO intercepts its own requests without
// triggering Express.
// Use a uniquely named variable to avoid accidental re‑declarations.
const httpServer = http.createServer(app);
const io = new SocketIO(httpServer, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname,'../public')));
app.use(express.static(path.join(__dirname,'../web')));

const state = { overlay:{ goalTarget:2000, goalProgress:0, glow:true, watermark:true, elements:[] }, devices:[], intiface:{ url:'ws://127.0.0.1:12345', connected:false }, bpClient:null };

async function handleTip(amount = 100){
  state.overlay.goalProgress = Math.min(state.overlay.goalTarget, state.overlay.goalProgress + amount);
  io.emit('overlay:goal', { target: state.overlay.goalTarget, current: state.overlay.goalProgress });
  await vibrateAll(state, Math.min(1, Math.max(.25, amount / 250)), 1200);
}

app.post('/api/intiface/connect', async (req,res)=>{
  try{ const url = (req.body&&req.body.url) || state.intiface.url; state.intiface.url = url; await connectIntiface(url, state, io); res.json({ ok:true, devices: state.devices }); }
  catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});
app.get('/api/devices', (req,res)=> res.json({ ok:true, devices: state.devices, connected: state.intiface.connected }));
app.post('/api/emit-tip', async (req,res)=>{ const amt = Number((req.body&&req.body.amount)||50); await handleTip(amt); res.json({ ok:true }); });
app.post('/api/overlay', (req,res)=>{ Object.assign(state.overlay, req.body||{}); io.emit('overlay:update', state.overlay); res.json({ok:true}); });

io.on('connection', (socket)=>{
  socket.emit('init', { overlay: state.overlay, devices: state.devices, intiface: state.intiface });
  socket.emit('overlay:elements', state.overlay.elements);
  socket.on('overlay:set', (ov)=>{ Object.assign(state.overlay, ov||{}); io.emit('overlay:update', state.overlay); });
  socket.on('element:add', el => { state.overlay.elements.push(el); io.emit('overlay:elements', state.overlay.elements); });
  socket.on('element:update', el => {
    const i = state.overlay.elements.findIndex(e => e.id === el.id);
    if(i !== -1){ state.overlay.elements[i] = el; io.emit('overlay:elements', state.overlay.elements); }
  });
  socket.on('elements:get', ()=> socket.emit('overlay:elements', state.overlay.elements));
  socket.on('element:delete', id => {
    const i = state.overlay.elements.findIndex(e => e.id === id);
    if(i !== -1){ state.overlay.elements.splice(i,1); io.emit('overlay:elements', state.overlay.elements); }
  });
  socket.on('intiface:connect', async url => {
    await connectIntiface(url ?? state.intiface.url, state, io);
    socket.emit('intiface:devices', state.devices);
    io.emit('intiface:status', state.intiface);
  });
  socket.on('tip', async ({amount = 100}) => {
    await handleTip(amount);
  });
});

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'../web/control.html')));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, ()=> console.log(`[ButtCaster] server on http://localhost:${PORT}`));
