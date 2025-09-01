// server/intiface.js — v53 (CJS)
const pkg = require('buttplug');
const NodeConnector =
  pkg.ButtplugNodeWebsocketClientConnector ||
  pkg.ButtplugClientWebsocketConnector     ||
  pkg.ButtplugBrowserWebsocketClientConnector;

if(!NodeConnector){
  throw new Error("No compatible Buttplug connector found. Try `npm i buttplug@latest`.");
}

async function connectIntiface(url, state, io){
  const { ButtplugClient } = pkg;
  if(state.bpClient?.connected){ try{ await state.bpClient.disconnect(); }catch{} }
  const client = new ButtplugClient('ButtCaster');
  await client.connect(new NodeConnector(url));
  state.bpClient = client;
  state.intiface = { url, connected:true };
  await scanOnce(client, state, io);
  client.addListener('deviceadded', ()=> emitDevices(client, state, io));
  client.addListener('deviceremoved', ()=> emitDevices(client, state, io));
  return client;
}

async function scanOnce(client, state, io){
  try{ await client.startScanning(); }catch{}
  setTimeout(async ()=>{ try{ await client.stopScanning(); }catch{} }, 3500);
  emitDevices(client, state, io);
}

function emitDevices(client, state, io){
  const list = client?.Devices || client?.devices || [];
  state.devices = list.map(d=>({ index: d.Index ?? d.index, name: d.Name ?? d.name, canVibrate: !!(d.AllowedMessages?.VibrateCmd) }));
  io.emit('intiface:devices', state.devices);
}

async function vibrateAll(state, strength=.65, durationMs=1200){
  const c = state.bpClient; if(!c?.connected) return;
  const list = c.Devices || c.devices || [];
  for(const d of list){ if(d?.AllowedMessages?.VibrateCmd !== undefined){ try{ await d.vibrate(strength);}catch{} } }
  setTimeout(async ()=>{ for(const d of list){ if(d?.AllowedMessages?.VibrateCmd !== undefined){ try{ await d.stop(); }catch{} } } }, durationMs);
}

module.exports = { connectIntiface, vibrateAll };
