
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { load, save } = require('./storage');
const { createBus, startChaturbate } = require('./platforms');
const { createPlayer } = require('./haptics');

const app = express();
app.use(cors()); app.use(express.json()); app.use(express.static('web'));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---- State ----
let state = load();
state.settings = Object.assign({
  theme:'dark',
  intifaceUrl:'ws://127.0.0.1:12345',
  defaultDeviceIndex: null,
  platform:'chaturbate',
  chaturbate: { enabled:false, feedType:'longpoll', url:'', token:'', room:'', intervalMs:5000 }
}, state.settings||{});
state.mappings = state.mappings || [
  { min:1,   max:9,   pattern:'pulse', mult:0.5 },
  { min:10,  max:49,  pattern:'pulse', mult:1   },
  { min:50,  max:99,  pattern:'wave',  mult:1.2 },
  { min:100, max:199, pattern:'edge',  mult:1.4 },
  { min:200, max:9999, pattern:'fireworks', mult:1.6 }
];
state.overlay = state.overlay || { elements: [] };
state.stats = state.stats || { topSupporter:null, topAmount:0, sessionTotals:{}, goal:{ mode:'goal', goalAmount:100, current:0, timer:0, addSecondsPerToken:2 } };

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
function getDeviceByIndex(ix){ return (bpDevices||[]).find(d=> (d.Index??d.index??-2)===Number(ix)); }
const player = createPlayer(getDeviceByIndex);

// ---- Events bus & platforms ----
const bus = createBus(io);
let stopCb = null;
function restartPlatform(){
  if(stopCb) { try{ stopCb(); }catch(e){} stopCb=null; }
  if(state.settings?.platform==='chaturbate' && state.settings?.chaturbate?.enabled){
    stopCb = startChaturbate(io, state.settings, bus);
  }
}
restartPlatform();

// ---- Map tip to pattern/haptics
function handleTip({ user='anon', amount=0 }){
  amount = Number(amount||0);
  if(amount<=0) return;

  // session totals + top supporter
  const t = state.stats.sessionTotals[user] || 0;
  const nt = t + amount; state.stats.sessionTotals[user] = nt;
  if(nt > (state.stats.topAmount||0)){ state.stats.topAmount = nt; state.stats.topSupporter = user; }

  // goal/timer
  const g = state.stats.goal || { mode:'goal' };
  if(g.mode==='goal' || g.mode==='both'){ g.current = (g.current||0) + amount; }
  if(g.mode==='timer' || g.mode==='both'){ g.timer = Math.min(12*3600, (g.timer||0) + Math.round(amount * (g.addSecondsPerToken||2))); }

  // mapping → pattern
  const m = (state.mappings||[]).find(m => amount>=m.min && amount<=m.max) || { pattern:'pulse', mult:1 };
  const idx = (state.settings.defaultDeviceIndex!=null ? state.settings.defaultDeviceIndex : (listDevices()[0]?.index));
  if(idx!=null) player.play(idx, m.pattern, m.mult);

  save(state);
  io.emit('stats:update', state.stats);
  io.emit('overlay:effect', { kind:'tip', amount, user });
}

// countdown timer tick
setInterval(()=>{
  const g = state.stats.goal;
  if(g && (g.mode==='timer' || g.mode==='both') && g.timer>0){
    g.timer = Math.max(0, g.timer-1);
    io.emit('stats:update', state.stats);
  }
}, 1000);

// bus listener
bus.on(evt => { if(evt.type==='tip') handleTip(evt); });

// ---- API
app.get('/api/state', (req,res)=> res.json(state));
app.post('/api/state', (req,res)=>{ state = Object.assign(state, req.body||{}); save(state); res.json({ok:true}); });

// ---- Socket handlers ----
io.on('connection', (socket)=>{
  socket.emit('state:init', state);
  socket.emit('intiface:status', { ok: !!bpClient, url:bpUrl, devices: bpDevices.length });
  socket.emit('intiface:devices', listDevices());
  socket.emit('overlay:update', state.overlay);
  socket.emit('stats:update', state.stats);

  socket.on('settings:update', (s)=>{ state.settings = Object.assign(state.settings||{}, s||{}); save(state); io.emit('settings:update', state.settings); restartPlatform(); });
  socket.on('settings:save', ()=>{ save(state); socket.emit('settings:saved',{ok:true}); });
  socket.on('intiface:connect', async (cfg)=>{ const url = cfg?.url || state.settings.intifaceUrl; const r = await connectButtplug(url); socket.emit('intiface:status', r); });
  socket.on('intiface:vibrate', async ({index,intensity,duration})=>{ const d=index??state.settings.defaultDeviceIndex; try{ await player.start(d, intensity); setTimeout(()=>player.stop(d), duration||800); socket.emit('intiface:test:result',{ok:true}); }catch(e){ socket.emit('intiface:test:result',{ok:false,error:String(e)}) } });
  socket.on('intiface:start', async ({index,intensity})=>{ try{ await player.start(index??state.settings.defaultDeviceIndex, intensity); socket.emit('intiface:test:result',{ok:true}); }catch(e){ socket.emit('intiface:test:result',{ok:false,error:String(e)}) } });
  socket.on('intiface:stop', async ({index})=>{ try{ await player.stop(index??state.settings.defaultDeviceIndex); socket.emit('intiface:test:result',{ok:true}); }catch(e){ socket.emit('intiface:test:result',{ok:false,error:String(e)}) } });
  socket.on('intiface:set-default', (i)=>{ state.settings.defaultDeviceIndex = Number(i); save(state); io.emit('settings:update', state.settings); });

  socket.on('platform:set', p=>{ state.settings.platform = p; save(state); io.emit('settings:update', state.settings); restartPlatform(); });
  socket.on('platform:update', cfg=>{ const key = state.settings.platform || 'chaturbate'; state.settings[key] = Object.assign(state.settings[key]||{}, cfg||{}); save(state); io.emit('settings:update', state.settings); restartPlatform(); });

  // overlay editor
  socket.on('overlay:update', (o)=>{ state.overlay = Object.assign({elements:[]}, o||{}); save(state); socket.broadcast.emit('overlay:update', state.overlay); });

  // simulate tip
  socket.on('simulate:tip', ({user, amount})=> handleTip({user, amount}) );
});

server.listen(3000, ()=> console.log('ButtCaster listening on 3000'));
