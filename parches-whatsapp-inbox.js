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
  // El objetivo de negocio Nº1 (REGLAMENTO §12, bajar días de atraso) sigue reflejado en el KPI,
  // el orden de pestañas y los colores de botón -- pero abrir directo en "Atrasado" por defecto
  // dejaba al agente viendo muy pocos contactos (solo 2 de 74) sin contexto. Vuelve a "Todos".
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
  const hilosRecordatorioEnVuelo = new Set();
  const urlFirmadaCache = new Map();
  const urlFirmadaEnVuelo = new Map();
  const borradoresPorHilo = new Map();
  let respuestaActiva = null;
  let busquedaChat = { activa: false, q: '', idx: 0, ids: [] };
  let nxWaMenuTimer = null;
  let nxWaSwipe = null;
  const hilosConScrollInicial = new Set();
  const hilosPegadosAlFondo = new Set();
  let nxWaIgnorarScrollHasta = 0;
  // Reportado 2026-09-08: los reintentos con setTimeout fijos para "pegar" el chat al fondo
  // cuando una foto/video termina de cargar no cubren todos los casos reales -- en una conexión
  // lenta o con varios adjuntos en el mismo hilo, el contenedor sigue creciendo después del
  // último reintento y el chat queda visualmente arriba del todo. Un ResizeObserver no depende
  // de adivinar CUÁNTO puede tardar cada adjunto: reacciona a CUALQUIER cambio real de altura del
  // contenedor, venga de una imagen, un video, una fuente que carga tarde, etc.
  let nxWaMsgsResizeObs = null;

  function css() {
    if ($('#nxWaInboxCss')) return;
    const s = document.createElement('style'); s.id = 'nxWaInboxCss'; s.textContent = `
#v-waInbox{--wa-b:#2563eb;--wa-b2:#0f766e;--wa-green:#25d366;--wa-soft:#eff6ff;--wa-line:rgba(203,213,225,.72);font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;min-height:100%;padding:0 0 18px;background:linear-gradient(180deg,#f8fbff 0%,#eef6ff 48%,#f8fafc 100%)}
#v-waInbox .nxCrmHomeHead{position:relative;margin:0 0 12px;padding:15px 16px 17px;border:1px solid rgba(255,255,255,.92);border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(239,246,255,.92));box-shadow:0 18px 48px -38px rgba(15,23,42,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:hidden}
#v-waInbox .nxCrmHomeHead:after{content:"";position:absolute;left:16px;right:16px;bottom:0;height:3px;border-radius:999px;background:linear-gradient(90deg,var(--wa-green),var(--wa-b),var(--wa-b2));opacity:.92}
#v-waInbox .nxCrmHomeHead h1{font-size:25px;line-height:1.06;margin:4px 0 5px;font-weight:900;letter-spacing:0;color:#0f172a}
#v-waInbox .nxCrmHomeHead p{max-width:560px;margin:0;font-size:10.5px;line-height:1.35;color:#475569}
#v-waInbox .nxCrmHomeBadge{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:6px 10px;border-radius:999px;background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.22);color:#047857;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.03em}
#v-waInbox .nxWaShell{display:grid;grid-template-columns:minmax(292px,350px) minmax(0,1fr);gap:12px;height:calc(100vh - 168px);min-height:520px}
#v-waInbox .nxWaCol{background:rgba(255,255,255,.92);border:1px solid rgba(255,255,255,.9);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 54px -38px rgba(15,23,42,.7);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
#v-waInbox .nxWaListCol{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.88))}
#v-waInbox .nxWaListScroll{overflow-y:auto;flex:1}
#v-waInbox .nxWaRow{display:flex;gap:10px;padding:11px 12px;border-bottom:1px solid rgba(226,232,240,.72);cursor:pointer;position:relative;transition:background .16s ease,transform .16s ease,box-shadow .16s ease}
#v-waInbox .nxWaRow:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:999px;background:transparent}
#v-waInbox .nxWaRow:hover{background:rgba(248,250,252,.9);transform:translateX(2px)}
#v-waInbox .nxWaRow.on{background:linear-gradient(90deg,rgba(37,211,102,.13),rgba(37,99,235,.08));box-shadow:inset 0 0 0 1px rgba(37,99,235,.06)}
#v-waInbox .nxWaRow.on:before{background:linear-gradient(180deg,var(--wa-green),var(--wa-b))}
#v-waInbox .nxWaAv{width:38px;height:38px;border-radius:15px;background:linear-gradient(135deg,#dcfce7,#dbeafe);color:#1d4ed8;display:grid;place-items:center;font-size:11px;font-weight:900;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)}
#v-waInbox .nxWaWho{min-width:0;flex:1}
#v-waInbox .nxWaWho b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0f172a}
#v-waInbox .nxWaWho span{display:block;font-size:9.5px;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#v-waInbox .nxWaRowMeta{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:42px}
#v-waInbox .nxWaTime{font-size:8.5px;color:#94a3b8;font-weight:800;white-space:nowrap}
#v-waInbox .nxWaBadge{background:#16a34a;color:#fff;border-radius:999px;font-size:8.5px;font-weight:900;padding:2px 6px;flex:none;box-shadow:0 8px 18px -12px rgba(22,163,74,.9)}
#v-waInbox .nxWaDetalle{display:flex;flex-direction:column;height:100%}
#v-waInbox .nxWaDetalle.prep-bottom{opacity:0}
#v-waInbox .nxWaHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(226,232,240,.82);font-size:11px;font-weight:900;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.92));color:#0f172a;box-shadow:0 12px 24px -24px rgba(15,23,42,.75);z-index:2}
#v-waInbox .nxWaMsgs{flex:1;overflow-y:auto;overflow-anchor:none;padding:16px 14px 14px;display:flex;flex-direction:column;gap:7px;background:linear-gradient(180deg,rgba(239,246,255,.86),rgba(248,250,252,.96)),radial-gradient(circle at 10% 15%,rgba(37,211,102,.08),transparent 26%),radial-gradient(circle at 82% 8%,rgba(37,99,235,.08),transparent 24%)}
#v-waInbox .nxWaMsgs.prep-bottom{visibility:hidden;pointer-events:none;scroll-behavior:auto}
#v-waInbox .nxWaBub{max-width:74%;padding:8px 10px 6px;border-radius:15px;font-size:11.5px;line-height:1.43;box-shadow:0 13px 26px -23px rgba(15,23,42,.78)}
#v-waInbox .nxWaBub.in{align-self:flex-start;background:rgba(255,255,255,.97);border:1px solid rgba(226,232,240,.92);border-top-left-radius:6px}
#v-waInbox .nxWaBub.out{align-self:flex-end;background:linear-gradient(135deg,#dcfce7,#d9f99d);border:1px solid rgba(34,197,94,.18);border-top-right-radius:6px}
#v-waInbox .nxWaBubWrap.diff-prev.in .nxWaBub:before{content:"";position:absolute;left:-5px;top:0;border-top:8px solid rgba(255,255,255,.97);border-left:6px solid transparent}
#v-waInbox .nxWaBubWrap.diff-prev.out .nxWaBub:before{content:"";position:absolute;right:-5px;top:0;border-top:8px solid #d9f99d;border-right:6px solid transparent}
#v-waInbox .nxWaBub img{max-width:220px;border-radius:12px;display:block;cursor:pointer}
#v-waInbox .nxWaHeadMain{min-width:0;display:flex;align-items:center;gap:8px}
#v-waInbox .nxWaBackMob{display:none}
#v-waInbox .nxWaHeadAvatar{width:36px;height:36px;border-radius:14px;background:linear-gradient(135deg,#25d366,#2563eb);color:#fff;display:grid;place-items:center;font-size:10.5px;font-weight:900;flex:none}
#v-waInbox .nxWaHeadText{min-width:0}
#v-waInbox .nxWaHeadName{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:#0f172a}
#v-waInbox .nxWaHeadSub{display:block;margin-top:2px;font-size:8.5px;font-weight:800;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaHeadAct{border:1px solid #dbe3ee;background:#fff;color:#1d4ed8;border-radius:13px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
#v-waInbox .nxWaHeadAct:hover{transform:translateY(-1px);box-shadow:0 14px 24px -20px rgba(15,23,42,.7);background:#f8fafc}
#v-waInbox .nxWaSearchBar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--wa-line);background:rgba(248,250,252,.96)}
#v-waInbox .nxWaSearchBar input{flex:1;min-width:0;border:1px solid #dbe3ee;border-radius:999px;padding:8px 11px;font:inherit;font-size:10.5px;outline:none}
#v-waInbox .nxWaSearchBar button{border:1px solid #dbe3ee;background:#fff;color:#1d4ed8;border-radius:11px;height:30px;min-width:30px;font:inherit;font-weight:900;cursor:pointer}
#v-waInbox .nxWaBubWrap{display:flex;position:relative;width:100%;touch-action:pan-y}
#v-waInbox .nxWaBubWrap.in{justify-content:flex-start}
#v-waInbox .nxWaBubWrap.out{justify-content:flex-end}
#v-waInbox .nxWaBubWrap.same-prev{margin-top:-5px}
#v-waInbox .nxWaBubWrap.diff-prev{margin-top:5px}
#v-waInbox .nxWaBub{position:relative;white-space:pre-wrap;word-break:break-word}
#v-waInbox .nxWaBub.hit{outline:2px solid rgba(37,99,235,.38);box-shadow:0 0 0 5px rgba(37,99,235,.12)}
#v-waInbox .nxWaBubMenu{position:absolute;top:-8px;right:6px;border:1px solid #dbe3ee;background:rgba(255,255,255,.96);color:#64748b;border-radius:999px;width:24px;height:24px;display:grid;place-items:center;opacity:0;cursor:pointer;box-shadow:0 12px 24px -18px rgba(15,23,42,.7)}
#v-waInbox .nxWaBubWrap.in .nxWaBubMenu{right:auto;left:6px}
#v-waInbox .nxWaBubWrap:hover .nxWaBubMenu{opacity:1}
#v-waInbox .nxWaQuote{border-left:3px solid rgba(37,99,235,.5);background:rgba(255,255,255,.58);border-radius:9px;padding:5px 7px;margin-bottom:5px;font-size:9.5px;color:#475569;cursor:pointer}
#v-waInbox .nxWaQuote b{display:block;color:#1d4ed8;font-size:9px;margin-bottom:1px}
#v-waInbox .nxWaBubMeta{display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:3px;font-size:8.5px;color:#64748b}
#v-waInbox .nxWaBub.out .nxWaBubMeta{color:#4b8563}
#v-waInbox .nxWaRetry{border:0;background:#fee2e2;color:#b91c1c;border-radius:999px;padding:3px 7px;font:inherit;font-size:8px;font-weight:900;cursor:pointer}
#v-waInbox .nxWaComposerWrap{border-top:1px solid rgba(226,232,240,.86);background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.95));box-shadow:0 -18px 32px -32px rgba(15,23,42,.65);z-index:2;flex:none;padding-bottom:env(safe-area-inset-bottom)}
#v-waInbox .nxWaReplyBar{margin:8px 10px 0;padding:8px 10px;border-left:3px solid #25d366;border-radius:12px;background:#f8fafc;display:flex;align-items:center;gap:8px;font-size:10px;color:#475569}
#v-waInbox .nxWaReplyBar .tx{min-width:0;flex:1}
#v-waInbox .nxWaReplyBar b{display:block;color:#0f172a;font-size:10px}
#v-waInbox .nxWaReplyBar span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaReplyBar button{border:0;background:transparent;color:#64748b;font-size:18px;cursor:pointer}
#v-waInbox .nxWaComposer{display:flex;align-items:flex-end;gap:7px;padding:10px;background:transparent}
#v-waInbox .nxWaComposer textarea{flex:1;min-width:0;max-height:96px;resize:none;overflow-y:auto;border:1px solid #dbe3ee;border-radius:20px;padding:10px 13px;font:inherit;font-size:16px;line-height:1.35;outline:none;background:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
#v-waInbox .nxWaComposer textarea:focus{border-color:rgba(37,99,235,.55);box-shadow:0 0 0 4px rgba(37,99,235,.1)}
#v-waInbox .nxWaComposer button{width:42px;height:42px;border:0;background:linear-gradient(135deg,#25d366,#2563eb);color:#fff;border-radius:16px;font-weight:900;cursor:pointer;display:grid;place-items:center;flex:none;box-shadow:0 14px 28px -20px rgba(37,99,235,.85);transition:transform .16s ease,filter .16s ease}
#v-waInbox .nxWaComposer button:hover{transform:translateY(-1px);filter:saturate(1.08)}
#v-waInbox .nxWaComposer .nxWaIconBtn{background:#fff;color:#1d4ed8;border:1px solid #dbe3ee;box-shadow:none}
.nxWaCtx{position:fixed;z-index:10000;background:#fff;border:1px solid #dbe3ee;border-radius:14px;box-shadow:0 20px 50px -30px rgba(15,23,42,.8);padding:6px;min-width:150px}
.nxWaCtx button{display:flex;align-items:center;gap:7px;width:100%;border:0;background:#fff;border-radius:10px;padding:8px 9px;font:inherit;font-size:10.5px;font-weight:800;color:#0f172a;cursor:pointer;text-align:left}
.nxWaCtx button:hover{background:#f1f5f9}
#v-waInbox .nxWaCerrada{padding:10px;text-align:center;font-size:10.5px;color:#92400e;background:#fff7ed;border-top:1px solid #fed7aa}
#v-waInbox .nxWaBtnRecordatorio{margin-top:8px;border:0;border-radius:999px;padding:8px 14px;font-size:10.5px;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#25d366,#128c7e);display:inline-flex;align-items:center;gap:6px}
#v-waInbox .nxWaBtnRecordatorio:disabled{opacity:.6;cursor:default}
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
#v-waInbox .nxWaContacts{margin-top:10px;border:1px solid rgba(226,232,240,.9);border-radius:16px;background:rgba(255,255,255,.82);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.95)}
#v-waInbox .nxWaContactsTop{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 8px;border-bottom:1px solid rgba(226,232,240,.82);background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.86))}
#v-waInbox .nxWaContactsTop b{font-size:11.5px;color:#0f172a}
#v-waInbox .nxWaContactsTop span{font-size:8.5px;color:#64748b}
#v-waInbox .nxWaContactsKpi{display:flex;align-items:center;gap:6px;flex:none}
#v-waInbox .nxWaContactsKpi span{display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(226,232,240,.9);border-radius:999px;background:#fff;padding:5px 8px;font-size:8px;font-weight:900;color:#475569}
#v-waInbox .nxWaContactsKpi span.kpi-atraso{border-color:rgba(220,38,38,.3);background:#fff1f2;color:#dc2626}
#v-waInbox .nxWaContactTabs{display:flex;gap:6px;overflow-x:auto;padding:9px 10px;scrollbar-width:none}
#v-waInbox .nxWaContactTabs::-webkit-scrollbar{display:none}
#v-waInbox .nxWaContactTabs button{height:30px;flex:0 0 auto;border:1px solid #dbe3ee;border-radius:999px;background:#f1f5f9;padding:0 12px;font:inherit;font-size:8.5px;font-weight:900;color:#475569;cursor:pointer;box-shadow:0 10px 18px -18px rgba(15,23,42,.55);transition:transform .12s ease,box-shadow .12s ease}
#v-waInbox .nxWaContactTabs button:hover{transform:translateY(-1px)}
#v-waInbox .nxWaContactTabs button.on{background:linear-gradient(135deg,#0f172a,#1d4ed8);border-color:#0f172a;color:#fff;box-shadow:0 12px 22px -16px rgba(29,78,216,.55)}
#v-waInbox .nxWaContactList{display:flex;flex-direction:column;gap:12px;padding:4px 10px 12px;max-height:340px;overflow:auto;background:#f4f6fa}
#v-waInbox .nxWaContact{display:flex;flex-wrap:nowrap;align-items:center;gap:12px;min-width:0;border:1px solid rgba(226,232,240,.6);border-radius:18px;background:#fff;padding:12px 14px;box-shadow:0 10px 22px -18px rgba(15,23,42,.22);cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
#v-waInbox .nxWaContact:hover{transform:translateY(-1px);box-shadow:0 14px 26px -16px rgba(15,23,42,.28)}
#v-waInbox .nxWaContact .av{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex:none;background:linear-gradient(135deg,#e0e7ff,#eef2ff);color:#4338ca;font-size:11px;font-weight:800}
#v-waInbox .nxWaContact .av.av-err{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626}
#v-waInbox .nxWaContact .av.av-warn{background:linear-gradient(135deg,#ffedd5,#fed7aa);color:#c2410c}
#v-waInbox .nxWaContact .av.av-ok{background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#059669}
#v-waInbox .nxWaContact .tx{min-width:0;flex:1;overflow:hidden}
#v-waInbox .nxWaContact .tx b{display:block;font-size:11.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaContact .tx span{display:block;font-size:9px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#v-waInbox .nxWaContact .st{flex:none;font-size:7.5px;font-weight:900;border-radius:999px;padding:4px 8px;background:#f1f5f9;color:#64748b;white-space:nowrap}
#v-waInbox .nxWaContact .st.err{background:#fff1f2;color:#dc2626}
#v-waInbox .nxWaContact .st.warn{background:#fff7ed;color:#d97706}
#v-waInbox .nxWaContact .st.ok{background:#ecfdf5;color:#059669}
#v-waInbox .nxWaContact .chev{flex:none;font-size:14px;color:#cbd5e1}
#v-waInbox .nxWaContactsFoot{display:flex;gap:7px;flex-wrap:wrap;padding:10px;border-top:1px solid rgba(226,232,240,.82);background:rgba(248,250,252,.78)}
#v-waInbox .nxWaContactsFoot button{height:32px;border:1px solid #dbe3ee;border-radius:999px;background:#fff;padding:0 10px;font:inherit;font-size:8.5px;font-weight:900;color:#1d4ed8;cursor:pointer}
#v-waInbox .nxWaContactsFoot button.primary{background:#25d366;border-color:#25d366;color:#fff}
/* Grilla de iconos para las acciones masivas de Contactos -- reemplaza la fila de píldoras que
   quedaba saturada con 6-7 botones envueltos en cualquier orden. Se combina con .nxWaContactsFoot
   (no la reemplaza) para conservar el "sticky" + zona segura + detección de clic que ya dependen
   de esa clase en parches-whatsapp-visual-v5.js. */
#v-waInbox .nxWaContactsActGrid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:7px;flex-wrap:initial}
#v-waInbox .nxWaContactsActGrid button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:54px;width:auto;border-radius:12px;font-size:7.8px;line-height:1.2;text-align:center;padding:2px 4px;transition:transform .12s ease,box-shadow .12s ease}
#v-waInbox .nxWaContactsActGrid button:hover{transform:translateY(-1px);box-shadow:0 10px 20px -16px rgba(15,23,42,.5)}
#v-waInbox .nxWaContactsActGrid button i{font-size:16px}
#v-waInbox .nxWaContactsActGrid button.admin{color:#7c3aed;border-color:#e9d5ff;background:#faf5ff}
#v-waInbox .nxWaTag{display:inline-flex;align-items:center;gap:3px;margin-top:5px;padding:3px 6px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:8px;font-weight:900}
#v-waInbox .nxWaTag.err{background:#fff1f2;color:#dc2626}
#v-waInbox .nxWaTag.warn{background:#fff7ed;color:#d97706}
#v-waInbox .nxWaTag.ok{background:#ecfdf5;color:#059669}
#v-waInbox .nxWaEnvioMasivoOverlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.36);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
#v-waInbox .nxWaEnvioMasivoBox{width:min(100%,460px);max-height:min(82vh,620px);overflow-y:auto;border-radius:18px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 30px 80px -46px rgba(15,23,42,.9)!important}
#v-waInbox .nxWaEnvioMasivoBox h3{margin:0 0 6px;font-size:13px;color:#0f172a;font-weight:900}
#v-waInbox .nxWaEnvioMasivoBox>p{margin:0 0 12px;font-size:10.5px;color:#475569;line-height:1.4}
#v-waInbox .nxWaEnvioMasivoActs{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
#v-waInbox .nxWaEnvioMasivoBarra{height:8px;border-radius:999px;background:#e5eaf2;overflow:hidden}
#v-waInbox .nxWaEnvioMasivoBarraRelleno{height:100%;background:linear-gradient(90deg,#25d366,var(--wa-b),var(--wa-b2))}
#v-waInbox .nxWaEnvioMasivoFallos{margin-top:10px;display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto}
@media(max-width:760px){
  #v-waInbox{padding:0 10px 16px;background:linear-gradient(180deg,rgba(248,251,255,.97),rgba(246,248,251,.92))}
  #v-waInbox .nxCrmHomeHead{padding:13px 13px 16px;border-radius:16px;margin-bottom:10px}
  #v-waInbox .nxCrmHomeHead h1{font-size:24px}
  #v-waInbox .nxCrmHomeHead p{font-size:10px;max-width:270px}
  #v-waInbox #nxWaPendPanel{margin-bottom:10px}
  #v-waInbox .nxWaShell{display:flex;flex-direction:column;height:auto;min-height:0;gap:10px}
  #v-waInbox .nxWaCol{border-radius:16px;min-height:220px;max-height:none;box-shadow:0 16px 42px -34px rgba(15,23,42,.68)}
  #v-waInbox .nxWaListCol{min-height:280px;max-height:44vh}
  #v-waInbox .nxWaDetailCol{min-height:62vh}
  #v-waInbox .nxWaDetailCol:not(.has-open){display:none}
  #v-waInbox .nxWaBackMob{display:grid}
  #v-waInbox .nxWaRow{padding:12px 10px}
  #v-waInbox .nxWaHead{padding:9px 10px}
  #v-waInbox .nxWaHeadAvatar{width:34px;height:34px;border-radius:13px}
  #v-waInbox .nxWaMsgs{padding:13px 10px 12px;gap:7px}
  #v-waInbox .nxWaBub{max-width:87%;font-size:12px}
  #v-waInbox .nxWaComposer{padding:8px;gap:6px}
  #v-waInbox .nxWaComposer button{width:40px;height:40px;border-radius:15px}
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
  #v-waInbox .nxWaContactsTop{align-items:flex-start}
  #v-waInbox .nxWaContactsKpi{display:none}
  #v-waInbox .nxWaContactTabs{padding:8px 9px}
  #v-waInbox .nxWaContactList{grid-template-columns:1fr;max-height:230px;overflow:auto;padding:0 9px}
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

  // Botón "WhatsApp" de la ficha del cliente (index.html) -- en vez de abrir wa.me con el
  // WhatsApp personal del agente, abre el hilo de ESE cliente en el Buzón real de nexus-pro. Si
  // el cliente nunca escribió antes (no existe hilo todavía), whatsapp_hilo_por_cliente lo crea
  // vacío -- el agente ve la conversación pero el cuadro de texto libre queda cerrado hasta que
  // el cliente escriba primero (regla de Meta); ahí puede mandarle una plantilla para reabrirla.
  window.nxAbrirWhatsAppDeCliente = async function (clienteId) {
    const A = api(); if (!A?.post) return;
    let hiloId;
    try {
      hiloId = await A.post('rpc/whatsapp_hilo_por_cliente', { p_cliente_id: clienteId });
    } catch (e) {
      try { toast('err', 'No se pudo abrir WhatsApp', String(e && e.message || e)); } catch (e2) {}
      return;
    }
    if (!hiloId) { try { toast('err', 'No se pudo abrir WhatsApp'); } catch (e) {} return; }
    try { if (typeof cerrarClientSummary === 'function') cerrarClientSummary(); } catch (e) {}
    try { nav('waInbox', null); } catch (e) {}
    await window.nxWaAbrirHilo(hiloId);
  };

  // Tocar un contacto en el panel "Contactos WhatsApp" abre su chat -- reusa el mismo camino que
  // el botón de la ficha del cliente, y cierra el panel/overlay para que se vea la conversación.
  window.nxWaAbrirContacto = async function (clienteId) {
    try { if (typeof window.nxWaVisualCerrarPanel === 'function') window.nxWaVisualCerrarPanel(); } catch (e) {}
    await window.nxAbrirWhatsAppDeCliente(clienteId);
  };

  // Botón "Enviar recordatorio de pago ahora" -- aparece SOLO cuando la ventana de 24h de Meta
  // está cerrada (nadie puede mandarle texto libre a ese cliente todavía). Dispara la MISMA
  // plantilla que manda el ciclo automático (whatsapp_detectar_atrasados), pero ahora mismo, sin
  // esperar los dias_entre_avisos_atraso -- el monto/meses de atraso los recalcula el propio RPC
  // en el servidor, este botón nunca decide ni envía esas cifras.
  window.nxWaRecordatorioManual = async function (clienteId, hiloId, btn) {
    if (hilosRecordatorioEnVuelo.has(hiloId)) return;
    hilosRecordatorioEnVuelo.add(hiloId);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-brand-whatsapp"></i> Enviando…'; }
    const A = api();
    try {
      const r = await A.post('rpc/whatsapp_recordatorio_manual', { p_cliente_id: clienteId });
      toast('ok', 'Recordatorio en camino', r?.monto ? `Se avisó sobre ${r.meses} mes(es) atrasado(s)` : '');
    } catch (e) {
      toast('err', 'No se pudo enviar el recordatorio', String(e && e.message || e));
    } finally {
      hilosRecordatorioEnVuelo.delete(hiloId);
      if (hiloAbiertoId === hiloId) pintarDetalle();
    }
  };

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
  function resumenMensaje(m) {
    if (!m) return '';
    if (m.cuerpo) return String(m.cuerpo).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (m.tipo_contenido === 'imagen') return 'Imagen';
    if (m.tipo_contenido === 'audio') return 'Audio';
    if (m.tipo_contenido === 'video') return 'Video';
    if (m.media_path) return 'Documento adjunto';
    return 'Mensaje';
  }
  function autorMensaje(m) { return m?.direccion === 'out' ? 'Tú' : 'Cliente'; }
  function guardarBorradorActual() {
    if (!hiloAbiertoId) return;
    const inp = $('#nxWaTexto');
    if (!inp) return;
    borradoresPorHilo.set(hiloAbiertoId, inp.value || '');
  }
  function cabeceraChat(nombreCabecera, subCabecera, inicialesCabecera) {
    return `<div class="nxWaHead"><div class="nxWaHeadMain"><button class="nxWaHeadAct nxWaBackMob" onclick="nxWaCerrarDetalleMob()"><i class="ti ti-arrow-left"></i></button><div class="nxWaHeadAvatar">${esc(inicialesCabecera || '?')}</div><div class="nxWaHeadText"><span class="nxWaHeadName">${nombreCabecera}</span><span class="nxWaHeadSub">${esc(subCabecera || '')}</span></div></div><button class="nxWaHeadAct" onclick="nxWaToggleBuscar()" title="Buscar en este chat"><i class="ti ti-search"></i></button></div>`;
  }
  function barraBusquedaChat() {
    if (!busquedaChat.activa) return '';
    const total = busquedaChat.ids.length;
    const pos = total ? busquedaChat.idx + 1 : 0;
    return `<div class="nxWaSearchBar"><input id="nxWaSearchInput" value="${esc(busquedaChat.q)}" placeholder="Buscar mensajes…" oninput="nxWaBuscarEnChat(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();nxWaSearchGo(event.shiftKey?-1:1)}"><span style="font-size:9px;color:#64748b;min-width:42px;text-align:center">${pos}/${total}</span><button onclick="nxWaSearchGo(-1)"><i class="ti ti-chevron-up"></i></button><button onclick="nxWaSearchGo(1)"><i class="ti ti-chevron-down"></i></button><button onclick="nxWaToggleBuscar(false)"><i class="ti ti-x"></i></button></div>`;
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
  function waFacturasCliente(c) {
    try { return ((window.ST || ST || {}).facturas || []).filter(f => String(f.cliente_id) === String(c?.id) && f.estado !== 'Anulada'); } catch (e) { return []; }
  }
  function waMesesAtraso(c) {
    try {
      const mc = typeof mesCorte === 'function' ? mesCorte() : { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() };
      const hoyKey = `${mc.anio}-${String(mc.mes).padStart(2, '0')}`;
      const saldo = typeof _saldoFacturasCliente === 'function' ? _saldoFacturasCliente(String(c.id)) : {};
      return waFacturasCliente(c).filter(f => f.periodo && f.periodo < hoyKey && (saldo[f.id] ?? Number(f.total || 0)) > 0.009).length;
    } catch (e) { return 0; }
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
    if (ep.est === 'vencida' || ep.est === 'gracia') return { key: 'continuidad', label: 'Por vencer', cls: 'warn' };
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
    const continuidad = hilos.filter(h => { const ep = waEstadoPoliza(clienteDeHilo(h)); return ep.est === 'vencida' || ep.est === 'gracia'; }).length;
    const kpi = (key, label, val, sub) => `<button class="nxWaProKpi ${waFiltro === key ? 'on' : ''}" onclick="nxWaFiltro('${key}')"><div class="l">${esc(label)}</div><div class="v">${val}</div><div class="s">${esc(sub)}</div></button>`;
    host.innerHTML = `<section class="nxWaPro">
      <div class="nxWaProHead"><div><h3>Centro WhatsApp Pro</h3><p>Prioriza clientes por factura, cobro, póliza por vencer, bauches y conversaciones sin vincular.</p></div></div>
      <div class="nxWaProGrid">
        ${kpi('todos', 'Conversaciones', hilos.length, conCliente.length + ' vinculadas')}
        ${kpi('no_leidos', 'Sin responder', noLeidos, 'mensajes nuevos')}
        ${kpi('cobro', 'Cobranza', conCobro, 'clientes con balance')}
        ${kpi('continuidad', 'Póliza', continuidad, 'por vencer')}
        ${kpi('sin_cliente', 'Sin vincular', sinCliente, 'telefono suelto')}
      </div>
      <div class="nxWaProActs">
        <button class="primary" onclick="nxWaAbrirCobranza()"><i class="ti ti-cash"></i> Cobranza</button>
        <button onclick="nxWaAbrirPolizasPorVencer()"><i class="ti ti-calendar-event"></i> Pólizas por vencer</button>
        <button onclick="nxWaAbrirMasivoSegmento('deuda')"><i class="ti ti-send"></i> WA deuda</button>
        <button onclick="nxWaFiltro('bauche')"><i class="ti ti-receipt"></i> Bauches ${conBauche}</button>
      </div>
      ${waContactosHTML()}
    </section>`;
  }

  function waContactos() {
    return clientes().filter(c => c && c.activo !== false && c.wa).map(c => {
      const deuda = waPendienteCliente(c);
      const meses = waMesesAtraso(c);
      const ep = waEstadoPoliza(c);
      const continuidad = ep.est === 'vencida' || ep.est === 'gracia';
      const tieneFactura = waFacturasCliente(c).length > 0;
      let estado = { key: 'aldia', label: 'Al dia', cls: 'ok' };
      if (meses >= 2) estado = { key: 'vencido', label: 'Vencido', cls: 'err' };
      else if (meses === 1) estado = { key: 'atrasado', label: 'Atrasado', cls: 'err' };
      else if (deuda > 0) estado = { key: 'deuda', label: 'Pendiente', cls: 'warn' };
      else if (continuidad) estado = { key: 'continuidad', label: 'Por vencer', cls: 'warn' };
      else if (tieneFactura) estado = { key: 'factura', label: 'Factura', cls: '' };
      return { c, deuda, meses, ep, estado };
    }).sort((a, b) => (b.deuda - a.deuda) || String(a.c.nom || '').localeCompare(String(b.c.nom || ''), 'es'));
  }
  function waContactosPor(tipo) {
    const all = waContactos();
    if (tipo === 'deuda') return all.filter(x => ['deuda', 'atrasado', 'vencido'].includes(x.estado.key));
    if (tipo === 'atrasado') return all.filter(x => x.estado.key === 'atrasado');
    if (tipo === 'vencido') return all.filter(x => x.estado.key === 'vencido');
    if (tipo === 'factura') return all.filter(x => x.estado.key === 'factura' || x.estado.key === 'deuda' || x.estado.key === 'atrasado' || x.estado.key === 'vencido');
    if (tipo === 'continuidad') return all.filter(x => x.estado.key === 'continuidad');
    if (tipo === 'aldia') return all.filter(x => x.estado.key === 'aldia');
    return all;
  }
  function waContactosHTML() {
    const all = waContactos();
    const data = waContactosPor(waContactFiltro);
    const count = k => waContactosPor(k).length;
    const tab = (k, label) => `<button class="${waContactFiltro === k ? 'on' : ''}" onclick="nxWaContactFiltro('${k}')">${esc(label)} ${count(k)}</button>`;
    const filas = data.slice(0, 14).map(x => {
      const c = x.c;
      const sub = [c.wa, c.plan, c.ars].filter(Boolean).join(' · ');
      const mesesTxt = x.meses > 0 ? `${x.meses} mes${x.meses === 1 ? '' : 'es'} atrasado` : '';
      const avCls = x.estado.cls ? `av-${x.estado.cls}` : '';
      return `<div class="nxWaContact" role="button" tabindex="0" aria-label="Abrir chat con ${esc(c.nom || 'cliente')}" onclick="nxWaAbrirContacto('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
        <div class="av ${avCls}">${esc(iniciales(c.nom))}</div>
        <div class="tx"><b>${esc(c.nom || 'Cliente')}</b><span>${esc(mesesTxt || sub || 'WhatsApp registrado')}</span></div>
        <span class="st ${x.estado.cls}">${esc(x.estado.label)}</span>
        <i class="ti ti-chevron-right chev" aria-hidden="true"></i>
      </div>`;
    }).join('') || '<div class="nxWaEmpty" style="grid-column:1/-1;padding:14px">No hay contactos en este segmento.</div>';
    const deudaCount = count('deuda'), atrasadoCount = count('atrasado'), vencidoCount = count('vencido');
    // KPI del objetivo Nº1 (REGLAMENTO §12): promedio real de meses de atraso entre los
    // genuinamente atrasados/vencidos -- no cuenta a quien solo debe el mes en curso.
    const conAtraso = all.filter(x => x.meses > 0);
    const promedioAtraso = conAtraso.length ? (conAtraso.reduce((s, x) => s + x.meses, 0) / conAtraso.length) : 0;
    const promedioAtrasoTxt = promedioAtraso ? promedioAtraso.toFixed(1) + ' mes prom. atraso' : 'sin atrasos';
    return `<div class="nxWaContacts" data-promedio-atraso="${esc(promedioAtrasoTxt)}" data-atrasados="${atrasadoCount + vencidoCount}">
      <div class="nxWaContactsTop"><div><b>Contactos WhatsApp</b><br><span>${data.length} en este segmento · ${all.length} clientes con número</span></div><div class="nxWaContactsKpi"><span class="kpi-atraso">${esc(promedioAtrasoTxt)}</span><span>${atrasadoCount + vencidoCount} atrasados</span><span>${deudaCount} con saldo</span></div></div>
      <div class="nxWaContactTabs">
        ${tab('atrasado', 'Atrasado')}
        ${tab('vencido', 'Vencido')}
        ${tab('deuda', 'Deuda')}
        ${tab('continuidad', 'Por vencer')}
        ${tab('todos', 'Todos')}
        ${tab('factura', 'Factura')}
        ${tab('aldia', 'Al dia')}
      </div>
      <div class="nxWaContactList">${filas}</div>
      <div class="nxWaContactsFoot nxWaContactsActGrid">
        <button class="primary" onclick="nxWaAbrirMasivoSegmento('atrasado')"><i class="ti ti-alert-triangle"></i>Recordar atrasados</button>
        <button class="primary" onclick="nxWaAbrirMasivoSegmento('deuda')"><i class="ti ti-cash"></i>Recordar deuda</button>
        <button onclick="nxWaAbrirMasivoSegmento('vencido')"><i class="ti ti-calendar-off"></i>Vencidos</button>
        <button onclick="nxWaAbrirMasivoSegmento('continuidad')"><i class="ti ti-shield-check"></i>Por vencer</button>
        <button onclick="nxWaAbrirMasivoSegmento('todos')"><i class="ti ti-send"></i>Factura a todos</button>
        <button onclick="nxWaAbrirMasivoSegmento('aldia')"><i class="ti ti-circle-check"></i>Al día</button>
        ${(sesion?.rol||'')==='admin'?'<button class="admin" onclick="nxWaAbrirNuevaPlantilla()"><i class="ti ti-file-plus"></i>Nueva plantilla</button>':''}
      </div>
    </div>`;
  }

  // Someter una plantilla nueva de WhatsApp Business a revisión de Meta -- solo admin, es una
  // acción rara/sensible (afecta el cupo y la reputación de plantillas de la cuenta real). Llama
  // a whatsapp-plantilla-crear (Edge Function nueva), que reusa el mismo ZERNIO_API_KEY ya
  // configurado -- así no hace falta entrar a Meta Business Manager a mano.
  window.nxWaAbrirNuevaPlantilla = function () {
    const overlay = document.createElement('div');
    overlay.id = 'nxWaNuevaPlantillaOverlay';
    overlay.className = 'nxWaEnvioMasivoOverlay';
    overlay.innerHTML = `<div class="nxWaEnvioMasivoBox nxWaPro">
      <h3>Nueva plantilla de WhatsApp</h3>
      <div class="fr"><label>Nombre (sin espacios, ej. saludo_inicial)</label><input id="nxWaPlNombre" placeholder="saludo_inicial"></div>
      <div class="fr"><label>Categoría</label>
        <select id="nxWaPlCategoria">
          <option value="UTILITY">UTILITY (transaccional)</option>
          <option value="MARKETING" selected>MARKETING (promocional)</option>
          <option value="AUTHENTICATION">AUTHENTICATION (código OTP)</option>
        </select>
      </div>
      <div class="fr"><label>Idioma</label><input id="nxWaPlIdioma" value="es"></div>
      <div class="fr"><label>Texto (usa {{1}}, {{2}}... para variables)</label><textarea id="nxWaPlTexto" rows="5" placeholder="Hola {{1}}, ..."></textarea></div>
      <div class="fr"><label>Ejemplo de cada variable, separados por punto y coma (;) y en orden ({{1}}, {{2}}...) — Meta lo exige para revisar. No uses comas dentro de un ejemplo (ej. montos).</label><input id="nxWaPlEjemplos" placeholder="Juan Pérez; 6500.00"></div>
      <div id="nxWaPlResultado" style="font-size:11px;margin:6px 0"></div>
      <div class="nxWaEnvioMasivoActs">
        <button class="btn bghost" onclick="_waCerrarNuevaPlantilla()">Cancelar</button>
        <button class="btn bwa" onclick="nxWaSometerPlantilla()">Someter a Meta</button>
      </div>
    </div>`;
    ensureView().appendChild(overlay);
  };

  window._waCerrarNuevaPlantilla = function () {
    const el = $('#nxWaNuevaPlantillaOverlay');
    if (el) el.remove();
  };

  window.nxWaSometerPlantilla = async function () {
    const nombre = ($('#nxWaPlNombre')?.value || '').trim();
    const categoria = $('#nxWaPlCategoria')?.value || 'UTILITY';
    const idioma = ($('#nxWaPlIdioma')?.value || 'es').trim();
    const texto = ($('#nxWaPlTexto')?.value || '').trim();
    const ejemplosTxt = ($('#nxWaPlEjemplos')?.value || '').trim();
    const resultDiv = $('#nxWaPlResultado');
    if (!nombre || !texto) { if (resultDiv) resultDiv.innerHTML = '<span style="color:#dc2626">Falta el nombre o el texto.</span>'; return; }
    // Meta exige un valor de ejemplo por cada {{n}} del cuerpo para poder revisar la plantilla --
    // sin esto, el envío queda "rechazado: formato no válido" sin decir cuál es el problema real
    // (confirmado en vivo 2026-09-08 con saludo_inicial/pago_confirmado_periodo).
    const numVariables = (texto.match(/\{\{\d+\}\}/g) || []).length;
    const ejemplos = ejemplosTxt ? ejemplosTxt.split(';').map(s => s.trim()).filter(Boolean) : [];
    if (numVariables > 0 && ejemplos.length !== numVariables) {
      if (resultDiv) resultDiv.innerHTML = `<span style="color:#dc2626">El texto tiene ${numVariables} variable(s) pero pusiste ${ejemplos.length} ejemplo(s) -- tienen que coincidir.</span>`;
      return;
    }
    const componente = { type: 'body', text: texto };
    if (numVariables > 0) componente.example = { body_text: [ejemplos] };
    if (resultDiv) resultDiv.innerHTML = 'Enviando a Meta…';
    const A = api(); if (!A) { if (resultDiv) resultDiv.innerHTML = '<span style="color:#dc2626">Sin conexión.</span>'; return; }
    try {
      const r = await fetch(`${A.url}/functions/v1/whatsapp-plantilla-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ name: nombre, category: categoria, language: idioma, components: [componente] }),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) {
        if (resultDiv) resultDiv.innerHTML = `<span style="color:#16a34a">Sometida a Meta correctamente. Estado: ${esc(JSON.stringify(d.data?.data || d.data || {}))}</span>`;
        try { toast('ok', 'Plantilla sometida', nombre); } catch (e) {}
      } else {
        if (resultDiv) resultDiv.innerHTML = `<span style="color:#dc2626">Zernio/Meta rechazó el envío: ${esc(JSON.stringify(d?.data || d || {}))}</span>`;
      }
    } catch (e) {
      if (resultDiv) resultDiv.innerHTML = `<span style="color:#dc2626">Error de red: ${esc(String(e && e.message || e))}</span>`;
    }
  };

  window.nxWaFiltro = function (f) { waFiltro = f || 'todos'; pintar(); };
  window.nxWaContactFiltro = function (f) { waContactFiltro = f || 'todos'; pintarProPanel(); };
  window.nxWaAbrirCobranza = function () { try { nav('facturas', null); setTimeout(() => { try { switchTab('cob'); } catch (e) {} }, 160); } catch (e) {} };
  window.nxWaAbrirPolizasPorVencer = function () { try { nav('polizas', null); } catch (e) {} };
  window.nxWaAbrirMasivoDeuda = function () {
    window.nxWaAbrirMasivoSegmento('deuda');
  };
  window.nxWaAbrirMasivoSegmento = function (tipo) {
    const mapa = { todos: 'factura', factura: 'factura', deuda: 'pago', atrasado: 'pago', vencido: 'pago', continuidad: 'vence', aldia: 'factura' };
    const lista = waContactosPor(tipo || 'todos');
    const ids = lista.map(x => x.c.id);
    if (!ids.length) { try { toast('warn', 'Sin contactos', 'No hay clientes con WhatsApp en este segmento'); } catch (e) {} return; }
    _waPintarConfirmacionEnvioMasivo(mapa[tipo] || 'factura', ids);
  };

  // ── Envío masivo automático (reemplaza el WA Masivo viejo de pestañas wa.me) ─────────────────
  // El progreso vive en la base de datos (whatsapp_envio_masivo_lotes/_destinatarios), no solo en
  // estas variables -- un refresco de página no pierde el progreso ni permite un doble envío,
  // porque la Edge Function siempre filtra por estado='pendiente' del lado del servidor. Estas
  // variables solo recuerdan CUÁL lote está activo y si ya hay un polling corriendo, para no
  // disparar dos loops en paralelo si el agente hace doble click.
  let _waLoteEnvioMasivoId = null;
  let _waPollingEnCurso = false;
  let _waConfirmacionPendiente = null;
  const TIPO_ENVIO_MASIVO_LEGIBLE = { factura: 'la factura generada', pago: 'un recordatorio de pago pendiente', vence: 'un aviso de póliza por vencer' };

  function _waPintarConfirmacionEnvioMasivo(tipo, clienteIds) {
    _waConfirmacionPendiente = { tipo, clienteIds };
    const overlay = document.createElement('div');
    overlay.id = 'nxWaEnvioMasivoOverlay';
    overlay.className = 'nxWaEnvioMasivoOverlay';
    overlay.innerHTML = `<div class="nxWaEnvioMasivoBox nxWaPro">
      <h3>Enviar por WhatsApp</h3>
      <p>${clienteIds.length} cliente${clienteIds.length === 1 ? '' : 's'} recibirá${clienteIds.length === 1 ? '' : 'n'} ${esc(TIPO_ENVIO_MASIVO_LEGIBLE[tipo] || tipo)} automáticamente, sin abrir ninguna ventana.</p>
      <div class="nxWaEnvioMasivoActs">
        <button class="btn bghost" onclick="_waCerrarPanelEnvioMasivo()">Cancelar</button>
        <button class="btn bwa" onclick="nxWaConfirmarEnvioMasivo()">Confirmar y enviar</button>
      </div>
    </div>`;
    ensureView().appendChild(overlay);
  }

  window.nxWaConfirmarEnvioMasivo = function () {
    if (!_waConfirmacionPendiente) return;
    const { tipo, clienteIds } = _waConfirmacionPendiente;
    _waConfirmacionPendiente = null;
    nxWaIniciarEnvioMasivo(tipo, clienteIds);
  };

  window.nxWaIniciarEnvioMasivo = async function (tipo, clienteIds) {
    const A = api(); if (!A?.post) return;
    _waPintarProgresoEnvioMasivo({ estado: 'creando' });
    let loteId;
    try {
      loteId = await A.post('rpc/whatsapp_crear_lote_envio_masivo', { p_tipo: tipo, p_cliente_ids: clienteIds });
    } catch (e) {
      _waCerrarPanelEnvioMasivo();
      try { toast('err', 'No se pudo iniciar el envío', String(e && e.message || e)); } catch (e2) {}
      return;
    }
    if (!loteId) { _waCerrarPanelEnvioMasivo(); try { toast('err', 'No se pudo iniciar el envío'); } catch (e) {} return; }
    _waLoteEnvioMasivoId = loteId;
    await _waPollLoteEnvioMasivo();
  };

  window._waCerrarPanelEnvioMasivo = function () {
    const el = $('#nxWaEnvioMasivoOverlay');
    if (el) el.remove();
    _waLoteEnvioMasivoId = null;
    _waConfirmacionPendiente = null;
  };

  // Llama a la Edge Function repetidas veces (hasta limite destinatarios "pendiente" por llamada)
  // hasta que reporte terminado:true, actualizando la barra de progreso entre cada llamada. Si el
  // agente cierra el panel (_waCerrarPanelEnvioMasivo pone _waLoteEnvioMasivoId=null), el loop se
  // corta solo en la próxima vuelta -- el envío se detiene, el progreso ya hecho queda guardado.
  window._waPollLoteEnvioMasivo = async function () {
    if (_waPollingEnCurso) return;
    _waPollingEnCurso = true;
    const loteId = _waLoteEnvioMasivoId;
    const A = api();
    try {
      while (_waLoteEnvioMasivoId === loteId) {
        let resp;
        try {
          resp = await fetch(`${A.url}/functions/v1/whatsapp-envio-masivo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
            body: JSON.stringify({ lote_id: loteId, limite: 15 }),
          });
        } catch (e) {
          _waPintarProgresoEnvioMasivo({ estado: 'error_red', mensaje: String(e && e.message || e) });
          return;
        }
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok || !d.ok) {
          if (d.error === 'lote_ya_completado') break; // ya termino por otra via -- solo falta refrescar el resumen
          _waPintarProgresoEnvioMasivo({ estado: 'error_red', mensaje: d.error || 'error desconocido' });
          return;
        }
        await _waActualizarProgresoDesdeLote(loteId);
        if (d.terminado) break;
      }
      await _waActualizarProgresoDesdeLote(loteId, true);
    } finally {
      _waPollingEnCurso = false;
    }
  };

  async function _waActualizarProgresoDesdeLote(loteId, esFinal) {
    const A = api(); if (!A?.get) return;
    let lote;
    try {
      const filas = await A.get('whatsapp_envio_masivo_lotes', `id=eq.${loteId}&select=*`);
      lote = filas && filas[0];
    } catch (e) { return; }
    if (!lote) return;
    let fallidos = [];
    try {
      fallidos = await A.get('whatsapp_envio_masivo_destinatarios', `lote_id=eq.${loteId}&estado=eq.fallido&select=cliente_id,error_detalle`) || [];
    } catch (e) { fallidos = []; }
    const nombresPorId = new Map(clientes().map(c => [String(c.id), c.nom]));
    const listaFallos = fallidos.map(f => ({ nombre: nombresPorId.get(String(f.cliente_id)) || 'Cliente', motivo: f.error_detalle || 'error' }));
    _waPintarProgresoEnvioMasivo({
      estado: (esFinal || lote.estado === 'completado') ? 'completado' : 'enviando',
      total: lote.total_destinatarios, enviados: lote.enviados, fallidos: lote.fallidos, listaFallos,
    });
  }

  function _waPintarProgresoEnvioMasivo(s) {
    let overlay = $('#nxWaEnvioMasivoOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'nxWaEnvioMasivoOverlay';
      overlay.className = 'nxWaEnvioMasivoOverlay';
      ensureView().appendChild(overlay);
    }
    if (s.estado === 'creando') {
      overlay.innerHTML = `<div class="nxWaEnvioMasivoBox nxWaPro"><h3>Preparando envío…</h3><p>Creando la tanda…</p></div>`;
      return;
    }
    if (s.estado === 'error_red') {
      overlay.innerHTML = `<div class="nxWaEnvioMasivoBox nxWaPro">
        <h3>El envío se detuvo</h3>
        <p>${esc(s.mensaje || '')} — lo ya enviado quedó guardado, podés reintentar sin repetir nada.</p>
        <div class="nxWaEnvioMasivoActs">
          <button class="btn bghost" onclick="_waCerrarPanelEnvioMasivo()">Cerrar</button>
          <button class="btn bwa" onclick="_waPollLoteEnvioMasivo()">Reintentar</button>
        </div>
      </div>`;
      return;
    }
    const total = s.total || 0, hechos = (s.enviados || 0) + (s.fallidos || 0);
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    const listaFallosHTML = (s.listaFallos || []).map(f => `<div class="nxWaContact"><div class="tx"><b>${esc(f.nombre)}</b><span>${esc(f.motivo)}</span></div></div>`).join('');
    overlay.innerHTML = `<div class="nxWaEnvioMasivoBox nxWaPro">
      <h3>${s.estado === 'completado' ? 'Envío completado' : 'Enviando…'}</h3>
      <div class="nxWaEnvioMasivoBarra"><div class="nxWaEnvioMasivoBarraRelleno" style="width:${pct}%"></div></div>
      <p>${hechos} de ${total} — ${s.enviados || 0} enviados, ${s.fallidos || 0} fallidos</p>
      ${listaFallosHTML ? `<div class="nxWaEnvioMasivoFallos">${listaFallosHTML}</div>` : ''}
      <div class="nxWaEnvioMasivoActs">
        <button class="btn ${s.estado === 'completado' ? 'bwa' : 'bghost'}" onclick="_waCerrarPanelEnvioMasivo()">Cerrar</button>
      </div>
    </div>`;
  }

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
        <div class="nxWaRowMeta">
          <span class="nxWaTime">${horaRel(h.ultimo_mensaje_at)}</span>
          ${h.no_leidos_count ? `<span class="nxWaBadge">${h.no_leidos_count}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  window.nxWaAbrirHilo = async function (id) {
    guardarBorradorActual();
    hiloAbiertoId = id;
    respuestaActiva = null;
    busquedaChat = { activa: false, q: '', idx: 0, ids: [] };
    hilosConScrollInicial.add(id);
    hilosPegadosAlFondo.add(id);
    $('#nxWaDetalle')?.classList.add('prep-bottom');
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
    asegurarScrollFondoInicial(id);
  };

  function burbujaMedia(m) {
    if (!m.media_path) return '';
    if (!m._url) return '<div style="font-size:10px;color:#94a3b8">📎 Adjunto no disponible</div>';
    if (m.tipo_contenido === 'imagen') return `<img src="${m._url}" onload="nxWaMediaLoaded()" onclick="window.open('${m._url}','_blank')">`;
    if (m.tipo_contenido === 'audio') return `<audio controls src="${m._url}" style="width:220px"></audio>`;
    if (m.tipo_contenido === 'video') return `<video controls src="${m._url}" onloadedmetadata="nxWaMediaLoaded()" style="max-width:220px"></video>`;
    return `<a href="${m._url}" target="_blank">📎 Ver documento</a>`;
  }

  function estadoMsg(m) {
    if (m.direccion !== 'out') return '';
    if (m.estado === 'fallido') return '<span style="color:#b91c1c">No enviado</span>';
    if (m.estado === 'enviando') return '<span>⏱ enviando</span>';
    if (m.estado === 'leido') return '<span style="color:#2563eb">✓✓</span>';
    if (m.estado === 'entregado') return '<span>✓✓</span>';
    return '<span>✓</span>';
  }

  function renderBurbuja(m, idx, porId) {
    const prev = mensajes[idx - 1];
    const samePrev = prev && prev.direccion === m.direccion;
    const q = m.responde_a_id ? porId.get(String(m.responde_a_id)) : null;
    const hit = busquedaChat.ids.includes(String(m.id)) ? ' hit' : '';
    const quote = q ? `<div class="nxWaQuote" onclick="nxWaIrAMensaje('${q.id}')"><b>${esc(autorMensaje(q))}</b><span>${esc(resumenMensaje(q))}</span></div>` : '';
    const cuerpo = m.cuerpo ? esc(m.cuerpo) : '';
    const fallo = m.direccion === 'out' && m.estado === 'fallido';
    const retry = fallo ? `<button class="nxWaRetry" onclick="nxWaReintentarMensaje('${m.id}')">Reintentar</button>` : '';
    return `<div id="nxWaMsg-${esc(m.id)}" class="nxWaBubWrap ${m.direccion} ${samePrev ? 'same-prev' : 'diff-prev'}" onpointerdown="nxWaSwipeStart(event,'${esc(m.id)}')" onpointermove="nxWaSwipeMove(event)" onpointerup="nxWaSwipeEnd(event)" ontouchstart="nxWaLongStart(event,'${esc(m.id)}')" ontouchend="nxWaLongEnd()" ontouchmove="nxWaLongEnd()">
      <div class="nxWaBub ${m.direccion}${hit}">
        <button class="nxWaBubMenu" onclick="nxWaMsgMenu(event,'${esc(m.id)}')"><i class="ti ti-chevron-down"></i></button>
        ${quote}${burbujaMedia(m)}${cuerpo}
        <div class="nxWaBubMeta">${retry}${estadoMsg(m)}</div>
      </div>
    </div>`;
  }

  function recomputarBusqueda() {
    const q = String(busquedaChat.q || '').trim().toLowerCase();
    if (!q) { busquedaChat.ids = []; busquedaChat.idx = 0; return; }
    busquedaChat.ids = mensajes.filter(m => String(m.cuerpo || '').toLowerCase().includes(q)).map(m => String(m.id));
    if (busquedaChat.idx >= busquedaChat.ids.length) busquedaChat.idx = Math.max(0, busquedaChat.ids.length - 1);
  }

  function scrollAlMensaje(id) {
    if (hiloAbiertoId) hilosPegadosAlFondo.delete(hiloAbiertoId);
    setTimeout(() => {
      const el = document.getElementById('nxWaMsg-' + id);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 40);
  }
  function scrollFondoChat(suave) {
    const box = $('#nxWaMsgsBox');
    if (!box) return;
    nxWaIgnorarScrollHasta = Date.now() + 350;
    if (suave) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    else box.scrollTop = box.scrollHeight;
  }
  function chatEstaAlFondo(box) {
    return !box || (box.scrollTop + box.clientHeight >= box.scrollHeight - 72);
  }
  function vigilarScrollManual(box, hiloId) {
    if (!box || !hiloId) return;
    box.onscroll = () => {
      if (Date.now() < nxWaIgnorarScrollHasta) return;
      if (chatEstaAlFondo(box)) hilosPegadosAlFondo.add(hiloId);
      else hilosPegadosAlFondo.delete(hiloId);
    };
  }
  // El contenedor de mensajes es un nodo NUEVO en cada render (pintarDetalle reescribe todo
  // #nxWaDetalle.innerHTML) -- así que el observer viejo queda huérfano y hay que reconectar uno
  // nuevo cada vez. Mientras el hilo siga "pegado al fondo" (recién abierto o el agente no
  // scrolleó hacia arriba), cualquier crecimiento real de altura -- lo haya causado lo que lo
  // haya causado -- lo vuelve a mandar al fondo.
  function vigilarAlturaMensajes(box, hiloId) {
    if (nxWaMsgsResizeObs) { try { nxWaMsgsResizeObs.disconnect(); } catch (e) {} }
    if (!box || !hiloId || typeof ResizeObserver === 'undefined') return;
    nxWaMsgsResizeObs = new ResizeObserver(() => {
      if (hiloAbiertoId !== hiloId) return;
      if (!hilosConScrollInicial.has(hiloId) && !hilosPegadosAlFondo.has(hiloId)) return;
      scrollFondoChat(false);
    });
    nxWaMsgsResizeObs.observe(box);
  }
  function asegurarScrollFondoInicial(hiloId) {
    if (!hiloId || hiloAbiertoId !== hiloId) return;
    scrollFondoChat(false);
    const mostrar = () => {
      if (hiloAbiertoId !== hiloId) return;
      scrollFondoChat(false);
      $('#nxWaMsgsBox')?.classList.remove('prep-bottom');
      $('#nxWaDetalle')?.classList.remove('prep-bottom');
      setTimeout(() => hilosConScrollInicial.delete(hiloId), 220);
    };
    requestAnimationFrame(mostrar);
    setTimeout(mostrar, 60);
    setTimeout(mostrar, 180);
    setTimeout(mostrar, 420);
  }
  window.nxWaMediaLoaded = function () {
    if (!hiloAbiertoId || (!hilosConScrollInicial.has(hiloAbiertoId) && !hilosPegadosAlFondo.has(hiloAbiertoId))) return;
    asegurarScrollFondoInicial(hiloAbiertoId);
  };

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
    if (!hiloAbiertoId) { ultimoRenderHiloId = null; cont.innerHTML = '<div class="nxWaEmpty"><b style="display:block;font-size:13px;color:#0f172a;margin-bottom:4px">Selecciona una conversación</b><span>Abre un cliente para revisar mensajes, comprobantes y seguimiento.</span></div>'; return; }
    const h = hilos.find(x => x.id === hiloAbiertoId);
    const cliente = h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
    const ventanaAbierta = h?.ultimo_inbound_at && (Date.now() - new Date(h.ultimo_inbound_at).getTime()) < 24 * 3600000;
    const nombreCabecera = esc(cliente?.nom || h?.nombre_perfil || h?.telefono_e164 || '');
    const subCabecera = `${h?.telefono_e164 || ''}${h?.telefono_e164 ? ' · ' : ''}${ventanaAbierta ? 'ventana abierta' : 'solo plantilla/recordatorio'}`;
    const inicialesCabecera = iniciales(cliente?.nom || h?.nombre_perfil || h?.telefono_e164 || 'WA');

    // "mensajes" es un estado global compartido por TODOS los hilos -- solo es seguro pintarlo
    // cuando "mensajesHiloId" (puesto por cargarMensajes exclusivamente al escribir datos
    // frescos y vigentes) coincide con el hilo que esta abierto ahora mismo. Chequearlo aca
    // adentro, una sola vez, evita depender de que CADA lugar que llama a pintar()/
    // pintarDetalle() se acuerde de no hacerlo mientras la carga sigue en vuelo.
    if (mensajesHiloId !== hiloAbiertoId) {
      if (ultimoRenderHiloId !== hiloAbiertoId) {
        cont.innerHTML = `${cabeceraChat(nombreCabecera, subCabecera, inicialesCabecera)}<div class="nxWaMsgs"><div class="nxWaEmpty">Cargando…</div></div>`;
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
    const scrollInicial = hilosConScrollInicial.has(hiloAbiertoId);
    const pegadoAlFondo = hilosPegadosAlFondo.has(hiloAbiertoId);
    const estabaAlFondo = scrollInicial || pegadoAlFondo || chatEstaAlFondo(boxPrevio);

    recomputarBusqueda();
    const porId = new Map(mensajes.map(m => [String(m.id), m]));
    const filas = mensajes.map((m, i) => renderBurbuja(m, i, porId)).join('') || '<div class="nxWaEmpty">Sin mensajes todavía.</div>';
    const borrador = borradoresPorHilo.get(hiloAbiertoId) || valorPrevio || '';
    const resp = respuestaActiva ? `<div class="nxWaReplyBar"><div class="tx"><b>Respondiendo a ${esc(respuestaActiva.autor || 'Cliente')}</b><span>${esc(respuestaActiva.texto || '')}</span></div><button onclick="nxWaCancelarRespuesta()">×</button></div>` : '';
    if (scrollInicial) cont.classList.add('prep-bottom'); else cont.classList.remove('prep-bottom');
    cont.innerHTML = `${cabeceraChat(nombreCabecera, subCabecera, inicialesCabecera)}${barraBusquedaChat()}
      <div class="nxWaMsgs ${scrollInicial ? 'prep-bottom' : ''}" id="nxWaMsgsBox">${filas}</div>
      ${ventanaAbierta
        ? `<div class="nxWaComposerWrap">${resp}<div class="nxWaComposer"><button class="nxWaIconBtn" onclick="toast('info','Adjuntos','Queda reservado para la siguiente fase: foto, video y documento con envío real.')"><i class="ti ti-paperclip"></i></button><textarea id="nxWaTexto" ${hiloEnviosEnVuelo.has(hiloAbiertoId) ? 'disabled' : ''} placeholder="Escribe un mensaje…" rows="1" oninput="nxWaTextoInput(this)" onkeydown="nxWaKey(event)">${esc(borrador)}</textarea><button onclick="nxWaEnviar()"><i class="ti ti-send"></i></button></div></div>`
        : `<div class="nxWaCerrada">Pasaron más de 24h desde el último mensaje del cliente — espera a que vuelva a escribir para poder responder con texto libre.
            ${(h?.cliente_id && waMesesAtraso(cliente) > 0) ? `<button class="nxWaBtnRecordatorio" ${hilosRecordatorioEnVuelo.has(hiloAbiertoId) ? 'disabled' : ''} onclick="nxWaRecordatorioManual('${h.cliente_id}','${hiloAbiertoId}',this)"><i class="ti ti-brand-whatsapp"></i> ${hilosRecordatorioEnVuelo.has(hiloAbiertoId) ? 'Enviando…' : 'Enviar recordatorio de pago ahora'}</button>` : ''}
          </div>`}`;

    const nuevoBox = $('#nxWaMsgsBox');
    if (nuevoBox) nuevoBox.scrollTop = estabaAlFondo ? nuevoBox.scrollHeight : (boxPrevio ? boxPrevio.scrollTop : nuevoBox.scrollHeight);
    if (nuevoBox) vigilarScrollManual(nuevoBox, hiloAbiertoId);
    if (nuevoBox) vigilarAlturaMensajes(nuevoBox, hiloAbiertoId);
    if (scrollInicial || pegadoAlFondo) asegurarScrollFondoInicial(hiloAbiertoId);

    const nuevoInput = $('#nxWaTexto');
    if (nuevoInput) {
      ajustarTexto(nuevoInput);
      if (teniaFoco) {
        nuevoInput.focus();
        const pos = cursorPrevio || [nuevoInput.value.length, nuevoInput.value.length];
        nuevoInput.setSelectionRange(pos[0], pos[1]);
      }
    }

    ultimoRenderHiloId = hiloAbiertoId;
  }

  function ajustarTexto(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }
  window.nxWaAjustarTexto = ajustarTexto;
  window.nxWaTextoInput = function (el) {
    ajustarTexto(el);
    if (hiloAbiertoId) borradoresPorHilo.set(hiloAbiertoId, el.value || '');
  };
  window.nxWaKey = function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); window.nxWaEnviar(); }
  };
  window.nxWaCerrarDetalleMob = function () {
    guardarBorradorActual();
    hiloAbiertoId = null; respuestaActiva = null; mensajes = []; mensajesHiloId = null;
    pintarLista(); pintarDetalle();
    // "nxWaChatOpen" es una marca separada de un parche visual anterior (parches-whatsapp-
    // visual.js) que oculta la lista y muestra el detalle en el celular -- este botón nativo de
    // volver no sabía de su existencia y la dejaba pegada, mostrando la pantalla de detalle
    // vacía sin forma de volver a la lista. Se limpia aquí explícitamente para no depender de
    // que ambos mecanismos se mantengan sincronizados por su cuenta.
    try { $('#v-waInbox')?.classList.remove('nxWaChatOpen'); } catch (e) {}
  };
  window.nxWaSetRespuesta = function (id) {
    const m = mensajes.find(x => String(x.id) === String(id)); if (!m) return;
    respuestaActiva = { id: String(m.id), autor: autorMensaje(m), texto: resumenMensaje(m) };
    pintarDetalle();
    setTimeout(() => { const inp = $('#nxWaTexto'); if (inp) inp.focus(); }, 30);
  };
  window.nxWaCancelarRespuesta = function () { respuestaActiva = null; pintarDetalle(); };
  window.nxWaIrAMensaje = function (id) { scrollAlMensaje(id); };
  window.nxWaToggleBuscar = function (forzar) {
    busquedaChat.activa = typeof forzar === 'boolean' ? forzar : !busquedaChat.activa;
    if (!busquedaChat.activa) busquedaChat = { activa: false, q: '', idx: 0, ids: [] };
    pintarDetalle();
    setTimeout(() => { const inp = $('#nxWaSearchInput'); if (inp) inp.focus(); }, 30);
  };
  window.nxWaBuscarEnChat = function (q) {
    busquedaChat.q = q || ''; busquedaChat.idx = 0; recomputarBusqueda(); pintarDetalle();
    setTimeout(() => { const inp = $('#nxWaSearchInput'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }, 20);
    if (busquedaChat.ids[0]) scrollAlMensaje(busquedaChat.ids[0]);
  };
  window.nxWaSearchGo = function (dir) {
    recomputarBusqueda(); if (!busquedaChat.ids.length) return;
    busquedaChat.idx = (busquedaChat.idx + dir + busquedaChat.ids.length) % busquedaChat.ids.length;
    pintarDetalle(); scrollAlMensaje(busquedaChat.ids[busquedaChat.idx]);
  };
  window.nxWaCopiarMsg = async function (id) {
    const m = mensajes.find(x => String(x.id) === String(id)); const txt = m?.cuerpo || '';
    if (!txt) return toast('info', 'Sin texto para copiar');
    try { await navigator.clipboard.writeText(txt); toast('ok', 'Mensaje copiado'); } catch (e) { toast('err', 'No se pudo copiar'); }
  };
  window.nxWaMsgMenu = function (event, id) {
    event?.preventDefault?.(); event?.stopPropagation?.();
    document.querySelectorAll('.nxWaCtx').forEach(x => x.remove());
    const m = mensajes.find(x => String(x.id) === String(id)); if (!m) return;
    const p = document.createElement('div'); p.className = 'nxWaCtx';
    const x = Math.min((event?.clientX || 80), window.innerWidth - 170), y = Math.min((event?.clientY || 80), window.innerHeight - 150);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.innerHTML = `<button onclick="nxWaSetRespuesta('${esc(id)}');this.closest('.nxWaCtx').remove()"><i class="ti ti-corner-up-left"></i> Responder</button>
      ${m.cuerpo ? `<button onclick="nxWaCopiarMsg('${esc(id)}');this.closest('.nxWaCtx').remove()"><i class="ti ti-copy"></i> Copiar</button>` : ''}
      ${m.direccion === 'out' && m.estado === 'fallido' ? `<button onclick="nxWaReintentarMensaje('${esc(id)}');this.closest('.nxWaCtx').remove()"><i class="ti ti-refresh"></i> Reintentar</button>` : ''}`;
    document.body.appendChild(p);
    setTimeout(() => document.addEventListener('click', () => p.remove(), { once: true }), 0);
  };
  window.nxWaLongStart = function (event, id) {
    window.nxWaLongEnd();
    nxWaMenuTimer = setTimeout(() => window.nxWaMsgMenu(event, id), 520);
  };
  window.nxWaLongEnd = function () { if (nxWaMenuTimer) clearTimeout(nxWaMenuTimer); nxWaMenuTimer = null; };
  window.nxWaSwipeStart = function (event, id) { nxWaSwipe = { id, x: event.clientX, y: event.clientY, ok: true }; };
  window.nxWaSwipeMove = function (event) {
    if (!nxWaSwipe) return;
    if (Math.abs(event.clientY - nxWaSwipe.y) > 35) nxWaSwipe.ok = false;
  };
  window.nxWaSwipeEnd = function (event) {
    if (!nxWaSwipe) return;
    const dx = event.clientX - nxWaSwipe.x;
    const id = nxWaSwipe.id, ok = nxWaSwipe.ok;
    nxWaSwipe = null;
    if (ok && dx > 58) window.nxWaSetRespuesta(id);
  };

  async function enviarTextoWhatsApp(texto, respondeAId, tempId) {
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
    hilosPegadosAlFondo.add(hiloDestino);
    const tempMsg = tempId ? mensajes.find(m => String(m.id) === String(tempId)) : {
      id: 'tmp-' + Date.now(),
      hilo_id: hiloDestino,
      direccion: 'out',
      tipo_contenido: 'text',
      cuerpo: texto,
      responde_a_id: respondeAId || null,
      estado: 'enviando',
      created_at: new Date().toISOString(),
      _optimista: true
    };
    if (!tempId) mensajes.push(tempMsg);
    if (!tempMsg) { hiloEnviosEnVuelo.delete(hiloDestino); return; }
    tempMsg.estado = 'enviando';
    tempMsg.error_detalle = null;
    mensajesHiloId = hiloDestino;
    respuestaActiva = null;
    pintarDetalle();
    scrollFondoChat(false);
    const A = api();
    // pintarDetalle() siempre re-renderiza completo -- si el usuario cambia de hilo mientras este
    // envio sigue en vuelo, "inp" queda desconectado del documento. Estas dos funciones vuelven a
    // buscar el <input> VIGENTE (y solo si el hilo de destino sigue siendo el que esta abierto)
    // en vez de seguir usando esa referencia vieja, que de otro modo perdia el texto sin enviar en
    // silencio y dejaba el foco sin restaurar despues de cada envio exitoso.
    const marcarFallido = (detalle) => {
      tempMsg.estado = 'fallido';
      tempMsg.error_detalle = detalle || 'No enviado';
      if (hiloAbiertoId === hiloDestino) pintarDetalle();
    };
    const reactivarComposer = () => { if (hiloAbiertoId === hiloDestino) { const actual = $('#nxWaTexto'); if (actual) { actual.disabled = false; actual.focus(); ajustarTexto(actual); } } };
    try {
      const r = await fetch(`${A.url}/functions/v1/whatsapp-inbox-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ hilo_id: hiloDestino, mensaje: texto, responde_a_id: respondeAId || null })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { toast('err', 'No se pudo enviar', d.mensaje || d.error || ''); marcarFallido(d.mensaje || d.error || 'No enviado'); }
      else {
        if (d.mensaje) {
          const i = mensajes.findIndex(m => String(m.id) === String(tempMsg.id));
          if (i >= 0) mensajes[i] = d.mensaje;
          if (hiloAbiertoId === hiloDestino) pintarDetalle();
        } else if (hiloAbiertoId === hiloDestino) { await cargarMensajes(hiloDestino); pintarDetalle(); }
        await cargar();
      }
    } catch (e) { toast('err', 'No se pudo enviar', String(e && e.message || e)); marcarFallido(String(e && e.message || e)); }
    hiloEnviosEnVuelo.delete(hiloDestino);
    reactivarComposer();
  }

  window.nxWaReintentarMensaje = async function (id) {
    const m = mensajes.find(x => String(x.id) === String(id)); if (!m || !m.cuerpo) return;
    await enviarTextoWhatsApp(String(m.cuerpo), m.responde_a_id || null, id);
  };

  window.nxWaEnviar = async function () {
    const inp = $('#nxWaTexto'); if (!inp) return;
    const texto = inp.value.trim(); if (!texto) return;
    const hiloDestino = hiloAbiertoId; if (!hiloDestino) return;
    const respondeAId = respuestaActiva?.id || null;
    inp.value = ''; inp.disabled = true; ajustarTexto(inp);
    borradoresPorHilo.set(hiloDestino, '');
    await enviarTextoWhatsApp(texto, respondeAId, null);
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
