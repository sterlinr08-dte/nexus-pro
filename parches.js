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