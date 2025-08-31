// server/cjs/index.cjs — v53 (CJS)
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const path = require('path');
const { connectIntiface, vibrateAll } = require('./intiface.cjs');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname,'../public')));
app.use(express.static(path.join(__dirname,'../web')));

const state = { overlay:{ goalTarget:2000, goalProgress:0, glow:true, watermark:true, elements:[] }, devices:[], intiface:{ url:'ws://127.0.0.1:12345', connected:false }, bpClient:null };

app.post('/api/intiface/connect', async (req,res)=>{
  try{ const url = (req.body&&req.body.url) || state.intiface.url; state.intiface.url = url; await connectIntiface(url, state, io); res.json({ ok:true, devices: state.devices }); }
  catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});
app.get('/api/devices', (req,res)=> res.json({ ok:true, devices: state.devices, connected: state.intiface.connected }));
app.post('/api/emit-tip', async (req,res)=>{ const amt = Number((req.body&&req.body.amount)||50); state.overlay.goalProgress = Math.min(state.overlay.goalTarget, state.overlay.goalProgress + amt); io.emit('overlay:goal',{ target: state.overlay.goalTarget, current: state.overlay.goalProgress }); await vibrateAll(state, Math.min(1, Math.max(.25, amt/250)), 1200); res.json({ ok:true }); });
app.post('/api/overlay', (req,res)=>{ Object.assign(state.overlay, req.body||{}); io.emit('overlay:update', state.overlay); res.json({ok:true}); });

io.on('connection', (socket)=>{
  socket.emit('init', { overlay: state.overlay, devices: state.devices, intiface: state.intiface });
  socket.on('overlay:set', (ov)=>{ Object.assign(state.overlay, ov||{}); io.emit('overlay:update', state.overlay); });
  socket.on('elements:get', ()=> socket.emit('overlay:elements', state.overlay.elements));
  socket.on('element:add', (el)=>{ if(!el) return; const i = state.overlay.elements.findIndex(e=>e.id===el.id); if(i>=0) state.overlay.elements[i]=el; else state.overlay.elements.push(el); io.emit('overlay:elements', state.overlay.elements); });
  socket.on('element:update', (el)=>{ if(!el||el.id==null) return; const i = state.overlay.elements.findIndex(e=>e.id===el.id); if(i>=0) Object.assign(state.overlay.elements[i], el); else state.overlay.elements.push(el); io.emit('overlay:elements', state.overlay.elements); });
  socket.on('element:delete', (id)=>{ const elId = typeof id==='object'? id.id:id; const i = state.overlay.elements.findIndex(e=>e.id===elId); if(i>=0){ state.overlay.elements.splice(i,1); io.emit('overlay:elements', state.overlay.elements); } });
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'../public/control.html')));

const PORT = process.env.PORT || 3000; server.listen(PORT, ()=> console.log(`[ButtCaster] server on http://localhost:${PORT}`));
