const loginSection=document.getElementById("login");
const dashboard=document.getElementById("dashboard");
const loginForm=document.getElementById("login-form");
const loginMessage=document.getElementById("login-message");
const dashboardMessage=document.getElementById("dashboard-message");
const ordersEl=document.getElementById("orders");
const refreshBtn=document.getElementById("refresh");
const logoutBtn=document.getElementById("logout");

const STATUSES=[
  ["paid","Paid"],
  ["in_production","In Production"],
  ["ready_to_ship","Ready to Ship"],
  ["shipped","Shipped"],
  ["delivered","Delivered"]
];

function esc(value){
  return String(value==null?"":value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function money(cents,currency){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:(currency||"usd").toUpperCase()}).format((cents||0)/100);
}
function dateTime(unix){
  if(!unix)return "";
  return new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(unix*1000));
}
function showLogin(message){
  loginSection.hidden=false;
  dashboard.hidden=true;
  logoutBtn.hidden=true;
  if(message)loginMessage.textContent=message;
}
function showDashboard(){
  loginSection.hidden=true;
  dashboard.hidden=false;
  logoutBtn.hidden=false;
  loginMessage.textContent="";
}
function addressText(shipping){
  const a=shipping&&shipping.address;
  if(!a)return "No shipping address returned.";
  return [shipping.name,a.line1,a.line2,a.city&&a.state?a.city+", "+a.state:a.city,a.postal_code].filter(Boolean).map(esc).join("<br>");
}
function renderOrders(orders){
  ordersEl.innerHTML="";
  if(!orders.length){
    ordersEl.innerHTML='<div class="empty">No paid website orders yet.</div>';
    return;
  }

  orders.forEach(order=>{
    const card=document.createElement("article");
    card.className="order-card";
    const options=STATUSES.map(function(s){
      return '<option value="'+s[0]+'"'+(s[0]===order.status?' selected':'')+'>'+s[1]+'</option>';
    }).join("");
    const itemList=(order.items||[]).map(function(item){
      return "<li>"+esc(item.name)+" × "+Number(item.quantity||1)+"</li>";
    }).join("")||"<li>No line items returned.</li>";

    card.innerHTML=
      '<div class="order-top">'+
        '<div><div class="order-number">'+esc(order.order_number)+'</div><div class="order-meta">'+esc(dateTime(order.created))+' • '+esc(order.customer&&order.customer.email)+'</div></div>'+
        '<div class="amount">'+esc(money(order.amount_total,order.currency))+'</div>'+
      '</div>'+
      '<div class="order-grid">'+
        '<div class="customer"><div class="block-title">Customer & shipping</div><strong>'+esc(order.customer&&order.customer.name||"Customer")+'</strong><br>'+esc(order.customer&&order.customer.email)+'<br>'+addressText(order.shipping)+'</div>'+
        '<div class="items"><div class="block-title">Items</div><ul>'+itemList+'</ul></div>'+
        '<div><div class="block-title">Fulfillment</div><div class="status-grid">'+
          '<label>Status<select class="status">'+options+'</select></label>'+
          '<label>Carrier<select class="carrier"><option value="">Select carrier</option><option value="USPS">USPS</option><option value="UPS">UPS</option><option value="FedEx">FedEx</option><option value="Other">Other</option></select></label>'+
          '<label class="wide">Tracking number<input class="tracking" type="text" autocomplete="off" placeholder="Enter tracking number"></label>'+
        '</div><div class="save-row"><button class="btn primary save" type="button">Save status</button><span class="save-note"></span></div></div>'+
      '</div>';

    const carrier=card.querySelector(".carrier");
    const tracking=card.querySelector(".tracking");
    const status=card.querySelector(".status");
    const note=card.querySelector(".save-note");
    const save=card.querySelector(".save");

    if(order.carrier){
      const found=[...carrier.options].some(function(o){return o.value===order.carrier;});
      carrier.value=found?order.carrier:"Other";
    }
    tracking.value=order.tracking_number||"";

    save.addEventListener("click",async function(){
      save.disabled=true;
      note.className="save-note";
      note.textContent="Saving…";
      try{
        const res=await fetch("/api/order-status",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            id:order.id,
            status:status.value,
            carrier:carrier.value,
            tracking_number:tracking.value.trim()
          })
        });
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Could not update order.");
        note.className="save-note ok";
        if(status.value==="shipped"){
          note.textContent=data.email&&data.email.sent?"Saved • shipping email sent":"Saved • email service not configured";
        }else{
          note.textContent="Saved";
        }
      }catch(err){
        note.className="save-note error";
        note.textContent=err.message||"Could not update order.";
      }finally{
        save.disabled=false;
      }
    });

    ordersEl.appendChild(card);
  });
}

async function loadOrders(){
  dashboardMessage.textContent="Loading orders…";
  try{
    const res=await fetch("/api/orders",{cache:"no-store"});
    const data=await res.json();
    if(res.status===401){
      showLogin("");
      dashboardMessage.textContent="";
      return;
    }
    if(!res.ok)throw new Error(data.error||"Orders could not be loaded.");
    showDashboard();
    renderOrders(data.orders||[]);
    dashboardMessage.textContent="";
  }catch(err){
    dashboardMessage.textContent=err.message||"Orders could not be loaded.";
  }
}

loginForm.addEventListener("submit",async function(e){
  e.preventDefault();
  loginMessage.textContent="Signing in…";
  const password=document.getElementById("password").value;
  try{
    const res=await fetch("/api/admin-login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({password:password})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Could not sign in.");
    document.getElementById("password").value="";
    await loadOrders();
  }catch(err){
    loginMessage.textContent=err.message||"Could not sign in.";
  }
});

refreshBtn.addEventListener("click",loadOrders);
logoutBtn.addEventListener("click",async function(){
  await fetch("/api/admin-logout",{method:"POST"}).catch(function(){});
  showLogin("");
});
loadOrders();
