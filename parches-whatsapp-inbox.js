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
  // Borradores por hilo: misma interfaz get/set que el Map anterior, pero persistidos en
  // localStorage (prefijo nxWaBorrador:) para que sobrevivan a recargar la página, como en WhatsApp.
  const borradoresPorHilo = (() => {
    const K = 'nxWaBorrador:'; const mem = new Map();
    const ls = () => { try { return window.localStorage; } catch (e) { return null; } };
    return {
      get(id) {
        if (!id) return '';
        if (mem.has(id)) return mem.get(id);
        let v = ''; try { v = ls()?.getItem(K + id) || ''; } catch (e) {}
        mem.set(id, v); return v;
      },
      set(id, v) {
        if (!id) return; v = String(v || ''); mem.set(id, v);
        try { const s = ls(); if (!s) return; if (v.trim()) s.setItem(K + id, v); else s.removeItem(K + id); } catch (e) {}
      }
    };
  })();
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
  // Conversación abierta (58.94): divisor de no leídos, historial hacia atrás, contador de nuevos,
  // audio en curso y estado anterior de cada mensaje (para animar solo el paso a leído).
  const noLeidosAlAbrir = new Map();
  const antiguosPorHilo = new Map();
  const historialCompleto = new Set();
  let cargandoAntiguos = null;
  let nuevosSinVer = 0;
  let idsRenderPrevio = new Set();
  let ultimoCreatedRender = '';
  const estadoPrevioMsg = new Map();
  let audioActivo = null;
  const LIMITE_MENSAJES = 200;

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
/* Las colitas de la burbuja se quitaron a proposito. Estaban dibujadas en left/right:-5px,
   es decir FUERA del cuerpo, asi que no se leian como la cola de un bocadillo sino como un
   triangulito suelto al lado. La capa aura ya lo habia notado y las repinto de verde a azul
   palido (#d9efff), pero repintar no arregla que esten despegadas. Con el fondo glass actual
   no hay forma limpia de integrarlas -- habria que recortar el borde y el blur del contenedor
   -- asi que se eliminan, que es lo que recomendaba tambien la revision de ChatGPT.
   Si algun dia se quieren de vuelta, el sitio es aqui y el problema a resolver es el -5px. */
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
#v-waInbox .nxWaQuote span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3}
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
/* ── 58.94 · conversación como el WhatsApp original ──
   El núcleo pinta él mismo hora, estado, separadores de día, divisor de no leídos, colas y agrupación
   (antes lo hacía parches-whatsapp-visual-v7 emparejando burbujas por índice con un segundo fetch).
   Colores con variables --wa-* (las define el tema Glass oscuro en index.html) y valor de reserva claro.
   Los !important de aquí solo vencen reglas !important de capas posteriores (replica-referencia,
   aura-*, burbuja-fit-final) sobre radios/pie/adjuntos; no se editan esas capas por trabajo paralelo. */
