import { connectIntiface, onDeviceCount } from "./intiface.js";
import { applyCanvasScale } from "./canvas-scale.js";

applyCanvasScale(".stage", ".canvas-abs");
connectIntiface().catch(console.error);
onDeviceCount(n => console.log("[Overlay] Devices:", n));

const socket = io();
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
