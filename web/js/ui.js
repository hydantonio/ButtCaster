
(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  document.addEventListener('DOMContentLoaded', ()=>{
    // Sidebar navigation
    $$('.navbtn').forEach(btn=>btn.addEventListener('click',()=>{
      $$('.navbtn').forEach(b=>b.classList.toggle('active', b===btn));
      const sec = btn.dataset.section;
      ['overlay','elements','mappings','devices','settings'].forEach(id=>{
        const v = $('#view-'+id); if(v) v.hidden = (id!==sec);
      });
      try{ localStorage.setItem('buttcaster:lastView','view-'+sec); }catch{}
    }));
    // Restore last view
    const last = localStorage.getItem('buttcaster:lastView') || 'view-overlay';
    const startBtn = $(`.navbtn[data-section="${last.replace('view-','')}"]`) || $('.navbtn');
    if(startBtn) startBtn.click();
  });
})();
