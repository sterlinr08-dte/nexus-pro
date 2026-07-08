/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PRO — POS MULTIEMPRESA 2.5
   Parche seguro: agrega una interfaz de Punto de Venta sin romper
   Facturas, Cobros ni Historial de pagos existentes.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nxPosMultiEmpresa25)return;
  window.__nxPosMultiEmpresa25=true;

  const money=n=>'RD$ '+Math.round(Number(n)||0).toLocaleString('es-DO');
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=> 'pos_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  const DEFAULT_PRODUCTS=[
    {id:'p-iphone',cat:'Celulares',icon:'📱',nom:'iPhone 13 128GB',sku:'IP13-128',precio:28500,stock:6},
    {id:'p-android',cat:'Celulares',icon:'📱',nom:'Samsung A15 128GB',sku:'A15-128',precio:11900,stock:12},
    {id:'p-cover',cat:'Accesorios',icon:'🛡️',nom:'Cover transparente',sku:'COV-TR',precio:350,stock:80},
    {id:'p-glass',cat:'Accesorios',icon:'🧩',nom:'Cristal templado',sku:'GLASS',precio:250,stock:120},
    {id:'p-cargador',cat:'Accesorios',icon:'🔌',nom:'Cargador USB-C 20W',sku:'CH-20W',precio:850,stock:35},
    {id:'p-bateria',cat:'Baterías',icon:'🔋',nom:'Batería iPhone',sku:'BAT-IP',precio:1800,stock:10},
    {id:'p-tv',cat:'TV',icon:'📺',nom:'TV Vizzion 50”',sku:'TV-50',precio:19990,stock:4},
    {id:'p-serv',cat:'Servicios',icon:'🛠️',nom:'Cambio de cristal',sku:'SERV-GLASS',precio:1500,stock:999},
    {id:'p-rep',cat:'Repuestos',icon:'🔧',nom:'Pantalla genérica',sku:'LCD-GEN',precio:2200,stock:18}
  ];
  const POS={cart:[],cat:'Todos',q:'',clienteId:'',pago:'Efectivo',descuento:0,recibido:0,nota:''};

  function getProducts(){
    try{
      const saved=JSON.parse(localStorage.getItem('nx_pos_products_v25')||'null');
      return Array.isArray(saved)&&saved.length?saved:DEFAULT_PRODUCTS;
    }catch{return DEFAULT_PRODUCTS;}
  }
  function getClientes(){return Array.isArray(window.ST?.clientes)?window.ST.clientes:[];}
  function getCliente(){return getClientes().find(c=>String(c.id)===String(POS.clienteId))||null;}
  function subtotal(){return POS.cart.reduce((s,it)=>s+(Number(it.precio)||0)*(Number(it.qty)||0),0);}
  function total(){return Math.max(0,subtotal()-Number(POS.descuento||0));}
  function persistVentas(v){const arr=JSON.parse(localStorage.getItem('nx_pos_ventas_v25')||'[]');arr.unshift(v);localStorage.setItem('nx_pos_ventas_v25',JSON.stringify(arr.slice(0,300)));}

  function injectCss(){
    if(document.getElementById('nx-pos25-css'))return;
    const st=document.createElement('style');st.id='nx-pos25-css';
    st.textContent=`
      .nxpos-shell{display:grid;grid-template-columns:220px minmax(340px,1fr) 390px;gap:12px;height:calc(100vh - 154px);min-height:660px}
      .nxpos-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.06);overflow:hidden}
      .nxpos-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;margin-bottom:12px;background:linear-gradient(135deg,#0f1f3d,#1e3a6e 52%,#6d28d9);border-radius:18px;color:#fff;box-shadow:0 12px 32px rgba(15,31,61,.22)}
      .nxpos-top-title{font-size:16px;font-weight:900;letter-spacing:.2px}.nxpos-top-sub{font-size:10px;opacity:.85;margin-top:2px}.nxpos-pill{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;white-space:nowrap}
      .nxpos-search{display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;flex:1;max-width:740px}.nxpos-search input,.nxpos-search select,.nxpos-pay input,.nxpos-pay select,.nxpos-note{width:100%;height:38px;border:1.5px solid #dbe3ef;border-radius:12px;background:#fff;padding:0 12px;font-size:12px;outline:none}.nxpos-search input:focus,.nxpos-search select:focus,.nxpos-pay input:focus,.nxpos-pay select:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.10)}
      .nxpos-cats{padding:10px;display:flex;flex-direction:column;gap:8px}.nxpos-cat{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:11px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:800;color:#334155;transition:.16s}.nxpos-cat:hover{background:#eef2ff;border-color:#c7d2fe}.nxpos-cat.on{background:#ede9fe;border-color:#8b5cf6;color:#5b21b6}.nxpos-cat small{margin-left:auto;color:#64748b;font-weight:800}
      .nxpos-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px;padding:12px;overflow:auto;max-height:calc(100% - 0px)}.nxpos-prod{border:1px solid #e2e8f0;background:linear-gradient(180deg,#fff,#f8fafc);border-radius:16px;padding:12px;cursor:pointer;min-height:142px;display:flex;flex-direction:column;gap:7px;transition:.16s}.nxpos-prod:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(15,23,42,.10);border-color:#c4b5fd}.nxpos-prod-ico{width:38px;height:38px;border-radius:13px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:20px}.nxpos-prod-name{font-size:12px;font-weight:900;color:#0f172a;line-height:1.25}.nxpos-prod-meta{font-size:9px;color:#64748b;font-weight:800;text-transform:uppercase}.nxpos-prod-price{font-size:14px;font-weight:950;color:#6d28d9;margin-top:auto}.nxpos-stock{font-size:9px;font-weight:900;border-radius:999px;padding:3px 7px;width:max-content}.nxpos-stock.ok{background:#dcfce7;color:#166534}.nxpos-stock.low{background:#fef3c7;color:#92400e}.nxpos-stock.none{background:#fee2e2;color:#991b1b}
      .nxpos-right{display:flex;flex-direction:column;height:100%}.nxpos-client{padding:13px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.nxpos-client-name{font-size:13px;font-weight:950;color:#0f172a}.nxpos-client-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.nxpos-mini{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px}.nxpos-mini span{display:block;font-size:8px;color:#64748b;text-transform:uppercase;font-weight:900}.nxpos-mini b{font-size:12px;color:#0f172a}.nxpos-cart{flex:1;overflow:auto;padding:10px}.nxpos-line{display:grid;grid-template-columns:1fr 70px 82px 30px;gap:6px;align-items:center;padding:9px;border:1px solid #e2e8f0;border-radius:13px;margin-bottom:8px;background:#fff}.nxpos-line-title{font-size:11px;font-weight:900;color:#0f172a}.nxpos-line-sub{font-size:9px;color:#64748b}.nxpos-qty{display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}.nxpos-qty button{width:23px;height:28px;border:0;background:#f1f5f9;font-weight:900;cursor:pointer}.nxpos-qty input{width:24px;height:28px;border:0;text-align:center;font-size:11px;font-weight:900}.nxpos-line-total{text-align:right;font-size:11px;font-weight:950;color:#6d28d9}.nxpos-del{width:28px;height:28px;border:0;border-radius:9px;background:#fee2e2;color:#dc2626;cursor:pointer;font-weight:900}.nxpos-pay{border-top:1px solid #e2e8f0;padding:12px;background:#f8fafc}.nxpos-totals{display:grid;gap:5px;margin-bottom:10px}.nxpos-trow{display:flex;justify-content:space-between;font-size:11px;color:#475569;font-weight:800}.nxpos-grand{display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;border-radius:14px;padding:12px;margin:8px 0}.nxpos-grand span{font-size:10px;text-transform:uppercase;opacity:.8;font-weight:900}.nxpos-grand b{font-size:22px;font-weight:950}.nxpos-methods{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.nxpos-method{border:1px solid #e2e8f0;background:#fff;border-radius:12px;height:40px;font-size:10px;font-weight:900;cursor:pointer}.nxpos-method.on{background:#ede9fe;border-color:#8b5cf6;color:#5b21b6}.nxpos-actions{display:grid;grid-template-columns:1fr 1.2fr 1.25fr;gap:7px;margin-top:8px}.nxpos-actions2{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:7px}.nxpos-btn{height:42px;border:0;border-radius:13px;color:#fff;font-size:11px;font-weight:950;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}.nxpos-save{background:#059669}.nxpos-print{background:#2563eb}.nxpos-wa{background:#16a34a}.nxpos-new{background:#f59e0b}.nxpos-hold{background:#7c3aed}.nxpos-cancel{background:#dc2626}.nxpos-empty{text-align:center;color:#64748b;font-size:12px;padding:36px 14px}.nxpos-empty i{font-size:34px;color:#cbd5e1;display:block;margin-bottom:8px}
      @media(max-width:1100px){.nxpos-shell{grid-template-columns:160px 1fr;height:auto;min-height:0}.nxpos-right{grid-column:1/-1;min-height:620px}.nxpos-search{grid-template-columns:1fr}.nxpos-top{align-items:flex-start;flex-direction:column}.nxpos-pill{display:none}}
      @media(max-width:720px){.nxpos-shell{grid-template-columns:1fr}.nxpos-cats{flex-direction:row;overflow:auto}.nxpos-cat{min-width:128px}.nxpos-products{grid-template-columns:repeat(2,minmax(0,1fr));max-height:none}.nxpos-line{grid-template-columns:1fr 72px 80px 30px}.nxpos-methods{grid-template-columns:repeat(2,1fr)}.nxpos-actions,.nxpos-actions2{grid-template-columns:1fr}.nxpos-top-title{font-size:14px}}
    `;
    document.head.appendChild(st);
  }

  function ensurePosTab(){
    const tabs=document.querySelector('#v-facturas .nxft-tabs');
    if(!tabs||document.getElementById('tabPos25'))return;
    const btn=document.createElement('button');
    btn.id='tabPos25';btn.className='nxft-tab';
    btn.innerHTML='<i class="ti ti-cash-register"></i> POS 2.5';
    btn.onclick=function(){switchTabPos25();};
    tabs.insertBefore(btn,tabs.firstChild);
    const v=document.getElementById('v-facturas');
    const panel=document.createElement('div');panel.id='panelPos25';panel.style.display='none';
    panel.innerHTML='<div class="loading"><div class="spin"></div> Cargando POS...</div>';
    v.appendChild(panel);
  }

  function setActiveTab(id){
    document.querySelectorAll('#v-facturas .nxft-tab').forEach(b=>b.classList.remove('is-active'));
    const b=document.getElementById(id);if(b)b.classList.add('is-active');
  }

  window.switchTabPos25=function(){
    ensurePosTab();
    ['panelFact','panelCob','panelPagos','panelPend'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    const p=document.getElementById('panelPos25');if(p)p.style.display='block';
    setActiveTab('tabPos25');
    renderPos();
  };

  const oldSwitch=window.switchTab;
  if(typeof oldSwitch==='function'){
    window.switchTab=function(t){
      const p=document.getElementById('panelPos25');if(p)p.style.display='none';
      if(t==='pos25')return window.switchTabPos25();
      return oldSwitch.apply(this,arguments);
    };
  }

  const oldNav=window.nav;
  if(typeof oldNav==='function'){
    window.nav=function(v,el){
      const r=oldNav.apply(this,arguments);
      if(v==='facturas')setTimeout(()=>{ensurePosTab();},80);
      return r;
    };
  }

  function renderPos(){
    injectCss();ensurePosTab();
    const panel=document.getElementById('panelPos25');if(!panel)return;
    const clientes=getClientes();
    const cats=['Todos',...new Set(getProducts().map(p=>p.cat||'Otros'))];
    const c=getCliente();
    const st=subtotal(),tt=total(),cambio=Math.max(0,Number(POS.recibido||0)-tt);
    panel.innerHTML=`
      <div class="nxpos-top">
        <div><div class="nxpos-top-title">Punto de Venta Multiempresa 2.5</div><div class="nxpos-top-sub">${safe(window.CFG?.empNom||'Empresa activa')} · ${safe(window.sesion?.nom||window.sesion?.login||'Usuario')}</div></div>
        <div class="nxpos-search">
          <input id="posQ" value="${safe(POS.q)}" placeholder="Buscar producto, SKU o escanear código..." oninput="nxPos25Set('q',this.value)" />
          <select id="posCli" onchange="nxPos25Set('clienteId',this.value)"><option value="">Cliente contado / consumidor final</option>${clientes.map(x=>`<option value="${safe(x.id)}" ${String(POS.clienteId)===String(x.id)?'selected':''}>${safe(x.nom||x.nombre||'Cliente')}</option>`).join('')}</select>
          <button class="nxpos-btn nxpos-print" onclick="document.getElementById('posQ')?.focus()"><i class="ti ti-barcode"></i> Escanear</button>
        </div>
        <div class="nxpos-pill">Caja: Abierta</div><div class="nxpos-pill">Sucursal: Principal</div>
      </div>
      <div class="nxpos-shell">
        <aside class="nxpos-card"><div class="nxpos-cats">${cats.map(cat=>`<button class="nxpos-cat ${POS.cat===cat?'on':''}" onclick="nxPos25Set('cat','${safe(cat)}')"><span>${cat==='Todos'?'⭐':'📦'}</span>${safe(cat)} <small>${cat==='Todos'?getProducts().length:getProducts().filter(p=>p.cat===cat).length}</small></button>`).join('')}</div></aside>
        <main class="nxpos-card"><div class="nxpos-products">${productsHtml()}</div></main>
        <section class="nxpos-card nxpos-right">
          <div class="nxpos-client">
            <div class="nxpos-client-name">${c?safe(c.nom||c.nombre):'Consumidor final'}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px">${c?safe(c.wa||c.tel||c.telefono||'Sin teléfono'):'Venta rápida sin cliente registrado'}</div>
            <div class="nxpos-client-grid">
              <div class="nxpos-mini"><span>Balance</span><b>${money(window.pendTot?window.pendTot(c||{}):0)}</b></div>
              <div class="nxpos-mini"><span>Crédito</span><b>${c?'Activo':'Contado'}</b></div>
              <div class="nxpos-mini"><span>Artículos</span><b>${POS.cart.reduce((s,i)=>s+Number(i.qty||0),0)}</b></div>
              <div class="nxpos-mini"><span>Método</span><b>${safe(POS.pago)}</b></div>
            </div>
          </div>
          <div class="nxpos-cart">${cartHtml()}</div>
          <div class="nxpos-pay">
            <div class="nxpos-totals">
              <div class="nxpos-trow"><span>Subtotal</span><b>${money(st)}</b></div>
              <div class="nxpos-trow"><span>Descuento</span><b>${money(POS.descuento)}</b></div>
            </div>
            <div class="nxpos-grand"><span>Total</span><b>${money(tt)}</b></div>
            <div class="nxpos-methods">${['Efectivo','Transferencia','Tarjeta','Crédito'].map(m=>`<button class="nxpos-method ${POS.pago===m?'on':''}" onclick="nxPos25Set('pago','${m}')">${m}</button>`).join('')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
              <input type="number" min="0" value="${Number(POS.descuento)||''}" placeholder="Descuento RD$" oninput="nxPos25Set('descuento',this.value)" />
              <input type="number" min="0" value="${Number(POS.recibido)||''}" placeholder="Recibido RD$" oninput="nxPos25Set('recibido',this.value)" />
            </div>
            <div class="nxpos-trow" style="margin:8px 2px 0"><span>Cambio</span><b style="color:#059669">${money(cambio)}</b></div>
            <input class="nxpos-note" style="margin-top:8px" value="${safe(POS.nota)}" placeholder="Nota de factura / observación" oninput="nxPos25Set('nota',this.value)" />
            <div class="nxpos-actions"><button class="nxpos-btn nxpos-save" onclick="nxPos25Save('save')"><i class="ti ti-device-floppy"></i> Guardar</button><button class="nxpos-btn nxpos-print" onclick="nxPos25Save('print')"><i class="ti ti-printer"></i> Guardar e imprimir</button><button class="nxpos-btn nxpos-wa" onclick="nxPos25Save('wa')"><i class="ti ti-brand-whatsapp"></i> Guardar y WhatsApp</button></div>
            <div class="nxpos-actions2"><button class="nxpos-btn nxpos-new" onclick="nxPos25Reset()"><i class="ti ti-file-plus"></i> Nueva</button><button class="nxpos-btn nxpos-hold" onclick="nxPos25Hold()"><i class="ti ti-clock-pause"></i> Suspender</button><button class="nxpos-btn nxpos-cancel" onclick="nxPos25Cancel()"><i class="ti ti-trash"></i> Cancelar</button></div>
          </div>
        </section>
      </div>`;
  }

  function productsHtml(){
    let rows=getProducts().filter(p=>POS.cat==='Todos'||p.cat===POS.cat);
    const q=(POS.q||'').toLowerCase().trim();
    if(q)rows=rows.filter(p=>String(p.nom+' '+p.sku+' '+p.cat).toLowerCase().includes(q));
    if(!rows.length)return '<div class="nxpos-empty"><i class="ti ti-package-off"></i>No hay productos para mostrar</div>';
    return rows.map(p=>{const stock=Number(p.stock)||0,cls=stock<=0?'none':stock<=5?'low':'ok';return `<div class="nxpos-prod" onclick="nxPos25Add('${safe(p.id)}')"><div style="display:flex;justify-content:space-between;gap:8px"><div class="nxpos-prod-ico">${safe(p.icon||'📦')}</div><span class="nxpos-stock ${cls}">${stock<=0?'Sin existencia':stock<=5?'Pocas unidades':'Disponible'}</span></div><div class="nxpos-prod-name">${safe(p.nom)}</div><div class="nxpos-prod-meta">${safe(p.sku)} · ${safe(p.cat)}</div><div class="nxpos-prod-price">${money(p.precio)}</div></div>`}).join('');
  }
  function cartHtml(){
    if(!POS.cart.length)return '<div class="nxpos-empty"><i class="ti ti-shopping-cart"></i>Agrega productos para iniciar la venta</div>';
    return POS.cart.map(it=>`<div class="nxpos-line"><div><div class="nxpos-line-title">${safe(it.nom)}</div><div class="nxpos-line-sub">${safe(it.sku)} · ${money(it.precio)}</div></div><div class="nxpos-qty"><button onclick="nxPos25Qty('${safe(it.id)}',-1)">−</button><input value="${it.qty}" onchange="nxPos25SetQty('${safe(it.id)}',this.value)"><button onclick="nxPos25Qty('${safe(it.id)}',1)">+</button></div><div class="nxpos-line-total">${money(it.precio*it.qty)}</div><button class="nxpos-del" onclick="nxPos25Del('${safe(it.id)}')">×</button></div>`).join('');
  }

  window.nxPos25Set=function(k,v){POS[k]=['descuento','recibido'].includes(k)?Number(v)||0:v;renderPos();};
  window.nxPos25Add=function(id){const p=getProducts().find(x=>String(x.id)===String(id));if(!p)return;const ex=POS.cart.find(x=>x.id===p.id);if(ex)ex.qty++;else POS.cart.push({...p,qty:1});renderPos();};
  window.nxPos25Qty=function(id,d){const it=POS.cart.find(x=>String(x.id)===String(id));if(!it)return;it.qty=Math.max(1,Number(it.qty||1)+d);renderPos();};
  window.nxPos25SetQty=function(id,v){const it=POS.cart.find(x=>String(x.id)===String(id));if(!it)return;it.qty=Math.max(1,Number(v)||1);renderPos();};
  window.nxPos25Del=function(id){POS.cart=POS.cart.filter(x=>String(x.id)!==String(id));renderPos();};
  window.nxPos25Reset=function(){POS.cart=[];POS.descuento=0;POS.recibido=0;POS.nota='';POS.q='';renderPos();};
  window.nxPos25Cancel=function(){if(confirm('¿Cancelar esta venta?'))window.nxPos25Reset();};
  window.nxPos25Hold=function(){localStorage.setItem('nx_pos_hold_v25',JSON.stringify({...POS,ts:new Date().toISOString()}));if(window.toast)toast('ok','Venta suspendida','Puedes recuperarla luego');else alert('Venta suspendida');};
  window.nxPos25Save=function(mode){
    if(!POS.cart.length){if(window.toast)toast('warn','Carrito vacío','Agrega productos antes de guardar');else alert('Carrito vacío');return;}
    const c=getCliente();
    const venta={id:uid(),fecha:new Date().toISOString(),empresa:window.CFG?.empNom||'',usuario:window.sesion?.login||'',cliente_id:c?.id||null,cliente:c?.nom||'Consumidor final',items:POS.cart.map(x=>({...x})),subtotal:subtotal(),descuento:Number(POS.descuento)||0,total:total(),metodo:POS.pago,recibido:Number(POS.recibido)||0,cambio:Math.max(0,Number(POS.recibido||0)-total()),nota:POS.nota||''};
    persistVentas(venta);
    if(window.logAudit)try{logAudit('POS_VENTA',`Venta POS 2.5 · ${venta.cliente} · ${money(venta.total)}`,'POS');}catch(e){}
    if(window.toast)toast('ok','Venta guardada',`${venta.cliente} · ${money(venta.total)}`);else alert('Venta guardada');
    if(mode==='print')printReceipt(venta);
    if(mode==='wa')sendWA(venta,c);
    window.nxPos25Reset();
  };
  function printReceipt(v){
    const w=window.open('','_blank','width=420,height=720');if(!w)return;
    w.document.write(`<html><head><title>Ticket ${v.id}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:14px;color:#111}.c{text-align:center}.line{border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0}.r{text-align:right}.total{font-size:18px;font-weight:800}</style></head><body><div class="c"><h3>${safe(v.empresa||'NEXUS PRO')}</h3><div>POS Multiempresa 2.5</div><div>${new Date(v.fecha).toLocaleString('es-DO')}</div></div><div class="line"></div><b>Cliente:</b> ${safe(v.cliente)}<br><b>Método:</b> ${safe(v.metodo)}<div class="line"></div><table>${v.items.map(i=>`<tr><td>${safe(i.nom)} x${i.qty}</td><td class="r">${money(i.precio*i.qty)}</td></tr>`).join('')}</table><div class="line"></div><table><tr><td>Subtotal</td><td class="r">${money(v.subtotal)}</td></tr><tr><td>Descuento</td><td class="r">${money(v.descuento)}</td></tr><tr><td class="total">TOTAL</td><td class="r total">${money(v.total)}</td></tr></table><div class="line"></div><div class="c">Gracias por su compra</div><script>window.print()<\/script></body></html>`);
    w.document.close();
  }
  function sendWA(v,c){
    const tel=String(c?.wa||c?.tel||c?.telefono||'').replace(/\D/g,'');
    const msg=`${v.empresa||'NEXUS PRO'}%0ARecibo POS%0ACliente: ${v.cliente}%0ATotal: ${money(v.total)}%0AMétodo: ${v.metodo}`;
    if(tel)window.open(`https://wa.me/${tel}?text=${msg}`,'_blank');
    else if(window.toast)toast('warn','Cliente sin WhatsApp','La venta fue guardada, pero no hay número para enviar');
  }

  function boot(){injectCss();ensurePosTab();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setTimeout(boot,500);
})();
