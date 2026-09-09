/* NEXUS PRO · WhatsApp · Plantillas fáciles Meta/Zernio · 2026-09-08
   UX guiada: el usuario escribe un mensaje normal; NEXUS lo transforma al formato de Meta,
   genera ejemplos y permite someterlo. Fuera de 24h ofrece solo plantillas APPROVED reales. */
(function(){
  'use strict';
  if(window.__nxWaPlantillasFacil20260908)return;
  window.__nxWaPlantillasFacil20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const toastSafe=(t,a,b)=>{try{if(typeof window.toast==='function')window.toast(t,a,b||'')}catch(e){}};
  let cachePlantillas=null,cacheAt=0;
  let draft=null;

  function css(){
    if($('#nxWaTplFacilCss'))return;
    const s=document.createElement('style');s.id='nxWaTplFacilCss';s.textContent=`
#v-waInbox .nxWaTplClosed{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
#v-waInbox .nxWaTplBtn{border:0;border-radius:999px;padding:8px 12px;font:800 10px/1 'Plus Jakarta Sans',system-ui;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#2563eb,#5b7cfa);color:#fff;box-shadow:0 10px 24px -18px rgba(37,99,235,.85)}
#v-waInbox .nxWaTplBtn.alt{background:rgba(255,255,255,.88);color:#334155;border:1px solid rgba(148,163,184,.25);box-shadow:none}
.nxWaTplOverlay{position:fixed;inset:0;z-index:2147482500;background:rgba(15,23,42,.34);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;animation:nxWaTplFade .18s ease both}
.nxWaTplBox{width:min(680px,100%);max-height:min(84vh,760px);overflow:auto;border-radius:28px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.9);box-shadow:0 30px 80px -35px rgba(15,23,42,.55);font-family:'Plus Jakarta Sans',system-ui;color:#0f172a;animation:nxWaTplUp .22s cubic-bezier(.2,.8,.2,1) both}
.nxWaTplHead{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 17px 13px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border-bottom:1px solid rgba(226,232,240,.8);border-radius:28px 28px 0 0}
.nxWaTplHead h3{margin:0;font-size:16px;font-weight:900}.nxWaTplHead p{margin:3px 0 0;color:#64748b;font-size:10px}.nxWaTplX{width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:18px;cursor:pointer}
.nxWaTplBody{padding:15px 17px 18px}.nxWaTplLabel{display:block;font-size:10px;font-weight:850;color:#334155;margin:0 0 6px}.nxWaTplText,.nxWaTplInput,.nxWaTplSelect{width:100%;box-sizing:border-box;border:1px solid #dbe4f0;border-radius:16px;background:#fff;color:#0f172a;padding:11px 12px;font:600 12px/1.45 'Plus Jakarta Sans',system-ui;outline:none}.nxWaTplText{min-height:118px;resize:vertical}.nxWaTplText:focus,.nxWaTplInput:focus,.nxWaTplSelect:focus{border-color:#93b4ff;box-shadow:0 0 0 4px rgba(37,99,235,.08)}
.nxWaTplHint{font-size:9.5px;color:#64748b;line-height:1.45;margin:6px 1px 0}.nxWaTplActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}.nxWaTplAction{border:0;border-radius:999px;padding:10px 14px;font:850 10.5px/1 'Plus Jakarta Sans',system-ui;cursor:pointer}.nxWaTplAction.primary{background:linear-gradient(135deg,#2563eb,#6b7cff);color:#fff}.nxWaTplAction.ghost{background:#f1f5f9;color:#334155}.nxWaTplAction:disabled{opacity:.5;cursor:not-allowed}
.nxWaTplPrep{margin-top:14px;border:1px solid rgba(191,219,254,.9);background:linear-gradient(135deg,#f8fbff,#f5f3ff);border-radius:20px;padding:13px}.nxWaTplPrep h4{margin:0 0 9px;font-size:11.5px}.nxWaTplGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nxWaTplPreview{margin-top:10px;padding:12px;border-radius:16px;background:#fff;border:1px solid rgba(226,232,240,.9);font-size:11px;line-height:1.55;white-space:pre-wrap}.nxWaTplVar{display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center;margin-top:7px}.nxWaTplVar b{font-size:9.5px;color:#475569}.nxWaTplStatus{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:8.5px;font-weight:900}.nxWaTplStatus.APPROVED{background:#dcfce7;color:#15803d}.nxWaTplStatus.PENDING{background:#fef3c7;color:#92400e}.nxWaTplStatus.REJECTED{background:#fee2e2;color:#b91c1c}.nxWaTplCards{display:grid;gap:9px}.nxWaTplCard{border:1px solid rgba(226,232,240,.9);border-radius:18px;padding:12px;background:#fff}.nxWaTplCardTop{display:flex;justify-content:space-between;gap:9px;align-items:flex-start}.nxWaTplCard b{font-size:11px}.nxWaTplCard small{font-size:9px;color:#64748b}.nxWaTplCard p{margin:8px 0 0;font-size:10.5px;line-height:1.45;color:#334155;white-space:pre-wrap}.nxWaTplTabs{display:flex;gap:6px;overflow:auto;margin-bottom:11px}.nxWaTplTab{border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:850;white-space:nowrap;cursor:pointer}.nxWaTplTab.on{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.nxWaTplEmpty{padding:22px;text-align:center;color:#64748b;font-size:10.5px}.nxWaTplSendPreview{padding:12px;border-radius:17px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);font-size:11px;line-height:1.55;white-space:pre-wrap;margin-bottom:11px}
@keyframes nxWaTplFade{from{opacity:0}to{opacity:1}}@keyframes nxWaTplUp{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
@media(max-width:640px){.nxWaTplOverlay{align-items:flex-end;padding:8px}.nxWaTplBox{width:100%;max-height:88vh;border-radius:28px 28px 20px 20px}.nxWaTplHead{border-radius:28px 28px 0 0}.nxWaTplGrid{grid-template-columns:1fr}.nxWaTplActions .nxWaTplAction{flex:1}.nxWaTplBody{padding:14px}.nxWaTplVar{grid-template-columns:62px 1fr}}
@media(prefers-reduced-motion:reduce){.nxWaTplOverlay,.nxWaTplBox{animation:none!important}}
`;(document.head||document.documentElement).appendChild(s);
  }

  function close(){const x=$('#nxWaTplOverlay');if(x)x.remove();}
  function overlay(title,sub,body){
    close();css();
    const o=document.createElement('div');o.id='nxWaTplOverlay';o.className='nxWaTplOverlay';
    o.innerHTML=`<div class="nxWaTplBox" role="dialog" aria-modal="true"><div class="nxWaTplHead"><div><h3>${esc(title)}</h3><p>${esc(sub||'')}</p></div><button class="nxWaTplX" aria-label="Cerrar">×</button></div><div class="nxWaTplBody">${body}</div></div>`;
    o.addEventListener('click',e=>{if(e.target===o)close()});
    $('.nxWaTplX',o).addEventListener('click',close);
    (document.body||document.documentElement).appendChild(o);return o;
  }
  window.nxWaPlantillasCerrar=close;

  async function edge(body){
    const A=api();if(!A)throw new Error('Sin conexión con NEXUS PRO');
    const r=await fetch(`${A.url}/functions/v1/whatsapp-plantillas-gestionar`,{method:'POST',headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok){const det=d?.detalle?.error||d?.detalle?.message||d?.error||'No se pudo completar';throw new Error(String(det))}
    return d;
  }
  async function crearEdge(body){
    const A=api();if(!A)throw new Error('Sin conexión con NEXUS PRO');
    const r=await fetch(`${A.url}/functions/v1/whatsapp-plantilla-crear`,{method:'POST',headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(String(d?.data?.error?.message||d?.data?.error||d?.error||'Meta/Zernio rechazó la solicitud'));
    return d;
  }
  function hiloActualId(){
    const row=$('#v-waInbox .nxWaRow.on');if(!row)return null;
    const oc=row.getAttribute('onclick')||'';const m=oc.match(/nxWaAbrirHilo\(['"]([^'"]+)/);return m?m[1]:null;
  }
  async function hiloActual(){
    const id=hiloActualId();if(!id)return null;const A=api();if(!A?.get)return {id};
    try{const r=await A.get('whatsapp_hilos',`select=id,cliente_id,telefono_e164,nombre_perfil,ultimo_inbound_at&id=eq.${encodeURIComponent(id)}&limit=1`);return r?.[0]||{id}}catch(e){return {id}}
  }
  function clientePorId(id){try{return ((window.ST||{}).clientes||[]).find(c=>String(c.id)===String(id))||null}catch(e){return null}}
  function bodyText(t){
    const cs=Array.isArray(t?.components)?t.components:[];const b=cs.find(x=>String(x?.type||'').toUpperCase()==='BODY');return String(b?.text||'');
  }
  function varCount(text){const a=[...String(text||'').matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1])||0);return a.length?Math.max(...a):0}
  function renderWith(text,vals){return String(text||'').replace(/\{\{(\d+)\}\}/g,(m,n)=>vals[Number(n)-1]||`[Dato ${n}]`)}
  function slug(s){
    let x=String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    if(!/^[a-z]/.test(x))x='mensaje_'+x;return x.slice(0,45)||'mensaje_cliente';
  }
  function suggestCategory(t){const x=String(t||'').toLowerCase();return /(oferta|promoci[oó]n|descuento|aprovecha|especial|nuevo plan|conoce|te ofrecemos|beneficio exclusivo)/.test(x)?'MARKETING':'UTILITY'}
  function autoName(t){
    const stop=new Set(['hola','buenos','buenas','estimado','estimada','cliente','usted','tienes','tiene','para','por','con','que','del','las','los','una','unos','unas']);
    const words=String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[];
    const core=words.filter(w=>w.length>2&&!stop.has(w)).slice(0,4).join('_')||'mensaje_cliente';
    const d=new Date(),s=String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0');
    return slug('nexus_'+core+'_'+s);
  }
  function transformarNatural(src){
    let text=String(src||'').trim();const vals=[];
    function add(v){vals.push(String(v).trim());return `{{${vals.length}}}`}
    // Nombre tras saludo: "Hola Juan Pérez," -> "Hola {{1}},"
    text=text.replace(/^(\s*(?:hola|saludos|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|estimad[oa])\s+)([^,\n.!]{2,60})([,!.])/i,(m,a,v,p)=>a+add(v)+p);
    // Montos RD$: conserva la moneda como texto fijo y hace variable solo el importe.
    text=text.replace(/(RD\s*\$\s*)([0-9][0-9.,]*)/gi,(m,a,v)=>a+add(v));
    // Fechas numéricas completas.
    text=text.replace(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/g,(m,v)=>add(v));
    // Mes + año, común en pagos/pólizas.
    text=text.replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(\s+de)?\s+(20\d{2})\b/gi,m=>add(m));
    // Números de póliza/factura/solicitud/referencia.
    text=text.replace(/((?:p[oó]liza|factura|solicitud|referencia|caso)\s+(?:n(?:ú|u)m(?:ero)?\.?\s*)?)([A-Z0-9-]{4,})\b/gi,(m,a,v)=>a+add(v));
    return {text,values:vals,category:suggestCategory(src),name:autoName(src)};
  }

  window.nxWaAbrirNuevaPlantilla=function(){
    const o=overlay('Crear plantilla','Escribe el mensaje normal. NEXUS PRO prepara el formato que Meta exige.',`
      <label class="nxWaTplLabel">¿Qué quieres decirle al cliente?</label>
      <textarea id="nxWaTplNatural" class="nxWaTplText" placeholder="Ejemplo: Hola Juan Pérez, tienes un balance pendiente de RD$ 4,500.00 correspondiente a septiembre 2026."></textarea>
      <div class="nxWaTplHint">No necesitas escribir {{1}} ni entender variables. Después podrás revisar todo antes de enviarlo a Meta.</div>
      <div class="nxWaTplActions"><button id="nxWaTplPreparar" class="nxWaTplAction primary"><i class="ti ti-wand"></i> Preparar para Meta</button></div>
      <div id="nxWaTplPreparado"></div>`);
    $('#nxWaTplPreparar',o).addEventListener('click',()=>prepararCrear(o));
    setTimeout(()=>$('#nxWaTplNatural',o)?.focus(),120);
  };

  function prepararCrear(o){
    const src=($('#nxWaTplNatural',o)?.value||'').trim();if(!src){toastSafe('warn','Falta el mensaje','Escribe primero lo que quieres comunicar.');return}
    draft=transformarNatural(src);
    const vars=draft.values.map((v,i)=>`<div class="nxWaTplVar"><b>Dato ${i+1}</b><input class="nxWaTplInput nxWaTplExample" data-i="${i}" value="${esc(v)}"></div>`).join('');
    $('#nxWaTplPreparado',o).innerHTML=`<div class="nxWaTplPrep"><h4>NEXUS PRO lo preparó así</h4>
      <div class="nxWaTplGrid"><div><label class="nxWaTplLabel">Nombre automático</label><input id="nxWaTplAutoName" class="nxWaTplInput" value="${esc(draft.name)}"></div><div><label class="nxWaTplLabel">Categoría sugerida</label><select id="nxWaTplAutoCat" class="nxWaTplSelect"><option value="UTILITY" ${draft.category==='UTILITY'?'selected':''}>Utilidad · pagos, póliza, servicio</option><option value="MARKETING" ${draft.category==='MARKETING'?'selected':''}>Marketing · ofertas/promoción</option></select></div></div>
      <label class="nxWaTplLabel" style="margin-top:10px">Vista previa para Meta</label><div class="nxWaTplPreview" id="nxWaTplMetaPreview">${esc(draft.text)}</div>
      ${vars?`<div style="margin-top:9px"><label class="nxWaTplLabel">Ejemplos detectados</label>${vars}<div class="nxWaTplHint">Estos ejemplos son solo para que Meta entienda qué representa cada dato. No se envían como una campaña.</div></div>`:'<div class="nxWaTplHint">Este mensaje no necesita datos variables.</div>'}
      <div id="nxWaTplCrearResultado" class="nxWaTplHint" style="margin-top:10px"></div>
      <div class="nxWaTplActions"><button class="nxWaTplAction ghost" id="nxWaTplVolverEditar">Editar mensaje</button><button class="nxWaTplAction primary" id="nxWaTplEnviarRevision">Enviar a revisión de Meta</button></div></div>`;
    $('#nxWaTplVolverEditar',o)?.addEventListener('click',()=>{$('#nxWaTplNatural',o)?.focus();$('#nxWaTplPreparado',o).innerHTML=''});
    $('#nxWaTplEnviarRevision',o)?.addEventListener('click',()=>someterFacil(o));
  }
  async function someterFacil(o){
    if(!draft)return;const btn=$('#nxWaTplEnviarRevision',o),res=$('#nxWaTplCrearResultado',o);if(btn)btn.disabled=true;
    const name=slug($('#nxWaTplAutoName',o)?.value||draft.name),category=$('#nxWaTplAutoCat',o)?.value||draft.category;
    const examples=[...o.querySelectorAll('.nxWaTplExample')].map(x=>x.value.trim());
    if(examples.some(x=>!x)){if(res)res.innerHTML='<span style="color:#b91c1c">Completa todos los ejemplos detectados.</span>';if(btn)btn.disabled=false;return}
    const comp={type:'body',text:draft.text};if(examples.length)comp.example={body_text:[examples]};
    if(res)res.textContent='Enviando a revisión…';
    try{
      await crearEdge({name,category,language:'es',components:[comp]});cachePlantillas=null;cacheAt=0;
      if(res)res.innerHTML='<span style="color:#15803d;font-weight:800">✓ Meta recibió la plantilla. Queda en revisión; NEXUS PRO no la usará hasta que aparezca como APROBADA.</span>';
      toastSafe('ok','Plantilla enviada','Quedó en revisión de Meta.');
      if(btn){btn.textContent='En revisión';btn.disabled=true}
    }catch(e){if(res)res.innerHTML='<span style="color:#b91c1c">'+esc(e.message)+'</span>';if(btn)btn.disabled=false}
  }
  // Compatibilidad: cualquier botón viejo "Someter a Meta" usa ahora la experiencia fácil.
  window.nxWaSometerPlantilla=window.nxWaSometerPlantilla||function(){};

  async function listar(force){
    if(!force&&cachePlantillas&&Date.now()-cacheAt<45000)return cachePlantillas;
    const d=await edge({accion:'listar'});cachePlantillas=Array.isArray(d.templates)?d.templates:[];cacheAt=Date.now();return cachePlantillas;
  }
  window.nxWaAbrirPlantillas=async function(opts){
    const filtro=opts?.estado||'TODAS';const o=overlay('Plantillas de WhatsApp','Estado real leído desde Meta a través de Zernio.',`<div class="nxWaTplTabs"><button class="nxWaTplTab ${filtro==='TODAS'?'on':''}" data-st="TODAS">Todas</button><button class="nxWaTplTab ${filtro==='APPROVED'?'on':''}" data-st="APPROVED">Aprobadas</button><button class="nxWaTplTab ${filtro==='PENDING'?'on':''}" data-st="PENDING">En revisión</button><button class="nxWaTplTab ${filtro==='REJECTED'?'on':''}" data-st="REJECTED">Rechazadas</button></div><div id="nxWaTplCards" class="nxWaTplCards"><div class="nxWaTplEmpty">Cargando plantillas…</div></div><div class="nxWaTplActions"><button class="nxWaTplAction ghost" id="nxWaTplRefresh">Actualizar</button>${((window.sesion||{}).rol==='admin')?'<button class="nxWaTplAction primary" id="nxWaTplNueva">Nueva plantilla</button>':''}</div>`);
    o.querySelectorAll('.nxWaTplTab').forEach(b=>b.addEventListener('click',()=>window.nxWaAbrirPlantillas({estado:b.dataset.st})));
    $('#nxWaTplNueva',o)?.addEventListener('click',window.nxWaAbrirNuevaPlantilla);$('#nxWaTplRefresh',o)?.addEventListener('click',()=>renderLista(o,filtro,true));
    renderLista(o,filtro,false);
  };
  async function renderLista(o,filtro,force){
    const c=$('#nxWaTplCards',o);if(!c)return;c.innerHTML='<div class="nxWaTplEmpty">Cargando plantillas…</div>';
    try{
      let arr=await listar(force);if(filtro!=='TODAS')arr=arr.filter(t=>String(t.status||'').toUpperCase()===filtro);
      if(!arr.length){c.innerHTML='<div class="nxWaTplEmpty">No hay plantillas en este estado.</div>';return}
      c.innerHTML=arr.map((t,i)=>{const st=String(t.status||'').toUpperCase(),tx=bodyText(t);return `<div class="nxWaTplCard"><div class="nxWaTplCardTop"><div><b>${esc(t.name||'Plantilla')}</b><br><small>${esc(t.language||'')} · ${esc(t.category||'')}</small></div><span class="nxWaTplStatus ${esc(st)}">${st==='APPROVED'?'APROBADA':st==='PENDING'?'EN REVISIÓN':st==='REJECTED'?'RECHAZADA':esc(st)}</span></div><p>${esc(tx||'Sin texto de cuerpo')}</p>${st==='APPROVED'&&hiloActualId()?`<div class="nxWaTplActions"><button class="nxWaTplAction primary" data-use="${i}">Usar en este chat</button></div>`:''}</div>`}).join('');
      c.querySelectorAll('[data-use]').forEach(b=>b.addEventListener('click',()=>{const idx=Number(b.dataset.use);const visibles=arr;abrirEnviar(visibles[idx])}));
    }catch(e){c.innerHTML='<div class="nxWaTplEmpty" style="color:#b91c1c">'+esc(e.message)+'</div>'}
  }
  async function abrirEnviar(t){
    if(!t)return;const text=bodyText(t),n=varCount(text);const h=await hiloActual();const cli=clientePorId(h?.cliente_id);const name=cli?.nom||h?.nombre_perfil||'';
    const vals=Array(n).fill('');if(n&&/^\s*(hola|saludos|estimad)/i.test(text))vals[0]=name;
    const vars=vals.map((v,i)=>`<div class="nxWaTplVar"><b>Dato ${i+1}</b><input class="nxWaTplInput nxWaTplSendVar" data-i="${i}" value="${esc(v)}" placeholder="Valor para {{${i+1}}}"></div>`).join('');
    const o=overlay('Enviar plantilla',`${t.name} · ${t.language||'es'}`,`<div id="nxWaTplSendPreview" class="nxWaTplSendPreview">${esc(renderWith(text,vals))}</div>${vars||'<div class="nxWaTplHint">Esta plantilla no necesita datos variables.</div>'}<div id="nxWaTplSendResult" class="nxWaTplHint" style="margin-top:10px"></div><div class="nxWaTplActions"><button class="nxWaTplAction ghost" onclick="nxWaPlantillasCerrar()">Cancelar</button><button id="nxWaTplSendGo" class="nxWaTplAction primary">Enviar plantilla</button></div>`);
    function upd(){const now=[...o.querySelectorAll('.nxWaTplSendVar')].map(x=>x.value);$('#nxWaTplSendPreview',o).textContent=renderWith(text,now)}
    o.querySelectorAll('.nxWaTplSendVar').forEach(x=>x.addEventListener('input',upd));
    $('#nxWaTplSendGo',o).addEventListener('click',()=>enviarTpl(o,t));
  }
  async function enviarTpl(o,t){
    const id=hiloActualId(),btn=$('#nxWaTplSendGo',o),res=$('#nxWaTplSendResult',o);if(!id){if(res)res.textContent='No hay una conversación seleccionada.';return}
    const vals=[...o.querySelectorAll('.nxWaTplSendVar')].map(x=>x.value.trim());if(vals.some(v=>!v)){if(res)res.innerHTML='<span style="color:#b91c1c">Completa todos los datos.</span>';return}
    if(btn){btn.disabled=true;btn.textContent='Enviando…'}
    try{
      await edge({accion:'enviar',hilo_id:id,template_name:t.name,template_language:t.language||'es',template_params:vals});
      toastSafe('ok','Plantilla enviada','Cuando el cliente responda se abrirá nuevamente la ventana de 24 horas.');
      if(res)res.innerHTML='<span style="color:#15803d;font-weight:800">✓ Enviada correctamente.</span>';
      setTimeout(()=>{close();try{if(typeof window.nxWaAbrirHilo==='function')window.nxWaAbrirHilo(id)}catch(e){}},650);
    }catch(e){if(res)res.innerHTML='<span style="color:#b91c1c">'+esc(e.message)+'</span>';if(btn){btn.disabled=false;btn.textContent='Enviar plantilla'}}
  }

  function enhanceClosed(){
    document.querySelectorAll('#v-waInbox .nxWaCerrada').forEach(box=>{
      if(box.dataset.nxTplEasy)return;box.dataset.nxTplEasy='1';
      const d=document.createElement('div');d.className='nxWaTplClosed';d.innerHTML=`<button class="nxWaTplBtn"><i class="ti ti-template"></i> Usar plantilla aprobada</button>${((window.sesion||{}).rol==='admin')?'<button class="nxWaTplBtn alt"><i class="ti ti-file-plus"></i> Crear plantilla</button>':''}`;
      d.children[0].addEventListener('click',()=>window.nxWaAbrirPlantillas({estado:'APPROVED'}));if(d.children[1])d.children[1].addEventListener('click',window.nxWaAbrirNuevaPlantilla);box.appendChild(d);
      // Corrige el texto heredado: fuera de 24h sí se puede contactar, pero mediante plantilla.
      const node=[...box.childNodes].find(n=>n.nodeType===3&&/24h|24 h|24 horas/i.test(n.textContent||''));
      if(node)node.textContent=' Pasaron más de 24 horas desde el último mensaje. Para volver a contactar, usa una plantilla aprobada por Meta. ';
    });
  }
  css();enhanceClosed();let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceClosed()})}).observe(document.documentElement,{childList:true,subtree:true});
})();
