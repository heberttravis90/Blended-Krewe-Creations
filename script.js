const btn=document.querySelector('.menu-btn');const nav=document.querySelector('.site-nav');
btn?.addEventListener('click',()=>{const open=nav.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
document.getElementById('year').textContent=new Date().getFullYear();

const shopTabs=[...document.querySelectorAll('.shop-tab')];
const productCards=[...document.querySelectorAll('.product-card[data-category]')];
const filterNote=document.getElementById('filter-note');
shopTabs.forEach(tab=>tab.addEventListener('click',()=>{
  const filter=tab.dataset.filter;
  shopTabs.forEach(t=>{const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active));});
  let shown=0;
  productCards.forEach(card=>{
    const categories=(card.dataset.category||'').split(/\s+/);
    const show=filter==='all'||categories.includes(filter);
    card.hidden=!show;
    if(show) shown++;
  });
  if(filterNote){
    if(filter==='all') filterNote.textContent='Showing all current designs.';
    else filterNote.textContent=shown+' design'+(shown===1?'':'s')+' in '+tab.textContent+'.';
  }
}));