#v-waInbox .nxWaBubWrap.in{padding-left:8px;box-sizing:border-box}
#v-waInbox .nxWaBubWrap.out{padding-right:8px;box-sizing:border-box}
#v-waInbox .nxWaBubWrap.nxWaHasReaction{margin-bottom:12px!important}
/* mensaje corto: texto y hora en la misma línea; si no caben, la hora baja a la derecha (como WhatsApp) */
#v-waInbox .nxWaBubWrap .nxWaBub.nxWaRefShort{flex-wrap:wrap;row-gap:1px}
#v-waInbox .nxWaBubWrap .nxWaBub.nxWaRefShort .nxWaMsgMeta{margin-left:auto!important}
#v-waInbox .nxWaBubWrap .nxWaBub.in{border-radius:18px!important}
#v-waInbox .nxWaBubWrap .nxWaBub.out{border-radius:18px!important}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.in{border-bottom-left-radius:4px!important}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.out{border-bottom-right-radius:4px!important}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub{overflow:visible!important}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.in::before,#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.out::before{content:"";position:absolute;bottom:0;width:10px;height:14px;background:inherit;border:0;box-shadow:none;pointer-events:none;z-index:0}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.in::before{left:-8px;clip-path:path('M10 0 C10 7 6 12 0 14 L10 14 Z')}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.out::before{right:-8px;clip-path:path('M0 0 C0 7 4 12 10 14 L0 14 Z')}
#v-waInbox .nxWaDaySep,#v-waInbox .nxWaUnreadSep{align-self:center;display:inline-flex;align-items:center;justify-content:center;min-height:24px;margin:6px auto 2px;padding:0 10px;border-radius:8px;background:var(--wa-sep,rgba(255,255,255,.82));color:var(--wa-sub,#5b6b82);font-size:10px;font-weight:700;line-height:1;white-space:nowrap;box-shadow:0 1px .5px rgba(11,20,26,.13);user-select:none;-webkit-user-select:none;text-transform:none}
#v-waInbox .nxWaUnreadSep{align-self:stretch;width:auto;margin:8px 0 4px;background:var(--wa-head,#e8f0fb);color:var(--wa-sub,#5b6b82)}
#v-waInbox .nxWaMsgMeta{display:flex;align-items:center;justify-content:flex-end;gap:3px;min-height:11px;margin-top:3px;font-size:9px;line-height:1;color:#7b8798;font-weight:600;white-space:nowrap;user-select:none;-webkit-user-select:none}
#v-waInbox .nxWaMsgState{display:inline-flex;align-items:center;gap:3px}
#v-waInbox .nxWaMsgCheck{font-style:normal;font-size:11px;line-height:1;letter-spacing:-3px;padding-right:3px;font-weight:700}
#v-waInbox .nxWaBub .nxWaMsgMeta .nxWaMsgState .nxWaMsgCheck{color:inherit!important}
#v-waInbox .nxWaBub .nxWaMsgMeta .nxWaMsgState.st-leido .nxWaMsgCheck{color:#53bdeb!important}
#v-waInbox .nxWaMsgState.st-fallido{color:#f87171;font-weight:800}
#v-waInbox .nxWaMsgState.st-fallido .nxWaMsgCheck{letter-spacing:0;padding:0;width:12px;height:12px;border-radius:50%;background:#dc2626;color:#fff;display:inline-grid;place-items:center;font-size:9px}
#v-waInbox .nxWaMsgMeta .nxWaRetry{margin-left:4px;border:0;background:rgba(220,38,38,.16);color:#fca5a5;border-radius:999px;padding:3px 8px;font:inherit;font-size:9px;font-weight:800;cursor:pointer}
#v-waInbox .nxWaStar{font-size:9px;color:inherit;opacity:.85;margin-right:1px}
@keyframes nxWaCheckRead{0%{transform:scale(1);opacity:.55}45%{transform:scale(1.5)}70%{transform:scale(.94)}100%{transform:scale(1);opacity:1}}
#v-waInbox .nxWaMsgState.nxWaCheckJustRead .nxWaMsgCheck{display:inline-block;animation:nxWaCheckRead .5s cubic-bezier(.2,1.5,.3,1) both}
#v-waInbox .nxWaFwd{display:flex;align-items:center;gap:4px;margin:0 0 3px;font-size:9px;font-style:italic;font-weight:600;opacity:.75;white-space:nowrap}
#v-waInbox .nxWaFwd i{font-size:11px}
/* cita con miniatura */
#v-waInbox .nxWaQuote.hasThumb{display:flex;align-items:center;gap:8px;white-space:normal}
#v-waInbox .nxWaQuote .nxWaQuoteTx{min-width:0;flex:1}
#v-waInbox .nxWaQuoteThumb{width:42px;height:42px;border-radius:8px;object-fit:cover;flex:none;display:grid;place-items:center;background:rgba(0,0,0,.25);color:inherit;font-size:18px}
/* adjuntos */
#v-waInbox .nxWaBub .nxWaCard{display:flex;align-items:center;gap:10px;min-width:200px;max-width:100%;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.16);color:inherit;text-decoration:none;white-space:normal;cursor:pointer;margin-bottom:4px}
#cnt #v-waInbox .nxWaMsgs .nxWaBubWrap .nxWaBub.nxWaMediaBub a.nxWaCard,#cnt #v-waInbox .nxWaMsgs .nxWaBubWrap .nxWaBub.nxWaMediaBub a.nxWaCard *{color:inherit!important;font-weight:inherit;text-decoration:none!important}
#v-waInbox .nxWaCard .nxWaCardIco{width:40px;height:40px;border-radius:12px;flex:none;display:grid;place-items:center;background:rgba(255,255,255,.14);font-size:20px}
#v-waInbox .nxWaCard .nxWaCardTx{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
#v-waInbox .nxWaCard .nxWaCardTx b{display:block;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaCard .nxWaCardTx span{display:block;font-size:9.5px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaCard .nxWaCardAct{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);font-size:16px}
#v-waInbox .nxWaLocCard{flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;min-width:220px}
#v-waInbox .nxWaLocMap{position:relative;height:96px;background-color:#1e3a5f;background-image:linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px),linear-gradient(35deg,transparent 46%,rgba(255,255,255,.14) 47%,rgba(255,255,255,.14) 53%,transparent 54%);background-size:18px 18px,18px 18px,100% 100%;display:grid;place-items:center}
#v-waInbox .nxWaLocMap i{font-size:34px;color:#f87171;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45))}
#v-waInbox .nxWaLocCard .nxWaCardTx{padding:8px 10px}
#v-waInbox .nxWaLocCard .nxWaCardTx em{font-style:normal;font-size:9.5px;font-weight:700;opacity:.9;margin-top:2px}
#v-waInbox .nxWaContactCard{flex-wrap:wrap}
#v-waInbox .nxWaContactCard .nxWaCardIco{border-radius:50%;font-size:12px;font-weight:800;letter-spacing:.02em}
#v-waInbox .nxWaContactBtn{flex:1 1 100%;margin-top:2px;border:0;border-radius:10px;padding:8px;background:rgba(255,255,255,.14);color:inherit;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
#v-waInbox .nxWaVideoWrap{position:relative;display:block;max-width:100%}
#v-waInbox .nxWaVideoWrap video{max-height:240px;border-radius:12px;background:#000}
#v-waInbox .nxWaVideoExpand{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:14px}
#v-waInbox .nxWaBub img.nxWaImg{cursor:zoom-in}
#cnt #v-waInbox .nxWaMsgs .nxWaBubWrap .nxWaBub.nxWaMediaBub.nxWaStickerBub{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;padding:0!important}
#v-waInbox .nxWaBubWrap.nxWaTail .nxWaBub.nxWaStickerBub::before{display:none}
#v-waInbox .nxWaBub img.nxWaSticker{width:160px;max-width:160px;height:auto;border-radius:0;display:block;cursor:default}
#v-waInbox .nxWaBub.nxWaStickerBub .nxWaMsgMeta{padding:2px 6px;border-radius:999px;background:rgba(0,0,0,.35);color:#e5e7eb;width:max-content;margin-left:auto}
/* reproductor de audio */
#v-waInbox .nxWaAudio{display:flex;align-items:center;gap:8px;min-width:230px;max-width:100%;padding:4px 2px 2px;white-space:normal}
#v-waInbox .nxWaBub .nxWaAudio audio{display:none!important}
#v-waInbox .nxWaAudioMic{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:rgba(255,255,255,.14);font-size:17px;position:relative}
#v-waInbox .nxWaAudioMic i{color:inherit}
#v-waInbox .nxWaAudioPlay{width:34px;height:34px;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:inherit;display:grid;place-items:center;font-size:16px;cursor:pointer;padding:0}
#v-waInbox .nxWaAudioBar{position:relative;flex:1;min-width:90px;height:22px;display:flex;align-items:center;cursor:pointer;touch-action:none}
#v-waInbox .nxWaAudioBar::before{content:"";position:absolute;left:0;right:0;height:4px;border-radius:999px;background:rgba(255,255,255,.28)}
#v-waInbox .nxWaAudioFill{position:absolute;left:0;height:4px;border-radius:999px;background:currentColor;width:0;opacity:.9}
#v-waInbox .nxWaAudioKnob{position:absolute;left:0;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transform:translateX(-50%)}
#v-waInbox .nxWaAudioTime{font-size:9px;font-weight:700;min-width:30px;text-align:right;font-variant-numeric:tabular-nums;opacity:.9}
#v-waInbox .nxWaAudioRate{flex:none;border:0;border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.18);color:inherit;font:inherit;font-size:9px;font-weight:800;cursor:pointer}
/* historial hacia atrás y contador de nuevos */
#v-waInbox .nxWaOlderWrap{position:sticky;top:0;height:0;overflow:visible;align-self:center;z-index:2;pointer-events:none}
#v-waInbox .nxWaOlder{display:none;align-items:center;gap:6px;transform:translate(-50%,6px);margin-left:0;position:absolute;left:0;top:0;padding:5px 10px;border-radius:999px;background:var(--wa-head,#fff);color:var(--wa-sub,#475569);font-size:9.5px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px -6px rgba(0,0,0,.5)}
#v-waInbox .nxWaOlder.on{display:inline-flex}
#v-waInbox .nxWaOlder i{animation:nxWaSpinOlder .8s linear infinite}
@keyframes nxWaSpinOlder{to{transform:rotate(360deg)}}
/* cabecera: teléfono formateado y estado de la ventana */
#v-waInbox .nxWaHeadSub{display:flex;flex-wrap:wrap;align-items:center;column-gap:6px;row-gap:0;min-width:0;white-space:normal;line-height:1.25}
#v-waInbox .nxWaHeadTel{flex:none;white-space:nowrap}
#v-waInbox .nxWaHeadWin{display:inline-flex;align-items:center;gap:3px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
#v-waInbox .nxWaHeadWin i{font-size:10px}
#v-waInbox .nxWaHeadWin.ok i{color:#4ade80}
#v-waInbox .nxWaHeadWin.off i{color:#fbbf24}
/* visor a pantalla completa */
.nxWaLb{position:fixed;inset:0;z-index:100600;background:rgba(3,8,16,.96);display:flex;flex-direction:column;color:#e5e7eb;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;animation:nxWaLbIn .16s ease both;text-transform:none}
@keyframes nxWaLbIn{from{opacity:0}to{opacity:1}}
.nxWaLbTop{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 12px 8px;flex:none}
.nxWaLbInfo{min-width:0;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxWaLbInfo span{display:block;font-size:9.5px;font-weight:600;opacity:.7;margin-top:2px}
.nxWaLbActs{display:flex;gap:6px;flex:none}
.nxWaLbBtn{width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;font-size:18px;cursor:pointer;text-decoration:none}
.nxWaLbStage{position:relative;flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.nxWaLbStage img,.nxWaLbStage video{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;will-change:transform;-webkit-user-drag:none}
.nxWaLbStage img{cursor:zoom-in}
.nxWaLbStage.zoomed img{cursor:grab}
.nxWaLbNav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;font-size:20px;cursor:pointer;z-index:2}
.nxWaLbNav.prev{left:10px}.nxWaLbNav.next{right:10px}
.nxWaLbNav[disabled]{opacity:.25;pointer-events:none}
.nxWaLbFoot{flex:none;padding:8px 14px max(12px,env(safe-area-inset-bottom));text-align:center;font-size:11px}
.nxWaLbCaption{max-height:64px;overflow:auto;white-space:pre-wrap;word-break:break-word}
.nxWaLbCount{font-size:9.5px;opacity:.65;margin-top:4px}
@media(max-width:760px){.nxWaLbNav{display:none}}
@media(prefers-reduced-motion:reduce){.nxWaLb,#v-waInbox .nxWaMsgState.nxWaCheckJustRead .nxWaMsgCheck,#v-waInbox .nxWaOlder i{animation:none!important}}
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
  window.nxWaRecargar = () => cargar();
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
        datos = await A.get('whatsapp_hilo_mensajes', `hilo_id=eq.${hiloId}&order=created_at.desc,id.desc&limit=${LIMITE_MENSAJES}&select=*`) || [];
        datos = datos.slice().reverse();
        if (datos.length < LIMITE_MENSAJES) historialCompleto.add(hiloId);
        // Los mensajes más antiguos que el agente ya trajo con el scroll hacia arriba se conservan
        // a través de cada refresco de Realtime (que solo vuelve a pedir la ventana más reciente).
        const antiguos = antiguosPorHilo.get(hiloId);
        if (antiguos && antiguos.length && datos.length) {
          const corte = datos[0].created_at;
          datos = antiguos.filter(a => a.created_at < corte).concat(datos);
        }
        for (const m of datos) { if (m.media_path && !m._url) m._url = await urlFirmada(m.media_path); }
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
  // Hora de la lista como en WhatsApp: hoy → hora (mismo formato 12 h que las burbujas),
  // ayer → «Ayer», menos de 7 días → día de la semana, si no → dd/mm/aa.
  function horaRel(iso) {
    if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return '';
    const hoy = new Date(); const dia0 = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dias = Math.round((dia0(hoy) - dia0(d)) / 86400000);
    try {
      if (dias <= 0) return d.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, ' ').trim();
      if (dias === 1) return 'Ayer';
      if (dias < 7) { const s = d.toLocaleDateString('es-DO', { weekday: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); }
    } catch (e) {}
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  }
  // Columnas nuevas de whatsapp_hilos (fijado_at, archivado_at, silenciado_hasta, ultimo_mensaje_*):
  // pueden no existir todavía en producción, así que todo lo que las usa tolera undefined.
  function hiloFijado(h) { return !!h?.fijado_at; }
  function hiloArchivado(h) { return !!h?.archivado_at; }
  function hiloSilenciado(h) {
    const v = h?.silenciado_hasta; if (!v) return false;
    if (v === 'infinity') return true;
    const t = new Date(v).getTime(); return isNaN(t) ? true : t > Date.now();
  }
  function listaSoporta() {
    const h = hilos[0];
    return { fijar: !!h && 'fijado_at' in h, archivar: !!h && 'archivado_at' in h, silenciar: !!h && 'silenciado_hasta' in h };
  }
  const TIPO_PREVIEW = { imagen: ['ti-camera', 'Foto'], audio: ['ti-microphone', 'Audio'], video: ['ti-video', 'Video'], documento: ['ti-file-text', 'Documento'], ubicacion: ['ti-map-pin', 'Ubicación'], contacto: ['ti-user', 'Contacto'], sticker: ['ti-sticker', 'Sticker'] };
  const TICK_PREVIEW = { enviando: ['ti-clock', ''], enviado: ['ti-check', ''], entregado: ['ti-checks', ''], leido: ['ti-checks', 'leido'], fallido: ['ti-alert-circle', 'fallido'] };
  function previewFila(h) {
    const texto = String(h.ultimo_mensaje_preview || '').replace(/\s+/g, ' ').trim();
    const tipo = TIPO_PREVIEW[h.ultimo_mensaje_tipo];
    let cuerpo;
    if (tipo) {
      const generico = !texto || /^\[?(imagen|foto|audio|video|documento|documento adjunto|ubicaci[oó]n|contacto|sticker)\]?$/i.test(texto);
      cuerpo = `<i class="ti ${tipo[0]} nxWaPrevIco"></i>${esc(generico ? tipo[1] : texto)}`;
    } else cuerpo = esc(texto);
    let tick = '';
    if (h.ultimo_mensaje_direccion === 'out' && TICK_PREVIEW[h.ultimo_mensaje_estado]) {
      const t = TICK_PREVIEW[h.ultimo_mensaje_estado];
      tick = `<i class="ti ${t[0]} nxWaPrevTick ${t[1]}"></i>`;
    }
    return tick + cuerpo;
  }
  function ordenarHilos(lista) {
    const t = x => x ? (new Date(x).getTime() || 0) : 0;
    return lista.slice().sort((a, b) => (hiloFijado(b) - hiloFijado(a)) || (t(b.fijado_at) - t(a.fijado_at)) || (t(b.ultimo_mensaje_at) - t(a.ultimo_mensaje_at)));
  }
  let mostrarArchivados = false;
  // ── Conversación abierta (58.94) ──────────────────────────────────────
  function metaDe(m) { const x = m && m.meta; return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  function horaMsg(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, ' ').trim(); } catch (e) { return ''; }
  }
  function diaKey(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function etiquetaDia(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dia = new Date(d); dia.setHours(0, 0, 0, 0);
    const dif = Math.round((hoy - dia) / 86400000);
    if (dif === 0) return 'Hoy';
    if (dif === 1) return 'Ayer';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (dif > 1 && dif < 7) { try { return cap(d.toLocaleDateString('es-DO', { weekday: 'long' })); } catch (e) {} }
    try { return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/\s+de\s+/g, ' '); } catch (e) { return diaKey(iso); }
  }
  function estadoInfo(est) {
    const e = String(est || '').toLowerCase();
    if (e === 'enviando') return { cls: 'st-enviando', txt: 'Enviando', glifo: '○' };
    if (e === 'enviado') return { cls: 'st-enviado', txt: 'Enviado', glifo: '✓' };
    if (e === 'entregado') return { cls: 'st-entregado', txt: 'Entregado', glifo: '✓✓' };
    if (e === 'leido') return { cls: 'st-leido', txt: 'Leído', glifo: '✓✓' };
    if (e === 'fallido') return { cls: 'st-fallido', txt: 'No enviado', glifo: '!' };
    return null;
  }
  function soloDigitos(v) { return String(v || '').replace(/\D/g, ''); }
  function formatearTelefono(e164) {
    const s = String(e164 || '');
    if (!s || /^bsid:/i.test(s)) return 'Sin número';
    const d = soloDigitos(s);
    if (d.length === 11 && d[0] === '1') return `+1 ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return s.startsWith('+') ? s : '+' + d;
  }
  // Escapa primero y solo después convierte URLs, wa.me y teléfonos en enlaces (target=_blank, rel=noopener).
  // Un teléfono abre wa.me, que parches-whatsapp-enrutamiento-nexus redirige al propio Buzón.
  function linkify(texto) {
    const e = esc(texto);
    const re = /(https?:\/\/[^\s<]+|www\.[^\s<]+|\+?\d[\d\s().-]{7,}\d)/g;
    return e.replace(re, (m) => {
      let cola = '';
      const mt = /[.,;:!?)]+$/.exec(m);
      if (mt && /^https?:|^www\./i.test(m)) { cola = mt[0]; m = m.slice(0, -cola.length); }
      if (/^https?:|^www\./i.test(m)) {
        const href = /^www\./i.test(m) ? 'https://' + m : m;
        return `<a href="${href}" target="_blank" rel="noopener">${m}</a>${cola}`;
      }
      const d = soloDigitos(m);
      if (d.length < 10 || d.length > 15) return m;
      return `<a href="https://wa.me/${d}" class="nxWaTel" target="_blank" rel="noopener">${m}</a>`;
    });
  }
  function esCuerpoGenerico(m) {
    const t = String(m.cuerpo || '').trim();
    return !t || /^\[?(imagen|foto|audio|video|documento|sticker|ubicaci[oó]n|contacto|contenido de whatsapp no visible)\]?$/i.test(t);
  }
  function etiquetaTipo(m) {
    const t = m.tipo_contenido;
    if (t === 'imagen') return '📷 Foto';
    if (t === 'video') return '🎥 Video';
    if (t === 'audio') return '🎤 Mensaje de voz';
    if (t === 'sticker') return 'Sticker';
    if (t === 'ubicacion') return '📍 Ubicación';
    if (t === 'contacto') return '👤 Contacto';
    if (t === 'documento' || m.media_path) return '📄 ' + (nombreArchivo(m) || 'Documento');
    return '';
  }
  function nombreArchivo(m) {
    const md = metaDe(m).media || {};
    if (md.nombre) return String(md.nombre);
    const c = String(m.cuerpo || '').trim();
    if (c && /\.[a-z0-9]{2,5}$/i.test(c) && !/\s{2,}/.test(c) && c.length < 120) return c;
    const p = String(m.media_path || '').split('/').pop() || '';
    return p.replace(/^\d{10,}[-_]/, '');
  }
  function tamanoLegible(n) {
    n = Number(n); if (!n || n < 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1).replace(/\.0$/, '') + ' MB';
  }
  function iconoArchivo(nombre, mime) {
    const ext = (String(nombre || '').split('.').pop() || '').toLowerCase();
    const mm = String(mime || '').toLowerCase();
    if (ext === 'pdf' || mm.includes('pdf')) return ['ti-file-type-pdf', 'PDF'];
    if (/^docx?$/.test(ext) || mm.includes('word')) return ['ti-file-type-doc', 'Word'];
    if (/^xlsx?$/.test(ext) || mm.includes('sheet') || mm.includes('excel')) return ['ti-file-type-xls', 'Excel'];
    if (/^pptx?$/.test(ext) || mm.includes('presentation')) return ['ti-file-type-ppt', 'PowerPoint'];
    if (ext === 'zip' || mm.includes('zip')) return ['ti-file-zip', 'ZIP'];
    if (ext === 'csv') return ['ti-file-spreadsheet', 'CSV'];
    if (ext === 'txt' || mm.startsWith('text/')) return ['ti-file-text', 'Texto'];
    return ['ti-file', ext ? ext.toUpperCase() : 'Archivo'];
  }
  function ubicacionDe(m) {
    const u = metaDe(m).ubicacion;
    if (u && isFinite(Number(u.lat)) && isFinite(Number(u.lng))) return { lat: Number(u.lat), lng: Number(u.lng), nombre: u.nombre || '', direccion: u.direccion || '' };
    const mt = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/.exec(String(m.cuerpo || ''));
    if (!mt) return null;
    const resto = String(m.cuerpo || '').replace(mt[0], '').replace(/^[\s:·|-]+|[\s:·|-]+$/g, '').replace(/\s+/g, ' ');
    return { lat: Number(mt[1]), lng: Number(mt[2]), nombre: resto && !/^ubicaci[oó]n$/i.test(resto) ? resto : '', direccion: '' };
  }
  function contactoDe(m) {
    const c = (metaDe(m).contactos || [])[0];
    if (c && (c.nombre || (c.telefonos || []).length)) return { nombre: c.nombre || 'Contacto', telefono: (c.telefonos || [])[0] || '' };
    const cuerpo = String(m.cuerpo || '').trim();
    const tel = /\+?\d[\d\s().-]{7,}\d/.exec(cuerpo);
    const nombre = cuerpo.replace(tel ? tel[0] : '', '').replace(/^contacto\s*[:·-]?\s*/i, '').replace(/[\s:·()|-]+$/g, '').replace(/^[\s:·()|-]+/g, '').trim();
    if (!tel && !nombre) return null;
    return { nombre: nombre || 'Contacto', telefono: tel ? tel[0] : '' };
  }
  function resumenMensaje(m) {
    if (!m) return '';
    if (m.tipo_contenido && m.tipo_contenido !== 'text' && esCuerpoGenerico(m)) return etiquetaTipo(m) || 'Mensaje';
    if (m.cuerpo) {
      // Antes era un slice(0,120) seco: cortaba a media palabra y sin puntos
      // suspensivos, asi que el citado terminaba en cosas como "...PUEDES CON" y
      // no habia forma de saber que seguia. Se corta en el ultimo espacio y se
      // marca el corte.
      const txt = String(m.cuerpo).replace(/\s+/g, ' ').trim();
      if (txt.length <= 120) return txt;
      const corte = txt.slice(0, 120);
      const esp = corte.lastIndexOf(' ');
      return (esp > 60 ? corte.slice(0, esp) : corte).trimEnd() + '…';
    }
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
    // subCabecera: texto plano (cargando) o {telefono, ventanaAbierta}
    const sub = subCabecera && typeof subCabecera === 'object'
      ? `<span class="nxWaHeadTel">${esc(formatearTelefono(subCabecera.telefono))}</span><span class="nxWaHeadWin ${subCabecera.ventanaAbierta ? 'ok' : 'off'}"><i class="ti ${subCabecera.ventanaAbierta ? 'ti-circle-check' : 'ti-clock'}"></i>${subCabecera.ventanaAbierta ? 'ventana abierta' : 'solo plantilla'}</span>`
      : esc(subCabecera || '');
    return `<div class="nxWaHead"><div class="nxWaHeadMain"><button class="nxWaHeadAct nxWaBackMob" onclick="nxWaCerrarDetalleMob()" aria-label="Volver a conversaciones"><i class="ti ti-arrow-left"></i></button><div class="nxWaHeadAvatar">${esc(inicialesCabecera || '?')}</div><div class="nxWaHeadText"><span class="nxWaHeadName">${nombreCabecera}</span><span class="nxWaHeadSub">${sub}</span></div></div><button class="nxWaHeadAct" onclick="nxWaToggleBuscar()" title="Buscar en este chat"><i class="ti ti-search"></i></button></div>`;
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
    return { key: 'ok', label: 'Al día', cls: 'ok' };
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
      let estado = { key: 'aldia', label: 'Al día', cls: 'ok' };
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
        ${tab('aldia', 'Al día')}
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
    const fila = h => {
      const nombre = h.nombre_perfil || h.telefono_e164 || 'Sin nombre';
      const cliente = clienteDeHilo(h);
      const tag = waClasificarHilo(h);
      const on = h.id === hiloAbiertoId ? ' on' : '';
      const noLeidos = Number(h.no_leidos_count) || 0;
      const silenciado = hiloSilenciado(h);
      const borrador = h.id !== hiloAbiertoId ? borradoresPorHilo.get(h.id).trim() : '';
      const preview = borrador ? `<span class="nxWaPrevDraft">Borrador:</span> ${esc(borrador)}` : previewFila(h);
      const cls = `nxWaRow${on}${noLeidos ? ' nxWaUnread' : ''}${hiloFijado(h) ? ' nxWaPinned' : ''}${silenciado ? ' nxWaMuted' : ''}${hiloArchivado(h) ? ' nxWaArchived' : ''}`;
      return `<div class="nxWaRowWrap"><div class="${cls}" data-hilo="${h.id}" onclick="nxWaAbrirHilo('${h.id}')">
        <div class="nxWaAv">${esc(iniciales(cliente?.nom || nombre))}</div>
        <div class="nxWaWho"><b>${esc(cliente?.nom || nombre)}</b><span>${preview}</span><em class="nxWaTag ${tag.cls}">${esc(tag.label)}</em></div>
        <div class="nxWaRowMeta">
          <span class="nxWaTime">${horaRel(h.ultimo_mensaje_at)}</span>
          <span class="nxWaRowIcos">${hiloFijado(h) ? '<i class="ti ti-pin" title="Fijado"></i>' : ''}${silenciado ? '<i class="ti ti-bell-off" title="Silenciado"></i>' : ''}${noLeidos ? `<span class="nxWaBadge">${noLeidos}</span>` : ''}</span>
        </div>
      </div></div>`;
    };
    const activos = ordenarHilos(lista.filter(h => !hiloArchivado(h)));
    const archivados = ordenarHilos(lista.filter(hiloArchivado));
    const cab = archivados.length ? `<div class="nxWaArchRow${mostrarArchivados ? ' abierto' : ''}" onclick="nxWaToggleArchivados()"><i class="ti ti-archive"></i><b>Archivados</b><span class="nxWaArchCount">${archivados.length}</span><i class="ti ti-chevron-down nxWaArchChev"></i></div>` : '';
    const secArch = archivados.length && mostrarArchivados ? `<div class="nxWaArchSec">${archivados.map(fila).join('')}</div>` : '';
    cont.innerHTML = cab + secArch + activos.map(fila).join('') + (!activos.length && !archivados.length ? '<div class="nxWaEmpty">No hay conversaciones en este filtro.</div>' : '');
    try { document.dispatchEvent(new CustomEvent('nxwa:lista', { detail: { hilos: hilos } })); } catch (e) {}
  }
  window.nxWaToggleArchivados = function () { mostrarArchivados = !mostrarArchivados; pintarLista(); };
  window.nxWaHilos = () => hilos;
  window.nxWaHiloAbierto = () => hiloAbiertoId;
  window.nxWaListaSoporta = listaSoporta;
  window.nxWaHiloSilenciado = hiloSilenciado;
  // Acciones de la lista (fijar / archivar / silenciar / leído / no leído). Escriben SOLO por RPC
  // (whatsapp_hilos no tiene UPDATE por RLS) y actualizan la fila en memoria de inmediato; el
  // refresco de Realtime confirma después con el dato real del servidor.
  window.nxWaHiloAccion = async function (id, accion, valor) {
    const h = hilos.find(x => x.id === id); if (!h) return false;
    const A = api(); if (!A?.post) return false;
    let rpc, body, patch;
    if (accion === 'fijar') { rpc = 'whatsapp_hilo_fijar'; body = { p_hilo_id: id, p_fijar: !!valor }; patch = { fijado_at: valor ? new Date().toISOString() : null }; }
    else if (accion === 'archivar') { rpc = 'whatsapp_hilo_archivar'; body = { p_hilo_id: id, p_archivar: !!valor }; patch = { archivado_at: valor ? new Date().toISOString() : null }; }
    else if (accion === 'silenciar') { rpc = 'whatsapp_hilo_silenciar'; body = { p_hilo_id: id, p_hasta: valor || null }; patch = { silenciado_hasta: valor || null }; }
    else if (accion === 'no_leido') { rpc = 'whatsapp_marcar_hilo_no_leido'; body = { p_hilo_id: id }; patch = { no_leidos_count: Math.max(1, Number(h.no_leidos_count) || 0) }; }
    else if (accion === 'leido') { rpc = 'whatsapp_marcar_hilo_leido'; body = { p_hilo_id: id }; patch = { no_leidos_count: 0 }; }
    else return false;
    try { await A.post('rpc/' + rpc, body); } catch (e) { try { toast('err', 'No se pudo aplicar', String(e && e.message || e)); } catch (e2) {} return false; }
    Object.assign(h, patch);
    if (accion === 'archivar' && valor && hiloAbiertoId === id) window.nxWaCerrarDetalleMob();
    pintarLista();
    return true;
  };

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
    // El contador de no leídos se guarda ANTES de ponerlo a 0: con él se pinta el divisor
    // «N mensajes no leídos» y se hace el scroll inicial hasta ahí.
    noLeidosAlAbrir.clear();
    noLeidosAlAbrir.set(id, { n: Number(h?.no_leidos_count) || 0, ancla: null, hecho: false });
    nuevosSinVer = 0; idsRenderPrevio = new Set(); audioActivo = null;
    // whatsapp_hilos no tiene policy de UPDATE para authenticated a proposito (todo escribe via
    // RPC/service role) -- un PATCH directo aqui lo bloquearia RLS en silencio.
    if (h && h.no_leidos_count) { h.no_leidos_count = 0; try { await api().post('rpc/whatsapp_marcar_hilo_leido', { p_hilo_id: id }); } catch (e) {} }
    confirmarLecturaAlCliente(id);
    await cargarMensajes(id, miToken);
    pintarLista(); pintarDetalle();
    asegurarScrollFondoInicial(id);
  };

  // Confirmación de lectura hacia el cliente (Edge whatsapp-inbox-leer): marca leído y pide a Zernio
  // el «read» del último entrante para que el cliente vea ✓✓ azul. No bloquea la UI y tolera que la
  // función aún no exista (404/500): la RPC local de arriba ya dejó el hilo leído en NEXUS.
  function confirmarLecturaAlCliente(hiloId) {
    const A = api(); if (!A?.url || !hiloId) return;
    try {
      fetch(`${A.url}/functions/v1/whatsapp-inbox-leer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ hilo_id: hiloId, accion: 'leer' })
      }).catch(() => {});
    } catch (e) {}
  }

  function mediaEnBurbuja(m) {
    const t = m.tipo_contenido;
    if (t === 'ubicacion') {
      const u = ubicacionDe(m);
      if (!u) return '';
      const href = `https://maps.google.com/?q=${u.lat},${u.lng}`;
      const coords = `${u.lat.toFixed(5)}, ${u.lng.toFixed(5)}`;
      return `<a class="nxWaCard nxWaLocCard" href="${href}" target="_blank" rel="noopener"><span class="nxWaLocMap"><i class="ti ti-map-pin-filled"></i></span><span class="nxWaCardTx"><b>${esc(u.nombre || 'Ubicación')}</b><span>${esc(u.direccion || coords)}</span><em>Abrir en Google Maps</em></span></a>`;
    }
    if (t === 'contacto') {
      const c = contactoDe(m);
      if (!c) return '';
      const d = soloDigitos(c.telefono);
      return `<div class="nxWaCard nxWaContactCard"><span class="nxWaCardIco">${esc(iniciales(c.nombre))}</span><span class="nxWaCardTx"><b>${esc(c.nombre)}</b><span>${esc(c.telefono ? formatearTelefono(c.telefono) : 'Sin teléfono')}</span></span>${d ? `<button type="button" class="nxWaContactBtn" onclick="nxWaMensajeAContacto('${d}')"><i class="ti ti-brand-whatsapp"></i> Mensaje</button>` : ''}</div>`;
    }
    if (!m.media_path) return '';
    if (!m._url) return '<div class="nxWaCard"><span class="nxWaCardIco"><i class="ti ti-paperclip"></i></span><span class="nxWaCardTx"><b>Adjunto no disponible</b></span></div>';
    const url = esc(m._url), id = esc(m.id);
    if (t === 'sticker') return `<img class="nxWaSticker" src="${url}" alt="Sticker" onload="nxWaMediaLoaded()">`;
    if (t === 'imagen') return `<img class="nxWaImg" src="${url}" alt="Imagen" onload="nxWaMediaLoaded()" onclick="nxWaVerMedia('${id}')">`;
    if (t === 'video') return `<span class="nxWaVideoWrap"><video controls playsinline preload="metadata" src="${url}" onloadedmetadata="nxWaMediaLoaded()"></video><button type="button" class="nxWaVideoExpand" aria-label="Ver a pantalla completa" onclick="nxWaVerMedia('${id}')"><i class="ti ti-arrows-maximize"></i></button></span>`;
    if (t === 'audio') {
      const md = metaDe(m).media || {};
      const voz = !md.nombre;
      return `<div class="nxWaAudio${voz ? ' voz' : ''}" data-id="${id}" data-src="${url}">${voz ? '<span class="nxWaAudioMic"><i class="ti ti-microphone"></i></span>' : ''}<button type="button" class="nxWaAudioPlay" aria-label="Reproducir"><i class="ti ti-player-play-filled"></i></button><div class="nxWaAudioBar" role="slider" aria-label="Posición"><div class="nxWaAudioFill"></div><div class="nxWaAudioKnob"></div></div><span class="nxWaAudioTime">--:--</span><button type="button" class="nxWaAudioRate" aria-label="Velocidad">1x</button><audio preload="metadata" src="${url}"></audio></div>`;
    }
    const md = metaDe(m).media || {};
    const nombre = nombreArchivo(m) || 'Documento';
    const [ico, tipo] = iconoArchivo(nombre, md.mime);
    const tam = tamanoLegible(md.tamano);
    return `<a class="nxWaCard nxWaDoc" href="${url}" target="_blank" rel="noopener" download="${esc(nombre)}"><span class="nxWaCardIco"><i class="ti ${ico}"></i></span><span class="nxWaCardTx"><b>${esc(nombre)}</b><span>${esc([tipo, tam].filter(Boolean).join(' · '))}</span></span><span class="nxWaCardAct"><i class="ti ti-download"></i></span></a>`;
  }

  function citaHtml(q) {
    if (!q) return '';
    let thumb = '';
    if (q.tipo_contenido === 'imagen' && q._url) thumb = `<img class="nxWaQuoteThumb" src="${esc(q._url)}" alt="">`;
    else if (q.tipo_contenido === 'video') thumb = '<div class="nxWaQuoteThumb"><i class="ti ti-video"></i></div>';
    else if (q.tipo_contenido === 'sticker' && q._url) thumb = `<img class="nxWaQuoteThumb" src="${esc(q._url)}" alt="">`;
    return `<div class="nxWaQuote${thumb ? ' hasThumb' : ''}" onclick="nxWaIrAMensaje('${esc(q.id)}')"><div class="nxWaQuoteTx"><b>${esc(autorMensaje(q))}</b><span>${esc(resumenMensaje(q))}</span></div>${thumb}</div>`;
  }

  function metaHtml(m) {
    const star = m.destacado_at ? '<i class="ti ti-star-filled nxWaStar"></i>' : '';
    let estado = '';
    if (m.direccion === 'out') {
      const inf = estadoInfo(m.estado);
      if (inf) {
        const antes = estadoPrevioMsg.get(String(m.id));
        estadoPrevioMsg.set(String(m.id), m.estado);
        const recienLeido = m.estado === 'leido' && antes && antes !== 'leido';
        const titulo = inf.txt + (m.estado === 'fallido' && m.error_detalle ? ' · ' + String(m.error_detalle).slice(0, 160) : '');
        estado = `<span class="nxWaMsgState ${inf.cls}${recienLeido ? ' nxWaCheckJustRead' : ''}" title="${esc(titulo)}" aria-label="${esc(inf.txt)}"><i class="nxWaMsgCheck">${inf.glifo}</i>${m.estado === 'fallido' ? `<span>No enviado</span><button type="button" class="nxWaRetry" onclick="nxWaReintentarMensaje('${esc(m.id)}')">Reintentar</button>` : ''}</span>`;
      }
    }
    return `<div class="nxWaMsgMeta">${star}<span class="nxWaMsgTime">${esc(horaMsg(m.created_at))}</span>${estado}</div>`;
  }

  function reaccionHtml(m) {
    const ag = m.reaccion_agente || '', cl = m.reaccion_cliente || '';
    if (!ag && !cl) return '';
    return `<span class="nxWaReactionBadge">${cl ? `<span class="cl">${esc(cl)}</span>` : ''}${ag ? `<span class="ag">${esc(ag)}</span>` : ''}</span>`;
  }

  // Pinta un mensaje con su separador de día y, si toca, el divisor de no leídos delante.
  // `lista` son los mensajes visibles (sin ocultos) en orden cronológico.
  function renderBurbuja(m, idx, lista, porId, anclaNoLeidos, nNoLeidos) {
    const prev = lista[idx - 1], next = lista[idx + 1];
    const dia = diaKey(m.created_at);
    const mismoDiaPrev = !!prev && diaKey(prev.created_at) === dia;
    const samePrev = mismoDiaPrev && prev.direccion === m.direccion;
    const sameNext = !!next && next.direccion === m.direccion && diaKey(next.created_at) === dia;
    const sep = mismoDiaPrev ? '' : `<div class="nxWaDaySep">${esc(etiquetaDia(m.created_at))}</div>`;
    const unread = anclaNoLeidos && String(m.id) === anclaNoLeidos ? `<div class="nxWaUnreadSep">${nNoLeidos === 1 ? '1 mensaje no leído' : nNoLeidos + ' mensajes no leídos'}</div>` : '';
    const q = m.responde_a_id ? porId.get(String(m.responde_a_id)) : null;
    const hit = busquedaChat.ids.includes(String(m.id)) ? ' hit' : '';
    const t = m.tipo_contenido || 'text';
    const conMedia = t !== 'text';
    const texto = (!conMedia || !esCuerpoGenerico(m)) && m.cuerpo && !(t === 'documento' && String(m.cuerpo).trim() === nombreArchivo(m)) ? String(m.cuerpo).replace(/^\s*\n\s*/, '').replace(/\s*\n\s*$/, '') : '';
    const corto = !conMedia && !q && texto && texto.length <= 28 && !/\n/.test(texto) && m.estado !== 'fallido' && !m.reenviado;
    const cls = ['nxWaBub', m.direccion, hit.trim(), corto ? 'nxWaRefShort' : '', t === 'sticker' ? 'nxWaStickerBub' : '', conMedia ? 'nxWaMediaBub' : ''].filter(Boolean).join(' ');
    const fwd = m.reenviado ? '<div class="nxWaFwd"><i class="ti ti-corner-up-right"></i>Reenviado</div>' : '';
    const cuerpo = texto ? `<span class="nxWaMsgText">${linkify(texto)}</span>` : '';
    const wrapCls = ['nxWaBubWrap', m.direccion, samePrev ? 'same-prev' : 'diff-prev', sameNext ? '' : 'nxWaTail', (m.reaccion_agente || m.reaccion_cliente) ? 'nxWaHasReaction' : ''].filter(Boolean).join(' ');
    // CUIDADO: la burbuja usa white-space:pre-wrap, asi que la indentacion de ESTE template se
    // DIBUJA en pantalla. Todo lo que va dentro de .nxWaBub se concatena sin saltos ni sangria.
    // data-nx-wa-ref-text="1": replica-referencia no vuelve a envolver el texto (ya va en .nxWaMsgText).
    return `${sep}${unread}<div id="nxWaMsg-${esc(m.id)}" class="${wrapCls}" onpointerdown="nxWaSwipeStart(event,'${esc(m.id)}')" onpointermove="nxWaSwipeMove(event)" onpointerup="nxWaSwipeEnd(event)" ontouchstart="nxWaLongStart(event,'${esc(m.id)}')" ontouchend="nxWaLongEnd()" ontouchmove="nxWaLongEnd()"><div class="${cls}" data-nx-wa-ref-text="1" data-nx-wa-msg-id="${esc(m.id)}" data-nx-wa-estado="${esc(m.estado || '')}"><button class="nxWaBubMenu" onclick="nxWaMsgMenu(event,'${esc(m.id)}')"><i class="ti ti-chevron-down"></i></button>${fwd}${citaHtml(q)}${mediaEnBurbuja(m)}${cuerpo}${metaHtml(m)}</div>${reaccionHtml(m)}</div>`;
  }

  function mensajesVisibles() { return mensajes.filter(m => !m.oculto_at); }

  function recomputarBusqueda() {
    const q = String(busquedaChat.q || '').trim().toLowerCase();
    if (!q) { busquedaChat.ids = []; busquedaChat.idx = 0; return; }
    busquedaChat.ids = mensajesVisibles().filter(m => String(m.cuerpo || '').toLowerCase().includes(q)).map(m => String(m.id));
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
      if (chatEstaAlFondo(box)) { hilosPegadosAlFondo.add(hiloId); if (nuevosSinVer) { nuevosSinVer = 0; actualizarContadorNuevos(); } }
      else hilosPegadosAlFondo.delete(hiloId);
      if (box.scrollTop < 120 && !hilosConScrollInicial.has(hiloId) && !box.classList.contains('prep-bottom') && !$('#v-waInbox')?.classList.contains('nxWaBottomPreparing')) cargarAntiguos(hiloId);
    };
  }
  // Historial hacia atrás: al llegar arriba se piden 100 mensajes anteriores al primero cargado
  // (cursor created_at=lt.) y se conserva la posición de lectura.
  async function cargarAntiguos(hiloId) {
    if (cargandoAntiguos || historialCompleto.has(hiloId) || mensajesHiloId !== hiloId || hiloAbiertoId !== hiloId || !mensajes.length) return;
    const A = api(); if (!A?.get) return;
    const primero = mensajes[0];
    cargandoAntiguos = hiloId;
    $('#nxWaMsgsBox .nxWaOlder')?.classList.add('on');
    try {
      let datos = await A.get('whatsapp_hilo_mensajes', `hilo_id=eq.${hiloId}&created_at=lt.${encodeURIComponent(primero.created_at)}&order=created_at.desc,id.desc&limit=100&select=*`) || [];
      if (datos.length < 100) historialCompleto.add(hiloId);
      datos = datos.slice().reverse();
      for (const m of datos) { if (m.media_path) m._url = await urlFirmada(m.media_path); }
      if (mensajesHiloId !== hiloId || hiloAbiertoId !== hiloId) return;
      const ya = new Set(mensajes.map(m => String(m.id)));
      const nuevos = datos.filter(m => !ya.has(String(m.id)));
      if (!nuevos.length) return;
      antiguosPorHilo.set(hiloId, nuevos.concat(antiguosPorHilo.get(hiloId) || []));
      mensajes = nuevos.concat(mensajes);
      const box = $('#nxWaMsgsBox');
      const altoPrevio = box ? box.scrollHeight : 0, topPrevio = box ? box.scrollTop : 0;
      hilosPegadosAlFondo.delete(hiloId);
      pintarDetalle();
      const nuevoBox = $('#nxWaMsgsBox');
      if (nuevoBox) { nxWaIgnorarScrollHasta = Date.now() + 300; nuevoBox.scrollTop = nuevoBox.scrollHeight - altoPrevio + topPrevio; }
    } catch (e) { console.error('[WA Inbox] mensajes anteriores', e);
    } finally {
      cargandoAntiguos = null;
      $('#nxWaMsgsBox .nxWaOlder')?.classList.remove('on');
    }
  }
  function actualizarContadorNuevos() {
    window.__nxWaNuevosSinVer = nuevosSinVer;
    try { if (typeof window.nxWaLatestSync === 'function') window.nxWaLatestSync(); } catch (e) {}
  }
  // Scroll inicial hasta el divisor «N mensajes no leídos» (si quedó fuera de la vista) una vez que
  // parches-whatsapp-scroll-estable soltó el anclaje al fondo.
  function programarScrollADivisor(hiloId) {
    const nl = noLeidosAlAbrir.get(hiloId);
    if (!nl || !nl.n || nl.hecho) return;
    nl.hecho = true;
    let intentos = 0;
    const paso = () => {
      if (hiloAbiertoId !== hiloId) return;
      const root = $('#v-waInbox'), box = $('#nxWaMsgsBox'), sep = box && box.querySelector('.nxWaUnreadSep');
      const preparando = !box || !sep || hilosConScrollInicial.has(hiloId) || box.classList.contains('prep-bottom') || (root && root.classList.contains('nxWaBottomPreparing'));
      if (preparando) { if (++intentos < 40) setTimeout(paso, 100); return; }
      const arriba = sep.offsetTop - box.scrollTop;
      if (arriba < 8) {
        hilosPegadosAlFondo.delete(hiloId);
        nxWaIgnorarScrollHasta = Date.now() + 400;
        box.scrollTop = Math.max(0, sep.offsetTop - 10);
      }
    };
    setTimeout(paso, 120);
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
    setTimeout(() => programarScrollADivisor(hiloId), 480);
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
    const nombreCabecera = esc(cliente?.nom || h?.nombre_perfil || formatearTelefono(h?.telefono_e164) || '');
    const subCabecera = { telefono: h?.telefono_e164 || '', ventanaAbierta: !!ventanaAbierta };
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
    const visibles = mensajesVisibles();
    // Divisor de no leídos: anclado al primer mensaje entrante de los N que había sin leer al abrir;
    // el ancla se conserva entre repintados aunque lleguen mensajes nuevos.
    const nl = noLeidosAlAbrir.get(hiloAbiertoId);
    let ancla = null;
    if (nl && nl.n > 0) {
      if (nl.ancla && visibles.some(m => String(m.id) === nl.ancla)) ancla = nl.ancla;
      else {
        let c = 0;
        for (let i = visibles.length - 1; i >= 0; i--) { if (visibles[i].direccion === 'in') { c++; ancla = String(visibles[i].id); if (c === nl.n) break; } }
        nl.ancla = ancla;
      }
    }
    // Contador de nuevos: mensajes entrantes que llegan mientras el agente lee más arriba.
    // (solo cuentan los que llegan al final: los antiguos que se prependen con el scroll hacia arriba, no)
    if (ultimoRenderHiloId === hiloAbiertoId && idsRenderPrevio.size && ultimoCreatedRender) {
      const nuevosIn = visibles.filter(m => m.direccion === 'in' && !idsRenderPrevio.has(String(m.id)) && String(m.created_at) > ultimoCreatedRender).length;
      if (nuevosIn && !estabaAlFondo) nuevosSinVer += nuevosIn;
    }
    if (estabaAlFondo) nuevosSinVer = 0;
    idsRenderPrevio = new Set(visibles.map(m => String(m.id)));
    ultimoCreatedRender = visibles.length ? String(visibles[visibles.length - 1].created_at) : '';
    const cargando = cargandoAntiguos === hiloAbiertoId ? ' on' : '';
    const older = historialCompleto.has(hiloAbiertoId) && !cargando ? '' : `<div class="nxWaOlderWrap"><span class="nxWaOlder${cargando}"><i class="ti ti-loader-2"></i>Cargando mensajes anteriores…</span></div>`;
    const filas = visibles.length ? older + visibles.map((m, i) => renderBurbuja(m, i, visibles, porId, ancla, nl ? nl.n : 0)).join('') : '<div class="nxWaEmpty">Sin mensajes todavía.</div>';
    const borrador = borradoresPorHilo.get(hiloAbiertoId) || valorPrevio || '';
    const resp = respuestaActiva ? `<div class="nxWaReplyBar"><div class="tx"><b>Respondiendo a ${esc(respuestaActiva.autor || 'Cliente')}</b><span>${esc(respuestaActiva.texto || '')}</span></div><button onclick="nxWaCancelarRespuesta()">×</button></div>` : '';
    if (scrollInicial) cont.classList.add('prep-bottom'); else cont.classList.remove('prep-bottom');
    cont.innerHTML = `${cabeceraChat(nombreCabecera, subCabecera, inicialesCabecera)}${barraBusquedaChat()}
      <div class="nxWaMsgs ${scrollInicial ? 'prep-bottom' : ''}" id="nxWaMsgsBox">${filas}</div>
      ${ventanaAbierta
        // El boton de clip NO se puede borrar de aqui, aunque al usuario no se le muestre.
        // enhanceComposer() en replica-referencia lo usa como ancla de TODO el composer:
        //   const attach=$('.nxWaIconBtn',comp); if(!inp||!attach) return;
        //   plus.addEventListener('click', ... attach.click());
        //   pill.appendChild(attach);
        // Sin el, esa funcion sale por el return y desaparecen tambien el emoji y la
        // camara. Ademas es el boton que el usuario ve y usa para adjuntar: el + que
        // antes hacia de intermediario se elimino por duplicar esta misma accion.
        ? `<div class="nxWaComposerWrap">${resp}<div class="nxWaComposer"><button class="nxWaIconBtn" onclick="toast('info','Adjuntos','Queda reservado para la siguiente fase: foto, video y documento con envío real.')"><i class="ti ti-paperclip"></i></button><textarea id="nxWaTexto" ${hiloEnviosEnVuelo.has(hiloAbiertoId) ? 'disabled' : ''} placeholder="Escribe un mensaje…" rows="1" oninput="nxWaTextoInput(this)" onkeydown="nxWaKey(event)">${esc(borrador)}</textarea><button onclick="nxWaEnviar()"><i class="ti ti-send"></i></button></div></div>`
        : `<div class="nxWaCerrada">Pasaron más de 24h desde el último mensaje del cliente — espera a que vuelva a escribir para poder responder con texto libre.
            ${(h?.cliente_id && waMesesAtraso(cliente) > 0) ? `<button class="nxWaBtnRecordatorio" ${hilosRecordatorioEnVuelo.has(hiloAbiertoId) ? 'disabled' : ''} onclick="nxWaRecordatorioManual('${h.cliente_id}','${hiloAbiertoId}',this)"><i class="ti ti-brand-whatsapp"></i> ${hilosRecordatorioEnVuelo.has(hiloAbiertoId) ? 'Enviando…' : 'Enviar recordatorio de pago ahora'}</button>` : ''}
          </div>`}`;

    const nuevoBox = $('#nxWaMsgsBox');
    if (nuevoBox) nuevoBox.scrollTop = estabaAlFondo ? nuevoBox.scrollHeight : (boxPrevio ? boxPrevio.scrollTop : nuevoBox.scrollHeight);
    if (nuevoBox) vigilarScrollManual(nuevoBox, hiloAbiertoId);
    if (nuevoBox) vigilarAlturaMensajes(nuevoBox, hiloAbiertoId);
    if (nuevoBox) { prepararAudios(nuevoBox); actualizarContadorNuevos(); }
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
  // Indicador «escribiendo…» hacia el cliente (Edge whatsapp-inbox-leer): como máximo una vez cada
  // 20 s por hilo mientras se teclea, nunca con el campo vacío, sin bloquear y tolerando que la
  // función aún no exista (404/500/{ok:false} se ignoran).
  const escribiendoUltimo = new Map();
  function avisarEscribiendo(hiloId) {
    const ahora = Date.now();
    if ((ahora - (escribiendoUltimo.get(hiloId) || 0)) < 20000) return;
    escribiendoUltimo.set(hiloId, ahora);
    const A = api(); if (!A?.url) return;
    try {
      fetch(`${A.url}/functions/v1/whatsapp-inbox-leer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ hilo_id: hiloId, accion: 'escribiendo' })
      }).catch(() => {});
    } catch (e) {}
  }
  window.nxWaTextoInput = function (el) {
    ajustarTexto(el);
    if (hiloAbiertoId) {
      borradoresPorHilo.set(hiloAbiertoId, el.value || '');
      if ((el.value || '').trim()) avisarEscribiendo(hiloAbiertoId);
    }
  };
  window.nxWaKey = function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); window.nxWaEnviar(); }
  };
  window.nxWaCerrarDetalleMob = function () {
    guardarBorradorActual();
    hiloAbiertoId = null; respuestaActiva = null; mensajes = []; mensajesHiloId = null;
    noLeidosAlAbrir.clear(); nuevosSinVer = 0; idsRenderPrevio = new Set(); audioActivo = null; actualizarContadorNuevos();
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

  // ── API para las capas del menú de mensaje (destacar / borrar para mí) ──
  window.nxWaMarcarDestacado = function (id, destacadoAt) {
    const m = mensajes.find(x => String(x.id) === String(id)); if (!m) return;
    m.destacado_at = destacadoAt || null;
    pintarDetalle();
  };
  window.nxWaMarcarOculto = function (id) {
    const m = mensajes.find(x => String(x.id) === String(id)); if (!m) return;
    m.oculto_at = new Date().toISOString();
    pintarDetalle();
  };
  window.nxWaMensajeCargado = function (id) { return mensajes.find(x => String(x.id) === String(id)) || null; };

  // «Mensaje» en una tarjeta de contacto: hilo existente con ese número, si no el cliente con ese
  // teléfono, y si no hay ninguno se muestra el número (copiado al portapapeles).
  window.nxWaMensajeAContacto = async function (tel) {
    const d = soloDigitos(tel); if (!d) return;
    const coincide = v => { const x = soloDigitos(v); return x && (x === d || x.endsWith(d) || d.endsWith(x)) && Math.min(x.length, d.length) >= 10; };
    const h = hilos.find(x => coincide(x.telefono_e164));
    if (h) { await window.nxWaAbrirHilo(h.id); return; }
    const c = clientes().find(x => coincide(x.wa) || coincide(x.tel));
    if (c && c.id) { await window.nxAbrirWhatsAppDeCliente(c.id); return; }
    try { await navigator.clipboard.writeText('+' + d); } catch (e) {}
    try { toast('info', 'Sin conversación con ese número', formatearTelefono('+' + d) + ' · copiado'); } catch (e) {}
  };

  // ── Reproductor de audio (sobre el <audio> oculto de cada nota) ──
  function fmtSeg(s) { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function pintarProgresoAudio(w, a) {
    const dur = isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
    const f = dur ? Math.min(1, a.currentTime / dur) : 0;
    const fill = w.querySelector('.nxWaAudioFill'), knob = w.querySelector('.nxWaAudioKnob'), t = w.querySelector('.nxWaAudioTime');
    if (fill) fill.style.width = (f * 100) + '%';
    if (knob) knob.style.left = (f * 100) + '%';
    if (t) t.textContent = (a.paused && !a.currentTime) ? (dur ? fmtSeg(dur) : '--:--') : fmtSeg(a.currentTime);
  }
  function prepararAudios(box) {
    box.querySelectorAll('.nxWaAudio').forEach(w => {
      const a = w.querySelector('audio'); if (!a || a.dataset.nxWaAudioOk) return;
      a.dataset.nxWaAudioOk = '1';
      const id = w.dataset.id;
      const sync = () => pintarProgresoAudio(w, a);
      a.addEventListener('loadedmetadata', sync);
      a.addEventListener('durationchange', sync);
      a.addEventListener('timeupdate', () => { sync(); if (audioActivo && audioActivo.id === id) { audioActivo.t = a.currentTime; audioActivo.playing = !a.paused; } });
      a.addEventListener('play', () => { w.classList.add('playing'); const i = w.querySelector('.nxWaAudioPlay i'); if (i) i.className = 'ti ti-player-pause-filled'; box.querySelectorAll('.nxWaAudio audio').forEach(o => { if (o !== a && !o.paused) o.pause(); }); audioActivo = { id, t: a.currentTime, playing: true, rate: a.playbackRate }; });
      a.addEventListener('pause', () => { w.classList.remove('playing'); const i = w.querySelector('.nxWaAudioPlay i'); if (i) i.className = 'ti ti-player-play-filled'; if (audioActivo && audioActivo.id === id) audioActivo.playing = false; });
      a.addEventListener('ended', () => { a.currentTime = 0; sync(); if (audioActivo && audioActivo.id === id) audioActivo = null; });
      // Un repintado (Realtime) destruye el nodo: la nota que sonaba sigue desde donde iba.
      if (audioActivo && audioActivo.id === id) {
        a.playbackRate = audioActivo.rate || 1;
        const r = w.querySelector('.nxWaAudioRate'); if (r) r.textContent = (audioActivo.rate || 1) + 'x';
        const reanudar = () => { try { a.currentTime = audioActivo.t || 0; } catch (e) {} sync(); if (audioActivo.playing) a.play().catch(() => {}); };
        if (a.readyState >= 1) reanudar(); else a.addEventListener('loadedmetadata', reanudar, { once: true });
      } else if (a.readyState >= 1) sync();
    });
  }
  function audioDesde(el) { const w = el.closest('.nxWaAudio'); return w ? { w, a: w.querySelector('audio') } : null; }
  function manejarClickAudio(e) {
    const play = e.target.closest('#nxWaMsgsBox .nxWaAudioPlay');
    if (play) { e.preventDefault(); e.stopPropagation(); const x = audioDesde(play); if (!x?.a) return; if (x.a.paused) x.a.play().catch(() => { try { toast('err', 'No se pudo reproducir el audio'); } catch (_e) {} }); else x.a.pause(); return; }
    const rate = e.target.closest('#nxWaMsgsBox .nxWaAudioRate');
    if (rate) { e.preventDefault(); e.stopPropagation(); const x = audioDesde(rate); if (!x?.a) return; const r = x.a.playbackRate >= 2 ? 1 : x.a.playbackRate >= 1.5 ? 2 : 1.5; x.a.playbackRate = r; rate.textContent = r + 'x'; if (audioActivo && audioActivo.id === x.w.dataset.id) audioActivo.rate = r; }
  }
  let arrastreAudio = null;
  function manejarBarraAudio(e) {
    const bar = e.target.closest('#nxWaMsgsBox .nxWaAudioBar'); if (!bar) return;
    e.stopPropagation(); e.preventDefault();
    const x = audioDesde(bar); if (!x?.a) return;
    const mover = ev => {
      const r = bar.getBoundingClientRect(); const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / Math.max(1, r.width)));
      const dur = isFinite(x.a.duration) && x.a.duration > 0 ? x.a.duration : 0;
      if (dur) { try { x.a.currentTime = f * dur; } catch (_e) {} }
      const fill = x.w.querySelector('.nxWaAudioFill'), knob = x.w.querySelector('.nxWaAudioKnob');
      if (fill) fill.style.width = (f * 100) + '%'; if (knob) knob.style.left = (f * 100) + '%';
      const t = x.w.querySelector('.nxWaAudioTime'); if (t && dur) t.textContent = fmtSeg(f * dur);
    };
    mover(e);
    try { bar.setPointerCapture(e.pointerId); } catch (_e) {}
    arrastreAudio = { bar, mover, id: e.pointerId };
  }
  function moverBarraAudio(e) { if (arrastreAudio && e.pointerId === arrastreAudio.id) { e.stopPropagation(); arrastreAudio.mover(e); } }
  function soltarBarraAudio(e) { if (arrastreAudio && e.pointerId === arrastreAudio.id) { e.stopPropagation(); arrastreAudio = null; } }

  // ── Visor a pantalla completa (imagen / video) con pinch, doble toque, deslizar y descarga ──
  function mediaDelHilo() {
    return mensajesVisibles().filter(m => (m.tipo_contenido === 'imagen' || m.tipo_contenido === 'video') && m._url).map(m => ({ id: String(m.id), url: m._url, tipo: m.tipo_contenido, quien: autorMensaje(m), hora: `${etiquetaDia(m.created_at)} · ${horaMsg(m.created_at)}`, caption: !esCuerpoGenerico(m) ? String(m.cuerpo || '') : '' }));
  }
  window.nxWaVerMedia = function (id) {
    const items = mediaDelHilo();
    const i = items.findIndex(x => x.id === String(id));
    if (i < 0) return;
    window.nxWaLightbox(items, i);
  };
  window.nxWaLightbox = function (items, indice) {
    if (!items || !items.length) return;
    document.querySelectorAll('.nxWaLb').forEach(x => x.remove());
    let idx = Math.max(0, Math.min(indice || 0, items.length - 1));
    const lb = document.createElement('div'); lb.className = 'nxWaLb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Visor de multimedia');
    lb.innerHTML = `<div class="nxWaLbTop"><div class="nxWaLbInfo"></div><div class="nxWaLbActs"><a class="nxWaLbBtn nxWaLbDown" download target="_blank" rel="noopener" aria-label="Descargar" title="Descargar"><i class="ti ti-download"></i></a><button type="button" class="nxWaLbBtn nxWaLbClose" aria-label="Cerrar"><i class="ti ti-x"></i></button></div></div><div class="nxWaLbStage"><button type="button" class="nxWaLbNav prev" aria-label="Anterior"><i class="ti ti-chevron-left"></i></button><button type="button" class="nxWaLbNav next" aria-label="Siguiente"><i class="ti ti-chevron-right"></i></button></div><div class="nxWaLbFoot"><div class="nxWaLbCaption"></div><div class="nxWaLbCount"></div></div>`;
    const stage = lb.querySelector('.nxWaLbStage'), info = lb.querySelector('.nxWaLbInfo'), cap = lb.querySelector('.nxWaLbCaption'), cnt = lb.querySelector('.nxWaLbCount'), down = lb.querySelector('.nxWaLbDown');
    let scale = 1, tx = 0, ty = 0, media = null;
    const aplicar = () => { if (media) media.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; stage.classList.toggle('zoomed', scale > 1); };
    const cerrar = () => { lb.remove(); document.removeEventListener('keydown', teclas); };
    const teclas = e => { if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowLeft') ir(-1); else if (e.key === 'ArrowRight') ir(1); };
    async function mostrar() {
      const it = items[idx];
      scale = 1; tx = 0; ty = 0;
      stage.querySelectorAll('img,video').forEach(x => x.remove());
      let url = it.url;
      if (!url && typeof it.cargar === 'function') { try { url = await it.cargar(); it.url = url; } catch (e) {} }
      if (it.tipo === 'video') { media = document.createElement('video'); media.controls = true; media.playsInline = true; media.autoplay = true; media.src = url || ''; }
      else { media = document.createElement('img'); media.alt = 'Imagen'; media.draggable = false; media.src = url || ''; }
      stage.appendChild(media); aplicar();
      info.innerHTML = `${esc(it.quien || '')}<span>${esc(it.hora || '')}</span>`;
      cap.textContent = it.caption || ''; cap.style.display = it.caption ? '' : 'none';
      cnt.textContent = `${idx + 1} / ${items.length}`;
      down.href = url || '#'; down.setAttribute('download', (it.tipo === 'video' ? 'video-' : 'imagen-') + (it.id || idx));
      lb.querySelector('.nxWaLbNav.prev').disabled = idx <= 0;
      lb.querySelector('.nxWaLbNav.next').disabled = idx >= items.length - 1;
    }
    function ir(d) { const n = idx + d; if (n < 0 || n >= items.length) return; idx = n; mostrar(); }
    lb.querySelector('.nxWaLbClose').onclick = cerrar;
    lb.querySelector('.nxWaLbNav.prev').onclick = e => { e.stopPropagation(); ir(-1); };
    lb.querySelector('.nxWaLbNav.next').onclick = e => { e.stopPropagation(); ir(1); };
    lb.querySelector('.nxWaLbTop').addEventListener('click', e => { if (e.target === e.currentTarget) cerrar(); });
    // Gestos: 1 dedo = deslizar (cambiar / cerrar hacia abajo) o mover la imagen ampliada; 2 dedos = pinch; doble toque = 2.5x.
    const punteros = new Map(); let inicio = null, pinch = null, ultimoTap = 0;
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.nxWaLbNav') || (media && media.tagName === 'VIDEO' && e.target === media)) return;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch (_e) {}
      if (punteros.size === 1) inicio = { x: e.clientX, y: e.clientY, tx, ty, t: Date.now(), movido: false };
      else if (punteros.size === 2) { const [a, b] = [...punteros.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale }; inicio = null; }
    });
    stage.addEventListener('pointermove', e => {
      if (!punteros.has(e.pointerId)) return;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && punteros.size === 2) { const [a, b] = [...punteros.values()]; scale = Math.min(4, Math.max(1, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d))); if (scale === 1) { tx = 0; ty = 0; } aplicar(); return; }
      if (!inicio) return;
      const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) inicio.movido = true;
      if (scale > 1) { tx = inicio.tx + dx; ty = inicio.ty + dy; aplicar(); }
      else if (media && media.tagName !== 'VIDEO') { media.style.transform = `translate(${dx}px,${Math.max(0, dy)}px)`; media.style.opacity = String(Math.max(.35, 1 - Math.max(0, dy) / 300)); }
    });
    const soltar = e => {
      if (!punteros.has(e.pointerId)) return;
      punteros.delete(e.pointerId);
      if (punteros.size < 2) pinch = null;
      if (!inicio) return;
      const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y, dt = Date.now() - inicio.t;
      const tap = !inicio.movido && dt < 350;
      inicio = null;
      if (media) media.style.opacity = '';
      if (tap) { const ahora = Date.now(); if (ahora - ultimoTap < 320 && media && media.tagName !== 'VIDEO') { scale = scale > 1 ? 1 : 2.5; tx = 0; ty = 0; aplicar(); ultimoTap = 0; } else ultimoTap = ahora; return; }
      if (scale > 1) return;
      if (dy > 110 && Math.abs(dx) < 80) { cerrar(); return; }
      if (Math.abs(dx) > 60 && Math.abs(dy) < 90) { ir(dx < 0 ? 1 : -1); return; }
      aplicar();
    };
    stage.addEventListener('pointerup', soltar);
    stage.addEventListener('pointercancel', soltar);
    stage.addEventListener('dblclick', e => { if (media && media.tagName !== 'VIDEO') { scale = scale > 1 ? 1 : 2.5; tx = 0; ty = 0; aplicar(); } });
    stage.addEventListener('wheel', e => { if (!media || media.tagName === 'VIDEO') return; e.preventDefault(); scale = Math.min(4, Math.max(1, scale - Math.sign(e.deltaY) * .25)); if (scale === 1) { tx = 0; ty = 0; } aplicar(); }, { passive: false });
    document.addEventListener('keydown', teclas);
    document.body.appendChild(lb);
    mostrar();
    return lb;
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
  // Una sola carga en vuelo: Realtime (con su debounce) y el polling de respaldo comparten esta
  // puerta, así nunca corren dos cargar() en paralelo.
  let cargaEnVuelo = null;
  function cargarSeguro() {
    if (cargaEnVuelo) return cargaEnVuelo;
    cargaEnVuelo = Promise.resolve().then(cargar).catch(() => {}).finally(() => { cargaEnVuelo = null; });
    return cargaEnVuelo;
  }
  // Polling de respaldo (30 s) mientras el canal Realtime no esté SUBSCRIBED y el Buzón se vea;
  // se apaga solo cuando el canal se recupera. NX_WA_POLL_MS permite acortarlo en QA.
  const realtime = { estado: 'sin_canal', polling: null, ticks: 0 };
  function pollingVigente() { return !!$('#v-waInbox.on') && document.visibilityState !== 'hidden'; }
  function iniciarPolling() {
    if (realtime.polling) return;
    const ms = Math.max(1000, Number(window.NX_WA_POLL_MS) || 30000);
    realtime.polling = setInterval(() => { if (!pollingVigente()) return; realtime.ticks++; cargarSeguro(); }, ms);
  }
  function detenerPolling() { if (realtime.polling) { clearInterval(realtime.polling); realtime.polling = null; } }
  function estadoCanal(status) {
    realtime.estado = status || 'desconocido';
    if (status === 'SUBSCRIBED') detenerPolling(); else iniciarPolling();
  }
  window.nxWaEstadoRealtime = () => ({ estado: realtime.estado, polling: !!realtime.polling, ticks: realtime.ticks });
  async function iniciarRealtime() {
    if (sb) return;
    try {
      if (!window.supabase) await cargarSDK();
      const A = api(); if (!A || !window.supabase) { estadoCanal('sin_sdk'); return; }
      sb = window.supabase.createClient(A.url, A.key);
      estadoCanal('conectando');
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
      const refrescar = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { if ($('#v-waInbox.on')) cargarSeguro(); }, 400); };
      // Un mensaje entrante nuevo se anuncia (sonido / vibración / contador del título) desde la
      // capa de lista; aquí solo se emite el evento con la fila que trae Realtime.
      const mensajeNuevo = payload => {
        try {
          const m = payload && payload.new;
          if (payload?.eventType === 'INSERT' && m && m.direccion === 'in') {
            const h = hilos.find(x => x.id === m.hilo_id);
            document.dispatchEvent(new CustomEvent('nxwa:mensaje', { detail: { mensaje: m, hilo: h || null, abierto: hiloAbiertoId === m.hilo_id } }));
          }
        } catch (e) {}
        refrescar();
      };
      canal = sb.channel('nx-wa-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilos' }, refrescar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilo_mensajes' }, mensajeNuevo)
        .subscribe(status => estadoCanal(status));
    } catch (e) { console.error('[WA Inbox] realtime', e); estadoCanal('error'); }
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
    // Controles del reproductor de audio: en fase de captura para que el arrastre de la barra no
    // dispare el «deslizar para responder» ni la pulsación larga de la burbuja (atributos en línea).
    document.addEventListener('click', manejarClickAudio, true);
    document.addEventListener('pointerdown', manejarBarraAudio, true);
    document.addEventListener('pointermove', moverBarraAudio, true);
    document.addEventListener('pointerup', soltarBarraAudio, true);
    document.addEventListener('pointercancel', soltarBarraAudio, true);
    document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('#nxWaMsgsBox .nxWaAudio,#nxWaMsgsBox .nxWaVideoWrap')) e.stopPropagation(); }, { capture: true, passive: true });
    let n = 0; const t = () => { n++; if (envolverRegAbono() || n > 120) return; setTimeout(t, 250); };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
