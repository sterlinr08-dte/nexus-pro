/* ==========================================================================
   NEXUS PRO - FASE 1 + FASE 2 CONSOLIDADO
   Reporte Premium por Agente + Transferencias entre Agentes
   Versión: 2.0 SIN PARPADEO

   Incluye:
   - Dashboard COBRADO -> Reporte por Agente.
   - Reporte premium por agente.
   - Desglose general de cobros.
   - Desglose por método: efectivo, banco, cheque, otros.
   - Bancos por agente.
   - Transferencia entre agentes.
   - Historial de transferencias.
   - En mano real = cobrado + recibido - entregado.
   - Sin setInterval agresivo. Sin re-render infinito.
   ========================================================================== */

(function () {
  "use strict";

  if (window.__NEXUS_AGENTES_COBROS_V2__) return;
  window.__NEXUS_AGENTES_COBROS_V2__ = true;

  const TRANSFER_TABLE = "transferencias_agentes";
  const PATCH_ID = "nexus_agentes_cobros_v2_sin_parpadeo";

  let isRendering = false;
  let lastRenderAt = 0;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function normalize(txt) {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(v) {
    if (typeof window.fmt === "function") return window.fmt(Number(v || 0));
    return "RD$ " + Number(v || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function today() {
    if (typeof window.hoy === "function") return window.hoy();
    return new Date().toISOString().slice(0, 10);
  }

  function toastSafe(type, title, msg) {
    if (typeof window.toast === "function") window.toast(type, title, msg);
    else alert(`${title}\n${msg || ""}`);
  }

  function st() {
    return window.ST || {};
  }

  function getAgentes() {
    return Array.isArray(st().agentes) ? st().agentes : [];
  }

  function getClientes() {
    return Array.isArray(st().clientes) ? st().clientes : [];
  }

  function getFacturas() {
    return Array.isArray(st().facturas) ? st().facturas : [];
  }

  async function getAbonos() {
    if (Array.isArray(st().abonos) && st().abonos.length) return st().abonos;

    if (window.API && typeof window.API.get === "function") {
      try {
        const data = await window.API.get("abonos", "select=*&order=fecha.desc&limit=5000");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn("NEXUS V2: no se pudieron cargar abonos desde API.get:", e);
      }
    }

    return Array.isArray(st().abonos) ? st().abonos : [];
  }

  async function getTransferencias() {
    if (window.API && typeof window.API.get === "function") {
      try {
        const data = await window.API.get(TRANSFER_TABLE, "select=*&order=fecha.desc,created_at.desc&limit=1000");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        // Si la tabla no existe todavía, no rompemos el reporte.
        return [];
      }
    }
    return [];
  }

  function getClienteById(id) {
    return getClientes().find(c => String(c.id) === String(id));
  }

  function getAgenteById(id) {
    return getAgentes().find(a => String(a.id) === String(id));
  }

  function getAgenteNombreById(id) {
    const a = getAgenteById(id);
    return a?.nom || a?.nombre || a?.name || (id ? "Agente no encontrado" : "Sin agente");
  }

  function getAgenteNombre(agente) {
    return agente?.nom || agente?.nombre || agente?.name || "Sin nombre";
  }

  function getAgenteRol(agente) {
    return agente?.cargo || agente?.rol || agente?.tipo || "Agente / corredor";
  }

  function getAgenteLicencia(agente) {
    return agente?.licencia || agente?.lic || agente?.codigo || "Sin licencia";
  }

  function getInitial(name) {
    return String(name || "A").trim().charAt(0).toUpperCase() || "A";
  }

  function getAbonoAgenteId(abono) {
    return (
      abono.agente_cobro ||
      abono.agente_id ||
      abono.agente ||
      getClienteById(abono.cliente_id)?.agente_id ||
      ""
    );
  }

  function tipoMetodo(metodo) {
    const m = normalize(metodo);
    if (m.includes("efectivo")) return "efectivo";
    if (m.includes("transferencia") || m.includes("deposito") || m.includes("depósito")) return "banco";
    if (m.includes("cheque")) return "cheque";
    return "otros";
  }

  function bancoNombre(abono) {
    const raw = abono.banco || abono.banco_nombre || abono.banco_otro || abono.bank || "";
    return String(raw || "Sin banco").trim() || "Sin banco";
  }

  function getFacturaClienteId(f) {
    return f.cliente_id || f.clienteId || f.id_cliente || "";
  }

  function getFacturaPendiente(f) {
    const total = Number(f.total || 0);
    const pagado = Number(f.pagado || f.cobrado || 0);
    const estado = normalize(f.estado);

    if (estado.includes("pagado")) return 0;
    if (typeof f.pendiente !== "undefined") return Number(f.pendiente || 0);
    if (typeof f.balance !== "undefined") return Number(f.balance || 0);

    return Math.max(0, total - pagado);
  }

  function getClientePendiente(cliente) {
    const direct =
      cliente.pendiente ??
      cliente.deuda_pendiente ??
      cliente.balance ??
      cliente.deuda_total ??
      0;

    return Number(direct || 0);
  }

  function calcularPendienteAgente(agenteId) {
    const clientesAgente = getClientes().filter(c => String(c.agente_id || "") === String(agenteId));
    const ids = new Set(clientesAgente.map(c => String(c.id)));

    const factPend = getFacturas()
      .filter(f => ids.has(String(getFacturaClienteId(f))))
      .reduce((sum, f) => sum + getFacturaPendiente(f), 0);

    if (factPend > 0) return factPend;

    return clientesAgente.reduce((sum, c) => sum + getClientePendiente(c), 0);
  }

  function getMetaAgente(agente) {
    const direct =
      agente?.meta_mensual ??
      agente?.meta ??
      agente?.meta_cobros ??
      agente?.objetivo ??
      0;

    const num = Number(direct || 0);
    return num > 0 ? num : 0;
  }

  function emptyStat(agente) {
    return {
      agente,
      total: 0,
      efectivo: 0,
      banco: 0,
      cheque: 0,
      otros: 0,
      bancos: {},
      cobros: 0,
      clientes: 0,
      pendiente: 0,
      meta: 0,
      recibido: 0,
      entregado: 0,
      enMano: 0
    };
  }

  function buildStats(abonos, transferencias) {
    const agentes = getAgentes();
    const clientes = getClientes();
    const stats = {};

    agentes.forEach(a => {
      const id = String(a.id);
      stats[id] = emptyStat(a);
      stats[id].clientes = clientes.filter(c => String(c.agente_id || "") === id).length;
      stats[id].pendiente = calcularPendienteAgente(id);
      stats[id].meta = getMetaAgente(a);
    });

    abonos.forEach(abono => {
      const agenteId = String(getAbonoAgenteId(abono) || "SIN_AGENTE");
      const monto = Number(abono.monto || 0);
      if (!monto) return;

      if (!stats[agenteId]) {
        stats[agenteId] = emptyStat({
          id: agenteId,
          nom: agenteId === "SIN_AGENTE" ? "Sin agente asignado" : getAgenteNombreById(agenteId)
        });
      }

      const tipo = tipoMetodo(abono.metodo);

      stats[agenteId].total += monto;
      stats[agenteId][tipo] += monto;
      stats[agenteId].cobros += 1;

      if (tipo === "banco") {
        const banco = bancoNombre(abono);
        stats[agenteId].bancos[banco] = Number(stats[agenteId].bancos[banco] || 0) + monto;
      }
    });

    transferencias.forEach(t => {
      const monto = Number(t.monto || 0);
      if (!monto) return;

      const desde = String(t.desde_agente || t.agente_origen || t.desde || "");
      const hacia = String(t.hacia_agente || t.agente_destino || t.hacia || "");

      if (desde && !stats[desde]) stats[desde] = emptyStat({ id: desde, nom: getAgenteNombreById(desde) });
      if (hacia && !stats[hacia]) stats[hacia] = emptyStat({ id: hacia, nom: getAgenteNombreById(hacia) });

      if (desde) stats[desde].entregado += monto;
      if (hacia) stats[hacia].recibido += monto;
    });

    Object.values(stats).forEach(s => {
      s.enMano = Number(s.total || 0) + Number(s.recibido || 0) - Number(s.entregado || 0);
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }

  function efectividad(stat) {
    const base = Number(stat.meta || 0) || Number(stat.total + stat.pendiente || 0);
    if (!base) return 0;
    return Math.min(100, Math.round((Number(stat.total || 0) / base) * 100));
  }

  function generalFromStats(stats) {
    return stats.reduce((acc, s) => {
      acc.total += Number(s.total || 0);
      acc.efectivo += Number(s.efectivo || 0);
      acc.banco += Number(s.banco || 0);
      acc.cheque += Number(s.cheque || 0);
      acc.otros += Number(s.otros || 0);
      acc.pendiente += Number(s.pendiente || 0);
      acc.clientes += Number(s.clientes || 0);
      acc.enMano += Number(s.enMano || 0);

      Object.entries(s.bancos || {}).forEach(([b, v]) => {
        acc.bancos[b] = Number(acc.bancos[b] || 0) + Number(v || 0);
      });

      return acc;
    }, {
      total: 0,
      efectivo: 0,
      banco: 0,
      cheque: 0,
      otros: 0,
      pendiente: 0,
      clientes: 0,
      enMano: 0,
      bancos: {}
    });
  }

  function colorByPct(pct) {
    if (pct < 40) return "#dc2626";
    if (pct < 70) return "#d97706";
    return "#059669";
  }

  function renderMetodoCard(tipo, valor, showZero) {
    if (!valor && !showZero) return "";

    const map = {
      efectivo: { bg: "#f0fdf4", bd: "#bbf7d0", tx: "#059669", label: "💵 EFECTIVO" },
      banco: { bg: "#eff6ff", bd: "#bfdbfe", tx: "#2563eb", label: "🏦 BANCO" },
      cheque: { bg: "#fffbeb", bd: "#fde68a", tx: "#d97706", label: "📝 CHEQUE" },
      otros: { bg: "#f8fafc", bd: "#e2e8f0", tx: "#64748b", label: "⋯ OTROS" }
    };

    const c = map[tipo] || map.otros;

    return `
      <div class="nx-method-card" style="background:${c.bg};border-color:${c.bd};color:${c.tx}">
        <span>${c.label}</span>
        <b>${money(valor)}</b>
      </div>
    `;
  }

  function renderBanks(bancos) {
    const rows = Object.entries(bancos || {}).sort((a, b) => b[1] - a[1]);

    if (!rows.length) {
      return `<div class="nx-empty-soft">Sin bancos registrados.</div>`;
    }

    return rows.map(([banco, total]) => `
      <div class="nx-bank-row">
        <span>🏦 ${esc(banco)}</span>
        <b>${money(total)}</b>
      </div>
    `).join("");
  }

  function renderAgentCard(stat) {
    const agente = stat.agente || {};
    const name = getAgenteNombre(agente);
    const pct = efectividad(stat);
    const clr = colorByPct(pct);
    const initials = getInitial(name);

    const bancos = Object.entries(stat.bancos || {}).sort((a, b) => b[1] - a[1]);

    return `
      <div class="nx-agent-card-v2">
        <div class="nx-agent-head-v2">
          <div class="nx-agent-avatar-v2">${esc(initials)}</div>

          <div class="nx-agent-info-v2">
            <div class="nx-agent-name-v2">${esc(name)}</div>
            <div class="nx-agent-role-v2">${esc(getAgenteRol(agente))}</div>
            <div class="nx-agent-license-v2">Licencia: ${esc(getAgenteLicencia(agente))}</div>
            <div class="nx-agent-clientes-v2">👥 ${stat.clientes || 0} clientes asignados</div>
          </div>

          <div class="nx-agent-effect-v2">
            <div class="nx-effect-circle-v2" style="--pct:${pct};--clr:${clr}">
              <span>${pct}%</span>
            </div>
            <small>Efectividad</small>
          </div>
        </div>

        <div class="nx-agent-main-money">
          <span>COBRADO TOTAL</span>
          <b>${money(stat.total)}</b>
        </div>

        <div class="nx-agent-methods-v2">
          ${renderMetodoCard("efectivo", stat.efectivo, false)}
          ${renderMetodoCard("banco", stat.banco, false)}
          ${renderMetodoCard("cheque", stat.cheque, false)}
          ${renderMetodoCard("otros", stat.otros, false)}
          ${(!stat.efectivo && !stat.banco && !stat.cheque && !stat.otros) ? `<div class="nx-empty-soft">Sin cobros registrados.</div>` : ""}
        </div>

        ${bancos.length ? `
          <div class="nx-mini-title">Bancos recibidos</div>
          <div class="nx-bank-pills">
            ${bancos.map(([b, v]) => `<span>🏦 ${esc(b)} · <b>${money(v)}</b></span>`).join("")}
          </div>
        ` : ""}

        <div class="nx-agent-balance-grid">
          <div>
            <span>PENDIENTE</span>
            <b class="danger">${money(stat.pendiente)}</b>
          </div>
          <div>
            <span>EN MANO REAL</span>
            <b class="${stat.enMano < 0 ? "danger" : "blue"}">${money(stat.enMano)}</b>
            <small>Cobrado + recibido - entregado</small>
          </div>
          <div>
            <span>META</span>
            <b>${stat.meta ? money(stat.meta) : "Sin meta"}</b>
          </div>
        </div>

        <div class="nx-transfer-mini">
          <span>Recibido: <b>${money(stat.recibido)}</b></span>
          <span>Entregado: <b>${money(stat.entregado)}</b></span>
        </div>

        <div class="nx-progress-v2">
          <i style="width:${pct}%;background:${clr}"></i>
        </div>
      </div>
    `;
  }

  function renderTransferHistory(transferencias) {
    if (!transferencias.length) {
      return `<div class="nx-empty-soft">Sin transferencias registradas entre agentes.</div>`;
    }

    return `
      <div class="nx-transfer-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Entrega</th>
              <th>Recibe</th>
              <th>Método</th>
              <th>Banco</th>
              <th>Monto</th>
              <th>Ref.</th>
            </tr>
          </thead>
          <tbody>
            ${transferencias.map(t => `
              <tr>
                <td>${esc(String(t.fecha || t.created_at || "").slice(0, 10))}</td>
                <td>${esc(getAgenteNombreById(t.desde_agente || t.agente_origen || t.desde))}</td>
                <td>${esc(getAgenteNombreById(t.hacia_agente || t.agente_destino || t.hacia))}</td>
                <td>${esc(t.metodo || "—")}</td>
                <td>${esc(t.banco || "—")}</td>
                <td><b>${money(t.monto)}</b></td>
                <td>${esc(t.referencia || "—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async function renderReporteAgentesV2(force = false) {
    const now = Date.now();

    if (isRendering) return;
    if (!force && now - lastRenderAt < 700) return;

    const cont = q("#rAgt");
    if (!cont) return;

    isRendering = true;
    lastRenderAt = now;

    try {
      let wrap = q("#nxReporteAgentesV2");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "nxReporteAgentesV2";
        cont.insertAdjacentElement("afterbegin", wrap);
      }

      wrap.innerHTML = `
        <div class="nc p5 nx-loading-v2">
          <div class="loading"><div class="spin"></div> Cargando reporte premium...</div>
        </div>
      `;

      const [abonos, transferencias] = await Promise.all([getAbonos(), getTransferencias()]);
      const stats = buildStats(abonos, transferencias);
      const general = generalFromStats(stats);

      wrap.innerHTML = `
        <div class="nc p5 nx-report-v2">
          <div class="ch nx-report-head-v2">
            <div>
              <div class="ct">💰 Reporte premium por agente</div>
              <div class="ct-s">Cobros reales, métodos, bancos, transferencias y dinero en mano</div>
            </div>
            <div class="nx-actions-v2">
              <button class="btn bsm bc5" type="button" onclick="window.nxAbrirTransferenciaAgenteV2()">
                <i class="ti ti-arrows-exchange"></i> Transferir entre agentes
              </button>
              <button class="btn bsm bc1" type="button" onclick="window.nxRefrescarReporteAgentesV2()">
                <i class="ti ti-refresh"></i> Actualizar
              </button>
            </div>
          </div>

          <div class="nx-top-summary-v2">
            <div class="green">
              <span>Total cobrado</span>
              <b>${money(general.total)}</b>
            </div>
            <div class="blue">
              <span>En mano real</span>
              <b>${money(general.enMano)}</b>
            </div>
            <div class="red">
              <span>Pendiente</span>
              <b>${money(general.pendiente)}</b>
            </div>
            <div class="gray">
              <span>Clientes asignados</span>
              <b>${general.clientes}</b>
            </div>
          </div>

          <div class="nx-method-summary-v2">
            ${renderMetodoCard("efectivo", general.efectivo, true)}
            ${renderMetodoCard("banco", general.banco, true)}
            ${renderMetodoCard("cheque", general.cheque, false)}
            ${renderMetodoCard("otros", general.otros, false)}
          </div>

          <div class="nx-two-cols-v2">
            <div class="nx-box-v2">
              <h3>🏦 Por banco</h3>
              ${renderBanks(general.bancos)}
            </div>
            <div class="nx-box-v2">
              <h3>🔁 Historial de transferencias</h3>
              ${renderTransferHistory(transferencias)}
            </div>
          </div>

          <div class="nx-agents-grid-v2">
            ${stats.length ? stats.map(renderAgentCard).join("") : `<div class="nx-empty-card-v2">No hay agentes o cobros registrados todavía.</div>`}
          </div>
        </div>
      `;
    } finally {
      isRendering = false;
    }
  }

  window.nxRefrescarReporteAgentesV2 = () => renderReporteAgentesV2(true);

  function createTransferModal() {
    if (q("#nxModalTransferAgenteV2")) return;

    const modal = document.createElement("div");
    modal.className = "overlay";
    modal.id = "nxModalTransferAgenteV2";
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="mt">
          <span>// TRANSFERENCIA ENTRE AGENTES</span>
          <button class="btn bghost bsm" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="gf2">
          <div class="fr">
            <label>Agente que entrega *</label>
            <select id="nxTA2Desde"></select>
          </div>
          <div class="fr">
            <label>Agente que recibe *</label>
            <select id="nxTA2Hacia"></select>
          </div>
          <div class="fr">
            <label>Monto RD$ *</label>
            <input type="number" id="nxTA2Monto" min="0.01" step="0.01" placeholder="0.00">
          </div>
          <div class="fr">
            <label>Método *</label>
            <select id="nxTA2Metodo">
              <option>Efectivo</option>
              <option>Transferencia</option>
            </select>
          </div>
          <div class="fr" id="nxTA2BancoWrap" style="display:none">
            <label>Banco</label>
            <select id="nxTA2Banco">
              <option value="">Seleccionar...</option>
              <option>BHD</option>
              <option>Banreservas</option>
              <option>Popular</option>
              <option>Otros</option>
            </select>
          </div>
          <div class="fr" id="nxTA2BancoOtroWrap" style="display:none">
            <label>Otro banco</label>
            <input type="text" id="nxTA2BancoOtro" placeholder="Nombre del banco">
          </div>
          <div class="fr">
            <label>Referencia *</label>
            <input type="text" id="nxTA2Ref" placeholder="Número de recibo o transferencia">
          </div>
          <div class="fr">
            <label>Nota</label>
            <input type="text" id="nxTA2Nota" placeholder="Opcional">
          </div>
        </div>

        <div class="nx-info-box-v2">
          Este movimiento ajusta el control interno para saber qué agente tiene el dinero.
        </div>

        <div class="fe">
          <button class="btn" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()">Cancelar</button>
          <button class="btn bxl" type="button" onclick="window.nxGuardarTransferenciaAgenteV2()" id="nxTA2Btn">
            <i class="ti ti-check"></i> Guardar transferencia
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    q("#nxTA2Metodo")?.addEventListener("change", toggleBancoTransfer);
    q("#nxTA2Banco")?.addEventListener("change", toggleBancoOtroTransfer);
  }

  function fillAgentesSelects() {
    const agentes = getAgentes();
    const opts = `<option value="">Seleccionar...</option>` + agentes
      .map(a => `<option value="${esc(a.id)}">${esc(getAgenteNombre(a))}</option>`)
      .join("");

    if (q("#nxTA2Desde")) q("#nxTA2Desde").innerHTML = opts;
    if (q("#nxTA2Hacia")) q("#nxTA2Hacia").innerHTML = opts;
  }

  function toggleBancoTransfer() {
    const metodo = q("#nxTA2Metodo")?.value || "";
    const show = metodo === "Transferencia";

    if (q("#nxTA2BancoWrap")) q("#nxTA2BancoWrap").style.display = show ? "block" : "none";

    if (!show) {
      if (q("#nxTA2Banco")) q("#nxTA2Banco").value = "";
      if (q("#nxTA2BancoOtro")) q("#nxTA2BancoOtro").value = "";
      if (q("#nxTA2BancoOtroWrap")) q("#nxTA2BancoOtroWrap").style.display = "none";
    } else {
      toggleBancoOtroTransfer();
    }
  }

  function toggleBancoOtroTransfer() {
    const banco = q("#nxTA2Banco")?.value || "";
    if (q("#nxTA2BancoOtroWrap")) {
      q("#nxTA2BancoOtroWrap").style.display = banco === "Otros" ? "block" : "none";
    }
  }

  window.nxAbrirTransferenciaAgenteV2 = function () {
    createTransferModal();
    fillAgentesSelects();
    toggleBancoTransfer();
    q("#nxModalTransferAgenteV2")?.classList.add("open");
  };

  window.nxCerrarTransferenciaAgenteV2 = function () {
    q("#nxModalTransferAgenteV2")?.classList.remove("open");
  };

  window.nxGuardarTransferenciaAgenteV2 = async function () {
    const desde = q("#nxTA2Desde")?.value || "";
    const hacia = q("#nxTA2Hacia")?.value || "";
    const monto = Number(q("#nxTA2Monto")?.value || 0);
    const metodo = q("#nxTA2Metodo")?.value || "Efectivo";
    const ref = (q("#nxTA2Ref")?.value || "").trim();
    const nota = (q("#nxTA2Nota")?.value || "").trim();
    let banco = "";

    if (!desde) return toastSafe("err", "Agente requerido", "Selecciona el agente que entrega");
    if (!hacia) return toastSafe("err", "Agente requerido", "Selecciona el agente que recibe");
    if (desde === hacia) return toastSafe("err", "Movimiento inválido", "El agente que entrega y recibe no puede ser el mismo");
    if (!monto || monto <= 0) return toastSafe("err", "Monto inválido", "Escribe un monto mayor a cero");
    if (!ref) return toastSafe("err", "Referencia requerida", "Escribe una referencia");

    if (metodo === "Transferencia") {
      banco = q("#nxTA2Banco")?.value || "";
      if (!banco) return toastSafe("err", "Banco requerido", "Selecciona el banco");

      if (banco === "Otros") {
        banco = (q("#nxTA2BancoOtro")?.value || "").trim();
        if (!banco) return toastSafe("err", "Banco requerido", "Escribe el nombre del banco");
      }
    }

    if (!window.API?.post) {
      return toastSafe("err", "API no disponible", "No se encontró API.post para guardar la transferencia");
    }

    const btn = q("#nxTA2Btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spin"></div>';
    }

    const payload = {
      desde_agente: desde,
      hacia_agente: hacia,
      monto,
      metodo,
      banco: banco || null,
      referencia: ref,
      nota: nota || null,
      fecha: today()
    };

    try {
      await window.API.post(TRANSFER_TABLE, payload);

      if (typeof window.logAudit === "function") {
        window.logAudit(
          "TRANSFERENCIA_AGENTE",
          `${getAgenteNombreById(desde)} → ${getAgenteNombreById(hacia)} · ${money(monto)} · ${metodo}${banco ? " · " + banco : ""}`,
          "Cobros"
        );
      }

      toastSafe("ok", "Transferencia registrada", `${getAgenteNombreById(desde)} → ${getAgenteNombreById(hacia)} · ${money(monto)}`);
      window.nxCerrarTransferenciaAgenteV2();

      // Refrescar sin parpadeo agresivo.
      await renderReporteAgentesV2(true);
    } catch (e) {
      console.error("Error guardando transferencia:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que exista la tabla transferencias_agentes en Supabase");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-check"></i> Guardar transferencia';
      }
    }
  };

  function wrapReporteAgente() {
    if (window.__NEXUS_RREPAGT_V2_WRAPPED__) return;

    if (typeof window.rRepAgt !== "function") {
      setTimeout(wrapReporteAgente, 700);
      return;
    }

    window.__NEXUS_RREPAGT_V2_WRAPPED__ = true;
    const original = window.rRepAgt;

    window.rRepAgt = function () {
      const result = original.apply(this, arguments);
      setTimeout(() => renderReporteAgentesV2(true), 120);
      return result;
    };
  }

  function irAReporteAgente() {
    if (typeof window.nav === "function") {
      window.nav("rep-agente", null);
      setTimeout(() => {
        if (typeof window.rRepAgt === "function") window.rRepAgt();
        else renderReporteAgentesV2(true);
      }, 180);
      return;
    }

    const btn = qa("[onclick]").find(el => normalize(el.getAttribute("onclick")).includes("rep-agente"));
    if (btn) btn.click();

    setTimeout(() => renderReporteAgentesV2(true), 250);
  }

  function bindDashboardCobrado() {
    qa(".kpi, .card, .stat-card, .dashboard-card, [class*='kpi'], [class*='card'], .qa").forEach(card => {
      if (card.dataset.nxCobradoV2Bound === "1") return;

      const txt = normalize(card.innerText || card.textContent || "");
      if (!txt.includes("cobrado")) return;

      card.dataset.nxCobradoV2Bound = "1";
      card.style.cursor = "pointer";

      card.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        irAReporteAgente();
      }, true);
    });
  }

  function injectStyles() {
    if (q("#nxReporteAgentesV2CSS")) return;

    const style = document.createElement("style");
    style.id = "nxReporteAgentesV2CSS";
    style.textContent = `
      #nxReporteAgentesV2 { margin-bottom: 14px; }

      .nx-report-v2 {
        border-top: 4px solid #7c3aed !important;
      }

      .nx-report-head-v2 {
        align-items: flex-start !important;
      }

      .nx-actions-v2 {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .nx-top-summary-v2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }

      .nx-top-summary-v2 > div {
        border-radius: 16px;
        padding: 14px;
        border: 1px solid #e2e8f0;
        background: #fff;
      }

      .nx-top-summary-v2 span {
        display: block;
        font-size: 10px;
        font-weight: 900;
        color: #64748b;
        letter-spacing: .5px;
        text-transform: uppercase;
      }

      .nx-top-summary-v2 b {
        display: block;
        margin-top: 5px;
        font-size: 22px;
        color: #0f172a;
      }

      .nx-top-summary-v2 .green { background: #f0fdf4; border-color: #bbf7d0; }
      .nx-top-summary-v2 .green b { color: #059669; }
      .nx-top-summary-v2 .blue { background: #eff6ff; border-color: #bfdbfe; }
      .nx-top-summary-v2 .blue b { color: #2563eb; }
      .nx-top-summary-v2 .red { background: #fef2f2; border-color: #fecaca; }
      .nx-top-summary-v2 .red b { color: #dc2626; }
      .nx-top-summary-v2 .gray { background: #f8fafc; border-color: #e2e8f0; }

      .nx-method-summary-v2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .nx-method-card {
        border: 1px solid;
        border-radius: 14px;
        padding: 12px;
      }

      .nx-method-card span {
        display: block;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .4px;
      }

      .nx-method-card b {
        display: block;
        margin-top: 5px;
        font-size: 19px;
        font-weight: 900;
      }

      .nx-two-cols-v2 {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 10px;
        margin-bottom: 12px;
      }

      .nx-box-v2 {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 14px;
      }

      .nx-box-v2 h3 {
        font-size: 12px;
        margin: 0 0 8px;
        color: #0f172a;
        font-weight: 900;
      }

      .nx-bank-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #eef2f7;
        font-size: 12px;
      }

      .nx-bank-row span { font-weight: 800; color: #1e293b; }
      .nx-bank-row b { color: #2563eb; }

      .nx-transfer-table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .nx-transfer-table-wrap table {
        min-width: 680px;
      }

      .nx-transfer-table-wrap td,
      .nx-transfer-table-wrap th {
        font-size: 11px;
      }

      .nx-agents-grid-v2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
        gap: 12px;
      }

      .nx-agent-card-v2 {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 22px;
        padding: 16px;
        box-shadow: 0 10px 28px rgba(15,23,42,.08);
      }

      .nx-agent-head-v2 {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .nx-agent-avatar-v2 {
        width: 50px;
        height: 50px;
        border-radius: 18px;
        background: linear-gradient(135deg,#7c3aed,#2563eb);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 20px;
        font-weight: 900;
        box-shadow: 0 10px 22px rgba(124,58,237,.28);
        flex: 0 0 auto;
      }

      .nx-agent-info-v2 {
        min-width: 0;
        flex: 1;
      }

      .nx-agent-name-v2 {
        font-size: 15px;
        font-weight: 900;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .nx-agent-role-v2,
      .nx-agent-license-v2,
      .nx-agent-clientes-v2 {
        font-size: 10px;
        color: #64748b;
        margin-top: 2px;
        font-weight: 700;
      }

      .nx-agent-effect-v2 {
        text-align: center;
        flex: 0 0 auto;
      }

      .nx-effect-circle-v2 {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background:
          radial-gradient(closest-side,#fff 72%,transparent 74%),
          conic-gradient(var(--clr) calc(var(--pct) * 1%),#e2e8f0 0);
      }

      .nx-effect-circle-v2 span {
        font-size: 12px;
        font-weight: 900;
        color: var(--clr);
      }

      .nx-agent-effect-v2 small {
        display: block;
        margin-top: 3px;
        font-size: 8px;
        color: #64748b;
        font-weight: 900;
      }

      .nx-agent-main-money {
        background: linear-gradient(135deg,#ecfdf5,#f0fdf4);
        border: 1px solid #bbf7d0;
        border-radius: 18px;
        padding: 14px;
        margin: 14px 0 10px;
      }

      .nx-agent-main-money span {
        display: block;
        font-size: 10px;
        color: #059669;
        font-weight: 900;
        letter-spacing: .6px;
      }

      .nx-agent-main-money b {
        display: block;
        margin-top: 4px;
        font-size: 24px;
        line-height: 1;
        color: #059669;
        font-weight: 900;
      }

      .nx-agent-methods-v2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 10px;
      }

      .nx-mini-title {
        font-size: 9px;
        color: #64748b;
        font-weight: 900;
        text-transform: uppercase;
        margin: 7px 0;
      }

      .nx-bank-pills {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .nx-bank-pills span {
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: 9px;
        font-weight: 800;
      }

      .nx-agent-balance-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 7px;
        margin-top: 9px;
      }

      .nx-agent-balance-grid > div {
        background: #f8fafc;
        border: 1px solid #eef2f7;
        border-radius: 14px;
        padding: 9px;
      }

      .nx-agent-balance-grid span {
        display: block;
        font-size: 8px;
        color: #64748b;
        font-weight: 900;
        text-transform: uppercase;
      }

      .nx-agent-balance-grid b {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #0f172a;
        font-weight: 900;
      }

      .nx-agent-balance-grid b.danger { color: #dc2626; }
      .nx-agent-balance-grid b.blue { color: #2563eb; }

      .nx-agent-balance-grid small {
        display: block;
        font-size: 8px;
        color: #94a3b8;
        margin-top: 3px;
        line-height: 1.2;
      }

      .nx-transfer-mini {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 10px;
        color: #64748b;
        margin-top: 8px;
      }

      .nx-transfer-mini b {
        color: #0f172a;
      }

      .nx-progress-v2 {
        height: 8px;
        background: #e2e8f0;
        border-radius: 999px;
        overflow: hidden;
        margin-top: 9px;
      }

      .nx-progress-v2 i {
        display: block;
        height: 100%;
        border-radius: 999px;
      }

      .nx-empty-soft {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        color: #94a3b8;
        border-radius: 12px;
        padding: 10px;
        font-size: 10px;
        font-weight: 800;
      }

      .nx-empty-card-v2 {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        color: #64748b;
        border-radius: 18px;
        padding: 24px;
        text-align: center;
        font-weight: 800;
      }

      .nx-info-box-v2 {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 10px;
        font-size: 11px;
        color: #1e3a6e;
        margin-top: 8px;
      }

      @media(max-width: 768px) {
        .nx-two-cols-v2 {
          grid-template-columns: 1fr;
        }

        .nx-agents-grid-v2 {
          grid-template-columns: 1fr;
        }

        .nx-method-summary-v2 {
          grid-template-columns: 1fr;
        }

        .nx-agent-methods-v2 {
          grid-template-columns: 1fr;
        }

        .nx-agent-balance-grid {
          grid-template-columns: 1fr;
        }

        .nx-top-summary-v2 {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }

        .nx-actions-v2 {
          justify-content: flex-start;
          margin-top: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addChangelog() {
    try {
      const key = "nexu_patch_changelog";
      const list = JSON.parse(localStorage.getItem(key) || "[]");

      if (list.some(x => x.id === PATCH_ID)) return;

      list.unshift({
        id: PATCH_ID,
        version: "Fase 2 V2",
        fecha: new Date().toISOString(),
        titulo: "Reporte premium por agente + transferencias",
        cambios: [
          "Corrige parpadeo eliminando re-render agresivo.",
          "Agrega dinero en mano real por agente.",
          "Agrega transferencia entre agentes.",
          "Agrega historial de transferencias.",
          "Dashboard COBRADO abre Reporte por Agente.",
          "Mantiene reporte original debajo."
        ]
      });

      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  function init() {
    injectStyles();
    createTransferModal();
    wrapReporteAgente();
    bindDashboardCobrado();
    addChangelog();

    if (q("#v-rep-agente.view.on") && q("#rAgt")) {
      setTimeout(() => renderReporteAgentesV2(false), 250);
    }
  }

  // Inicialización controlada. No setInterval infinito.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  document.addEventListener("click", function () {
    // Solo reintenta enlazar Dashboard, no re-renderiza el reporte.
    setTimeout(bindDashboardCobrado, 120);
  }, true);

  window.addEventListener("resize", function () {
    // No re-renderizamos en resize para evitar parpadeo.
    setTimeout(bindDashboardCobrado, 120);
  });
})();
