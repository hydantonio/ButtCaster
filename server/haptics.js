
// Simple pattern player over Buttplug client
const builtin = {
  pulse:      [ [0.2,200],[0,150],[0.6,200],[0,150] ],
  wave:       [ [0.2,200],[0.4,200],[0.6,200],[0.8,200],[1.0,200],[0.8,200],[0.6,200],[0.4,200] ],
  edge:       [ [0.3,600],[0.5,600],[0.8,1200],[1.0,1400],[0.0,800] ],
  fireworks:  [ [0.2,150],[1.0,150],[0,250] , [0.3,150],[1.0,150],[0,300] ]
};

function getPattern(name){ return builtin[name] || builtin.pulse; }

function createPlayer(getDeviceByIndex){
  let timer=null;
  async function start(index, intensity){ const d = getDeviceByIndex(index); if(!d) return; if(typeof d.vibrate==='function') await d.vibrate(intensity); }
  async function stop(index){ const d=getDeviceByIndex(index); if(!d) return; if(typeof d.stop==='function') await d.stop(); }
  function play(index, name, mult=1){
    const seq = getPattern(name).map(([i,ms])=>[Math.min(1, i*mult), ms]);
    if(timer){ clearTimeout(timer); timer=null; }
    let i=0;
    const step=async()=>{ const [v, dur]=seq[i]; await start(index, v); i=(i+1)%seq.length; timer=setTimeout(step, dur); };
    step();
    return ()=>{ if(timer){ clearTimeout(timer); timer=null; } stop(index); };
  }
  return { start, stop, play };
}

module.exports = { createPlayer };
