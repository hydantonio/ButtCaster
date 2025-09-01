// control.js — v53 (drag+snap, devices render, no re-declare)
const ioSock = io();
const stage = document.getElementById('stage');
let selectedEl = null;

function select(el){
  if(selectedEl) selectedEl.classList.remove('selected');
  selectedEl = el; if(el) el.classList.add('selected');
}

function makeDraggable(el){
  if(!el) return;
  el.classList.add('draggable');
  el.addEventListener('pointerdown', e=>{
    select(el);
    const srect = stage.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const start = { x:e.clientX, y:e.clientY, l:rect.left-srect.left, t:rect.top-srect.top };
    el.setPointerCapture?.(e.pointerId);
    function mv(ev){
      let nx = start.l + (ev.clientX-start.x);
      let ny = start.t + (ev.clientY-start.y);
      if(ev.shiftKey){ nx = Math.round(nx/8)*8; ny = Math.round(ny/8)*8; }
      nx = Math.max(0, Math.min(stage.clientWidth - el.clientWidth, nx));
      ny = Math.max(0, Math.min(stage.clientHeight - el.clientHeight, ny));
      el.style.left = nx+'px'; el.style.top = ny+'px';
    }
    function up(){ stage.removeEventListener('pointermove', mv); stage.removeEventListener('pointerup', up); ioSock.emit('overlay:set', serialize()); }
    stage.addEventListener('pointermove', mv); stage.addEventListener('pointerup', up);
  });
}

function serialize(){
  const title = document.getElementById('title');
  const goal  = document.getElementById('goalbar');
  const res = { elements: [] };
  if(title) res.elements.push({ id:'title', x:px(title.style.left), y:px(title.style.top) });
  if(goal)  res.elements.push({ id:'goalbar', x:px(goal.style.left),  y:px(goal.style.top)  });
  return res;
}
function px(v){ return Number(String(v||'').replace('px',''))||0; }

// Init
makeDraggable(document.getElementById('title'));
makeDraggable(document.getElementById('goalbar'));

// Devices list
ioSock.on('intiface:devices', list=>{
  const box = document.getElementById('devList'); if(!box) return; box.innerHTML='';
  (list||[]).forEach(d=>{
    const row = document.createElement('div'); row.className='dev-row';
    row.innerHTML = `<span class="dot ${d.canVibrate?'ok':'no'}"></span><b>${d.name}</b><em>#${d.index}</em>`;
    box.appendChild(row);
  });
});

// Goal updates
ioSock.on('overlay:goal', g=>{
  const pct = Math.min(100, Math.round((g.current||0)/(g.target||2000)*100));
  const fill = document.getElementById('goal-fill');
  const rem  = document.getElementById('remaining');
  if(fill) fill.style.width = pct+'%';
  if(rem)  rem.textContent = Math.max(0,(g.target||2000)-(g.current||0));
});
