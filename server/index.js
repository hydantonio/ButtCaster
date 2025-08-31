
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin:'*' } });

app.use(express.json({limit:'2mb'}));
app.use('/css', express.static(path.join(__dirname,'../web/css')));
app.use('/js', express.static(path.join(__dirname,'../web/js')));
app.use('/img', express.static(path.join(__dirname,'../web/img')));
app.use('/', express.static(path.join(__dirname,'../web')));
app.get('/app/quit',(req,res)=>{ res.json({ok:true}); setTimeout(()=>process.exit(0),200); });

const dataFile = path.join(__dirname,'data.json');
if(!fs.existsSync(dataFile)){
  fs.writeFileSync(dataFile, JSON.stringify({
    overlay:{ showWatermark:true, glow:true, goalTarget:2000, goalValue:0 },
    elements:[{id:'g1',type:'goalbar',x:480,y:800,w:960,h:100},{id:'t1',type:'text',x:620,y:620,text:'WELCOME TO THE STREAM',size:72,w:800,h:72}],
    mappings:[{min:1,max:19,strength:.4,duration:1000,pattern:'pulse'},{min:20,max:49,strength:.6,duration:1600,pattern:'wave'},{min:50,max:99,strength:.8,duration:2200,pattern:'ramp'},{min:100,max:999999,strength:1.0,duration:3000,pattern:'fireworks'}],
    intiface:{url:null,status:'disconnected'},
    platform:{ provider:'none', chaturbate:{room:'', token:''} }
  }, null, 2));
}
let data = JSON.parse(fs.readFileSync(dataFile,'utf8'));
function save(){ fs.writeFileSync(dataFile, JSON.stringify(data,null,2)); }

// Intiface lazy
let bp=null, bpConnected=false, Buttplug=null;
function loadButtplug(){ if(Buttplug) return Buttplug; try { Buttplug=require('buttplug'); return Buttplug; } catch(e){ return null; } }
async function connectIntiface(url){
  const mod = loadButtplug(); if(!mod){ io.emit('toast',{type:'error',text:'Buttplug not installed'}); return; }
  const { ButtplugClient, ButtplugClientWebsocketConnector } = mod;
  try{
    bp = new ButtplugClient('ButtCaster'); const conn = new ButtplugClientWebsocketConnector(url);
    await bp.connect(conn); bpConnected=true;
    data.intiface={url,status:'connected'}; save(); io.emit('intiface:status', data.intiface);
    try{ await bp.startScanning(); } catch(_){}
    bp.on('deviceadded', ()=> io.emit('intiface:devices', devicesCaps()));
    bp.on('deviceremoved', ()=> io.emit('intiface:devices', devicesCaps()));
    io.emit('intiface:devices', devicesCaps());
  }catch(err){ io.emit('intiface:status',{url,status:'error'}); io.emit('toast',{type:'error',text:String(err.message||err)}); }
}
function devicesCaps(){ if(!bp) return []; return bp.devices.map(d=>({id:d.index,name:d.name,canVibrate:!!d.vibrate,canRotate:!!d.rotate,canLinear:!!d.linear})); }

const presets = { gentle:{curve:'easeOutSine', max:.45, burstMs:1100}, balanced:{curve:'easeOutQuad', max:.7, burstMs:1400}, intense:{curve:'easeOutCubic', max:1, burstMs:1800} };
const curves={ easeOutSine:x=>Math.sin((x*Math.PI)/2), easeOutQuad:x=>1-(1-x)*(1-x), easeOutCubic:x=>1-Math.pow(1-x,3) };

async function hapticsByAmount(amount){
  if(!bp || !bpConnected) return;
  const pr = presets[data.hapticsPreset]||presets.balanced;
  const norm = Math.max(0, Math.min(1, amount/(data.overlay.goalTarget||1000)));
  const intensity = curves[pr.curve](norm)*pr.max;
  const dur = pr.burstMs;
  for(const dev of bp.devices){
    try{
      if(dev.vibrate){ await dev.vibrate(intensity); setTimeout(()=>dev.vibrate(0).catch(()=>{}), dur); }
      else if(dev.linear){ await dev.linear(intensity, dur); }
    }catch(_){}
  }
}

