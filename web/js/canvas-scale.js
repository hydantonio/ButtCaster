
// web/js/canvas-scale.js
export function applyCanvasScale(stageSelector = ".stage", absSelector = ".canvas-abs") {
  const stage = document.querySelector(stageSelector);
  const abs = document.querySelector(absSelector);
  if (!stage || !abs) return;
  const scaleX = 1920/960, scaleY = 1080/540;
  abs.style.transformOrigin = "0 0";
  abs.style.transform = `scale(${scaleX}, ${scaleY})`;
}
