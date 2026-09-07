/* NEXUS PRO · Inbox de WhatsApp (fase 2) — chat de dos vías + revisión de bauches.
   Mismo patrón de parches-crm-entrada.js (nav + vista nueva sin tocar index.html). */
(function () {
  'use strict';
  if (window.__nxWaInbox20260906) return;
  window.__nxWaInbox20260906 = true;

  const $ = s => document.querySelector(s);
  const esc = v => { try { return escHtml(String(v ?? '')); } catch (e) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); } };
  const getAPI = () => { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } };
  const clientes = () => { try { return (window.ST || ST || {}).clientes || []; } catch (e) { return []; } };

  let hilos = [], hiloAbiertoId = null, mensajes = [];
  let waFiltro = 'todos';
  let waContactFiltro = 'todos';
  let sb = null, canal = null;
  // "mensajesHiloId" es la unica fuente de verdad de a que hilo pertenecen los datos que hay
  // ahora mismo en "mensajes" -- lo pone cargarMensajes() SOLO cuando escribe datos frescos y
  // vigentes (nunca en un fallo, nunca en una carga superada por otra mas nueva). pintarDetalle()
  // lo chequea el mismo, una sola vez, en vez de que cada lugar que llama a pintar()/
  // pintarDetalle() tenga que acordarse de no hacerlo mientras la carga sigue en vuelo.
  //
  // Fix 2026-09-07, tercera pasada -- las dos pasadas anteriores del mismo dia intentaron evitar
  // el render completo del panel con logica de diffing (comparar prefijos de ids, luego "huellas"
  // por mensaje) para no destruir el <input> del composer en cada evento de Realtime. Revisadas
  // por agentes, ambas terminaron introduciendo bugs nuevos y mas graves que el original (fuga
  // transitoria de mensajes de un cliente bajo el nombre de otro, un contador de generacion global
  // que descartaba cargas validas, huellas que no detectaban cambios reales). Se abandona esa
  // estrategia: ahora pintarDetalle() SIEMPRE re-renderiza completo cuando hay datos frescos, pero
  // preserva explicitamente el texto/foco/cursor del composer y la posicion del scroll a traves
  // del rewrite -- eso es lo unico que de verdad le importa al agente, y es mucho mas simple de
  // verificar sin bugs que un mecanismo de diffing incremental.
  let ultimoRenderHiloId = null, mensajesHiloId = null;
  // Fix 2026-09-07, cuarta pasada -- un contador de generacion incrementado DENTRO de
  // cargarMensajes() (a la entrada de la funcion) queda "dormido" mientras un await previo al
  // llamado lo bloquea (por ejemplo el RPC whatsapp_marcar_hilo_leido en nxWaAbrirHilo, o el
  // fetch de envio en nxWaEnviar) -- eso permitia que una carga vieja y colgada de ESE MISMO hilo
  // pasara el chequeo de generacion porque nadie mas la habia "adelantado" todavia. Ahora se
  // reserva un token nuevo para el hilo en el INSTANTE en que se decide recargarlo (antes de
  // cualquier await, incluida esa RPC), asi cualquier carga anterior en vuelo para ese hilo queda
  // invalidada de inmediato, sin importar cuanto tarde en resolver ni si termina en exito o error.
  const solicitudVigentePorHilo = new Map();
  function marcarSolicitudCarga(hiloId) {
    const token = {};
    solicitudVigentePorHilo.set(hiloId, token);
    return token;
  }
  // Fix 2026-09-07, sexta y ultima pasada -- 3 problemas mas, confirmados por revision con
  // agentes sobre la quinta pasada:
  // 1. El candado "disabled" del <input> del composer, puesto a mano por nxWaEnviar(), no
  //    sobrevivia a un re-render (pintarDetalle() SIEMPRE reescribe el composer entero sin ese
  //    atributo) -- cualquier evento de Realtime de OTRO hilo cualquiera podia reactivar el
  //    composer en medio de un envio todavia en vuelo, permitiendo un doble envio real al
  //    cliente. "hiloEnviosEnVuelo" es la fuente de verdad (independiente del DOM) que
  //    pintarDetalle() consulta para decidir si el <input> nace deshabilitado.
  // 2. El reintento de "Cargando..." pegado (ver pintarDetalle) solo se armaba una vez chequeando
  //    "ultimoRenderHiloId", una variable COMPARTIDA con el render completo de CUALQUIER hilo --
  //    rebotar entre hilos podia armar timers duplicados para el mismo hilo. Ahora se dedupe por
  //    hilo en "hilosConReintentoProgramado", sin relacion con esa otra variable.
  // 3. Ese mismo reintento no distinguia "la carga fallo" de "la carga sigue genuinamente en
  //    curso" (por ejemplo, firmando varios adjuntos de bauches, algo que puede tardar mas de los
  //    3s del reintento) -- lo relanzaba igual, invalidando y tirando a la basura el trabajo ya
  //    hecho de la carga real. "hilosCargando" marca que hilos tienen una carga autorizada
  //    genuinamente en vuelo ahora mismo; si sigue en curso, el reintento solo vuelve a esperar
  //    en vez de cancelarla con una carga nueva.
  const hiloEnviosEnVuelo = new Set();
  const hilosCargando = new Set();
  const hilosConReintentoProgramado = new Set();
  const urlFirmadaCache = new Map();
  const urlFirmadaEnVuelo = new Map();

  function css() {
    if ($('#nxWaInboxCss')) return;
    const s = document.createElement('style'); s.id = 'nxWaInboxCss'; s.textContent = `
#v-waInbox{--wa-b:#2563eb;--wa-b2:#7c3aed;--wa-line:rgba(226,232,240,.86);font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;min-height:100%;padding:0 0 18px;background:linear-gradient(180deg,rgba(248,251,255,.94),rgba(246,248,251,.82))}
#v-waInbox .nxCrmHomeHead{position:relative;margin:0 0 12px;padding:16px 16px 18px;border:1px solid rgba(255,255,255,.82);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(239,246,255,.9));box-shadow:0 18px 48px -38px rgba(15,23,42,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden}
#v-waInbox .nxCrmHomeHead:after{content:"";position:absolute;left:16px;right:16px;bottom:0;height:3px;border-radius:999px;background:linear-gradient(90deg,#25d366,var(--wa-b),var(--wa-b2));opacity:.9}
#v-waInbox .nxCrmHomeHead h1{font-size:25px;line-height:1.06;margin:4px 0 5px;font-weight:900;letter-spacing:0;color:#0f172a}
#v-waInbox .nxCrmHomeHead p{max-width:560px;margin:0;font-size:10.5px;line-height:1.35;color:#475569}
#v-waInbox .nxCrmHomeBadge{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:6px 10px;border-radius:999px;background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.22);color:#047857;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.03em}
#v-waInbox .nxWaShell{display:grid;grid-template-columns:minmax(280px,330px) minmax(0,1fr);gap:12px;height:calc(100vh - 170px);min-height:500px}
#v-waInbox .nxWaCol{background:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.82);border-radius:17px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 46px -36px rgba(15,23,42,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
#v-waInbox .nxWaListScroll{overflow-y:auto;flex:1}
#v-waInbox .nxWaRow{display:flex;gap:10px;padding:12px;border-bottom:1px solid var(--wa-line);cursor:pointer;transition:background .16s ease,transform .16s ease}
#v-waInbox .nxWaRow:hover{background:#f8fafc;transform:translateX(2px)}
#v-waInbox .nxWaRow.on{background:linear-gradient(90deg,rgba(37,99,235,.12),rgba(124,58,237,.08))}
#v-waInbox .nxWaAv{width:36px;height:36px;border-radius:14px;background:linear-gradient(135deg,#dcfce7,#eaf1ff);color:#1d4ed8;display:grid;place-items:center;font-size:11px;font-weight:900;flex:none}
#v-waInbox .nxWaWho{min-width:0;flex:1}
#v-waInbox .nxWaWho b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0f172a}
#v-waInbox .nxWaWho span{display:block;font-size:9.5px;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#v-waInbox .nxWaBadge{background:#dc2626;color:#fff;border-radius:999px;font-size:8.5px;font-weight:900;padding:2px 6px;flex:none}
#v-waInbox .nxWaDetalle{display:flex;flex-direction:column;height:100%}
#v-waInbox .nxWaHead{padding:12px;border-bottom:1px solid var(--wa-line);font-size:11px;font-weight:900;background:rgba(255,255,255,.88);color:#0f172a}
#v-waInbox .nxWaMsgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,#f8fafc,#eef4ff)}
#v-waInbox .nxWaBub{max-width:76%;padding:9px 11px;border-radius:14px;font-size:11.5px;line-height:1.4;box-shadow:0 10px 22px -20px rgba(15,23,42,.55)}
#v-waInbox .nxWaBub.in{align-self:flex-start;background:#fff;border:1px solid #e5eaf2;border-top-left-radius:6px}
#v-waInbox .nxWaBub.out{align-self:flex-end;background:#dcf8c6;border-top-right-radius:6px}
#v-waInbox .nxWaBub img{max-width:220px;border-radius:10px;display:block;cursor:pointer}
#v-waInbox .nxWaComposer{display:flex;gap:7px;padding:10px;border-top:1px solid var(--wa-line);background:rgba(255,255,255,.92)}
#v-waInbox .nxWaComposer input{flex:1;min-width:0;border:1px solid #dbe3ee;border-radius:999px;padding:10px 12px;font:inherit;font-size:11.5px;outline:none}
#v-waInbox .nxWaComposer input:focus{border-color:rgba(37,99,235,.55);box-shadow:0 0 0 4px rgba(37,99,235,.1)}
#v-waInbox .nxWaComposer button{width:40px;border:0;background:linear-gradient(135deg,#25d366,#2563eb);color:#fff;border-radius:14px;font-weight:900;cursor:pointer;display:grid;place-items:center}
#v-waInbox .nxWaCerrada{padding:10px;text-align:center;font-size:10.5px;color:#92400e;background:#fff7ed;border-top:1px solid #fed7aa}
#v-waInbox .nxWaEmpty{padding:24px;text-align:center;color:#64748b;font-size:10.5px;line-height:1.35}
#v-waInbox .nxWaPend{border:1px solid #e5eaf2;border-radius:13px;padding:9px;display:flex;gap:9px;align-items:center;margin-bottom:7px;background:rgba(255,255,255,.74)}
#v-waInbox .nxWaPend img{width:44px;height:44px;object-fit:cover;border-radius:10px;flex:none;background:#f1f5f9}
#v-waInbox .nxWaPend .acts{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
#v-waInbox .nxWaPend button{border:1px solid #dbe3ee;border-radius:999px;background:#fff;font-size:9.5px;font-weight:900;padding:7px 10px;cursor:pointer}
#v-waInbox .nxWaPend button.primary{background:#2563eb;border-color:#2563eb;color:#fff}
#v-waInbox .nxWaPro{margin:0 0 12px;padding:12px;border:1px solid rgba(255,255,255,.82);border-radius:17px;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(240,253,244,.76));box-shadow:0 16px 42px -34px rgba(15,23,42,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
#v-waInbox .nxWaProHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
#v-waInbox .nxWaProHead h3{font-size:12px;margin:0;color:#0f172a;font-weight:900}
#v-waInbox .nxWaProHead p{font-size:9.5px;line-height:1.35;color:#64748b;margin:2px 0 0}
#v-waInbox .nxWaProGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:10px}
#v-waInbox .nxWaProKpi{border:1px solid rgba(226,232,240,.92);border-radius:14px;background:rgba(255,255,255,.74);padding:10px;min-width:0;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
#v-waInbox .nxWaProKpi:hover{transform:translateY(-1px);border-color:rgba(37,99,235,.22);box-shadow:0 14px 26px -25px rgba(15,23,42,.6)}
#v-waInbox .nxWaProKpi.on{border-color:rgba(37,99,235,.55);background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(124,58,237,.08))}
#v-waInbox .nxWaProKpi .l{font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaProKpi .v{font-size:20px;font-weight:900;color:#0f172a;margin-top:2px}
#v-waInbox .nxWaProKpi .s{font-size:8.5px;color:#64748b;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaProActs{display:flex;gap:7px;flex-wrap:wrap}
#v-waInbox .nxWaProActs button{height:32px;border:1px solid #dbe3ee;border-radius:999px;background:rgba(255,255,255,.86);padding:0 11px;font:inherit;font-size:9px;font-weight:900;color:#1d4ed8;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#v-waInbox .nxWaProActs button.primary{background:linear-gradient(135deg,#25d366,#2563eb);border-color:transparent;color:#fff}
#v-waInbox .nxWaContacts{margin-top:10px;border:1px solid rgba(226,232,240,.9);border-radius:15px;background:rgba(255,255,255,.7);overflow:hidden}
#v-waInbox .nxWaContactsTop{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 8px;border-bottom:1px solid rgba(226,232,240,.82)}
#v-waInbox .nxWaContactsTop b{font-size:11px;color:#0f172a}
#v-waInbox .nxWaContactsTop span{font-size:8.5px;color:#64748b}
#v-waInbox .nxWaContactTabs{display:flex;gap:6px;overflow-x:auto;padding:0 10px 9px;scrollbar-width:none}
#v-waInbox .nxWaContactTabs::-webkit-scrollbar{display:none}
#v-waInbox .nxWaContactTabs button{height:29px;flex:0 0 auto;border:1px solid #dbe3ee;border-radius:999px;background:#fff;padding:0 9px;font:inherit;font-size:8.5px;font-weight:900;color:#475569;cursor:pointer}
#v-waInbox .nxWaContactTabs button.on{background:#0f172a;border-color:#0f172a;color:#fff}
#v-waInbox .nxWaContactList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:0 10px 10px}
#v-waInbox .nxWaContact{display:flex;align-items:center;gap:8px;min-width:0;border:1px solid rgba(226,232,240,.9);border-radius:12px;background:#fff;padding:8px}
#v-waInbox .nxWaContact .av{width:30px;height:30px;border-radius:12px;display:grid;place-items:center;flex:none;background:linear-gradient(135deg,#dcfce7,#eaf1ff);color:#1d4ed8;font-size:9px;font-weight:900}
#v-waInbox .nxWaContact .tx{min-width:0;flex:1}
#v-waInbox .nxWaContact .tx b{display:block;font-size:9.5px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaContact .tx span{display:block;font-size:8px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
#v-waInbox .nxWaContact .st{font-size:7.5px;font-weight:900;border-radius:999px;padding:3px 6px;background:#f1f5f9;color:#64748b;white-space:nowrap}
#v-waInbox .nxWaContact .st.err{background:#fff1f2;color:#dc2626}
#v-waInbox .nxWaContact .st.warn{background:#fff7ed;color:#d97706}
#v-waInbox .nxWaContact .st.ok{background:#ecfdf5;color:#059669}
#v-waInbox .nxWaContactsFoot{display:flex;gap:7px;flex-wrap:wrap;padding:0 10px 10px}
#v-waInbox .nxWaContactsFoot button{height:31px;border:1px solid #dbe3ee;border-radius:999px;background:#fff;padding:0 10px;font:inherit;font-size:8.5px;font-weight:900;color:#1d4ed8;cursor:pointer}
#v-waInbox .nxWaContactsFoot button.primary{background:#25d366;border-color:#25d366;color:#fff}
#v-waInbox .nxWaTag{display:inline-flex;align-items:center;gap:3px;margin-top:5px;padding:3px 6px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:8px;font-weight:900}
#v-waInbox .nxWaTag.err{background:#fff1f2;color:#dc2626}
#v-waInbox .nxWaTag.warn{background:#fff7ed;color:#d97706}
#v-waInbox .nxWaTag.ok{background:#ecfdf5;color:#059669}
@media(max-width:760px){
  #v-waInbox{padding:0 10px 16px;background:linear-gradient(180deg,rgba(248,251,255,.97),rgba(246,248,251,.92))}
  #v-waInbox .nxCrmHomeHead{padding:13px 13px 16px;border-radius:16px;margin-bottom:10px}
  #v-waInbox .nxCrmHomeHead h1{font-size:24px}
  #v-waInbox .nxCrmHomeHead p{font-size:10px;max-width:270px}
  #v-waInbox #nxWaPendPanel{margin-bottom:10px}
  #v-waInbox .nxWaShell{display:flex;flex-direction:column;height:auto;min-height:0;gap:10px}
  #v-waInbox .nxWaCol{border-radius:16px;min-height:220px;max-height:none}
  #v-waInbox .nxWaListCol{min-height:280px;max-height:44vh}
  #v-waInbox .nxWaDetailCol{min-height:58vh}
  #v-waInbox .nxWaDetailCol:not(.has-open){display:none}
  #v-waInbox .nxWaRow{padding:12px 10px}
  #v-waInbox .nxWaBub{max-width:88%;font-size:12px}
  #v-waInbox .nxWaBub img,#v-waInbox .nxWaBub audio,#v-waInbox .nxWaBub video{max-width:100%;width:100%}
  #v-waInbox .nxWaPend{align-items:flex-start;flex-wrap:wrap}
  #v-waInbox .nxWaPend .acts{width:100%;margin-left:0;justify-content:flex-start}
  #v-waInbox .nxWaPro{padding:10px;border-radius:16px}
  #v-waInbox .nxWaProHead{display:block}
  #v-waInbox .nxWaProGrid{display:flex;overflow-x:auto;gap:8px;padding-bottom:2px;scrollbar-width:none}
  #v-waInbox .nxWaProGrid::-webkit-scrollbar{display:none}
  #v-waInbox .nxWaProKpi{min-width:116px}
  #v-waInbox .nxWaProActs{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
  #v-waInbox .nxWaProActs::-webkit-scrollbar{display:none}
  #v-waInbox .nxWaProActs button{flex:0 0 auto}
  #v-waInbox .nxWaContactList{grid-template-columns:1fr;max-height:240px;overflow:auto}
  #v-waInbox .nxWaContactsFoot{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
  #v-waInbox .nxWaContactsFoot::-webkit-scrollbar{display:none}
  #v-waInbox .nxWaContactsFoot button{flex:0 0 auto}
}
    `; document.head.appendChild(s);
  }

  function ensureView() {
    let v = $('#v-waInbox'); if (v) return v;
    v = document.createElement('div'); v.id = 'v-waInbox'; v.className = 'view nxSf';
    const ref = $('#v-crm') || $('#v-clientes');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.querySelector('.main')?.appendChild(v);
    return v;
  }

  function ensureMenu() {
    if ($('#nxWaInboxNav')) return $('#nxWaInboxNav');
    const crm = $('#nxCrmNav') || [...document.querySelectorAll('#sbNav .ni')].find(n => (n.getAttribute('onclick') || '').includes("nav('clientes'"));
    if (!crm || !crm.parentNode) return null;
    const n = document.createElement('div'); n.className = 'ni'; n.id = 'nxWaInboxNav';
    n.setAttribute('onclick', "nav('waInbox',this)"); n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button');
    n.innerHTML = '<i class="ti ti-brand-whatsapp ni-i"></i><span class="ni-l">WhatsApp</span>';
    crm.parentNode.insertBefore(n, crm.nextSibling);
    return n;
  }

  function patchNav() {
    try {
      if (typeof nav === 'function' && !nav.__nxWaInboxEntry) {
        const o = nav, n = function (view, el) { if (view === 'waInbox') return open(el); return o.apply(this, arguments); };
        n.__nxWaInboxEntry = 1; nav = window.nav = n;
      }
    } catch (e) { console.error('[WA Inbox] nav', e); }
  }

  function open(el) {
    css(); ensureMenu(); const v = ensureView();
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on')); v.classList.add('on');
    document.querySelectorAll('#sbNav .ni').forEach(x => x.classList.remove('on'));
    (el && el.classList ? el : $('#nxWaInboxNav'))?.classList.add('on');
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    render();
    cargar();
    return false;
  }
  window.nxAbrirWaInbox = open;

  // ── Datos ──────────────────────────────────────────────────────────────
  async function cargar() {
    const A = api(); if (!A?.get) return;
    // Un blip transitorio de este fetch no debe vaciar toda la lista de conversaciones visibles
    // -- este refresco corre en cada evento de Realtime de CUALQUIER hilo, asi que es mucho mas
    // frecuente que el de un solo hilo. Se deja "hilos" como estaba y se reintenta solo.
    try { hilos = await A.get('whatsapp_hilos', 'order=ultimo_mensaje_at.desc.nullslast&limit=100&select=*') || []; } catch (e) { return; }
    if (hiloAbiertoId) await cargarMensajes(hiloAbiertoId);
    pintar();
  }
  function api() { try { return getAPI(); } catch (e) { return null; } }

  async function urlFirmada(path) {
    // Cacheada por media_path -- pedir una URL firmada nueva en CADA refresco (cada evento de
    // Realtime) para adjuntos que ya tenian una vigente era trafico/latencia innecesaria. Una
    // entrada vencida se borra al leerla (no solo se ignora) para no crecer sin limite en una
    // pestaña de larga duracion, y las peticiones concurrentes para el MISMO path comparten la
    // misma promesa en vez de disparar un POST duplicado cada una.
    const cacheada = urlFirmadaCache.get(path);
    if (cacheada) {
      if ((Date.now() - cacheada.at) < 45 * 60000) return cacheada.url;
      urlFirmadaCache.delete(path);
    }
    if (urlFirmadaEnVuelo.has(path)) return urlFirmadaEnVuelo.get(path);
    const A = api(); if (!A) return cacheada ? cacheada.url : null;
    const promesa = (async () => {
      try {
        const r = await fetch(`${A.url}/storage/v1/object/sign/whatsapp-inbox-media/${path}`, {
          method: 'POST',
          headers: { apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key), 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 3600 })
        });
        if (!r.ok) return null;
        const d = await r.json();
        const url = `${A.url}/storage/v1${d.signedURL || d.signedUrl}`;
        urlFirmadaCache.set(path, { url, at: Date.now() });
        return url;
      } catch (e) { return null; }
    })();
    urlFirmadaEnVuelo.set(path, promesa);
    let resultado;
    try { resultado = await promesa; } finally { urlFirmadaEnVuelo.delete(path); }
    // El token real dura 60 min y nuestro cache lo da por vencido a los 45 como margen -- si el
    // re-firmado justo en ese margen falla por algo transitorio (blip de red), es mejor devolver
    // la URL vieja (probablemente todavia vigente del lado de Storage) que mostrar "Adjunto no
    // disponible" por un fallo que nada tiene que ver con si el adjunto sigue disponible.
    return resultado || (cacheada ? cacheada.url : null);
  }

  async function cargarMensajes(hiloId, tokenReservado) {
    const A = api(); if (!A?.get) return false;
    // Fix 2026-09-07: bugs reales confirmados por revisiones sucesivas con agentes sobre el
    // codigo ya en produccion (PR #300) y sobre intentos de arreglo posteriores el mismo dia:
    // 1. "order=created_at.asc&limit=200" siempre trae los 200 mensajes MAS VIEJOS del hilo --
    //    una vez que un hilo pasa de 200 mensajes, los nuevos (incluidos los que el propio
    //    agente manda) dejan de verse para siempre. Se pide desc+limit (con "id" de desempate,
    //    por si dos mensajes comparten el mismo created_at exacto) y se invierte en JS para
    //    traer los 200 MAS RECIENTES en orden cronologico.
    // 2. El "turno" vigente para pintar este hilo se reserva por fuera (ver
    //    marcarSolicitudCarga) en el instante en que se decide recargarlo, no aca adentro -- si
    //    quien llama no reservo uno de antemano (por ejemplo un refresco disparado por
    //    Realtime), se reserva aca mismo. Esto evita que una carga vieja y colgada de ESE MISMO
    //    hilo (por ejemplo esperando el loop secuencial de firmar varios adjuntos) pase el
    //    chequeo de frescura solo porque nadie mas la "adelanto" todavia mientras un await previo
    //    (una RPC, el fetch de un envio) bloqueaba a quien la iba a reemplazar.
    // 3. Un error real de red/fetch NUNCA se reporta como exito -- antes, el catch dejaba
    //    "datos=[]" y esa carga se guardaba igual como si fuera un hilo genuinamente vacio,
    //    lo cual terminaba borrando toda la conversacion visible en pantalla (y el <input> del
    //    composer con ella) por un simple blip transitorio. Ahora un error simplemente no toca
    //    nada -- el proximo refresco de Realtime, o el reintento de pintarDetalle(), lo resuelve.
    // Devuelve true SOLO si esta carga realmente escribio "mensajes"/"mensajesHiloId" con datos
    // frescos y vigentes del hilo pedido.
    const miToken = tokenReservado || marcarSolicitudCarga(hiloId);
    hilosCargando.add(hiloId);
    try {
      let datos;
      try {
        datos = await A.get('whatsapp_hilo_mensajes', `hilo_id=eq.${hiloId}&order=created_at.desc,id.desc&limit=200&select=*`) || [];
        datos = datos.slice().reverse();
        for (const m of datos) { if (m.media_path) m._url = await urlFirmada(m.media_path); }
      } catch (e) { return false; }
      if (solicitudVigentePorHilo.get(hiloId) !== miToken || hiloAbiertoId !== hiloId) return false; // superada por una carga mas nueva de ESTE hilo, o el usuario ya cambio de hilo
      mensajes = datos;
      mensajesHiloId = hiloId;
      return true;
    } finally {
      // Solo borrar la marca de "en curso" si esta sigue siendo la carga vigente para el hilo --
      // si una mas nueva ya la reemplazo en solicitudVigentePorHilo, esta (vieja) terminando no
      // debe apagar la marca de la que sigue realmente en vuelo.
      if (solicitudVigentePorHilo.get(hiloId) === miToken) hilosCargando.delete(hiloId);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function iniciales(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?'; }
  function horaRel(iso) {
    if (!iso) return ''; const d = new Date(iso), min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'ahora'; if (min < 60) return min + ' min'; const h = Math.round(min / 60);
    if (h < 24) return h + ' h'; return Math.round(h / 24) + ' d';
  }

  function render() {
    const v = ensureView();
    v.innerHTML = `<div class="nxCrmHomeHead"><div><span class="nxCrmHomeBadge"><i class="ti ti-brand-whatsapp"></i> WhatsApp</span><h1>Inbox</h1><p>Conversaciones con clientes, preguntas y comprobantes de pago.</p></div></div>
      <div id="nxWaProPanel"></div>
      <div id="nxWaPendPanel" style="margin-bottom:12px"></div>
      <div class="nxWaShell">
        <div class="nxWaCol nxWaListCol"><div class="nxWaListScroll" id="nxWaLista"></div></div>
        <div class="nxWaCol nxWaDetailCol"><div class="nxWaDetalle" id="nxWaDetalle"></div></div>
      </div>`;
    pintar();
  }

  function pintar() {
    if (!$('#v-waInbox.on')) return;
    pintarProPanel();
    pintarPendientes();
    pintarLista();
    pintarDetalle();
  }

  function clienteDeHilo(h) {
    return h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
  }
  function waPendienteCliente(c) {
    if (!c) return 0;
    try { if (typeof pendTot === 'function') return Number(pendTot(c)) || 0; } catch (e) {}
    try { if (typeof pend === 'function') return Number(pend(c)) || 0; } catch (e) {}
    return Math.max(0, Number(c.deuda_total || 0) - Number(c.pagado || 0) + Number(c.deuda_anterior || 0));
  }
  function waEstadoPoliza(c) {
    if (!c) return { est: 'sin_cliente', lbl: '' };
    try { if (typeof getEstPol === 'function') return getEstPol(c) || { est: 'vigente', lbl: '' }; } catch (e) {}
    if (!c.fecha_fin) return { est: 'vigente', lbl: '' };
    const d = new Date(String(c.fecha_fin).slice(0, 10) + 'T12:00:00');
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dias = Math.ceil((d - hoy) / 86400000);
    return dias < 0 ? { est: 'vencida', lbl: 'Vencida' } : dias <= 30 ? { est: 'gracia', lbl: 'Vence pronto' } : { est: 'vigente', lbl: 'Vigente' };
  }
  function waTieneBauchePendiente(h) {
    return mensajesPendientesCache.some(m => String(m.hilo_id) === String(h.id));
  }
  function waVentanaAbierta(h) {
    return !!(h?.ultimo_inbound_at && (Date.now() - new Date(h.ultimo_inbound_at).getTime()) < 24 * 3600000);
  }
  function waClasificarHilo(h) {
    const c = clienteDeHilo(h);
    if (!c) return { key: 'sin_cliente', label: 'Sin cliente', cls: 'err' };
    if (waTieneBauchePendiente(h)) return { key: 'bauche', label: 'Bauche', cls: 'ok' };
    if (waPendienteCliente(c) > 0) return { key: 'cobro', label: 'Cobro', cls: 'err' };
    const ep = waEstadoPoliza(c);
    if (ep.est === 'vencida' || ep.est === 'gracia') return { key: 'renovar', label: 'Renovar', cls: 'warn' };
    if (h.no_leidos_count > 0) return { key: 'no_leidos', label: 'Nuevo', cls: 'warn' };
    if (!waVentanaAbierta(h)) return { key: 'cerrada', label: '24h cerrada', cls: '' };
    return { key: 'ok', label: 'Al dia', cls: 'ok' };
  }
  function hilosFiltrados() {
    if (waFiltro === 'todos') return hilos;
    return hilos.filter(h => waClasificarHilo(h).key === waFiltro);
  }
  function pintarProPanel() {
    const host = $('#nxWaProPanel'); if (!host) return;
    const conCliente = hilos.filter(h => clienteDeHilo(h));
    const sinCliente = hilos.length - conCliente.length;
    const noLeidos = hilos.filter(h => h.no_leidos_count > 0).length;
    const conBauche = hilos.filter(waTieneBauchePendiente).length;
    const conCobro = hilos.filter(h => waPendienteCliente(clienteDeHilo(h)) > 0).length;
    const renovar = hilos.filter(h => { const ep = waEstadoPoliza(clienteDeHilo(h)); return ep.est === 'vencida' || ep.est === 'gracia'; }).length;
    const kpi = (key, label, val, sub) => `<button class="nxWaProKpi ${waFiltro === key ? 'on' : ''}" onclick="nxWaFiltro('${key}')"><div class="l">${esc(label)}</div><div class="v">${val}</div><div class="s">${esc(sub)}</div></button>`;
    host.innerHTML = `<section class="nxWaPro">
      <div class="nxWaProHead"><div><h3>Centro WhatsApp Pro</h3><p>Prioriza clientes por cobro, renovacion, bauches y conversaciones sin vincular.</p></div></div>
      <div class="nxWaProGrid">
        ${kpi('todos', 'Conversaciones', hilos.length, conCliente.length + ' vinculadas')}
        ${kpi('no_leidos', 'Sin responder', noLeidos, 'mensajes nuevos')}
        ${kpi('cobro', 'Cobranza', conCobro, 'clientes con balance')}
        ${kpi('renovar', 'Renovacion', renovar, 'vence/vencida')}
        ${kpi('sin_cliente', 'Sin vincular', sinCliente, 'telefono suelto')}
      </div>
      <div class="nxWaProActs">
        <button class="primary" onclick="nxWaAbrirCobranza()"><i class="ti ti-cash"></i> Cobranza</button>
        <button onclick="nxWaAbrirRenovaciones()"><i class="ti ti-calendar-event"></i> Renovaciones</button>
        <button onclick="nxWaAbrirMasivoSegmento('deuda')"><i class="ti ti-send"></i> WA deuda</button>
        <button onclick="nxWaFiltro('bauche')"><i class="ti ti-receipt"></i> Bauches ${conBauche}</button>
      </div>
      ${waContactosHTML()}
    </section>`;
  }

  function waContactos() {
    return clientes().filter(c => c && c.activo !== false && c.wa).map(c => {
      const deuda = waPendienteCliente(c);
      const ep = waEstadoPoliza(c);
      const renueva = ep.est === 'vencida' || ep.est === 'gracia';
      let estado = { key: 'aldia', label: 'Al dia', cls: 'ok' };
      if (deuda > 0) estado = { key: 'deuda', label: 'Deuda', cls: 'err' };
      else if (renueva) estado = { key: 'renovar', label: 'Renovar', cls: 'warn' };
      return { c, deuda, ep, estado };
    }).sort((a, b) => (b.deuda - a.deuda) || String(a.c.nom || '').localeCompare(String(b.c.nom || ''), 'es'));
  }
  function waContactosPor(tipo) {
    const all = waContactos();
    if (tipo === 'deuda') return all.filter(x => x.estado.key === 'deuda');
    if (tipo === 'renovar') return all.filter(x => x.estado.key === 'renovar');
    if (tipo === 'aldia') return all.filter(x => x.estado.key === 'aldia');
    return all;
  }
  function waContactosHTML() {
    const all = waContactos();
    const data = waContactosPor(waContactFiltro);
    const count = k => waContactosPor(k).length;
    const tab = (k, label) => `<button class="${waContactFiltro === k ? 'on' : ''}" onclick="nxWaContactFiltro('${k}')">${esc(label)} ${count(k)}</button>`;
    const filas = data.slice(0, 8).map(x => {
      const c = x.c;
      const sub = [c.wa, c.plan, c.ars].filter(Boolean).join(' · ');
      return `<div class="nxWaContact">
        <div class="av">${esc(iniciales(c.nom))}</div>
        <div class="tx"><b>${esc(c.nom || 'Cliente')}</b><span>${esc(sub || 'WhatsApp registrado')}</span></div>
        <span class="st ${x.estado.cls}">${esc(x.estado.label)}</span>
      </div>`;
    }).join('') || '<div class="nxWaEmpty" style="grid-column:1/-1;padding:14px">No hay contactos en este segmento.</div>';
    return `<div class="nxWaContacts">
      <div class="nxWaContactsTop"><div><b>Lista de contactos WhatsApp</b><br><span>${all.length} clientes activos con numero registrado</span></div></div>
      <div class="nxWaContactTabs">
        ${tab('todos', 'Todos')}
        ${tab('deuda', 'Deuda')}
        ${tab('renovar', 'Renovar')}
        ${tab('aldia', 'Al dia')}
      </div>
      <div class="nxWaContactList">${filas}</div>
      <div class="nxWaContactsFoot">
        <button class="primary" onclick="nxWaAbrirMasivoSegmento('todos')">Factura a todos</button>
        <button onclick="nxWaAbrirMasivoSegmento('deuda')">Recordar deuda</button>
        <button onclick="nxWaAbrirMasivoSegmento('renovar')">Renovaciones</button>
        <button onclick="nxWaAbrirMasivoSegmento('aldia')">Clientes al dia</button>
      </div>
    </div>`;
  }

  window.nxWaFiltro = function (f) { waFiltro = f || 'todos'; pintar(); };
  window.nxWaContactFiltro = function (f) { waContactFiltro = f || 'todos'; pintarProPanel(); };
  window.nxWaAbrirCobranza = function () { try { nav('facturas', null); setTimeout(() => { try { switchTab('cob'); } catch (e) {} }, 160); } catch (e) {} };
  window.nxWaAbrirRenovaciones = function () { try { nav('polizas', null); } catch (e) {} };
  window.nxWaAbrirMasivoDeuda = function () {
    window.nxWaAbrirMasivoSegmento('deuda');
  };
  window.nxWaAbrirMasivoSegmento = function (tipo) {
    const mapa = { todos: 'factura', deuda: 'pago', renovar: 'vence', aldia: 'factura' };
    const lista = waContactosPor(tipo || 'todos');
    const ids = lista.map(x => x.c.id);
    if (!ids.length) { try { toast('warn', 'Sin contactos', 'No hay clientes con WhatsApp en este segmento'); } catch (e) {} return; }
    if (typeof abrirWAMasivo !== 'function') { try { toast('err', 'WA Masivo no disponible'); } catch (e) {} return; }
    abrirWAMasivo(ids);
    setTimeout(() => { try { if (typeof selWATipo === 'function') selWATipo(mapa[tipo] || 'factura'); } catch (e) {} }, 80);
  };

  function pintarPendientes() {
    const host = $('#nxWaPendPanel'); if (!host) return;
    const pendientes = mensajesPendientesCache;
    host.innerHTML = `<section class="nxCrmPanel"><div class="nxCrmPH"><h3>Bauches pendientes de revisar</h3></div><div class="nxCrmList" id="nxWaPendList"><div class="nxCrmEmpty">Cargando…</div></div></section>`;
    cargarPendientes();
  }

  let mensajesPendientesCache = [];
  async function cargarPendientes() {
    const A = api(); if (!A?.get) return;
    let filas = [];
    try { filas = await A.get('whatsapp_hilo_mensajes', "revision_pago_estado=eq.pendiente&order=created_at.asc&limit=50&select=*") || []; } catch (e) { filas = []; }
    mensajesPendientesCache = filas;
    const list = $('#nxWaPendList'); if (!list) return;
    if (!filas.length) { list.innerHTML = '<div class="nxCrmEmpty">No hay bauches pendientes. Todo revisado.</div>'; return; }
    const filasHtml = await Promise.all(filas.map(async m => {
      const h = hilos.find(x => x.id === m.hilo_id);
      const nombre = h?.nombre_perfil || h?.telefono_e164 || 'Cliente';
      const cliente = h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
      const url = m.media_path ? await urlFirmada(m.media_path) : null;
      return `<div class="nxWaPend"><img src="${url || ''}" alt="bauche"><div><b>${esc(cliente?.nom || nombre)}</b><div style="font-size:9.5px;color:#64748b">${esc(h?.telefono_e164 || '')}</div></div>
        <div class="acts">
          ${h?.cliente_id ? `<button class="primary" onclick="nxWaAplicarBauche('${m.id}','${h.cliente_id}')">Aplicar como pago</button>` : `<span style="font-size:9px;color:#dc2626">Sin cliente vinculado</span>`}
          <button onclick="nxWaDescartarBauche('${m.id}')">Descartar</button>
        </div></div>`;
    }));
    list.innerHTML = filasHtml.join('');
  }

  window.nxWaAplicarBauche = function (mensajeId, clienteId) {
    const m = mensajesPendientesCache.find(x => x.id === mensajeId); if (!m) return;
    // Si ya había otro bauche esperando resolverse (el agente no terminó ese cobro), avisar --
    // este nuevo click lo reemplaza, así que si el primer pago se completa más tarde ya no
    // se va a auto-resolver solo (queda pendiente, se puede aplicar/descartar a mano).
    if (window.__nxWaRevisionPendiente && window.__nxWaRevisionPendiente !== mensajeId) {
      toast('info', 'Aviso', 'Había otro bauche esperando cobro -- quedó pendiente, revísalo aparte.');
    }
    window.__nxWaRevisionPendiente = mensajeId;
    window.__nxWaRevisionPendienteCliente = clienteId != null ? String(clienteId) : null;
    try { abrirAbono(clienteId); } catch (e) { toast('err', 'No se pudo abrir el registro de pago'); return; }
    urlFirmada(m.media_path).then(url => {
      setTimeout(() => { if (window.nxBaucheAsignarExterno) window.nxBaucheAsignarExterno('wa-media:' + m.media_path, url); }, 180);
    });
  };
  window.nxWaDescartarBauche = async function (mensajeId) {
    const A = api(); if (!A?.post) return;
    try { await A.post('rpc/whatsapp_resolver_revision_pago', { p_mensaje_id: mensajeId, p_estado: 'descartado' }); toast('ok', 'Descartado'); cargarPendientes(); } catch (e) { toast('err', 'No se pudo descartar'); }
  };

  // Se dispara despues de que regAbono() completa exitosamente, para cerrar la revision
  // pendiente que quedo marcada en nxWaAplicarBauche. Ver parches-seguros-base.js.
  // clienteId es del abono que de verdad se acaba de registrar -- si no coincide con el cliente
  // del bauche pendiente (dos "Aplicar como pago" abiertos sin terminar el primero, o cualquier
  // otro cobro registrado mientras la bandera seguía puesta), NO se resuelve: mejor dejarlo
  // pendiente para revisar a mano que marcar el bauche equivocado como ya cobrado.
  window.nxWaResolverTrasAbono = async function (abonoId, clienteId) {
    const mensajeId = window.__nxWaRevisionPendiente; if (!mensajeId) return;
    const esperado = window.__nxWaRevisionPendienteCliente;
    if (esperado != null && clienteId != null && String(clienteId) !== esperado) {
      console.warn('[WA Inbox] abono de otro cliente mientras había un bauche pendiente -- no se resuelve solo', { mensajeId, esperado, clienteId });
      return;
    }
    window.__nxWaRevisionPendiente = null;
    window.__nxWaRevisionPendienteCliente = null;
    const A = api(); if (!A?.post) return;
    try { await A.post('rpc/whatsapp_resolver_revision_pago', { p_mensaje_id: mensajeId, p_estado: 'aplicado', p_abono_id: abonoId }); cargarPendientes(); } catch (e) {}
  };

  function pintarLista() {
    const cont = $('#nxWaLista'); if (!cont) return;
    const lista = hilosFiltrados();
    if (!hilos.length) { cont.innerHTML = '<div class="nxWaEmpty">Todavia no han llegado mensajes.</div>'; return; }
    if (!lista.length) { cont.innerHTML = '<div class="nxWaEmpty">No hay conversaciones en este filtro.</div>'; return; }
    cont.innerHTML = lista.map(h => {
      const nombre = h.nombre_perfil || h.telefono_e164 || 'Sin nombre';
      const cliente = clienteDeHilo(h);
      const tag = waClasificarHilo(h);
      const on = h.id === hiloAbiertoId ? ' on' : '';
      return `<div class="nxWaRow${on}" onclick="nxWaAbrirHilo('${h.id}')">
        <div class="nxWaAv">${esc(iniciales(cliente?.nom || nombre))}</div>
        <div class="nxWaWho"><b>${esc(cliente?.nom || nombre)}</b><span>${esc(h.ultimo_mensaje_preview || '')}</span><em class="nxWaTag ${tag.cls}">${esc(tag.label)}</em></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="font-size:8.5px;color:#94a3b8">${horaRel(h.ultimo_mensaje_at)}</span>
          ${h.no_leidos_count ? `<span class="nxWaBadge">${h.no_leidos_count}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  window.nxWaAbrirHilo = async function (id) {
    hiloAbiertoId = id;
    // Reservar el turno de este hilo ANTES del await a la RPC de abajo -- si no, una carga vieja
    // y colgada de una visita anterior a este mismo hilo podia "colarse" y pisar mensajes con
    // datos desactualizados mientras ese await todavia no dejaba arrancar la recarga real.
    const miToken = marcarSolicitudCarga(id);
    const h = hilos.find(x => x.id === id);
    // whatsapp_hilos no tiene policy de UPDATE para authenticated a proposito (todo escribe via
    // RPC/service role) -- un PATCH directo aqui lo bloquearia RLS en silencio.
    if (h && h.no_leidos_count) { h.no_leidos_count = 0; try { await api().post('rpc/whatsapp_marcar_hilo_leido', { p_hilo_id: id }); } catch (e) {} }
    await cargarMensajes(id, miToken);
    pintarLista(); pintarDetalle();
  };

  function burbujaMedia(m) {
    if (!m.media_path) return '';
    if (!m._url) return '<div style="font-size:10px;color:#94a3b8">📎 Adjunto no disponible</div>';
    if (m.tipo_contenido === 'imagen') return `<img src="${m._url}" onclick="window.open('${m._url}','_blank')">`;
    if (m.tipo_contenido === 'audio') return `<audio controls src="${m._url}" style="width:220px"></audio>`;
    if (m.tipo_contenido === 'video') return `<video controls src="${m._url}" style="max-width:220px"></video>`;
    return `<a href="${m._url}" target="_blank">📎 Ver documento</a>`;
  }

  // Si la carga inicial de un hilo falla (blip de red) y no llega ningun otro evento de Realtime
  // que la reintente de rebote (conversacion tranquila, sin trafico de otros clientes en ese
  // momento), el panel quedaba en "Cargando..." para siempre. Se arma como mucho UN timer por
  // hilo (dedupe propio en "hilosConReintentoProgramado", independiente de la variable que usa
  // el render completo) y, si al disparar la carga sigue genuinamente en curso (por ejemplo
  // firmando varios adjuntos, lo cual puede tardar mas de 3s), no la cancela con una carga nueva
  // -- solo se vuelve a esperar.
  function programarReintentoCarga(hiloId) {
    if (hilosConReintentoProgramado.has(hiloId)) return;
    hilosConReintentoProgramado.add(hiloId);
    setTimeout(() => {
      hilosConReintentoProgramado.delete(hiloId);
      if (hiloAbiertoId !== hiloId || mensajesHiloId === hiloId) return; // ya no aplica, o ya se resolvio por otra via
      if (hilosCargando.has(hiloId)) { programarReintentoCarga(hiloId); return; }
      cargarMensajes(hiloId).then(exito => { if (exito && hiloAbiertoId === hiloId) pintarDetalle(); });
    }, 3000);
  }

  function pintarDetalle() {
    const cont = $('#nxWaDetalle'); if (!cont) return;
    const detailCol = cont.closest('.nxWaDetailCol');
    if (detailCol) detailCol.classList.toggle('has-open', !!hiloAbiertoId);
    if (!hiloAbiertoId) { ultimoRenderHiloId = null; cont.innerHTML = '<div class="nxWaEmpty">Selecciona una conversación.</div>'; return; }
    const h = hilos.find(x => x.id === hiloAbiertoId);
    const cliente = h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
    const ventanaAbierta = h?.ultimo_inbound_at && (Date.now() - new Date(h.ultimo_inbound_at).getTime()) < 24 * 3600000;
    const nombreCabecera = esc(cliente?.nom || h?.nombre_perfil || h?.telefono_e164 || '');

    // "mensajes" es un estado global compartido por TODOS los hilos -- solo es seguro pintarlo
    // cuando "mensajesHiloId" (puesto por cargarMensajes exclusivamente al escribir datos
    // frescos y vigentes) coincide con el hilo que esta abierto ahora mismo. Chequearlo aca
    // adentro, una sola vez, evita depender de que CADA lugar que llama a pintar()/
    // pintarDetalle() se acuerde de no hacerlo mientras la carga sigue en vuelo.
    if (mensajesHiloId !== hiloAbiertoId) {
      if (ultimoRenderHiloId !== hiloAbiertoId) {
        cont.innerHTML = `<div class="nxWaHead">${nombreCabecera}</div><div class="nxWaMsgs"><div class="nxWaEmpty">Cargando…</div></div>`;
        ultimoRenderHiloId = hiloAbiertoId;
      }
      programarReintentoCarga(hiloAbiertoId);
      return;
    }

    // Fix 2026-09-07, tercera y ultima pasada de este mismo dia -- las dos anteriores intentaron
    // evitar el render completo con logica de diffing (prefijos de ids, luego huellas por
    // mensaje) para no destruir el <input> del composer en cada evento de Realtime. Ambas,
    // revisadas por agentes, terminaron introduciendo bugs mas graves que el original. Ahora
    // siempre se re-renderiza completo, pero se preserva a mano el texto/foco/cursor del
    // composer y la posicion del scroll a traves del rewrite -- lo unico que de verdad le
    // importa al agente, y mucho mas simple de verificar sin bugs.
    const inputPrevio = $('#nxWaTexto');
    const teniaFoco = document.activeElement === inputPrevio;
    const valorPrevio = inputPrevio ? inputPrevio.value : '';
    const cursorPrevio = teniaFoco && inputPrevio ? [inputPrevio.selectionStart, inputPrevio.selectionEnd] : null;
    const boxPrevio = $('#nxWaMsgsBox');
    const estabaAlFondo = boxPrevio ? (boxPrevio.scrollTop + boxPrevio.clientHeight >= boxPrevio.scrollHeight - 40) : true;

    const filas = mensajes.map(m => `<div class="nxWaBub ${m.direccion}">${burbujaMedia(m)}${m.cuerpo ? esc(m.cuerpo) : ''}</div>`).join('') || '<div class="nxWaEmpty">Sin mensajes todavía.</div>';
    cont.innerHTML = `<div class="nxWaHead">${nombreCabecera}</div>
      <div class="nxWaMsgs" id="nxWaMsgsBox">${filas}</div>
      ${ventanaAbierta
        ? `<div class="nxWaComposer"><input id="nxWaTexto" ${hiloEnviosEnVuelo.has(hiloAbiertoId) ? 'disabled' : ''} placeholder="Escribe un mensaje…" onkeydown="if(event.key==='Enter')nxWaEnviar()"><button onclick="nxWaEnviar()"><i class="ti ti-send"></i></button></div>`
        : `<div class="nxWaCerrada">Pasaron más de 24h desde el último mensaje del cliente — espera a que vuelva a escribir para poder responder con texto libre.</div>`}`;

    const nuevoBox = $('#nxWaMsgsBox');
    if (nuevoBox) nuevoBox.scrollTop = estabaAlFondo ? nuevoBox.scrollHeight : boxPrevio.scrollTop;

    const nuevoInput = $('#nxWaTexto');
    if (nuevoInput) {
      if (valorPrevio) nuevoInput.value = valorPrevio;
      if (teniaFoco) {
        nuevoInput.focus();
        const pos = cursorPrevio || [nuevoInput.value.length, nuevoInput.value.length];
        nuevoInput.setSelectionRange(pos[0], pos[1]);
      }
    }

    ultimoRenderHiloId = hiloAbiertoId;
  }

  window.nxWaEnviar = async function () {
    const inp = $('#nxWaTexto'); if (!inp) return;
    const texto = inp.value.trim(); if (!texto) return;
    const hiloDestino = hiloAbiertoId; if (!hiloDestino) return;
    // "hiloEnviosEnVuelo" es el candado real contra un doble envio -- a diferencia de
    // inp.disabled (que pintarDetalle() puede resucitar sin querer si algun evento de Realtime
    // de OTRO hilo cualquiera fuerza un re-render mientras este envio sigue en vuelo), esta marca
    // vive fuera del DOM y pintarDetalle() la consulta para decidir si el <input> nace
    // deshabilitado en cada render, sin importar cuantas veces se repinte mientras tanto.
    if (hiloEnviosEnVuelo.has(hiloDestino)) return;
    hiloEnviosEnVuelo.add(hiloDestino);
    // Reservar el turno de este hilo invalida cualquier carga vieja y colgada del mismo hilo que
    // pudiera resolver durante el round-trip del envio y pisar "mensajes" con datos de antes de
    // mandar este mensaje.
    marcarSolicitudCarga(hiloDestino);
    inp.value = ''; inp.disabled = true;
    const A = api();
    // pintarDetalle() siempre re-renderiza completo -- si el usuario cambia de hilo mientras este
    // envio sigue en vuelo, "inp" queda desconectado del documento. Estas dos funciones vuelven a
    // buscar el <input> VIGENTE (y solo si el hilo de destino sigue siendo el que esta abierto)
    // en vez de seguir usando esa referencia vieja, que de otro modo perdia el texto sin enviar en
    // silencio y dejaba el foco sin restaurar despues de cada envio exitoso.
    const restaurarTexto = () => { if (hiloAbiertoId === hiloDestino) { const actual = $('#nxWaTexto'); if (actual) actual.value = texto; } };
    const reactivarComposer = () => { if (hiloAbiertoId === hiloDestino) { const actual = $('#nxWaTexto'); if (actual) { actual.disabled = false; actual.focus(); } } };
    try {
      const r = await fetch(`${A.url}/functions/v1/whatsapp-inbox-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ hilo_id: hiloDestino, mensaje: texto })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { toast('err', 'No se pudo enviar', d.mensaje || d.error || ''); restaurarTexto(); }
      else { if (hiloAbiertoId === hiloDestino) { await cargarMensajes(hiloDestino); pintarDetalle(); } await cargar(); }
    } catch (e) { toast('err', 'No se pudo enviar', String(e && e.message || e)); restaurarTexto(); }
    hiloEnviosEnVuelo.delete(hiloDestino);
    reactivarComposer();
  };

  // ── Tiempo real ────────────────────────────────────────────────────────
  async function iniciarRealtime() {
    if (sb) return;
    try {
      if (!window.supabase) await cargarSDK();
      const A = api(); if (!A || !window.supabase) return;
      sb = window.supabase.createClient(A.url, A.key);
      // Fix 2026-09-07: setAuth() es asincrono (hace un round-trip antes de que el socket quede
      // autenticado) -- sin el await, .channel().subscribe() de la linea de abajo se unia ANTES
      // de que la autenticacion terminara, asi que la suscripcion quedaba registrada con el
      // contexto anon por defecto. Como whatsapp_hilos/whatsapp_hilo_mensajes exigen
      // mi_rol() is not null via RLS, cada evento llegaba con {"errors":["Error 401:
      // Unauthorized"]} y sin datos -- confirmado en vivo leyendo realtime.subscription
      // (claims_role quedaba "anon" en vez de "authenticated"). Por eso nunca se veian mensajes
      // nuevos sin recargar la pagina a mano.
      if (A.token) { try { await sb.realtime.setAuth(A.token); } catch (e) { console.error('[WA Inbox] setAuth', e); } }
      let debounce = null;
      const refrescar = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { if ($('#v-waInbox.on')) cargar(); }, 400); };
      canal = sb.channel('nx-wa-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilos' }, refrescar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilo_mensajes' }, refrescar)
        .subscribe();
    } catch (e) { console.error('[WA Inbox] realtime', e); }
  }
  // Primera vez que este codigo usa el SDK de supabase-js en nexus-pro (el resto de la app
  // habla PostgREST/Storage a mano por fetch) -- solo hace falta aca, para Realtime
  // (postgres_changes), que si requiere el SDK. Build UMD: expone window.supabase.
  function cargarSDK() {
    return new Promise((resolve) => {
      if (window.supabase) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  // Otro wrap más de window.regAbono (ya conviven varios en esta app, ver
  // parches-seguros-base.js) -- solo cierra la revisión de bauche pendiente cuando
  // el pago se aplicó desde este inbox (window.__nxWaRevisionPendiente marcado en
  // nxWaAplicarBauche). No hace nada si el abono se registró por el flujo normal.
  function envolverRegAbono() {
    if (window.__nxWaRegAbonoWrap) return true;
    if (typeof window.regAbono !== 'function') return false;
    window.__nxWaRegAbonoWrap = true;
    const orig = window.regAbono;
    window.regAbono = async function () {
      const before = window._ultimoAbono;
      const r = await orig.apply(this, arguments);
      const after = window._ultimoAbono;
      if (after && after !== before && after.abonoId && window.__nxWaRevisionPendiente) {
        try { await window.nxWaResolverTrasAbono(after.abonoId, after.cliente); } catch (e) {}
      }
      return r;
    };
    return true;
  }

  function start() {
    css(); ensureMenu(); patchNav(); iniciarRealtime();
    let n = 0; const t = () => { n++; if (envolverRegAbono() || n > 120) return; setTimeout(t, 250); };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
