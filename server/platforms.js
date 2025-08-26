
const WebSocket = require('ws');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

function createBus(io){
  const listeners = new Set();
  return {
    on(fn){ listeners.add(fn); return ()=>listeners.delete(fn); },
    emit(evt){ listeners.forEach(f=>{ try{ f(evt); }catch(e){} }); io.emit('platform:event', evt); }
  };
}

function startChaturbate(io, settings, bus){
  // Generic adapter that supports either a custom WS that emits JSON {type:'tip', user, amount}
  // or a "longpoll" URL responding with an array of events.
  let ws=null, timer=null, stopped=false;
  const conf = settings?.chaturbate || {};
  const emit = (e)=> bus.emit({ platform:'chaturbate', ...e });
  async function poll(){
    if(stopped) return;
    const url = conf.url || conf.eventsUrl || conf.longpollUrl;
    if(!url){ timer=setTimeout(poll, 4000); return; }
    try{
      const r = await fetch(url, { headers: { 'Authorization': conf.token ? `Bearer ${conf.token}` : undefined } });
      if(r.ok){
        const arr = await r.json().catch(()=>[]);
        if(Array.isArray(arr)){
          arr.forEach(ev=>{ if(ev && ev.type==='tip'){ emit({ type:'tip', user:ev.user||'anon', amount:Number(ev.amount||0) }); } });
        }
      }
    }catch(e){ /* ignore */ }
    timer=setTimeout(poll, Number(conf.intervalMs||5000));
  }
  function openWs(){
    const url = conf.wsUrl || conf.url;
    if(!url) return;
    ws = new WebSocket(url, { headers: { 'Authorization': conf.token ? `Bearer ${conf.token}` : undefined } });
    ws.on('message', msg=>{
      try{
        const ev = JSON.parse(msg.toString());
        if(ev && ev.type==='tip'){ emit({ type:'tip', user:ev.user||'anon', amount:Number(ev.amount||0) }); }
      }catch(e){}
    });
    ws.on('close', ()=>{ if(!stopped) setTimeout(openWs, 3000); });
    ws.on('error', ()=>{});
  }
  if(conf.feedType==='ws') openWs(); else poll();

  return ()=>{ stopped=true; if(ws){ try{ ws.close(); }catch(e){} } if(timer){ clearTimeout(timer); } };
}

module.exports = { createBus, startChaturbate };
