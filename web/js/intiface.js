
// web/js/intiface.js (same as previous zip)
import * as Buttplug from "buttplug";
let client = null;
let deviceCountCb = null;
export async function connectIntiface(address = "ws://127.0.0.1:12345") {
  if (client?.connected) return client;
  client = new Buttplug.ButtplugClient("ButtCaster");
  const connector = new Buttplug.ButtplugBrowserWebsocketClientConnector(address);
  await client.connect(connector);
  await client.startScanning();
  client.on("deviceadded",  dev => { console.log("[ButtCaster] Device added:", dev.name);  updateBadge(); });
  client.on("deviceremoved", dev => { console.log("[ButtCaster] Device removed:", dev.name); updateBadge(); });
  updateBadge();
  return client;
}
export async function disconnectIntiface() {
  if (!client) return;
  try {
    await client.stopScanning().catch(()=>{});
    await client.disconnect();
  } finally {
    client = null; updateBadge();
  }
}
export function getClient(){ return client; }
export function deviceCount(){ return client?.devices?.length ?? 0; }
export function onDeviceCount(cb){ deviceCountCb = cb; updateBadge(); return () => { if (deviceCountCb===cb) deviceCountCb = null; }; }
function updateBadge(){
  const n = deviceCount();
  if (deviceCountCb) deviceCountCb(n);
  const el = document.getElementById("badge-devices");
  if (el) el.textContent = `${n} device${n===1?"":"s"}`;
  const dot = document.getElementById("badge-conn");
  if (dot){ dot.style.background = (client?.connected?"limegreen":"crimson"); dot.title = client?.connected ? "Connected" : "Disconnected";}
}
export async function vibrateTest(intensity = 0.5, ms = 1000) {
  if (!client || !client.connected) throw new Error("Not connected to Intiface");
  for (const dev of client.devices) {
    try { if (dev.vibratorCount && dev.vibratorCount > 0) { await dev.vibrate(intensity); } }
    catch(e){ console.warn("[ButtCaster] Vibrate test failed for", dev.name, e); }
  }
  if (ms > 0) {
    await new Promise(r => setTimeout(r, ms));
    for (const dev of client.devices) { try { await dev.stop(); } catch {} }
  }
}
