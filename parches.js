/* ===========================================================================
   NEXU PRO - PARCHES MÓVIL WEB v3.3 ESTABLE
   Reemplazo completo de parches.js
   =========================================================================== */
(function(){
"use strict";
const PATCH_ID="nexu-pro-mobile-v3-3-estable";
const MOBILE_MAX=768;
if(window[PATCH_ID])return;
window[PATCH_ID]=true;

const isMobile=()=>window.innerWidth<=MOBILE_MAX;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const norm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();

function visible(el){
  if(!el)return false;
  const st=getComputedStyle(el), r=el.getBoundingClientRect();
  return st.display!=="none" && st.visibility!=="hidden" && r.width>0 && r.height>0;
}
function own(el){
  return !!(el.closest(".mobile-bottom-nav-nexu")||el.closest(".mobile-more-sheet-nexu")||el.closest(".mobile-view-nexu"));
}
function isSidebar(el){
  if(!el)return false;
  const c=norm(el.className||""), id=norm(el.id||""), t=norm(el.innerText||el.textContent||"");
  return c.includes("sidebar")||c.includes("side-menu")||c.includes("drawer")||c.includes("menu-lateral")||c.includes("offcanvas")||id.includes("sidebar")||id.includes("drawer")||(t.includes("nexus pro")&&t.includes("facturas")&&t.includes("clientes")&&t.includes("configuracion"));
}
function fire(el){
  if(!el)return false;
  try{
    el.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true,view:window}));
    el.dispatchEvent(new MouseEvent("mouseup",{bubbles:true,cancelable:true,view:window}));
    el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
    if(typeof el.click==="function")el.click();
    return true;
  }catch(e){try{el.click();return true;}catch(_){return false;}}
}
function findText(labels){
  const wanted=labels.map(norm);
  const sel="button,a,[role='button'],[onclick],.nav-item,.sidebar-item,.menu-item,.tab,[data-section],[data-page],[data-view],[data-target],li";
  const els=qa(sel).filter(el=>visible(el)&&!own(el));
  let found=els.find(el=>{
    const t=norm(el.innerText||el.textContent||el.getAttribute("aria-label")||el.title||"");
    return wanted.some(w=>t===w);
  });
  if(!found)found=els.find(el=>{
    const t=norm(el.innerText||el.textContent||el.getAttribute("aria-label")||el.title||"");
    return wanted.some(w=>t.includes(w));
  });
  return found||null;
}
function callGlobal(section){
  const fns=["showSection","mostrarSeccion","openSection","navigateTo","goTo","irA","showPage","openPage","switchSection","cambiarSeccion","loadSection"];
  const aliases={
    dashboard:["dashboard","inicio","principal","home"],
    clientes:["clientes","clients"],
    facturas:["facturas","facturacion","invoices"],
    cobros:["cobros","pagos","payments"],
    sistema:["sistema","configuracion","ajustes","settings"],
    usuarios:["usuarios","users"],
    reportes:["reportes","reports"],
    clientesProceso:["clientes-proceso","clientes_en_proceso","clientesProceso","proceso","en-proceso"],
    historialPagos:["historial-pagos","historialPagos","pagos","cobros"]
  };
  for(const fn of fns){
    if(typeof window[fn]==="function"){
      for(const arg of aliases[section]||[section]){
        try{window[fn](arg);return true;}catch(e){}
      }
    }
  }
  return false;
}
function closeMore(){const s=q(".mobile-more-sheet-nexu"); if(s)s.classList.remove("open");}
function navigate(section){
  const labels={
    dashboard:["Dashboard","Inicio","Principal"],
    clientes:["Clientes"],
    facturas:["Facturas","Facturación"],
    cobros:["Cobros","Pagos"],
    sistema:["Sistema","Configuración","Ajustes"],
    usuarios:["Usuarios"],
    reportes:["Reportes"],
    clientesProceso:["Clientes en proceso","En proceso","Proceso"],
    historialPagos:["Historial de pagos","Pagos","Cobros"]
  };
  closeMore();
  if(fire(findText(labels[section]||[section])))return true;
  if(callGlobal(section))return true;
  try{
    const hash={dashboard:"dashboard",clientes:"clientes",facturas:"facturas",cobros:"cobros",sistema:"configuracion",usuarios:"usuarios",reportes:"reportes",clientesProceso:"clientes-proceso",historialPagos:"historial-pagos"}[section]||section;
    location.hash=hash; window.dispatchEvent(new HashChangeEvent("hashchange")); return true;
  }catch(e){return false;}
}

