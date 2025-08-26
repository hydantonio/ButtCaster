
const socket = io();
let state = { settings:{ theme:'dark', platform:'chaturbate', chaturbate:{} }, mappings:[], patterns:[], overlay:{ elements:[] }, stats:{} };

// Theme
function applyTheme(t){
  document.body.classList.toggle('theme-dark', t==='dark');
  document.body.classList.toggle('theme-light', t==='light');
}
themeToggle.onchange = (e)=>{ const t=e.target.checked?'dark':'light'; applyTheme(t); socket.emit('settings:update',{ theme:t }); };
selTheme.onchange = (e)=>{ const t=e.target.value; applyTheme(t); socket.emit('settings:update',{ theme:t }); };

// Nav
function showPage(id){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
btnDevices.onclick = ()=> showPage('pageDevices');
btnOverlay.onclick = ()=> showPage('pageOverlay');
btnPatterns.onclick = ()=> showPage('pagePatterns');
btnMappings.onclick = ()=> showPage('pageMappings');
btnSettings.onclick = ()=> showPage('pageSettings');

// Overlay window
const { ipcRenderer } = typeof require==='function' ? require('electron') : { ipcRenderer:null };
btnOpenOverlay.onclick = ()=>{ if(ipcRenderer) ipcRenderer.send('open-overlay'); else window.open('/overlay.html','overlay'); };
btnOpenBrowser.onclick = ()=>{ if(ipcRenderer) ipcRenderer.send('open-overlay-browser'); else window.open('/overlay.html','_blank'); };

// Sim tip
btnSimTip.onclick = ()=>{
  const user=(simUser.value||'demo'); const amount=Number(simAmount.value||0);
  socket.emit('simulate:tip', { user, amount });
};

// Intiface connect
btnConnectIF.onclick = ()=>{
  const url = `ws://${(ifHost.value||'127.0.0.1').trim()}:${(ifPort.value||'12345').trim()}`;
  socket.emit('settings:update',{ intifaceUrl:url });
  socket.emit('intiface:connect', { url });
};
saveIF.onclick = ()=>{ const url = (ifUrl.value||'').trim(); if(url) socket.emit('settings:update',{ intifaceUrl:url }); toast('Intiface URL saved'); };

// Devices
socket.on('intiface:status', st=>{ statusBox.textContent = st.ok? `Intiface: connected (${st.devices||0})` : 'Intiface: disconnected'; });
socket.on('intiface:devices', list=> renderDevices(list));
function devCard(d){
  const el=document.createElement('div'); el.className='device';
  el.innerHTML=`<div class="hdr"><div class="name">${d.name||'Device'}</div><div class="idx">idx ${d.index}</div></div>
    <input type="range" min="0" max="100" value="60" class="slider">
    <div class="row"><button class="btn play">Start</button><button class="btn secondary stop">Stop</button><button class="btn secondary test">Test</button></div>`;
  const slider = el.querySelector('.slider');
  el.querySelector('.play').onclick = ()=> socket.emit('intiface:start', { index:d.index, intensity: Number(slider.value)/100 });
  el.querySelector('.stop').onclick = ()=> socket.emit('intiface:stop', { index:d.index });
  el.querySelector('.test').onclick = ()=> socket.emit('intiface:vibrate', { index:d.index, intensity:Number(slider.value)/100, duration:800 });
  return el;
}
function renderDevices(list){ devGrid.innerHTML=''; (list||[]).forEach(d=> devGrid.appendChild(devCard(d))); }

// Patterns (preview only in UI)
const PATTERNS=[
  { id:'pulse', name:'Pulse', seq:[ [0.2,200],[0,150],[0.6,200],[0,150] ], loop:true },
  { id:'wave',  name:'Wave',  seq:[ [0.2,200],[0.4,200],[0.6,200],[0.8,200],[1.0,200],[0.8,200],[0.6,200],[0.4,200] ], loop:true },
  { id:'edge',  name:'Edge',  seq:[ [0.3,600],[0.5,600],[0.8,1200],[1.0,1400],[0.0,800] ], loop:false },
  { id:'fireworks', name:'Fireworks', seq:[ [0.2,150],[1.0,150],[0,250] , [0.3,150],[1.0,150],[0,300] ], loop:true }
];
function patCard(p){
  const el=document.createElement('div'); el.className='pat';
  el.innerHTML=`<div class="hdr"><div class="name">${p.name}</div></div>
  <svg viewBox="0 0 100 24"><polyline points="${p.seq.map((x,i)=>`${i*(100/(p.seq.length-1))},${24-(x[0]*24)}`).join(' ')}" fill="none" stroke="#ff4fd8" stroke-width="2"/></svg>
  <div class="row"><button class="btn play">Play default</button><button class="btn secondary stop">Stop</button></div>`;
  el.querySelector('.play').onclick = ()=> playPatternToDefault(p);
  el.querySelector('.stop').onclick = ()=> socket.emit('intiface:stop', { });
  return el;
}
function renderPatterns(){ patternGrid.innerHTML=''; PATTERNS.forEach(p=> patternGrid.appendChild(patCard(p))); }
renderPatterns();
let patternTimer=null;
function playPatternToDefault(p){
  if(patternTimer){ clearTimeout(patternTimer); patternTimer=null; }
  const idx = state.settings.defaultDeviceIndex;
  if(idx==null){ toast('Set a default device in Settings'); return; }
  let i=0; const step=()=>{ const [intensity, dur]=p.seq[i]; socket.emit('intiface:start', { index:idx, intensity }); i=(i+1)%p.seq.length; if(!p.loop&&i===0){ socket.emit('intiface:stop',{ index:idx }); return; } patternTimer=setTimeout(step, dur); }; step();
}
btnStopAll && (btnStopAll.onclick = ()=> socket.emit('intiface:stop', {}));

// Mappings
function renderMappings(){
  const root=document.getElementById('mapList'); root.innerHTML='';
  (state.mappings||[]).forEach((m,ix)=>{
    const row=document.createElement('div'); row.className='maprow';
    row.innerHTML=`<div>${m.min}-${m.max} tokens</div><div>${m.pattern}</div><input type="number" class="input" value="${m.mult||1}"><button class="btn secondary">Delete</button>`;
    row.querySelector('button').onclick=()=>{ state.mappings.splice(ix,1); renderMappings(); };
    root.appendChild(row);
  });
}
btnAddMap.onclick=()=>{ state.mappings.push({ min:1, max:50, pattern:'pulse', mult:1 }); renderMappings(); };

// Overlay editor
let overlay = { elements: [] }; let selected=null;
const stage = document.getElementById('stage');
function addElement(type){
  const id = 'el'+Math.random().toString(36).slice(2,7);
  const el = { id, type, x:100, y:100, w:300, h:60, text: type==='text'?'YOUR TEXT':'BADGE', fontSize: Number(fontSize.value||48) };
  overlay.elements.push(el); draw();
}
addText.onclick = ()=> addElement('text');
addBadge.onclick = ()=> addElement('badge');
addTimer.onclick = ()=> addElement('timer');
addCounter.onclick = ()=> addElement('counter');
addImage.onclick = ()=> addElement('image');
clearAll.onclick = ()=>{ overlay.elements=[]; draw(); };

function draw(){
  stage.querySelectorAll('.elt').forEach(n=>n.remove());
  (overlay.elements||[]).forEach(e=>{
    const n=document.createElement('div'); n.className='elt '+(e.type==='text'?'text':'badge'); n.dataset.id=e.id;
    n.textContent=e.text||e.type; n.style.left=e.x+'px'; n.style.top=e.y+'px'; n.style.fontSize=(e.fontSize||48)+'px';
    stage.appendChild(n);
  });
  enableDrag();
}
function enableDrag(){
  const snap = Number(snapPx.value||0);
  stage.querySelectorAll('.elt').forEach(n=>{
    n.onpointerdown = (ev)=>{
      const id = n.dataset.id; const e = overlay.elements.find(x=>x.id===id); selected=e;
      const startX = ev.clientX, startY = ev.clientY; const sx=e.x, sy=e.y;
      n.setPointerCapture(ev.pointerId);
      n.onpointermove = (mv)=>{
        let nx = sx + (mv.clientX - startX);
        let ny = sy + (mv.clientY - startY);
        if(snap>0){ nx = Math.round(nx/snap)*snap; ny = Math.round(ny/snap)*snap; }
        e.x = Math.max(0, Math.min(nx, stage.clientWidth-20));
        e.y = Math.max(0, Math.min(ny, stage.clientHeight-20));
        n.style.left=e.x+'px'; n.style.top=e.y+'px';
      };
      n.onpointerup = ()=>{ n.onpointermove=null; n.onpointerup=null; };
      n.ondblclick = ()=>{ if(e.type==='text'||e.type==='badge'){ const t=prompt('Text', e.text||''); if(t!=null){ e.text=t; draw(); } } };
    };
  });
}
saveOverlay.onclick = ()=>{ socket.emit('overlay:update', overlay); toast('Overlay saved'); };

// State init
socket.on('state:init', s=>{
  state = Object.assign(state, s||{});
  applyTheme(state.settings?.theme||'dark');
  themeToggle.checked = (state.settings?.theme||'dark')==='dark';
  selTheme.value = state.settings?.theme || 'dark';
  ifUrl.value = state.settings?.intifaceUrl || '';
  const cb = state.settings?.chaturbate||{}; cbType.value = cb.feedType||'longpoll'; cbUrl.value=cb.url||cb.wsUrl||''; cbToken.value=cb.token||''; cbInterval.value=cb.intervalMs||5000; cbEnabled.checked=!!cb.enabled;
  overlay = (state.overlay)||{elements:[]}; draw(); renderMappings();
  state.stats && updateStats(state.stats);
});
socket.on('overlay:update', o=>{ overlay=o||{elements:[]}; draw(); });
socket.on('settings:update', s=>{ state.settings = Object.assign(state.settings||{}, s||{}); });
socket.on('stats:update', s=>{ updateStats(s); });

function updateStats(s){ state.stats=s||{}; }

// Save CB + SaveAll
saveCB.onclick = ()=>{
  const cfg={ feedType: cbType.value, url: cbUrl.value, wsUrl: cbUrl.value, token: cbToken.value, intervalMs: Number(cbInterval.value||5000), enabled: cbEnabled.checked };
  socket.emit('platform:set','chaturbate'); socket.emit('platform:update', cfg); toast('Chaturbate settings saved'); };
saveAll.onclick = ()=>{ socket.emit('settings:save'); toast('Saved'); };

function toast(t){ const el=document.createElement('div'); el.textContent=t; el.style.position='fixed'; el.style.bottom='18px'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.background='rgba(0,0,0,.75)'; el.style.color='#fff'; el.style.padding='10px 14px'; el.style.borderRadius='12px'; el.style.zIndex='9999'; document.body.appendChild(el); setTimeout(()=>el.remove(), 1500); }
