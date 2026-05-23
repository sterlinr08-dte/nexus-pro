/* ==========================================================================
   NEXUS PRO - PARCHE DESGLOSE DE COBROS POR AGENTE v1.0
   - Dashboard: COBRADO abre Reporte por Agente.
   - Reporte por Agente: agrega "💰 DESGLOSE DE COBROS".
   - Transferencia de dinero entre agentes + historial.
   ========================================================================== */
(function () {
  "use strict";

  if (window.__NEXUS_DESGLOSE_COBROS_AGENTE_V1__) return;
  window.__NEXUS_DESGLOSE_COBROS_AGENTE_V1__ = true;

  const TRANSFER_TABLE = "transferencias_agentes";
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function n(txt) {
    return String(txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function fmtMoney(v) {
    if (typeof window.fmt === "function") return window.fmt(Number(v || 0));
    return "RD$ " + Number(v || 0).toLocaleString("es-DO", { maximumFractionDigits: 2 });
  }

  function today() {
    if (typeof window.hoy === "function") return window.hoy();
    return new Date().toISOString().slice(0, 10);
  }

  function toastSafe(type, title, msg) {
    if (typeof window.toast === "function") window.toast(type, title, msg);
    else alert(`${title}\n${msg || ""}`);
  }

  function getAgenteNombre(id) {
    const a = (window.ST?.agentes || []).find(x => String(x.id) === String(id));
    return a?.nom || a?.nombre || "Sin agente";
  }

  function getClienteById(id) {
    return (window.ST?.clientes || []).find(c => String(c.id) === String(id));
  }

  function getAbonoAgenteId(abono) {
    return abono.agente_cobro || abono.agente_id || abono.agente || getClienteById(abono.cliente_id)?.agente_id || "";
  }

  function tipoMetodo(metodo) {
    const m = n(metodo);
    if (m.includes("efectivo")) return "efectivo";
    if (m.includes("transferencia") || m.includes("deposito") || m.includes("depósito")) return "banco";
    if (m.includes("cheque")) return "cheque";
    return "otros";
  }

  function bancoNombre(abono) {
    const raw = abono.banco || abono.banco_nombre || abono.banco_otro || abono.bank || "";
    return String(raw || "Sin banco").trim() || "Sin banco";
  }

  function metodoColor(tipo) {
    if (tipo === "efectivo") return { bg: "#f0fdf4", tx: "#059669", bd: "#bbf7d0", label: "💵 EFECTIVO" };
    if (tipo === "banco") return { bg: "#eff6ff", tx: "#2563eb", bd: "#bfdbfe", label: "🏦 BANCO" };
    if (tipo === "cheque") return { bg: "#fffbeb", tx: "#d97706", bd: "#fde68a", label: "📝 CHEQUE" };
    return { bg: "#f8fafc", tx: "#64748b", bd: "#e2e8f0", label: "⋯ OTROS" };
  }

  async function getAllAbonos() {
    if (!window.API?.get) return Array.isArray(window.ST?.abonos) ? window.ST.abonos : [];
    try {
      const data = await window.API.get("abonos", "select=*&order=fecha.desc&limit=5000");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("No se pudieron cargar abonos:", e);
      return Array.isArray(window.ST?.abonos) ? window.ST.abonos : [];
    }
  }

  async function getTransferencias() {
    if (!window.API?.get) return [];
    try {
      const data = await window.API.get(TRANSFER_TABLE, "select=*&order=fecha.desc,created_at.desc&limit=1000");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function emptyAgg() {
    return { total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, bancos: {}, count: 0 };
  }

  function buildAgg(abonos) {
    const general = emptyAgg();
    const porBanco = {};
    const porAgente = {};

    abonos.forEach(a => {
      const monto = Number(a.monto || 0);
      if (!monto) return;

      const tipo = tipoMetodo(a.metodo);
      const agId = getAbonoAgenteId(a) || "SIN_AGENTE";
      if (!porAgente[agId]) porAgente[agId] = emptyAgg();

      general.total += monto;
      general.count++;
      general[tipo] += monto;

      porAgente[agId].total += monto;
      porAgente[agId].count++;
      porAgente[agId][tipo] += monto;

      if (tipo === "banco") {
        const banco = bancoNombre(a);
        porBanco[banco] = Number(porBanco[banco] || 0) + monto;
        porAgente[agId].bancos[banco] = Number(porAgente[agId].bancos[banco] || 0) + monto;
      }
    });

    return { general, porBanco, porAgente };
  }

  function buildBalancePorAgente(abonos, transferencias) {
    const balance = {};
    const ensure = id => {
      const k = id || "SIN_AGENTE";
      if (!Object.prototype.hasOwnProperty.call(balance, k)) balance[k] = 0;
      return k;
    };

    abonos.forEach(a => {
      const agId = ensure(getAbonoAgenteId(a));
      balance[agId] += Number(a.monto || 0);
    });

    transferencias.forEach(t => {
      const monto = Number(t.monto || 0);
      if (!monto) return;
      const desde = ensure(t.desde_agente || t.agente_origen || t.desde);
      const hacia = ensure(t.hacia_agente || t.agente_destino || t.hacia);
      balance[desde] -= monto;
      balance[hacia] += monto;
    });

    return balance;
  }

  function renderMetodoCard(tipo, valor, showZero) {
    if (!valor && !showZero) return "";
    const c = metodoColor(tipo);
    return `<div style="background:${c.bg};border:1px solid ${c.bd};border-radius:14px;padding:12px">
      <div style="font-size:10px;font-weight:900;color:${c.tx};letter-spacing:.5px">${c.label}</div>
      <div style="font-size:20px;font-weight:900;color:${c.tx};margin-top:5px">${fmtMoney(valor)}</div>
    </div>`;
  }

  function renderBancoList(porBanco) {
    const rows = Object.entries(porBanco).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return `<div style="font-size:11px;color:#94a3b8;padding:10px">No hay transferencias o depósitos con banco registrado.</div>`;
    return rows.map(([banco, total]) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #eef2f7">
      <span style="font-size:12px;font-weight:800;color:#1e293b">🏦 ${esc(banco)}</span>
      <span style="font-size:12px;font-weight:900;color:#2563eb">${fmtMoney(total)}</span>
    </div>`).join("");
  }

  function renderAgentCards(porAgente, balance) {
    const agents = Object.entries(porAgente).sort((a, b) => b[1].total - a[1].total);
    if (!agents.length) return `<div style="font-size:11px;color:#94a3b8;padding:12px">Todavía no hay cobros con agente asignado.</div>`;

    return agents.map(([agId, x]) => {
      const bancos = Object.entries(x.bancos || {}).sort((a, b) => b[1] - a[1]);
      const bal = Number(balance[agId] || 0);
      const badges = [
        x.efectivo ? `<span class="nx-badge" style="background:#dcfce7;color:#15803d">EFECTIVO ${fmtMoney(x.efectivo)}</span>` : "",
        x.banco ? `<span class="nx-badge" style="background:#dbeafe;color:#1d4ed8">BANCO ${fmtMoney(x.banco)}</span>` : "",
        x.cheque ? `<span class="nx-badge" style="background:#fef3c7;color:#b45309">CHEQUE ${fmtMoney(x.cheque)}</span>` : "",
        x.otros ? `<span class="nx-badge" style="background:#f1f5f9;color:#64748b">OTROS ${fmtMoney(x.otros)}</span>` : ""
      ].filter(Boolean).join(" ");

      const bancosHtml = bancos.length ? `<div style="margin-top:8px;display:flex;gap:5px;flex-wrap:wrap">
        ${bancos.map(([b, v]) => `<span class="nx-badge" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">${esc(b)} · ${fmtMoney(v)}</span>`).join("")}
      </div>` : "";

      return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:13px;box-shadow:0 3px 12px rgba(15,23,42,.05)">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div><div style="font-size:13px;font-weight:900;color:#0f172a">${esc(getAgenteNombre(agId))}</div><div style="font-size:10px;color:#64748b;margin-top:2px">${x.count} cobro(s)</div></div>
          <div style="text-align:right"><div style="font-size:15px;font-weight:900;color:#059669">${fmtMoney(x.total)}</div><div style="font-size:10px;color:${bal >= 0 ? "#2563eb" : "#dc2626"};font-weight:800">EN MANO: ${fmtMoney(bal)}</div></div>
        </div>
        <div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">${badges || '<span class="nx-badge" style="background:#f1f5f9;color:#64748b">SIN DESGLOSE</span>'}</div>
        ${bancosHtml}
      </div>`;
    }).join("");
  }

  function renderTransferHistory(transferencias) {
    if (!transferencias.length) return `<div style="font-size:11px;color:#94a3b8;padding:12px;background:#f8fafc;border-radius:10px">Sin transferencias registradas entre agentes.</div>`;
    return `<div class="tw" style="margin-top:8px"><table>
      <thead><tr><th>FECHA</th><th>ENTREGA</th><th>RECIBE</th><th>MÉTODO</th><th>BANCO</th><th>MONTO</th><th>REF</th></tr></thead>
      <tbody>${transferencias.map(t => `<tr>
        <td style="font-size:10px">${esc(String(t.fecha || t.created_at || "").slice(0, 10))}</td>
        <td style="font-weight:700">${esc(getAgenteNombre(t.desde_agente || t.agente_origen || t.desde))}</td>
        <td style="font-weight:700">${esc(getAgenteNombre(t.hacia_agente || t.agente_destino || t.hacia))}</td>
        <td>${esc(t.metodo || "—")}</td><td>${esc(t.banco || "—")}</td>
        <td style="font-weight:900;color:#059669">${fmtMoney(t.monto)}</td><td>${esc(t.referencia || "—")}</td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  async function renderDesgloseCobrosAgente() {
    const cont = q("#rAgt");
    if (!cont) return;

    const old = q("#nxDesgloseCobrosAgente");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "nxDesgloseCobrosAgente";
    box.innerHTML = `<div class="nc p5" style="margin-bottom:12px"><div class="loading"><div class="spin"></div> Cargando desglose de cobros...</div></div>`;
    cont.insertAdjacentElement("afterbegin", box);

    const [abonos, transferencias] = await Promise.all([getAllAbonos(), getTransferencias()]);
    const { general, porBanco, porAgente } = buildAgg(abonos);
    const balance = buildBalancePorAgente(abonos, transferencias);

    box.innerHTML = `<div class="nc p5" style="margin-bottom:12px">
      <div class="ch"><div><div class="ct">💰 DESGLOSE DE COBROS</div><div class="ct-s">Cobros por método, banco, agente y transferencias internas</div></div>
      <button class="btn bsm bc5" onclick="window.nxAbrirTransferenciaAgente()"><i class="ti ti-arrows-exchange"></i> Transferir entre agentes</button></div>

      <div style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:18px;padding:16px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:900;color:#059669;letter-spacing:.8px">TOTAL GENERAL COBRADO</div>
        <div style="font-size:30px;font-weight:900;color:#059669;line-height:1.1;margin-top:4px">${fmtMoney(general.total)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:5px">${general.count} cobro(s) registrados</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin-bottom:12px">
        ${renderMetodoCard("efectivo", general.efectivo, true)}
        ${renderMetodoCard("banco", general.banco, true)}
        ${renderMetodoCard("cheque", general.cheque, false)}
        ${renderMetodoCard("otros", general.otros, false)}
      </div>

      <div class="g2" style="margin-bottom:12px">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px"><div style="font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px">🏦 Por banco</div>${renderBancoList(porBanco)}</div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px"><div style="font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px">🔁 Historial de transferencias</div>${renderTransferHistory(transferencias)}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px">${renderAgentCards(porAgente, balance)}</div>
    </div>`;
  }

  function createTransferModal() {
    if (q("#nxModalTransferAgente")) return;
    const modal = document.createElement("div");
    modal.className = "overlay";
    modal.id = "nxModalTransferAgente";
    modal.innerHTML = `<div class="modal" style="max-width:460px">
      <div class="mt"><span>// TRANSFERENCIA ENTRE AGENTES</span><button class="btn bghost bsm" type="button" onclick="window.nxCerrarTransferenciaAgente()"><i class="ti ti-x"></i></button></div>
      <div class="gf2">
        <div class="fr"><label>Agente que entrega *</label><select id="nxTADesde"></select></div>
        <div class="fr"><label>Agente que recibe *</label><select id="nxTAHacia"></select></div>
        <div class="fr"><label>Monto RD$ *</label><input type="number" id="nxTAMonto" min="0.01" step="0.01" placeholder="0.00"></div>
        <div class="fr"><label>Método *</label><select id="nxTAMetodo"><option>Efectivo</option><option>Transferencia</option></select></div>
        <div class="fr" id="nxTABancoWrap" style="display:none"><label>Banco</label><select id="nxTABanco"><option value="">Seleccionar...</option><option>BHD</option><option>Banreservas</option><option>Popular</option><option>Otros</option></select></div>
        <div class="fr" id="nxTABancoOtroWrap" style="display:none"><label>Otro banco</label><input type="text" id="nxTABancoOtro" placeholder="Nombre del banco"></div>
        <div class="fr"><label>Referencia *</label><input type="text" id="nxTARef" placeholder="Número de recibo o transferencia"></div>
        <div class="fr"><label>Nota</label><input type="text" id="nxTANota" placeholder="Opcional"></div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:11px;color:#1e3a6e;margin-top:8px">Este movimiento ajusta el control interno para saber qué agente tiene el dinero.</div>
      <div class="fe"><button class="btn" type="button" onclick="window.nxCerrarTransferenciaAgente()">Cancelar</button><button class="btn bxl" type="button" onclick="window.nxGuardarTransferenciaAgente()" id="nxTABtn"><i class="ti ti-check"></i> Guardar transferencia</button></div>
    </div>`;
    document.body.appendChild(modal);
    q("#nxTAMetodo").addEventListener("change", toggleBancoTransfer);
    q("#nxTABanco").addEventListener("change", toggleBancoOtroTransfer);
  }

  function fillAgentesSelects() {
    const agentes = window.ST?.agentes || [];
    const opts = `<option value="">Seleccionar...</option>` + agentes.map(a => `<option value="${esc(a.id)}">${esc(a.nom || a.nombre || "Agente")}</option>`).join("");
    if (q("#nxTADesde")) q("#nxTADesde").innerHTML = opts;
    if (q("#nxTAHacia")) q("#nxTAHacia").innerHTML = opts;
  }

  function toggleBancoTransfer() {
    const metodo = q("#nxTAMetodo")?.value || "";
    const show = metodo === "Transferencia";
    if (q("#nxTABancoWrap")) q("#nxTABancoWrap").style.display = show ? "block" : "none";
    if (!show) {
      if (q("#nxTABanco")) q("#nxTABanco").value = "";
      if (q("#nxTABancoOtro")) q("#nxTABancoOtro").value = "";
      if (q("#nxTABancoOtroWrap")) q("#nxTABancoOtroWrap").style.display = "none";
    } else toggleBancoOtroTransfer();
  }

  function toggleBancoOtroTransfer() {
    const banco = q("#nxTABanco")?.value || "";
    if (q("#nxTABancoOtroWrap")) q("#nxTABancoOtroWrap").style.display = banco === "Otros" ? "block" : "none";
  }

  window.nxAbrirTransferenciaAgente = function () {
    createTransferModal();
    fillAgentesSelects();
    toggleBancoTransfer();
    q("#nxModalTransferAgente")?.classList.add("open");
  };

  window.nxCerrarTransferenciaAgente = function () {
    q("#nxModalTransferAgente")?.classList.remove("open");
  };

  window.nxGuardarTransferenciaAgente = async function () {
    const desde = q("#nxTADesde")?.value || "";
    const hacia = q("#nxTAHacia")?.value || "";
    const monto = Number(q("#nxTAMonto")?.value || 0);
    const metodo = q("#nxTAMetodo")?.value || "Efectivo";
    const ref = (q("#nxTARef")?.value || "").trim();
    const nota = (q("#nxTANota")?.value || "").trim();
    let banco = "";

    if (!desde) return toastSafe("err", "Agente requerido", "Selecciona el agente que entrega");
    if (!hacia) return toastSafe("err", "Agente requerido", "Selecciona el agente que recibe");
    if (desde === hacia) return toastSafe("err", "Movimiento inválido", "El agente que entrega y recibe no puede ser el mismo");
    if (!monto || monto <= 0) return toastSafe("err", "Monto inválido", "Escribe un monto mayor a cero");
    if (!ref) return toastSafe("err", "Referencia requerida", "Escribe una referencia");

    if (metodo === "Transferencia") {
      banco = q("#nxTABanco")?.value || "";
      if (!banco) return toastSafe("err", "Banco requerido", "Selecciona el banco");
      if (banco === "Otros") {
        banco = (q("#nxTABancoOtro")?.value || "").trim();
        if (!banco) return toastSafe("err", "Banco requerido", "Escribe el nombre del banco");
      }
    }

    const btn = q("#nxTABtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div>'; }

    const payload = { desde_agente: desde, hacia_agente: hacia, monto, metodo, banco: banco || null, referencia: ref, nota: nota || null, fecha: today() };

    try {
      await window.API.post(TRANSFER_TABLE, payload);
      if (typeof window.logAudit === "function") {
        window.logAudit("TRANSFERENCIA_AGENTE", `${getAgenteNombre(desde)} → ${getAgenteNombre(hacia)} · ${fmtMoney(monto)} · ${metodo}${banco ? " · " + banco : ""}`, "Cobros");
      }
      toastSafe("ok", "Transferencia registrada", `${getAgenteNombre(desde)} → ${getAgenteNombre(hacia)} · ${fmtMoney(monto)}`);
      window.nxCerrarTransferenciaAgente();
      await renderDesgloseCobrosAgente();
    } catch (e) {
      console.error("Error guardando transferencia:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que exista la tabla transferencias_agentes en Supabase");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar transferencia'; }
    }
  };

  function wrapReporteAgente() {
    if (window.__NEXUS_RREPAGT_WRAPPED_V1__) return;
    if (typeof window.rRepAgt !== "function") { setTimeout(wrapReporteAgente, 500); return; }

    window.__NEXUS_RREPAGT_WRAPPED_V1__ = true;
    const original = window.rRepAgt;

    window.rRepAgt = function () {
      const out = original.apply(this, arguments);
      setTimeout(renderDesgloseCobrosAgente, 80);
      return out;
    };
  }

  function irAReporteAgente() {
    if (typeof window.nav === "function") {
      window.nav("rep-agente", null);
      setTimeout(() => { if (typeof window.rRepAgt === "function") window.rRepAgt(); else renderDesgloseCobrosAgente(); }, 150);
      return;
    }
    const btn = qa("[onclick]").find(el => n(el.getAttribute("onclick")).includes("rep-agente"));
    if (btn) btn.click();
    setTimeout(renderDesgloseCobrosAgente, 200);
  }

  function bindCobradoDashboard() {
    qa(".kpi, .card, .stat-card, .dashboard-card, [class*='kpi'], [class*='card']").forEach(card => {
      if (card.dataset.nxCobradoAgenteBound === "1") return;
      const txt = n(card.innerText || card.textContent || "");
      if (!txt.includes("cobrado")) return;
      card.dataset.nxCobradoAgenteBound = "1";
      card.style.cursor = "pointer";
      card.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        irAReporteAgente();
      }, true);
    });
  }

  function injectStyles() {
    if (q("#nxDesgloseCobrosAgenteCSS")) return;
    const style = document.createElement("style");
    style.id = "nxDesgloseCobrosAgenteCSS";
    style.textContent = `
      #nxDesgloseCobrosAgente .nx-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}
      #nxDesgloseCobrosAgente .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
      @media(max-width:768px){#nxDesgloseCobrosAgente .g2{grid-template-columns:1fr!important}#nxDesgloseCobrosAgente{text-transform:uppercase}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    createTransferModal();
    wrapReporteAgente();
    bindCobradoDashboard();
    if (q("#v-rep-agente.view.on")) setTimeout(renderDesgloseCobrosAgente, 300);
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("click", () => setTimeout(bindCobradoDashboard, 150), true);
  window.addEventListener("resize", () => setTimeout(bindCobradoDashboard, 150));

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    if (tries > 30) clearInterval(timer);
  }, 700);
})();


/* ==========================================================================
   INICIO FASE 1 PEGADA - REPORTE PREMIUM POR AGENTE
   Pegado automáticamente al final del parches.js actual.
   ========================================================================== */

/* ===========================================================================
   NEXUS PRO - FASE 1
   REPORTE PREMIUM POR AGENTE + DASHBOARD COBRADO
   Versión: 1.0
   Solo parches.js. No modifica index.html.
   =========================================================================== */
(function () {
  'use strict';
  if (window.__NEXUS_FASE1_REPORTE_PREMIUM_AGENTES__) return;
  window.__NEXUS_FASE1_REPORTE_PREMIUM_AGENTES__ = true;

  const PATCH_ID = 'fase1_reporte_premium_agentes_v1';
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function normalize(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function money(v) {
    if (typeof window.fmt === 'function') return window.fmt(Number(v || 0));
    return 'RD$ ' + Number(v || 0).toLocaleString('es-DO', { maximumFractionDigits: 2 });
  }

  function getState() { return window.ST || {}; }
  function getAgentes() { return Array.isArray(getState().agentes) ? getState().agentes : []; }
  function getClientes() { return Array.isArray(getState().clientes) ? getState().clientes : []; }
  function getFacturas() { return Array.isArray(getState().facturas) ? getState().facturas : []; }
  function getClienteById(id) { return getClientes().find(c => String(c.id) === String(id)); }

  async function getAbonos() {
    const st = getState();
    if (Array.isArray(st.abonos) && st.abonos.length) return st.abonos;
    if (window.API && typeof window.API.get === 'function') {
      try {
        const data = await window.API.get('abonos', 'select=*&order=fecha.desc&limit=5000');
        return Array.isArray(data) ? data : [];
      } catch (e) { console.warn('NEXUS FASE 1: no se pudieron cargar abonos:', e); }
    }
    return Array.isArray(st.abonos) ? st.abonos : [];
  }

  function getAgenteIdFromAbono(abono) {
    return abono.agente_cobro || abono.agente_id || abono.agente || getClienteById(abono.cliente_id)?.agente_id || '';
  }
  function getAgenteNombre(agente) { return agente.nom || agente.nombre || agente.name || 'Sin nombre'; }
  function getAgenteRol(agente) { return agente.cargo || agente.rol || agente.tipo || 'Agente / corredor'; }
  function getAgenteLicencia(agente) { return agente.licencia || agente.lic || agente.codigo || 'Sin licencia'; }
  function getInitial(name) { return String(name || 'A').trim().charAt(0).toUpperCase() || 'A'; }

  function tipoMetodo(metodo) {
    const m = normalize(metodo);
    if (m.includes('efectivo')) return 'efectivo';
    if (m.includes('transferencia') || m.includes('deposito') || m.includes('depósito')) return 'banco';
    if (m.includes('cheque')) return 'cheque';
    return 'otros';
  }
  function bancoNombre(abono) {
    const raw = abono.banco || abono.banco_nombre || abono.banco_otro || abono.bank || '';
    return String(raw || 'Sin banco').trim() || 'Sin banco';
  }

  function getFacturaClienteId(f) { return f.cliente_id || f.clienteId || f.id_cliente || ''; }
  function getFacturaPendiente(f) {
    const total = Number(f.total || 0), pagado = Number(f.pagado || f.cobrado || 0), estado = normalize(f.estado);
    if (estado.includes('pagado')) return 0;
    if (typeof f.pendiente !== 'undefined') return Number(f.pendiente || 0);
    if (typeof f.balance !== 'undefined') return Number(f.balance || 0);
    return Math.max(0, total - pagado);
  }
  function getClientePendiente(c) { return Number((c.pendiente ?? c.deuda_pendiente ?? c.balance ?? c.deuda_total ?? 0) || 0); }
  function calcularPendienteAgente(agenteId) {
    const clientesAgente = getClientes().filter(c => String(c.agente_id || '') === String(agenteId));
    const ids = new Set(clientesAgente.map(c => String(c.id)));
    const factPend = getFacturas().filter(f => ids.has(String(getFacturaClienteId(f)))).reduce((s, f) => s + getFacturaPendiente(f), 0);
    if (factPend > 0) return factPend;
    return clientesAgente.reduce((s, c) => s + getClientePendiente(c), 0);
  }
  function getMetaAgente(a) {
    const num = Number((a.meta_mensual ?? a.meta ?? a.meta_cobros ?? a.objetivo ?? 0) || 0);
    return num > 0 ? num : 0;
  }

  function buildAgentStats(abonos) {
    const agentes = getAgentes(), clientes = getClientes(), stats = {};
    agentes.forEach(a => {
      stats[String(a.id)] = { agente: a, total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, bancos: {}, cobros: 0, clientes: clientes.filter(c => String(c.agente_id || '') === String(a.id)).length, pendiente: calcularPendienteAgente(a.id), meta: getMetaAgente(a) };
    });
    abonos.forEach(abono => {
      const agenteId = String(getAgenteIdFromAbono(abono) || 'SIN_AGENTE'), monto = Number(abono.monto || 0);
      if (!monto) return;
      if (!stats[agenteId]) stats[agenteId] = { agente: { id: agenteId, nom: agenteId === 'SIN_AGENTE' ? 'Sin agente asignado' : 'Agente no encontrado' }, total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, bancos: {}, cobros: 0, clientes: 0, pendiente: 0, meta: 0 };
      const tipo = tipoMetodo(abono.metodo);
      stats[agenteId].total += monto; stats[agenteId][tipo] += monto; stats[agenteId].cobros += 1;
      if (tipo === 'banco') { const banco = bancoNombre(abono); stats[agenteId].bancos[banco] = Number(stats[agenteId].bancos[banco] || 0) + monto; }
    });
    return Object.values(stats).sort((a, b) => b.total - a.total);
  }

  function efectividad(stat) {
    const base = Number(stat.meta || 0) || Number(stat.total + stat.pendiente || 0);
    if (!base) return 0;
    return Math.min(100, Math.round((Number(stat.total || 0) / base) * 100));
  }
  function renderMethod(label, value, color) {
    if (!value) return '';
    return `<div class="nx-agent-method" style="background:${color.bg};border-color:${color.bd};color:${color.tx}"><span>${label}</span><b>${money(value)}</b></div>`;
  }
  function renderBanks(stat) {
    const bancos = Object.entries(stat.bancos || {}).sort((a, b) => b[1] - a[1]);
    if (!bancos.length) return `<div class="nx-agent-empty">Sin bancos registrados</div>`;
    return `<div class="nx-agent-banks">${bancos.map(([banco,total])=>`<span class="nx-bank-pill">🏦 ${esc(banco)} · <b>${money(total)}</b></span>`).join('')}</div>`;
  }
  function renderAgentCard(stat) {
    const a = stat.agente || {}, name = getAgenteNombre(a), pct = efectividad(stat), initials = getInitial(name);
    let statusColor = '#059669'; if (pct < 40) statusColor = '#dc2626'; else if (pct < 70) statusColor = '#d97706';
    return `<div class="nx-agent-card">
      <div class="nx-agent-head"><div class="nx-agent-avatar">${esc(initials)}</div><div class="nx-agent-info"><div class="nx-agent-name">${esc(name)}</div><div class="nx-agent-role">${esc(getAgenteRol(a))}</div><div class="nx-agent-license">Licencia: ${esc(getAgenteLicencia(a))}</div></div><div class="nx-agent-effect"><div class="nx-effect-circle" style="--pct:${pct};--clr:${statusColor}"><span>${pct}%</span></div><small>Efectividad</small></div></div>
      <div class="nx-agent-meta-row"><div><span>Clientes</span><b>${stat.clientes || 0}</b></div><div><span>Meta mensual</span><b>${stat.meta ? money(stat.meta) : 'Sin meta'}</b></div><div><span>Cobros</span><b>${stat.cobros || 0}</b></div></div>
      <div class="nx-agent-money-main"><span>COBRADO TOTAL</span><b>${money(stat.total)}</b></div>
      <div class="nx-agent-method-grid">${renderMethod('💵 EFECTIVO', stat.efectivo, {bg:'#f0fdf4',bd:'#bbf7d0',tx:'#059669'})}${renderMethod('🏦 BANCO', stat.banco, {bg:'#eff6ff',bd:'#bfdbfe',tx:'#2563eb'})}${renderMethod('📝 CHEQUE', stat.cheque, {bg:'#fffbeb',bd:'#fde68a',tx:'#d97706'})}${renderMethod('⋯ OTROS', stat.otros, {bg:'#f8fafc',bd:'#e2e8f0',tx:'#64748b'})}</div>
      <div class="nx-agent-section-title">Bancos recibidos</div>${renderBanks(stat)}
      <div class="nx-agent-bottom"><div><span>PENDIENTE</span><b class="danger">${money(stat.pendiente)}</b></div><div><span>PROGRESO</span><div class="nx-progress"><i style="width:${pct}%;background:${statusColor}"></i></div></div></div>
    </div>`;
  }

  async function renderPremiumAgentReport() {
    const cont = q('#rAgt'); if (!cont) return;
    const old = q('#nxPremiumAgentReport'); if (old) old.remove();
    const wrap = document.createElement('div'); wrap.id = 'nxPremiumAgentReport';
    wrap.innerHTML = `<div class="nc p5"><div class="loading"><div class="spin"></div> Cargando reporte premium por agente...</div></div>`;
    cont.insertAdjacentElement('afterbegin', wrap);
    const stats = buildAgentStats(await getAbonos());
    const totalCobrado = stats.reduce((s,x)=>s+Number(x.total||0),0), totalPendiente = stats.reduce((s,x)=>s+Number(x.pendiente||0),0), totalClientes = stats.reduce((s,x)=>s+Number(x.clientes||0),0);
    wrap.innerHTML = `<div class="nc p5 nx-agent-premium-wrap"><div class="ch"><div><div class="ct">💼 Reporte premium por agente</div><div class="ct-s">Cobrado real, método de pago, bancos, clientes y efectividad</div></div><button class="btn bsm bc1" type="button" onclick="window.nxRefrescarReportePremiumAgentes()"><i class="ti ti-refresh"></i> Actualizar</button></div>
      <div class="nx-agent-summary"><div class="green"><span>Total cobrado</span><b>${money(totalCobrado)}</b></div><div class="red"><span>Pendiente</span><b>${money(totalPendiente)}</b></div><div class="blue"><span>Clientes asignados</span><b>${totalClientes}</b></div><div class="gray"><span>Agentes</span><b>${stats.length}</b></div></div>
      <div class="nx-agent-grid">${stats.length ? stats.map(renderAgentCard).join('') : `<div class="nx-agent-empty-card">No hay agentes o cobros registrados todavía.</div>`}</div></div>`;
  }
  window.nxRefrescarReportePremiumAgentes = renderPremiumAgentReport;

  function wrapReporteAgente() {
    if (window.__NEXUS_FASE1_RREPAGT_WRAPPED__) return;
    if (typeof window.rRepAgt !== 'function') { setTimeout(wrapReporteAgente, 500); return; }
    window.__NEXUS_FASE1_RREPAGT_WRAPPED__ = true;
    const original = window.rRepAgt;
    window.rRepAgt = function () { const result = original.apply(this, arguments); setTimeout(renderPremiumAgentReport, 100); return result; };
  }
  function goReporteAgente() {
    if (typeof window.nav === 'function') { window.nav('rep-agente', null); setTimeout(()=>{ if (typeof window.rRepAgt === 'function') window.rRepAgt(); else renderPremiumAgentReport(); }, 180); return; }
    const btn = qa('[onclick]').find(el => normalize(el.getAttribute('onclick')).includes('rep-agente')); if (btn) btn.click(); setTimeout(renderPremiumAgentReport, 250);
  }
  function bindDashboardCobrado() {
    qa('.kpi,.card,.stat-card,.dashboard-card,[class*="kpi"],[class*="card"],.qa').forEach(card => {
      if (card.dataset.nxCobradoPremiumBound === '1') return;
      const txt = normalize(card.innerText || card.textContent || ''); if (!txt.includes('cobrado')) return;
      card.dataset.nxCobradoPremiumBound = '1'; card.style.cursor = 'pointer';
      card.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); goReporteAgente(); }, true);
    });
  }
  function injectStyles() {
    if (q('#nxPremiumAgentReportCSS')) return;
    const style = document.createElement('style'); style.id = 'nxPremiumAgentReportCSS';
    style.textContent = `#nxPremiumAgentReport{margin-bottom:12px}.nx-agent-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:14px}.nx-agent-summary>div{border-radius:16px;padding:14px;border:1px solid #e2e8f0}.nx-agent-summary span{display:block;font-size:10px;font-weight:900;color:#64748b;letter-spacing:.5px;text-transform:uppercase}.nx-agent-summary b{display:block;font-size:20px;margin-top:5px;color:#0f172a}.nx-agent-summary .green{background:#f0fdf4;border-color:#bbf7d0}.nx-agent-summary .green b{color:#059669}.nx-agent-summary .red{background:#fef2f2;border-color:#fecaca}.nx-agent-summary .red b{color:#dc2626}.nx-agent-summary .blue{background:#eff6ff;border-color:#bfdbfe}.nx-agent-summary .blue b{color:#2563eb}.nx-agent-summary .gray{background:#f8fafc}.nx-agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:12px}.nx-agent-card{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.08);transition:transform .15s ease,box-shadow .15s ease}.nx-agent-card:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(15,23,42,.12)}.nx-agent-head{display:flex;align-items:center;gap:12px}.nx-agent-avatar{width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,#1e3a6e,#2563eb);color:#fff;display:grid;place-items:center;font-size:18px;font-weight:900;box-shadow:0 8px 18px rgba(37,99,235,.28);flex:0 0 auto}.nx-agent-info{min-width:0;flex:1}.nx-agent-name{font-size:14px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-agent-role,.nx-agent-license{font-size:10px;color:#64748b;margin-top:2px;font-weight:700}.nx-agent-effect{text-align:center;flex:0 0 auto}.nx-effect-circle{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(closest-side,#fff 72%,transparent 74%),conic-gradient(var(--clr) calc(var(--pct)*1%),#e2e8f0 0)}.nx-effect-circle span{font-size:12px;font-weight:900;color:var(--clr)}.nx-agent-effect small{display:block;margin-top:3px;font-size:8px;color:#64748b;font-weight:900}.nx-agent-meta-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0}.nx-agent-meta-row>div{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:9px}.nx-agent-meta-row span{display:block;font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase}.nx-agent-meta-row b{display:block;margin-top:3px;font-size:11px;color:#0f172a;font-weight:900}.nx-agent-money-main{background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:18px;padding:14px;margin-bottom:10px}.nx-agent-money-main span{display:block;font-size:10px;color:#059669;font-weight:900;letter-spacing:.6px}.nx-agent-money-main b{display:block;margin-top:4px;font-size:24px;line-height:1;color:#059669;font-weight:900}.nx-agent-method-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:10px}.nx-agent-method{border:1px solid;border-radius:13px;padding:8px;min-height:54px}.nx-agent-method span{display:block;font-size:8px;font-weight:900}.nx-agent-method b{display:block;margin-top:4px;font-size:12px;font-weight:900}.nx-agent-section-title{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase;margin:6px 0}.nx-agent-banks{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.nx-bank-pill{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800}.nx-agent-empty{background:#f8fafc;border:1px dashed #cbd5e1;color:#94a3b8;border-radius:12px;padding:9px;font-size:10px;font-weight:700;margin-bottom:10px}.nx-agent-bottom{display:grid;grid-template-columns:1fr 1.2fr;gap:8px;margin-top:8px}.nx-agent-bottom>div{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:10px}.nx-agent-bottom span{display:block;font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase}.nx-agent-bottom b{display:block;font-size:13px;margin-top:4px;font-weight:900}.nx-agent-bottom b.danger{color:#dc2626}.nx-progress{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:8px}.nx-progress i{display:block;height:100%;border-radius:999px}.nx-agent-empty-card{background:#f8fafc;border:1px dashed #cbd5e1;color:#64748b;border-radius:18px;padding:24px;text-align:center;font-weight:800}@media(max-width:768px){.nx-agent-grid{grid-template-columns:1fr}.nx-agent-summary{grid-template-columns:repeat(2,1fr)}.nx-agent-method-grid{grid-template-columns:1fr}.nx-agent-bottom{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }
  function addChangelog() { try { const key='nexu_patch_changelog'; const list=JSON.parse(localStorage.getItem(key)||'[]'); if(list.some(x=>x.id==='fase1_reporte_premium_agentes_v1'))return; list.unshift({id:'fase1_reporte_premium_agentes_v1',version:'Fase 1',fecha:new Date().toISOString(),titulo:'Reporte premium por agente',cambios:['Dashboard COBRADO abre Reporte por Agente.','Agrega tarjetas premium con cobrado real por agente.','Incluye desglose por efectivo, banco, cheque y otros.','Muestra bancos por agente cuando existen.','Mantiene el reporte original debajo sin romper la lógica base.']}); localStorage.setItem(key,JSON.stringify(list)); } catch(e){} }
  function init(){ injectStyles(); wrapReporteAgente(); bindDashboardCobrado(); addChangelog(); if(q('#v-rep-agente.view.on')) setTimeout(renderPremiumAgentReport,250); }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('click', () => setTimeout(bindDashboardCobrado, 120), true);
  window.addEventListener('resize', () => setTimeout(bindDashboardCobrado, 120));
  let tries=0; const timer=setInterval(()=>{ tries++; init(); if(tries>35) clearInterval(timer); },600);
})();