let tipHistory = [];
io.on('connection',(socket)=>{
  socket.emit('overlay:settings', data.overlay);
  socket.emit('overlay:elements', data.elements);
  socket.emit('overlay:mappings', data.mappings);
  socket.emit('intiface:status', data.intiface);
  socket.emit('intiface:devices', devicesCaps());
  socket.emit('counters', counters());

  socket.on('settings:update', (cfg)=>{ data.overlay={...data.overlay,...cfg}; save(); io.emit('overlay:settings', data.overlay); });
  socket.on('goal:set', (t)=>{ data.overlay.goalTarget=Number(t)||0; data.overlay.goalValue=Math.min(data.overlay.goalValue, data.overlay.goalTarget); save(); io.emit('overlay:goal', {current:data.overlay.goalValue, target:data.overlay.goalTarget}); });

  socket.on('elements:get', ()=> socket.emit('overlay:elements', data.elements));
  socket.on('element:add', (el)=>{ el.id=el.id||String(Date.now()); data.elements.push(el); save(); io.emit('overlay:elements', data.elements); });
  socket.on('element:update',(el)=>{ const i=data.elements.findIndex(e=>e.id===el.id); if(i>=0){ data.elements[i]={...data.elements[i],...el}; save(); io.emit('overlay:elements', data.elements); } });
  socket.on('element:delete',(id)=>{ data.elements=data.elements.filter(e=>e.id!==id); save(); io.emit('overlay:elements', data.elements); });
  socket.on('elements:order',(ids)=>{ const map=new Map(data.elements.map(e=>[e.id,e])); data.elements=ids.map(id=>map.get(id)).filter(Boolean); save(); io.emit('overlay:elements', data.elements); });

  socket.on('mappings:set', list=>{ data.mappings = Array.isArray(list)? list: []; save(); });

  socket.on('intiface:connect', (url)=> connectIntiface(url));
  socket.on('haptics:preset', p=>{ if(presets[p]){ data.hapticsPreset=p; save(); } });
  socket.on('haptics:device:set', async ({id,strength=0,dur=800})=>{
    if(!bp) return; const d = bp.devices.find(x=>x.index===id); if(!d) return;
    try{ if(d.vibrate){ await d.vibrate(strength); setTimeout(()=>d.vibrate(0).catch(()=>{}), dur); } }catch(_){}
  });

  socket.on('tip', async ({amount=0, user='user'})=>{
    const m = data.mappings.find(r=> amount>=Number(r.min) && amount<=Number(r.max));
    await hapticsByAmount(amount);
    if(m){ await hapticsByAmount(Number(m.max)); }
    data.overlay.goalValue = Math.min((data.overlay.goalValue||0) + Number(amount), data.overlay.goalTarget||0);
    save();
    io.emit('overlay:goal', {current:data.overlay.goalValue, target:data.overlay.goalTarget, user});
    if(data.overlay.goalValue>=data.overlay.goalTarget){
      io.emit('overlay:goal-reached', {target:data.overlay.goalTarget});
    }
    const now=Date.now(); tipHistory.push({user, amount:Number(amount), ts:now}); const cutoff=now-10*60*1000;
    tipHistory = tipHistory.filter(t=>t.ts>=cutoff);
    socket.emit('counters', counters());
  });

  // Platform settings (stub for Chaturbate)
  socket.on('platform:set', (cfg)=>{ data.platform = {...data.platform, ...cfg}; save(); });
});

function counters(){
  const now=Date.now(), cutoff=now-10*60*1000;
  const tippers = new Set(tipHistory.filter(t=>t.ts>=cutoff).map(t=>t.user)).size;
  return { users: 0, tippers10m: tippers };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('ButtCaster v48 listening on http://localhost:'+PORT));
