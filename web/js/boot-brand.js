
document.addEventListener('DOMContentLoaded', ()=>{
  if(document.querySelector('.header-brand')) return;
  const h=document.createElement('div'); h.className='header-brand fade-enter';
  h.innerHTML = '<img src="/img/logo.svg" alt="ButtCaster"/><div class="header-title">ButtCaster Control</div><div class="badges"><div class="chip">v48</div></div>';
  document.body.prepend(h); requestAnimationFrame(()=>h.classList.add('fade-enter-active'));
});
