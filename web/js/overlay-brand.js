
(function(){
  const img = document.createElement('img'); img.className='watermark'; img.src='/img/watermark.svg';
  document.addEventListener('DOMContentLoaded', ()=>{ (document.getElementById('stage')||document.body).appendChild(img); });
  if(window.io){ const s = window.io(); s.on('overlay:settings', (cfg)=>{ if(typeof cfg.showWatermark!=='undefined'){ img.classList.toggle('hidden', !cfg.showWatermark); } }); }
})();
