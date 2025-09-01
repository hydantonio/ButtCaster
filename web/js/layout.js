
// web/js/layout.js
export function enableRightSidebarResize(selector = ".right", gridSelector = ".app") {
  const right = document.querySelector(selector);
  const grid = document.querySelector(gridSelector);
  if (!right || !grid) return;
  right.style.position = "relative";
  const resizer = document.createElement("div");
  resizer.setAttribute("data-resizer", "right");
  resizer.style.cssText = "position:absolute;left:-4px;top:0;width:8px;height:100%;cursor:col-resize;";
  right.prepend(resizer);
  const saved = +localStorage.getItem("rightWidthPx");
  const startWidth = Number.isFinite(saved) && saved >= 240 && saved <= 600 ? saved : right.offsetWidth || 340;
  right.style.width = `${startWidth}px`;
  grid.style.gridTemplateColumns = `240px 1fr ${startWidth}px`;
  let dragging = false, pointerId = null;
  resizer.addEventListener("pointerdown", e => { dragging = true; pointerId = e.pointerId; resizer.setPointerCapture(pointerId); document.body.style.userSelect = "none"; });
  resizer.addEventListener("pointermove", e => {
    if (!dragging) return;
    const bounds = right.getBoundingClientRect();
    const newW = Math.min(600, Math.max(240, bounds.right - e.clientX + right.offsetWidth));
    right.style.width = `${newW}px`;
    grid.style.gridTemplateColumns = `240px 1fr ${newW}px`;
    localStorage.setItem("rightWidthPx", String(newW));
  });
  const stop = () => { if (!dragging) return; dragging = false; if (pointerId!=null) resizer.releasePointerCapture(pointerId); pointerId=null; document.body.style.userSelect=""; };
  resizer.addEventListener("pointerup", stop);
  resizer.addEventListener("pointercancel", stop);
}
