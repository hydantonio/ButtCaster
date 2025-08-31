// server/index.js — v53 (CJS)
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const path = require('path');
const { connectIntiface, vibrateAll } = require('./intiface.js');

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
app.get('/app/quit', (req,res)=>{ res.json({ok:true}); setTimeout(()=>process.exit(0), 100); });

io.on('connection', (socket)=>{
  socket.emit('init', { overlay: state.overlay, devices: state.devices, intiface: state.intiface });
  socket.on('overlay:set', (ov)=>{ Object.assign(state.overlay, ov||{}); io.emit('overlay:update', state.overlay); });
  socket.on('elements:get', ()=>{ socket.emit('overlay:elements', state.overlay.elements); });
  socket.on('element:add', el=>{ if(el){ state.overlay.elements.push(el); io.emit('overlay:elements', state.overlay.elements); } });
  socket.on('element:update', el=>{ if(el){ const i=state.overlay.elements.findIndex(e=>e.id===el.id); if(i!==-1){ state.overlay.elements[i]={...state.overlay.elements[i],...el}; io.emit('overlay:elements', state.overlay.elements); } } });
  socket.on('settings:update', s=>{ if(s){ state.overlay.watermark=!!s.showWatermark; state.overlay.glow=!!s.glow; io.emit('overlay:update', state.overlay); } });
  socket.on('goal:set', v=>{ state.overlay.goalTarget=Number(v)||0; io.emit('overlay:goal', {target:state.overlay.goalTarget, current:state.overlay.goalProgress}); });
  socket.on('tip', async data=>{ const amt=Number(data?.amount)||0; state.overlay.goalProgress=Math.min(state.overlay.goalTarget, state.overlay.goalProgress+amt); io.emit('overlay:goal',{target:state.overlay.goalTarget,current:state.overlay.goalProgress}); await vibrateAll(state, Math.min(1, Math.max(.25, amt/250)), 1200); });
  socket.on('overlay:goal-reached', ()=>{ state.overlay.goalProgress=state.overlay.goalTarget; io.emit('overlay:goal',{target:state.overlay.goalTarget,current:state.overlay.goalProgress}); });
  socket.on('intiface:connect', async url=>{ try{ await connectIntiface(url||state.intiface.url, state, io); }catch(e){ socket.emit('intiface:error', String(e)); } });
  socket.on('haptics:device:set', async cfg=>{ const c=state.bpClient; if(!c?.connected) return; const list=c.Devices||c.devices||[]; const d=list.find(x=>(x.Index??x.index)===cfg?.id); if(d&&d.AllowedMessages?.VibrateCmd!==undefined){ try{ await d.vibrate(cfg.strength||0); if(cfg.dur>0) setTimeout(()=>{try{d.stop();}catch{};}, cfg.dur); }catch{} } });
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'../public/control.html')));

const PORT = process.env.PORT || 3000; server.listen(PORT, ()=> console.log(`[ButtCaster] server on http://localhost:${PORT}`));