function css(){
  if(q("#nexu-mobile-v33-css"))return;
  const st=document.createElement("style");
  st.id="nexu-mobile-v33-css";
  st.textContent=`
  @media(max-width:${MOBILE_MAX}px){
    html,body{max-width:100%;overflow-x:hidden!important;background:#f6f8fc!important;-webkit-tap-highlight-color:transparent}
    body{padding-bottom:105px!important}
    .app,.main,main,.content,.page,.section,.container,.dashboard,[class*="content"],[class*="dashboard"],[class*="section"]{max-width:100%!important;width:100%!important;box-sizing:border-box!important}
    .card,.panel,.box,.widget,.module,.stat-card,[class*="card"],[class*="panel"],[class*="widget"]{border-radius:22px!important;box-shadow:0 10px 28px rgba(15,23,42,.08)!important;border:1px solid rgba(148,163,184,.22)!important;box-sizing:border-box!important;max-width:100%!important}
    table{min-width:720px}
    .table-wrap,.table-container,.responsive-table,[class*="table"],[class*="grid"]{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
    .mobile-bottom-nav-v3,.mobile-more-sheet-v3,.mobile-bottom-nav-v31,.mobile-more-sheet-v31{display:none!important;pointer-events:none!important}
    .mobile-bottom-nav-nexu{position:fixed!important;left:12px!important;right:12px!important;bottom:12px!important;z-index:2000000!important;height:72px!important;display:grid!important;grid-template-columns:repeat(5,1fr)!important;align-items:center!important;gap:4px!important;padding:8px!important;background:rgba(255,255,255,.98)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;border:1px solid rgba(226,232,240,.95)!important;border-radius:28px!important;box-shadow:0 18px 45px rgba(15,23,42,.18)!important;pointer-events:auto!important}
    .mobile-bottom-nav-nexu.nexu-hidden-for-layer{display:none!important;pointer-events:none!important}
    .mobile-bottom-nav-nexu button{border:0!important;background:transparent!important;color:#64748b!important;font-size:11px!important;font-weight:800!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-height:54px!important;border-radius:18px!important;cursor:pointer!important;touch-action:manipulation!important}
    .mobile-bottom-nav-nexu button.active{background:#eff6ff!important;color:#2563eb!important}
    .mobile-bottom-nav-nexu .ico{font-size:21px!important;line-height:1!important}
    .mobile-more-sheet-nexu{position:fixed!important;left:12px!important;right:12px!important;bottom:92px!important;z-index:2200000!important;background:rgba(255,255,255,.99)!important;border:1px solid #e5e7eb!important;border-radius:26px!important;box-shadow:0 24px 60px rgba(15,23,42,.22)!important;padding:14px!important;display:none!important;pointer-events:auto!important}
    .mobile-more-sheet-nexu.open{display:block!important}
    .mobile-more-sheet-nexu h3{margin:4px 6px 12px!important;font-size:14px!important;color:#64748b!important;text-transform:uppercase!important;letter-spacing:.04em!important}
    .mobile-more-sheet-nexu button{width:100%!important;border:0!important;background:#fff!important;border-bottom:1px solid #eef2f7!important;display:flex!important;align-items:center!important;gap:12px!important;padding:14px 10px!important;font-size:15px!important;font-weight:800!important;color:#0f172a!important;cursor:pointer!important;text-align:left!important;touch-action:manipulation!important}
    .mobile-more-sheet-nexu button:last-child{border-bottom:0!important}
    .mobile-more-sheet-nexu .more-icon{width:38px!important;height:38px!important;border-radius:14px!important;display:grid!important;place-items:center!important;background:#eff6ff!important;color:#2563eb!important;font-size:20px!important;flex:0 0 auto!important}
    .mobile-view-nexu{position:fixed;inset:0;z-index:2100000;background:#f8fafc;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:env(safe-area-inset-top) 16px 110px;box-sizing:border-box}
    .mobile-view-nexu-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 0;background:rgba(248,250,252,.96);backdrop-filter:blur(12px)}
    .mobile-view-nexu-header button{width:40px;height:40px;border-radius:14px;border:1px solid #e2e8f0;background:#fff;font-size:22px;cursor:pointer}
    .mobile-view-nexu-title{font-size:18px;font-weight:900;color:#0f172a}
    .nexu-action-panel-fixed{z-index:2147483600!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;filter:none!important;backdrop-filter:none!important}
    .nexu-action-panel-fixed *{pointer-events:auto!important;touch-action:manipulation!important}
    .nexu-overlay-clean{pointer-events:none!important}
  }`;
  document.head.appendChild(st);
}
function removeOld(){qa(".mobile-bottom-nav-v3,.mobile-more-sheet-v3,.mobile-bottom-nav-v31,.mobile-more-sheet-v31").forEach(el=>{el.classList.remove("open");el.style.display="none";el.style.pointerEvents="none";el.setAttribute("aria-hidden","true");});}

