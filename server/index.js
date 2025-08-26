
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { load, save } = require('./storage');

const app = express();
app.use(cors()); app.use(express.json()); app.use(express.static('web'));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---- State (persisted) ----
let state = load();
state.settings = Object.assign({
  theme:'dark',
  intifaceUrl:'ws://127.0.0.1:12345',
  defaultDeviceIndex: null,
  platform:'chaturbate',
  chaturbate: { enabled:false, feedType:'longpoll', url:'', token:'', room:'' }
}, state.settings||{});

// default mappings (predefiniti)
state.mappings = state.mappings || [
  { min:1,   max:9,   pattern:'pulse', mult:0.5 },
  { min:10,  max:49,  pattern:'pulse', mult:1   },
  { min:50,  max:99,  pattern:'wave',  mult:1.2 },
  { min:100, max:199, pattern:'edge',  mult:1.4 },
  { min:200, max:9999, pattern:'fireworks', mult:1.6 }
];
state.patterns = state.patterns || []; // future custom

// overlay elements state
state.overlay = state.overlay || { elements: [] };

// ---- Intiface / Buttplug ----
let bpClient = null, bpDevices = [], bpUrl = null;
async function connectButtplug(url){
  const Buttplug = require('buttplug');
  try{
    const target = url || state.settings.intifaceUrl || 'ws://127.0.0.1:12345';
    if(bpClient){ try{ await bpClient.disconnect(); }catch(e){} }
    bpClient = new Buttplug.ButtplugClient('ButtCaster');
    const conn = new Buttplug.ButtplugNodeWebsocketClientConnector(target);
    await bpClient.connect(conn);
    bpDevices = [];
    bpClient.addListener('deviceadded', (d) => { bpDevices.push(d); io.emit('intiface:devices', listDevices()); });
    bpClient.addListener('deviceremoved', (d) => { bpDevices = bpDevices.filter(x => x.Index !== d.Index); io.emit('intiface:devices', listDevices()); });
    try{ await bpClient.startScanning(); }catch(e){}
    bpUrl = target;
    io.emit('intiface:status', { ok:true, url:bpUrl, devices: bpDevices.length });
    io.emit('intiface:devices', listDevices());
    return { ok:true };
  }catch(e){
    io.emit('intiface:status', { ok:false, error:String(e.message||e), url:url });
    return { ok:false, error:String(e.message||e) };
  }
}
function deviceInfo(d){
  const msgs = Object.keys((d && (d.AllowedMessages||d._allowedMessages||{})) || {});
  const caps = { canVibrate: !!(msgs.find(m=>/Vibrate/i.test(m)) && typeof d.vibrate==='function') };
  return { index: d.Index||d.index||0, name: d.Name||d.name||'Device', caps };
}
function listDevices(){ return (bpDevices||[]).map(d=>deviceInfo(d)); }

async function vibrateOnce(index, intensity=0.6, duration=800){
  const t = (bpDevices||[]).find(d=> (d.Index??d.index??-2)===Number(index));
  if(!t) return { ok:false, reason:'not found' };
  try{
    if(typeof t.vibrate === 'function') await t.vibrate(intensity);
    setTimeout(async()=>{ try{ if(typeof t.stop==='function') await t.stop(); }catch(e){} }, duration);
    return { ok:true };
  }catch(e){ return { ok:false, error:String(e) }; }
}
async function startVibrate(index, intensity=0.6){
  const t = (bpDevices||[]).find(d=> (d.Index??d.index??-2)===Number(index));
  if(!t) return { ok:false, reason:'not found' };
  try{ if(typeof t.vibrate==='function') await t.vibrate(intensity); return { ok:true } }catch(e){ return { ok:false, error:String(e) } }
}
async function stopVibrate(index){
  const t = (bpDevices||[]).find(d=> (d.Index??d.index??-2)===Number(index));
  if(!t) return { ok:false, reason:'not found' };
  try{ if(typeof t.stop==='function') await t.stop(); return { ok:true } }catch(e){ return { ok:false, error:String(e) } }
}

// ---- API
app.get('/api/state', (req,res)=> res.json(state));
app.post('/api/state', (req,res)=>{ state = Object.assign(state, req.body||{}); save(state); res.json({ok:true}); });

// ---- Socket handlers ----
io.on('connection', (socket)=>{
  socket.emit('state:init', state);
  socket.emit('intiface:status', { ok: !!bpClient, url:bpUrl, devices: bpDevices.length });
  socket.emit('intiface:devices', listDevices());
  socket.emit('overlay:update', state.overlay);

  socket.on('settings:update', (s)=>{ state.settings = Object.assign(state.settings||{}, s||{}); save(state); io.emit('settings:update', state.settings); });
  socket.on('settings:save', ()=>{ save(state); socket.emit('settings:saved',{ok:true}); });
  socket.on('intiface:connect', async (cfg)=>{ const url = cfg?.url || state.settings.intifaceUrl; const r = await connectButtplug(url); socket.emit('intiface:status', r); });
  socket.on('intiface:vibrate', async ({index,intensity,duration})=>{ const r=await vibrateOnce(index,intensity,duration); socket.emit('intiface:test:result', r); });
  socket.on('intiface:start', async ({index,intensity})=>{ const r=await startVibrate(index,intensity); socket.emit('intiface:test:result', r); });
  socket.on('intiface:stop', async ({index})=>{ const r=await stopVibrate(index); socket.emit('intiface:test:result', r); });
  socket.on('intiface:set-default', (i)=>{ state.settings.defaultDeviceIndex = Number(i); save(state); io.emit('settings:update', state.settings); });

  socket.on('platform:set', p=>{ state.settings.platform = p; save(state); io.emit('settings:update', state.settings); });
  socket.on('platform:update', cfg=>{ const key = state.settings.platform || 'chaturbate'; state.settings[key] = Object.assign(state.settings[key]||{}, cfg||{}); save(state); io.emit('settings:update', state.settings); });

  // Overlay editor
  socket.on('overlay:update', (o)=>{ state.overlay = Object.assign({elements:[]}, o||{}); save(state); socket.broadcast.emit('overlay:update', state.overlay); });
});

server.listen(3000, ()=> console.log('ButtCaster listening on 3000'));
