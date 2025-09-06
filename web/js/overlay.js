import { applyCanvasScale } from "./canvas-scale.js";

applyCanvasScale(".stage", ".canvas-abs");

const socket = io();
socket.on('init', ({ intiface, devices }) => updateBadge(intiface.connected, devices.length));
socket.on('intiface:status', s => updateBadge(s.connected, (s.devices || []).length));
socket.on('intiface:devices', list => updateBadge(true, list.length));

function updateBadge(connected, count){
  const dot = document.getElementById('badge-conn');
  const dev = document.getElementById('badge-devices');
  if(dot){
    dot.style.background = connected ? 'limegreen' : 'crimson';
    dot.title = connected ? 'Connected' : 'Disconnected';
  }
  if(dev){
    dev.textContent = `${count} device${count === 1 ? '' : 's'}`;
  }
}
const bar = document.getElementById('goal-progress');
const label = document.getElementById('goal-label');
let target = 0;

socket.on('overlay:goal', ({ target:t, current }) => {
  target = t;
  const pct = Math.min(1, current / target);
  bar.style.width = `${pct * 100}%`;
  label.textContent = `${current}/${target} tokens`;
  if (pct >= 1) launchConfetti();
});

function launchConfetti(){
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.mjs')
    .then(m => m.default());
}