function buildMore(){
  let sheet=q(".mobile-more-sheet-nexu"); if(sheet)return sheet;
  sheet=document.createElement("div"); sheet.className="mobile-more-sheet-nexu";
  sheet.innerHTML=`
    <h3>Más opciones</h3>
    <button type="button" data-go="dashboard"><span class="more-icon">🏠</span><span><b>Principal</b><br><small>Panel principal del sistema</small></span></button>
    <button type="button" data-go="sistema"><span class="more-icon">⚙️</span><span><b>Sistema</b><br><small>Configuración y ajustes del sistema</small></span></button>
    <button type="button" data-go="clientesProceso"><span class="more-icon">🟢</span><span><b>Clientes en proceso</b><br><small>Clientes pendientes de afiliación o revisión</small></span></button>
    <button type="button" data-go="usuarios"><span class="more-icon">👥</span><span><b>Usuarios</b><br><small>Gestionar usuarios del sistema</small></span></button>
    <button type="button" data-go="reportes"><span class="more-icon">📊</span><span><b>Reportes</b><br><small>Ver reportes y estadísticas</small></span></button>`;
  document.body.appendChild(sheet);
  const h=ev=>{const btn=ev.target.closest("button[data-go]"); if(!btn)return; ev.preventDefault(); ev.stopPropagation(); sheet.classList.remove("open"); navigate(btn.dataset.go); state();};
  sheet.addEventListener("click",h,true);
  sheet.addEventListener("touchend",h,{passive:false,capture:true});
  return sheet;
}
function buildNav(){
  if(!isMobile())return;
  removeOld();
  let nav=q(".mobile-bottom-nav-nexu");
  if(!nav){
    nav=document.createElement("nav"); nav.className="mobile-bottom-nav-nexu";
    nav.innerHTML=`
      <button type="button" class="active" data-nav="dashboard"><span class="ico">🏠</span><span>Dashboard</span></button>
      <button type="button" data-nav="clientes"><span class="ico">👥</span><span>Clientes</span></button>
      <button type="button" data-nav="facturas"><span class="ico">📄</span><span>Facturas</span></button>
      <button type="button" data-nav="cobros"><span class="ico">💵</span><span>Cobros</span></button>
      <button type="button" data-nav="mas"><span class="ico">•••</span><span>Más</span></button>`;
    document.body.appendChild(nav);
  }
  if(nav.dataset.boundNexu==="1")return;
  nav.dataset.boundNexu="1";
  const h=ev=>{
    const btn=ev.target.closest("button[data-nav]"); if(!btn)return;
    ev.preventDefault(); ev.stopPropagation();
    qa(".mobile-bottom-nav-nexu button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const target=btn.dataset.nav;
    if(target==="mas"){const s=buildMore(); s.classList.toggle("open"); state(); return;}
    closeMore(); navigate(target); state();
  };
  nav.addEventListener("click",h,true);
  nav.addEventListener("touchend",h,{passive:false,capture:true});
}
function readArr(keys){
  for(const k of keys){try{const v=JSON.parse(localStorage.getItem(k)||"[]"); if(Array.isArray(v)&&v.length)return v;}catch(e){}}
  for(const k of keys){if(Array.isArray(window[k]))return window[k];}
  return [];
}
function money(v){const n=Number(String(v||0).replace(/[^\d.-]/g,"")); return "RD$ "+(isNaN(n)?0:n).toLocaleString("es-DO");}
function clientName(c){return c.nombre_completo||c.nombreCompleto||c.name||[c.nombre,c.apellido].filter(Boolean).join(" ")||"Cliente";}
function clientPhone(c){return c.whatsapp||c.telefono||c.phone||c.celular||"";}
function clientStatus(c){const r=norm(c.estado||c.status||c.estatus); if(r.includes("moroso"))return"moroso"; if(r.includes("pend"))return"pendiente"; if(r.includes("inactivo"))return"inactivo"; return"activo";}
function closeView(){const v=q(".mobile-view-nexu"); if(v)v.remove(); state();}
function showClientes(){
  if(!isMobile())return navigate("clientes");
  closeView();
  const clientes=readArr(["clientes","clients","nexu_clientes","nexuProClientes","CLIENTES"]);
  const count=s=>clientes.filter(c=>clientStatus(c)===s).length||0;
  const nuevos=clientes.filter(c=>String(c.created_at||c.fechaCreacion||c.fecha||"").slice(0,7)===new Date().toISOString().slice(0,7)).length||0;
  const view=document.createElement("div"); view.className="mobile-view-nexu";
  view.innerHTML=`
    <div class="mobile-view-nexu-header"><button type="button" data-back>‹</button><div class="mobile-view-nexu-title">Clientes resumido</div><button type="button">☰</button></div>
    <div style="display:grid;grid-template-columns:repeat(5,minmax(76px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px;">
      <div style="background:#fff;border-radius:20px;padding:12px;text-align:center"><div>👥</div><small>Activos</small><b style="display:block">${count("activo")}</b></div>
      <div style="background:#fff;border-radius:20px;padding:12px;text-align:center"><div>📄</div><small>Nuevos</small><b style="display:block">${nuevos}</b></div>
      <div style="background:#fff;border-radius:20px;padding:12px;text-align:center"><div>⚠️</div><small>Morosos</small><b style="display:block">${count("moroso")}</b></div>
      <div style="background:#fff;border-radius:20px;padding:12px;text-align:center"><div>⏱️</div><small>Pendientes</small><b style="display:block">${count("pendiente")}</b></div>
      <div style="background:#fff;border-radius:20px;padding:12px;text-align:center"><div>👤</div><small>Inactivos</small><b style="display:block">${count("inactivo")}</b></div>
    </div>
    <input type="search" placeholder="Buscar cliente..." style="width:100%;height:48px;border-radius:18px;border:1px solid #e2e8f0;padding:0 14px;margin:14px 0;font-size:15px;background:#fff;">
    <h3 style="font-size:16px;margin:12px 2px;color:#0f172a;">Últimos clientes</h3>
    <div style="background:#fff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden">${clientes.slice(0,20).map(c=>`<div style="display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid #eef2f7"><b style="flex:1">${clientName(c)}<br><small style="color:#64748b">${clientPhone(c)||"Sin teléfono"}</small></b><span>${clientStatus(c)}</span></div>`).join("")||'<div style="padding:22px;text-align:center;color:#64748b;font-weight:700">No hay clientes para mostrar.</div>'}</div>
    <button type="button" data-open-all style="width:100%;margin-top:14px;height:50px;border-radius:18px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;font-weight:900;">Ver todos los clientes (${clientes.length})</button>`;
  document.body.appendChild(view);
  q("[data-back]",view).addEventListener("click",closeView);
  q("[data-open-all]",view).addEventListener("click",()=>{closeView();navigate("clientes");});
  state();
}
function showPagos(){
  if(!isMobile())return navigate("historialPagos");
  closeView();
  const pagos=readArr(["pagos","payments","historialPagos","nexu_pagos","cobros"]).slice(-30).reverse();
  const view=document.createElement("div"); view.className="mobile-view-nexu";
  view.innerHTML=`
    <div class="mobile-view-nexu-header"><button type="button" data-back>‹</button><div class="mobile-view-nexu-title">Historial de pagos</div><button type="button">⌕</button></div>
    <input type="search" placeholder="Buscar pagos..." style="width:100%;height:48px;border-radius:18px;border:1px solid #e2e8f0;padding:0 14px;margin:14px 0;font-size:15px;background:#fff;">
    <div>${pagos.length?pagos.map(p=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:14px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-weight:900"><span>${p.cliente||p.nombre||p.cliente_nombre||"Cliente"}</span><span>${money(p.monto||p.total||p.valor||0)}</span></div><div style="color:#64748b;font-size:12px;margin-top:5px">${String(p.fecha||p.created_at||"").slice(0,10)}</div></div>`).join(""):'<div style="padding:22px;background:#fff;border-radius:20px;text-align:center;color:#64748b;font-weight:700">No hay pagos guardados para mostrar aquí.</div>'}</div>
    <button type="button" data-open-real style="width:100%;margin-top:14px;height:50px;border-radius:18px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;font-weight:900;">Abrir historial completo</button>`;
  document.body.appendChild(view);
  q("[data-back]",view).addEventListener("click",closeView);
  q("[data-open-real]",view).addEventListener("click",()=>{closeView();navigate("historialPagos");});
  state();
}
function bindCards(){
  if(!isMobile())return;
  qa("button,a,.card,.stat-card,.dashboard-card,[class*='card'],[role='button']").forEach(el=>{
    if(own(el)||el.dataset.nexuCardBound==="1")return;
    const t=norm(el.innerText||el.textContent||"");
    if(t.includes("cobrado")){
      el.dataset.nexuCardBound="1"; el.style.cursor="pointer";
      el.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();showPagos();},true);
    }else if(t.includes("pendiente")&&!t.includes("historial")){
      el.dataset.nexuCardBound="1"; el.style.cursor="pointer";
      el.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();navigate("cobros");},true);
    }else if(t.includes("clientes")&&(t.includes("resumido")||t.includes("activos")||/^\s*clientes/i.test(el.innerText||""))){
      el.dataset.nexuCardBound="1"; el.style.cursor="pointer";
      el.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();showClientes();},true);
    }
  });
}
function restoreDashboard(){
  if(!isMobile())return;
  qa(".sidebar,.side-menu,aside,.drawer,.menu-lateral,nav").filter(visible).forEach(root=>{
    if(root.classList.contains("mobile-bottom-nav-nexu"))return;
    qa("a,button,[role='button'],.nav-item,.sidebar-item,li,div,span",root).forEach(el=>{
      if(own(el))return;
      const attrs=[el.getAttribute("data-section"),el.getAttribute("data-page"),el.getAttribute("data-view"),el.getAttribute("href"),el.getAttribute("onclick"),el.getAttribute("aria-label")].map(norm).join(" ");
      const t=norm(el.innerText||el.textContent||"");
      if(attrs.includes("dashboard")&&!t.includes("dashboard")){
        if((el.innerText||"").trim().length===0){const sp=document.createElement("span"); sp.textContent="Dashboard"; sp.style.marginLeft="8px"; sp.style.fontWeight="800"; el.appendChild(sp);}
        else if(t==="inicio"||t==="principal")el.innerText="Dashboard";
      }
    });
  });
}
function isActionPanel(el){
  if(!visible(el)||own(el)||isSidebar(el))return false;
  const t=norm(el.innerText||el.textContent||""), c=norm(el.className||"");
  const words=t.includes("cobros guardados")||t.includes("certificado pdf")||t.includes("documentos")||t.includes("enviar coberturas whatsapp")||t.includes("inhabilitar cliente");
  const classes=c.includes("acciones")||c.includes("action-menu")||c.includes("client-actions")||c.includes("dropdown-menu")||c.includes("acc-menu");
  return words||classes;
}
function isRealModal(el){
  if(!visible(el)||own(el)||isSidebar(el))return false;
  const t=norm(el.innerText||el.textContent||""), c=norm(el.className||"");
  return c.includes("modal")||c.includes("dialog")||c.includes("popup")||t.includes("total de cobros")||t.includes("este cliente no tiene cobros registrados");
}
function layers(){return Array.from(new Set([...qa("div,section,article,aside,dialog").filter(isActionPanel),...qa("div,section,article,aside,dialog").filter(isRealModal)]));}
function fixActions(){
  if(!isMobile())return;
  qa("div,section,article,aside").filter(isActionPanel).forEach(panel=>{
    panel.classList.add("nexu-action-panel-fixed");
    panel.style.zIndex="2147483600"; panel.style.opacity="1"; panel.style.visibility="visible"; panel.style.pointerEvents="auto"; panel.style.filter="none";
    panel.querySelectorAll("button,a,[role='button'],[onclick]").forEach(btn=>{
      btn.style.pointerEvents="auto"; btn.style.touchAction="manipulation";
      if(btn.dataset.nexuActionCloseBound==="1")return;
      btn.dataset.nexuActionCloseBound="1";
      btn.addEventListener("click",()=>{setTimeout(()=>{if(panel&&panel.parentNode){panel.style.display="none";panel.style.visibility="hidden";} cleanup(); state();},180);},true);
    });
  });
}
function cleanup(){
  if(!isMobile())return;
  qa("[class*='overlay'],[class*='backdrop'],.modal-backdrop,.acc-backdrop").forEach(el=>{
    if(own(el)||isSidebar(el))return;
    const t=norm(el.innerText||"");
    if(!t||t.length<20){el.classList.add("nexu-overlay-clean"); el.style.pointerEvents="none";}
  });
}
function state(){
  if(!isMobile())return;
  fixActions(); cleanup();
  const nav=q(".mobile-bottom-nav-nexu"), ls=layers();
  if(nav){ if(ls.length)nav.classList.add("nexu-hidden-for-layer"); else nav.classList.remove("nexu-hidden-for-layer");}
  ls.forEach(el=>{el.style.zIndex="2147483000"; el.style.pointerEvents="auto";});
}
function suppressLogin(){
  try{
    const original=window.alert;
    window.alert=function(msg){
      const txt=norm(msg);
      const nav=performance&&performance.getEntriesByType?performance.getEntriesByType("navigation")[0]:null;
      const reloaded=nav&&nav.type==="reload";
      if(reloaded&&txt.includes("inicio")&&txt.includes("sesion"))return;
      return original.apply(window,arguments);
    };
  }catch(e){}
}
function changelog(){
  try{
    const key="nexu_patch_changelog";
    const list=JSON.parse(localStorage.getItem(key)||"[]");
    if(list.some(x=>x.id===PATCH_ID))return;
    list.unshift({id:PATCH_ID,version:"v3.3 estable",fecha:new Date().toISOString(),titulo:"Parche móvil estable v3.3",cambios:["Sidebar no se detecta como modal.","Menú de acciones claro y ejecutable.","Menú de acciones se cierra al ejecutar.","Overlay gris limpiado.","Barra inferior no bloquea modales."]});
    localStorage.setItem(key,JSON.stringify(list));
  }catch(e){}
}
function init(){
  css(); suppressLogin();
  if(!isMobile())return;
  removeOld(); buildNav(); buildMore(); restoreDashboard(); bindCards(); state(); changelog();
}
document.addEventListener("DOMContentLoaded",init);
window.addEventListener("resize",init);
document.addEventListener("click",()=>setTimeout(()=>{init();state();},120),true);
document.addEventListener("touchstart",()=>setTimeout(state,40),true);
document.addEventListener("touchend",()=>setTimeout(()=>{init();state();},120),true);
let tries=0;
const timer=setInterval(()=>{tries++;init();state();if(tries>80)clearInterval(timer);},500);
})();
