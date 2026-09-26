const menuBtn=document.querySelector('.menu-btn');
const nav=document.querySelector('.site-nav');
menuBtn?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});
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

const CART_KEY='blendedKreweCartV1';
const cartButton=document.getElementById('cart-button');
const cartCount=document.getElementById('cart-count');
const cartDrawer=document.getElementById('cart-drawer');
const cartBackdrop=document.getElementById('cart-backdrop');
const cartClose=document.getElementById('cart-close');
const cartItemsEl=document.getElementById('cart-items');
const cartSubtotal=document.getElementById('cart-subtotal');
const checkoutButton=document.getElementById('checkout-button');
const cartMessage=document.getElementById('cart-message');

let catalog=[];
let cart=loadCart();

function money(cents){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((cents||0)/100);}
function loadCart(){
  try{
    const parsed=JSON.parse(localStorage.getItem(CART_KEY)||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch{return [];}
}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart();}
function openCart(){
  if(!cartDrawer||!cartBackdrop)return;
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden','false');
  cartBackdrop.hidden=false;
  requestAnimationFrame(()=>cartBackdrop.classList.add('show'));
}
function closeCart(){
  if(!cartDrawer||!cartBackdrop)return;
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden','true');
  cartBackdrop.classList.remove('show');
  setTimeout(()=>{cartBackdrop.hidden=true;},180);
}
function addToCart(product){
  const existing=cart.find(i=>i.sku===product.sku);
  if(existing) existing.quantity=Math.min(10,(existing.quantity||1)+1);
  else cart.push({sku:product.sku,name:product.name,price_cents:product.price_cents,quantity:1});
  saveCart();
  openCart();
}
function changeQty(sku,delta){
  const item=cart.find(i=>i.sku===sku);
  if(!item)return;
  item.quantity=Math.max(0,Math.min(10,item.quantity+delta));
  cart=cart.filter(i=>i.quantity>0);
  saveCart();
}
function renderCart(){
  const totalQty=cart.reduce((sum,i)=>sum+i.quantity,0);
  const subtotal=cart.reduce((sum,i)=>sum+(i.price_cents*i.quantity),0);
  if(cartCount) cartCount.textContent=String(totalQty);
  if(cartSubtotal) cartSubtotal.textContent=money(subtotal);
  if(checkoutButton) checkoutButton.disabled=!cart.length;
  if(!cartItemsEl)return;
  if(!cart.length){
    cartItemsEl.innerHTML='<p class="cart-empty">Your cart is empty.</p>';
    return;
  }
  cartItemsEl.innerHTML='';
  cart.forEach(item=>{
    const row=document.createElement('div');
    row.className='cart-line';
    row.innerHTML=`<div><strong></strong><span></span></div><div class="qty-control"><button type="button" data-delta="-1">−</button><b></b><button type="button" data-delta="1">+</button></div>`;
    row.querySelector('strong').textContent=item.name;
    row.querySelector('span').textContent=money(item.price_cents);
    row.querySelector('b').textContent=item.quantity;
    row.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>changeQty(item.sku,Number(btn.dataset.delta))));
    cartItemsEl.appendChild(row);
  });
}
function applyCatalog(){
  const liveByName=new Map(catalog.filter(p=>p.active).map(p=>[p.name,p]));
  productCards.forEach(card=>{
    const title=card.querySelector('h3')?.textContent?.trim();
    const copy=card.querySelector('.product-copy');
    if(!title||!copy||copy.querySelector('.product-actions'))return;
    const product=liveByName.get(title);
    const wrap=document.createElement('div');
    wrap.className='product-actions';
    if(product){
      const price=document.createElement('strong');
      price.className='product-price';
      price.textContent=money(product.price_cents);
      const add=document.createElement('button');
      add.type='button';
      add.className='btn primary add-cart';
      add.textContent='Add to cart';
      add.addEventListener('click',()=>addToCart(product));
      wrap.append(price,add);
    }else{
      const pending=document.createElement('span');
      pending.className='release-pending';
      pending.textContent='Release pending';
      wrap.appendChild(pending);
    }
    copy.appendChild(wrap);
  });
}
async function loadCatalog(){
  try{
    const res=await fetch('/catalog.json',{cache:'no-store'});
    if(!res.ok)throw new Error('catalog unavailable');
    const data=await res.json();
    catalog=Array.isArray(data.products)?data.products:[];
  }catch{
    catalog=[];
  }
  applyCatalog();
}

cartButton?.addEventListener('click',openCart);
cartClose?.addEventListener('click',closeCart);
cartBackdrop?.addEventListener('click',closeCart);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});

checkoutButton?.addEventListener('click',async()=>{
  if(!cart.length)return;
  checkoutButton.disabled=true;
  if(cartMessage) cartMessage.textContent='Opening secure checkout…';
  try{
    const res=await fetch('/api/checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items:cart.map(i=>({sku:i.sku,quantity:i.quantity}))})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Checkout could not be started.');
    if(!data.url)throw new Error('Checkout link was not returned.');
    window.location.href=data.url;
  }catch(err){
    if(cartMessage) cartMessage.textContent=err.message||'Checkout could not be started.';
    checkoutButton.disabled=false;
  }
});

renderCart();
loadCatalog();
