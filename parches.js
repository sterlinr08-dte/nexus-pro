<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0033aa">
<title>SISTEMA TALLER BAYOL CELL</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
    --bg-main: #f1f5f9;
    --sidebar-bg: #ffffff;
    --sidebar-btn-bg: #fef2f2;
    --blue-btn: #dc2626;
    --red-soft: #dc2626;
    --red-light: #fef2f2;
    --red-mid: #fee2e2;
    --text-dark: #1e293b;
    --text-muted: #64748b;
    --border-color: #e2e8f0;
    --card-bg: #ffffff;
}

* { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; transition: background 0.2s, transform 0.1s; }
body { margin: 0; background-color: var(--bg-main); color: var(--text-dark); overflow: hidden; height: 100vh; }

.login { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a, #020617); padding: 20px; }
.login-card { width: 100%; max-width: 420px; background: #fff; border-radius: 20px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); text-align: center; border: 1px solid rgba(255,255,255,0.1); }
.logo-login { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 25px; }
.logo-login h1 { margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
.logo-login span { color: #ef4444; }

label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 5px; text-align: left; }
.form-row { margin-bottom: 16px; }
input, select, textarea { width: 100%; border: 1.5px solid #e2e8f0; background: #fff; border-radius: 11px; padding: 11px 15px; font-size: 13px; color: var(--text-dark); outline: none; box-shadow: 0 1px 2px rgba(15,23,42,0.03); }
input:focus, select:focus, textarea:focus { border-color: #fca5a5; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
input[disabled] { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }

.btn { border: 0; border-radius: 11px; padding: 9px 16px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 12.5px; transition: all 0.18s ease; transform: translateY(0); }
.btn:active { transform: translateY(1px); }
.btn:disabled, .btn[disabled] { opacity: 0.5; cursor: not-allowed; box-shadow: none !important; transform: none !important; }
.btn-blue { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; box-shadow: 0 4px 12px rgba(220,38,38,0.28); }
.btn-blue:hover { background: linear-gradient(135deg, #f05252 0%, #e02424 100%); box-shadow: 0 6px 18px rgba(220,38,38,0.38); }
.btn-blue:active { box-shadow: 0 2px 8px rgba(220,38,38,0.3); }
.btn-dark { background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: #fff; box-shadow: 0 4px 12px rgba(15,23,42,0.25); }
.btn-dark:hover { background: linear-gradient(135deg, #475569 0%, #334155 100%); box-shadow: 0 6px 18px rgba(15,23,42,0.32); }
.btn-dark:active { box-shadow: 0 2px 8px rgba(15,23,42,0.25); }
.btn-light { background: #fff; border: 1px solid #e2e8f0; color: var(--text-dark); text-shadow: none; box-shadow: 0 2px 6px rgba(15,23,42,0.05); }
.btn-light:hover { background: var(--red-light); border-color: #fca5a5; color: #dc2626; box-shadow: 0 4px 10px rgba(220,38,38,0.1); }
.btn-light:active { box-shadow: 0 1px 4px rgba(15,23,42,0.05); }
.btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; box-shadow: 0 4px 12px rgba(220,38,38,0.28); }
.btn-danger:hover { background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); box-shadow: 0 6px 18px rgba(220,38,38,0.38); }
.btn-danger:active { box-shadow: 0 1px 0 #991b1b, 0 2px 5px rgba(220,38,38,0.3); }
.btn-success { background: linear-gradient(180deg, #10b981 0%, #059669 100%); color: #fff; box-shadow: 0 3px 0 #047857, 0 4px 8px rgba(5,150,105,0.25); }
.btn-success:hover { background: linear-gradient(180deg, #34d399 0%, #10b981 100%); }
.btn-success:active { box-shadow: 0 1px 0 #047857, 0 2px 5px rgba(5,150,105,0.3); }
/* Tamaños */
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 7px; box-shadow: 0 2px 0 rgba(0,0,0,0.12); }
.btn-sm:active { box-shadow: 0 1px 0 rgba(0,0,0,0.12); }
.btn-lg { padding: 12px 22px; font-size: 14px; }
.btn-block { width: 100%; }
/* Acciones verticales: cada botón/select ocupa el ancho completo */
.acciones-verticales .btn, .acciones-verticales select, .acciones-verticales button { width: 100%; justify-content: center; text-align: center; }
/* Botón solo icono (para listas/tablas) */
.btn-icon { padding: 7px 9px; font-size: 12px; border-radius: 7px; }
.err { display: none; background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 15px; text-align: left; }

.app { display: none; height: 100vh; }
.sidebar { width: 268px; background: var(--sidebar-bg); color: var(--text-dark); display: flex; flex-direction: column; flex-shrink: 0; box-shadow: 2px 0 16px rgba(0,0,0,0.06); z-index: 10; border-right: 1px solid #eef2f7; }

/* Logo estilo NEXUS */
.side-brand { padding: 20px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f5f9; }
.brand-icon { width: 46px; height: 46px; border-radius: 13px; background: linear-gradient(135deg, #ef4444, #dc2626); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; box-shadow: 0 6px 14px rgba(220,38,38,0.3); flex-shrink: 0; }
.brand-text h3 { margin: 0; font-size: 18px; font-weight: 800; color: #1e293b; letter-spacing: -0.3px; }
.brand-text small { display: block; font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; margin-top: 1px; }

.nav { padding: 14px 12px; overflow-y: auto; flex: 1; }
.nav-section { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; padding: 14px 10px 6px; }
.nav-section:first-child { padding-top: 4px; }
.nav button { width: 100%; background: #fff; color: #475569; border: 1px solid #f1f5f9; border-radius: 12px; padding: 13px 14px; margin-bottom: 7px; text-align: left; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 13.5px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
.nav button i { font-size: 19px; color: #94a3b8; flex-shrink: 0; }
.nav button span { flex: 1; }
.nav button:hover { background: var(--red-light); color: #dc2626; border-color: var(--red-mid); }
.nav button:hover i { color: #dc2626; }
.nav button.active { background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #dc2626; font-weight: 800; border: 1.5px solid #fca5a5; box-shadow: 0 4px 10px rgba(220,38,38,0.12); }
.nav button.active i { color: #dc2626; }
.nav-badge-admin { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 9px; font-weight: 800; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.5px; flex: 0 !important; }

/* Tarjeta de usuario estilo NEXUS */
.side-user { margin: 10px 12px 14px; padding: 12px 14px; display: flex; align-items: center; gap: 11px; background: #fff; border: 1px solid #f1f5f9; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; box-shadow: 0 3px 8px rgba(220,38,38,0.25); flex-shrink: 0; }
.profile-info h4 { margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; }
.profile-info small { color: #16a34a; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.top-bar { height: 58px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; display: flex; align-items: center; padding: 0 24px; gap: 15px; box-shadow: 0 2px 10px rgba(220,38,38,0.2); }
.top-title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.top-right-info { margin-left: auto; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); }

.content { flex: 1; overflow-y: auto; padding: 20px; }
.view { display: none; }
.view.active { display: block; }

.card { background: var(--card-bg); border-radius: 16px; border: 1px solid #eef2f7; padding: 20px; box-shadow: 0 4px 16px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04); margin-bottom: 20px; }
.data-table { border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(15,23,42,0.05); border: 1px solid #eef2f7; }
.data-table thead tr { background: #f8fafc; }
.data-table th { text-align: left; padding: 11px 12px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; }
.data-table td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table tbody tr:last-child td { border-bottom: 0; }
.data-table tbody tr:hover { background: #fef9f9; }
.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
.kpi-box { background: #fff; border-radius: 14px; padding: 16px; border-top: 4px solid var(--red-soft); box-shadow: 0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04); position: relative; border: 1px solid #eef2f7; }
.kpi-box.clickable { cursor: pointer; }
.kpi-box.clickable:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(15,23,42,0.08); }
.kpi-box small { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; display: block; }
.kpi-box strong { font-size: 26px; font-weight: 800; display: block; margin-top: 4px; color: var(--text-dark); }
.kpi-box i { position: absolute; right: 12px; bottom: 12px; font-size: 22px; color: var(--text-muted); opacity: 0.2; }

.layout-dashboard { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 20px; }
.layout-inventario { display: flex; flex-direction: column; gap: 20px; }

.block-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; align-items: start; }
.block-card { background: #fff; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); overflow: hidden; }
.block-header { padding: 11px 14px; font-size: 12px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 1px rgba(0,0,0,0.1); }
.header-blue-dark { background: #0033aa; }
.header-blue-light { background: #0056b3; }
.header-blue-sec { background: #0044cc; }
.block-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }

.checks-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.checks-layout label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: none; color: var(--text-dark); background: #f8fafc; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; margin: 0; cursor: pointer; }
.checks-layout input { width: auto; cursor: pointer; accent-color: var(--blue-btn); }

.table-wrap { overflow: auto; border-radius: 8px; border: 1px solid #cbd5e1; }
table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #fff; }
th { background: #f1f5f9; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; }
td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: var(--text-dark); }
tr:hover td { background: #f8fafc; }
.badge { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }

.label-preview-card { background: #fff; border: 2px dashed #94a3b8; border-radius: 4px; padding: 12px; color: #000; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin: 0 auto; transition: none; }
.barcode-visual { font-family: 'Libre Barcode 39', Arial, sans-serif; display: block; margin: 4px 0; line-height: 1; }

.toast { position: fixed; right: 20px; bottom: 20px; background: #0f172a; color: #fff; border-radius: 8px; padding: 12px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: none; z-index: 99; font-size: 13px; font-weight: 600; }
.print-area { display: none; }

.access-note { background:#f8fafc; border:1px solid #cbd5e1; color:#475569; border-radius:6px; padding:8px; font-size:11px; font-weight:600; line-height:1.35; }
.password-field { display:flex; gap:6px; align-items:center; }
.password-field input { flex:1; }
.password-field button { white-space:nowrap; }
.pattern-panel { display:none; border:1px solid #cbd5e1; border-radius:8px; padding:10px; background:#f8fafc; }
.pattern-panel.active { display:block; }
.pattern-grid { width:150px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin:8px auto; }
.pattern-dot { width:42px; height:42px; border-radius:50%; border:1px solid #94a3b8; background:#fff; font-weight:800; color:#334155; cursor:pointer; }
.pattern-dot.active { background:#0f172a; color:#fff; border-color:#0f172a; }
.pattern-summary { text-align:center; font-size:11px; font-weight:700; color:#475569; margin:6px 0; }
.pattern-actions { display:flex; justify-content:center; gap:8px; }
.ticket-box { width:76mm; padding:10px; font-family:Arial, sans-serif; font-size:12px; line-height:1.35; color:#000; }
.ticket-box h2 { margin:0 0 4px; text-align:center; font-size:18px; }
.ticket-box .line { border-top:1px dashed #000; margin:7px 0; }
.ticket-box .small { font-size:10px; line-height:1.3; }
.ticket-sensitive { white-space:normal; margin-top:4px; }
.ticket-sensitive .cred-line { margin:2px 0; }
.ticket-pattern-wrap { margin-top:6px; text-align:center; }
.ticket-pattern-title { font-weight:700; font-size:11px; margin-bottom:3px; }
.ticket-pattern-svg { width:120px; height:120px; display:block; margin:0 auto; }
.ticket-pattern-seq { font-size:10px; margin-top:2px; }
.access-reveal-box { white-space:pre-line; font-size:11px; line-height:1.35; }

.form-inline-asset { display: grid; grid-template-columns: 0.8fr 1.5fr 0.6fr 1fr 1.3fr auto; gap: 10px; align-items: end; background: #f8fafc; border: 1px dashed var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 15px; }

.select-table-state { font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: 700; border: 1px solid var(--border-color); cursor: pointer; outline: none; width: auto; display: inline-block; }
.audit-text { font-size: 10px; color: var(--text-muted); display: block; margin-top: 2px; font-family: monospace; }
.grid-refurb { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.refurb-item-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; background: #f8fafc; margin-bottom: 12px; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-backdrop.active { display: flex; }
.modal-backdrop.modal-encima { z-index: 200; }
.modal-box { background: #fff; border-radius: 12px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); }
.modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: #0033aa; color: #fff; border-radius: 12px 12px 0 0; }
.modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-close { background: rgba(255,255,255,0.25); border: 2px solid rgba(255,255,255,0.4); color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
.modal-close:hover { background: rgba(255,255,255,0.4); transform: scale(1.1); }
.modal-close:active { transform: scale(0.95); }
.modal-body { padding: 20px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; justify-content: flex-end; background: #f8fafc; border-radius: 0 0 12px 12px; }

/* TARJETAS DE PROVEEDOR */
.prov-card { background: #fff; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px 16px; display: flex; gap: 14px; align-items: center; transition: all 0.15s; }
.prov-card:hover { border-color: var(--blue-btn); box-shadow: 0 4px 8px rgba(220,38,38,0.1); }
.prov-card .prov-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0044aa, #0066cc); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; flex-shrink: 0; }
.prov-card .prov-info { flex: 1; }
.prov-card .prov-info h4 { margin: 0 0 2px; font-size: 14px; font-weight: 700; }
.prov-card .prov-info .meta { font-size: 11px; color: var(--text-muted); }
.prov-card .prov-actions { display: flex; gap: 6px; }

/* PROVEEDOR DETALLE */
.prov-detail-header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(220,38,38,0.2); }
.prov-detail-header h2 { margin: 0; font-size: 22px; font-weight: 800; }
.prov-detail-header .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; }
.prov-detail-header .stat-item { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); padding: 8px 10px; border-radius: 8px; }
.prov-detail-header .stat-item small { display: block; font-size: 10px; opacity: 0.85; text-transform: uppercase; font-weight: 700; }
.prov-detail-header .stat-item strong { display: block; font-size: 16px; font-weight: 800; margin-top: 2px; }

/* LOTE CARD */
.lote-card { background: #fff; border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.lote-card:hover { border-color: var(--blue-btn); }
.lote-card .lote-codigo { font-weight: 800; color: var(--blue-btn); font-size: 14px; }
.lote-card .lote-meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.lote-card .lote-totals { text-align: right; }
.lote-card .lote-totals .total { font-weight: 800; font-size: 15px; color: #065f46; }

/* ARTICULO PICKER */
.art-picker-row { display: grid; grid-template-columns: 2fr 1.2fr 1fr auto; gap: 10px; align-items: end; }

@media print {
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { display: block; position: absolute; left: 0; top: 0; background: #fff; color: #000; margin: 0; padding: 0; }
}

/* ============================================================
   BOTÓN MENÚ HAMBURGUESA (oculto en desktop)
   ============================================================ */
.menu-toggle { display: none; background: rgba(255,255,255,0.15); border: 0; color: #fff; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 20px; align-items: center; justify-content: center; flex-shrink: 0; }
.sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 15; }
.sidebar-backdrop.active { display: block; }

/* ============================================================
   RESPONSIVE — TABLET (max 1024px)
   ============================================================ */
/* ============================================================
   RESPONSIVE — TABLET GRANDE (769px a 1024px): ajustes de columnas
   ============================================================ */
@media (min-width: 769px) and (max-width: 1024px) {
    .kpi-row { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .block-grid { grid-template-columns: 1fr 1fr; }
    .block-card[style*="grid-column: span 2"] { grid-column: span 2 !important; }
    .prov-detail-header .stats { grid-template-columns: repeat(2, 1fr); }
    .art-picker-row { grid-template-columns: 1fr 1fr; gap: 10px; }
    .art-picker-row button { grid-column: span 2; height: auto; }
    .form-inline-asset { grid-template-columns: 1fr 1fr; }
    .form-inline-asset button { grid-column: span 2; }
}

/* ============================================================
   RESPONSIVE — MÓVIL Y TABLET (max 1024px)
   ============================================================ */
@media (max-width: 1024px) {
    body { overflow: auto; height: auto; min-height: 100vh; }
    
    body.logged-in .app { display: block !important; height: auto; min-height: 100vh; }
    body:not(.logged-in) .app { display: none !important; }
    .sidebar {
        position: fixed;
        left: -90vw;
        top: 0;
        width: 78vw;
        max-width: 300px;
        height: 100vh;
        z-index: 20;
        transition: left 0.3s ease;
        overflow-y: auto;
    }
    .sidebar.open { left: 0; }
    .sidebar .nav button { font-size: 14px; padding: 11px 14px; }
    .main { display: block; width: 100%; }
    
    .top-bar {
        height: 52px;
        padding: 0 12px;
        gap: 8px;
        position: sticky;
        top: 0;
        z-index: 8;
    }
    .menu-toggle { display: inline-flex; }
    .top-title { font-size: 13px; }
    .top-right-info {
        font-size: 10px;
        padding: 3px 8px;
    }
    .top-right-info span { display: none; }
    .top-bar .btn-light { padding: 4px 8px !important; font-size: 10px !important; }
    
    .content { padding: 12px; overflow-y: visible; height: auto; flex: none; }
    
    .card { padding: 14px; margin-bottom: 14px; border-radius: 10px; }
    
    .kpi-row { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 14px; }
    .kpi-box { padding: 10px; }
    .kpi-box small { font-size: 9px; }
    .kpi-box strong { font-size: 20px; }
    .kpi-box i { font-size: 18px; right: 8px; bottom: 8px; }
    
    .block-grid { grid-template-columns: 1fr !important; gap: 12px; }
    .block-card[style*="grid-column: span 2"] { grid-column: span 1 !important; }
    .block-body { gap: 8px; }
    
    .layout-dashboard, .layout-inventario, .grid-refurb { grid-template-columns: 1fr !important; gap: 14px; }
    
    .table-wrap table thead { display: none; }
    .table-wrap table, 
    .table-wrap tbody, 
    .table-wrap tr, 
    .table-wrap td { display: block; width: 100%; }
    .table-wrap tr {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        background: #fff;
    }
    .table-wrap td {
        border: 0;
        padding: 4px 0;
        text-align: left;
        position: relative;
        padding-left: 110px;
        min-height: 24px;
    }
    .table-wrap td::before {
        content: attr(data-label);
        position: absolute;
        left: 0;
        top: 4px;
        width: 100px;
        font-weight: 700;
        font-size: 10px;
        text-transform: uppercase;
        color: var(--text-muted);
    }
    .table-wrap td:not([data-label])::before { display: none; }
    .table-wrap td:not([data-label]) { padding-left: 0; }
    .table-wrap { border: 0; max-height: none !important; }
    
    .form-inline-asset { grid-template-columns: 1fr !important; }
    .form-inline-asset button { grid-column: auto !important; }
    
    .prov-detail-header { padding: 14px; }
    .prov-detail-header h2 { font-size: 18px; }
    .prov-detail-header .stats { grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 10px; }
    .prov-detail-header .stat-item strong { font-size: 14px; }
    
    .prov-card { flex-direction: column; align-items: flex-start; gap: 10px; padding: 12px; }
    .prov-card .prov-info { width: 100%; }
    .prov-card .prov-actions { width: 100%; display: grid; grid-template-columns: 1fr auto auto; gap: 6px; }
    .prov-card .prov-actions button { width: 100%; }
    
    .lote-card { flex-direction: column; align-items: flex-start; gap: 10px; padding: 12px; }
    .lote-card > div:first-child { width: 100%; }
    .lote-card > div:last-child { width: 100%; display: grid; grid-template-columns: 1fr auto auto; gap: 6px; align-items: center; }
    .lote-card .lote-totals { text-align: left; }
    
    .art-picker-row { grid-template-columns: 1fr; gap: 8px; }
    .art-picker-row button { grid-column: 1; height: auto; }
    
    .checks-layout { grid-template-columns: 1fr; }
    
    .pattern-grid { width: 180px; }
    .pattern-dot { width: 50px; height: 50px; }
    
    .modal-backdrop { padding: 0; align-items: flex-end; }
    .modal-box {
        max-width: 100%;
        max-height: 95vh;
        border-radius: 16px 16px 0 0;
        animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    .modal-header { padding: 14px; border-radius: 16px 16px 0 0; }
    .modal-header h3 { font-size: 14px; }
    .modal-body { padding: 16px; }
    .modal-footer { padding: 12px 16px; flex-direction: column-reverse; gap: 8px; }
    .modal-footer button { width: 100%; }
    
    .btn { padding: 9px 14px; font-size: 13px; min-height: 40px; }
    input, select, textarea { padding: 12px 14px; font-size: 16px; min-height: 44px; }
    
    .login-card { padding: 28px 20px; border-radius: 14px; }
    .logo-login h1 { font-size: 22px; }
    
    .ticket-box { width: 100%; max-width: 76mm; margin: 0 auto; }
    
    .label-preview-card { width: 100% !important; max-width: 280px; }
    
    .side-profile { padding: 18px 16px; }
    .nav { padding: 12px 8px; }
    .nav button { padding: 13px 12px; font-size: 14px; }
    
    .refurb-item-card { padding: 12px; }
    
    .toast { left: 12px; right: 12px; bottom: 12px; text-align: center; }
}

/* ============================================================
   RESPONSIVE — MÓVIL PEQUEÑO (max 380px)
   ============================================================ */
@media (max-width: 380px) {
    .kpi-row { grid-template-columns: 1fr 1fr; }
    .kpi-box strong { font-size: 18px; }
    .prov-detail-header .stats { grid-template-columns: 1fr 1fr; }
    .top-title { font-size: 12px; }
}

/* ============================================================
   AJUSTES TÁCTILES Y SAFE AREAS iOS
   ============================================================ */
@supports (padding: max(0px)) {
    @media (max-width: 1024px) {
        .top-bar { padding-left: max(12px, env(safe-area-inset-left)); padding-right: max(12px, env(safe-area-inset-right)); }
        .content { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
        .toast { bottom: max(12px, env(safe-area-inset-bottom)); }
    }
}

button, a, .btn, .nav button, .prov-card, .lote-card {
    -webkit-tap-highlight-color: transparent;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

/* ============================================================
   TABS / PESTAÑAS
   ============================================================ */
.tabs-bar { display: flex; gap: 2px; background: #e2e8f0; border-radius: 10px; padding: 4px; margin-bottom: 16px; }
.tab-btn { flex: 1; background: transparent; border: 0; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
.tab-btn:hover { background: rgba(255,255,255,0.5); color: var(--text-dark); }
.tab-btn.active { background: #fff; color: var(--blue-btn); box-shadow: 0 2px 4px rgba(0,0,0,0.06); }

/* ========== SMART SELECT (buscador inteligente) ========== */
.smart-select { position: relative; width: 100%; }
.smart-select-input { width: 100%; padding: 10px 36px 10px 36px; border: 1px solid var(--border-color); border-radius: 8px; background: #fff; font-size: 14px; cursor: text; transition: border 0.2s; box-sizing: border-box; }
.smart-select-input:focus { outline: none; border-color: var(--blue-btn); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.smart-select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 16px; }
.smart-select-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: #f1f5f9; border: 0; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.15s; }
.smart-select-clear:hover { background: #fee2e2; color: #991b1b; }
.smart-select-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.12); max-height: 280px; overflow-y: auto; z-index: 1000; display: none; }
.smart-select.open .smart-select-dropdown { display: block; }
.smart-select-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 13px; transition: background 0.1s; }
.smart-select-item:last-child { border-bottom: 0; }
.smart-select-item:hover, .smart-select-item.highlighted { background: #eff6ff; }
.smart-select-item.selected { background: #dbeafe; font-weight: 600; }
.smart-select-item-title { font-weight: 600; color: var(--text-dark); margin-bottom: 2px; }
.smart-select-item-sub { font-size: 11px; color: var(--text-muted); }
.smart-select-item-meta { display: inline-block; background: #f1f5f9; color: #64748b; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 4px; }
.smart-select-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
.smart-select-empty button { margin-top: 8px; padding: 6px 12px; background: var(--blue-btn); color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 12px; }
mark.ss-hl { background: #fef08a; color: inherit; padding: 0 1px; border-radius: 2px; }

/* ========== TABS SCROLL HORIZONTAL (móvil) ========== */
.reacond-tabs-scroll { scrollbar-width: thin; }
.reacond-tabs-scroll::-webkit-scrollbar { height: 3px; }
.reacond-tabs-scroll::-webkit-scrollbar-track { background: transparent; }
.reacond-tabs-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
.reacond-tabs-scroll .tab-btn { flex-shrink: 0; white-space: nowrap; }

/* ========== PESTAÑAS REACOND - ACTIVA CON FONDO AZUL ========== */
.reacond-tabs-scroll .tab-btn { 
    background: #f1f5f9 !important; 
    color: #64748b !important; 
    border: 2px solid transparent !important; 
    border-radius: 10px !important; 
    margin-right: 4px; 
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.reacond-tabs-scroll .tab-btn:hover { 
    background: #e2e8f0 !important; 
    transform: translateY(-1px);
}
.reacond-tabs-scroll .tab-btn.active { 
    background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%) !important; 
    color: #fff !important; 
    border-color: #1e3a8a !important; 
    box-shadow: 0 4px 0 #1e3a8a, 0 5px 12px rgba(37, 99, 235, 0.4) !important;
    transform: translateY(0);
}
.reacond-tabs-scroll .tab-btn.active span { 
    background: #fff !important; 
    color: #1e40af !important; 
    font-weight: 800 !important;
}

/* ========== ICONOS FLOTANTES CON SOMBRA ========== */
.ti { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15)); }
/* Iconos medianos en botones y pestañas */
.btn .ti, .tab-btn .ti, .reacond-main-tab .ti, .cfg-main-tab .ti, .eval-tab .ti, .modal-back-btn .ti { font-size: 15px !important; vertical-align: middle; }
.btn { line-height: 1.2; }
.btn-blue .ti, .btn-dark .ti, button[style*="background:linear-gradient"] .ti { 
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); 
}

/* ========== MODAL HEADER CON BOTONES VOLVER + X ========== */
.modal-back-btn { 
    background: rgba(255,255,255,0.2); 
    border: 1.5px solid rgba(255,255,255,0.35); 
    color: #fff; 
    padding: 6px 12px; 
    border-radius: 20px; 
    cursor: pointer; 
    font-size: 12px; 
    font-weight: 700; 
    display: inline-flex; 
    align-items: center; 
    gap: 4px; 
    transition: all 0.15s; 
    margin-right: 8px;
}
.modal-back-btn:hover { background: rgba(255,255,255,0.35); }
.modal-back-btn:active { transform: scale(0.95); }
.modal-header-left { display: flex; align-items: center; flex: 1; gap: 8px; }

/* ========== BOTONES DE ORIENTACIÓN (2x1 / 1x2) ========== */
.btn-orientacion:hover { transform: translateY(-2px); box-shadow: 0 5px 0 #cbd5e1, 0 6px 12px rgba(0,0,0,0.08) !important; }
.btn-orientacion:active { transform: translateY(0); box-shadow: 0 1px 0 #cbd5e1, 0 2px 4px rgba(0,0,0,0.05) !important; }
.btn-orientacion.activo { background: linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%) !important; border-color: #1e40af !important; box-shadow: 0 4px 0 #1e3a8a, 0 5px 12px rgba(30, 64, 175, 0.3) !important; }
.btn-orientacion.activo b { color: #1e3a8a !important; }

/* ========== ANIMACIÓN ITEMS NUEVOS ========== */
@keyframes itemFadeIn { 
    from { opacity: 0; transform: translateY(-8px); background: #dbeafe; } 
    to { opacity: 1; transform: translateY(0); } 
}
.item-nuevo { animation: itemFadeIn 0.6s ease-out; }
@keyframes flashHighlight {
    0% { background: #dbeafe; box-shadow: 0 0 0 3px rgba(37,99,235,0.4); }
    100% { background: inherit; box-shadow: none; }
}
.item-flash { animation: flashHighlight 1.5s ease-out; }

/* ========== STEPPER VISUAL ESTILO AMAZON ========== */
.stepper { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; padding: 12px 4px; position: relative; }
.stepper-line { position: absolute; top: 30px; left: 30px; right: 30px; height: 3px; background: #e2e8f0; z-index: 0; border-radius: 2px; }
.stepper-line-fill { position: absolute; top: 30px; left: 30px; height: 3px; background: linear-gradient(90deg, #10b981, #16a34a); z-index: 0; border-radius: 2px; transition: width 0.4s ease; }
.stepper-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; gap: 6px; cursor: pointer; padding: 4px; transition: transform 0.15s; }
.stepper-step:active { transform: scale(0.96); }
.stepper-circle { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; border: 3px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #94a3b8; transition: all 0.25s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
.stepper-step.completado .stepper-circle { background: linear-gradient(135deg, #10b981, #059669); border-color: #047857; color: #fff; box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35); }
.stepper-step.actual .stepper-circle { background: linear-gradient(135deg, #3b82f6, #1e40af); border-color: #1e3a8a; color: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(59, 130, 246, 0.4); animation: pulseActual 2s ease-in-out infinite; }
.stepper-step.pendiente .stepper-circle { background: #fff; border-color: #cbd5e1; color: #94a3b8; }
.stepper-label { font-size: 10px; font-weight: 700; text-align: center; line-height: 1.2; color: #64748b; max-width: 70px; }
.stepper-step.completado .stepper-label { color: #047857; }
.stepper-step.actual .stepper-label { color: #1e40af; }
@keyframes pulseActual { 0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(59, 130, 246, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1), 0 4px 16px rgba(59, 130, 246, 0.5); } }
.stepper-step.bloqueado { opacity: 0.4; cursor: not-allowed; }
.stepper-step.bloqueado:active { transform: none; }

/* ========== PIEZAS CON ESTADOS DUALES ========== */
.pieza-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 8px; transition: all 0.2s; }
.pieza-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.06); }
.pieza-status-row { display: flex; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
.pieza-status-col { flex: 1; padding: 8px; border-radius: 8px; text-align: center; font-size: 11px; transition: all 0.2s; }
.pieza-status-col.ok { background: #d1fae5; color: #065f46; }
.pieza-status-col.pendiente { background: #fee2e2; color: #991b1b; }
.pieza-status-col.esperando { background: #fef3c7; color: #92400e; }
.pieza-action-btn { background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); border: 1px solid #cbd5e1; border-radius: 7px; padding: 7px 10px; font-size: 11px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 5px; box-shadow: 0 2px 0 #cbd5e1; transition: all 0.15s; }
.pieza-action-btn:hover { background: #f1f5f9; transform: translateY(-1px); }
.pieza-action-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 #cbd5e1; }
.pieza-action-btn.entregar { background: linear-gradient(180deg, #3b82f6, #1e40af); color: #fff; border-color: #1e3a8a; box-shadow: 0 3px 0 #1e3a8a; }
.pieza-action-btn.recibir { background: linear-gradient(180deg, #10b981, #059669); color: #fff; border-color: #047857; box-shadow: 0 3px 0 #047857; }
.pieza-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ========== CHECKBOXES NORMALIZADOS (fix móvil) ========== */
input[type="checkbox"]:not(.no-norm) { -webkit-appearance: none; appearance: none; width: 20px !important; height: 20px !important; border: 2px solid #cbd5e1; border-radius: 5px; background: #fff; cursor: pointer; position: relative; flex-shrink: 0; vertical-align: middle; margin: 0; transition: all 0.15s; }
input[type="checkbox"]:not(.no-norm):checked { background: var(--blue-btn); border-color: var(--blue-btn); }
input[type="checkbox"]:not(.no-norm):checked::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 14px; font-weight: bold; line-height: 1; }
input[type="checkbox"]:not(.no-norm):hover { border-color: var(--blue-btn); }
.tab-content { display: none; }
.tab-content.active { display: block; }

@media (max-width: 768px) {
    .tab-btn { padding: 10px 8px; font-size: 12px; }
    .tab-btn span { display: none; }
    /* Pestañas Reacond en móvil: más compactas, scroll horizontal */
    .reacond-tabs-scroll .tab-btn { padding: 10px 10px !important; font-size: 12px !important; }
    .reacond-tabs-scroll .tab-btn span { display: inline !important; padding: 1px 5px !important; font-size: 10px !important; }
}

/* ============================================================
   DROPDOWN CON BOTÓN CREAR RÁPIDO
   ============================================================ */
.input-with-action { display: flex; gap: 6px; align-items: stretch; }
.input-with-action select, .input-with-action input { flex: 1; }
.input-with-action .quick-add-btn { background: var(--blue-btn); color: #fff; border: 0; border-radius: 8px; padding: 0 14px; cursor: pointer; font-size: 18px; font-weight: 800; flex-shrink: 0; min-width: 44px; }
.input-with-action .quick-add-btn:hover { background: #0044aa; }
</style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/10.8.6/jsrsasign-all-min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</head>
<body>

<div id="login" class="login">
    <div class="login-card">
        <div class="logo-login">
            <div style="font-size:32px; color:#0056b3;"><i class="ti ti-device-mobile-cog"></i></div>
            <div><h1>BAYOL <span>CELL</span></h1><small style="color:var(--text-muted); font-weight:700; font-size:10px; display:block; text-align:left;">SISTEMA MAESTRO ERP</small></div>
        </div>
        <div id="loginErr" class="err"></div>
        <div class="form-row">
            <label>Usuario Operador</label>
            <input id="loginUser" placeholder="admin">
        </div>
        <div class="form-row">
            <label>Contraseña Corporativa</label>
            <input id="loginPass" type="password" placeholder="••••" onkeydown="if(event.key==='Enter')doLogin()">
        </div>
        <button class="btn btn-blue" style="width:100%" onclick="doLogin()"><i class="ti ti-login"></i> Autenticar Operador</button>
    </div>
</div>

<div id="app" class="app">
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
    <aside class="sidebar" id="sidebar">
        <!-- Logo estilo NEXUS -->
        <div class="side-brand">
            <div class="brand-icon"><i class="ti ti-device-mobile"></i></div>
            <div class="brand-text">
                <h3>BAYOL CELL</h3>
                <small>V5 · TALLER RD</small>
            </div>
        </div>
        
        <div class="nav">
            <div class="nav-section">PRINCIPAL</div>
            <button class="active" id="menu-dashboard" onclick="nav('dashboard',this)"><i class="ti ti-layout-dashboard"></i> <span>Dashboard</span></button>
            <button id="menu-miTrabajo" onclick="nav('miTrabajo',this)"><i class="ti ti-briefcase"></i> <span>Mi Trabajo</span></button>
            <button id="menu-atencion" onclick="nav('atencion',this)"><i class="ti ti-headset"></i> <span>Atención al Cliente</span></button>
            <button id="menu-recepcion" onclick="nav('recepcion',this)"><i class="ti ti-clipboard-plus"></i> <span>Recepción de Equipos</span></button>
            <button id="menu-ordenes" onclick="nav('ordenes',this)"><i class="ti ti-tool"></i> <span>Órdenes de Trabajo</span></button>
            
            <div class="nav-section">INVENTARIO</div>
            <button id="menu-inventario" onclick="nav('inventario',this)"><i class="ti ti-package"></i> <span>Inventario Taller</span></button>
            <button id="menu-piezasSolicitadas" onclick="nav('piezasSolicitadas',this)"><i class="ti ti-packages"></i> <span>Piezas Solicitadas</span></button>
            <button id="menu-articulos" onclick="nav('articulos',this)"><i class="ti ti-database"></i> <span>Catálogo de Artículos</span></button>
            <button id="menu-proveedores" onclick="nav('proveedores',this)"><i class="ti ti-shopping-cart"></i> <span>Compras</span></button>
            <button id="menu-refurb" onclick="nav('refurb',this)"><i class="ti ti-refresh"></i> <span>Reacondicionados</span></button>
            
            <div class="nav-section">SISTEMA</div>
            <button id="menu-etiquetas" onclick="nav('etiquetas',this)"><i class="ti ti-barcode"></i> <span>Impresión de Labels</span></button>
            <button id="menu-configImpresora" onclick="nav('configImpresora',this)"><i class="ti ti-printer"></i> <span>Config. Impresora</span></button>
            <button id="menu-reportes" onclick="nav('reportes',this)"><i class="ti ti-chart-bar"></i> <span>Reportes</span></button>
            <button id="menu-configuracion" onclick="nav('configuracion',this)"><i class="ti ti-adjustments"></i> <span>Configuración</span> <span class="nav-badge-admin">ADMIN</span></button>
        </div>
        
        <!-- Tarjeta de usuario estilo NEXUS -->
        <div class="side-user">
            <div class="avatar" id="userAvatar">B</div>
            <div class="profile-info">
                <h4 id="userName">Cargando...</h4>
                <small><i class="ti ti-circle-filled" style="font-size:7px; color:#16a34a;"></i> En Línea</small>
            </div>
        </div>
    </aside>

    <main class="main">
        <header class="top-bar">
            <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Menú"><i class="ti ti-menu-2"></i></button>
            <div class="top-title" id="pageTitle">Dashboard</div>
            <div class="top-right-info"><i class="ti ti-user-shield"></i> Rol: <span id="userRole" style="text-transform:uppercase;">Técnico</span></div>
            <button class="btn btn-light" id="btnNotif" style="padding:4px 10px; font-size:11px; background:rgba(255,255,255,0.1); border:0; color:#fff;" onclick="toggleNotificaciones()" title="Activar/desactivar notificaciones con sonido"><i class="ti ti-bell"></i></button>
            <button class="btn btn-light" style="padding:4px 10px; font-size:11px; background:rgba(255,255,255,0.1); border:0; color:#fff;" onclick="abrirModalCambiarClave(false)" title="Cambiar mi contraseña"><i class="ti ti-key"></i></button>
            <button class="btn btn-light" style="padding:4px 10px; font-size:11px; background:rgba(255,255,255,0.1); border:0; color:#fff;" onclick="logout()">Salir</button>
        </header>
        
        <section class="content">
            <!-- ATENCIÓN AL CLIENTE (servicio) -->
            <div id="v-atencion" class="view">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
                    <h2 style="margin:0;"><i class="ti ti-headset" style="color:#0891b2;"></i> Atención al Cliente</h2>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-blue" onclick="nav('recepcion')" style="font-size:12px;"><i class="ti ti-plus"></i> Recibir equipo</button>
                        <button class="btn btn-light" onclick="renderAtencionCliente()" style="font-size:12px;"><i class="ti ti-refresh"></i> Actualizar</button>
                    </div>
                </div>
                <div id="atencionKpis" class="kpi-row" style="margin-bottom:16px;"></div>
                <div id="atencionContenido"></div>
            </div>

            <!-- MI TRABAJO (técnico) -->
            <div id="v-miTrabajo" class="view">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
                    <h2 style="margin:0;"><i class="ti ti-briefcase" style="color:#0891b2;"></i> Mi Trabajo</h2>
                    <button class="btn btn-light" onclick="renderMiTrabajo()" style="font-size:12px;"><i class="ti ti-refresh"></i> Actualizar</button>
                </div>
                <div id="miTrabajoResumen" class="kpi-row" style="margin-bottom:14px;"></div>
                <div id="miTrabajoContenido"></div>
            </div>

            <!-- DASHBOARD -->
            <div id="v-dashboard" class="view active">
                <div class="kpi-row">
                    <div class="kpi-box clickable" style="border-top-color:#3b82f6;" onclick="nav('ordenes')"><small>Recibidos Hoy</small><strong id="kHoy">0</strong><i class="ti ti-download"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#f59e0b;" onclick="nav('ordenes')"><small>En Diagnóstico</small><strong id="kDiag">0</strong><i class="ti ti-search"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#10b981;" onclick="nav('ordenes')"><small>En Reparación</small><strong id="kRep">0</strong><i class="ti ti-settings"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#ef4444;" onclick="nav('inventario')"><small>Espera Pieza</small><strong id="kPiezas">0</strong><i class="ti ti-hourglass"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#8b5cf6;" onclick="nav('ordenes')"><small>Listos Entrega</small><strong id="kListos">0</strong><i class="ti ti-circle-check"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#06b6d4;" onclick="nav('refurb')"><small>Reacondicionados</small><strong id="kRefurb">0</strong><i class="ti ti-refresh"></i></div>
                </div>
                
                <!-- KPIs de Reacondicionado -->
                <h3 style="margin:15px 0 10px; font-size:14px; color:#06b6d4; text-transform:uppercase; display:flex; align-items:center; gap:8px;"><i class="ti ti-recycle"></i> Reacondicionados</h3>
                <div class="kpi-row">
                    <div class="kpi-box clickable" style="border-top-color:#f59e0b;" onclick="nav('refurb')"><small>🟡 Pendientes</small><strong id="kdPend">0</strong><i class="ti ti-clock"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#3b82f6;" onclick="nav('refurb')"><small>⚠️ Evaluación</small><strong id="kdEval">0</strong><i class="ti ti-clipboard-list"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#9a3412;" onclick="nav('refurb')"><small>🔧 En Proceso</small><strong id="kdProc">0</strong><i class="ti ti-tool"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#5b21b6;" onclick="nav('refurb')"><small>🛒 Listo Venta</small><strong id="kdListoV">0</strong><i class="ti ti-shopping-cart"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#10b981;" onclick="nav('refurb')"><small>✅ Despachados</small><strong id="kdDesp">0</strong><i class="ti ti-truck-delivery"></i></div>
                    <div class="kpi-box clickable" style="border-top-color:#dc2626;" onclick="nav('refurb')"><small>🔄 Devoluciones</small><strong id="kdDev">0</strong><i class="ti ti-rotate-2"></i></div>
                </div>
                
                <!-- Panel Inteligente (alertas + tendencias) -->
                <div id="dashboardSmart" style="margin-top:15px;"></div>
                
                <!-- Alertas de equipos demorados -->
                <div id="dashboardDemoras" style="margin-top:15px;"></div>
                
                <!-- Buscador global por IMEI -->
                <div class="card" style="margin-top:15px;">
                    <h3 style="margin:0 0 12px; font-size:15px;"><i class="ti ti-search" style="color:var(--blue-btn);"></i> Buscar equipo por IMEI / Modelo</h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <input type="text" id="buscadorGlobalImei" placeholder="🔍 Escribe IMEI, modelo o marca..." oninput="buscarEquipoGlobal()" style="flex:1; min-width:200px; padding:12px; font-size:14px;">
                    </div>
                    <div id="resultadoBusquedaGlobal" style="margin-top:12px;"></div>
                </div>
                
                <div class="layout-dashboard">
                    <div class="card">
                        <h3 style="margin:0 0 15px 0; font-size:15px; font-weight:700;">Monitoreo de Órdenes Recientes</h3>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>Orden</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Estado</th></tr>
                                </thead>
                                <tbody id="recentOrders"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card">
                        <h3 style="margin:0 0 15px 0; font-size:15px; font-weight:700;">Acciones del Sistema</h3>
                        <button id="accion-recepcion" class="btn btn-blue" style="width:100%; margin-bottom:10px;" onclick="nav('recepcion')"><i class="ti ti-plus"></i> Nueva Recepción</button>
                        <button id="accion-compras" class="btn btn-light" style="width:100%; margin-bottom:10px;" onclick="nav('proveedores')"><i class="ti ti-shopping-cart"></i> Compras</button>
                        <button id="accion-articulos" class="btn btn-light" style="width:100%; margin-bottom:10px;" onclick="nav('articulos')"><i class="ti ti-database"></i> Catálogo</button>
                        <button id="accion-refurb" class="btn btn-light" style="width:100%;" onclick="nav('refurb')"><i class="ti ti-refresh"></i> Módulo Reacondicionados</button>
                    </div>
                </div>
                
                <!-- PRODUCTIVIDAD POR EMPLEADO (servicio al cliente) -->
                <div class="card" id="cardProductividad" style="margin-top:15px;">
                    <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:700;"><i class="ti ti-users" style="color:#0891b2;"></i> Clientes atendidos por empleado</h3>
                    <div id="productividadEmpleados" style="font-size:13px;"></div>
                </div>

                <!-- TABLERO DE TALLER: órdenes de cliente (Fase 2) -->
                <div class="card" id="cardTallerOrdenes" style="margin-top:15px;">
                    <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:700;"><i class="ti ti-tool" style="color:#9a3412;"></i> Taller · Órdenes de reparación</h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                        <button class="btn btn-light" id="fltOrdTodas" onclick="setFiltroTaller('todas')" style="font-size:12px;">Todas</button>
                        <button class="btn btn-light" id="fltOrdLibres" onclick="setFiltroTaller('libres')" style="font-size:12px;">📥 Sin tomar</button>
                        <button class="btn btn-light" id="fltOrdMias" onclick="setFiltroTaller('mias')" style="font-size:12px;">🔧 Mis órdenes</button>
                        <button class="btn btn-light" id="fltOrdReasignadas" onclick="setFiltroTaller('reasignadas')" style="font-size:12px;">🔄 Reasignadas a mí</button>
                        <button class="btn btn-light" id="fltOrdActivas" onclick="setFiltroTaller('activas')" style="font-size:12px;">⚙️ Activas</button>
                        <button class="btn btn-light" id="fltOrdEntregadas" onclick="setFiltroTaller('entregadas')" style="font-size:12px;">📦 Entregadas</button>
                    </div>
                    <div style="margin-bottom:12px;">
                        <input id="buscadorTaller" oninput="renderTallerOrdenes()" placeholder="🔍 Buscar por número de orden o cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
                    </div>
                    <div id="tallerOrdenesLista" style="font-size:13px;"></div>
                </div>
            </div>

            <!-- RECEPCION -->
            <div id="v-recepcion" class="view">
                <div class="block-grid">
                    <div class="block-card">
                        <div class="block-header header-blue-dark">Datos del Cliente y Equipo</div>
                        <div class="block-body">
                            <div><label>Nombre Cliente *</label><input id="c_nombre" placeholder="Ej. Juan Pérez"></div>
                            <div><label>WhatsApp *</label><input id="c_whatsapp" placeholder="809-123-4567"></div>
                            <div><label>Cédula</label><input id="c_cedula" placeholder="001-0000000-0"></div>
                            <div><label>Marca *</label><input id="e_marca" placeholder="Apple, Samsung, etc."></div>
                            <div><label>Modelo Exacto *</label><input id="e_modelo" placeholder="iPhone 13 Pro Max"></div>
                            <div><label>Capacidad (GB) *</label><input id="e_capacidad" placeholder="128GB"></div>
                            <div><label>IMEI / Serial *</label><input id="e_imei" placeholder="356789..."></div>
                            <div><label>Estado Físico del Equipo (cómo llega)</label><textarea id="o_estado_fisico" rows="2" placeholder="Rayones en la tapa, esquina golpeada, sin marcas..."></textarea></div>
                        </div>
                    </div>

                    <div class="block-card">
                        <div class="block-header header-blue-light">Fallas del Equipo (problemas a reparar)</div>
                        <div class="block-body">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
                                <div style="font-size:12px; color:var(--text-muted);">Marca los problemas que reporta el cliente. Se crearán como tareas para los técnicos.</div>
                                <button id="btnEditarFallasComunes" onclick="abrirEditorFallasComunes()" class="btn btn-light" style="font-size:11px; padding:4px 9px; display:none;"><i class="ti ti-settings"></i> Editar</button>
                            </div>
                            <div class="checks-layout" id="checksFisico">
                                <label><input type="checkbox" value="Pantalla rota"> Pantalla rota</label>
                                <label><input type="checkbox" value="Mojado"> Mojado</label>
                                <label><input type="checkbox" value="Tapa rota"> Tapa rota</label>
                                <label><input type="checkbox" value="No enciende"> No enciende</label>
                                <label><input type="checkbox" value="Sin señal"> Sin señal</label>
                                <label><input type="checkbox" value="Batería mala"> Batería mala</label>
                                <label><input type="checkbox" value="Cámara rota"> Cámara rota</label>
                                <label><input type="checkbox" value="Puerto malo"> Puerto malo</label>
                            </div>
                            <div style="margin-top:8px;"><label>Falla del Equipo (otros problemas)</label><textarea id="o_falla" rows="2" placeholder="No enciende / Pantalla rota"></textarea></div>
                            <div style="margin-top:5px;"><label>Accesorios que deja</label><input id="o_accesorios" placeholder="Cover, Cable, Nada"></div>
                        </div>
                    </div>

                    <div class="block-card">
                        <div class="block-header header-blue-sec">Seguridad del Dispositivo</div>
                        <div class="block-body">
                            <div class="access-note">Las claves quedan ocultas por defecto. Solo se muestran cuando se pulsa el botón Mostrar.</div>
                            <div><label>Tipo de Bloqueo</label><select id="o_acceso" onchange="togglePatternPanel()"><option>PIN</option><option>Patrón</option><option>Password</option><option>Sin Clave</option></select></div>
                            <div>
                                <label>PIN / Patrón / Contraseña del Equipo</label>
                                <div class="password-field"><input id="o_clave" type="password" autocomplete="off" placeholder="Clave del dispositivo"><button type="button" class="btn btn-light" onclick="togglePasswordField('o_clave', this)"><i class="ti ti-eye"></i> Mostrar</button></div>
                            </div>
                            <div id="patternPanel" class="pattern-panel">
                                <label>Simulación del patrón de desbloqueo</label>
                                <input id="o_patron_secuencia" type="hidden">
                                <div class="pattern-grid" id="patternGrid">
                                    <button type="button" class="pattern-dot" data-dot="1" onclick="selectPatternDot(1)">1</button>
                                    <button type="button" class="pattern-dot" data-dot="2" onclick="selectPatternDot(2)">2</button>
                                    <button type="button" class="pattern-dot" data-dot="3" onclick="selectPatternDot(3)">3</button>
                                    <button type="button" class="pattern-dot" data-dot="4" onclick="selectPatternDot(4)">4</button>
                                    <button type="button" class="pattern-dot" data-dot="5" onclick="selectPatternDot(5)">5</button>
                                    <button type="button" class="pattern-dot" data-dot="6" onclick="selectPatternDot(6)">6</button>
                                    <button type="button" class="pattern-dot" data-dot="7" onclick="selectPatternDot(7)">7</button>
                                    <button type="button" class="pattern-dot" data-dot="8" onclick="selectPatternDot(8)">8</button>
                                    <button type="button" class="pattern-dot" data-dot="9" onclick="selectPatternDot(9)">9</button>
                                </div>
                                <div class="pattern-summary" id="patternSummary">Sin patrón marcado</div>
                                <div class="pattern-actions">
                                    <button type="button" class="btn btn-light" onclick="undoPatternDot()">Deshacer</button>
                                    <button type="button" class="btn btn-light" onclick="clearPattern()">Limpiar patrón</button>
                                </div>
                            </div>
                            <div><label>Apple ID / Correo</label><input id="o_apple_id" type="email" autocomplete="off" placeholder="usuario@icloud.com"></div>
                            <div>
                                <label>Contraseña Apple ID</label>
                                <div class="password-field"><input id="o_apple_password" type="password" autocomplete="off" placeholder="Opcional"><button type="button" class="btn btn-light" onclick="togglePasswordField('o_apple_password', this)"><i class="ti ti-eye"></i> Mostrar</button></div>
                            </div>
                            <div><label>Cuenta Google / Gmail</label><input id="o_google_account" type="email" autocomplete="off" placeholder="usuario@gmail.com"></div>
                            <div>
                                <label>Contraseña Google</label>
                                <div class="password-field"><input id="o_google_password" type="password" autocomplete="off" placeholder="Opcional"><button type="button" class="btn btn-light" onclick="togglePasswordField('o_google_password', this)"><i class="ti ti-eye"></i> Mostrar</button></div>
                            </div>
                            <div><label>Cuenta Samsung</label><input id="o_samsung_account" autocomplete="off" placeholder="correo o usuario Samsung"></div>
                            <div>
                                <label>Contraseña Samsung</label>
                                <div class="password-field"><input id="o_samsung_password" type="password" autocomplete="off" placeholder="Opcional"><button type="button" class="btn btn-light" onclick="togglePasswordField('o_samsung_password', this)"><i class="ti ti-eye"></i> Mostrar</button></div>
                            </div>
                            <div style="margin-top:15px;">
                                <button class="btn btn-dark" style="width:100%; margin-bottom:10px;" onclick="guardarRecepcion(false)"><i class="ti ti-device-floppy"></i> Guardar Base Datos</button>
                                <button class="btn btn-blue" style="width:100%" onclick="guardarRecepcion(true)"><i class="ti ti-printer"></i> Registrar + Ticket</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recepciones realizadas (ver y editar) -->
                <div class="card" style="margin-top:16px;">
                    <h3 style="font-size:16px; margin:0 0 10px;"><i class="ti ti-history" style="color:#0891b2;"></i> Recepciones Realizadas</h3>
                    <input id="recepBuscador" oninput="renderRecepcionesRealizadas()" placeholder="🔍 Buscar por número o cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; align-items:center;">
                        <span style="font-size:11px; font-weight:700; color:var(--text-muted);"><i class="ti ti-calendar"></i> Fecha:</span>
                        <button class="btn btn-light" onclick="_recepFechaFiltro=0; renderRecepcionesRealizadas()" style="font-size:11px; padding:4px 9px;">Todas</button>
                        <button class="btn btn-light" onclick="_recepFechaFiltro=1; renderRecepcionesRealizadas()" style="font-size:11px; padding:4px 9px;">Hoy</button>
                        <button class="btn btn-light" onclick="_recepFechaFiltro=7; renderRecepcionesRealizadas()" style="font-size:11px; padding:4px 9px;">7 días</button>
                        <button class="btn btn-light" onclick="_recepFechaFiltro=30; renderRecepcionesRealizadas()" style="font-size:11px; padding:4px 9px;">30 días</button>
                    </div>
                    <div id="recepcionesLista"></div>
                </div>
            </div>

            <!-- ORDENES -->
            <div id="v-ordenes" class="view">
                <div class="card">
                    <h3>Órdenes de Trabajo Activas</h3>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Orden</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Acceso Privado</th><th>Atendido por</th><th>Estado</th><th>Acciones</th></tr>
                            </thead>
                            <tbody id="ordersTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- INVENTARIO -->
            <div id="v-inventario" class="view">
                <div class="layout-inventario">
                    <div class="card">
                        <h3 style="margin:0 0 15px 0;"><i class="ti ti-box-seam" style="color:var(--blue-btn);"></i> 1. Refacciones y Componentes (Inventario Normal)</h3>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>Código SKU</th><th>Pieza / Componente</th><th>Stock</th><th>Costo Unidad</th></tr>
                                </thead>
                                <tbody id="partsTable"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card" id="assetsAdminCard" style="border-top: 4px solid #f59e0b;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin:0;"><i class="ti ti-tools" style="color:#f59e0b;"></i> 2. Control de Activos Fijos y Herramientas</h3>
                            <button class="btn btn-light" style="padding: 6px 12px; font-size: 12px;" onclick="toggleFormActivo()"><i class="ti ti-plus"></i> Registrar Nueva Herramienta</button>
                        </div>

                        <div id="formAssetContainer" style="display: none;">
                            <div class="form-inline-asset">
                                <div><label>Código Activo</label><input id="ast_codigo" value="AUTOMÁTICO" disabled></div>
                                <div><label>Herramienta / Equipo</label><input id="ast_nombre" placeholder="Ej. Estación JBC"></div>
                                <div><label>Cantidad</label><input id="ast_cantidad" type="number" value="1"></div>
                                <div><label>Estado Técnico</label><select id="ast_estado"><option>Excelente</option><option>Desgaste Medio</option><option>Mantenimiento</option></select></div>
                                <div><label>Técnicos / Destinos</label><input id="ast_asignado" placeholder="Ej. Carlos, Luis, Mesa 3"></div>
                                <button class="btn btn-blue" onclick="guardarActivoTaller()"><i class="ti ti-device-floppy"></i> Guardar</button>
                            </div>
                        </div>

                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>Código</th><th>Herramienta</th><th>Cantidad</th><th>Estado</th><th>Asignado</th></tr>
                                </thead>
                                <tbody id="assetsTable">
                                    <tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PIEZAS SOLICITADAS (panel central) -->
            <div id="v-piezasSolicitadas" class="view">
                <h2 style="margin:0 0 14px;"><i class="ti ti-packages" style="color:#0891b2;"></i> Piezas Solicitadas</h2>
                <div class="card">
                    <input id="psBuscador" oninput="renderPiezasSolicitadas()" placeholder="🔍 Buscar pieza, técnico, orden o equipo..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
                        <button class="btn btn-light" onclick="_psFiltro='todas'; renderPiezasSolicitadas()" style="font-size:12px;">Todas</button>
                        <button class="btn btn-light" onclick="_psFiltro='pendientes'; renderPiezasSolicitadas()" style="font-size:12px;">🟡 Pendientes</button>
                        <button class="btn btn-light" onclick="_psFiltro='entregadas'; renderPiezasSolicitadas()" style="font-size:12px;">📦 Entregadas</button>
                    </div>
                    <div id="piezasSolicitadasLista"></div>
                </div>
            </div>

            <!-- ETIQUETAS -->
            <div id="v-etiquetas" class="view">
                <div class="layout-dashboard">
                    <div class="card">
                        <h3>Generador de Etiquetas Adhesivas Regulable</h3>
                        <p style="color:var(--text-muted); font-size:13px;">Modifica los campos del dispositivo y ajusta las dimensiones milimétricas para calibrar tu impresora térmica.</p>
                        
                        <div class="form-row"><label>Marca del Dispositivo</label><input id="lbl_marca" value="Apple" oninput="actualizarLabelLive()"></div>
                        <div class="form-row"><label>Modelo, Color y Capacidad</label><input id="lbl_modelo" value="iPhone 11 Pro 64GB Silver" oninput="actualizarLabelLive()"></div>
                        <input id="lbl_gb" type="hidden" value="">
                        <div class="form-row"><label>Número IMEI / Serial</label><input id="lbl_imei" value="356789123456789" oninput="actualizarLabelLive()"></div>
                        <div class="form-row"><label>Texto de Estado / Pie de Impresión</label><input id="lbl_estado_texto" value="" placeholder="Ej. CLASE A / AVISO BAT / AVISO PANT" oninput="actualizarLabelLive()"></div>
                        
                        <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                        
                        <h4 style="margin:0 0 10px; font-size:12px; color:var(--blue-btn); text-transform:uppercase;"><i class="ti ti-photo"></i> Orientación del Papel</h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                            <button class="btn-orientacion" data-orient="2x1" onclick="aplicarOrientacionConfig('2x1')" style="background:linear-gradient(180deg, #fff 0%, #f1f5f9 100%); border:2px solid #e2e8f0; border-radius:12px; padding:14px; cursor:pointer; text-align:center; box-shadow:0 3px 0 #cbd5e1, 0 4px 8px rgba(0,0,0,0.05); transition:all 0.15s;">
                                <div style="width:60px; height:30px; background:#dbeafe; border:2px solid #1e40af; margin:0 auto 8px; border-radius:3px;"></div>
                                <b style="font-size:13px; display:block; color:#0f172a;">2 × 1"</b>
                                <small style="color:#64748b; font-size:10px;">Horizontal · 51×25mm</small>
                            </button>
                            <button class="btn-orientacion" data-orient="1x2" onclick="aplicarOrientacionConfig('1x2')" style="background:linear-gradient(180deg, #fff 0%, #f1f5f9 100%); border:2px solid #e2e8f0; border-radius:12px; padding:14px; cursor:pointer; text-align:center; box-shadow:0 3px 0 #cbd5e1, 0 4px 8px rgba(0,0,0,0.05); transition:all 0.15s;">
                                <div style="width:30px; height:60px; background:#dbeafe; border:2px solid #1e40af; margin:0 auto 8px; border-radius:3px;"></div>
                                <b style="font-size:13px; display:block; color:#0f172a;">1 × 2"</b>
                                <small style="color:#64748b; font-size:10px;">Vertical · 25×51mm</small>
                            </button>
                        </div>
                        
                        <h4 style="margin:15px 0 10px; font-size:12px; color:var(--blue-btn); text-transform:uppercase;"><i class="ti ti-adjustments-horizontal"></i> Ajuste fino (opcional)</h4>
                        
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Ancho del Papel (mm)</label><span id="val_w" style="font-size:12px; font-weight:bold;">51mm</span></div>
                            <input type="range" id="cfg_width" min="20" max="100" value="51" oninput="cambiarDimensionesManual()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Alto del Papel (mm)</label><span id="val_h" style="font-size:12px; font-weight:bold;">25mm</span></div>
                            <input type="range" id="cfg_height" min="15" max="100" value="25" oninput="cambiarDimensionesManual()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Tamaño Letra Base (px)</label><span id="val_font" style="font-size:12px; font-weight:bold;">10px</span></div>
                            <input type="range" id="cfg_font" min="6" max="22" value="10" oninput="cambiarDimensionesManual()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Altura del Código de Barras (px)</label><span id="val_bar" style="font-size:12px; font-weight:bold;">35px</span></div>
                            <input type="range" id="cfg_barcode_h" min="15" max="70" value="35" oninput="cambiarDimensionesManual()">
                        </div>
                        
                        <div class="form-row">
                            <label><i class="ti ti-rotate"></i> Rotación al imprimir</label>
                            <select id="cfg_rotacion" onchange="cambiarDimensionesManual()">
                                <option value="0">0° — Normal</option>
                                <option value="90">90° — Girar a la derecha</option>
                                <option value="180">180° — Invertido</option>
                                <option value="270">270° — Girar a la izquierda</option>
                            </select>
                        </div>

                        <div class="form-row" style="margin-top:15px;">
                            <label>Cantidad de Copias</label>
                            <input type="number" id="lbl_copias" value="1" min="1" max="50" style="font-weight:700; font-size:16px;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:10px;">
                            <button class="btn btn-blue" onclick="imprimirLabelAdhesivo()"><i class="ti ti-printer"></i> Imprimir en Label Printer</button>
                            <button class="btn btn-light" onclick="abrirModalConfigImpresora()" title="Configurar impresora 2C-LP427B"><i class="ti ti-settings"></i></button>
                        </div>
                    </div>

                    <div class="card" style="background:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <h4>Vista Previa</h4>
                        
                        <div class="label-preview-card" id="labelCard" style="width: 72mm; font-size: 12px; font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif;">
                            <div id="lblLiveLogo" style="font-size:24px; margin-bottom:5px;"><i class="ti ti-brand-apple"></i></div>
                            <div style="border-bottom:2px solid #000; margin-bottom:8px;"></div>
                            <div style="text-align:left; margin-bottom:4px; font-weight:900; -webkit-text-stroke:0.4px #000;">EQUIPO: <span id="lblLiveMod">iPhone 11 Pro 64GB Silver</span></div>
                            <div style="text-align:left; margin-bottom:8px; font-weight:900; -webkit-text-stroke:0.4px #000;">IMEI: <span id="lblLiveImei">356789123456789</span></div>
                            <div class="barcode-visual" id="lblLiveBarcode" style="font-size:42px;"></div>
                            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; margin-top:6px; text-transform:uppercase;" id="lblLiveEstadoContainer"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONFIGURACIÓN DE IMPRESORA -->
            <div id="v-configImpresora" class="view">
                <!-- PANEL DE CONEXIÓN QZ TRAY -->
                <div class="card" id="qzPanelCard" style="border-top:4px solid #06b6d4;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <h3 style="margin:0;"><i class="ti ti-plug-connected" style="color:#06b6d4;"></i> Cliente de Impresión Directa (QZ Tray)</h3>
                        <span id="qzEstadoBadge" class="badge" style="background:#fef3c7; color:#92400e; font-size:12px;">Verificando...</span>
                    </div>
                    
                    <!-- Estado: NO instalado -->
                    <div id="qzNoInstalado" style="display:none; margin-top:15px;">
                        <div style="background:#fef2f2; border:1px solid #fecaca; padding:14px; border-radius:8px; color:#991b1b;">
                            <b><i class="ti ti-alert-triangle"></i> No tienes el Cliente de Impresión instalado</b>
                            <p style="margin:8px 0; font-size:13px; line-height:1.5;">Para imprimir directo sin diálogo (como InfoPlus), descarga e instala QZ Tray. Es gratis.</p>
                            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                                <a href="https://qz.io/download/" target="_blank" class="btn btn-blue" style="text-decoration:none;"><i class="ti ti-download"></i> Descargar QZ Tray</a>
                                <button class="btn btn-light" onclick="qzVerificarConexion()"><i class="ti ti-refresh"></i> Ya lo instalé, reconectar</button>
                            </div>
                            <p style="margin:10px 0 0; font-size:11px; color:#92400e;">⚠️ Durante la instalación puede pedir instalar Java. Acéptalo, QZ Tray lo necesita.</p>
                        </div>
                    </div>
                    
                    <!-- Estado: Conectado -->
                    <div id="qzConectado" style="display:none; margin-top:15px;">
                        <div style="background:#d1fae5; border:1px solid #86efac; padding:14px; border-radius:8px; color:#065f46;">
                            <b><i class="ti ti-circle-check"></i> Cliente conectado correctamente</b>
                            <div style="margin-top:12px;">
                                <label style="color:#065f46;"><i class="ti ti-tag"></i> Impresora para LABELS (etiquetas)</label>
                                <div style="display:flex; gap:6px; align-items:stretch; margin-bottom:12px;">
                                    <select id="qzImpresoraLabels" style="flex:1;" onchange="qzGuardarImpresoras()">
                                        <option value="">-- Cargando impresoras --</option>
                                    </select>
                                </div>
                                <label style="color:#065f46;"><i class="ti ti-receipt"></i> Impresora para TICKETS (recibos)</label>
                                <div style="display:flex; gap:6px; align-items:stretch;">
                                    <select id="qzImpresoraTickets" style="flex:1;" onchange="qzGuardarImpresoras()">
                                        <option value="">-- Cargando impresoras --</option>
                                    </select>
                                    <button class="btn btn-light" onclick="qzCargarImpresoras()" title="Refrescar lista"><i class="ti ti-refresh"></i></button>
                                </div>
                                <button class="btn btn-dark" style="width:100%; margin-top:12px;" onclick="qzImprimirPrueba()"><i class="ti ti-printer"></i> Imprimir Prueba (Labels)</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="layout-dashboard">
                    <!-- Lado izquierdo: controles -->
                    <div class="card">
                        <h3 style="margin:0 0 15px 0;"><i class="ti ti-settings" style="color:var(--blue-btn);"></i> Configuración de Impresora 2C-LP427B</h3>
                        
                        <div style="background:#dbeafe; border:1px solid #93c5fd; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#1e40af;">
                            <b><i class="ti ti-info-circle"></i> Ajusta el tamaño y verifica con la "Vista Previa" al lado.</b> Cuando esté bien, guarda como perfil.
                        </div>
                        
                        <!-- Selector de perfil -->
                        <div class="form-row">
                            <label>Perfil Activo</label>
                            <div style="display:flex; gap:6px;">
                                <select id="cfg_perfil_actual" onchange="cargarPerfilImpresora()" style="flex:1;"></select>
                                <button class="btn btn-light" onclick="abrirModalNuevoPerfil()" title="Crear nuevo perfil"><i class="ti ti-plus"></i></button>
                                <button class="btn btn-light" onclick="eliminarPerfilActual()" title="Eliminar perfil actual"><i class="ti ti-trash"></i></button>
                            </div>
                        </div>
                        
                        <hr style="border:0; border-top:1px solid var(--border-color); margin:15px 0;">
                        
                        <h4 style="margin:0 0 10px 0; font-size:12px; color:var(--blue-btn); text-transform:uppercase;">📐 Calibración Manual</h4>
                        
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Ancho del Label (mm)</label><span id="cfgi_w_val" style="font-size:12px; font-weight:bold;">58mm</span></div>
                            <input type="range" id="cfgi_width" min="20" max="100" value="58" oninput="actualizarPreviewImpresora()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Alto del Label (mm)</label><span id="cfgi_h_val" style="font-size:12px; font-weight:bold;">40mm</span></div>
                            <input type="range" id="cfgi_height" min="20" max="100" value="40" oninput="actualizarPreviewImpresora()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Tamaño de Letra (px)</label><span id="cfgi_f_val" style="font-size:12px; font-weight:bold;">11px</span></div>
                            <input type="range" id="cfgi_font" min="6" max="20" value="11" oninput="actualizarPreviewImpresora()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Altura Código de Barras (px)</label><span id="cfgi_bh_val" style="font-size:12px; font-weight:bold;">40px</span></div>
                            <input type="range" id="cfgi_barcode_h" min="20" max="80" value="40" oninput="actualizarPreviewImpresora()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label>Margen Interno (mm)</label><span id="cfgi_m_val" style="font-size:12px; font-weight:bold;">1mm</span></div>
                            <input type="range" id="cfgi_margin" min="0" max="10" value="1" oninput="actualizarPreviewImpresora()">
                        </div>
                        <div class="form-row">
                            <div style="display:flex; justify-content:space-between;"><label><i class="ti ti-contrast"></i> Densidad / Oscuridad (nitidez)</label><span id="cfgi_dens_val" style="font-size:12px; font-weight:bold;">8</span></div>
                            <input type="range" id="cfgi_density" min="0" max="15" value="8" oninput="guardarDensidad()">
                            <small style="color:var(--text-muted); font-size:10px;">Más alto = más oscuro/nítido. Si sale muy claro, sube. Si se ve quemado/borroso, baja.</small>
                        </div>
                        
                        <div class="form-row">
                            <label>Tipo de Label de este Perfil</label>
                            <select id="cfgi_tipo" onchange="actualizarPreviewImpresora()">
                                <option value="venta">Label de Venta (con código de barras)</option>
                                <option value="diagnostico">Label Diagnóstico Taller (sin barcode)</option>
                                <option value="diag_reacond">Label Diagnóstico Reacond. (con notas)</option>
                            </select>
                        </div>
                        
                        <hr style="border:0; border-top:1px solid var(--border-color); margin:15px 0;">
                        
                        <!-- Botones de acción -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <button class="btn btn-blue" onclick="guardarPerfilActual()"><i class="ti ti-device-floppy"></i> Guardar</button>
                            <button class="btn btn-dark" onclick="imprimirTestImpresora()"><i class="ti ti-printer"></i> Test</button>
                            <button class="btn btn-light" onclick="imprimirReglaCalibracion()"><i class="ti ti-ruler"></i> Imprimir Regla</button>
                            <button class="btn btn-light" onclick="abrirConfigWindows()"><i class="ti ti-window"></i> Config Windows</button>
                        </div>
                    </div>
                    
                    <!-- Lado derecho: preview -->
                    <div class="card" style="background:#f8fafc;">
                        <h3 style="margin:0 0 15px 0; font-size:14px;">👁️ Vista Previa en Tamaño Real</h3>
                        <p style="color:var(--text-muted); font-size:12px; margin-bottom:15px;">Esto se imprime EXACTAMENTE así en la 2C-LP427B</p>
                        
                        <div id="previewImpresoraWrap" style="display:flex; justify-content:center; padding:15px; background:#cbd5e1; border-radius:8px; min-height:200px;">
                            <div id="previewImpresoraCard"></div>
                        </div>
                        
                        <div style="margin-top:15px; background:#fff; padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:11px;">
                            <b style="color:var(--text-dark);">📋 Datos del Perfil:</b>
                            <div id="perfilDetalles" style="color:var(--text-muted); margin-top:6px; line-height:1.6;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CATALOGO DE ARTICULOS -->
            <div id="v-articulos" class="view">
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3 style="margin:0;"><i class="ti ti-database" style="color:var(--blue-btn);"></i> Catálogo Maestro de Artículos</h3>
                        <button class="btn btn-blue" onclick="abrirModalArticulo()"><i class="ti ti-plus"></i> Crear Artículo</button>
                    </div>
                    <p style="color:var(--text-muted); font-size:13px; margin-bottom:15px;">Define aquí los modelos de equipos que vas a usar. Después los seleccionarás al agregar al lote.</p>
                    <div class="form-row"><input id="art_buscar" placeholder="🔍 Buscar por marca, modelo, color..." oninput="renderArticulos()"></div>
                    <div class="table-wrap" style="max-height:560px; overflow-y:auto;">
                        <table>
                            <thead>
                                <tr><th>Código</th><th>Marca</th><th>Modelo</th><th>Capacidad</th><th>Referencia</th><th>IMEI</th><th>Acciones</th></tr>
                            </thead>
                            <tbody id="articulosTable">
                                <tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No hay artículos en el catálogo. Crea uno con el botón + Crear Artículo.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- COMPRAS (Proveedores + Compras anidados) -->
            <div id="v-proveedores" class="view">
                <!-- Vista principal con TABS -->
                <div id="prov-lista">
                    <div class="card">
                        <!-- Acciones rápidas arriba -->
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                            <h3 style="margin:0;"><i class="ti ti-shopping-cart" style="color:var(--blue-btn);"></i> Compras</h3>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button class="btn btn-light" onclick="abrirModalProveedor()" title="Crear nuevo proveedor"><i class="ti ti-plus"></i> Proveedor</button>
                                <button class="btn btn-light" onclick="abrirModalArticulo()" title="Crear nuevo artículo"><i class="ti ti-plus"></i> Artículo</button>
                                <button class="btn btn-blue" onclick="abrirModalNuevaCompra()"><i class="ti ti-shopping-cart-plus"></i> Nueva Compra</button>
                            </div>
                        </div>
                        
                        <!-- TABS -->
                        <div class="tabs-bar">
                            <button class="tab-btn active" id="tab-compras" onclick="cambiarTab('compras')"><i class="ti ti-shopping-cart"></i> <span>Compras</span></button>
                            <button class="tab-btn" id="tab-proveedores" onclick="cambiarTab('proveedores')"><i class="ti ti-truck"></i> <span>Proveedores</span></button>
                        </div>
                        
                        <!-- TAB CONTENT: COMPRAS -->
                        <div id="content-compras" class="tab-content active">
                            <div class="form-row"><input id="compras_buscar" placeholder="🔍 Buscar por código, proveedor..." oninput="renderComprasTab()"></div>
                            <div id="comprasContainer" style="display:flex; flex-direction:column; gap:10px;">
                                <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando compras...</p>
                            </div>
                        </div>
                        
                        <!-- TAB CONTENT: PROVEEDORES -->
                        <div id="content-proveedores" class="tab-content">
                            <div class="form-row"><input id="prov_buscar" placeholder="🔍 Buscar por nombre, contacto o ciudad..." oninput="renderProveedores()"></div>
                            <div id="proveedoresContainer" style="display:flex; flex-direction:column; gap:10px;">
                                <p style="color:var(--text-muted); text-align:center;">Cargando proveedores...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detalle de proveedor con sus lotes -->
                <div id="prov-detalle" style="display:none;">
                    <button class="btn btn-light" onclick="volverListaProveedores()" style="margin-bottom:15px;"><i class="ti ti-arrow-left"></i> Volver</button>
                    
                    <div class="prov-detail-header">
                        <h2 id="provDetTitulo">Proveedor</h2>
                        <div id="provDetMeta" style="opacity:0.9; font-size:13px; margin-top:4px;"></div>
                        <div class="stats">
                            <div class="stat-item"><small>Lotes</small><strong id="provDetLotes">0</strong></div>
                            <div class="stat-item"><small>Equipos Totales</small><strong id="provDetEquipos">0</strong></div>
                            <div class="stat-item"><small>Inversión</small><strong id="provDetInversion">RD$ 0</strong></div>
                            <div class="stat-item"><small>Confiabilidad</small><strong id="provDetConfiab">-</strong></div>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-packages" style="color:var(--blue-btn);"></i> Lotes de este Proveedor</h3>
                            <button class="btn btn-blue" onclick="crearLoteDesdeProveedor()"><i class="ti ti-plus"></i> Nuevo Lote</button>
                        </div>
                        <div id="lotesProveedorContainer">
                            <p style="color:var(--text-muted); text-align:center; font-size:13px;">Sin lotes registrados.</p>
                        </div>
                    </div>
                </div>

                <!-- Detalle de lote -->
                <div id="lote-detalle" style="display:none;">
                    <button class="btn btn-light" onclick="volverDetalleProveedor()" style="margin-bottom:15px;"><i class="ti ti-arrow-left"></i> Volver al Proveedor</button>

                    <div class="card">
                        <h3 style="margin:0 0 15px 0;" id="loteDetTitulo">Lote</h3>

                        <div class="block-grid">
                            <div class="block-card">
                                <div class="block-header header-blue-dark">Datos del Lote</div>
                                <div class="block-body">
                                    <div><label>Código Lote</label><input id="lt_codigo" disabled></div>
                                    <div><label>Fecha de Compra</label><input id="lt_fecha" type="date"></div>
                                    <div><label>Total del Lote (RD$) — Calculado</label><input id="lt_costo_total_display" disabled style="font-weight:800; color:#065f46;"></div>
                                    <div><label>Cantidad de Equipos — Calculado</label><input id="lt_cantidad_display" disabled style="font-weight:800; color:var(--blue-btn);"></div>
                                    <div><label>Notas / Comentario</label><textarea id="lt_notas" rows="2" placeholder="Ej: 53 dispositivos incluyendo apple watch"></textarea></div>
                                    <div><label>Estado</label><select id="lt_estado">
                                        <option value="Abierto">Abierto</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Cerrado">Cerrado</option>
                                    </select></div>
                                    <button class="btn btn-blue" style="width:100%; margin-top:10px;" onclick="guardarDatosLote()"><i class="ti ti-device-floppy"></i> Guardar Notas y Estado</button>
                                    
                                    <details style="margin-top:15px; background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                                        <summary style="cursor:pointer; font-weight:700; font-size:12px; color:var(--blue-btn); text-transform:uppercase;"><i class="ti ti-adjustments"></i> Calibración de Labels de Diagnóstico</summary>
                                        <div style="margin-top:10px;">
                                            <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">
                                                <button class="btn btn-light" style="padding:6px 10px; font-size:11px; flex:1;" onclick="presetLabelDiag2x1()"><i class="ti ti-ruler-2"></i> Preset 2x1"</button>
                                                <button class="btn btn-light" style="padding:6px 10px; font-size:11px; flex:1;" onclick="presetLabelDiag1x2()"><i class="ti ti-ruler-3"></i> Preset 1x2"</button>
                                            </div>
                                            <div class="form-row">
                                                <div style="display:flex; justify-content:space-between;"><label>Ancho (mm)</label><span id="dlbl_w_val" style="font-size:11px; font-weight:bold;">51mm</span></div>
                                                <input type="range" id="dlbl_width" min="20" max="100" value="51" oninput="cambiarDimensionesLabelDiag()">
                                            </div>
                                            <div class="form-row">
                                                <div style="display:flex; justify-content:space-between;"><label>Alto (mm)</label><span id="dlbl_h_val" style="font-size:11px; font-weight:bold;">25mm</span></div>
                                                <input type="range" id="dlbl_height" min="15" max="100" value="25" oninput="cambiarDimensionesLabelDiag()">
                                            </div>
                                            <div class="form-row">
                                                <div style="display:flex; justify-content:space-between;"><label>Tamaño Letra (px)</label><span id="dlbl_f_val" style="font-size:11px; font-weight:bold;">9px</span></div>
                                                <input type="range" id="dlbl_font" min="6" max="16" value="9" oninput="cambiarDimensionesLabelDiag()">
                                            </div>
                                            <div class="form-row">
                                                <label style="font-size:11px;"><i class="ti ti-rotate"></i> Rotación al imprimir</label>
                                                <select id="dlbl_rotacion" onchange="cambiarDimensionesLabelDiag()" style="min-height:auto; padding:8px;">
                                                    <option value="0">0° — Normal</option>
                                                    <option value="90">90° — Girar derecha</option>
                                                    <option value="180">180° — Invertido</option>
                                                    <option value="270">270° — Girar izquierda</option>
                                                </select>
                                            </div>
                                            <small style="color:var(--text-muted); font-size:10px;">La calibración se guarda en este navegador.</small>
                                            
                                            <!-- Vista previa en vivo de la calibración -->
                                            <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color);">
                                                <div style="font-size:11px; font-weight:700; color:var(--blue-btn); margin-bottom:8px;"><i class="ti ti-eye"></i> VISTA PREVIA EN VIVO</div>
                                                <div style="display:flex; justify-content:center; background:#e2e8f0; padding:12px; border-radius:8px;">
                                                    <div id="dlblPreviewVivo" style="background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                    
                                    <button class="btn btn-dark" style="width:100%; margin-top:10px;" onclick="abrirPreviewLabelsLote()"><i class="ti ti-printer"></i> Imprimir Labels del Lote</button>
                                </div>
                            </div>

                            <div class="block-card" style="grid-column: span 2;">
                                <div class="block-header header-blue-light">Agregar Equipo al Lote</div>
                                <div class="block-body">
                                    <div style="display:grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr auto; gap:10px; align-items:end;" id="formAgregarEquipo">
                                        <div><label>Artículo *</label>
                                            <div id="ss-eq-articulo"></div>
                                        </div>
                                        <div><label id="lbl_eq_imei">IMEI / Serial *</label><input id="eq_imei" placeholder="358921..." style="text-transform:uppercase;"></div>
                                        <div id="costo_admin_wrap"><label>Costo Unidad (RD$) *</label><input id="eq_costo" type="number" step="0.01" placeholder="6374.00"></div>
                                        <div><label>Notas rápidas</label><input id="eq_notas" placeholder="OPCIONAL: PANTALLA ROTA..." style="text-transform:uppercase;"></div>
                                        <button class="btn btn-blue" onclick="agregarEquipoAlLote()" style="height:42px;"><i class="ti ti-plus"></i> Agregar</button>
                                    </div>
                                    <div style="background:#f8fafc; border:1px dashed var(--border-color); padding:8px 12px; border-radius:6px; margin-top:8px; font-size:12px; color:var(--text-muted);">
                                        💡 ¿No encuentras el artículo? <a href="#" onclick="abrirModalArticulo(); return false;" style="color:var(--blue-btn); font-weight:700; text-decoration:none;">Crear nuevo artículo</a> primero.
                                    </div>

                                    <h4 style="margin:20px 0 10px 0; font-size:13px;">Equipos del Lote (<span id="eq_count">0</span>)</h4>
                                    <div class="table-wrap" style="max-height:340px; overflow-y:auto;">
                                        <table>
                                            <thead>
                                                <tr><th>Artículo</th><th>IMEI</th><th>Notas</th><th id="th_costo">Costo</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody id="equiposLoteTable">
                                                <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:15px;">Sin equipos agregados aún.</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style="background:#dbeafe; padding:10px 14px; border-radius:6px; margin-top:10px; display:flex; justify-content:space-between; align-items:center;" id="totalAcumuladoWrap">
                                        <span style="font-size:13px; font-weight:700; color:#1e3a8a;">TOTAL ACUMULADO:</span>
                                        <strong id="eq_total" style="font-size:18px; color:#1e3a8a;">RD$ 0.00</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REACONDICIONADOS - NUEVO FLUJO -->
            <div id="v-refurb" class="view">
                <!-- PESTAÑAS EXTERNAS DEL MÓDULO -->
                <div style="background:#fff; border-radius:12px; padding:6px; margin-bottom:15px; display:flex; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex-wrap:wrap;">
                    <button id="reacondMainTabLotes" onclick="cambiarMainTabReacond('lotes')" class="reacond-main-tab active" style="flex:1; min-width:90px; padding:12px; border:0; background:var(--blue-btn); color:#fff; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-stack"></i> Lotes
                    </button>
                    <button id="reacondMainTabCatalogo" onclick="cambiarMainTabReacond('catalogo')" class="reacond-main-tab" style="flex:1; min-width:90px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-list-details"></i> Catálogo de Fallas
                    </button>
                    <button id="reacondMainTabDevoluciones" onclick="cambiarMainTabReacond('devoluciones')" class="reacond-main-tab" style="flex:1; min-width:90px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-rotate-2"></i> Devoluciones
                    </button>
                    <button id="reacondMainTabPiezas" onclick="cambiarMainTabReacond('piezas')" class="reacond-main-tab" style="flex:1; min-width:90px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-packages"></i> Pedidos de Piezas
                    </button>
                </div>
                
                <!-- CONTENIDO PESTAÑA LOTES -->
                <div id="reacondMainContentLotes">
                    <!-- VISTA 1: LISTA DE LOTES POR PESTAÑA -->
                    <div id="reacondListaLotes">
                        <div class="card">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                                <h3 style="margin:0;"><i class="ti ti-recycle" style="color:#06b6d4;"></i> Reacondicionados</h3>
                                <button class="btn btn-light" onclick="cargarLotesReacond()" style="padding:6px 12px; font-size:12px;"><i class="ti ti-refresh"></i> Actualizar</button>
                            </div>
                        
                        <!-- Tabs -->
                        <div class="tabs reacond-tabs-scroll" style="display:flex; gap:4px; margin-bottom:15px; overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; padding:4px 2px 6px;">
                            <button class="tab-btn active" data-tab="pendientes" onclick="cambiarTabReacond('pendientes')" style="padding:11px 14px; cursor:pointer; font-weight:700; white-space:nowrap; font-size:13px;">
                                🟡 Pendientes <span id="cntPendientes" class="badge" style="background:#fef3c7; color:#92400e; margin-left:6px; padding:2px 7px; border-radius:10px; font-size:11px;">0</span>
                            </button>
                            <button class="tab-btn" data-tab="evaluacion" onclick="cambiarTabReacond('evaluacion')" style="padding:11px 14px; cursor:pointer; font-weight:700; white-space:nowrap; font-size:13px;">
                                ⚠️ Evaluación <span id="cntEvaluacion" class="badge" style="background:#dbeafe; color:#1e40af; margin-left:6px; padding:2px 7px; border-radius:10px; font-size:11px;">0</span>
                            </button>
                            <button class="tab-btn" data-tab="proceso" onclick="cambiarTabReacond('proceso')" style="padding:11px 14px; cursor:pointer; font-weight:700; white-space:nowrap; font-size:13px;">
                                🔧 En Proceso <span id="cntProceso" class="badge" style="background:#fed7aa; color:#9a3412; margin-left:6px; padding:2px 7px; border-radius:10px; font-size:11px;">0</span>
                            </button>
                            <button class="tab-btn" data-tab="listo_venta" onclick="cambiarTabReacond('listo_venta')" style="padding:11px 14px; cursor:pointer; font-weight:700; white-space:nowrap; font-size:13px;">
                                🛒 Listo Venta <span id="cntListoVenta" class="badge" style="background:#ddd6fe; color:#5b21b6; margin-left:6px; padding:2px 7px; border-radius:10px; font-size:11px;">0</span>
                            </button>
                            <button class="tab-btn" data-tab="terminados" onclick="cambiarTabReacond('terminados')" style="padding:11px 14px; cursor:pointer; font-weight:700; white-space:nowrap; font-size:13px;">
                                ✅ Despachado <span id="cntTerminados" class="badge" style="background:#d1fae5; color:#065f46; margin-left:6px; padding:2px 7px; border-radius:10px; font-size:11px;">0</span>
                            </button>
                        </div>
                        
                        <!-- Container de la lista filtrada -->
                        <div id="lotesReacondContainer">
                            <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando...</p>
                        </div>
                    </div>
                </div>
                
                <!-- VISTA 2: DETALLE DEL LOTE (oculta por defecto) -->
                <div id="reacondDetalleLote" style="display:none;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <button class="btn btn-light" onclick="volverListaLotesReacond()" style="padding:6px 12px;"><i class="ti ti-arrow-left"></i> Volver</button>
                            <h3 id="reacondLoteTitulo" style="margin:0; flex:1; text-align:center;">Lote</h3>
                            <span id="reacondLoteEstadoBadge" class="badge"></span>
                        </div>
                        
                        <!-- Info del lote -->
                        <div id="reacondLoteInfo" style="background:#f1f5f9; padding:12px; border-radius:8px; margin-bottom:15px; font-size:13px;"></div>
                        
                        <!-- Resumen de estados -->
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:15px;">
                            <div style="background:#fef3c7; padding:12px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#92400e;" id="kpiPendientes">0</div>
                                <div style="font-size:11px; color:#92400e;">PENDIENTES</div>
                            </div>
                            <div style="background:#dbeafe; padding:12px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#1e40af;" id="kpiEnEval">0</div>
                                <div style="font-size:11px; color:#1e40af;">EN EVALUACIÓN</div>
                            </div>
                            <div style="background:#d1fae5; padding:12px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#065f46;" id="kpiEvaluados">0</div>
                                <div style="font-size:11px; color:#065f46;">EVALUADOS</div>
                            </div>
                        </div>
                        
                        <!-- Lista de equipos -->
                        <h4 style="margin:15px 0 10px;"><i class="ti ti-devices-pc"></i> Equipos del Lote</h4>
                        <div id="reacondEquiposLista"></div>
                    </div>
                </div>
                </div>
                <!-- /CONTENIDO PESTAÑA LOTES -->
                
                <!-- CONTENIDO PESTAÑA CATÁLOGO DE FALLAS -->
                <div id="reacondMainContentCatalogo" style="display:none;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-list-details" style="color:#6366f1;"></i> Catálogo de Fallas</h3>
                            <div style="display:flex; gap:6px;">
                                <button class="btn btn-light" onclick="cargarCatalogoFallas()" style="padding:6px 10px; font-size:12px;"><i class="ti ti-refresh"></i></button>
                                <button class="btn btn-dark" style="padding:6px 12px; background:#6366f1;" onclick="abrirModalFalla()"><i class="ti ti-plus"></i> Nueva Falla</button>
                            </div>
                        </div>
                        
                        <div style="background:#dbeafe; border:1px solid #93c5fd; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#1e40af;">
                            <b><i class="ti ti-info-circle"></i> Estas fallas se usarán en la evaluación.</b> Cada una tiene un nombre completo y uno corto para imprimir en el label.
                        </div>
                        
                        <!-- Buscador -->
                        <div class="form-row">
                            <input type="text" id="fallasBuscador" placeholder="🔍 Buscar falla..." oninput="renderCatalogoFallas()" style="width:100%;">
                        </div>
                        
                        <!-- Contenedor del catálogo -->
                        <div id="fallasContainer" style="margin-top:15px;">
                            <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando...</p>
                        </div>
                    </div>
                </div>
                <!-- /CONTENIDO PESTAÑA CATÁLOGO -->
                
                <!-- CONTENIDO PESTAÑA DEVOLUCIONES -->
                <div id="reacondMainContentDevoluciones" style="display:none;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-rotate-2" style="color:#dc2626;"></i> Devoluciones de Equipos</h3>
                            <button id="btnRegistrarDevolucion" class="btn btn-blue" onclick="abrirModalNuevaDevolucion()" style="background:linear-gradient(180deg,#dc2626,#991b1b); box-shadow:0 4px 0 #7f1d1d, 0 5px 10px rgba(220,38,38,0.3);">
                                <i class="ti ti-plus"></i> Registrar Devolución
                            </button>
                        </div>
                        <div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#991b1b;">
                            <b><i class="ti ti-info-circle"></i> Aquí registras equipos que el cliente devolvió.</b> El sistema detecta automáticamente el historial completo y devuelve el equipo al flujo de reparación.
                        </div>
                        <div id="devolucionesLista">
                            <p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">Cargando devoluciones...</p>
                        </div>
                    </div>
                </div>
                <!-- /CONTENIDO PESTAÑA DEVOLUCIONES -->

                <!-- CONTENIDO PESTAÑA PEDIDOS DE PIEZAS -->
                <div id="reacondMainContentPiezas" style="display:none;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-packages" style="color:#0891b2;"></i> Pedidos de Piezas (Reacondicionados)</h3>
                            <button class="btn btn-light" onclick="renderPedidosPiezasReacond()" style="padding:6px 12px; font-size:12px;"><i class="ti ti-refresh"></i> Actualizar</button>
                        </div>
                        <div style="background:#ecfeff; border:1px solid #a5f3fc; padding:12px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#0e7490;">
                            <b><i class="ti ti-info-circle"></i> Aquí ves todas las piezas que los técnicos necesitan para los equipos.</b> Revisa cuáles están pedidas (por conseguir), entregadas, en uso o devueltas.
                        </div>
                        <div id="pedidosPiezasReacondCont">
                            <p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">Cargando pedidos...</p>
                        </div>
                    </div>
                </div>
                <!-- /CONTENIDO PESTAÑA PIEZAS -->
            </div>

            <!-- ============= REPORTES ============= -->
            <div id="v-reportes" class="view">
                <div class="card" style="margin-bottom:15px;">
                    <h2 style="margin:0 0 4px 0; font-size:18px;"><i class="ti ti-chart-bar" style="color:#0891b2;"></i> Reportes de Rendimiento</h2>
                    <p style="color:var(--text-muted); font-size:13px; margin:0;">Evalúa el trabajo de cada técnico en servicio (clientes) y reacondicionados.</p>
                </div>
                <div id="reporteGeneralTiempos"></div>
                <div class="card" style="margin-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <label style="font-weight:600; font-size:13px;">Técnico:</label>
                        <select id="rep_tecnico" onchange="renderReporteTecnico()" style="flex:1; min-width:200px; max-width:320px;"></select>
                    </div>
                </div>
                <div id="reporteContenido"></div>
            </div>

            <!-- ============= CONFIGURACIÓN ============= -->
            <div id="v-configuracion" class="view">
                <div style="background:#fff; border-radius:12px; padding:6px; margin-bottom:15px; display:flex; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex-wrap:wrap;">
                    <button id="cfgMainTabTecnicos" onclick="cambiarMainTabConfig('tecnicos')" class="cfg-main-tab" style="flex:1; min-width:120px; padding:12px; border:0; background:var(--blue-btn); color:#fff; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-users"></i> Técnicos
                    </button>
                    <button id="cfgMainTabRoles" onclick="cambiarMainTabConfig('roles')" class="cfg-main-tab" style="flex:1; min-width:120px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-shield"></i> Roles
                    </button>
                    <button id="cfgMainTabCatalogos" onclick="cambiarMainTabConfig('catalogos')" class="cfg-main-tab" style="flex:1; min-width:120px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-tags"></i> Catálogos
                    </button>
                    <button id="cfgMainTabGeneral" onclick="cambiarMainTabConfig('general')" class="cfg-main-tab" style="flex:1; min-width:120px; padding:12px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;">
                        <i class="ti ti-adjustments"></i> General
                    </button>
                </div>
                
                <!-- TAB TÉCNICOS -->
                <div id="cfgContentTecnicos">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-users" style="color:var(--blue-btn);"></i> Técnicos del Taller</h3>
                            <button id="btnNuevoTecnico" class="btn btn-blue" onclick="abrirModalTecnico()"><i class="ti ti-plus"></i> Nuevo Empleado</button>
                        </div>
                        <div style="background:#dbeafe; border:1px solid #93c5fd; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#1e40af;">
                            <b><i class="ti ti-info-circle"></i> Aquí gestionas los técnicos que trabajarán los equipos.</b> Asígnales un rol para definir qué pueden hacer.
                        </div>
                        <div id="tecnicosLista"></div>
                    </div>
                </div>
                
                <!-- TAB ROLES -->
                <div id="cfgContentRoles" style="display:none;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-shield" style="color:#6366f1;"></i> Roles y Permisos</h3>
                            <button id="btnNuevoRol" class="btn btn-blue" onclick="abrirModalRol()" style="background:linear-gradient(180deg,#6366f1,#4338ca); box-shadow:0 4px 0 #3730a3;"><i class="ti ti-plus"></i> Nuevo Rol</button>
                        </div>
                        <div style="background:#ede9fe; border:1px solid #c4b5fd; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#5b21b6;">
                            <b><i class="ti ti-info-circle"></i> Crea roles personalizados con permisos específicos.</b> El rol "Administrador" tiene todos los permisos y no se puede eliminar.
                        </div>
                        <div id="rolesLista">
                            <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando roles...</p>
                        </div>
                    </div>
                </div>
                
                <!-- TAB CATÁLOGOS -->
                <div id="cfgContentCatalogos" style="display:none;">
                    <!-- Sección Categorías -->
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-category" style="color:#0891b2;"></i> Categorías</h3>
                            <button class="btn btn-blue" onclick="abrirModalCategoria()" style="background:linear-gradient(180deg,#0891b2,#0e7490); box-shadow:0 4px 0 #155e75;"><i class="ti ti-plus"></i> Nueva Categoría</button>
                        </div>
                        <div style="background:#cffafe; border:1px solid #67e8f9; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#155e75;">
                            <b><i class="ti ti-info-circle"></i> Categorías generales</b> que podrás usar para clasificar artículos, equipos y más.
                        </div>
                        <div id="categoriasLista">
                            <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando...</p>
                        </div>
                    </div>
                    
                    <!-- Sección Marcas -->
                    <div class="card" style="margin-top:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                            <h3 style="margin:0;"><i class="ti ti-brand-apple" style="color:#6366f1;"></i> Marcas</h3>
                            <button class="btn btn-blue" onclick="abrirModalMarca()" style="background:linear-gradient(180deg,#6366f1,#4338ca); box-shadow:0 4px 0 #3730a3;"><i class="ti ti-plus"></i> Nueva Marca</button>
                        </div>
                        <div style="background:#ede9fe; border:1px solid #c4b5fd; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#5b21b6;">
                            <b><i class="ti ti-info-circle"></i> Marcas</b> (Apple, Samsung, Xiaomi...) que podrás seleccionar al crear artículos y equipos.
                        </div>
                        <div id="marcasLista">
                            <p style="color:var(--text-muted); text-align:center; padding:20px;">Cargando...</p>
                        </div>
                    </div>
                </div>
                
                <!-- TAB GENERAL -->
                <div id="cfgContentGeneral" style="display:none;">
                    <div class="card">
                        <h3><i class="ti ti-adjustments"></i> Configuración General</h3>
                        <p style="color:var(--text-muted);">Próximamente: configuración general del sistema (logos, datos del taller, etc.)</p>
                    </div>
                </div>
            </div>
        </section>
    </main>
</div>

<!-- MODAL: EVALUACIÓN DE EQUIPO (FALLAS + PIEZAS) -->
<div id="modalEvaluacion" class="modal-backdrop">
    <div class="modal-box" style="max-width:900px; width:95%;">
        <div class="modal-header" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-clipboard-list"></i> <span id="evalTituloModal">Evaluando Equipo</span></h3>
            <button class="modal-close" onclick="cerrarModalEvaluacion()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body" style="padding:0; max-height:75vh; overflow-y:auto;">
            <input id="eval_equipo_id" type="hidden">
            
            <!-- Info del equipo -->
            <div id="evalEquipoInfo" style="background:#f1f5f9; padding:12px 20px; border-bottom:1px solid var(--border-color); font-size:13px;"></div>
            
            <div style="padding:20px;">
                <!-- Tabs internas -->
                <div style="display:flex; gap:4px; border-bottom:2px solid var(--border-color); margin-bottom:15px;">
                    <button class="eval-tab active" data-tab="fallas" onclick="cambiarTabEvaluacion('fallas')" style="padding:10px 16px; background:none; border:0; border-bottom:3px solid var(--blue-btn); cursor:pointer; font-weight:600; color:var(--blue-btn);">
                        ⚠️ Fallas <span id="evalCntFallas" class="badge" style="background:#fef3c7; color:#92400e; margin-left:6px;">0</span>
                    </button>
                    <button class="eval-tab" data-tab="piezas" onclick="cambiarTabEvaluacion('piezas')" style="padding:10px 16px; background:none; border:0; border-bottom:3px solid transparent; cursor:pointer; font-weight:600; color:var(--text-muted);">
                        🔧 Piezas <span id="evalCntPiezas" class="badge" style="background:#dbeafe; color:#1e40af; margin-left:6px;">0</span>
                    </button>
                    <button class="eval-tab" data-tab="resumen" onclick="cambiarTabEvaluacion('resumen')" style="padding:10px 16px; background:none; border:0; border-bottom:3px solid transparent; cursor:pointer; font-weight:600; color:var(--text-muted);">
                        📋 Resumen
                    </button>
                </div>
                
                <!-- TAB FALLAS -->
                <div id="evalTabFallas">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
                        <input type="text" id="evalBuscarFalla" placeholder="🔍 Buscar falla..." oninput="renderFallasEvaluacion()" style="flex:1; min-width:180px;">
                        <button class="btn btn-light" style="padding:8px 12px; font-size:12px;" onclick="evalExpandirTodas()"><i class="ti ti-square-arrow-down"></i> Expandir</button>
                        <button class="btn btn-light" style="padding:8px 12px; font-size:12px;" onclick="evalContraerTodas()"><i class="ti ti-square-arrow-up"></i> Contraer</button>
                    </div>
                    <div id="evalFallasContenedor"></div>
                </div>
                
                <!-- TAB PIEZAS -->
                <div id="evalTabPiezas" style="display:none;">
                    <!-- Cuadro resumen de fallas seleccionadas -->
                    <div id="evalPiezasFallasResumen" style="background:linear-gradient(135deg, #fef3c7, #fde68a); border:1px solid #f59e0b; padding:12px; border-radius:8px; margin-bottom:12px;">
                        <b style="font-size:12px; color:#92400e;"><i class="ti ti-alert-triangle"></i> Fallas detectadas en este equipo:</b>
                        <div id="evalPiezasFallasChips" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;"></div>
                    </div>
                    <div style="background:#dbeafe; border:1px solid #93c5fd; padding:10px; border-radius:8px; margin-bottom:12px; font-size:12px; color:#1e40af;">
                        <b><i class="ti ti-info-circle"></i> Selecciona las piezas que el técnico necesitará para reparar este equipo.</b>
                    </div>
                    <div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; margin-bottom:15px;">
                        <div style="flex:1; min-width:200px;">
                            <label style="font-size:12px;">Buscar pieza del inventario</label>
                            <div id="ss-eval-pieza"></div>
                        </div>
                        <div style="width:90px;">
                            <label style="font-size:12px;">Cantidad</label>
                            <input type="number" id="eval_pieza_cantidad" value="1" min="1" max="50" style="font-weight:700;">
                        </div>
                        <button class="btn btn-blue" onclick="evalAgregarPieza()" style="padding:8px 14px;"><i class="ti ti-plus"></i> Agregar</button>
                    </div>
                    <div id="evalPiezasLista"></div>
                </div>
                
                <!-- TAB RESUMEN -->
                <div id="evalTabResumen" style="display:none;">
                    <div class="form-row">
                        <label><i class="ti ti-note"></i> Notas adicionales (van en el label)</label>
                        <textarea id="eval_notas" rows="3" placeholder="Ej: Pantalla con manchas leves, batería 78%, etc." style="resize:vertical;"></textarea>
                    </div>
                    
                    <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:15px; margin-top:15px;">
                        <h4 style="margin:0 0 10px;"><i class="ti ti-list-check"></i> Fallas detectadas</h4>
                        <div id="evalResumenFallas" style="font-size:13px;"></div>
                    </div>
                    
                    <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:15px; margin-top:12px;">
                        <h4 style="margin:0 0 10px;"><i class="ti ti-tools"></i> Piezas necesarias</h4>
                        <div id="evalResumenPiezas" style="font-size:13px;"></div>
                        <div id="evalCostoTotal" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color); font-weight:700; font-size:14px; color:var(--blue-btn);"></div>
                    </div>
                    
                    <!-- Botón imprimir label de diagnóstico -->
                    <div style="background:linear-gradient(135deg, #e0e7ff, #ddd6fe); border:1px solid #a5b4fc; border-radius:8px; padding:15px; margin-top:12px; text-align:center;">
                        <p style="font-size:12px; color:#4338ca; margin:0 0 10px;"><i class="ti ti-printer"></i> Imprime el label de diagnóstico con las fallas de este equipo.</p>
                        <button class="btn btn-blue" onclick="imprimirLabelDesdeEvaluacion()" style="background:linear-gradient(180deg,#6366f1,#4338ca); box-shadow:0 4px 0 #3730a3;"><i class="ti ti-printer"></i> Imprimir Label de Diagnóstico</button>
                        <p style="font-size:11px; color:#6366f1; margin:8px 0 0;">💡 Guarda primero para que el label tenga las fallas actualizadas.</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer" style="flex-wrap:wrap; gap:10px;">
            <button class="btn btn-light" onclick="cerrarModalEvaluacion()">Cancelar</button>
            <!-- Botón Atrás (oculto en primer tab) -->
            <button class="btn btn-light" id="evalBtnAtras" onclick="evalNavegarAtras()" style="display:none;"><i class="ti ti-arrow-left"></i> Atrás</button>
            <!-- Botón Siguiente (oculto en último tab) -->
            <button class="btn btn-blue" id="evalBtnSiguiente" onclick="evalNavegarSiguiente()">Siguiente <i class="ti ti-arrow-right"></i></button>
            <!-- Botones del último tab (Resumen) -->
            <button class="btn btn-light" id="evalBtnGuardar" onclick="guardarEvaluacion(false)" style="display:none;"><i class="ti ti-device-floppy"></i> Solo Guardar</button>
            <button class="btn btn-blue" id="evalBtnGuardarEvaluado" onclick="guardarEvaluacion(true)" style="display:none; background:linear-gradient(180deg,#10b981,#059669); box-shadow:0 4px 0 #047857;"><i class="ti ti-circle-check"></i> Guardar y marcar evaluado</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR/EDITAR TÉCNICO -->
<div id="modalPiezasTecnico" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-packages"></i> <span id="piezasTecnicoTitulo">Piezas del técnico</span></h3>
            <button class="modal-close" onclick="cerrarModalPiezasTecnico()">✕</button>
        </div>
        <div class="modal-body">
            <p style="font-size:12px; color:var(--text-muted); margin:0 0 12px;">Piezas que este técnico tiene en su poder (recibidas o pendientes de devolver).</p>
            <div id="piezasTecnicoLista"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalPiezasTecnico()">Cerrar</button>
        </div>
    </div>
</div>

<div id="modalTecnico" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-user-plus"></i> <span id="modalTecnicoTitulo">Nuevo Empleado</span></h3>
            <button class="modal-close" onclick="cerrarModalTecnico()">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_tec_id" type="hidden">
            <div class="form-row">
                <label>Tipo de empleado *</label>
                <select id="mod_tec_tipo" onchange="actualizarCamposPorTipoEmpleado()">
                    <option value="tecnico">🔧 Técnico (repara equipos)</option>
                    <option value="servicio">🧑‍💼 Servicio al Cliente (recibe y entrega)</option>
                    <option value="admin">🛡️ Administrador (gestiona todo)</option>
                </select>
                <small style="color:var(--text-muted); font-size:11px;">El técnico procesa reparaciones. Servicio al cliente recibe clientes. Administrador gestiona todo el sistema.</small>
            </div>
            <div class="form-row">
                <label>Nombre completo *</label>
                <input id="mod_tec_nombre" placeholder="Ej. Juan Pérez" style="text-transform:uppercase;">
            </div>
            <div class="form-row">
                <label>Teléfono / WhatsApp</label>
                <input id="mod_tec_telefono" placeholder="809-000-0000">
            </div>
            <div class="form-row">
                <label>Especialidad</label>
                <input id="mod_tec_especialidad" placeholder="Ej. iPhone, Samsung, Microsoldadura...">
            </div>
            <!-- Rol del sistema: OCULTO (se define automático según el tipo). Se mantiene para compatibilidad. -->
            <div class="form-row" style="display:none;">
                <label>Rol del sistema (automático)</label>
                <select id="mod_tec_rol">
                    <option value="tecnico">Técnico (trabaja equipos)</option>
                    <option value="admin">Administrador (gestiona todo)</option>
                </select>
            </div>
            <div class="form-row">
                <label>Rol con permisos personalizados</label>
                <select id="mod_tec_rol_id">
                    <option value="">-- Sin rol personalizado (usar rol simple) --</option>
                </select>
                <small style="color:var(--text-muted); font-size:11px;">Selecciona un rol con permisos específicos creado en la pestaña "Roles".</small>
            </div>
            <div class="form-row">
                <label>Notas (opcional)</label>
                <textarea id="mod_tec_notas" rows="2" placeholder="Información adicional..." style="resize:vertical;"></textarea>
            </div>
            
            <!-- CREDENCIALES DE ACCESO -->
            <div style="background:#ede9fe; border:1px solid #c4b5fd; border-radius:10px; padding:12px; margin:12px 0;">
                <b style="color:#5b21b6; font-size:13px;"><i class="ti ti-key"></i> Credenciales de acceso (login del técnico)</b>
                <p style="font-size:11px; color:#6b21a8; margin:4px 0 10px;">Si le asignas usuario y contraseña, el técnico podrá iniciar sesión. Cambiará la contraseña en su primer ingreso.</p>
                <div class="form-row">
                    <label>Usuario (para login)</label>
                    <input id="mod_tec_usuario" placeholder="Ej. francis, juan2..." autocomplete="off">
                </div>
                <div class="form-row">
                    <label>Contraseña temporal</label>
                    <input id="mod_tec_clave" placeholder="El técnico la cambiará al entrar" autocomplete="off">
                    <small style="color:var(--text-muted); font-size:11px;">Déjala vacía para no cambiar la contraseña actual (al editar).</small>
                </div>
            </div>
            
            <div class="form-row">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="mod_tec_activo" checked>
                    <span>Activo (disponible para asignar a equipos)</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalTecnico()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarTecnico()"><i class="ti ti-check"></i> Guardar</button>
        </div>
    </div>
</div>

<!-- MODAL: LABEL DE VENTA -->
<div id="modalLabelVenta" class="modal-backdrop">
    <div class="modal-box" style="max-width:900px; width:95%;">
        <div class="modal-header" style="background:linear-gradient(135deg, #5b21b6, #7c3aed); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-tag"></i> Imprimir Label de Venta</h3>
            <button class="modal-close" onclick="cerrarModalLabelVenta()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body" style="max-height:75vh; overflow-y:auto;">
            <input id="lv_equipo_id" type="hidden">
            
            <!-- Layout 2 columnas: form izquierda, preview derecha -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <!-- COLUMNA IZQUIERDA - FORMULARIO -->
                <div>
                    <h4 style="margin:0 0 12px;"><i class="ti ti-edit"></i> Datos del Label</h4>
                    
                    <div class="form-row">
                        <label>Modelo abreviado (visible en label)</label>
                        <input id="lv_modelo" placeholder="Ej. iP12 PRO MAX 128GB" oninput="renderPreviewLabelVenta()" style="font-weight:600;">
                        <small style="color:var(--text-muted); font-size:11px;">Versión corta del modelo para que quepa bien.</small>
                    </div>
                    
                    <div class="form-row">
                        <label>Clasificación (texto libre)</label>
                        <input id="lv_clase" placeholder="Ej. CLASE A!" oninput="renderPreviewLabelVenta()" style="text-transform:uppercase; font-weight:600;">
                        <small style="color:var(--text-muted); font-size:11px;">Ej: CLASE A!, AAA, OFERTA, 90% BAT, etc.</small>
                    </div>
                    
                    <div class="form-row">
                        <label>Tipo de logo arriba</label>
                        <select id="lv_logo_tipo" onchange="renderPreviewLabelVenta()">
                            <option value="marca">Logo de la marca (auto)</option>
                            <option value="taller">Logo BAYOL CELL</option>
                            <option value="ninguno">Sin logo</option>
                        </select>
                    </div>
                    
                    <h4 style="margin:18px 0 8px;"><i class="ti ti-ruler"></i> Calibración</h4>
                    
                    <div class="form-row">
                        <div style="display:flex; justify-content:space-between;"><label>Ancho (mm)</label><span id="lv_w_val" style="font-size:11px; font-weight:bold;">51mm</span></div>
                        <input type="range" id="lv_width" min="20" max="100" value="51" oninput="renderPreviewLabelVenta()">
                    </div>
                    <div class="form-row">
                        <div style="display:flex; justify-content:space-between;"><label>Alto (mm)</label><span id="lv_h_val" style="font-size:11px; font-weight:bold;">25mm</span></div>
                        <input type="range" id="lv_height" min="15" max="100" value="25" oninput="renderPreviewLabelVenta()">
                    </div>
                    <div class="form-row">
                        <div style="display:flex; justify-content:space-between;"><label>Tamaño texto (px)</label><span id="lv_f_val" style="font-size:11px; font-weight:bold;">11px</span></div>
                        <input type="range" id="lv_font" min="7" max="20" value="11" oninput="renderPreviewLabelVenta()">
                    </div>
                    <div class="form-row">
                        <div style="display:flex; justify-content:space-between;"><label>Altura código de barras (px)</label><span id="lv_bh_val" style="font-size:11px; font-weight:bold;">38px</span></div>
                        <input type="range" id="lv_barcode_h" min="15" max="70" value="38" oninput="renderPreviewLabelVenta()">
                    </div>
                    <div class="form-row">
                        <label>Rotación al imprimir</label>
                        <select id="lv_rotacion" onchange="renderPreviewLabelVenta()">
                            <option value="0">0° — Normal</option>
                            <option value="90">90° — Girar derecha</option>
                            <option value="180">180° — Invertido</option>
                            <option value="270">270° — Girar izquierda</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Cantidad de copias</label>
                        <input type="number" id="lv_copias" value="1" min="1" max="50" style="font-weight:700;">
                    </div>
                </div>
                
                <!-- COLUMNA DERECHA - PREVIEW -->
                <div>
                    <h4 style="margin:0 0 12px;"><i class="ti ti-eye"></i> Vista Previa</h4>
                    <div style="background:#f1f5f9; padding:20px; border-radius:8px; display:flex; justify-content:center; align-items:center; min-height:200px;">
                        <div id="lv_preview_card" style="background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding:0; overflow:hidden;"></div>
                    </div>
                    <p style="text-align:center; color:var(--text-muted); font-size:11px; margin-top:8px;">Tamaño aproximado al imprimir</p>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalLabelVenta()">Cancelar</button>
            <button class="btn btn-blue" onclick="imprimirLabelVenta()" style="background:#5b21b6;"><i class="ti ti-printer"></i> Imprimir</button>
        </div>
    </div>
</div>

<!-- MODAL: CAMBIAR CLAVE -->
<div id="modalCambiarClave" class="modal-backdrop">
    <div class="modal-box" style="max-width:450px;">
        <div class="modal-header" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-key"></i> Cambiar Contraseña</h3>
            <button class="modal-close" onclick="cerrarModalCambiarClave()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body">
            <div id="cambiarClaveAviso" style="display:none; background:#fef3c7; border:1px solid #fcd34d; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#92400e;">
                <b><i class="ti ti-alert-triangle"></i> Es tu primer ingreso.</b> Por seguridad, debes cambiar tu contraseña antes de continuar.
            </div>
            <div class="form-row">
                <label>Nueva contraseña *</label>
                <input type="password" id="cc_nueva" placeholder="Mínimo 4 caracteres">
            </div>
            <div class="form-row">
                <label>Confirmar contraseña *</label>
                <input type="password" id="cc_confirmar" placeholder="Repite la contraseña">
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" id="cc_cancelar" onclick="cerrarModalCambiarClave()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarNuevaClave()" style="background:linear-gradient(180deg,#10b981,#059669); box-shadow:0 4px 0 #047857;"><i class="ti ti-check"></i> Guardar</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR/EDITAR CATEGORÍA -->
<div id="modalCategoria" class="modal-backdrop">
    <div class="modal-box" style="max-width:500px;">
        <div class="modal-header" style="background:linear-gradient(135deg, #0891b2, #0e7490); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-category"></i> <span id="modalCategoriaTitulo">Nueva Categoría</span></h3>
            <button class="modal-close" onclick="cerrarModalCategoria()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_cat_id" type="hidden">
            <div class="form-row">
                <label>Nombre *</label>
                <input id="mod_cat_nombre" placeholder="Ej. Celular, Tablet, Accesorio...">
            </div>
            <div class="form-row">
                <label>Descripción (opcional)</label>
                <input id="mod_cat_descripcion" placeholder="Para qué sirve esta categoría">
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <div class="form-row" style="flex:1; min-width:140px;">
                    <label>Color</label>
                    <input type="color" id="mod_cat_color" value="#0891b2" style="height:42px; padding:4px; cursor:pointer;">
                </div>
                <div class="form-row" style="flex:1; min-width:140px;">
                    <label>Icono (Tabler)</label>
                    <select id="mod_cat_icono">
                        <option value="ti-category">📦 Categoría</option>
                        <option value="ti-device-mobile">📱 Celular</option>
                        <option value="ti-device-tablet">📲 Tablet</option>
                        <option value="ti-device-laptop">💻 Laptop</option>
                        <option value="ti-headphones">🎧 Accesorio</option>
                        <option value="ti-plug">🔌 Cargador</option>
                        <option value="ti-battery">🔋 Batería</option>
                        <option value="ti-tools">🔧 Repuesto</option>
                        <option value="ti-box">📦 Otro</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="mod_cat_activa" checked>
                    <span>Activa</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalCategoria()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarCategoria()" style="background:linear-gradient(180deg,#0891b2,#0e7490); box-shadow:0 4px 0 #155e75;"><i class="ti ti-check"></i> Guardar</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR/EDITAR MARCA -->
<div id="modalMarca" class="modal-backdrop">
    <div class="modal-box" style="max-width:450px;">
        <div class="modal-header" style="background:linear-gradient(135deg, #6366f1, #4338ca); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-brand-apple"></i> <span id="modalMarcaTitulo">Nueva Marca</span></h3>
            <button class="modal-close" onclick="cerrarModalMarca()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_marca_id" type="hidden">
            <div class="form-row">
                <label>Nombre de la marca *</label>
                <input id="mod_marca_nombre" placeholder="Ej. Apple, Samsung, Xiaomi...">
            </div>
            <div class="form-row">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="mod_marca_activa" checked>
                    <span>Activa</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalMarca()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarMarca()" style="background:linear-gradient(180deg,#6366f1,#4338ca); box-shadow:0 4px 0 #3730a3;"><i class="ti ti-check"></i> Guardar</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR/EDITAR ROL -->
<div id="modalRol" class="modal-backdrop">
    <div class="modal-box" style="max-width:850px; width:95%;">
        <div class="modal-header" style="background:linear-gradient(135deg, #6366f1, #4338ca); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-shield"></i> <span id="modalRolTitulo">Nuevo Rol</span></h3>
            <button class="modal-close" onclick="cerrarModalRol()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body" style="max-height:80vh; overflow-y:auto;">
            <input id="mod_rol_id" type="hidden">
            
            <!-- Datos básicos -->
            <div class="form-row">
                <label>Nombre del rol *</label>
                <input id="mod_rol_nombre" placeholder="Ej. Supervisor de Taller, Cajero, Técnico junior...">
            </div>
            <div class="form-row">
                <label>Descripción</label>
                <textarea id="mod_rol_descripcion" rows="2" placeholder="Para qué sirve este rol..." style="resize:vertical;"></textarea>
            </div>
            
            <!-- Helpers -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin:15px 0 10px;">
                <button class="btn btn-light" onclick="rolToggleTodos(true)" style="padding:6px 12px; font-size:11px;"><i class="ti ti-check"></i> Marcar todos</button>
                <button class="btn btn-light" onclick="rolToggleTodos(false)" style="padding:6px 12px; font-size:11px;"><i class="ti ti-x"></i> Desmarcar todos</button>
            </div>
            
            <!-- Permisos por grupo -->
            <div id="permisosContainer">
                <!-- Grupos generados dinámicamente -->
            </div>
            
            <div class="form-row" style="margin-top:15px;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="mod_rol_activo" checked>
                    <span>Rol activo (disponible para asignar)</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalRol()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarRol()" style="background:linear-gradient(180deg,#6366f1,#4338ca); box-shadow:0 4px 0 #3730a3;"><i class="ti ti-check"></i> Guardar Rol</button>
        </div>
    </div>
</div>

<!-- MODAL: REASIGNAR TÉCNICO -->
<div id="modalReasignar" class="modal-backdrop modal-encima">
    <div class="modal-box" style="max-width:500px;">
        <div class="modal-header" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-user-share"></i> Reasignar a otro técnico</h3>
            <button class="modal-close" onclick="cerrarModalReasignar()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body">
            <input id="reasig_equipo_id" type="hidden">
            <div style="background:#fef3c7; border:1px solid #fcd34d; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; color:#92400e;">
                <b><i class="ti ti-info-circle"></i> El equipo pasará al nuevo técnico</b>, quien deberá recibirlo (con las piezas actuales o limpio para otra reparación).
            </div>
            <div class="form-row">
                <label>Nuevo técnico *</label>
                <div id="ss-reasig-tecnico"></div>
            </div>
            <div class="form-row">
                <label>Motivo de la reasignación *</label>
                <textarea id="reasig_motivo" rows="2" placeholder="Ej: El técnico anterior está ocupado, requiere especialista, etc." style="resize:vertical;"></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalReasignar()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarReasignacion()" style="background:linear-gradient(180deg,#f59e0b,#d97706); box-shadow:0 4px 0 #b45309;"><i class="ti ti-user-share"></i> Reasignar</button>
        </div>
    </div>
</div>

<!-- MODAL: REGISTRAR DEVOLUCIÓN -->
<div id="modalDevolucion" class="modal-backdrop">
    <div class="modal-box" style="max-width:850px; width:95%;">
        <div class="modal-header" style="background:linear-gradient(135deg, #dc2626, #991b1b); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-rotate-2"></i> Registrar Devolución</h3>
            <button class="modal-close" onclick="cerrarModalDevolucion()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body" style="max-height:80vh; overflow-y:auto;">
            <input id="dev_equipo_id" type="hidden">
            
            <!-- PASO 1: Seleccionar equipo despachado -->
            <h4 style="margin:0 0 8px; font-size:13px; color:#dc2626; text-transform:uppercase;"><i class="ti ti-search"></i> 1. Buscar equipo despachado</h4>
            <div class="form-row">
                <label>Selecciona el equipo que el cliente devolvió</label>
                <div id="ss-dev-equipo"></div>
                <small style="color:var(--text-muted); font-size:11px;">Busca por IMEI, modelo o cliente.</small>
            </div>
            
            <!-- INFO DEL EQUIPO (se carga al seleccionar) -->
            <div id="devInfoEquipo" style="display:none; margin-bottom:15px;"></div>
            
            <!-- PASO 2: Motivo y problemas -->
            <div id="devCamposExtras" style="display:none;">
                <h4 style="margin:15px 0 8px; font-size:13px; color:#dc2626; text-transform:uppercase;"><i class="ti ti-message"></i> 2. Motivo de la devolución</h4>
                <div class="form-row">
                    <label>¿Por qué devolvió el cliente? *</label>
                    <textarea id="dev_motivo" rows="2" placeholder="Ej. El equipo se apaga solo, no carga, etc." style="resize:vertical;"></textarea>
                </div>
                
                <h4 style="margin:15px 0 8px; font-size:13px; color:#dc2626; text-transform:uppercase;"><i class="ti ti-list-check"></i> 3. Problemas reportados</h4>
                <div style="background:#f8fafc; padding:10px; border-radius:8px; margin-bottom:10px;">
                    <p style="font-size:11px; color:var(--text-muted); margin:0 0 8px;">Selecciona los problemas que el cliente reportó (las fallas detectadas en evaluación):</p>
                    <div id="devProblemasChecklist" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:6px;"></div>
                </div>
                
                <!-- PASO 4: Cliente que devolvió (opcional) -->
                <div class="form-row">
                    <label>Cliente que devolvió (opcional)</label>
                    <input id="dev_cliente" placeholder="Nombre del cliente">
                </div>
                
                <!-- PASO 5: Re-asignar técnico -->
                <h4 style="margin:15px 0 8px; font-size:13px; color:#dc2626; text-transform:uppercase;"><i class="ti ti-user-plus"></i> 4. Asignar técnico para la nueva reparación</h4>
                <div class="form-row">
                    <label>Técnico a cargo (puede ser el mismo de antes)</label>
                    <div id="ss-dev-tecnico"></div>
                </div>
                
                <!-- Diagnóstico inicial opcional -->
                <div class="form-row">
                    <label>Diagnóstico inicial (opcional)</label>
                    <textarea id="dev_diagnostico" rows="2" placeholder="Tu primera impresión al revisar el equipo..." style="resize:vertical;"></textarea>
                </div>
                
                <!-- Aviso de qué pasará -->
                <div style="background:linear-gradient(135deg, #fef3c7, #fde68a); border:2px solid #f59e0b; padding:12px; border-radius:10px; font-size:12px; color:#78350f;">
                    <b><i class="ti ti-alert-triangle"></i> ¿Qué sucederá al guardar?</b>
                    <ul style="margin:6px 0 0 18px; padding:0; line-height:1.5;">
                        <li>El equipo cambiará a estado <b>"En Proceso"</b></li>
                        <li>Se incrementará el contador "Devuelto X veces"</li>
                        <li>El técnico verá el equipo en su panel con historial completo</li>
                        <li>Quedará registrado en el historial del equipo</li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalDevolucion()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarDevolucion()" style="background:linear-gradient(180deg,#dc2626,#991b1b); box-shadow:0 4px 0 #7f1d1d, 0 5px 10px rgba(220,38,38,0.3);"><i class="ti ti-check"></i> Registrar Devolución</button>
        </div>
    </div>
</div>

<!-- MODAL: ASIGNAR TÉCNICO A EQUIPO -->
<div id="modalAsignarTecnico" class="modal-backdrop">
    <div class="modal-box" style="max-width:550px;">
        <div class="modal-header" style="background:linear-gradient(135deg, #f59e0b, #ef4444); color:#fff; border-radius:12px 12px 0 0;">
            <h3 style="color:#fff;"><i class="ti ti-user-check"></i> Asignar Técnico</h3>
            <button class="modal-close" onclick="cerrarModalAsignarTecnico()" style="color:#fff;">✕</button>
        </div>
        <div class="modal-body">
            <input id="asign_equipo_id" type="hidden">
            <div id="asignEquipoInfo" style="background:#f1f5f9; padding:12px; border-radius:8px; margin-bottom:15px; font-size:13px;"></div>
            <div class="form-row">
                <label>Selecciona técnico</label>
                <div id="ss-asign-tecnico"></div>
            </div>
            <div class="form-row">
                <label>Notas para el técnico (opcional)</label>
                <textarea id="asign_notas" rows="3" placeholder="Instrucciones especiales..." style="resize:vertical;"></textarea>
            </div>
            <div style="background:#fef3c7; border:1px solid #fcd34d; padding:10px; border-radius:8px; font-size:12px; color:#92400e;">
                <b><i class="ti ti-alert-triangle"></i> Al asignar, el equipo pasa a estado "En Proceso".</b> El técnico verá este equipo en su lista de trabajo.
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalAsignarTecnico()">Cancelar</button>
            <button class="btn btn-blue" onclick="confirmarAsignarTecnico()"><i class="ti ti-check"></i> Asignar y pasar a Proceso</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR/EDITAR FALLA -->
<div id="modalFalla" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-alert-triangle"></i> <span id="modalFallaTitulo">Nueva Falla</span></h3>
            <button class="modal-close" onclick="cerrarModalFalla()">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_falla_id" type="hidden">
            <div class="form-row">
                <label>Categoría *</label>
                <select id="mod_falla_categoria"></select>
            </div>
            <div class="form-row">
                <label>Nombre completo de la falla *</label>
                <input id="mod_falla_nombre" placeholder="Ej. Pantalla rayada en esquina superior">
                <small style="color:var(--text-muted); font-size:11px;">Nombre que verás en la evaluación.</small>
            </div>
            <div class="form-row">
                <label>Nombre corto para label *</label>
                <input id="mod_falla_corto" placeholder="Ej. PANT RAYADA" maxlength="40" style="text-transform:uppercase;">
                <small style="color:var(--text-muted); font-size:11px;">Texto corto que sale impreso en el label adhesivo. Máximo 40 caracteres.</small>
            </div>
            <div class="form-row">
                <label>Descripción (opcional)</label>
                <textarea id="mod_falla_desc" rows="2" placeholder="Detalles adicionales..." style="resize:vertical;"></textarea>
            </div>
            <div class="form-row">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="mod_falla_activa" checked>
                    <span>Falla activa (disponible para usar)</span>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalFalla()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarFalla()"><i class="ti ti-check"></i> Guardar</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR PROVEEDOR -->
<div id="modalProveedor" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-truck"></i> <span id="modalProvTitulo">Crear Proveedor</span></h3>
            <button class="modal-close" onclick="cerrarModalProveedor()">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_prov_id" type="hidden">
            <div class="form-row"><label>Nombre / Empresa *</label><input id="mod_prov_nombre" placeholder="Ej. Juan Méndez / Mayorista RD"></div>
            <div class="form-row"><label>Contacto (Persona)</label><input id="mod_prov_contacto" placeholder="Persona de contacto"></div>
            <div class="form-row"><label>WhatsApp / Teléfono</label><input id="mod_prov_whatsapp" placeholder="809-000-0000"></div>
            <div class="form-row"><label>Ciudad / Ubicación</label><input id="mod_prov_ciudad" placeholder="Santo Domingo"></div>
            <div class="form-row">
                <label>Tipo de Proveedor</label>
                <select id="mod_prov_tipo">
                    <option>Particular</option>
                    <option>Mayorista</option>
                    <option>Subasta</option>
                    <option>Online</option>
                </select>
            </div>
            <div class="form-row">
                <label>Confiabilidad</label>
                <select id="mod_prov_confiabilidad">
                    <option>Por evaluar</option>
                    <option>Excelente</option>
                    <option>Buena</option>
                    <option>Regular</option>
                    <option>Mala</option>
                </select>
            </div>
            <div class="form-row"><label>Notas</label><textarea id="mod_prov_notas" rows="2" placeholder="Observaciones"></textarea></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalProveedor()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarProveedorModal()"><i class="ti ti-device-floppy"></i> Guardar Proveedor</button>
        </div>
    </div>
</div>

<!-- MODAL: CREAR ARTICULO -->
<div id="modalArticulo" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-database"></i> <span id="modalArtTitulo">Crear Artículo</span></h3>
            <button class="modal-close" onclick="cerrarModalArticulo()">✕</button>
        </div>
        <div class="modal-body">
            <input id="mod_art_id" type="hidden">
            <div class="form-row"><label>Código</label><input id="mod_art_codigo" value="AUTOMÁTICO" disabled></div>
            <div class="form-row"><label>Marca *</label>
                <input id="mod_art_marca" list="dl_marcas" placeholder="APPLE / SAMSUNG / XIAOMI" style="text-transform:uppercase;" autocomplete="off">
                <datalist id="dl_marcas"></datalist>
                <small style="color:var(--text-muted); font-size:11px;">Elige del catálogo o escribe una nueva.</small>
            </div>
            <div class="form-row"><label>Categoría</label>
                <input id="mod_art_categoria" list="dl_categorias" placeholder="CELULAR / TABLET / ACCESORIO" style="text-transform:uppercase;" autocomplete="off">
                <datalist id="dl_categorias"></datalist>
                <small style="color:var(--text-muted); font-size:11px;">Elige del catálogo o escribe una nueva.</small>
            </div>
            <div class="form-row"><label>Modelo *</label><input id="mod_art_modelo" placeholder="IPHONE 12 PRO MAX" style="text-transform:uppercase;"></div>
            <div class="form-row"><label>Capacidad</label><input id="mod_art_capacidad" placeholder="256GB / 128GB / 64GB" style="text-transform:uppercase;"></div>
            <div class="form-row"><label>Referencia</label><input id="mod_art_referencia" placeholder="REF DEL PROVEEDOR / CÓDIGO INTERNO" style="text-transform:uppercase;"></div>
            <div class="form-row" style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                <label style="margin-bottom:8px; display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-dark); text-transform:none; font-weight:600;">
                    <input type="checkbox" id="mod_art_lleva_imei" style="width:auto; min-height:auto;" checked>
                    Este artículo lleva IMEI / Serial obligatorio
                </label>
                <small style="color:var(--text-muted); font-size:11px; line-height:1.4; display:block;">⚠️ Desmarca si es un accesorio o producto sin IMEI (cables, fundas, baterías sueltas, etc.)</small>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalArticulo()">Cancelar</button>
            <button class="btn btn-blue" onclick="guardarArticuloModal()"><i class="ti ti-device-floppy"></i> Guardar Artículo</button>
        </div>
    </div>
</div>

<!-- MODAL: NUEVO PERFIL IMPRESORA -->
<div id="modalNuevoPerfil" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-plus"></i> Crear Nuevo Perfil de Impresora</h3>
            <button class="modal-close" onclick="cerrarModalNuevoPerfil()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-row">
                <label>Nombre del Perfil *</label>
                <input id="mod_perfil_nombre" placeholder="EJ: LABEL VENTA 50MM" style="text-transform:uppercase;">
            </div>
            <div style="background:#fef3c7; border:1px solid #fcd34d; padding:10px; border-radius:8px; font-size:12px; color:#92400e;">
                <i class="ti ti-info-circle"></i> Se creará con los valores ACTUALES de los sliders. Puedes ajustarlo después.
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalNuevoPerfil()">Cancelar</button>
            <button class="btn btn-blue" onclick="confirmarNuevoPerfil()"><i class="ti ti-device-floppy"></i> Crear Perfil</button>
        </div>
    </div>
</div>

<!-- MODAL: CONFIGURACIÓN IMPRESORA 2C-LP427B -->
<div id="modalConfigImpresora" class="modal-backdrop">
    <div class="modal-box" style="max-width:600px;">
        <div class="modal-header">
            <h3><i class="ti ti-settings"></i> Configurar Impresora 2C-LP427B</h3>
            <button class="modal-close" onclick="cerrarModalConfigImpresora()">✕</button>
        </div>
        <div class="modal-body">
            <div style="background:#dbeafe; border:1px solid #93c5fd; padding:12px; border-radius:8px; margin-bottom:15px; font-size:13px; color:#1e40af;">
                <b><i class="ti ti-info-circle"></i> Configuración inicial (solo 1 vez)</b><br>
                Sigue estos pasos para que los labels impriman al tamaño exacto sin márgenes.
            </div>
            
            <h4 style="margin:15px 0 8px 0; color:var(--blue-btn); font-size:13px;">📌 Paso 1: Configuración en Windows</h4>
            <ol style="font-size:13px; line-height:1.6; padding-left:20px; margin:0 0 15px 0;">
                <li>Ve a <b>Panel de Control</b> → <b>Dispositivos e Impresoras</b></li>
                <li>Clic derecho en <b>2C-LP427B</b> → <b>Preferencias de impresión</b></li>
                <li>En "Tamaño del papel" elige el tamaño de tu etiqueta (ej: 58mm × 40mm)</li>
                <li>En "Orientación" deja en <b>Vertical</b></li>
                <li>Clic en <b>Aceptar</b></li>
            </ol>
            
            <h4 style="margin:15px 0 8px 0; color:var(--blue-btn); font-size:13px;">📌 Paso 2: Configuración en Chrome (primera impresión)</h4>
            <ol style="font-size:13px; line-height:1.6; padding-left:20px; margin:0 0 15px 0;">
                <li>Llena los datos del label en este sistema</li>
                <li>Ajusta el ancho con el <b>slider de calibración</b> (lo recuerda automáticamente)</li>
                <li>Clic en <b>"Imprimir en Label Printer"</b></li>
                <li>En el diálogo de Chrome:
                    <ul style="margin:6px 0;">
                        <li>Destino: selecciona <b>2C-LP427B</b></li>
                        <li>Páginas: <b>Todas</b></li>
                        <li>Diseño: <b>Vertical</b></li>
                        <li>Color: <b>Blanco y negro</b></li>
                        <li><b>Más ajustes</b> → Márgenes: <b>Ninguno</b></li>
                        <li><b>Más ajustes</b> → Escala: <b>100</b> o <b>Tamaño real</b></li>
                        <li>Desmarca <b>"Encabezados y pies de página"</b></li>
                    </ul>
                </li>
                <li>Clic en <b>Imprimir</b></li>
            </ol>
            
            <div style="background:#d1fae5; border:1px solid #86efac; padding:12px; border-radius:8px; font-size:13px; color:#065f46;">
                <b><i class="ti ti-check"></i> Después de la primera impresión:</b><br>
                Chrome recordará la configuración. Las siguientes veces solo será: clic en Imprimir → clic en botón Imprimir del diálogo. ¡2 clicks!
            </div>
            
            <h4 style="margin:15px 0 8px 0; color:var(--blue-btn); font-size:13px;">🔧 Si el label sale mal</h4>
            <ul style="font-size:13px; line-height:1.6; padding-left:20px; margin:0;">
                <li><b>Sale cortado:</b> Reduce el ancho con el slider (intenta 50mm o 55mm)</li>
                <li><b>Sale muy chico:</b> Aumenta el tamaño de letra con el slider</li>
                <li><b>Código de barras no se ve:</b> Aumenta la altura del barcode</li>
                <li><b>Sale en blanco:</b> Verifica que la impresora esté seleccionada en Chrome</li>
                <li><b>Sale con texto raro arriba:</b> En Chrome desmarca "Encabezados y pies de página"</li>
            </ul>
        </div>
        <div class="modal-footer">
            <button class="btn btn-blue" onclick="cerrarModalConfigImpresora()" style="width:100%;">Entendido</button>
        </div>
    </div>
</div>

<!-- MODAL: NUEVA COMPRA -->
<div id="modalNuevaCompra" class="modal-backdrop">
    <div class="modal-box">
        <div class="modal-header">
            <h3><i class="ti ti-shopping-cart-plus"></i> Nueva Compra</h3>
            <button class="modal-close" onclick="cerrarModalNuevaCompra()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-row">
                <label>Proveedor *</label>
                <div style="display:flex; gap:6px; align-items:stretch;">
                    <div id="ss-compra-proveedor" style="flex:1;"></div>
                    <button class="quick-add-btn" onclick="abrirModalProveedor()" title="Crear nuevo proveedor" style="flex-shrink:0;">+</button>
                </div>
            </div>
            <div class="form-row">
                <label>Fecha de Compra</label>
                <input id="mod_compra_fecha" type="date">
            </div>
            <div class="form-row">
                <label>Notas / Comentario</label>
                <textarea id="mod_compra_notas" rows="2" placeholder="Ej: 53 dispositivos incluyendo apple watch"></textarea>
            </div>
            <div style="background:#f0fdf4; border:1px solid #86efac; padding:10px; border-radius:8px; font-size:12px; color:#166534;">
                <i class="ti ti-info-circle"></i> Después de crear la compra agregarás los equipos uno por uno con su IMEI.
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-light" onclick="cerrarModalNuevaCompra()">Cancelar</button>
            <button class="btn btn-blue" onclick="crearNuevaCompra()"><i class="ti ti-device-floppy"></i> Crear Compra</button>
        </div>
    </div>
</div>

<!-- MODAL: PREVIEW LABELS DIAGNÓSTICO -->
<div id="modalLabelDiag" class="modal-backdrop">
    <div class="modal-box" style="max-width:600px;">
        <div class="modal-header">
            <h3><i class="ti ti-printer"></i> <span id="modalLabelTitulo">Vista Previa del Label</span></h3>
            <button class="modal-close" onclick="cerrarModalLabelDiag()">✕</button>
        </div>
        <div class="modal-body" style="background:#f1f5f9;">
            <div id="labelDiagPreview" style="display:flex; flex-direction:column; gap:10px; align-items:center; max-height:60vh; overflow-y:auto;"></div>
            <p style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:10px;" id="labelDiagInfo"></p>
        </div>
        <div class="modal-footer" style="flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px; margin-right:auto;">
                <label style="margin:0; white-space:nowrap;">Copias c/u:</label>
                <input type="number" id="diag_copias" value="1" min="1" max="50" style="width:70px; font-weight:700; min-height:auto; padding:8px;">
            </div>
            <button class="btn btn-light" onclick="cerrarModalLabelDiag()">Cancelar</button>
            <button class="btn btn-blue" onclick="confirmarImprimirLabelDiag()"><i class="ti ti-printer"></i> Imprimir Ahora</button>
        </div>
    </div>
</div>

<div id="toast" class="toast"></div>
<div id="printArea" class="print-area"></div>

<script>
const CONFIG_URL = "https://vkhwdvjtowrhkhqavnvk.supabase.co";
const CONFIG_KEY = "sb_publishable_PynS5ZjKoQ36HCpguVzxaw_KZOlagtz"; 
const supabaseClient = supabase.createClient(CONFIG_URL, CONFIG_KEY);

/* ============================================================
   AUTO-INYECTAR BOTÓN "VOLVER" EN TODOS LOS MODALES
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    inyectarBotonesVolver();
});

function inyectarBotonesVolver() {
    document.querySelectorAll('.modal-close').forEach(btnX => {
        const header = btnX.parentElement;
        if(!header || header.querySelector('.modal-back-btn')) return; // ya tiene
        
        // Capturar el handler original del X
        const onclickAttr = btnX.getAttribute('onclick') || '';
        
        // Crear botón Volver con el mismo handler
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'modal-back-btn';
        backBtn.setAttribute('onclick', onclickAttr);
        backBtn.innerHTML = '<i class="ti ti-arrow-left"></i> Volver';
        
        // Wrappear el h3 en un div izquierdo
        const h3 = header.querySelector('h3');
        if(h3) {
            const leftDiv = document.createElement('div');
            leftDiv.className = 'modal-header-left';
            // Mover el h3 al div izquierdo
            header.insertBefore(leftDiv, h3);
            leftDiv.appendChild(h3);
        }
        
        // Insertar Volver justo antes del X
        header.insertBefore(backBtn, btnX);
    });
}

let sessionUser = null;
let cache = { ordenes: [], clientes: [], equipos: [], piezas: [], activos: [], refurb: [], proveedores: [], lotes: [], articulos: [], fallaCategorias: [], fallas: [], tecnicos: [] };
let proveedorActualId = null;
let loteActualId = null;
let refreshTimer = null;

function logError(context, error) { console.error(`[BAYOL CELL] ${context}:`, error); }
function getFriendlyError(error, fallback) { return error?.message || fallback || "Error inesperado."; }
function requireSupabaseOk(response, context) {
    if(response?.error) { logError(context, response.error); throw response.error; }
    return response;
}
function toast(msg) {
    const t = document.getElementById("toast");
    if(t) { t.textContent = msg; t.style.display = "block"; setTimeout(() => t.style.display = "none", 3000); }
}
function escapeHtml(s) { return (s ?? "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])); }

/* ============================================================
   NOTIFICACIONES CON SONIDO (Web Audio API)
   ============================================================ */
let _audioCtx = null;
let _audioHabilitado = false;
let _notifConfig = { activadas: localStorage.getItem('bayol_notif') !== 'off' };

// Inicializa el audio tras el primer toque del usuario (requerido por navegadores)
function activarAudioNotif() {
    if(_audioHabilitado) return;
    try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        _audioHabilitado = true;
        // Pedir permiso de notificaciones del sistema
        if('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } catch(e) { /* silencioso */ }
}

// Reproduce un tono. tipo: 'orden' | 'pieza' | 'finalizado'
function reproducirSonido(tipo) {
    if(!_audioHabilitado || !_audioCtx || !_notifConfig.activadas) return;
    try {
        const ctx = _audioCtx;
        // Definición de cada sonido (frecuencias y duración distintas)
        const sonidos = {
            orden:      [{f:880, t:0},  {f:1180, t:0.12}],            // ding-dong agudo (nueva orden)
            pieza:      [{f:660, t:0},  {f:660, t:0.15}],             // doble beep medio (pieza)
            finalizado: [{f:523, t:0},  {f:659, t:0.1}, {f:784, t:0.2}] // acorde ascendente (éxito)
        };
        const notas = sonidos[tipo] || sonidos.orden;
        notas.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = n.f;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.t);
            gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + n.t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.t + 0.18);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(ctx.currentTime + n.t);
            osc.stop(ctx.currentTime + n.t + 0.2);
        });
    } catch(e) { /* silencioso */ }
}

// Notificación completa: sonido + toast + notificación del sistema
function notificar(tipo, titulo, mensaje) {
    if(!_notifConfig.activadas) return;
    reproducirSonido(tipo);
    toast(mensaje || titulo);
    // Notificación del sistema (si la pestaña no está visible y hay permiso)
    try {
        if('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const iconos = { orden: '🔔', pieza: '📦', finalizado: '✅' };
            new Notification(`${iconos[tipo] || '🔔'} ${titulo}`, { body: mensaje || '', tag: 'bayol-' + tipo });
        }
    } catch(e) { /* silencioso */ }
}

// Activar/desactivar notificaciones
function toggleNotificaciones() {
    _notifConfig.activadas = !_notifConfig.activadas;
    localStorage.setItem('bayol_notif', _notifConfig.activadas ? 'on' : 'off');
    if(_notifConfig.activadas) { activarAudioNotif(); reproducirSonido('orden'); toast('🔔 Notificaciones activadas'); }
    else toast('🔕 Notificaciones desactivadas');
    actualizarBotonNotif();
}
function actualizarBotonNotif() {
    const b = document.getElementById('btnNotif');
    if(b) b.innerHTML = _notifConfig.activadas ? '<i class="ti ti-bell"></i>' : '<i class="ti ti-bell-off"></i>';
}

// Activar audio al primer toque/clic en cualquier parte
document.addEventListener('click', activarAudioNotif, { once: true });
document.addEventListener('touchstart', activarAudioNotif, { once: true });

function money(n) { return "RD$ " + Number(n || 0).toLocaleString("es-DO", { minimumFractionDigits: 2 }); }
function getChecked(id) { return [...document.querySelectorAll("#" + id + " input:checked")].map(x => x.value).join(", "); }
function val(id) { return document.getElementById(id)?.value?.trim() || ""; }

/* ============================================================
   RESALTAR ITEM NUEVO con animación + scroll suave
   ============================================================ */
function resaltarItemNuevo(itemId) {
    if(!itemId) return;
    // Espera un tick para que el DOM se actualice tras el render
    setTimeout(() => {
        const elementos = document.querySelectorAll(`[data-item-id="${itemId}"]`);
        elementos.forEach(el => {
            el.classList.add('item-nuevo');
            // Hacer scroll suave hacia el item
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch(e) { /* algunos browsers viejos */ }
            // Quitar la clase después de la animación
            setTimeout(() => el.classList.remove('item-nuevo'), 700);
        });
    }, 100);
}

/* ============================================================
   SMART SELECT - Buscador inteligente reutilizable
   ============================================================ */
const _smartSelects = {}; // Registro de smart-selects activos por containerId

/**
 * Inicializa un smart-select dentro de un container.
 * options = {
 *   containerId: 'mi-container',
 *   placeholder: 'Buscar...',
 *   items: [{id, label, sub, search, meta}], // search = string concatenado para buscar
 *   value: 'id-actual' (opcional),
 *   onChange: function(id, item) {},
 *   onCreate: function(query) {} (opcional, muestra "+ Crear nuevo"),
 *   createLabel: '+ Crear nuevo' (opcional)
 * }
 */
function smartSelectInit(options) {
    const cont = document.getElementById(options.containerId);
    if(!cont) return;
    
    const state = {
        items: options.items || [],
        value: options.value || '',
        query: '',
        highlightIdx: -1,
        onChange: options.onChange || (() => {}),
        onCreate: options.onCreate,
        createLabel: options.createLabel || '+ Crear nuevo'
    };
    _smartSelects[options.containerId] = state;
    
    const selected = state.items.find(i => i.id === state.value);
    cont.innerHTML = `
        <div class="smart-select" id="${options.containerId}-ss">
            <i class="ti ti-search smart-select-icon"></i>
            <input type="text" class="smart-select-input" id="${options.containerId}-input" 
                placeholder="${escapeHtml(options.placeholder || 'Buscar...')}" 
                value="${selected ? escapeHtml(selected.label) : ''}"
                autocomplete="off">
            ${selected ? `<button type="button" class="smart-select-clear" onclick="smartSelectClear('${options.containerId}')" title="Limpiar">×</button>` : ''}
            <div class="smart-select-dropdown" id="${options.containerId}-dropdown"></div>
        </div>
    `;
    
    const input = document.getElementById(options.containerId + '-input');
    const ss = document.getElementById(options.containerId + '-ss');
    
    input.addEventListener('focus', () => {
        state.query = '';
        input.select();
        ss.classList.add('open');
        smartSelectRenderDropdown(options.containerId);
    });
    
    input.addEventListener('input', e => {
        state.query = e.target.value.trim().toLowerCase();
        state.highlightIdx = -1;
        ss.classList.add('open');
        smartSelectRenderDropdown(options.containerId);
    });
    
    input.addEventListener('keydown', e => {
        const filtered = smartSelectFilter(state);
        if(e.key === 'ArrowDown') {
            e.preventDefault();
            state.highlightIdx = Math.min(state.highlightIdx + 1, filtered.length - 1);
            smartSelectRenderDropdown(options.containerId);
        } else if(e.key === 'ArrowUp') {
            e.preventDefault();
            state.highlightIdx = Math.max(state.highlightIdx - 1, 0);
            smartSelectRenderDropdown(options.containerId);
        } else if(e.key === 'Enter') {
            e.preventDefault();
            if(state.highlightIdx >= 0 && filtered[state.highlightIdx]) {
                smartSelectPick(options.containerId, filtered[state.highlightIdx].id);
            }
        } else if(e.key === 'Escape') {
            ss.classList.remove('open');
            input.blur();
        }
    });
    
    // Cerrar al clic afuera
    document.addEventListener('click', e => {
        if(!ss.contains(e.target)) ss.classList.remove('open');
    });
}

function smartSelectFilter(state) {
    if(!state.query) return state.items;
    const q = state.query;
    // Búsqueda inteligente: divide query en palabras y todas deben estar en el search
    const palabras = q.split(/\s+/).filter(p => p.length > 0);
    return state.items.filter(item => {
        const haystack = (item.search || item.label || '').toLowerCase();
        return palabras.every(p => haystack.includes(p));
    });
}

function smartSelectHighlight(text, query) {
    if(!query) return escapeHtml(text);
    const safe = escapeHtml(text);
    const palabras = query.split(/\s+/).filter(p => p.length > 0);
    let result = safe;
    palabras.forEach(p => {
        const regex = new RegExp('(' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        result = result.replace(regex, '<mark class="ss-hl">$1</mark>');
    });
    return result;
}

function smartSelectRenderDropdown(containerId) {
    const state = _smartSelects[containerId];
    if(!state) return;
    const dd = document.getElementById(containerId + '-dropdown');
    if(!dd) return;
    
    const filtered = smartSelectFilter(state);
    
    if(filtered.length === 0) {
        dd.innerHTML = `<div class="smart-select-empty">
            Sin resultados${state.query ? ' para "<b>' + escapeHtml(state.query) + '</b>"' : ''}
            ${state.onCreate && state.query ? `<br><button onclick="smartSelectCreate('${containerId}')">${escapeHtml(state.createLabel)}</button>` : ''}
        </div>`;
        return;
    }
    
    dd.innerHTML = filtered.slice(0, 50).map((item, idx) => {
        const isSelected = item.id === state.value;
        const isHl = idx === state.highlightIdx;
        return `<div class="smart-select-item ${isSelected ? 'selected' : ''} ${isHl ? 'highlighted' : ''}" 
            onclick="smartSelectPick('${containerId}', '${item.id}')">
            <div class="smart-select-item-title">${smartSelectHighlight(item.label || '', state.query)}${item.meta ? '<span class="smart-select-item-meta">' + escapeHtml(item.meta) + '</span>' : ''}</div>
            ${item.sub ? `<div class="smart-select-item-sub">${smartSelectHighlight(item.sub, state.query)}</div>` : ''}
        </div>`;
    }).join('');
}

function smartSelectPick(containerId, id) {
    const state = _smartSelects[containerId];
    if(!state) return;
    const item = state.items.find(i => i.id === id);
    if(!item) return;
    state.value = id;
    state.query = '';
    const input = document.getElementById(containerId + '-input');
    const ss = document.getElementById(containerId + '-ss');
    if(input) input.value = item.label;
    if(ss) ss.classList.remove('open');
    
    // Re-render para mostrar botón X
    smartSelectRefreshUI(containerId);
    state.onChange(id, item);
}

function smartSelectClear(containerId) {
    const state = _smartSelects[containerId];
    if(!state) return;
    state.value = '';
    state.query = '';
    const input = document.getElementById(containerId + '-input');
    if(input) input.value = '';
    smartSelectRefreshUI(containerId);
    state.onChange('', null);
}

function smartSelectRefreshUI(containerId) {
    const state = _smartSelects[containerId];
    if(!state) return;
    const ss = document.getElementById(containerId + '-ss');
    if(!ss) return;
    const selected = state.items.find(i => i.id === state.value);
    const existingClear = ss.querySelector('.smart-select-clear');
    if(selected && !existingClear) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'smart-select-clear';
        btn.setAttribute('onclick', `smartSelectClear('${containerId}')`);
        btn.title = 'Limpiar';
        btn.textContent = '×';
        ss.querySelector('.smart-select-input').after(btn);
    } else if(!selected && existingClear) {
        existingClear.remove();
    }
}

function smartSelectGetValue(containerId) {
    return _smartSelects[containerId]?.value || '';
}

function smartSelectSetValue(containerId, id) {
    const state = _smartSelects[containerId];
    if(!state) return;
    state.value = id || '';
    const item = state.items.find(i => i.id === id);
    const input = document.getElementById(containerId + '-input');
    if(input) input.value = item ? item.label : '';
    smartSelectRefreshUI(containerId);
}

function smartSelectUpdateItems(containerId, items) {
    const state = _smartSelects[containerId];
    if(!state) return;
    state.items = items;
    smartSelectRenderDropdown(containerId);
}

function smartSelectCreate(containerId) {
    const state = _smartSelects[containerId];
    if(!state || !state.onCreate) return;
    const q = state.query;
    const ss = document.getElementById(containerId + '-ss');
    if(ss) ss.classList.remove('open');
    state.onCreate(q);
}

/* ============================================================
   IMPRESIÓN CENTRAL ESTABLE (evita congelamiento en kiosk)
   ============================================================ */
let _imprimiendo = false;

async function imprimirContenido(htmlContenido, copias, anchoMm, altoMm, tipo) {
    // Evitar doble disparo que congela kiosk
    if(_imprimiendo) return;
    _imprimiendo = true;
    
    copias = parseInt(copias) || 1;
    if(copias < 1) copias = 1;
    if(copias > 50) copias = 50;
    tipo = tipo || 'labels';
    
    // INTENTO 1: Imprimir directo por QZ Tray (sin diálogo, como InfoPlus)
    const impresoraQz = (tipo === 'tickets') ? qzImpresoraTickets() : qzImpresoraLabels();
    if(_qzConectado && impresoraQz) {
        const ok = await qzImprimirHtml(htmlContenido, anchoMm, altoMm, copias, tipo);
        if(ok) {
            toast('Impreso (' + copias + ' copia' + (copias > 1 ? 's' : '') + ')');
            _imprimiendo = false;
            return;
        }
        // Si QZ falla, sigue al método de navegador abajo
    }
    
    // INTENTO 2 (respaldo): Método del navegador con diálogo
    const printArea = document.getElementById('printArea');
    if(!printArea) { _imprimiendo = false; return; }
    
    let contenidoFinal = '';
    for(let i = 0; i < copias; i++) {
        contenidoFinal += `<div style="page-break-after: always;">${htmlContenido}</div>`;
    }
    printArea.innerHTML = contenidoFinal;
    
    const lanzarImpresion = () => {
        window.print();
        setTimeout(() => {
            printArea.innerHTML = '';
            _imprimiendo = false;
        }, 500);
    };
    
    if(document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            setTimeout(lanzarImpresion, 150);
        }).catch(() => {
            setTimeout(lanzarImpresion, 300);
        });
    } else {
        setTimeout(lanzarImpresion, 300);
    }
}

async function doLogin() {
    try {
        const u = val("loginUser"), p = val("loginPass");
        if(!u || !p) return alert("Ingrese datos.");
        
        // 1. Buscar primero en usuarios (admin)
        const { data: usuariosData, error: errU } = await supabaseClient
            .from('usuarios').select('*').eq('usuario', u).eq('clave', p).eq('activo', true).limit(1);
        if(errU) throw errU;
        
        if(usuariosData && usuariosData.length) {
            sessionUser = usuariosData[0];
            sessionUser._tipo = 'usuario';
            localStorage.setItem("bayol_session", JSON.stringify(sessionUser));
            startApp();
            return;
        }
        
        // 2. Buscar en técnicos
        const { data: tecData, error: errT } = await supabaseClient
            .from('tecnicos').select('*').eq('usuario', u).eq('clave', p).eq('activo', true).limit(1);
        if(errT) throw errT;
        
        if(tecData && tecData.length) {
            const tec = tecData[0];
            sessionUser = tec;
            sessionUser._tipo = 'tecnico';
            // Cargar el rol y permisos del técnico
            if(tec.rol_id) {
                try {
                    const { data: rolData } = await supabaseClient.from('roles_taller').select('*').eq('id', tec.rol_id).limit(1);
                    if(rolData && rolData.length) sessionUser._permisos = rolData[0].permisos || {};
                } catch(e) { logError('Cargar permisos login', e); }
            }
            localStorage.setItem("bayol_session", JSON.stringify(sessionUser));
            // Registrar último acceso
            try { await supabaseClient.from('tecnicos').update({ ultimo_acceso: new Date().toISOString() }).eq('id', tec.id); } catch(e) {}
            
            // Si debe cambiar clave en primer login
            if(tec.debe_cambiar_clave) {
                startApp();
                setTimeout(() => abrirModalCambiarClave(true), 500);
            } else {
                startApp();
            }
            return;
        }
        
        alert("Usuario o contraseña incorrectos.");
    } catch(e) { logError("Login", e); alert("Error de autenticación."); }
}

function logout() { localStorage.removeItem("bayol_session"); location.reload(); }

function isAdminUser() {
    // Si es del tipo usuario, usar la lógica vieja
    if(sessionUser?._tipo === 'usuario' || !sessionUser?._tipo) {
        const role = (sessionUser?.rol || sessionUser?.nivel_acceso || sessionUser?.nivel || "").toString().trim().toLowerCase();
        return ["admin", "administrador", "superadmin"].includes(role);
    }
    // Si es técnico, es admin solo si su rol simple es admin
    const role = (sessionUser?.rol || "").toString().trim().toLowerCase();
    return ["admin", "administrador", "superadmin"].includes(role);
}

/* ============================================================
   SISTEMA DE PERMISOS
   ============================================================ */
function tienePermiso(permiso) {
    // Admin (usuario tradicional o técnico admin) tiene todo
    if(isAdminUser()) return true;
    // Si no tiene permisos cargados, denegar por defecto (excepto lo básico)
    const permisos = sessionUser?._permisos || {};
    return permisos[permiso] === true;
}

// Devuelve el HTML del botón solo si el usuario tiene el permiso. Si no, cadena vacía.
function permBtn(permiso, htmlBoton) {
    return tienePermiso(permiso) ? htmlBoton : '';
}
// Alias legible
function puedeVer(permiso) { return tienePermiso(permiso); }

// Verifica que sea admin (o tenga permiso de aprobar) antes de una acción de gestión.
// Devuelve true si puede; si no, avisa y devuelve false. Defensa en profundidad.
function soloAdmin(accion) {
    if(isAdminUser() || tienePermiso('piezas_aprobar_extra')) return true;
    alert(`Solo el administrador puede ${accion || 'realizar esta acción'}. El técnico no tiene este permiso.`);
    return false;
}

/* ============================================================
   CAMBIAR CONTRASEÑA
   ============================================================ */
let _cambioClaveObligatorio = false;

function abrirModalCambiarClave(obligatorio = false) {
    _cambioClaveObligatorio = obligatorio;
    document.getElementById('cc_nueva').value = '';
    document.getElementById('cc_confirmar').value = '';
    document.getElementById('cambiarClaveAviso').style.display = obligatorio ? 'block' : 'none';
    document.getElementById('cc_cancelar').style.display = obligatorio ? 'none' : 'inline-flex';
    document.getElementById('modalCambiarClave').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalCambiarClave() {
    if(_cambioClaveObligatorio) {
        alert('Debes cambiar tu contraseña para continuar.');
        return;
    }
    document.getElementById('modalCambiarClave').classList.remove('active');
}

async function guardarNuevaClave() {
    const nueva = document.getElementById('cc_nueva').value.trim();
    const confirmar = document.getElementById('cc_confirmar').value.trim();
    
    if(!nueva || nueva.length < 4) return alert('La contraseña debe tener al menos 4 caracteres.');
    if(nueva !== confirmar) return alert('Las contraseñas no coinciden.');
    
    try {
        const tabla = sessionUser._tipo === 'tecnico' ? 'tecnicos' : 'usuarios';
        const { error } = await supabaseClient
            .from(tabla)
            .update({ clave: nueva, debe_cambiar_clave: false })
            .eq('id', sessionUser.id);
        if(error) throw error;
        
        sessionUser.clave = nueva;
        sessionUser.debe_cambiar_clave = false;
        localStorage.setItem("bayol_session", JSON.stringify(sessionUser));
        
        _cambioClaveObligatorio = false;
        document.getElementById('modalCambiarClave').classList.remove('active');
        toast('✅ Contraseña actualizada correctamente.');
    } catch(e) {
        logError('Cambiar clave', e);
        alert(getFriendlyError(e));
    }
}

function applyAccessControls() {
    const assetsCard = document.getElementById("assetsAdminCard");
    if(assetsCard) assetsCard.style.display = isAdminUser() ? "block" : "none";
    
    // Admin ve todo, no aplicar restricciones
    if(isAdminUser()) {
        document.querySelectorAll('.nav button').forEach(b => b.style.display = '');
        return;
    }
    
    // MODO "SOLO MI TRABAJO": el técnico solo ve esa pantalla
    if(tienePermiso('solo_mi_trabajo')) {
        document.querySelectorAll('.nav button').forEach(b => {
            b.style.display = (b.id === 'menu-miTrabajo') ? '' : 'none';
        });
        // Ocultar el botón de menú (no hay a dónde navegar) y cerrar el sidebar
        const toggle = document.querySelector('.menu-toggle');
        if(toggle) toggle.style.display = 'none';
        if(typeof closeSidebar === 'function') closeSidebar();
        // Asegurar que el scroll quede libre (por si el backdrop trabó la página)
        document.body.style.overflow = '';
        document.body.style.position = '';
        // Navegar a Mi Trabajo SOLO si no estamos ya ahí (evita bucle de scroll)
        const yaEnMiTrabajo = document.getElementById('v-miTrabajo')?.classList.contains('active');
        if(!yaEnMiTrabajo) setTimeout(() => nav('miTrabajo'), 100);
        return;
    }
    
    // MODO "SOLO ATENCIÓN AL CLIENTE": servicio solo ve esa pantalla (+ recepción para recibir)
    if(tienePermiso('solo_atencion')) {
        document.querySelectorAll('.nav button').forEach(b => {
            b.style.display = (b.id === 'menu-atencion' || b.id === 'menu-recepcion') ? '' : 'none';
        });
        if(typeof closeSidebar === 'function') closeSidebar();
        document.body.style.overflow = '';
        document.body.style.position = '';
        const yaEnAtencion = document.getElementById('v-atencion')?.classList.contains('active');
        const yaEnRecepcion = document.getElementById('v-recepcion')?.classList.contains('active');
        if(!yaEnAtencion && !yaEnRecepcion) setTimeout(() => nav('atencion'), 100);
        return;
    }
    
    // Mapeo de items de menú → permiso requerido
    const menuPermisos = {
        'menu-dashboard': 'ver_dashboard',
        'menu-miTrabajo': null,
        'menu-recepcion': 'recepcion_ver',
        'menu-ordenes': 'ordenes_ver',
        'menu-inventario': 'inventario_ver',
        'menu-piezasSolicitadas': 'inventario_ver',
        'menu-etiquetas': 'imprimir_diag',
        'menu-configImpresora': 'config_impresora',
        'menu-articulos': 'catalogo_articulos',
        'menu-proveedores': 'compras_ver',
        'menu-refurb': 'reacond_ver',
        'menu-reportes': 'reportes_ver',
        'menu-configuracion': 'config_ver'
    };
    
    Object.keys(menuPermisos).forEach(menuId => {
        const btn = document.getElementById(menuId);
        if(!btn) return;
        const permisoReq = menuPermisos[menuId];
        // Si no requiere permiso específico, mostrar siempre. Si requiere, verificar.
        if(permisoReq === null) {
            btn.style.display = '';
        } else {
            btn.style.display = tienePermiso(permisoReq) ? '' : 'none';
        }
    });
    
    // Ocultar botones estáticos según permiso
    const botonesEstaticos = {
        'btnNuevoTecnico': 'config_tecnicos',
        'btnNuevoRol': 'config_roles',
        'btnRegistrarDevolucion': 'devoluciones_registrar',
        'accion-recepcion': 'recepcion_ver',
        'accion-compras': 'compras_ver',
        'accion-articulos': 'catalogo_articulos',
        'accion-refurb': 'reacond_ver'
    };
    Object.keys(botonesEstaticos).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if(btn) btn.style.display = tienePermiso(botonesEstaticos[btnId]) ? '' : 'none';
    });
    
    // Si el dashboard está oculto, llevar al técnico a reacondicionado por defecto
    if(!tienePermiso('ver_dashboard') && tienePermiso('reacond_ver')) {
        setTimeout(() => nav('refurb'), 100);
    }
}

function setActiveNav(v) {
    document.querySelectorAll(".nav button").forEach(x => {
        const target = x.getAttribute("onclick") || "";
        x.classList.toggle("active", target.includes("nav('" + v + "'") || target.includes('nav("' + v + '"'));
    });
}

function startApp() {
    document.body.classList.add("logged-in");
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("userName").textContent = sessionUser.nombre || "Operador";
    document.getElementById("userAvatar").textContent = (sessionUser.nombre || "B").charAt(0).toUpperCase();
    document.getElementById("userRole").textContent = sessionUser.rol || sessionUser.nivel_acceso || sessionUser.nivel || "Técnico";
    applyAccessControls();
    actualizarBotonNotif();
    startAppRefurbPoller();
    qzAutoConectar();
    loadAll().then(() => {
        // Mostrar ventana de pendientes al técnico (una vez por sesión)
        if(!sessionStorage.getItem('bayol_pendientes_visto')) {
            setTimeout(() => { mostrarPendientesTecnico(); sessionStorage.setItem('bayol_pendientes_visto', '1'); }, 800);
        }
    });
}

// Mapa de vista → permiso requerido para entrar
const NAV_PERMISOS = {
    'dashboard': 'ver_dashboard',
    'miTrabajo': null,
    'atencion': null,
    'recepcion': 'recepcion_ver',
    'ordenes': 'ordenes_ver',
    'inventario': 'inventario_ver',
    'piezasSolicitadas': 'inventario_ver',
    'etiquetas': 'imprimir_diag',
    'configImpresora': 'config_impresora',
    'articulos': 'catalogo_articulos',
    'proveedores': 'compras_ver',
    'refurb': 'reacond_ver',
    'reportes': 'reportes_ver',
    'configuracion': 'config_ver'
};

function nav(v, btn) {
    // PORTERO CENTRAL: verifica permiso antes de entrar (sin importar de dónde venga el clic)
    const permisoReq = NAV_PERMISOS[v];
    if(permisoReq && !tienePermiso(permisoReq)) {
        toast('🔒 No tienes permiso para acceder a esta sección.');
        return; // bloquea el acceso
    }
    
    document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
    document.getElementById("v-" + v)?.classList.add("active");
    if(btn) {
        document.querySelectorAll(".nav button").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
    } else {
        setActiveNav(v);
    }
    const activeBtn = btn || document.querySelector(".nav button.active");
    document.getElementById("pageTitle").textContent = activeBtn ? activeBtn.textContent.trim() : v;
    if(v === 'etiquetas') { setTimeout(cargarCalibracionLabelVenta, 50); }
    if(v === 'configImpresora') { setTimeout(() => { inicializarConfigImpresora(); qzVerificarConexion(); }, 50); }
    if(v === 'proveedores') { volverListaProveedores(); }
    if(v === 'refurb') { setTimeout(() => { volverListaLotesReacond(); cargarLotesReacond(); }, 50); }
    if(v === 'configuracion') { setTimeout(() => { cambiarMainTabConfig('tecnicos'); }, 50); }
    if(v === 'reportes') { setTimeout(() => { inicializarReportes(); }, 50); }
    if(v === 'miTrabajo') { setTimeout(() => { renderMiTrabajo(); }, 50); }
    if(v === 'atencion') { setTimeout(() => { renderAtencionCliente(); }, 50); }
    if(v === 'recepcion') { setTimeout(() => { if(typeof renderRecepcionesRealizadas === 'function') renderRecepcionesRealizadas(); if(typeof refrescarChecklistRecepcion === 'function') refrescarChecklistRecepcion(); }, 50); }
    if(v === 'piezasSolicitadas') { setTimeout(() => { if(typeof renderPiezasSolicitadas === 'function') renderPiezasSolicitadas(); }, 50); }
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Re-aplicar permisos de botones estáticos tras renderizar (NO en modo solo-mi-trabajo, causa bucle)
    if(!isAdminUser() && !tienePermiso('solo_mi_trabajo') && !tienePermiso('solo_atencion')) setTimeout(() => applyAccessControls(), 150);
}

/* ============================================================
   SIDEBAR MÓVIL
   ============================================================ */
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if(sb.classList.contains('open')) closeSidebar();
    else { sb.classList.add('open'); bd.classList.add('active'); }
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
}

async function loadAll() {
    try {
        const [rOrd, rCli, rEq, rPz, rAct, rRef, rProv, rLot, rArt, rTec, rUsr, rOpz, rTk, rPzR, rFC] = await Promise.all([
            supabaseClient.from('ordenes_reparacion').select('*').order('creado_en', { ascending: false }),
            supabaseClient.from('clientes').select('*'),
            supabaseClient.from('equipos').select('*'),
            supabaseClient.from('piezas_inventario').select('*').order('codigo', { ascending: true }),
            isAdminUser() ? supabaseClient.from('activos_taller').select('*').order('codigo', { ascending: true }) : Promise.resolve({ data: [], error: null }),
            supabaseClient.from('equipos_refurbish').select('*').order('creado_en', { ascending: false }),
            supabaseClient.from('proveedores').select('*').eq('activo', true).order('nombre', { ascending: true }),
            supabaseClient.from('refurb_lotes').select('*').order('creado_en', { ascending: false }),
            supabaseClient.from('articulos').select('*').eq('activo', true).order('codigo', { ascending: true }),
            supabaseClient.from('tecnicos').select('*').order('nombre', { ascending: true }),
            supabaseClient.from('usuarios').select('id, nombre, usuario, rol').then(r => r, () => ({ data: [], error: null })),
            supabaseClient.from('orden_piezas').select('*').order('creado_en', { ascending: true }).then(r => r, () => ({ data: [], error: null })),
            supabaseClient.from('tareas_trabajo').select('*').order('creado_en', { ascending: true }).then(r => r, () => ({ data: [], error: null })),
            supabaseClient.from('equipo_piezas_pedidas').select('*').order('creado_en', { ascending: true }).then(r => r, () => ({ data: [], error: null })),
            supabaseClient.from('fallas_comunes').select('*').order('orden', { ascending: true }).then(r => r, () => ({ data: [], error: null }))
        ]);

        requireSupabaseOk(rOrd, 'Cargar órdenes');
        requireSupabaseOk(rCli, 'Cargar clientes');
        requireSupabaseOk(rEq, 'Cargar equipos');
        requireSupabaseOk(rPz, 'Cargar piezas');
        if(isAdminUser()) requireSupabaseOk(rAct, 'Cargar activos');
        requireSupabaseOk(rRef, 'Cargar refurbish');
        requireSupabaseOk(rProv, 'Cargar proveedores');
        requireSupabaseOk(rLot, 'Cargar lotes');
        requireSupabaseOk(rArt, 'Cargar artículos');
        requireSupabaseOk(rTec, 'Cargar técnicos');
        
        // Detectar eventos nuevos para notificar (comparando con el cache anterior)
        const prev = cache;
        const nuevoCache = { 
            ordenes: rOrd.data || [], clientes: rCli.data || [], equipos: rEq.data || [], 
            piezas: rPz.data || [], activos: rAct.data || [], refurb: rRef.data || [],
            proveedores: rProv.data || [], lotes: rLot.data || [], articulos: rArt.data || [],
            fallaCategorias: cache.fallaCategorias || [], fallas: cache.fallas || [],
            tecnicos: rTec.data || [], usuarios: (rUsr && rUsr.data) || [],
            ordenPiezas: (rOpz && rOpz.data) || [],
            tareas: (rTk && rTk.data) || [],
            piezasReacond: (rPzR && rPzR.data) || [],
            fallasComunes: (rFC && rFC.data) || (cache.fallasComunes || [])
        };
        // Solo notificar si ya había datos cargados antes (no en la primera carga)
        if(_notifYaInicializado) {
            detectarEventosYNotificar(prev, nuevoCache);
        }
        _notifYaInicializado = true;
        
        cache = nuevoCache;
        renderAll();
    } catch(e) { logError('loadAll', e); toast(getFriendlyError(e, "Error cargando base de datos.")); }
}

function findCliente(id) { return cache.clientes.find(x => x.id === id) || {}; }

// Bandera para no notificar en la primera carga
let _notifYaInicializado = false;

// Días configurables para considerar un equipo "demorado" (default 5)
let _diasDemora = parseInt(localStorage.getItem('bayol_dias_demora') || '5', 10);
function setDiasDemora(n) {
    _diasDemora = Math.max(1, parseInt(n, 10) || 5);
    localStorage.setItem('bayol_dias_demora', _diasDemora);
    if(document.getElementById('v-atencion')?.classList.contains('active')) renderAtencionCliente();
    if(document.getElementById('v-dashboard')?.classList.contains('active')) renderAll();
}
// Calcula días transcurridos desde una fecha ISO
function diasDesde(fechaISO) {
    if(!fechaISO) return 0;
    const ms = Date.now() - new Date(fechaISO).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}
// Devuelve las órdenes de cliente demoradas (activas y pasadas del límite desde recepción)
function ordenesDemoradas() {
    return (cache.ordenes || []).filter(o => {
        const est = normalizarEstadoOrden(o.estado);
        if(['entregado','cancelado','finalizado'].includes(est)) return false;
        return diasDesde(o.creado_en) >= _diasDemora;
    }).sort((a,b) => new Date(a.creado_en) - new Date(b.creado_en));
}
// Reacondicionados demorados (solo para quien tiene permiso de reacond)
function reacondDemorados() {
    return (cache.refurb || []).filter(eq => {
        if(['listo_venta','vendido'].includes(eq.estado_evaluacion)) return false;
        return diasDesde(eq.creado_en) >= _diasDemora;
    }).sort((a,b) => new Date(a.creado_en) - new Date(b.creado_en));
}


// Compara cache anterior vs nuevo y dispara notificaciones de eventos relevantes
function detectarEventosYNotificar(prev, nuevo) {
    try {
        const miId = sessionUser?.id;
        const esAdmin = isAdminUser();
        const esServicio = tienePermiso && tienePermiso('recepcion_ver');
        
        // 1) NUEVA ORDEN recibida (para todos)
        const ordenesPrevIds = new Set((prev.ordenes || []).map(o => o.id));
        const nuevasOrdenes = (nuevo.ordenes || []).filter(o => !ordenesPrevIds.has(o.id));
        if(nuevasOrdenes.length > 0) {
            const o = nuevasOrdenes[0];
            const c = (nuevo.clientes || []).find(x => x.id === o.cliente_id);
            notificar('orden', 'Nueva orden recibida', `${formatoOrden(o.numero_orden)} · ${c?.nombre || 'Cliente'}${nuevasOrdenes.length > 1 ? ' y ' + (nuevasOrdenes.length-1) + ' más' : ''}`);
        }
        
        // 2) PIEZA solicitada o entregada (técnico y servicio)
        if(esAdmin || esServicio || true) {
            // Piezas de reacond: nuevas solicitudes o cambios a entregada
            const pzPrev = {};
            (prev.piezasReacond || []).forEach(p => pzPrev[p.id] = p.estado);
            (nuevo.piezasReacond || []).forEach(p => {
                const estadoAnterior = pzPrev[p.id];
                if(estadoAnterior === undefined && (p.estado === 'pendiente' || p.estado === 'solicitada')) {
                    notificar('pieza', 'Pieza solicitada', `${p.pieza_nombre || 'Pieza'} (reacondicionado)`);
                } else if(estadoAnterior && estadoAnterior !== 'entregada' && p.estado === 'entregada') {
                    notificar('pieza', 'Pieza entregada', `${p.pieza_nombre || 'Pieza'} lista para el técnico`);
                }
            });
            // Piezas de órdenes
            const opPrev = {};
            (prev.ordenPiezas || []).forEach(p => opPrev[p.id] = p.estado);
            (nuevo.ordenPiezas || []).forEach(p => {
                const estadoAnterior = opPrev[p.id];
                if(estadoAnterior === undefined && p.estado === 'solicitada') {
                    notificar('pieza', 'Pieza solicitada', `${p.pieza_nombre || 'Pieza'} (orden)`);
                } else if(estadoAnterior && estadoAnterior !== 'entregada' && p.estado === 'entregada') {
                    notificar('pieza', 'Pieza entregada', `${p.pieza_nombre || 'Pieza'} lista`);
                }
            });
        }
        
        // 3) PROCESO FINALIZADO (orden finalizada o reacond listo)
        const ordPrevEstado = {};
        (prev.ordenes || []).forEach(o => ordPrevEstado[o.id] = normalizarEstadoOrden(o.estado));
        (nuevo.ordenes || []).forEach(o => {
            const ant = ordPrevEstado[o.id];
            const act = normalizarEstadoOrden(o.estado);
            if(ant && ant !== 'finalizado' && act === 'finalizado') {
                const c = (nuevo.clientes || []).find(x => x.id === o.cliente_id);
                notificar('finalizado', 'Reparación finalizada', `${formatoOrden(o.numero_orden)} · ${c?.nombre || 'Cliente'} lista para entregar`);
            }
        });
        const rfPrevEstado = {};
        (prev.refurb || []).forEach(e => rfPrevEstado[e.id] = e.estado_evaluacion);
        (nuevo.refurb || []).forEach(e => {
            const ant = rfPrevEstado[e.id];
            if(ant && ant !== 'listo_venta' && e.estado_evaluacion === 'listo_venta') {
                notificar('finalizado', 'Reacondicionado listo', `${e.marca || ''} ${e.modelo || ''} listo para venta`);
            }
        });
    } catch(e) { /* silencioso, no romper loadAll */ }
}


// Devuelve el nombre del empleado que creó algo (busca en usuarios y técnicos)
function nombreEmpleado(id) {
    if(!id) return '—';
    const u = (cache.usuarios || []).find(x => x.id === id);
    if(u) return u.nombre || u.usuario || '—';
    const t = (cache.tecnicos || []).find(x => x.id === id);
    if(t) return t.nombre || '—';
    return '—';
}

// Formato del número de orden/ticket: ORD-000123
function formatoOrden(numero) {
    const n = String(numero ?? '').padStart(6, '0');
    return `ORD-${n}`;
}

// Devuelve "fecha exacta · hace Xh Ym" desde una fecha ISO. Vacío si no hay fecha.
function tiempoDesde(fechaISO) {
    if(!fechaISO) return '';
    const inicio = new Date(fechaISO);
    if(isNaN(inicio)) return '';
    const exacta = inicio.toLocaleString('es-DO', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    const ms = Date.now() - inicio.getTime();
    if(ms < 0) return exacta;
    const min = Math.floor(ms / 60000);
    const horas = Math.floor(min / 60);
    const dias = Math.floor(horas / 24);
    let transcurrido;
    if(dias >= 1) transcurrido = `hace ${dias}d ${horas % 24}h`;
    else if(horas >= 1) transcurrido = `hace ${horas}h ${min % 60}min`;
    else transcurrido = `hace ${min}min`;
    return `${exacta} · ${transcurrido}`;
}

function findEquipo(id) { return cache.equipos.find(x => x.id === id) || {}; }
function findArticulo(id) { return cache.articulos.find(x => x.id === id) || {}; }
function findProveedor(id) { return cache.proveedores.find(x => x.id === id) || {}; }

function renderAll() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("kHoy").textContent = cache.ordenes.filter(o => (o.creado_en || "").slice(0, 10) === today).length;
    document.getElementById("kDiag").textContent = cache.ordenes.filter(o => normalizarEstadoOrden(o.estado) === "recibido").length;
    document.getElementById("kRep").textContent = cache.ordenes.filter(o => normalizarEstadoOrden(o.estado) === "en_proceso").length;
    document.getElementById("kPiezas").textContent = cache.ordenes.filter(o => normalizarEstadoOrden(o.estado) === "espera_repuesto").length;
    document.getElementById("kListos").textContent = cache.ordenes.filter(o => normalizarEstadoOrden(o.estado) === "finalizado").length;
    document.getElementById("kRefurb").textContent = cache.refurb.length;
    
    // KPIs de Reacondicionado
    const refurb = cache.refurb || [];
    const setKpi = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setKpi('kdPend', refurb.filter(e => (e.estado_evaluacion || 'pendiente') === 'pendiente').length);
    setKpi('kdEval', refurb.filter(e => ['en_evaluacion','evaluado'].includes(e.estado_evaluacion)).length);
    setKpi('kdProc', refurb.filter(e => ['en_proceso','tecnico_recibio','espera_pieza','listo_revision','reasignado'].includes(e.estado_evaluacion)).length);
    setKpi('kdListoV', refurb.filter(e => e.estado_evaluacion === 'listo_venta').length);
    setKpi('kdDesp', refurb.filter(e => e.estado_evaluacion === 'vendido').length);
    setKpi('kdDev', refurb.filter(e => (e.veces_devuelto || 0) > 0).length);
    
    document.getElementById("recentOrders").innerHTML = cache.ordenes.slice(0, 5).map(o => {
        const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
        return `<tr><td data-label="Orden"><b>${formatoOrden(o.numero_orden)}</b></td><td data-label="Cliente">${escapeHtml(c.nombre)}</td><td data-label="Equipo">${escapeHtml(e.modelo)}</td><td data-label="Falla">${escapeHtml(o.falla_reportada)}</td><td data-label="Estado"><span class="badge" style="background:#d1fae5;">${o.estado}</span></td></tr>`;
    }).join("");
    
    renderOrders();
    document.getElementById("partsTable").innerHTML = cache.piezas.map(p => `<tr><td data-label="Código"><code>${p.codigo}</code></td><td data-label="Pieza"><b>${escapeHtml(p.nombre)}</b></td><td data-label="Stock">${p.cantidad} uds</td><td data-label="Costo">${money(p.costo)}</td></tr>`).join("");
    if(isAdminUser()) renderActivosTaller();
    renderRefurbishItems();
    renderProveedores();
    renderComprasTab();
    renderArticulos();
    // Refrescar vista Reacond si está activa
    if(document.getElementById('v-refurb')?.classList.contains('active')) {
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
        else cargarLotesReacond();
    }
    if(proveedorActualId) renderDetalleProveedor(proveedorActualId);
    if(loteActualId) renderEquiposLote();
    renderProductividadEmpleados();
    renderTallerOrdenes();
    if(document.getElementById('v-miTrabajo')?.classList.contains('active')) renderMiTrabajo();
    if(document.getElementById('v-atencion')?.classList.contains('active')) renderAtencionCliente();
    if(document.getElementById('v-piezasSolicitadas')?.classList.contains('active') && typeof renderPiezasSolicitadas === 'function') renderPiezasSolicitadas();
    if(document.getElementById('v-recepcion')?.classList.contains('active') && typeof renderRecepcionesRealizadas === 'function') { renderRecepcionesRealizadas(); if(typeof refrescarChecklistRecepcion === 'function') refrescarChecklistRecepcion(); }
    // Alertas de equipos demorados en el dashboard
    const demCont = document.getElementById('dashboardDemoras');
    if(demCont && typeof construirAlertaDemoras === 'function') demCont.innerHTML = construirAlertaDemoras(true);
    // Panel inteligente (alertas + tendencias) en el dashboard
    const smartCont = document.getElementById('dashboardSmart');
    if(smartCont && typeof construirPanelInteligente === 'function') smartCont.innerHTML = construirPanelInteligente();
    // Marcar el filtro activo del tablero (visual)
    const btnAct = document.getElementById('fltOrdActivas');
    if(btnAct && !btnAct.style.background) { btnAct.style.background = 'var(--blue-btn)'; btnAct.style.color = '#fff'; }
}

// Reporte: cuántos clientes/órdenes atendió cada empleado
function renderProductividadEmpleados() {
    const cont = document.getElementById('productividadEmpleados');
    if(!cont) return;
    const ordenes = cache.ordenes || [];
    // Agrupar por empleado que creó la orden
    const conteo = {};
    ordenes.forEach(o => {
        if(!o.creado_by) return;
        conteo[o.creado_by] = (conteo[o.creado_by] || 0) + 1;
    });
    const filas = Object.entries(conteo)
        .map(([id, n]) => ({ nombre: nombreEmpleado(id), n }))
        .filter(x => x.nombre !== '—')
        .sort((a, b) => b.n - a.n);
    if(!filas.length) {
        cont.innerHTML = `<div style="color:var(--text-muted); padding:8px 0;">Aún no hay órdenes registradas con empleado. Desde ahora, cada recepción guardará quién atendió.</div>`;
        return;
    }
    const max = filas[0].n || 1;
    cont.innerHTML = filas.map(f => {
        const pct = Math.round((f.n / max) * 100);
        return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="min-width:120px; font-weight:600;"><i class="ti ti-user" style="color:#0891b2;"></i> ${escapeHtml(f.nombre)}</div>
            <div style="flex:1; background:#e2e8f0; border-radius:6px; overflow:hidden; height:20px;">
                <div style="width:${pct}%; background:linear-gradient(90deg,#0891b2,#06b6d4); height:100%; border-radius:6px;"></div>
            </div>
            <div style="min-width:90px; text-align:right; font-weight:700;">${f.n} cliente${f.n === 1 ? '' : 's'}</div>
        </div>`;
    }).join('');
}

/* ============================================================
   BUSCADOR GLOBAL POR IMEI / MODELO
   ============================================================ */
function buscarEquipoGlobal() {
    const q = (document.getElementById('buscadorGlobalImei')?.value || '').toLowerCase().trim();
    const cont = document.getElementById('resultadoBusquedaGlobal');
    if(!cont) return;
    
    if(q.length < 2) {
        cont.innerHTML = '';
        return;
    }
    
    // Buscar en equipos refurbish
    const palabras = q.split(/\s+/).filter(p => p);
    const resultados = (cache.refurb || []).filter(eq => {
        const hay = [eq.imei, eq.modelo, eq.marca, eq.capacidad, eq.color].filter(x => x).join(' ').toLowerCase();
        return palabras.every(p => hay.includes(p));
    });
    
    if(resultados.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:15px; font-size:13px;">Sin resultados para "<b>${escapeHtml(q)}</b>"</p>`;
        return;
    }
    
    cont.innerHTML = resultados.slice(0, 10).map(eq => {
        const estado = obtenerEtiquetaEstado(eq.estado_evaluacion || 'pendiente');
        const lote = (cache.lotes || []).find(l => l.id === eq.lote_id);
        const tecnico = eq.tecnico_asignado_id ? (cache.tecnicos || []).find(t => t.id === eq.tecnico_asignado_id) : null;
        return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:8px; cursor:pointer;" onclick="irAEquipoDesdeBusqueda('${eq.id}')">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div style="flex:1; min-width:180px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${eq.veces_devuelto > 0 ? '🔄 ' : ''}
                        <b style="font-size:14px;">${escapeHtml(eq.modelo || 'Equipo')}</b>
                        <span class="badge" style="background:${estado.bg}; color:${estado.color}; font-size:10px;">${estado.text}</span>
                    </div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                        <i class="ti ti-barcode"></i> ${escapeHtml(eq.imei || '—')}
                        ${lote ? ` · Lote: ${escapeHtml(lote.codigo_lote || '—')}` : ''}
                        ${tecnico ? ` · 👤 ${escapeHtml(tecnico.nombre)}` : ''}
                    </div>
                </div>
                <button class="btn btn-light" style="padding:6px 10px; font-size:12px;"><i class="ti ti-arrow-right"></i> Ver</button>
            </div>
        </div>`;
    }).join('') + (resultados.length > 10 ? `<p style="text-align:center; color:var(--text-muted); font-size:11px;">Mostrando 10 de ${resultados.length} resultados</p>` : '');
}

function irAEquipoDesdeBusqueda(equipoId) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    const estado = eq.estado_evaluacion || 'pendiente';
    // Ir al módulo reacond y abrir el panel apropiado
    nav('refurb');
    setTimeout(() => {
        if(['en_proceso','tecnico_recibio','espera_pieza','listo_revision','listo_venta','vendido','reasignado'].includes(estado)) {
            abrirPanelProceso(equipoId);
        } else if(['en_evaluacion','evaluado'].includes(estado)) {
            abrirModalEvaluacion(equipoId);
        } else {
            // Abrir el lote del equipo
            if(eq.lote_id) abrirLoteReacond(eq.lote_id);
        }
    }, 200);
}

function renderOrders() {
    document.getElementById("ordersTable").innerHTML = cache.ordenes.map(o => {
        const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
        const etOrd = obtenerEtiquetaOrden(normalizarEstadoOrden(o.estado));
        const tecOrd = o.tecnico_asignado_id ? nombreEmpleado(o.tecnico_asignado_id) : null;
        return `<tr>
            <td data-label="Orden"><b>${formatoOrden(o.numero_orden)}</b></td>
            <td data-label="Cliente">${escapeHtml(c.nombre)}</td>
            <td data-label="Equipo">${escapeHtml(e.modelo)}</td>
            <td data-label="Falla">${escapeHtml(o.falla_reportada)}</td>
            <td data-label="Acceso"><div class="access-mask">•••• <button class="btn btn-light" style="padding:1px 4px; font-size:10px" onclick="revelarClave('${o.id}', this)">Mostrar</button></div></td>
            <td data-label="Atendido por"><span style="font-size:12px;"><i class="ti ti-user-check" style="color:#0891b2;"></i> ${escapeHtml(nombreEmpleado(o.creado_by))}${tecOrd ? `<br><i class="ti ti-tool" style="color:#9a3412;"></i> ${escapeHtml(tecOrd)}` : ''}</span></td>
            <td data-label="Estado"><span class="badge" style="background:${etOrd.bg}; color:${etOrd.color};">${etOrd.text}</span></td>
            <td data-label="Acciones"><button class="btn btn-light" style="padding:4px 8px;" onclick="cargarEnLabel('${o.id}')"><i class="ti ti-clipboard-list"></i> Label Diagnóstico</button></td>
        </tr>`;
    }).join("");
}

function renderActivosTaller() {
    if(!isAdminUser()) return;
    if(!cache.activos.length) {
        document.getElementById("assetsTable").innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay herramientas registradas.</td></tr>`;
        return;
    }
    document.getElementById("assetsTable").innerHTML = cache.activos.map(a => {
        let styleBadge = "background:#d1fae5; color:#065f46;";
        if(a.estado_tecnico === "Desgaste Medio") styleBadge = "background:#fef3c7; color:#92400e;";
        if(a.estado_tecnico === "Mantenimiento") styleBadge = "background:#fee2e2; color:#991b1b;";
        let asignadosFormateado = escapeHtml(a.asignado_a || 'Sin asignar');
        if(a.asignado_a && a.asignado_a.includes(',')) {
            asignadosFormateado = a.asignado_a.split(',').map(t => `<span style="background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px; font-weight:600;">${escapeHtml(t.trim())}</span>`).join('');
        }
        return `<tr>
            <td data-label="Código"><code>${escapeHtml(a.codigo)}</code></td>
            <td data-label="Herramienta"><b>${escapeHtml(a.nombre)}</b></td>
            <td data-label="Cantidad">${a.cantidad} Uds</td>
            <td data-label="Estado">
                <select class="select-table-state" style="${styleBadge}" onchange="cambiarEstadoActivo('${a.id}', this.value)">
                    <option value="Excelente" ${a.estado_tecnico === 'Excelente' ? 'selected' : ''}>Excelente</option>
                    <option value="Desgaste Medio" ${a.estado_tecnico === 'Desgaste Medio' ? 'selected' : ''}>Desgaste Medio</option>
                    <option value="Mantenimiento" ${a.estado_tecnico === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                </select>
            </td>
            <td data-label="Asignado"><div style="display:flex; flex-wrap:wrap; gap:4px;">${asignadosFormateado}</div></td>
        </tr>`;
    }).join("");
}

async function cambiarEstadoActivo(activoId, nuevoEstado) {
    if(!isAdminUser()) return alert("Sin permiso.");
    try {
        const { error } = await supabaseClient.from('activos_taller').update({
            estado_tecnico: nuevoEstado,
            actualizado_por: sessionUser.nombre || sessionUser.usuario,
            actualizado_en: new Date().toISOString()
        }).eq('id', activoId);
        if(error) throw error;
        toast("Estado actualizado.");
        await loadAll();
    } catch(e) { logError("Actualizar estado activo", e); alert(getFriendlyError(e)); await loadAll(); }
}

function toggleFormActivo() {
    if(!isAdminUser()) return alert("Sin permiso.");
    const el = document.getElementById("formAssetContainer");
    el.style.display = el.style.display === "none" ? "block" : "none";
}

function calcularSiguienteCodigoActivo() {
    if (!cache.activos || !cache.activos.length) return 'HERR-001';
    const numeros = cache.activos.map(act => {
        if (!act.codigo) return 0;
        const match = act.codigo.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `HERR-${String(Math.max(...numeros, 0) + 1).padStart(3, '0')}`;
}

async function guardarActivoTaller() {
    if(!isAdminUser()) return alert("Sin permiso.");
    try {
        const nom = val("ast_nombre"), cant = parseInt(val("ast_cantidad")) || 1, est = document.getElementById("ast_estado").value, asig = val("ast_asignado");
        if(!nom) return alert("Nombre requerido.");
        const { error } = await supabaseClient.from('activos_taller').insert([{
            codigo: calcularSiguienteCodigoActivo(), nombre: nom, cantidad: cant, estado_tecnico: est, asignado_a: asig,
            actualizado_por: sessionUser.nombre || sessionUser.usuario, actualizado_en: new Date().toISOString()
        }]);
        if(error) throw error;
        toast(`Herramienta registrada.`);
        document.getElementById("ast_nombre").value = "";
        toggleFormActivo();
        await loadAll();
    } catch(e) { logError("Registrar activo", e); alert(getFriendlyError(e)); }
}

/* ============================================================
   MÓDULO CATÁLOGO DE ARTÍCULOS
   ============================================================ */

function renderArticulos() {
    const tbody = document.getElementById('articulosTable');
    if(!tbody) return;
    const filtro = (document.getElementById('art_buscar')?.value || '').toLowerCase().trim();
    let lista = cache.articulos || [];
    if(filtro) {
        lista = lista.filter(a => 
            (a.marca || '').toLowerCase().includes(filtro) ||
            (a.modelo || '').toLowerCase().includes(filtro) ||
            (a.referencia || '').toLowerCase().includes(filtro) ||
            (a.codigo || '').toLowerCase().includes(filtro)
        );
    }
    if(!lista.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">${filtro ? 'Sin resultados' : 'No hay artículos en el catálogo.'}</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(a => {
        const llevaImei = a.lleva_imei !== false;
        const badgeImei = llevaImei 
            ? `<span class="badge" style="background:#dbeafe; color:#1e40af;">SÍ</span>`
            : `<span class="badge" style="background:#fef3c7; color:#92400e;">NO</span>`;
        return `<tr data-item-id="${a.id}">
            <td data-label="Código"><code style="font-weight:700; color:var(--blue-btn); text-transform:uppercase;">${escapeHtml(a.codigo)}</code></td>
            <td data-label="Marca"><b style="text-transform:uppercase;">${escapeHtml(a.marca)}</b></td>
            <td data-label="Modelo" style="text-transform:uppercase;">${escapeHtml(a.modelo)}</td>
            <td data-label="Capacidad" style="text-transform:uppercase;">${escapeHtml(a.capacidad || '-')}</td>
            <td data-label="Referencia" style="text-transform:uppercase;">${escapeHtml(a.referencia || '-')}</td>
            <td data-label="IMEI">${badgeImei}</td>
            <td data-label="Acciones">
                ${permBtn('catalogo_articulos', `<button class="btn btn-light" style="padding:4px 8px; font-size:11px;" onclick="editarArticulo('${a.id}')"><i class="ti ti-edit"></i></button>`)}
                ${permBtn('catalogo_articulos_eliminar', `<button class="btn btn-light" style="padding:4px 8px; font-size:11px;" onclick="eliminarArticulo('${a.id}')"><i class="ti ti-trash"></i></button>`)}
            </td>
        </tr>`;
    }).join('');
}

function calcularSiguienteCodigoArticulo() {
    if(!cache.articulos || !cache.articulos.length) return 'ART-001';
    const numeros = cache.articulos.map(a => {
        const m = (a.codigo || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
    });
    return `ART-${String(Math.max(...numeros, 0) + 1).padStart(3, '0')}`;
}

async function abrirModalArticulo() {
    document.getElementById('mod_art_id').value = '';
    document.getElementById('mod_art_codigo').value = calcularSiguienteCodigoArticulo();
    ['mod_art_marca','mod_art_modelo','mod_art_capacidad','mod_art_referencia','mod_art_categoria'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('mod_art_lleva_imei').checked = true;
    document.getElementById('modalArtTitulo').textContent = 'Crear Artículo';
    await llenarDatalistsCatalogo();
    document.getElementById('modalArticulo').classList.add('active');
}

// Llena los datalist de marcas y categorías desde el catálogo
async function llenarDatalistsCatalogo() {
    // Asegurar que los catálogos estén cargados
    if(_marcasCache.length === 0 && typeof cargarMarcas === 'function') { try { await cargarMarcas(); } catch(e){} }
    if(_categoriasCache.length === 0 && typeof cargarCategorias === 'function') { try { await cargarCategorias(); } catch(e){} }
    const dlM = document.getElementById('dl_marcas');
    if(dlM) dlM.innerHTML = (_marcasCache || []).filter(m => m.activa !== false).map(m => `<option value="${escapeHtml((m.nombre||'').toUpperCase())}">`).join('');
    const dlC = document.getElementById('dl_categorias');
    if(dlC) dlC.innerHTML = (_categoriasCache || []).filter(c => c.activa !== false).map(c => `<option value="${escapeHtml((c.nombre||'').toUpperCase())}">`).join('');
}

function cerrarModalArticulo() {
    document.getElementById('modalArticulo').classList.remove('active');
}

async function editarArticulo(id) {
    const a = findArticulo(id);
    if(!a) return;
    await llenarDatalistsCatalogo();
    document.getElementById('mod_art_id').value = a.id;
    document.getElementById('mod_art_codigo').value = a.codigo;
    document.getElementById('mod_art_marca').value = a.marca || '';
    const catEl = document.getElementById('mod_art_categoria');
    if(catEl) catEl.value = a.categoria || '';
    document.getElementById('mod_art_modelo').value = a.modelo || '';
    document.getElementById('mod_art_capacidad').value = a.capacidad || '';
    document.getElementById('mod_art_referencia').value = a.referencia || '';
    document.getElementById('mod_art_lleva_imei').checked = a.lleva_imei !== false;
    document.getElementById('modalArtTitulo').textContent = 'Editar Artículo';
    document.getElementById('modalArticulo').classList.add('active');
}

async function guardarArticuloModal() {
    try {
        const marca = val('mod_art_marca'), modelo = val('mod_art_modelo');
        if(!marca || !modelo) return alert('Marca y modelo son obligatorios.');
        const id = val('mod_art_id');
        const data = {
            marca: marca, modelo: modelo,
            categoria: val('mod_art_categoria') || null,
            capacidad: val('mod_art_capacidad') || null,
            referencia: val('mod_art_referencia') || null,
            lleva_imei: document.getElementById('mod_art_lleva_imei').checked
        };
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('articulos').update(data).eq('id', id);
            if(error) throw error;
            toast('✅ Artículo actualizado.');
        } else {
            data.codigo = calcularSiguienteCodigoArticulo();
            data.activo = true;
            const { data: ins, error } = await supabaseClient.from('articulos').insert([data]).select().single();
            if(error) throw error;
            nuevoId = ins?.id;
            toast(`✅ Artículo ${data.codigo} creado.`);
        }
        cerrarModalArticulo();
        // Si la marca o categoría son nuevas, agregarlas al catálogo para la próxima vez
        await registrarEnCatalogoSiEsNueva(marca, val('mod_art_categoria'));
        await loadAll();
        resaltarItemNuevo(nuevoId);
    } catch(e) { logError('Guardar artículo', e); alert(getFriendlyError(e)); }
}

// Agrega marca/categoría al catálogo si no existían (silencioso)
async function registrarEnCatalogoSiEsNueva(marca, categoria) {
    try {
        if(marca) {
            const existe = (_marcasCache || []).some(m => (m.nombre||'').toUpperCase() === marca.toUpperCase());
            if(!existe) {
                await supabaseClient.from('catalogo_marcas').insert([{ nombre: marca.toUpperCase(), activa: true }]).then(r=>r, ()=>{});
            }
        }
        if(categoria) {
            const existe = (_categoriasCache || []).some(c => (c.nombre||'').toUpperCase() === categoria.toUpperCase());
            if(!existe) {
                await supabaseClient.from('catalogo_categorias').insert([{ nombre: categoria.toUpperCase(), activa: true }]).then(r=>r, ()=>{});
            }
        }
        // Refrescar caches
        if(typeof cargarMarcas === 'function') { try { await cargarMarcas(); } catch(e){} }
        if(typeof cargarCategorias === 'function') { try { await cargarCategorias(); } catch(e){} }
    } catch(e) { /* silencioso, no bloquea el guardado */ }
}

async function eliminarArticulo(id) {
    if(!confirm('¿Desactivar este artículo?')) return;
    try {
        const { error } = await supabaseClient.from('articulos').update({ activo: false }).eq('id', id);
        if(error) throw error;
        toast('🗑️ Artículo desactivado.');
        await loadAll();
    } catch(e) { logError('Desactivar artículo', e); alert(getFriendlyError(e)); }
}

/* ============================================================
   MÓDULO PROVEEDORES (con lotes anidados)
   ============================================================ */

function renderProveedores() {
    const cont = document.getElementById('proveedoresContainer');
    if(!cont) return;
    const filtro = (document.getElementById('prov_buscar')?.value || '').toLowerCase().trim();
    let lista = cache.proveedores || [];
    if(filtro) {
        lista = lista.filter(p => 
            (p.nombre || '').toLowerCase().includes(filtro) ||
            (p.contacto || '').toLowerCase().includes(filtro) ||
            (p.ciudad || '').toLowerCase().includes(filtro)
        );
    }
    if(!lista.length) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">${filtro ? 'Sin resultados' : 'No hay proveedores. Crea uno con el botón + Crear Proveedor.'}</p>`;
        return;
    }
    cont.innerHTML = lista.map(p => {
        const lotesProv = cache.lotes.filter(l => l.proveedor_id === p.id);
        const equiposProv = cache.refurb.filter(r => lotesProv.some(l => l.id === r.lote_id));
        let confStyle = 'background:#f1f5f9; color:#475569;';
        if(p.confiabilidad === 'Excelente') confStyle = 'background:#d1fae5; color:#065f46;';
        else if(p.confiabilidad === 'Buena') confStyle = 'background:#dbeafe; color:#1e40af;';
        else if(p.confiabilidad === 'Regular') confStyle = 'background:#fef3c7; color:#92400e;';
        else if(p.confiabilidad === 'Mala') confStyle = 'background:#fee2e2; color:#991b1b;';
        const ini = (p.nombre || '?').charAt(0).toUpperCase();
        return `<div class="prov-card" data-item-id="${p.id}">
            <div class="prov-avatar">${escapeHtml(ini)}</div>
            <div class="prov-info">
                <h4>${escapeHtml(p.nombre)}</h4>
                <div class="meta">
                    <span class="badge" style="background:#e0e7ff; color:#3730a3; margin-right:4px;">${escapeHtml(p.tipo || 'Particular')}</span>
                    <span class="badge" style="${confStyle}">${escapeHtml(p.confiabilidad || 'Por evaluar')}</span>
                    · ${lotesProv.length} lote${lotesProv.length === 1 ? '' : 's'} · ${equiposProv.length} equipo${equiposProv.length === 1 ? '' : 's'}
                    ${p.ciudad ? ` · <i class="ti ti-map-pin"></i> ${escapeHtml(p.ciudad)}` : ''}
                </div>
            </div>
            <div class="prov-actions">
                <button class="btn btn-blue" style="padding:6px 12px; font-size:12px;" onclick="abrirProveedor('${p.id}')"><i class="ti ti-folder-open"></i> Ver Lotes</button>
                ${permBtn('catalogo_proveedores', `<button class="btn btn-light" style="padding:6px 10px; font-size:12px;" onclick="editarProveedor('${p.id}')"><i class="ti ti-edit"></i></button>`)}
                ${permBtn('catalogo_proveedores_eliminar', `<button class="btn btn-light" style="padding:6px 10px; font-size:12px;" onclick="eliminarProveedor('${p.id}')"><i class="ti ti-trash"></i></button>`)}
            </div>
        </div>`;
    }).join('');
}

function abrirModalProveedor() {
    document.getElementById('mod_prov_id').value = '';
    ['mod_prov_nombre','mod_prov_contacto','mod_prov_whatsapp','mod_prov_ciudad','mod_prov_notas'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('mod_prov_tipo').value = 'Particular';
    document.getElementById('mod_prov_confiabilidad').value = 'Por evaluar';
    document.getElementById('modalProvTitulo').textContent = 'Crear Proveedor';
    document.getElementById('modalProveedor').classList.add('active');
}

function cerrarModalProveedor() {
    document.getElementById('modalProveedor').classList.remove('active');
}

function editarProveedor(id) {
    const p = findProveedor(id);
    if(!p) return;
    document.getElementById('mod_prov_id').value = p.id;
    document.getElementById('mod_prov_nombre').value = p.nombre || '';
    document.getElementById('mod_prov_contacto').value = p.contacto || '';
    document.getElementById('mod_prov_whatsapp').value = p.whatsapp || '';
    document.getElementById('mod_prov_ciudad').value = p.ciudad || '';
    document.getElementById('mod_prov_tipo').value = p.tipo || 'Particular';
    document.getElementById('mod_prov_confiabilidad').value = p.confiabilidad || 'Por evaluar';
    document.getElementById('mod_prov_notas').value = p.notas || '';
    document.getElementById('modalProvTitulo').textContent = 'Editar Proveedor';
    document.getElementById('modalProveedor').classList.add('active');
}

async function guardarProveedorModal() {
    try {
        const nombre = val('mod_prov_nombre');
        if(!nombre) return alert('Nombre obligatorio.');
        const id = val('mod_prov_id');
        const data = {
            nombre: nombre,
            contacto: val('mod_prov_contacto') || null,
            whatsapp: val('mod_prov_whatsapp') || null,
            ciudad: val('mod_prov_ciudad') || null,
            tipo: document.getElementById('mod_prov_tipo').value,
            confiabilidad: document.getElementById('mod_prov_confiabilidad').value,
            notas: val('mod_prov_notas') || null
        };
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('proveedores').update(data).eq('id', id);
            if(error) throw error;
            toast('✅ Proveedor actualizado.');
        } else {
            data.activo = true;
            const { data: ins, error } = await supabaseClient.from('proveedores').insert([data]).select().single();
            if(error) throw error;
            nuevoId = ins?.id;
            toast('✅ Proveedor creado.');
        }
        cerrarModalProveedor();
        await loadAll();
        resaltarItemNuevo(nuevoId);
    } catch(e) { logError('Guardar proveedor', e); alert(getFriendlyError(e)); }
}

async function eliminarProveedor(id) {
    if(!confirm('¿Desactivar este proveedor? No se borrará, solo se ocultará.')) return;
    try {
        const { error } = await supabaseClient.from('proveedores').update({ activo: false }).eq('id', id);
        if(error) throw error;
        toast('🗑️ Proveedor desactivado.');
        await loadAll();
    } catch(e) { logError('Desactivar proveedor', e); alert(getFriendlyError(e)); }
}

function abrirProveedor(provId) {
    proveedorActualId = provId;
    document.getElementById('prov-lista').style.display = 'none';
    document.getElementById('prov-detalle').style.display = 'block';
    document.getElementById('lote-detalle').style.display = 'none';
    renderDetalleProveedor(provId);
}

function renderDetalleProveedor(provId) {
    const p = findProveedor(provId);
    if(!p) return volverListaProveedores();
    
    document.getElementById('provDetTitulo').textContent = p.nombre;
    
    const metaParts = [];
    if(p.tipo) metaParts.push(p.tipo);
    if(p.ciudad) metaParts.push(p.ciudad);
    if(p.whatsapp) metaParts.push(`WhatsApp: ${p.whatsapp}`);
    if(p.contacto) metaParts.push(`Contacto: ${p.contacto}`);
    document.getElementById('provDetMeta').textContent = metaParts.join(' · ') || 'Sin datos adicionales';
    
    const lotesProv = cache.lotes.filter(l => l.proveedor_id === provId);
    const equiposProv = cache.refurb.filter(r => lotesProv.some(l => l.id === r.lote_id));
    const inversionTotal = equiposProv.reduce((s, e) => s + (parseFloat(e.costo_compra) || 0), 0);
    
    document.getElementById('provDetLotes').textContent = lotesProv.length;
    document.getElementById('provDetEquipos').textContent = equiposProv.length;
    document.getElementById('provDetInversion').textContent = money(inversionTotal);
    document.getElementById('provDetConfiab').textContent = p.confiabilidad || '-';
    
    const cont = document.getElementById('lotesProveedorContainer');
    if(!lotesProv.length) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; font-size:13px; padding:20px;">Sin lotes registrados. Crea uno con el botón + Nuevo Lote.</p>`;
        return;
    }
    cont.innerHTML = lotesProv.map(l => {
        const equiposLote = cache.refurb.filter(r => r.lote_id === l.id);
        const totalLote = equiposLote.reduce((s, e) => s + (parseFloat(e.costo_compra) || 0), 0);
        let estadoStyle = 'background:#e0f2fe; color:#0369a1;';
        if(l.estado === 'En Proceso') estadoStyle = 'background:#fef3c7; color:#92400e;';
        if(l.estado === 'Cerrado') estadoStyle = 'background:#d1fae5; color:#065f46;';
        return `<div class="lote-card">
            <div>
                <div class="lote-codigo">${escapeHtml(l.codigo_lote || 'Sin código')} <span class="badge" style="${estadoStyle}; margin-left:6px;">${escapeHtml(l.estado || 'Abierto')}</span></div>
                <div class="lote-meta">📅 ${l.fecha_compra ? new Date(l.fecha_compra).toLocaleDateString('es-DO') : '-'} · ${equiposLote.length} equipo${equiposLote.length === 1 ? '' : 's'} ${l.notas ? '· ' + escapeHtml(l.notas) : ''}</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <div class="lote-totals"><div class="total">${money(totalLote)}</div></div>
                <button class="btn btn-blue" style="padding:6px 12px; font-size:12px;" onclick="abrirLote('${l.id}')"><i class="ti ti-folder-open"></i> Abrir</button>
                <button class="btn btn-light" style="padding:6px 10px; font-size:12px;" onclick="eliminarLote('${l.id}')"><i class="ti ti-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function volverListaProveedores() {
    proveedorActualId = null;
    loteActualId = null;
    const lista = document.getElementById('prov-lista');
    const detalle = document.getElementById('prov-detalle');
    const loteDet = document.getElementById('lote-detalle');
    if(lista) lista.style.display = 'block';
    if(detalle) detalle.style.display = 'none';
    if(loteDet) loteDet.style.display = 'none';
    // Reiniciar a tab Compras por defecto
    cambiarTab('compras');
}

function volverDetalleProveedor() {
    loteActualId = null;
    document.getElementById('prov-detalle').style.display = 'block';
    document.getElementById('lote-detalle').style.display = 'none';
    if(proveedorActualId) renderDetalleProveedor(proveedorActualId);
}

/* ============================================================
   MÓDULO LOTES (dentro del proveedor)
   ============================================================ */

function calcularSiguienteCodigoLote() {
    if(!cache.lotes || !cache.lotes.length) return 'LT-00001';
    const numeros = cache.lotes.map(l => {
        const m = (l.codigo_lote || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
    });
    return `LT-${String(Math.max(...numeros, 0) + 1).padStart(5, '0')}`;
}

async function crearLoteDesdeProveedor() {
    if(!proveedorActualId) return;
    try {
        const codigo = calcularSiguienteCodigoLote();
        const { data, error } = await supabaseClient.from('refurb_lotes').insert([{
            codigo_lote: codigo,
            proveedor_id: proveedorActualId,
            fecha_compra: new Date().toISOString().slice(0, 10),
            estado: 'Abierto',
            creado_por: sessionUser?.id || null
        }]).select().single();
        if(error) throw error;
        toast(`Lote ${codigo} creado.`);
        await loadAll();
        abrirLote(data.id);
    } catch(e) { logError('Crear lote', e); alert(getFriendlyError(e)); }
}

function abrirLote(loteId) {
    loteActualId = loteId;
    const lote = cache.lotes.find(l => l.id === loteId);
    if(!lote) return alert('Lote no encontrado.');
    
    document.getElementById('prov-detalle').style.display = 'none';
    document.getElementById('lote-detalle').style.display = 'block';
    document.getElementById('loteDetTitulo').textContent = `${lote.codigo_lote} · ${findProveedor(lote.proveedor_id).nombre || 'Sin proveedor'}`;
    
    document.getElementById('lt_codigo').value = lote.codigo_lote || '';
    document.getElementById('lt_fecha').value = lote.fecha_compra || '';
    document.getElementById('lt_notas').value = lote.notas || '';
    document.getElementById('lt_estado').value = lote.estado || 'Abierto';
    
    // Smart-select de artículos
    smartSelectInit({
        containerId: 'ss-eq-articulo',
        placeholder: '🔍 Buscar por código, marca, modelo o capacidad...',
        items: (cache.articulos || []).filter(a => a.activo !== false).map(a => {
            const llevaImei = a.lleva_imei !== false;
            const partes = [a.marca, a.modelo, a.capacidad, a.referencia].filter(x => x);
            return {
                id: a.id,
                label: `${a.codigo} · ${partes.join(' ')}`,
                sub: llevaImei ? 'Lleva IMEI/Serial' : 'SIN IMEI',
                meta: llevaImei ? '' : 'SIN IMEI',
                search: [a.codigo, a.marca, a.modelo, a.capacidad, a.referencia].filter(x => x).join(' ').toLowerCase(),
                _lleva_imei: llevaImei
            };
        }),
        value: '',
        onChange: (id, item) => {
            // Cambia el label de IMEI según el artículo
            const lbl = document.getElementById('lbl_eq_imei');
            const inp = document.getElementById('eq_imei');
            if(!lbl || !inp) return;
            if(item && item._lleva_imei === false) {
                lbl.textContent = 'Serial / Referencia (opcional)';
                inp.placeholder = 'Sin IMEI - opcional';
            } else {
                lbl.textContent = 'IMEI / Serial *';
                inp.placeholder = '358921...';
            }
            if(item) inp.focus();
        }
    });
    
    document.getElementById('eq_imei').value = '';
    document.getElementById('eq_costo').value = '';
    document.getElementById('eq_notas').value = '';
    
    aplicarPermisosAdminLote();
    cargarCalibracionLabelDiag();
    
    renderEquiposLote();
}

function aplicarPermisosAdminLote() {
    const esAdmin = isAdminUser();
    const costoWrap = document.getElementById('costo_admin_wrap');
    const thCosto = document.getElementById('th_costo');
    const totalWrap = document.getElementById('totalAcumuladoWrap');
    if(costoWrap) costoWrap.style.display = esAdmin ? '' : 'none';
    if(thCosto) thCosto.style.display = esAdmin ? '' : 'none';
    if(totalWrap) totalWrap.style.display = esAdmin ? '' : 'none';
}

function cargarCalibracionLabelDiag() {
    const w = localStorage.getItem('bayol_dlbl_w') || '51';
    const h = localStorage.getItem('bayol_dlbl_h') || '25';
    const f = localStorage.getItem('bayol_dlbl_f') || '9';
    const rot = localStorage.getItem('bayol_dlbl_rot') || '0';
    document.getElementById('dlbl_width').value = w;
    document.getElementById('dlbl_height').value = h;
    document.getElementById('dlbl_font').value = f;
    if(document.getElementById('dlbl_rotacion')) document.getElementById('dlbl_rotacion').value = rot;
    cambiarDimensionesLabelDiag();
}

function cambiarDimensionesLabelDiag() {
    const w = document.getElementById('dlbl_width').value;
    const h = document.getElementById('dlbl_height').value;
    const f = document.getElementById('dlbl_font').value;
    const rot = document.getElementById('dlbl_rotacion')?.value || '0';
    document.getElementById('dlbl_w_val').textContent = w + 'mm';
    document.getElementById('dlbl_h_val').textContent = h + 'mm';
    document.getElementById('dlbl_f_val').textContent = f + 'px';
    localStorage.setItem('bayol_dlbl_w', w);
    localStorage.setItem('bayol_dlbl_h', h);
    localStorage.setItem('bayol_dlbl_f', f);
    localStorage.setItem('bayol_dlbl_rot', rot);
    
    // Vista previa en vivo con un equipo de ejemplo
    const cont = document.getElementById('dlblPreviewVivo');
    if(cont) {
        const ejemplo = {
            id: '__ejemplo__',
            articulo_id: null,
            marca: 'APPLE', modelo: 'IPHONE 12', capacidad: '128GB',
            imei: '356789104567890', 
            lote_id: null,
            notas_diagnostico: 'PANTALLA ROTA, NO CARGA'
        };
        // Fallas de ejemplo para mostrar el checklist
        _fallasPorEquipo['__ejemplo__'] = [
            { falla_corto: 'CRISTAL ROTO' },
            { falla_corto: 'GHOST TOUCH' },
            { falla_corto: 'NO ENCIENDE' },
            { falla_corto: 'PANT ROTA' }
        ];
        // 1. HTML rápido
        cont.innerHTML = generarHtmlLabelDiag(ejemplo);
        // 2. Imagen real con debounce (lo que se imprime exacto)
        if(_dlblPreviewDebounce) clearTimeout(_dlblPreviewDebounce);
        _dlblPreviewDebounce = setTimeout(() => renderPreviewDiagImagenReal(ejemplo, w, h), 400);
    }
}

let _dlblPreviewDebounce = null;
async function renderPreviewDiagImagenReal(ejemplo, w, h) {
    if(typeof html2canvas !== 'function') return;
    const cont = document.getElementById('dlblPreviewVivo');
    if(!cont) return;
    try {
        const tmp = document.createElement('div');
        tmp.style.position = 'fixed';
        tmp.style.left = '-9999px';
        tmp.style.top = '0';
        tmp.style.background = '#fff';
        tmp.innerHTML = generarHtmlLabelDiag(ejemplo);
        document.body.appendChild(tmp);
        const labelEl = tmp.firstElementChild || tmp;
        const escala = 203 / 96;
        const canvas = await html2canvas(labelEl, { scale: escala, backgroundColor: '#ffffff', logging: false, useCORS: true });
        document.body.removeChild(tmp);
        const ratio = parseFloat(h) / parseFloat(w);
        const anchoPreview = 220;
        cont.innerHTML = `<img src="${canvas.toDataURL('image/png')}" style="width:${anchoPreview}px; height:${Math.round(anchoPreview*ratio)}px; display:block;" />`;
    } catch(e) {
        console.log('Preview diag imagen real:', e);
    }
}

function presetLabelDiag2x1() {
    document.getElementById('dlbl_width').value = 51;
    document.getElementById('dlbl_height').value = 25;
    document.getElementById('dlbl_font').value = 9;
    cambiarDimensionesLabelDiag();
    toast('Preset 2x1 pulgadas aplicado (51×25mm).');
}

function presetLabelDiag1x2() {
    document.getElementById('dlbl_width').value = 25;
    document.getElementById('dlbl_height').value = 51;
    document.getElementById('dlbl_font').value = 8;
    cambiarDimensionesLabelDiag();
    toast('Preset 1x2 pulgadas aplicado (25×51mm).');
}

function onArticuloChange() {
    // Función legacy - reemplazada por smart-select onChange
    const sel = document.getElementById('eq_articulo_id');
    if(!sel) return;
    const lbl = document.getElementById('lbl_eq_imei');
    const inp = document.getElementById('eq_imei');
    const opt = sel.options[sel.selectedIndex];
    const llevaImei = opt ? opt.getAttribute('data-imei') !== '0' : true;
    
    if(llevaImei) {
        lbl.textContent = 'IMEI / Serial *';
        inp.placeholder = '358921...';
    } else {
        lbl.textContent = 'Serial / Referencia (opcional)';
        inp.placeholder = 'Sin IMEI - opcional';
    }
    inp.focus();
}

async function guardarDatosLote() {
    if(!loteActualId) return;
    try {
        const { error } = await supabaseClient.from('refurb_lotes').update({
            fecha_compra: document.getElementById('lt_fecha').value || null,
            notas: val('lt_notas') || null,
            estado: document.getElementById('lt_estado').value
        }).eq('id', loteActualId);
        if(error) throw error;
        toast('Datos del lote guardados.');
        await loadAll();
    } catch(e) { logError('Guardar lote', e); alert(getFriendlyError(e)); }
}

async function agregarEquipoAlLote() {
    if(!loteActualId) return alert('Sin lote activo.');
    const artId = smartSelectGetValue('ss-eq-articulo');
    const imei = val('eq_imei');
    const notas = val('eq_notas');
    
    if(!artId) return alert('Selecciona un artículo del catálogo.');
    
    const art = findArticulo(artId);
    const llevaImei = art.lleva_imei !== false;
    
    if(llevaImei && !imei) return alert('Este artículo requiere IMEI / Serial.');
    
    let costo = 0;
    if(isAdminUser()) {
        costo = parseFloat(val('eq_costo')) || 0;
        if(costo <= 0) return alert('Costo debe ser mayor a 0.');
    }
    // Si no es admin, el costo queda en 0 y el admin lo edita después
    
    const modeloCompleto = `${art.marca} ${art.modelo}${art.capacidad ? ' ' + art.capacidad : ''}${art.referencia ? ' ' + art.referencia : ''}`;
    
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').insert([{
            articulo_id: artId,
            lote_id: loteActualId,
            modelo: modeloCompleto,
            marca: art.marca,
            capacidad: art.capacidad,
            color: art.referencia,
            imei: imei || null,
            costo_compra: costo,
            costo_repuestos: 0,
            estado: 'Recibido',
            notas_diagnostico: notas || null
        }]);
        if(error) throw error;
        toast(`Equipo agregado: ${art.marca} ${art.modelo}`);
        document.getElementById('eq_imei').value = '';
        document.getElementById('eq_costo').value = '';
        document.getElementById('eq_notas').value = '';
        smartSelectSetValue('ss-eq-articulo', '');
        document.getElementById(`ss-eq-articulo-input`)?.focus();
        await loadAll();
    } catch(e) { logError('Agregar equipo al lote', e); alert(getFriendlyError(e)); }
}

function renderEquiposLote() {
    if(!loteActualId) return;
    const tbody = document.getElementById('equiposLoteTable');
    if(!tbody) return;
    
    const equipos = cache.refurb.filter(r => r.lote_id === loteActualId);
    const esAdmin = isAdminUser();
    const colspan = esAdmin ? 5 : 4;
    
    if(!equipos.length) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; color:var(--text-muted); padding:15px;">Sin equipos agregados aún.</td></tr>`;
    } else {
        tbody.innerHTML = equipos.map(e => {
            const art = findArticulo(e.articulo_id);
            const modeloMostrar = art.codigo 
                ? `<b style="color:var(--blue-btn); text-transform:uppercase;">${escapeHtml(art.codigo)}</b> · <span style="text-transform:uppercase;">${escapeHtml(art.marca)} ${escapeHtml(art.modelo)}${art.capacidad ? ' ' + escapeHtml(art.capacidad) : ''}${art.referencia ? ' ' + escapeHtml(art.referencia) : ''}</span>` 
                : `<span style="text-transform:uppercase;">${escapeHtml(e.modelo)}</span>`;
            const costoCell = esAdmin ? `<td data-label="Costo"><b>${money(e.costo_compra)}</b></td>` : '';
            const notas = e.notas_diagnostico ? `<small style="color:var(--text-muted); text-transform:uppercase;">${escapeHtml(e.notas_diagnostico)}</small>` : '<span style="color:#cbd5e1;">-</span>';
            return `<tr>
                <td data-label="Artículo">${modeloMostrar}</td>
                <td data-label="IMEI"><code>${escapeHtml(e.imei || 'SIN IMEI')}</code></td>
                <td data-label="Notas">${notas}</td>
                ${costoCell}
                <td data-label="Acciones">
                    <button class="btn btn-light" style="padding:3px 6px; font-size:10px;" onclick="abrirPreviewLabelDiagIndividual('${e.id}')" title="Imprimir label"><i class="ti ti-printer"></i></button>
                    <button class="btn btn-light" style="padding:3px 6px; font-size:10px;" onclick="eliminarEquipoLote('${e.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    
    const totalLote = equipos.reduce((s, e) => s + (parseFloat(e.costo_compra) || 0), 0);
    document.getElementById('eq_count').textContent = equipos.length;
    document.getElementById('eq_total').textContent = money(totalLote);
    document.getElementById('lt_costo_total_display').value = esAdmin ? money(totalLote) : 'Solo Admin';
    document.getElementById('lt_cantidad_display').value = `${equipos.length} equipo${equipos.length === 1 ? '' : 's'}`;
}

async function eliminarEquipoLote(equipoId) {
    if(!confirm('¿Quitar este equipo del lote?')) return;
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').delete().eq('id', equipoId);
        if(error) throw error;
        toast('Equipo eliminado.');
        await loadAll();
    } catch(e) { logError('Eliminar equipo', e); alert(getFriendlyError(e)); }
}

async function eliminarLote(loteId) {
    const lote = cache.lotes.find(l => l.id === loteId);
    if(!lote) return;
    const equiposLote = cache.refurb.filter(r => r.lote_id === loteId).length;
    let msg = `¿Eliminar el lote ${lote.codigo_lote}?`;
    if(equiposLote > 0) msg += `\n\n⚠️ Este lote tiene ${equiposLote} equipo(s) que también serán eliminados.`;
    if(!confirm(msg)) return;
    try {
        await supabaseClient.from('equipos_refurbish').delete().eq('lote_id', loteId);
        const { error } = await supabaseClient.from('refurb_lotes').delete().eq('id', loteId);
        if(error) throw error;
        toast('Lote eliminado.');
        if(loteActualId === loteId) volverDetalleProveedor();
        await loadAll();
    } catch(e) { logError('Eliminar lote', e); alert(getFriendlyError(e)); }
}

/* ============================================================
   MÓDULO REFURBISH
   ============================================================ */

async function registrarEquipoRefurb() {
    try {
        const mod = val("ref_modelo"), imei = val("ref_imei"), cost = parseFloat(val("ref_costo_compra")) || 0, vent = parseFloat(val("ref_precio_venta")) || 0;
        if(!mod || !imei) return alert("Modelo e IMEI son mandatorios.");
        const { error } = await supabaseClient.from('equipos_refurbish').insert([{
            modelo: mod, imei: imei, costo_compra: cost, precio_venta_estimado: vent, costo_repuestos: 0, estado: 'Recibido'
        }]);
        if(error) throw error;
        toast("Equipo registrado.");
        ['ref_modelo','ref_imei','ref_costo_compra','ref_precio_venta'].forEach(id => document.getElementById(id).value = '');
        await loadAll();
    } catch(e) { logError("Registrar refurbish", e); alert(getFriendlyError(e)); }
}

/* ============================================================
   REACONDICIONADOS - NUEVO FLUJO POR LOTES
   ============================================================ */
let reacondTabActual = 'pendientes';
let reacondLoteAbiertoId = null;

function cargarLotesReacond() {
    // Filtra solo lotes enviados a reacond y calcula sus contadores
    const lotesReacond = (cache.lotes || []).filter(l => l.enviado_reacond === true);
    
    let contPend = 0, contEval = 0, contProc = 0, contListo = 0, contTerm = 0;
    const lotesConEstado = lotesReacond.map(lote => {
        const equipos = (cache.refurb || []).filter(r => r.lote_id === lote.id);
        const pendientes = equipos.filter(e => (e.estado_evaluacion || 'pendiente') === 'pendiente').length;
        const enEval = equipos.filter(e => e.estado_evaluacion === 'en_evaluacion').length;
        const evaluados = equipos.filter(e => e.estado_evaluacion === 'evaluado').length;
        const enProceso = equipos.filter(e => ['en_proceso','tecnico_recibio','espera_pieza','listo_revision','reasignado'].includes(e.estado_evaluacion)).length;
        const listoVenta = equipos.filter(e => e.estado_evaluacion === 'listo_venta').length;
        const vendidos = equipos.filter(e => e.estado_evaluacion === 'vendido').length;
        const total = equipos.length;
        
        // Decidir estado predominante del lote
        let estadoLote;
        if(total === 0) estadoLote = 'pendientes';
        else if(vendidos === total) estadoLote = 'terminados';
        else if(listoVenta > 0 && listoVenta + vendidos === total) estadoLote = 'listo_venta';
        else if(enProceso > 0) estadoLote = 'proceso';
        else if(enEval > 0 || (evaluados > 0 && evaluados < total)) estadoLote = 'evaluacion';
        else if(evaluados === total) estadoLote = 'proceso'; // todos evaluados pero ninguno aún en proceso = sigue siendo activo
        else estadoLote = 'pendientes';
        
        if(estadoLote === 'pendientes') contPend++;
        else if(estadoLote === 'evaluacion') contEval++;
        else if(estadoLote === 'proceso') contProc++;
        else if(estadoLote === 'listo_venta') contListo++;
        else contTerm++;
        
        return { lote, equipos, pendientes, enEval, evaluados, enProceso, listoVenta, vendidos, total, estadoLote };
    });
    
    // Actualizar contadores en pestañas
    const setBadge = (id, n) => { const el = document.getElementById(id); if(el) el.textContent = n; };
    setBadge('cntPendientes', contPend);
    setBadge('cntEvaluacion', contEval);
    setBadge('cntProceso', contProc);
    setBadge('cntListoVenta', contListo);
    setBadge('cntTerminados', contTerm);
    
    renderLotesReacondTab(lotesConEstado);
}

function renderLotesReacondTab(lotesConEstado) {
    const cont = document.getElementById('lotesReacondContainer');
    if(!cont) return;
    
    const filtrados = lotesConEstado.filter(d => d.estadoLote === reacondTabActual);
    
    if(filtrados.length === 0) {
        const msg = reacondTabActual === 'pendientes' 
            ? 'No hay lotes pendientes. Envía un lote desde el módulo Compras.'
            : reacondTabActual === 'evaluacion'
            ? 'No hay lotes en evaluación.'
            : reacondTabActual === 'proceso'
            ? 'No hay lotes en proceso de reparación.'
            : reacondTabActual === 'listo_venta'
            ? 'No hay lotes con equipos listos para venta.'
            : 'No hay lotes con equipos despachados.';
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">${msg}</p>`;
        return;
    }
    
    cont.innerHTML = filtrados.map(d => {
        const lote = d.lote;
        const prov = (cache.proveedores || []).find(p => p.id === lote.proveedor_id);
        const nombreLote = lote.nombre || ('Lote #' + (lote.id || '').slice(0,8));
        const fechaCompra = lote.fecha_compra ? new Date(lote.fecha_compra).toLocaleDateString('es-DO') : '—';
        const fechaEnvio = lote.fecha_envio_reacond ? new Date(lote.fecha_envio_reacond).toLocaleDateString('es-DO') : '—';
        const progreso = d.total > 0 ? Math.round((d.evaluados / d.total) * 100) : 0;
        
        return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:10px; padding:14px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                <div style="flex:1; min-width:200px;">
                    <div style="font-weight:700; font-size:15px; color:var(--blue-btn);">${escapeHtml(nombreLote)}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                        <i class="ti ti-truck"></i> ${escapeHtml(prov ? prov.nombre : 'Sin proveedor')}<br>
                        <i class="ti ti-calendar"></i> Compra: ${fechaCompra} · Enviado: ${fechaEnvio}
                    </div>
                </div>
                <button class="btn btn-blue" style="padding:8px 14px;" onclick="abrirLoteReacond('${lote.id}')"><i class="ti ti-folder-open"></i> Abrir Lote</button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(80px, 1fr)); gap:8px; margin-top:12px;">
                <div style="background:#fef3c7; padding:6px; border-radius:6px; text-align:center; font-size:11px;"><b style="font-size:16px; color:#92400e;">${d.pendientes}</b><br>Pendientes</div>
                <div style="background:#dbeafe; padding:6px; border-radius:6px; text-align:center; font-size:11px;"><b style="font-size:16px; color:#1e40af;">${d.enEval}</b><br>En Eval</div>
                <div style="background:#d1fae5; padding:6px; border-radius:6px; text-align:center; font-size:11px;"><b style="font-size:16px; color:#065f46;">${d.evaluados}</b><br>Evaluados</div>
                <div style="background:#f1f5f9; padding:6px; border-radius:6px; text-align:center; font-size:11px;"><b style="font-size:16px;">${d.total}</b><br>Total</div>
            </div>
            <div style="background:#e5e7eb; height:6px; border-radius:3px; margin-top:10px; overflow:hidden;">
                <div style="background:#10b981; height:100%; width:${progreso}%; transition:width 0.3s;"></div>
            </div>
            <div style="font-size:10px; color:var(--text-muted); text-align:right; margin-top:2px;">${progreso}% completado</div>
        </div>`;
    }).join('');
}

function cambiarTabReacond(tab) {
    reacondTabActual = tab;
    document.querySelectorAll('#reacondListaLotes .tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    cargarLotesReacond();
}

function abrirLoteReacond(loteId) {
    reacondLoteAbiertoId = loteId;
    document.getElementById('reacondListaLotes').style.display = 'none';
    document.getElementById('reacondDetalleLote').style.display = 'block';
    renderDetalleLoteReacond();
}

function volverListaLotesReacond() {
    reacondLoteAbiertoId = null;
    document.getElementById('reacondListaLotes').style.display = 'block';
    document.getElementById('reacondDetalleLote').style.display = 'none';
    cargarLotesReacond();
}

function renderDetalleLoteReacond() {
    if(!reacondLoteAbiertoId) return;
    const lote = (cache.lotes || []).find(l => l.id === reacondLoteAbiertoId);
    if(!lote) { volverListaLotesReacond(); return; }
    const prov = (cache.proveedores || []).find(p => p.id === lote.proveedor_id);
    const equipos = (cache.refurb || []).filter(r => r.lote_id === reacondLoteAbiertoId);
    
    // Titulo y info
    const nombreLote = lote.nombre || ('Lote #' + (lote.id || '').slice(0,8));
    document.getElementById('reacondLoteTitulo').textContent = nombreLote;
    
    const pendientes = equipos.filter(e => (e.estado_evaluacion || 'pendiente') === 'pendiente').length;
    const enEval = equipos.filter(e => e.estado_evaluacion === 'en_evaluacion').length;
    const evaluados = equipos.filter(e => e.estado_evaluacion === 'evaluado').length;
    
    document.getElementById('kpiPendientes').textContent = pendientes;
    document.getElementById('kpiEnEval').textContent = enEval;
    document.getElementById('kpiEvaluados').textContent = evaluados;
    
    // Badge de estado
    const badge = document.getElementById('reacondLoteEstadoBadge');
    if(evaluados === equipos.length && equipos.length > 0) {
        badge.textContent = '✅ Terminado';
        badge.style.cssText = 'background:#d1fae5; color:#065f46;';
    } else if(enEval > 0 || evaluados > 0) {
        badge.textContent = '⚠️ En Evaluación';
        badge.style.cssText = 'background:#dbeafe; color:#1e40af;';
    } else {
        badge.textContent = '🟡 Pendiente';
        badge.style.cssText = 'background:#fef3c7; color:#92400e;';
    }
    
    // Info del lote
    document.getElementById('reacondLoteInfo').innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
            <div><b><i class="ti ti-truck"></i> Proveedor:</b><br>${escapeHtml(prov ? prov.nombre : 'Sin proveedor')}</div>
            <div><b><i class="ti ti-calendar"></i> Compra:</b><br>${lote.fecha_compra ? new Date(lote.fecha_compra).toLocaleDateString('es-DO') : '—'}</div>
            <div><b><i class="ti ti-package"></i> Total equipos:</b><br>${equipos.length}</div>
        </div>
    `;
    
    // Lista de equipos
    const cont = document.getElementById('reacondEquiposLista');
    if(equipos.length === 0) {
        cont.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">Este lote no tiene equipos.</p>';
        return;
    }
    cont.innerHTML = equipos.map((eq, idx) => renderEquipoReacondCard(eq, idx + 1)).join('');
}

function renderEquipoReacondCard(eq, num) {
    const estado = eq.estado_evaluacion || 'pendiente';
    const tecnico = eq.tecnico_asignado_id ? (cache.tecnicos || []).find(t => t.id === eq.tecnico_asignado_id) : null;
    let badgeColor, badgeText, accionBtn;
    
    if(estado === 'pendiente') {
        badgeColor = 'background:#fef3c7; color:#92400e;';
        badgeText = '🟡 Pendiente';
        accionBtn = `<button class="btn btn-blue" style="padding:8px 14px;" onclick="empezarEvaluacion('${eq.id}')"><i class="ti ti-player-play"></i> Evaluar</button>`;
    } else if(estado === 'en_evaluacion') {
        badgeColor = 'background:#dbeafe; color:#1e40af;';
        badgeText = '⚠️ En Evaluación';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#1e40af;" onclick="continuarEvaluacion('${eq.id}')"><i class="ti ti-edit"></i> Continuar</button>`;
    } else if(estado === 'evaluado') {
        badgeColor = 'background:#d1fae5; color:#065f46;';
        badgeText = '✅ Evaluado';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#f59e0b;" onclick="abrirModalAsignarTecnico('${eq.id}')"><i class="ti ti-user-plus"></i> Asignar a Técnico</button>
                     <button class="btn btn-light" style="padding:8px 12px;" onclick="continuarEvaluacion('${eq.id}')" title="Ver/Editar"><i class="ti ti-eye"></i></button>`;
    } else if(estado === 'en_proceso') {
        badgeColor = 'background:#fed7aa; color:#9a3412;';
        badgeText = '🔧 En Proceso';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#9a3412;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-tool"></i> Trabajar</button>`;
    } else if(estado === 'reasignado') {
        badgeColor = 'background:#fef3c7; color:#92400e;';
        badgeText = '👥 Reasignado';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#f59e0b;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-package"></i> Recibir</button>`;
    } else if(estado === 'tecnico_recibio') {
        badgeColor = 'background:#bfdbfe; color:#1e40af;';
        badgeText = '📦 Técnico recibió';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#1e40af;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-tool"></i> Continuar</button>`;
    } else if(estado === 'espera_pieza') {
        badgeColor = 'background:#fde68a; color:#92400e;';
        badgeText = '⏳ Espera pieza';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#f59e0b;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-tool"></i> Ver/Actualizar</button>`;
    } else if(estado === 'listo_revision') {
        badgeColor = 'background:#e9d5ff; color:#6b21a8;';
        badgeText = '👁️ Revisión final';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#6b21a8;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-check"></i> Aprobar</button>`;
    } else if(estado === 'listo_venta') {
        badgeColor = 'background:#ddd6fe; color:#5b21b6;';
        badgeText = '🛒 Listo para venta';
        accionBtn = `<button class="btn btn-dark" style="padding:8px 14px; background:#5b21b6;" onclick="abrirModalLabelVenta('${eq.id}')"><i class="ti ti-printer"></i> Label Venta</button>
                     ${permBtn('estado_despachar', `<button class="btn btn-dark" style="padding:8px 14px; background:linear-gradient(180deg,#10b981,#059669); box-shadow:0 4px 0 #047857;" onclick="marcarDespachado('${eq.id}')"><i class="ti ti-truck-delivery"></i> Despachar</button>`)}
                     <button class="btn btn-light" style="padding:8px 12px;" onclick="abrirPanelProceso('${eq.id}')" title="Ver detalles"><i class="ti ti-eye"></i></button>`;
    } else if(estado === 'vendido') {
        badgeColor = 'background:#d1fae5; color:#065f46;';
        badgeText = '✅ Despachado';
        accionBtn = `<button class="btn btn-light" style="padding:8px 12px;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-eye"></i> Ver</button>`;
    } else {
        badgeColor = 'background:#f1f5f9; color:#64748b;';
        badgeText = estado;
        accionBtn = `<button class="btn btn-light" style="padding:8px 12px;" onclick="continuarEvaluacion('${eq.id}')"><i class="ti ti-eye"></i></button>`;
    }
    
    return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
            <div style="flex:1; min-width:200px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="background:var(--blue-btn); color:#fff; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">#${num}</span>
                    ${eq.veces_devuelto > 0 ? `<span title="Equipo devuelto ${eq.veces_devuelto} vez(es)" style="font-size:16px;">🔄</span>` : ''}
                    <b style="font-size:14px;">${escapeHtml(eq.modelo || 'Sin modelo')}</b>
                    <span class="badge" style="${badgeColor} font-size:11px;">${badgeText}</span>
                    ${eq.veces_devuelto > 0 ? `<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:10px; font-weight:700;">DEVUELTO ${eq.veces_devuelto}×</span>` : ''}
                    ${tecnico ? `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:11px;"><i class="ti ti-user"></i> ${escapeHtml(tecnico.nombre)}</span>` : ''}
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">
                    <i class="ti ti-barcode"></i> IMEI: ${escapeHtml(eq.imei || '—')}
                    ${eq.color ? ' · ' + escapeHtml(eq.color) : ''}
                    ${eq.capacidad ? ' · ' + escapeHtml(eq.capacidad) : ''}
                </div>
                ${tecnico && eq.fecha_asignacion ? `<div style="font-size:11px; color:#0891b2; font-weight:600; margin-top:4px;"><i class="ti ti-stopwatch"></i> Tomado: ${tiempoDesde(eq.fecha_asignacion)}</div>` : ''}
                ${eq.notas_diagnostico ? `<div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; margin-top:6px; font-size:12px;"><b>Notas:</b> ${escapeHtml(eq.notas_diagnostico)}</div>` : ''}
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                ${accionBtn}
            </div>
        </div>
    </div>`;
}

async function marcarEvaluado(equipoId) {
    if(!confirm('¿Marcar este equipo como evaluado?')) return;
    try {
        const { error } = await supabaseClient
            .from('equipos_refurbish')
            .update({ estado_evaluacion: 'evaluado' })
            .eq('id', equipoId);
        if(error) throw error;
        await loadAll();
        renderDetalleLoteReacond();
        toast('Equipo evaluado.');
    } catch(e) {
        logError('Marcar evaluado', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   REACONDICIONADOS - PESTAÑAS PRINCIPALES (Lotes / Catálogo)
   ============================================================ */
function cambiarMainTabReacond(tab) {
    document.getElementById('reacondMainContentLotes').style.display = tab === 'lotes' ? 'block' : 'none';
    document.getElementById('reacondMainContentCatalogo').style.display = tab === 'catalogo' ? 'block' : 'none';
    const devCont = document.getElementById('reacondMainContentDevoluciones');
    if(devCont) devCont.style.display = tab === 'devoluciones' ? 'block' : 'none';
    const pzCont = document.getElementById('reacondMainContentPiezas');
    if(pzCont) pzCont.style.display = tab === 'piezas' ? 'block' : 'none';
    
    const btnLotes = document.getElementById('reacondMainTabLotes');
    const btnCat = document.getElementById('reacondMainTabCatalogo');
    const btnDev = document.getElementById('reacondMainTabDevoluciones');
    const btnPz = document.getElementById('reacondMainTabPiezas');
    
    // Reset todos
    [btnLotes, btnCat, btnDev, btnPz].forEach(b => { 
        if(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; }
    });
    
    if(tab === 'lotes') {
        btnLotes.style.background = 'var(--blue-btn)';
        btnLotes.style.color = '#fff';
        cargarLotesReacond();
    } else if(tab === 'catalogo') {
        btnCat.style.background = '#6366f1';
        btnCat.style.color = '#fff';
        cargarCatalogoFallas();
    } else if(tab === 'devoluciones') {
        if(btnDev) {
            btnDev.style.background = 'linear-gradient(180deg,#dc2626,#991b1b)';
            btnDev.style.color = '#fff';
        }
        cargarDevoluciones();
    } else if(tab === 'piezas') {
        if(btnPz) {
            btnPz.style.background = 'linear-gradient(180deg,#0891b2,#0e7490)';
            btnPz.style.color = '#fff';
        }
        renderPedidosPiezasReacond();
    }
}

/* ============================================================
   CATÁLOGO DE FALLAS
   ============================================================ */
async function cargarCatalogoFallas() {
    try {
        const [{ data: cats, error: e1 }, { data: fallas, error: e2 }] = await Promise.all([
            supabaseClient.from('falla_categorias').select('*').order('orden', { ascending: true }),
            supabaseClient.from('fallas').select('*').order('nombre', { ascending: true })
        ]);
        if(e1) throw e1;
        if(e2) throw e2;
        cache.fallaCategorias = cats || [];
        cache.fallas = fallas || [];
        renderCatalogoFallas();
    } catch(e) {
        logError('Cargar catálogo fallas', e);
        const cont = document.getElementById('fallasContainer');
        if(cont) cont.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">Error al cargar: ${escapeHtml(getFriendlyError(e))}</p>`;
    }
}

function renderCatalogoFallas() {
    const cont = document.getElementById('fallasContainer');
    if(!cont) return;
    const buscador = (document.getElementById('fallasBuscador')?.value || '').toLowerCase().trim();
    
    const cats = (cache.fallaCategorias || []).filter(c => c.activa);
    const fallas = (cache.fallas || []);
    
    // Filtrar fallas por buscador
    const fallasFiltradas = buscador
        ? fallas.filter(f => (f.nombre || '').toLowerCase().includes(buscador) || (f.nombre_corto || '').toLowerCase().includes(buscador))
        : fallas;
    
    // Agrupar fallas por categoría
    const porCategoria = {};
    fallasFiltradas.forEach(f => {
        const catId = f.categoria_id || 'sin_categoria';
        if(!porCategoria[catId]) porCategoria[catId] = [];
        porCategoria[catId].push(f);
    });
    
    if(fallasFiltradas.length === 0) {
        cont.innerHTML = buscador
            ? `<p style="color:var(--text-muted); text-align:center; padding:30px;">No hay fallas que coincidan con "${escapeHtml(buscador)}"</p>`
            : `<p style="color:var(--text-muted); text-align:center; padding:30px;">No hay fallas registradas. Crea la primera con "+ Nueva Falla".</p>`;
        return;
    }
    
    let html = '';
    cats.forEach(cat => {
        const lista = porCategoria[cat.id] || [];
        if(lista.length === 0) return;
        html += `
            <div style="margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:${cat.color}15; border-left:4px solid ${cat.color}; border-radius:6px; margin-bottom:8px;">
                    <i class="ti ${escapeHtml(cat.icono)}" style="color:${cat.color}; font-size:18px;"></i>
                    <b style="color:${cat.color}; font-size:14px; text-transform:uppercase;">${escapeHtml(cat.nombre)}</b>
                    <span style="background:${cat.color}; color:#fff; padding:2px 8px; border-radius:10px; font-size:11px; margin-left:auto;">${lista.length}</span>
                </div>
                <div style="padding-left:8px;">
                    ${lista.map(f => `
                        <div data-item-id="${f.id}" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f1f5f9; gap:8px;">
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:13px; ${f.activa ? '' : 'text-decoration:line-through; color:var(--text-muted);'}">${escapeHtml(f.nombre)}</div>
                                <div style="font-size:10px; color:#6366f1; font-weight:700; margin-top:2px;">${escapeHtml(f.nombre_corto || '')}</div>
                            </div>
                            <div style="display:flex; gap:4px; flex-shrink:0;">
                                ${permBtn('catalogo_fallas', `<button onclick="editarFalla('${f.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;" title="Editar"><i class="ti ti-edit"></i></button>`)}
                                ${permBtn('catalogo_fallas_eliminar', `<button onclick="eliminarFalla('${f.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;" title="Eliminar"><i class="ti ti-trash"></i></button>`)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    // Fallas sin categoría
    if(porCategoria['sin_categoria']) {
        const lista = porCategoria['sin_categoria'];
        html += `
            <div style="margin-bottom:20px;">
                <div style="padding:8px 12px; background:#f1f5f9; border-radius:6px; margin-bottom:8px;">
                    <b style="color:#64748b; font-size:14px;">SIN CATEGORÍA</b>
                </div>
                ${lista.map(f => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f1f5f9;">
                        <div style="flex:1;">
                            <div style="font-size:13px;">${escapeHtml(f.nombre)}</div>
                            <div style="font-size:10px; color:#6366f1; font-weight:700;">${escapeHtml(f.nombre_corto || '')}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            ${permBtn('catalogo_fallas', `<button onclick="editarFalla('${f.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;"><i class="ti ti-edit"></i></button>`)}
                            ${permBtn('catalogo_fallas_eliminar', `<button onclick="eliminarFalla('${f.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;"><i class="ti ti-trash"></i></button>`)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    cont.innerHTML = html;
}

function abrirModalFalla() {
    document.getElementById('mod_falla_id').value = '';
    document.getElementById('mod_falla_nombre').value = '';
    document.getElementById('mod_falla_corto').value = '';
    document.getElementById('mod_falla_desc').value = '';
    document.getElementById('mod_falla_activa').checked = true;
    document.getElementById('modalFallaTitulo').textContent = 'Nueva Falla';
    
    // Llenar select de categorías
    const sel = document.getElementById('mod_falla_categoria');
    sel.innerHTML = '<option value="">-- Seleccionar categoría --</option>' + 
        (cache.fallaCategorias || []).filter(c => c.activa).map(c => 
            `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`
        ).join('');
    
    document.getElementById('modalFalla').classList.add('active');
}

function editarFalla(id) {
    const f = (cache.fallas || []).find(x => x.id === id);
    if(!f) return;
    
    // Llenar select de categorías
    const sel = document.getElementById('mod_falla_categoria');
    sel.innerHTML = '<option value="">-- Seleccionar categoría --</option>' + 
        (cache.fallaCategorias || []).filter(c => c.activa).map(c => 
            `<option value="${c.id}" ${c.id === f.categoria_id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
        ).join('');
    
    document.getElementById('mod_falla_id').value = f.id;
    document.getElementById('mod_falla_nombre').value = f.nombre || '';
    document.getElementById('mod_falla_corto').value = f.nombre_corto || '';
    document.getElementById('mod_falla_desc').value = f.descripcion || '';
    document.getElementById('mod_falla_activa').checked = f.activa !== false;
    document.getElementById('modalFallaTitulo').textContent = 'Editar Falla';
    document.getElementById('modalFalla').classList.add('active');
}

function cerrarModalFalla() {
    document.getElementById('modalFalla').classList.remove('active');
}

async function guardarFalla() {
    const id = document.getElementById('mod_falla_id').value;
    const categoria_id = document.getElementById('mod_falla_categoria').value || null;
    const nombre = document.getElementById('mod_falla_nombre').value.trim();
    const nombre_corto = document.getElementById('mod_falla_corto').value.trim().toUpperCase();
    const descripcion = document.getElementById('mod_falla_desc').value.trim() || null;
    const activa = document.getElementById('mod_falla_activa').checked;
    
    if(!nombre) return alert('El nombre completo es obligatorio.');
    if(!nombre_corto) return alert('El nombre corto para label es obligatorio.');
    if(nombre_corto.length > 40) return alert('El nombre corto debe tener máximo 40 caracteres.');
    
    const datos = { categoria_id, nombre, nombre_corto, descripcion, activa };
    
    try {
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('fallas').update(datos).eq('id', id);
            if(error) throw error;
            toast('✅ Falla actualizada.');
        } else {
            const { data, error } = await supabaseClient.from('fallas').insert([datos]).select().single();
            if(error) throw error;
            nuevoId = data?.id;
            toast('✅ Falla creada.');
        }
        cerrarModalFalla();
        await cargarCatalogoFallas();
        resaltarItemNuevo(nuevoId);
    } catch(e) {
        logError('Guardar falla', e);
        alert(getFriendlyError(e));
    }
}

async function eliminarFalla(id) {
    const f = (cache.fallas || []).find(x => x.id === id);
    if(!f) return;
    if(!confirm(`¿Eliminar la falla "${f.nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
        const { error } = await supabaseClient.from('fallas').delete().eq('id', id);
        if(error) throw error;
        toast('🗑️ Falla eliminada.');
        await cargarCatalogoFallas();
    } catch(e) {
        logError('Eliminar falla', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   PANEL DE EVALUACIÓN - FALLAS + PIEZAS
   ============================================================ */
const _evalState = {
    equipoId: null,
    fallasSeleccionadas: new Set(), // IDs de fallas marcadas
    piezasSeleccionadas: [],         // [{pieza_id, pieza_nombre, cantidad, costo_unitario}]
    categoriasContraidas: new Set(),  // IDs de categorías contraídas
    tabActiva: 'fallas'
};

async function empezarEvaluacion(equipoId) {
    // Si está pendiente, cambiar a en_evaluacion al abrir
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    
    try {
        // Cargar fallas y piezas si no están cargadas
        if(!cache.fallas || cache.fallas.length === 0) {
            await cargarCatalogoFallas();
        }
        
        // Cambiar estado a en_evaluacion si está pendiente
        if((eq.estado_evaluacion || 'pendiente') === 'pendiente') {
            const { error } = await supabaseClient
                .from('equipos_refurbish')
                .update({ estado_evaluacion: 'en_evaluacion' })
                .eq('id', equipoId);
            if(error) throw error;
        }
        
        await abrirModalEvaluacion(equipoId);
    } catch(e) {
        logError('Empezar evaluación', e);
        alert(getFriendlyError(e));
    }
}

function continuarEvaluacion(equipoId) {
    abrirModalEvaluacion(equipoId);
}

async function abrirModalEvaluacion(equipoId) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    
    // Cargar datos del catálogo si faltan
    if(!cache.fallas || cache.fallas.length === 0) {
        await cargarCatalogoFallas();
    }
    
    // Cargar fallas y piezas ya guardadas del equipo
    _evalState.equipoId = equipoId;
    _evalState.fallasSeleccionadas = new Set();
    _evalState.piezasSeleccionadas = [];
    _evalState.categoriasContraidas = new Set();
    _evalState.tabActiva = 'fallas';
    
    try {
        const [{ data: fallasEq }, { data: piezasEq }] = await Promise.all([
            supabaseClient.from('equipo_fallas').select('falla_id').eq('equipo_id', equipoId),
            supabaseClient.from('equipo_piezas_pedidas').select('*').eq('equipo_id', equipoId)
        ]);
        (fallasEq || []).forEach(f => f.falla_id && _evalState.fallasSeleccionadas.add(f.falla_id));
        _evalState.piezasSeleccionadas = (piezasEq || []).map(p => ({
            id: p.id,
            pieza_id: p.pieza_id,
            pieza_nombre: p.pieza_nombre,
            cantidad: p.cantidad || 1,
            costo_unitario: p.costo_unitario || 0,
            estado: p.estado || 'pendiente'
        }));
    } catch(e) {
        logError('Cargar evaluación previa', e);
    }
    
    // Llenar info del equipo
    document.getElementById('evalTituloModal').textContent = `Evaluando: ${eq.modelo || 'Equipo'}`;
    document.getElementById('evalEquipoInfo').innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; font-size:12px;">
            <div><b><i class="ti ti-device-mobile"></i> Modelo:</b><br>${escapeHtml(eq.modelo || '—')}</div>
            <div><b><i class="ti ti-barcode"></i> IMEI:</b><br>${escapeHtml(eq.imei || '—')}</div>
            ${eq.color ? `<div><b><i class="ti ti-palette"></i> Color:</b><br>${escapeHtml(eq.color)}</div>` : ''}
            ${eq.capacidad ? `<div><b><i class="ti ti-database"></i> Capacidad:</b><br>${escapeHtml(eq.capacidad)}</div>` : ''}
        </div>
    `;
    document.getElementById('eval_equipo_id').value = equipoId;
    document.getElementById('eval_notas').value = eq.notas_diagnostico || '';
    document.getElementById('evalBuscarFalla').value = '';
    document.getElementById('eval_pieza_cantidad').value = 1;
    
    // Inicializar smart-select de piezas
    smartSelectInit({
        containerId: 'ss-eval-pieza',
        placeholder: '🔍 Buscar pieza del inventario...',
        items: (cache.piezas || []).filter(p => p.cantidad > 0 || true).map(p => ({
            id: p.id,
            label: p.nombre,
            sub: `Stock: ${p.cantidad || 0} · Costo: ${money(p.costo || 0)}`,
            search: [p.nombre, p.codigo].filter(x => x).join(' ').toLowerCase(),
            _pieza: p
        })),
        value: '',
        onChange: () => {}
    });
    
    renderFallasEvaluacion();
    renderPiezasEvaluacion();
    renderResumenEvaluacion();
    actualizarContadoresEvaluacion();
    cambiarTabEvaluacion('fallas');
    
    document.getElementById('modalEvaluacion').classList.add('active');
}

function cerrarModalEvaluacion() {
    document.getElementById('modalEvaluacion').classList.remove('active');
}

function cambiarTabEvaluacion(tab) {
    _evalState.tabActiva = tab;
    document.querySelectorAll('.eval-tab').forEach(b => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle('active', isActive);
        b.style.borderBottomColor = isActive ? 'var(--blue-btn)' : 'transparent';
        b.style.color = isActive ? 'var(--blue-btn)' : 'var(--text-muted)';
    });
    document.getElementById('evalTabFallas').style.display = tab === 'fallas' ? 'block' : 'none';
    document.getElementById('evalTabPiezas').style.display = tab === 'piezas' ? 'block' : 'none';
    document.getElementById('evalTabResumen').style.display = tab === 'resumen' ? 'block' : 'none';
    if(tab === 'piezas') renderFallasEnTabPiezas();
    if(tab === 'resumen') renderResumenEvaluacion();
    actualizarBotonesWizard(tab);
}

// Muestra/oculta los botones según el tab (wizard)
function actualizarBotonesWizard(tab) {
    const btnAtras = document.getElementById('evalBtnAtras');
    const btnSiguiente = document.getElementById('evalBtnSiguiente');
    const btnGuardar = document.getElementById('evalBtnGuardar');
    const btnGuardarEval = document.getElementById('evalBtnGuardarEvaluado');
    
    // Atrás: oculto en el primer tab (fallas)
    btnAtras.style.display = tab === 'fallas' ? 'none' : 'inline-flex';
    // Siguiente: visible en fallas y piezas, oculto en resumen
    btnSiguiente.style.display = tab === 'resumen' ? 'none' : 'inline-flex';
    // Guardar / Guardar+evaluado: solo en resumen
    btnGuardar.style.display = tab === 'resumen' ? 'inline-flex' : 'none';
    btnGuardarEval.style.display = tab === 'resumen' ? 'inline-flex' : 'none';
}

const _ordenTabsEval = ['fallas', 'piezas', 'resumen'];

function evalNavegarSiguiente() {
    const idx = _ordenTabsEval.indexOf(_evalState.tabActiva);
    if(idx < _ordenTabsEval.length - 1) cambiarTabEvaluacion(_ordenTabsEval[idx + 1]);
}

function evalNavegarAtras() {
    const idx = _ordenTabsEval.indexOf(_evalState.tabActiva);
    if(idx > 0) cambiarTabEvaluacion(_ordenTabsEval[idx - 1]);
}

// Cuadro resumen de fallas seleccionadas en el tab Piezas
function renderFallasEnTabPiezas() {
    const cont = document.getElementById('evalPiezasFallasChips');
    const wrap = document.getElementById('evalPiezasFallasResumen');
    if(!cont || !wrap) return;
    const idsSeleccionados = _evalState.fallasSeleccionadas ? Array.from(_evalState.fallasSeleccionadas) : [];
    if(idsSeleccionados.length === 0) {
        wrap.style.display = 'none';
        return;
    }
    const fallas = cache.fallas || [];
    wrap.style.display = 'block';
    cont.innerHTML = idsSeleccionados.map(fid => {
        const f = fallas.find(x => x.id === fid);
        if(!f) return '';
        return `<span class="badge" style="background:#fff; color:#92400e; border:1px solid #f59e0b; font-size:11px;">${escapeHtml(f.nombre_corto || f.nombre)}</span>`;
    }).join('');
}

// Imprimir label de diagnóstico desde el resumen de evaluación
async function imprimirLabelDesdeEvaluacion() {
    const equipoId = document.getElementById('eval_equipo_id').value;
    if(!equipoId) return alert('No hay equipo seleccionado.');
    if(typeof abrirPreviewLabelDiagIndividual === 'function') {
        await abrirPreviewLabelDiagIndividual(equipoId);
    } else {
        alert('Función de label no disponible.');
    }
}

function renderFallasEvaluacion() {
    const cont = document.getElementById('evalFallasContenedor');
    if(!cont) return;
    const buscador = (document.getElementById('evalBuscarFalla')?.value || '').toLowerCase().trim();
    const cats = (cache.fallaCategorias || []).filter(c => c.activa);
    const fallas = (cache.fallas || []).filter(f => f.activa !== false);
    
    // Filtrar por buscador
    const filtradas = buscador
        ? fallas.filter(f => (f.nombre || '').toLowerCase().includes(buscador) || (f.nombre_corto || '').toLowerCase().includes(buscador))
        : fallas;
    
    // Agrupar por categoría
    const porCat = {};
    filtradas.forEach(f => {
        const cid = f.categoria_id || 'sin_cat';
        if(!porCat[cid]) porCat[cid] = [];
        porCat[cid].push(f);
    });
    
    if(filtradas.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px;">${buscador ? 'Sin resultados.' : 'No hay fallas en el catálogo. Crea fallas en la pestaña Catálogo.'}</p>`;
        return;
    }
    
    let html = '';
    cats.forEach(cat => {
        const lista = porCat[cat.id] || [];
        if(lista.length === 0) return;
        const marcadas = lista.filter(f => _evalState.fallasSeleccionadas.has(f.id)).length;
        const contraida = _evalState.categoriasContraidas.has(cat.id);
        
        html += `
            <div style="margin-bottom:10px; border:1px solid ${cat.color}40; border-radius:8px; overflow:hidden;">
                <div onclick="evalToggleCategoria('${cat.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:${cat.color}15; cursor:pointer; user-select:none;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ti ${contraida ? 'ti-chevron-right' : 'ti-chevron-down'}" style="color:${cat.color};"></i>
                        <i class="ti ${escapeHtml(cat.icono)}" style="color:${cat.color};"></i>
                        <b style="color:${cat.color}; font-size:13px; text-transform:uppercase;">${escapeHtml(cat.nombre)}</b>
                    </div>
                    <span style="background:${marcadas > 0 ? cat.color : '#cbd5e1'}; color:#fff; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">${marcadas}/${lista.length}</span>
                </div>
                ${!contraida ? `<div style="padding:6px 14px 10px;">
                    ${lista.map(f => {
                        const checked = _evalState.fallasSeleccionadas.has(f.id);
                        return `<label style="display:flex; align-items:center; gap:8px; padding:6px 4px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="evalToggleFalla('${f.id}')" style="width:18px; height:18px; cursor:pointer; accent-color:${cat.color};">
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:13px; ${checked ? 'font-weight:600;' : ''}">${escapeHtml(f.nombre)}</div>
                                <div style="font-size:10px; color:#6366f1; font-weight:700;">${escapeHtml(f.nombre_corto || '')}</div>
                            </div>
                        </label>`;
                    }).join('')}
                </div>` : ''}
            </div>
        `;
    });
    
    // Sin categoría
    if(porCat['sin_cat']) {
        const lista = porCat['sin_cat'];
        const marcadas = lista.filter(f => _evalState.fallasSeleccionadas.has(f.id)).length;
        html += `
            <div style="margin-bottom:10px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#f1f5f9;">
                    <b style="color:#64748b; font-size:13px;">SIN CATEGORÍA</b>
                    <span style="background:#94a3b8; color:#fff; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">${marcadas}/${lista.length}</span>
                </div>
                <div style="padding:6px 14px 10px;">
                    ${lista.map(f => {
                        const checked = _evalState.fallasSeleccionadas.has(f.id);
                        return `<label style="display:flex; align-items:center; gap:8px; padding:6px 4px; cursor:pointer;">
                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="evalToggleFalla('${f.id}')" style="width:18px; height:18px;">
                            <div style="flex:1;"><div style="font-size:13px;">${escapeHtml(f.nombre)}</div><div style="font-size:10px; color:#6366f1; font-weight:700;">${escapeHtml(f.nombre_corto || '')}</div></div>
                        </label>`;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    cont.innerHTML = html;
}

function evalToggleFalla(fallaId) {
    if(_evalState.fallasSeleccionadas.has(fallaId)) {
        _evalState.fallasSeleccionadas.delete(fallaId);
    } else {
        _evalState.fallasSeleccionadas.add(fallaId);
    }
    actualizarContadoresEvaluacion();
    // Solo re-renderizar contadores de categoría, no toda la lista (mantiene scroll)
    renderFallasEvaluacion();
}

function evalToggleCategoria(catId) {
    if(_evalState.categoriasContraidas.has(catId)) {
        _evalState.categoriasContraidas.delete(catId);
    } else {
        _evalState.categoriasContraidas.add(catId);
    }
    renderFallasEvaluacion();
}

function evalExpandirTodas() {
    _evalState.categoriasContraidas.clear();
    renderFallasEvaluacion();
}

function evalContraerTodas() {
    (cache.fallaCategorias || []).forEach(c => _evalState.categoriasContraidas.add(c.id));
    renderFallasEvaluacion();
}

function actualizarContadoresEvaluacion() {
    document.getElementById('evalCntFallas').textContent = _evalState.fallasSeleccionadas.size;
    document.getElementById('evalCntPiezas').textContent = _evalState.piezasSeleccionadas.length;
}

function renderPiezasEvaluacion() {
    const cont = document.getElementById('evalPiezasLista');
    if(!cont) return;
    
    if(_evalState.piezasSeleccionadas.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px; font-size:13px;">Aún no has agregado piezas. Selecciona una arriba y dale "Agregar".</p>`;
        return;
    }
    
    let total = 0;
    cont.innerHTML = _evalState.piezasSeleccionadas.map((p, idx) => {
        const subtotal = (p.cantidad || 1) * (p.costo_unitario || 0);
        total += subtotal;
        return `
            <div style="display:flex; gap:10px; align-items:center; padding:10px 12px; background:#fff; border:1px solid var(--border-color); border-radius:8px; margin-bottom:6px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; font-size:13px;">${escapeHtml(p.pieza_nombre || 'Pieza')}</div>
                    <div style="font-size:11px; color:var(--text-muted);">Costo unitario: ${money(p.costo_unitario || 0)} · Subtotal: <b style="color:var(--blue-btn);">${money(subtotal)}</b></div>
                </div>
                <input type="number" value="${p.cantidad || 1}" min="1" max="50" onchange="evalCambiarCantidadPieza(${idx}, this.value)" style="width:65px; font-weight:700; padding:6px;">
                <button onclick="evalQuitarPieza(${idx})" style="background:#fee2e2; color:#991b1b; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Quitar"><i class="ti ti-trash"></i></button>
            </div>
        `;
    }).join('') + `
        <div style="margin-top:12px; padding:12px; background:#dbeafe; border-radius:8px; text-align:right; font-weight:700; color:#1e40af;">
            TOTAL PIEZAS: ${money(total)}
        </div>
    `;
}

function evalAgregarPieza() {
    const piezaId = smartSelectGetValue('ss-eval-pieza');
    if(!piezaId) return alert('Selecciona una pieza primero.');
    
    const pieza = (cache.piezas || []).find(p => p.id === piezaId);
    if(!pieza) return alert('Pieza no encontrada.');
    
    const cantidad = parseInt(document.getElementById('eval_pieza_cantidad').value) || 1;
    if(cantidad < 1) return alert('Cantidad inválida.');
    
    // ¿Ya está agregada? Sumar cantidad
    const existente = _evalState.piezasSeleccionadas.find(p => p.pieza_id === piezaId);
    if(existente) {
        existente.cantidad = (existente.cantidad || 0) + cantidad;
    } else {
        _evalState.piezasSeleccionadas.push({
            pieza_id: piezaId,
            pieza_nombre: pieza.nombre,
            cantidad: cantidad,
            costo_unitario: parseFloat(pieza.costo) || 0,
            estado: 'pendiente'
        });
    }
    
    // Limpiar selector
    smartSelectSetValue('ss-eval-pieza', '');
    document.getElementById('eval_pieza_cantidad').value = 1;
    
    actualizarContadoresEvaluacion();
    renderPiezasEvaluacion();
}

function evalQuitarPieza(idx) {
    _evalState.piezasSeleccionadas.splice(idx, 1);
    actualizarContadoresEvaluacion();
    renderPiezasEvaluacion();
}

function evalCambiarCantidadPieza(idx, nuevaCant) {
    const n = parseInt(nuevaCant) || 1;
    if(n < 1) return;
    if(_evalState.piezasSeleccionadas[idx]) {
        _evalState.piezasSeleccionadas[idx].cantidad = n;
        renderPiezasEvaluacion();
    }
}

function renderResumenEvaluacion() {
    // Resumen de fallas
    const fallasEl = document.getElementById('evalResumenFallas');
    if(fallasEl) {
        if(_evalState.fallasSeleccionadas.size === 0) {
            fallasEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">No has marcado fallas todavía.</p>';
        } else {
            const fallasObj = (cache.fallas || []).filter(f => _evalState.fallasSeleccionadas.has(f.id));
            fallasEl.innerHTML = fallasObj.map(f => {
                const cat = (cache.fallaCategorias || []).find(c => c.id === f.categoria_id);
                const color = cat?.color || '#64748b';
                return `<div style="display:flex; gap:8px; padding:4px 0; align-items:center;">
                    <span style="background:${color}; color:#fff; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; min-width:80px; text-align:center;">${escapeHtml(f.nombre_corto || '')}</span>
                    <span>${escapeHtml(f.nombre)}</span>
                </div>`;
            }).join('');
        }
    }
    
    // Resumen de piezas
    const piezasEl = document.getElementById('evalResumenPiezas');
    const costoEl = document.getElementById('evalCostoTotal');
    if(piezasEl) {
        if(_evalState.piezasSeleccionadas.length === 0) {
            piezasEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">No has agregado piezas todavía.</p>';
            if(costoEl) costoEl.innerHTML = '';
        } else {
            let total = 0;
            piezasEl.innerHTML = _evalState.piezasSeleccionadas.map(p => {
                const sub = (p.cantidad || 1) * (p.costo_unitario || 0);
                total += sub;
                return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #e5e7eb;">
                    <span>${escapeHtml(p.pieza_nombre)} ×${p.cantidad}</span>
                    <span style="font-weight:600;">${money(sub)}</span>
                </div>`;
            }).join('');
            if(costoEl) costoEl.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>TOTAL PIEZAS:</span><span>${money(total)}</span></div>`;
        }
    }
}

async function guardarEvaluacion(marcarEvaluado = false) {
    const equipoId = _evalState.equipoId;
    if(!equipoId) return alert('No hay equipo activo.');
    
    const notas = document.getElementById('eval_notas').value.trim() || null;
    
    try {
        // 1. Borrar fallas previas y guardar nuevas
        await supabaseClient.from('equipo_fallas').delete().eq('equipo_id', equipoId);
        
        const fallasArray = Array.from(_evalState.fallasSeleccionadas);
        if(fallasArray.length > 0) {
            const fallasObj = (cache.fallas || []).filter(f => _evalState.fallasSeleccionadas.has(f.id));
            const cats = cache.fallaCategorias || [];
            const inserts = fallasObj.map(f => {
                const cat = cats.find(c => c.id === f.categoria_id);
                return {
                    equipo_id: equipoId,
                    falla_id: f.id,
                    falla_nombre: f.nombre,
                    falla_corto: f.nombre_corto,
                    falla_categoria: cat?.nombre || null
                };
            });
            const { error: e1 } = await supabaseClient.from('equipo_fallas').insert(inserts);
            if(e1) throw e1;
        }
        
        // 2. Borrar piezas previas y guardar nuevas
        await supabaseClient.from('equipo_piezas_pedidas').delete().eq('equipo_id', equipoId);
        
        if(_evalState.piezasSeleccionadas.length > 0) {
            const insertsPz = _evalState.piezasSeleccionadas.map(p => ({
                equipo_id: equipoId,
                pieza_id: p.pieza_id,
                pieza_nombre: p.pieza_nombre,
                cantidad: p.cantidad,
                costo_unitario: p.costo_unitario,
                estado: p.estado || 'pendiente'
            }));
            const { error: e2 } = await supabaseClient.from('equipo_piezas_pedidas').insert(insertsPz);
            if(e2) throw e2;
        }
        
        // 3. Actualizar notas y estado del equipo
        const updateData = { notas_diagnostico: notas };
        if(marcarEvaluado) {
            updateData.estado_evaluacion = 'evaluado';
        } else {
            updateData.estado_evaluacion = 'en_evaluacion';
        }
        // Actualizar costo de repuestos (suma de piezas)
        const totalPiezas = _evalState.piezasSeleccionadas.reduce((s, p) => s + (p.cantidad || 1) * (p.costo_unitario || 0), 0);
        updateData.costo_repuestos = totalPiezas;
        
        const { error: e3 } = await supabaseClient
            .from('equipos_refurbish')
            .update(updateData)
            .eq('id', equipoId);
        if(e3) throw e3;
        
        toast(marcarEvaluado ? 'Evaluación guardada y equipo marcado como evaluado.' : 'Evaluación guardada.');
        cerrarModalEvaluacion();
        // Crear tareas automáticas desde las fallas del catálogo (solo si no hay tareas aún)
        const fallasObjTareas = (cache.fallas || []).filter(f => _evalState.fallasSeleccionadas.has(f.id));
        const textosFallas = fallasObjTareas.map(f => f.nombre_corto || f.nombre);
        await loadAll();
        await crearTareasDesdeFallas('equipo', equipoId, textosFallas);
        await loadAll();
        renderDetalleLoteReacond();
    } catch(e) {
        logError('Guardar evaluación', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   CONFIGURACIÓN - PESTAÑAS
   ============================================================ */
function cambiarMainTabConfig(tab) {
    document.getElementById('cfgContentTecnicos').style.display = tab === 'tecnicos' ? 'block' : 'none';
    document.getElementById('cfgContentGeneral').style.display = tab === 'general' ? 'block' : 'none';
    const rolesCont = document.getElementById('cfgContentRoles');
    if(rolesCont) rolesCont.style.display = tab === 'roles' ? 'block' : 'none';
    const catCont = document.getElementById('cfgContentCatalogos');
    if(catCont) catCont.style.display = tab === 'catalogos' ? 'block' : 'none';
    
    const btnTec = document.getElementById('cfgMainTabTecnicos');
    const btnRoles = document.getElementById('cfgMainTabRoles');
    const btnCat = document.getElementById('cfgMainTabCatalogos');
    const btnGen = document.getElementById('cfgMainTabGeneral');
    
    // Reset todos
    [btnTec, btnRoles, btnCat, btnGen].forEach(b => {
        if(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; }
    });
    
    if(tab === 'tecnicos') {
        btnTec.style.background = 'var(--blue-btn)';
        btnTec.style.color = '#fff';
        renderTecnicos();
    } else if(tab === 'roles') {
        if(btnRoles) {
            btnRoles.style.background = 'linear-gradient(180deg,#6366f1,#4338ca)';
            btnRoles.style.color = '#fff';
        }
        cargarRoles();
    } else if(tab === 'catalogos') {
        if(btnCat) {
            btnCat.style.background = 'linear-gradient(180deg,#0891b2,#0e7490)';
            btnCat.style.color = '#fff';
        }
        cargarCatalogosConfig();
    } else if(tab === 'general') {
        btnGen.style.background = 'var(--blue-btn)';
        btnGen.style.color = '#fff';
    }
}

/* ============================================================
   CRUD TÉCNICOS
   ============================================================ */
function renderTecnicos() {
    const cont = document.getElementById('tecnicosLista');
    if(!cont) return;
    const tecnicos = cache.tecnicos || [];
    if(tecnicos.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">No hay empleados registrados. Crea el primero con "+ Nuevo Empleado".</p>`;
        return;
    }
    cont.innerHTML = tecnicos.map(t => {
        const activoBadge = t.activo 
            ? '<span class="badge" style="background:#d1fae5; color:#065f46;">Activo</span>'
            : '<span class="badge" style="background:#fee2e2; color:#991b1b;">Inactivo</span>';
        const tipoBadge = (t.tipo_empleado === 'servicio')
            ? '<span class="badge" style="background:#cffafe; color:#0e7490;"><i class="ti ti-headset"></i> Servicio al Cliente</span>'
            : (t.tipo_empleado === 'admin' || (!t.tipo_empleado && t.rol === 'admin'))
                ? '<span class="badge" style="background:#fef3c7; color:#92400e;"><i class="ti ti-shield"></i> Administrador</span>'
                : '<span class="badge" style="background:#e0e7ff; color:#3730a3;"><i class="ti ti-tool"></i> Técnico</span>';
        const rolPersonalizado = t.rol_id ? (_rolesCache || []).find(r => r.id === t.rol_id) : null;
        const rolPersonalBadge = rolPersonalizado 
            ? `<span class="badge" style="background:#ede9fe; color:#5b21b6;"><i class="ti ti-shield"></i> ${escapeHtml(rolPersonalizado.nombre)}</span>` 
            : '';
        const loginBadge = t.usuario 
            ? `<span class="badge" style="background:#d1fae5; color:#065f46;"><i class="ti ti-key"></i> ${escapeHtml(t.usuario)}</span>` 
            : '<span class="badge" style="background:#f1f5f9; color:#94a3b8;"><i class="ti ti-lock-off"></i> Sin login</span>';
        return `<div data-item-id="${t.id}" style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:14px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                <div style="flex:1; min-width:200px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <b style="font-size:15px;">${escapeHtml(t.nombre)}</b>
                        ${tipoBadge}
                        ${rolPersonalBadge}
                        ${loginBadge}
                        ${activoBadge}
                    </div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">
                        ${t.telefono ? `<i class="ti ti-phone"></i> ${escapeHtml(t.telefono)}` : ''}
                        ${t.especialidad ? ` · <i class="ti ti-star"></i> ${escapeHtml(t.especialidad)}` : ''}
                        ${t.ultimo_acceso ? ` · <i class="ti ti-clock"></i> Último acceso: ${new Date(t.ultimo_acceso).toLocaleDateString('es-DO')}` : ''}
                    </div>
                    ${t.notas ? `<div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; margin-top:6px; font-size:12px;">${escapeHtml(t.notas)}</div>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                    ${(t.tipo_empleado === 'tecnico' || (!t.tipo_empleado && t.rol !== 'admin')) ? (function(){
                        const piezasTec = (cache.ordenPiezas || []).filter(p => p.tecnico_id === t.id && ['recibida','devolucion_solicitada'].includes(p.estado));
                        const n = piezasTec.length;
                        return `<button onclick="verPiezasDelTecnico('${t.id}')" style="background:${n > 0 ? '#fed7aa' : '#f1f5f9'}; color:${n > 0 ? '#9a3412' : '#64748b'}; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Piezas en su poder"><i class="ti ti-packages"></i>${n > 0 ? ' ' + n : ''}</button>`;
                    })() : ''}
                    ${permBtn('config_tecnicos', `<button onclick="editarTecnico('${t.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Editar"><i class="ti ti-edit"></i></button>`)}
                    ${permBtn('config_tecnicos_eliminar', `<button onclick="eliminarTecnico('${t.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Eliminar"><i class="ti ti-trash"></i></button>`)}
                </div>
            </div>
        </div>`;
    }).join('');
}

function llenarSelectorRolesTecnico(selectedRolId) {
    const sel = document.getElementById('mod_tec_rol_id');
    if(!sel) return;
    const rolesActivos = (_rolesCache || []).filter(r => r.activo);
    sel.innerHTML = '<option value="">-- Sin rol personalizado --</option>' + 
        rolesActivos.map(r => 
            `<option value="${r.id}" ${r.id === selectedRolId ? 'selected' : ''}>${escapeHtml(r.nombre)}${r.es_sistema ? ' (sistema)' : ''}</option>`
        ).join('');
}

function abrirModalTecnico() {
    document.getElementById('mod_tec_id').value = '';
    document.getElementById('mod_tec_tipo').value = 'tecnico';
    document.getElementById('mod_tec_nombre').value = '';
    document.getElementById('mod_tec_telefono').value = '';
    document.getElementById('mod_tec_especialidad').value = '';
    document.getElementById('mod_tec_rol').value = 'tecnico';
    document.getElementById('mod_tec_notas').value = '';
    document.getElementById('mod_tec_usuario').value = '';
    document.getElementById('mod_tec_clave').value = '';
    document.getElementById('mod_tec_activo').checked = true;
    document.getElementById('modalTecnicoTitulo').textContent = 'Nuevo Empleado';
    actualizarCamposPorTipoEmpleado();
    // Cargar roles antes de abrir
    if(_rolesCache.length === 0) {
        cargarRoles().then(() => llenarSelectorRolesTecnico(''));
    } else {
        llenarSelectorRolesTecnico('');
    }
    document.getElementById('modalTecnico').classList.add('active');
}

// Ajusta los campos visibles según el tipo de empleado
function actualizarCamposPorTipoEmpleado() {
    const tipo = document.getElementById('mod_tec_tipo')?.value || 'tecnico';
    const espRow = document.getElementById('mod_tec_especialidad')?.closest('.form-row');
    // La especialidad solo aplica a técnicos
    if(espRow) espRow.style.display = (tipo === 'tecnico') ? '' : 'none';
    // El "rol del sistema" (oculto) se ajusta automático: admin si el tipo es admin
    const rolEl = document.getElementById('mod_tec_rol');
    if(rolEl) rolEl.value = (tipo === 'admin') ? 'admin' : 'tecnico';
}

function editarTecnico(id) {
    const t = (cache.tecnicos || []).find(x => x.id === id);
    if(!t) return;
    document.getElementById('mod_tec_id').value = t.id;
    // Deducir el tipo: si no tiene tipo_empleado pero su rol es admin, mostrarlo como admin
    let tipoEmp = t.tipo_empleado;
    if(!tipoEmp) tipoEmp = (t.rol === 'admin') ? 'admin' : 'tecnico';
    document.getElementById('mod_tec_tipo').value = tipoEmp;
    document.getElementById('mod_tec_nombre').value = t.nombre || '';
    document.getElementById('mod_tec_telefono').value = t.telefono || '';
    document.getElementById('mod_tec_especialidad').value = t.especialidad || '';
    document.getElementById('mod_tec_rol').value = t.rol || 'tecnico';
    document.getElementById('mod_tec_notas').value = t.notas || '';
    document.getElementById('mod_tec_usuario').value = t.usuario || '';
    document.getElementById('mod_tec_clave').value = ''; // nunca mostrar la clave actual
    document.getElementById('mod_tec_activo').checked = t.activo !== false;
    document.getElementById('modalTecnicoTitulo').textContent = 'Editar Empleado';
    actualizarCamposPorTipoEmpleado();
    if(_rolesCache.length === 0) {
        cargarRoles().then(() => llenarSelectorRolesTecnico(t.rol_id || ''));
    } else {
        llenarSelectorRolesTecnico(t.rol_id || '');
    }
    document.getElementById('modalTecnico').classList.add('active');
}

function cerrarModalTecnico() {
    document.getElementById('modalTecnico').classList.remove('active');
}

async function guardarTecnico() {
    const id = document.getElementById('mod_tec_id').value;
    const nombre = document.getElementById('mod_tec_nombre').value.trim();
    if(!nombre) return alert('El nombre es obligatorio.');
    
    const usuario = document.getElementById('mod_tec_usuario').value.trim();
    const clave = document.getElementById('mod_tec_clave').value.trim();
    
    const tipoEmp = document.getElementById('mod_tec_tipo').value || 'tecnico';
    const datos = {
        nombre,
        tipo_empleado: tipoEmp,
        telefono: document.getElementById('mod_tec_telefono').value.trim() || null,
        especialidad: document.getElementById('mod_tec_especialidad').value.trim() || null,
        rol: (tipoEmp === 'admin') ? 'admin' : 'tecnico',
        rol_id: document.getElementById('mod_tec_rol_id').value || null,
        notas: document.getElementById('mod_tec_notas').value.trim() || null,
        activo: document.getElementById('mod_tec_activo').checked
    };
    
    // Manejar usuario (login)
    datos.usuario = usuario || null;
    
    // Solo cambiar clave si se escribió una nueva
    if(clave) {
        datos.clave = clave;
        datos.debe_cambiar_clave = true; // forzar cambio en primer login
    }
    
    try {
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('tecnicos').update(datos).eq('id', id);
            if(error) throw error;
            toast('✅ Empleado actualizado.');
        } else {
            const { data, error } = await supabaseClient.from('tecnicos').insert([datos]).select().single();
            if(error) throw error;
            nuevoId = data?.id;
            toast('✅ Empleado creado.');
        }
        cerrarModalTecnico();
        await loadAll();
        renderTecnicos();
        resaltarItemNuevo(nuevoId);
    } catch(e) {
        logError('Guardar técnico', e);
        alert(getFriendlyError(e));
    }
}

async function eliminarTecnico(id) {
    const t = (cache.tecnicos || []).find(x => x.id === id);
    if(!t) return;
    if(!confirm(`¿Eliminar el técnico "${t.nombre}"?\n\nLos equipos asignados a él quedarán sin técnico asignado.`)) return;
    try {
        const { error } = await supabaseClient.from('tecnicos').delete().eq('id', id);
        if(error) throw error;
        toast('🗑️ Técnico eliminado.');
        await loadAll();
        renderTecnicos();
    } catch(e) {
        logError('Eliminar técnico', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   ASIGNAR TÉCNICO A EQUIPO (Evaluado → En Proceso)
   ============================================================ */
function abrirModalAsignarTecnico(equipoId) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    
    document.getElementById('asign_equipo_id').value = equipoId;
    document.getElementById('asignEquipoInfo').innerHTML = `
        <b>${escapeHtml(eq.modelo || 'Equipo')}</b><br>
        <span style="color:var(--text-muted); font-size:12px;">IMEI: ${escapeHtml(eq.imei || '—')}</span>
    `;
    document.getElementById('asign_notas').value = '';
    
    // Smart-select de técnicos activos
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo);
    smartSelectInit({
        containerId: 'ss-asign-tecnico',
        placeholder: '🔍 Buscar técnico...',
        items: tecnicosActivos.map(t => ({
            id: t.id,
            label: t.nombre,
            sub: [t.especialidad, t.telefono].filter(x => x).join(' · '),
            search: [t.nombre, t.especialidad, t.telefono].filter(x => x).join(' ').toLowerCase(),
            meta: t.rol === 'admin' ? 'ADMIN' : ''
        })),
        value: eq.tecnico_asignado_id || '',
        onChange: () => {}
    });
    
    document.getElementById('modalAsignarTecnico').classList.add('active');
}

function cerrarModalAsignarTecnico() {
    document.getElementById('modalAsignarTecnico').classList.remove('active');
}

async function confirmarAsignarTecnico() {
    const equipoId = document.getElementById('asign_equipo_id').value;
    const tecnicoId = smartSelectGetValue('ss-asign-tecnico');
    const notas = document.getElementById('asign_notas').value.trim();
    
    if(!tecnicoId) return alert('Selecciona un técnico.');
    
    try {
        const updateData = {
            tecnico_asignado_id: tecnicoId,
            fecha_asignacion: new Date().toISOString(),
            estado_evaluacion: 'en_proceso'
        };
        if(notas) {
            const eq = (cache.refurb || []).find(r => r.id === equipoId);
            const notasPrev = eq?.notas_diagnostico || '';
            updateData.notas_diagnostico = notasPrev + (notasPrev ? '\n\n' : '') + '[Asignación] ' + notas;
        }
        
        const { error } = await supabaseClient.from('equipos_refurbish').update(updateData).eq('id', equipoId);
        if(error) throw error;
        
        // Registrar en historial
        const tecnico = (cache.tecnicos || []).find(t => t.id === tecnicoId);
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId,
            estado_anterior: 'evaluado',
            estado_nuevo: 'en_proceso',
            accion: `Asignado a ${tecnico?.nombre || 'técnico'}`,
            notas: notas || null,
            usuario: sessionUser?.nombre || 'Admin'
        }]);
        
        toast(`Equipo asignado a ${tecnico?.nombre || 'técnico'}.`);
        // Las fallas SIN asignar de este equipo pasan al técnico
        await asignarFallasSinDueno('equipo', equipoId, tecnicoId);
        cerrarModalAsignarTecnico();
        await loadAll();
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
    } catch(e) {
        logError('Asignar técnico', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   PANEL DE EQUIPO EN PROCESO (estados del técnico + piezas)
   ============================================================ */
let _panelProcesoEquipoId = null;
let _tareasEquipoActual = [];

// ============================================================
//   SISTEMA DE TAREAS (genérico: reacondicionados Y órdenes)
//   tipo = 'equipo' (reacond) | 'orden' (cliente de tienda)
// ============================================================

// Construye la sección HTML de tareas (reutilizable)
function construirSeccionTareas(tipo, refId, tareas, cerrada, soloAgregar) {
    tareas = tareas || [];
    const total = tareas.length;
    const hechas = tareas.filter(t => t.estado === 'hecha').length;
    const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
    const todasHechas = total > 0 && hechas === total;
    
    const filas = tareas.map(t => {
        const tecNombre = t.tecnico_id ? nombreEmpleado(t.tecnico_id) : 'Sin asignar';
        const hecha = t.estado === 'hecha';
        const esMia = t.tecnico_id === sessionUser?.id;
        const puedeCompletar = isAdminUser() || esMia;
        const reasignada = t.tecnico_anterior_id ? nombreEmpleado(t.tecnico_anterior_id) : null;
        return `<div style="display:flex; align-items:center; gap:6px; padding:6px 8px; border:1px solid ${hecha ? '#bbf7d0' : '#e2e8f0'}; background:${hecha ? '#f0fdf4' : '#fff'}; border-radius:6px; margin-bottom:4px; max-width:560px;">
            <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="font-weight:600; font-size:12px; ${hecha ? 'text-decoration:line-through; color:#16a34a;' : ''}">${escapeHtml(t.descripcion)}</span>
                    ${hecha ? `<span style="background:#16a34a; color:#fff; font-size:9px; font-weight:700; padding:1px 7px; border-radius:10px;">✓ LISTO</span>` : ''}
                </div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:1px;"><i class="ti ti-user"></i> ${escapeHtml(tecNombre)}</div>
                ${reasignada && !hecha ? `<div style="font-size:9px; color:#d97706; margin-top:1px;"><i class="ti ti-arrow-right"></i> Reasignada desde ${escapeHtml(reasignada)}</div>` : ''}
                ${t.notas ? `<div style="font-size:10px; color:#64748b; margin-top:1px;">📝 ${escapeHtml(t.notas)}</div>` : ''}
            </div>
            <div style="display:flex; gap:3px; flex-shrink:0;">
                ${cerrada ? '' : (soloAgregar ? `
                <button onclick="eliminarTarea('${t.id}','${tipo}','${refId}')" style="background:#fee2e2; color:#991b1b; border:0; padding:5px 7px; border-radius:5px; cursor:pointer; font-size:10px;" title="Eliminar"><i class="ti ti-trash"></i></button>
                ` : `
                ${!hecha && puedeCompletar ? `<button onclick="completarTarea('${t.id}','${tipo}','${refId}')" style="background:#dcfce7; color:#166534; border:0; padding:5px 7px; border-radius:5px; cursor:pointer; font-size:10px;" title="Marcar lista"><i class="ti ti-check"></i></button>` : ''}
                ${!hecha ? `<button onclick="reasignarTarea('${t.id}','${tipo}','${refId}')" style="background:#fef3c7; color:#92400e; border:0; padding:5px 7px; border-radius:5px; cursor:pointer; font-size:10px;" title="Reasignar a otro técnico"><i class="ti ti-user-share"></i></button>` : ''}
                ${hecha && (isAdminUser() || esMia) ? `<button onclick="reabrirTarea('${t.id}','${tipo}','${refId}')" style="background:#fef3c7; color:#92400e; border:0; padding:5px 7px; border-radius:5px; cursor:pointer; font-size:10px;" title="Reabrir"><i class="ti ti-rotate"></i></button>` : ''}
                <button onclick="eliminarTarea('${t.id}','${tipo}','${refId}')" style="background:#fee2e2; color:#991b1b; border:0; padding:5px 7px; border-radius:5px; cursor:pointer; font-size:10px;" title="Eliminar"><i class="ti ti-trash"></i></button>
                `)}
            </div>
        </div>`;
    }).join('');
    
    const puedeAgregar = !cerrada; // servicio (soloAgregar) y técnico/admin pueden agregar
    return `
        <div style="background:#fff; border:2px solid #e2e8f0; padding:10px; border-radius:10px; margin-top:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <b style="font-size:13px;"><i class="ti ti-list-check" style="color:#0891b2;"></i> Fallas y Tareas del Equipo</b>
                ${puedeAgregar ? `<button onclick="crearTarea('${tipo}','${refId}')" class="btn btn-blue" style="font-size:11px; padding:5px 10px;"><i class="ti ti-plus"></i> Agregar tarea</button>` : ''}
            </div>
            ${total > 0 ? `
                <div style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                        <span>Progreso: ${hechas} de ${total} fallas resueltas</span>
                        <span style="font-weight:700; color:${todasHechas ? '#16a34a' : '#0891b2'};">${pct}%</span>
                    </div>
                    <div style="background:#e2e8f0; border-radius:6px; height:10px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${todasHechas ? '#16a34a' : 'linear-gradient(90deg,#0891b2,#06b6d4)'}; border-radius:6px; transition:width 0.3s;"></div>
                    </div>
                </div>
                ${filas}
                ${todasHechas ? `<div style="background:#f0fdf4; border:1px solid #86efac; padding:8px; border-radius:8px; margin-top:6px; text-align:center; font-size:12px; color:#166534;"><i class="ti ti-circle-check"></i> ¡Todas las fallas resueltas! El equipo está listo.</div>` : ''}
            ` : `<div style="color:var(--text-muted); font-size:12px; padding:8px 0;">${cerrada ? 'Esta orden está cerrada. No se pueden agregar tareas.' : 'No hay fallas registradas. Usa el botón "Agregar tarea".'}</div>`}
        </div>`;
}

// Crear una tarea (cualquier técnico puede)
async function crearTarea(tipo, refId) {
    const desc = prompt('🔧 NUEVA TAREA\n\n¿Qué hay que hacer?\n\nEjemplo: "Cambiar pantalla", "Microsoldadura", "Cambiar batería"');
    if(desc === null) return;
    if(!desc.trim()) return alert('Escribe qué hay que hacer.');
    
    // Elegir técnico (lista numerada)
    const tecnicos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || (!t.tipo_empleado && t.rol !== 'admin')));
    let tecnicoId = null;
    if(tecnicos.length) {
        const lista = tecnicos.map((t, i) => `${i + 1}. ${t.nombre}`).join('\n');
        const sel = prompt(`¿A qué técnico se le asigna?\n\n${lista}\n\nEscribe el número (o deja vacío para "Sin asignar"):`);
        if(sel === null) return;
        if(sel.trim()) {
            const idx = parseInt(sel) - 1;
            if(!isNaN(idx) && idx >= 0 && idx < tecnicos.length) tecnicoId = tecnicos[idx].id;
        }
    }
    
    try {
        const { error } = await supabaseClient.from('tareas_trabajo').insert([{
            tipo: tipo, ref_id: refId,
            descripcion: desc.trim(),
            tecnico_id: tecnicoId,
            estado: 'pendiente',
            creado_por: sessionUser?.id
        }]);
        if(error) throw error;
        toast('✅ Tarea agregada.');
        await refrescarPanelTareas(tipo, refId);
    } catch(e) { logError('Crear tarea', e); alert(getFriendlyError(e)); }
}

// Marcar tarea como hecha
async function completarTarea(tareaId, tipo, refId) {
    const nota = prompt('¿Alguna nota sobre el trabajo? (opcional)');
    try {
        const upd = { estado: 'hecha', fecha_completada: new Date().toISOString() };
        if(nota && nota.trim()) upd.notas = nota.trim();
        const { error } = await supabaseClient.from('tareas_trabajo').update(upd).eq('id', tareaId);
        if(error) throw error;
        toast('✅ Tarea completada.');
        await loadAll();
        
        // ¿Era la última tarea? Verificar si TODAS están hechas
        const tareasRef = (cache.tareas || []).filter(t => t.tipo === tipo && t.ref_id === refId);
        const todasHechas = tareasRef.length > 0 && tareasRef.every(t => t.estado === 'hecha');
        
        if(todasHechas) {
            const msg = tipo === 'equipo'
                ? '✅ ¡Todas las tareas completadas!\n\n¿Pasar el equipo a REVISIÓN FINAL para que el administrador lo apruebe?'
                : '✅ ¡Todas las tareas completadas!\n\n¿Marcar la orden como FINALIZADA (lista para entregar)?';
            if(confirm(msg)) {
                if(tipo === 'equipo') {
                    await supabaseClient.from('equipos_refurbish').update({ estado_evaluacion: 'listo_revision' }).eq('id', refId);
                    toast('👁️ Equipo en revisión final.');
                } else {
                    await supabaseClient.from('ordenes_reparacion').update({ estado: 'finalizado', fecha_finalizado: new Date().toISOString() }).eq('id', refId);
                    toast('✅ Orden finalizada.');
                }
                await loadAll();
            }
        }
        
        // Refrescar el panel correspondiente
        if(tipo === 'equipo' && typeof abrirPanelProceso === 'function') { await abrirPanelProceso(refId); }
        else if(tipo === 'orden') { renderTallerOrdenes(); }
    } catch(e) { logError('Completar tarea', e); alert(getFriendlyError(e)); }
}

// Reabrir una tarea completada
async function reabrirTarea(tareaId, tipo, refId) {
    try {
        const { error } = await supabaseClient.from('tareas_trabajo').update({ estado: 'pendiente', fecha_completada: null }).eq('id', tareaId);
        if(error) throw error;
        toast('Tarea reabierta.');
        await refrescarPanelTareas(tipo, refId);
    } catch(e) { logError('Reabrir tarea', e); alert(getFriendlyError(e)); }
}

// Eliminar una tarea
async function eliminarTarea(tareaId, tipo, refId) {
    if(!confirm('¿Eliminar esta tarea?')) return;
    try {
        const { error } = await supabaseClient.from('tareas_trabajo').delete().eq('id', tareaId);
        if(error) throw error;
        toast('Tarea eliminada.');
        await refrescarPanelTareas(tipo, refId);
    } catch(e) { logError('Eliminar tarea', e); alert(getFriendlyError(e)); }
}

// Refresca el panel correcto según el tipo
async function refrescarPanelTareas(tipo, refId) {
    await loadAll();
    if(tipo === 'equipo' && typeof abrirPanelProceso === 'function') {
        await abrirPanelProceso(refId);
    } else if(tipo === 'orden') {
        renderTallerOrdenes();
    }
}

// Crea tareas automáticamente desde una lista de fallas (textos), SOLO si no existen tareas aún.
// Las tareas se crean SIN asignar. Devuelve cuántas creó.
async function crearTareasDesdeFallas(tipo, refId, listaFallas) {
    if(!refId || !Array.isArray(listaFallas) || listaFallas.length === 0) return 0;
    // Opción A: solo crear si el equipo/orden no tiene tareas aún
    const yaExisten = (cache.tareas || []).filter(t => t.tipo === tipo && t.ref_id === refId);
    if(yaExisten.length > 0) return 0;
    // Limpiar y filtrar textos vacíos/duplicados
    const textos = [...new Set(listaFallas.map(s => (s || '').toString().trim()).filter(Boolean))];
    if(textos.length === 0) return 0;
    try {
        const inserts = textos.map(txt => ({
            tipo: tipo, ref_id: refId,
            descripcion: txt,
            tecnico_id: null, // sin asignar
            estado: 'pendiente',
            creado_por: sessionUser?.id || null
        }));
        const { error } = await supabaseClient.from('tareas_trabajo').insert(inserts);
        if(error) throw error;
        return textos.length;
    } catch(e) { logError('Crear tareas desde fallas', e); return 0; }
}

// Reasigna una tarea individual a otro técnico (lista numerada)
async function reasignarTarea(tareaId, tipo, refId) {
    const tarea = (cache.tareas || []).find(t => t.id === tareaId);
    if(!tarea) return;
    const tecnicos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || (!t.tipo_empleado && t.rol !== 'admin')) && t.id !== tarea.tecnico_id);
    if(!tecnicos.length) return alert('No hay otros técnicos disponibles.');
    const lista = tecnicos.map((t, i) => `${i + 1}. ${t.nombre}`).join('\n');
    const sel = prompt(`REASIGNAR TAREA: ${tarea.descripcion}\n\n¿A qué técnico se la pasas?\n\n${lista}\n\nEscribe el número:`);
    if(sel === null) return;
    const idx = parseInt(sel) - 1;
    if(isNaN(idx) || idx < 0 || idx >= tecnicos.length) return alert('Selección inválida.');
    try {
        const { error } = await supabaseClient.from('tareas_trabajo').update({
            tecnico_id: tecnicos[idx].id,
            tecnico_anterior_id: tarea.tecnico_id || null,
            estado: 'pendiente'
        }).eq('id', tareaId);
        if(error) throw error;
        toast(`🔄 Tarea reasignada a ${tecnicos[idx].nombre}.`);
        await refrescarPanelTareas(tipo, refId);
    } catch(e) { logError('Reasignar tarea', e); alert(getFriendlyError(e)); }
}

async function abrirPanelProceso(equipoId) {
    _panelProcesoEquipoId = equipoId;
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    
    // Cargar piezas, fallas y devoluciones previas
    let piezas = [];
    let fallas = [];
    let devsPrev = [];
    let tareas = [];
    try {
        const [pzRes, flRes, devRes, tkRes] = await Promise.all([
            supabaseClient.from('equipo_piezas_pedidas').select('*').eq('equipo_id', equipoId).order('creado_en', { ascending: true }),
            supabaseClient.from('equipo_fallas').select('*').eq('equipo_id', equipoId),
            supabaseClient.from('equipo_devoluciones').select('*').eq('equipo_id', equipoId).order('fecha_devolucion', { ascending: false }),
            supabaseClient.from('tareas_trabajo').select('*').eq('tipo', 'equipo').eq('ref_id', equipoId).order('creado_en', { ascending: true }).then(r => r, () => ({ data: [], error: null }))
        ]);
        piezas = pzRes.data || [];
        fallas = flRes.data || [];
        devsPrev = devRes.data || [];
        tareas = (tkRes && tkRes.data) || [];
        _tareasEquipoActual = tareas;
    } catch(e) {
        logError('Cargar panel proceso', e);
    }
    
    const tecnico = eq.tecnico_asignado_id ? (cache.tecnicos || []).find(t => t.id === eq.tecnico_asignado_id) : null;
    const estado = eq.estado_evaluacion || 'en_proceso';
    const esEquipoDevuelto = (eq.veces_devuelto || 0) > 0;
    const estaReasignado = estado === 'reasignado';
    const tecnicoAnterior = eq.tecnico_anterior_id ? (cache.tecnicos || []).find(t => t.id === eq.tecnico_anterior_id) : null;
    // NO JUEZ Y PARTE: solo el nuevo técnico asignado (o el admin) puede recibir el equipo reasignado.
    // El técnico que lo reasignó (tecnico_anterior) NO puede recibirlo.
    const soyElNuevoTecnico = sessionUser?._tipo === 'tecnico' && sessionUser?.id === eq.tecnico_asignado_id;
    const puedeRecibirReasignado = isAdminUser() || soyElNuevoTecnico;
    
    // ====== STEPPER VISUAL ======
    // Definir el orden de pasos
    const pasos = [
        { id: 'en_proceso', label: 'Asignado', icono: '📋' },
        { id: 'tecnico_recibio', label: 'Recibido', icono: '📦' },
        { id: 'espera_pieza', label: 'Espera pieza', icono: '⏳' },
        { id: 'listo_revision', label: 'Revisión final', icono: '👁️' }
    ];
    // Determinar índice del estado actual
    const ordenEstados = ['en_proceso', 'tecnico_recibio', 'espera_pieza', 'listo_revision'];
    let idxActual = ordenEstados.indexOf(estado);
    if(idxActual === -1) idxActual = 0;
    
    // Mapeo de transiciones válidas (qué paso puede activar el técnico)
    const canGoto = (idx) => {
        // Puede ir al siguiente paso, retroceder al anterior, o saltar a "espera pieza" desde recibido
        if(idx === idxActual) return false; // ya está ahí
        if(idx === idxActual + 1) return true; // siguiente
        if(idx === idxActual - 1) return true; // anterior (corregir)
        // Caso especial: de "tecnico_recibio" puede saltar a "listo_revision" si no hay piezas
        if(estado === 'tecnico_recibio' && pasos[idx].id === 'listo_revision') return true;
        // Desde "espera_pieza" puede volver a "tecnico_recibio" cuando llegan las piezas
        if(estado === 'espera_pieza' && pasos[idx].id === 'tecnico_recibio') return true;
        return false;
    };
    
    const stepsHtml = pasos.map((p, idx) => {
        let cls = 'pendiente';
        if(idx < idxActual) cls = 'completado';
        else if(idx === idxActual) cls = 'actual';
        const habilitado = canGoto(idx);
        const clickAttr = habilitado ? `onclick="cambiarEstadoProceso('${equipoId}', '${p.id}')"` : '';
        return `<div class="stepper-step ${cls} ${!habilitado && idx !== idxActual ? 'bloqueado' : ''}" ${clickAttr}>
            <div class="stepper-circle">${cls === 'completado' ? '✓' : p.icono}</div>
            <div class="stepper-label">${p.label}</div>
        </div>`;
    }).join('');
    const fillWidth = idxActual === 0 ? '0%' : `calc(${(idxActual / (pasos.length - 1)) * 100}% - 60px)`;
    
    const stepperHtml = `
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:12px; padding:8px; margin-bottom:18px; position:relative;">
            <div class="stepper">
                <div class="stepper-line"></div>
                <div class="stepper-line-fill" style="width: ${fillWidth};"></div>
                ${stepsHtml}
            </div>
        </div>
    `;
    
    // ====== FALLAS ======
    const fallasHtml = fallas.length > 0 ? fallas.map(f => `<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:10px; margin:2px;">${escapeHtml(f.falla_corto || f.falla_nombre)}</span>`).join('') : '<span style="color:var(--text-muted); font-size:12px;">Sin fallas registradas</span>';
    
    // ====== PIEZAS CON DOBLE CONFIRMACIÓN ======
    const piezasHtml = piezas.length > 0 ? piezas.map(p => {
        // Estados de pieza:
        // 'pendiente' = recién creada, admin no la ha marcado entregada
        // 'entregada' = admin marcó entregada, esperando técnico la reciba
        // 'recibida' = técnico confirmó recepción → lista para usar
        // 'aprobada' = legacy (entregada)
        // 'extra_pendiente' = técnico la agregó, admin debe aprobar
        // 'rechazada' = admin rechazó
        
        const esExtra = !!p.agregada_por_tecnico;
        const esExtraNoAprobado = p.estado === 'extra_pendiente';
        const esRechazada = p.estado === 'rechazada';
        const estaEntregada = p.estado === 'entregada' || p.estado === 'aprobada';
        const estaRecibida = p.estado === 'recibida';
        const estaPendienteAdmin = p.estado === 'pendiente' || p.estado === 'extra_pendiente';
        const devolucionPendiente = p.estado === 'devolucion_pendiente';
        const estaDevuelta = p.estado === 'devuelta';
        
        // === COLUMNA ADMIN (entregó pieza) ===
        let adminCol = '';
        if(esRechazada) {
            adminCol = `<div class="pieza-status-col pendiente">❌ Pieza rechazada</div>`;
        } else if(estaDevuelta) {
            adminCol = `<div class="pieza-status-col" style="background:#e0e7ff; color:#3730a3;"><i class="ti ti-rotate-2"></i> Devuelta al inventario</div>`;
        } else if(devolucionPendiente) {
            adminCol = `<div class="pieza-status-col esperando">🔄 Devolución solicitada</div>`;
        } else if(esExtraNoAprobado) {
            adminCol = `<div class="pieza-status-col esperando">⚠️ Extra pendiente de aprobación</div>`;
        } else if(estaEntregada || estaRecibida) {
            adminCol = `<div class="pieza-status-col ok"><i class="ti ti-check"></i> Admin: Entregada</div>`;
        } else {
            adminCol = `<div class="pieza-status-col pendiente">⏳ Admin: NO entregada</div>`;
        }
        
        // === COLUMNA TÉCNICO (recibió) ===
        let tecCol = '';
        if(esRechazada) {
            tecCol = `<div class="pieza-status-col pendiente">—</div>`;
        } else if(estaDevuelta) {
            tecCol = `<div class="pieza-status-col" style="background:#e0e7ff; color:#3730a3;">Pieza devuelta</div>`;
        } else if(devolucionPendiente) {
            tecCol = `<div class="pieza-status-col esperando">⏳ Esperando aprobación admin</div>`;
        } else if(esExtraNoAprobado) {
            tecCol = `<div class="pieza-status-col pendiente">—</div>`;
        } else if(estaRecibida) {
            tecCol = `<div class="pieza-status-col ok"><i class="ti ti-check"></i> Técnico: Recibida</div>`;
        } else if(estaEntregada) {
            tecCol = `<div class="pieza-status-col esperando">⏳ Esperando técnico confirme</div>`;
        } else {
            tecCol = `<div class="pieza-status-col pendiente">Pendiente admin</div>`;
        }
        
        // === BOTONES DE ACCIÓN (lógica inteligente: admin vs técnico) ===
        const esAdmin = tienePermiso('piezas_aprobar_extra'); // admin aprueba/entrega
        const botones = [];
        if(esExtraNoAprobado) {
            // Solo el admin aprueba/rechaza piezas extra
            if(esAdmin) {
                botones.push(`<button class="pieza-action-btn" onclick="aprobarPiezaExtra('${p.id}')" style="background:linear-gradient(180deg,#10b981,#059669); color:#fff; border-color:#047857; box-shadow:0 3px 0 #047857;"><i class="ti ti-check"></i> Aprobar pieza extra</button>`);
                botones.push(`<button class="pieza-action-btn" onclick="rechazarPiezaExtra('${p.id}')" style="background:#fee2e2; color:#991b1b;"><i class="ti ti-x"></i> Rechazar</button>`);
            } else {
                botones.push(`<div style="text-align:center; font-size:11px; color:#92400e; padding:4px;"><i class="ti ti-clock"></i> Esperando aprobación del administrador</div>`);
            }
        } else if(devolucionPendiente) {
            // Admin aprueba/rechaza la devolución. El técnico solo ve el estado.
            botones.push(`<div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:6px; padding:8px; margin-top:6px; font-size:11px; color:#92400e;"><b>Motivo:</b> ${escapeHtml(p.motivo_devolucion_pieza || 'Sin motivo')}</div>`);
            if(esAdmin) {
                botones.push(`<button class="pieza-action-btn" onclick="aprobarDevolucionPieza('${p.id}')" style="background:linear-gradient(180deg,#6366f1,#4338ca); color:#fff; border-color:#3730a3; box-shadow:0 3px 0 #3730a3;"><i class="ti ti-check"></i> Aprobar devolución</button>`);
                botones.push(`<button class="pieza-action-btn" onclick="rechazarDevolucionPieza('${p.id}')" style="background:#fee2e2; color:#991b1b;"><i class="ti ti-x"></i> Rechazar</button>`);
            } else {
                botones.push(`<div style="text-align:center; font-size:11px; color:#92400e; padding:4px;"><i class="ti ti-clock"></i> Esperando que el administrador apruebe</div>`);
            }
        } else if(p.estado === 'pendiente') {
            // Solo admin entrega piezas
            if(esAdmin) {
                botones.push(`<button class="pieza-action-btn entregar" onclick="marcarPiezaEntregada('${p.id}')"><i class="ti ti-truck"></i> Marcar como ENTREGADA</button>`);
            } else {
                botones.push(`<div style="text-align:center; font-size:11px; color:#92400e; padding:4px;"><i class="ti ti-clock"></i> Esperando que el administrador entregue la pieza</div>`);
            }
        } else if(p.estado === 'entregada' || p.estado === 'aprobada') {
            // El técnico confirma que la recibió
            botones.push(`<button class="pieza-action-btn recibir" onclick="marcarPiezaRecibida('${p.id}')"><i class="ti ti-check"></i> Confirmo RECIBIDA</button>`);
        } else if(estaRecibida) {
            // Pieza recibida → el técnico puede solicitar devolverla
            botones.push(`<button class="pieza-action-btn" onclick="solicitarDevolucionPieza('${p.id}')" style="background:#fff; color:#6366f1; border:1px solid #c4b5fd;"><i class="ti ti-rotate-2"></i> Devolver pieza</button>`);
        }
        
        return `<div class="pieza-card" data-item-id="${p.id}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1; min-width:0;">
                    <b style="font-size:14px; ${estaDevuelta ? 'text-decoration:line-through; color:#94a3b8;' : ''}">${escapeHtml(p.pieza_nombre || 'Pieza')} ×${p.cantidad || 1}</b>
                    ${esExtra ? '<span class="badge" style="background:#fbbf24; color:#78350f; margin-left:6px; font-size:10px;">EXTRA</span>' : ''}
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">${money((p.cantidad||1)*(p.costo_unitario||0))}</div>
                </div>
            </div>
            <div class="pieza-status-row">
                ${adminCol}
                ${tecCol}
            </div>
            ${botones.join('')}
        </div>`;
    }).join('') : '<p style="color:var(--text-muted); text-align:center; padding:10px;">Sin piezas asignadas.</p>';
    
    // ====== MODAL ======
    const modalHtml = `
        <div class="modal-box" style="max-width:850px; width:95%;">
            <div class="modal-header" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff; border-radius:12px 12px 0 0;">
                <h3 style="color:#fff;"><i class="ti ti-tool"></i> Panel de Reparación</h3>
                <button class="modal-close" onclick="cerrarPanelProceso()" style="color:#fff;">✕</button>
            </div>
            <div class="modal-body" style="max-height:75vh; overflow-y:auto;">
                <div style="background:#f1f5f9; padding:12px; border-radius:8px; margin-bottom:15px;">
                    <b style="font-size:15px;">${escapeHtml(eq.modelo || 'Equipo')}</b>
                    ${esEquipoDevuelto ? `<span class="badge" style="background:#fee2e2; color:#991b1b; margin-left:8px; font-size:11px;">🔄 DEVUELTO ${eq.veces_devuelto}×</span>` : ''}
                    <br>
                    <span style="color:var(--text-muted); font-size:12px;">
                        IMEI: ${escapeHtml(eq.imei || '—')} 
                        ${tecnico ? ` · 👤 ${escapeHtml(tecnico.nombre)}` : ''}
                        ${eq.ciclo_actual > 1 ? ` · Ciclo ${eq.ciclo_actual}` : ''}
                    </span>
                </div>
                
                ${esEquipoDevuelto && devsPrev.length > 0 ? `
                <div style="background:linear-gradient(135deg, #fef2f2, #fee2e2); border:2px solid #dc2626; padding:14px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 12px rgba(220, 38, 38, 0.15);">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <i class="ti ti-rotate-2" style="color:#dc2626; font-size:22px;"></i>
                        <b style="color:#991b1b; font-size:14px;">⚠️ EQUIPO DEVUELTO - Historial de Devoluciones</b>
                    </div>
                    <div style="font-size:12px; color:#7f1d1d;">
                        ${devsPrev.slice(0, 5).map((d, idx) => {
                            const fecha = new Date(d.fecha_devolucion).toLocaleDateString('es-DO', { dateStyle:'medium' });
                            return `<div style="background:#fff; padding:8px 10px; border-radius:6px; margin-bottom:6px; border-left:3px solid #dc2626;">
                                <b>Devolución ${devsPrev.length - idx} · ${escapeHtml(fecha)}</b>
                                ${d.cliente_que_devolvio ? `<span style="color:#64748b;"> · ${escapeHtml(d.cliente_que_devolvio)}</span>` : ''}
                                <div style="margin-top:3px;"><b>Motivo:</b> ${escapeHtml(d.motivo_devolucion)}</div>
                                ${d.problemas_reportados ? `<div><b>Problemas:</b> ${escapeHtml(d.problemas_reportados)}</div>` : ''}
                                ${d.diagnostico_inicial ? `<div><b>Diagnóstico:</b> ${escapeHtml(d.diagnostico_inicial)}</div>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>` : ''}
                
                <h4 style="margin:0 0 8px; font-size:13px; color:var(--blue-btn); text-transform:uppercase;"><i class="ti ti-progress"></i> Progreso de Reparación</h4>
                ${stepperHtml}
                
                <h4 style="margin:18px 0 8px; font-size:13px; color:#991b1b; text-transform:uppercase;"><i class="ti ti-alert-triangle"></i> Fallas detectadas</h4>
                <div style="margin-bottom:15px;">${fallasHtml}</div>
                
                <h4 style="margin:18px 0 8px; font-size:13px; color:#1e40af; text-transform:uppercase;"><i class="ti ti-tools"></i> Piezas para la reparación</h4>
                ${piezasHtml}
                
                <button class="btn btn-light" onclick="agregarPiezaExtra('${equipoId}')" style="margin-top:10px; padding:8px 14px; font-size:12px;">
                    <i class="ti ti-plus"></i> Agregar pieza adicional
                </button>
                
                ${estaReasignado ? `
                    <div style="background:linear-gradient(135deg, #fef3c7, #fde68a); border:2px solid #f59e0b; padding:16px; border-radius:12px; margin-top:18px; box-shadow:0 4px 12px rgba(245,158,11,0.2);">
                        <b style="color:#78350f;"><i class="ti ti-user-share"></i> Equipo reasignado</b>
                        <p style="font-size:12px; color:#92400e; margin:8px 0;">
                            ${soyElNuevoTecnico ? 'Este equipo te fue reasignado' : 'Equipo reasignado a <b>' + escapeHtml((cache.tecnicos||[]).find(t=>t.id===eq.tecnico_asignado_id)?.nombre || 'otro técnico') + '</b>'}${tecnicoAnterior ? ` (antes lo tenía <b>${escapeHtml(tecnicoAnterior.nombre)}</b>)` : ''}.
                            ${eq.motivo_reasignacion ? `<br><b>Motivo:</b> ${escapeHtml(eq.motivo_reasignacion)}` : ''}
                        </p>
                        ${puedeRecibirReasignado ? `
                        <p style="font-size:12px; color:#92400e; margin:8px 0;">¿Cómo quieres recibirlo?</p>
                        <button onclick="recibirEquipoReasignado('${equipoId}', 'con_piezas')" style="background:linear-gradient(180deg,#10b981,#059669); color:#fff; border:0; padding:12px; border-radius:10px; cursor:pointer; font-weight:700; width:100%; box-shadow:0 4px 0 #047857; margin-bottom:8px;">
                            <i class="ti ti-package"></i> Recibir CON las piezas actuales
                        </button>
                        <button onclick="recibirEquipoReasignado('${equipoId}', 'limpio')" style="background:linear-gradient(180deg,#3b82f6,#1e40af); color:#fff; border:0; padding:12px; border-radius:10px; cursor:pointer; font-weight:700; width:100%; box-shadow:0 4px 0 #1e3a8a;">
                            <i class="ti ti-refresh"></i> Recibir equipo LIMPIO (otra reparación)
                        </button>
                        ` : `
                        <div style="background:#fff; border-radius:8px; padding:10px; font-size:12px; color:#92400e; text-align:center;">
                            <i class="ti ti-clock"></i> Esperando que el técnico asignado lo reciba.
                            <br><small>No puedes recibir un equipo que tú reasignaste.</small>
                        </div>
                        `}
                    </div>
                ` : ''}
                
                ${(!estaReasignado && estado !== 'listo_venta' && estado !== 'vendido') ? `
                    <button class="btn btn-light" onclick="abrirModalReasignar('${equipoId}')" style="margin-top:10px; padding:8px 14px; font-size:12px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d;">
                        <i class="ti ti-user-share"></i> Reasignar a otro técnico
                    </button>
                ` : ''}
                
                ${construirSeccionTareas('equipo', equipoId, tareas, (cache.refurb||[]).find(r=>r.id===equipoId)?.estado_evaluacion === 'vendido')}
                
                ${estado === 'listo_revision' ? (
                    puedeRecibirReasignado || tienePermiso('piezas_aprobar_extra') ? `
                    <div style="background:linear-gradient(135deg, #fef3c7, #fde68a); border:2px solid #f59e0b; padding:16px; border-radius:12px; margin-top:18px; box-shadow:0 4px 12px rgba(245, 158, 11, 0.2);">
                        <b style="color:#78350f;"><i class="ti ti-shield-check"></i> Aprobación del Administrador</b>
                        <p style="font-size:12px; color:#92400e; margin:8px 0;">El técnico marcó este equipo en revisión final. Revísalo y aprueba para que pase a Listo Venta.</p>
                        <button onclick="aprobarTerminado('${equipoId}')" style="background:linear-gradient(180deg,#10b981,#059669); color:#fff; border:0; padding:14px 20px; border-radius:10px; cursor:pointer; font-weight:700; width:100%; box-shadow:0 4px 0 #047857; font-size:14px;">
                            <i class="ti ti-check"></i> APROBAR → Listo para Venta
                        </button>
                    </div>
                    ` : `
                    <div style="background:#f1f5f9; border:1px solid #cbd5e1; padding:14px; border-radius:12px; margin-top:18px; text-align:center;">
                        <b style="color:#475569;"><i class="ti ti-clock"></i> En revisión final</b>
                        <p style="font-size:12px; color:#64748b; margin:6px 0 0;">Este equipo está esperando que el <b>administrador</b> lo apruebe.</p>
                    </div>
                    `
                ) : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-light" onclick="cerrarPanelProceso()">Cerrar</button>
            </div>
        </div>
    `;
    
    // Crear/actualizar modal
    let modal = document.getElementById('modalPanelProceso');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPanelProceso';
        modal.className = 'modal-backdrop';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.classList.add('active');
    // Re-inyectar botón Volver en este modal dinámico
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarPanelProceso() {
    const modal = document.getElementById('modalPanelProceso');
    if(modal) modal.classList.remove('active');
    _panelProcesoEquipoId = null;
}

async function cambiarEstadoProceso(equipoId, nuevoEstado) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    const estadoAnterior = eq.estado_evaluacion;
    // No permitir pasar a revisión final si quedan fallas pendientes
    if(nuevoEstado === 'listo_revision') {
        const pend = fallasPendientesDe('equipo', equipoId);
        if(pend > 0) {
            if(isAdminUser()) {
                if(!confirm(`⚠️ Este equipo tiene ${pend} falla(s) SIN resolver.\n\nComo administrador puedes pasarlo a revisión de todos modos.\n\n¿Forzar?`)) return;
            } else {
                return alert(`⚠️ No puedes pasar a revisión todavía.\n\nQuedan ${pend} falla(s) pendiente(s). Marca todas las fallas como resueltas (✓) primero.`);
            }
        }
    }
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').update({ estado_evaluacion: nuevoEstado }).eq('id', equipoId);
        if(error) throw error;
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId, estado_anterior: estadoAnterior, estado_nuevo: nuevoEstado,
            accion: 'Cambio de estado',
            usuario: sessionUser?.nombre || 'Usuario'
        }]);
        toast('Estado actualizado.');
        await loadAll();
        abrirPanelProceso(equipoId);
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
    } catch(e) {
        logError('Cambiar estado proceso', e);
        alert(getFriendlyError(e));
    }
}

async function marcarPiezaEntregada(piezaId) {
    if(!soloAdmin('entregar piezas')) return;
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({ 
            estado: 'entregada', 
            fecha_entrega: new Date().toISOString() 
        }).eq('id', piezaId);
        if(error) throw error;
        toast('📦 Pieza marcada como entregada. Esperando confirmación del técnico.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Marcar pieza entregada', e);
        alert(getFriendlyError(e));
    }
}

async function marcarPiezaRecibida(piezaId) {
    try {
        // Obtener la pieza pedida para saber su vínculo al inventario y cantidad
        const { data: pp, error: e0 } = await supabaseClient.from('equipo_piezas_pedidas').select('*').eq('id', piezaId).single();
        if(e0) throw e0;
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({ 
            estado: 'recibida'
        }).eq('id', piezaId);
        if(error) throw error;
        // Bajar del stock del inventario (solo si está vinculada con pieza_id)
        if(pp && pp.pieza_id) {
            await ajustarStockInventario(pp.pieza_id, -(pp.cantidad || 1));
        }
        toast('✅ Pieza confirmada como recibida. Stock actualizado.');
        await loadAll();
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Marcar pieza recibida', e);
        alert(getFriendlyError(e));
    }
}

// Ajusta el stock de una pieza del inventario (delta puede ser negativo para restar o positivo para sumar)
async function ajustarStockInventario(piezaId, delta) {
    try {
        const pieza = (cache.piezas || []).find(p => p.id === piezaId);
        const actual = pieza ? (pieza.cantidad || 0) : 0;
        const nuevo = Math.max(0, actual + delta);
        const { error } = await supabaseClient.from('piezas_inventario').update({ cantidad: nuevo }).eq('id', piezaId);
        if(error) throw error;
    } catch(e) { logError('Ajustar stock inventario', e); }
}

/* ---------- DEVOLUCIÓN DE PIEZAS ---------- */
async function solicitarDevolucionPieza(piezaId) {
    const motivo = prompt('¿Por qué devuelves esta pieza?\n(Ej: No se necesitó, pieza defectuosa, sobró...)');
    if(motivo === null) return; // canceló
    if(!motivo.trim()) return alert('Debes indicar un motivo para devolver la pieza.');
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({
            estado: 'devolucion_pendiente',
            devolucion_solicitada: true,
            motivo_devolucion_pieza: motivo.trim(),
            fecha_solicitud_devolucion: new Date().toISOString()
        }).eq('id', piezaId);
        if(error) throw error;
        toast('🔄 Devolución solicitada. Esperando aprobación del admin.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Solicitar devolución pieza', e);
        alert(getFriendlyError(e));
    }
}

async function aprobarDevolucionPieza(piezaId) {
    if(!soloAdmin('aprobar devoluciones de piezas')) return;
    if(!confirm('¿Aprobar la devolución de esta pieza?\n\nLa pieza se marcará como devuelta y se descontará del costo del equipo.')) return;
    try {
        // Obtener la pieza para saber su costo y equipo
        const { data: pieza, error: e0 } = await supabaseClient.from('equipo_piezas_pedidas').select('*').eq('id', piezaId).single();
        if(e0) throw e0;
        
        // Marcar como devuelta
        const { error: e1 } = await supabaseClient.from('equipo_piezas_pedidas').update({
            estado: 'devuelta'
        }).eq('id', piezaId);
        if(e1) throw e1;
        
        // Reintegrar al stock del inventario (solo si la pieza estaba "en uso"/recibida y vinculada)
        if(pieza && pieza.pieza_id && pieza.estado === 'recibida') {
            await ajustarStockInventario(pieza.pieza_id, (pieza.cantidad || 1));
        }
        
        // Descontar del costo de repuestos del equipo
        if(pieza && pieza.equipo_id) {
            const eq = (cache.refurb || []).find(r => r.id === pieza.equipo_id);
            if(eq) {
                const costoPieza = (pieza.cantidad || 1) * (pieza.costo_unitario || 0);
                const nuevoCostoRepuestos = Math.max(0, (eq.costo_repuestos || 0) - costoPieza);
                await supabaseClient.from('equipos_refurbish').update({ costo_repuestos: nuevoCostoRepuestos }).eq('id', pieza.equipo_id);
                // Historial
                await supabaseClient.from('equipo_historial').insert([{
                    equipo_id: pieza.equipo_id, estado_anterior: 'pieza_entregada', estado_nuevo: 'pieza_devuelta',
                    accion: `🔄 Pieza devuelta: ${pieza.pieza_nombre} (−${money(costoPieza)})`,
                    notas: pieza.motivo_devolucion_pieza || null,
                    usuario: sessionUser?.nombre || 'Admin'
                }]);
            }
        }
        
        toast('✅ Devolución aprobada. Pieza devuelta y costo actualizado.');
        await loadAll();
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Aprobar devolución pieza', e);
        alert(getFriendlyError(e));
    }
}

async function rechazarDevolucionPieza(piezaId) {
    if(!soloAdmin('rechazar devoluciones de piezas')) return;
    if(!confirm('¿Rechazar la devolución? La pieza vuelve a estar como recibida.')) return;
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({
            estado: 'recibida',
            devolucion_solicitada: false
        }).eq('id', piezaId);
        if(error) throw error;
        toast('La devolución fue rechazada. La pieza sigue asignada.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Rechazar devolución pieza', e);
        alert(getFriendlyError(e));
    }
}

/* ---------- REASIGNACIÓN A OTRO TÉCNICO ---------- */
function abrirModalReasignar(equipoId) {
    document.getElementById('reasig_equipo_id').value = equipoId;
    document.getElementById('reasig_motivo').value = '';
    
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo && t.id !== eq?.tecnico_asignado_id);
    
    smartSelectInit({
        containerId: 'ss-reasig-tecnico',
        placeholder: '🔍 Buscar técnico...',
        items: tecnicosActivos.map(t => ({
            id: t.id,
            label: t.nombre,
            sub: [t.especialidad, t.telefono].filter(x => x).join(' · '),
            search: [t.nombre, t.especialidad].filter(x => x).join(' ').toLowerCase(),
            meta: t.rol === 'admin' ? 'ADMIN' : ''
        })),
        value: '',
        onChange: () => {}
    });
    
    document.getElementById('modalReasignar').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalReasignar() {
    document.getElementById('modalReasignar').classList.remove('active');
}

async function guardarReasignacion() {
    const equipoId = document.getElementById('reasig_equipo_id').value;
    const motivo = document.getElementById('reasig_motivo').value.trim();
    const nuevoTecnicoId = smartSelectGetValue('ss-reasig-tecnico');
    
    if(!equipoId) return alert('No hay equipo.');
    if(!nuevoTecnicoId) return alert('Selecciona el nuevo técnico.');
    if(!motivo) return alert('Indica el motivo de la reasignación.');
    
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    const nuevoTec = (cache.tecnicos || []).find(t => t.id === nuevoTecnicoId);
    
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').update({
            estado_evaluacion: 'reasignado',
            tecnico_anterior_id: eq.tecnico_asignado_id || null,
            tecnico_asignado_id: nuevoTecnicoId,
            fecha_reasignacion: new Date().toISOString(),
            motivo_reasignacion: motivo
        }).eq('id', equipoId);
        if(error) throw error;
        
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId, estado_anterior: eq.estado_evaluacion, estado_nuevo: 'reasignado',
            accion: `👥 Reasignado a ${nuevoTec?.nombre || 'otro técnico'}`,
            notas: motivo,
            usuario: sessionUser?.nombre || 'Admin'
        }]);
        
        toast(`👥 Equipo reasignado a ${nuevoTec?.nombre || 'el técnico'}.`);
        cerrarModalReasignar();
        cerrarPanelProceso();
        await loadAll();
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
    } catch(e) {
        logError('Guardar reasignación', e);
        alert(getFriendlyError(e));
    }
}

async function recibirEquipoReasignado(equipoId, modo) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    
    // NO JUEZ Y PARTE: solo el nuevo técnico asignado o el admin pueden recibir
    const soyNuevo = sessionUser?._tipo === 'tecnico' && sessionUser?.id === eq.tecnico_asignado_id;
    if(!isAdminUser() && !soyNuevo) {
        return alert('No puedes recibir este equipo. Solo el técnico al que fue reasignado puede recibirlo.');
    }
    
    const mensaje = modo === 'limpio'
        ? '¿Recibir el equipo LIMPIO? Las piezas anteriores se marcarán como no usadas en esta nueva reparación.'
        : '¿Recibir el equipo CON las piezas actuales para continuar la reparación?';
    if(!confirm(mensaje)) return;
    
    try {
        // El equipo pasa a "en_proceso" con el nuevo técnico
        const { error } = await supabaseClient.from('equipos_refurbish').update({
            estado_evaluacion: 'en_proceso',
            fecha_asignacion: new Date().toISOString()
        }).eq('id', equipoId);
        if(error) throw error;
        
        // Si recibe limpio, marcar las piezas actuales como devueltas (no usadas)
        if(modo === 'limpio') {
            await supabaseClient.from('equipo_piezas_pedidas')
                .update({ estado: 'devuelta' })
                .eq('equipo_id', equipoId)
                .in('estado', ['recibida', 'entregada', 'aprobada', 'pendiente']);
        }
        
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId, estado_anterior: 'reasignado', estado_nuevo: 'en_proceso',
            accion: modo === 'limpio' ? '📦 Equipo recibido LIMPIO (nueva reparación)' : '📦 Equipo recibido con piezas actuales',
            usuario: sessionUser?.nombre || 'Técnico'
        }]);
        
        toast(modo === 'limpio' ? '📦 Equipo recibido limpio. Puedes solicitar piezas nuevas.' : '📦 Equipo recibido con sus piezas.');
        await loadAll();
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Recibir equipo reasignado', e);
        alert(getFriendlyError(e));
    }
}

async function aprobarPiezaExtra(piezaId) {
    if(!soloAdmin('aprobar piezas extra')) return;
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({ 
            estado: 'aprobada', 
            aprobada_por_admin: true 
        }).eq('id', piezaId);
        if(error) throw error;
        toast('Pieza extra aprobada.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Aprobar pieza extra', e);
        alert(getFriendlyError(e));
    }
}

async function rechazarPiezaExtra(piezaId) {
    if(!soloAdmin('rechazar piezas extra')) return;
    if(!confirm('¿Rechazar esta pieza extra?')) return;
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').update({ estado: 'rechazada' }).eq('id', piezaId);
        if(error) throw error;
        toast('Pieza rechazada.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Rechazar pieza', e);
        alert(getFriendlyError(e));
    }
}

async function agregarPiezaExtra(equipoId) {
    const nombre = prompt('Nombre de la pieza extra que apareció durante la reparación:');
    if(!nombre || !nombre.trim()) return;
    const costoStr = prompt('Costo unitario de la pieza (RD$):', '0');
    const costo = parseFloat(costoStr) || 0;
    const cantStr = prompt('Cantidad:', '1');
    const cantidad = parseInt(cantStr) || 1;
    
    try {
        const { error } = await supabaseClient.from('equipo_piezas_pedidas').insert([{
            equipo_id: equipoId,
            pieza_nombre: nombre.trim(),
            cantidad: cantidad,
            costo_unitario: costo,
            estado: 'extra_pendiente',
            agregada_por_tecnico: true
        }]);
        if(error) throw error;
        toast('Pieza extra agregada, esperando aprobación del admin.');
        if(_panelProcesoEquipoId) abrirPanelProceso(_panelProcesoEquipoId);
    } catch(e) {
        logError('Agregar pieza extra', e);
        alert(getFriendlyError(e));
    }
}

async function aprobarTerminado(equipoId) {
    // Solo el admin (o quien tenga permiso de aprobar) puede aprobar. No juez y parte.
    if(!isAdminUser() && !tienePermiso('piezas_aprobar_extra')) {
        return alert('Solo el administrador puede aprobar equipos. El técnico no puede aprobar su propio trabajo.');
    }
    if(!confirm('¿Aprobar este equipo como TERMINADO y pasarlo a LISTO PARA VENTA?')) return;
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').update({ 
            estado_evaluacion: 'listo_venta',
            fecha_terminado: new Date().toISOString()
        }).eq('id', equipoId);
        if(error) throw error;
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId, estado_anterior: 'listo_revision', estado_nuevo: 'listo_venta',
            accion: 'Aprobado por admin → Listo para venta',
            usuario: sessionUser?.nombre || 'Admin'
        }]);
        toast('Equipo aprobado y listo para venta.');
        cerrarPanelProceso();
        await loadAll();
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
    } catch(e) {
        logError('Aprobar terminado', e);
        alert(getFriendlyError(e));
    }
}

async function marcarDespachado(equipoId) {
    if(!isAdminUser() && !tienePermiso('estado_despachar')) {
        return alert('No tienes permiso para despachar equipos.');
    }
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    if(!confirm(`¿Marcar "${eq.modelo}" como DESPACHADO?\n\nEsto significa que el equipo fue vendido/entregado al cliente.`)) return;
    try {
        const { error } = await supabaseClient.from('equipos_refurbish').update({ 
            estado_evaluacion: 'vendido',
            fecha_despacho: new Date().toISOString()
        }).eq('id', equipoId);
        if(error) throw error;
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId, estado_anterior: 'listo_venta', estado_nuevo: 'vendido',
            accion: '🚚 Equipo despachado al cliente',
            usuario: sessionUser?.nombre || 'Admin'
        }]);
        toast('🚚 Equipo despachado.');
        await loadAll();
        if(reacondLoteAbiertoId) renderDetalleLoteReacond();
    } catch(e) {
        logError('Marcar despachado', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   LOGOS SVG DE MARCAS (para label de venta)
   ============================================================ */
const LOGOS_MARCAS = {
    'apple': `<svg viewBox="0 0 24 24" fill="currentColor" style="width:100%; height:100%;"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,
    'samsung': `<svg viewBox="0 0 200 50" style="width:100%; height:100%;"><text x="100" y="38" text-anchor="middle" font-family="Arial Black" font-size="36" font-weight="900" fill="currentColor" letter-spacing="2">SAMSUNG</text></svg>`,
    'xiaomi': `<svg viewBox="0 0 100 50" style="width:100%; height:100%;"><text x="50" y="38" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="currentColor">Mi</text></svg>`,
    'huawei': `<svg viewBox="0 0 200 50" style="width:100%; height:100%;"><text x="100" y="38" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="currentColor" letter-spacing="3">HUAWEI</text></svg>`,
    'motorola': `<svg viewBox="0 0 60 60" fill="currentColor" style="width:100%; height:100%;"><circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 42 L20 18 L30 36 L40 18 L46 42 L41 42 L38 28 L30 42 L22 28 L19 42 Z"/></svg>`,
    'zte': `<svg viewBox="0 0 120 50" style="width:100%; height:100%;"><text x="60" y="38" text-anchor="middle" font-family="Arial" font-size="34" font-weight="900" fill="currentColor" letter-spacing="2">ZTE</text></svg>`,
    'oppo': `<svg viewBox="0 0 150 50" style="width:100%; height:100%;"><text x="75" y="38" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="currentColor" letter-spacing="2">OPPO</text></svg>`,
    'realme': `<svg viewBox="0 0 180 50" style="width:100%; height:100%;"><text x="90" y="38" text-anchor="middle" font-family="Arial" font-size="30" font-weight="bold" fill="currentColor" letter-spacing="1">realme</text></svg>`
};

const LOGO_TALLER = `<svg viewBox="0 0 200 60" style="width:100%; height:100%;">
    <text x="100" y="32" text-anchor="middle" font-family="Arial Black" font-size="24" font-weight="900" fill="currentColor">BAYOL</text>
    <text x="100" y="52" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="currentColor" letter-spacing="3">CELL</text>
</svg>`;

function obtenerLogoSvg(tipo, marca) {
    if(tipo === 'taller') return LOGO_TALLER;
    if(tipo === 'ninguno') return '';
    // tipo = 'marca' (auto-detectar)
    const marcaLower = (marca || '').toLowerCase().trim();
    for(const key in LOGOS_MARCAS) {
        if(marcaLower.includes(key)) return LOGOS_MARCAS[key];
    }
    // Si no encuentra marca específica, mostrar texto
    return `<svg viewBox="0 0 200 50" style="width:100%; height:100%;"><text x="100" y="38" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="currentColor">${escapeHtml((marca || '').toUpperCase())}</text></svg>`;
}

/* ============================================================
   LABEL DE VENTA - MODAL + RENDER + IMPRESIÓN
   ============================================================ */
let _labelVentaEquipoId = null;

function abrirModalLabelVenta(equipoId) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    
    _labelVentaEquipoId = equipoId;
    document.getElementById('lv_equipo_id').value = equipoId;
    
    // Sugerir modelo abreviado automáticamente
    const sugerido = construirModeloAbreviado(eq);
    document.getElementById('lv_modelo').value = eq.modelo_abreviado || sugerido;
    document.getElementById('lv_clase').value = eq.clasificacion_final || '';
    document.getElementById('lv_logo_tipo').value = 'marca';
    
    // Restaurar calibración guardada
    document.getElementById('lv_width').value = localStorage.getItem('bayol_lv_w') || '51';
    document.getElementById('lv_height').value = localStorage.getItem('bayol_lv_h') || '25';
    document.getElementById('lv_font').value = localStorage.getItem('bayol_lv_f') || '11';
    document.getElementById('lv_barcode_h').value = localStorage.getItem('bayol_lv_bh') || '38';
    document.getElementById('lv_rotacion').value = localStorage.getItem('bayol_lv_rot') || '0';
    document.getElementById('lv_copias').value = 1;
    
    renderPreviewLabelVenta();
    document.getElementById('modalLabelVenta').classList.add('active');
}

function cerrarModalLabelVenta() {
    document.getElementById('modalLabelVenta').classList.remove('active');
    _labelVentaEquipoId = null;
}

function construirModeloAbreviado(eq) {
    // Sugerir: "iP12 PRO MAX 128GB" de "APPLE IPHONE 12 PRO MAX 128GB"
    let modelo = (eq.modelo || '').toUpperCase().trim();
    const marca = (eq.marca || '').toUpperCase().trim();
    
    // Quitar marca del inicio (APPLE, SAMSUNG, etc) si está duplicada
    if(marca && modelo.startsWith(marca)) {
        modelo = modelo.substring(marca.length).trim();
    }
    
    // Abreviaciones comunes
    const reemplazos = [
        ['IPHONE ', 'iP'],
        ['GALAXY ', 'G'],
        [' NORMAL', ''],
    ];
    reemplazos.forEach(([orig, nuevo]) => {
        modelo = modelo.replace(new RegExp(orig, 'gi'), nuevo);
    });
    
    return modelo.trim();
}

// Genera un código de barras como imagen base64 (Code 128, escaneable)
function generarBarcodeImg(texto, alturaPx) {
    if(typeof JsBarcode !== 'function' || !texto) return '';
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, String(texto), {
            format: 'CODE128',
            width: 2,
            height: alturaPx || 40,
            displayValue: false,
            margin: 0
        });
        return canvas.toDataURL('image/png');
    } catch(e) {
        console.log('Error barcode:', e);
        return '';
    }
}

function generarHtmlLabelVenta() {
    const eq = (cache.refurb || []).find(r => r.id === _labelVentaEquipoId);
    if(!eq) return '';
    
    const modeloAbrev = document.getElementById('lv_modelo').value || construirModeloAbreviado(eq);
    const clase = (document.getElementById('lv_clase').value || '').toUpperCase();
    const logoTipo = document.getElementById('lv_logo_tipo').value;
    const w = parseInt(document.getElementById('lv_width').value);
    const h = parseInt(document.getElementById('lv_height').value);
    const f = parseInt(document.getElementById('lv_font').value);
    const bh = parseInt(document.getElementById('lv_barcode_h').value);
    
    const logoSvg = obtenerLogoSvg(logoTipo, eq.marca);
    const imei = eq.imei || '';
    
    // Altura del logo dinámica según altura total
    const logoH = Math.max(8, Math.round(h * 0.25));
    
    // Código de barras como imagen (escaneable, se renderiza siempre)
    const barcodeImg = generarBarcodeImg(imei, bh);
    
    return `
        <div style="width:${w}mm; height:${h}mm; padding:1mm; font-family:Arial, sans-serif; font-weight:900; -webkit-text-stroke:0.4px #000; text-align:center; color:#000; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
            ${logoSvg ? `<div style="height:${logoH}mm; display:flex; justify-content:center; align-items:center; color:#000;">${logoSvg}</div>` : ''}
            <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:0.5mm 0;">
                <div style="font-size:${f}px; font-weight:900; -webkit-text-stroke:0.4px #000; line-height:1.1; word-break:break-word;">${escapeHtml(modeloAbrev)}</div>
                ${clase ? `<div style="font-size:${f-1}px; font-weight:900; -webkit-text-stroke:0.4px #000; margin-top:1mm;">${escapeHtml(clase)}</div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; align-items:center;">
                ${barcodeImg ? `<img src="${barcodeImg}" style="width:auto; max-width:100%; height:${bh}px; display:block;" />` : `<div style="font-size:${f}px; font-weight:900;">${escapeHtml(imei)}</div>`}
                <div style="font-size:${Math.max(7, f-2)}px; font-weight:900; -webkit-text-stroke:0.3px #000; letter-spacing:1px; margin-top:0.5mm;">${escapeHtml(imei)}</div>
            </div>
        </div>
    `;
}

let _lvPreviewDebounce = null;

function renderPreviewLabelVenta() {
    const w = document.getElementById('lv_width').value;
    const h = document.getElementById('lv_height').value;
    const f = document.getElementById('lv_font').value;
    const bh = document.getElementById('lv_barcode_h').value;
    
    document.getElementById('lv_w_val').textContent = w + 'mm';
    document.getElementById('lv_h_val').textContent = h + 'mm';
    document.getElementById('lv_f_val').textContent = f + 'px';
    document.getElementById('lv_bh_val').textContent = bh + 'px';
    
    const preview = document.getElementById('lv_preview_card');
    if(!preview) return;
    
    // 1. Mostrar el HTML de inmediato (respuesta rápida al mover sliders)
    preview.style.border = '1px dashed #94a3b8';
    preview.innerHTML = generarHtmlLabelVenta();
    
    // 2. Con debounce, reemplazar por la IMAGEN REAL (lo que se imprime exacto)
    if(_lvPreviewDebounce) clearTimeout(_lvPreviewDebounce);
    _lvPreviewDebounce = setTimeout(() => renderPreviewVentaImagenReal(w, h), 400);
}

// Genera la imagen real (igual a la impresión) y la muestra en el preview
async function renderPreviewVentaImagenReal(w, h) {
    if(typeof html2canvas !== 'function') return;
    const preview = document.getElementById('lv_preview_card');
    if(!preview) return;
    
    try {
        // Crear el label en un contenedor oculto
        const cont = document.createElement('div');
        cont.style.position = 'fixed';
        cont.style.left = '-9999px';
        cont.style.top = '0';
        cont.style.background = '#fff';
        cont.innerHTML = generarHtmlLabelVenta();
        document.body.appendChild(cont);
        const labelEl = cont.firstElementChild || cont;
        
        const dpi = 203, escala = dpi / 96;
        const canvas = await html2canvas(labelEl, { scale: escala, backgroundColor: '#ffffff', logging: false, useCORS: true });
        document.body.removeChild(cont);
        
        // Mostrar la imagen real escalada al preview (manteniendo proporción real ancho:alto)
        const ratio = parseFloat(h) / parseFloat(w);
        const anchoPreview = 240; // px en pantalla
        preview.innerHTML = `<img src="${canvas.toDataURL('image/png')}" style="width:${anchoPreview}px; height:${Math.round(anchoPreview * ratio)}px; display:block;" />`;
    } catch(e) {
        console.log('Preview imagen real:', e);
        // si falla, se queda el HTML que ya pusimos
    }
}

async function imprimirLabelVenta() {
    if(!_labelVentaEquipoId) return;
    
    const eq = (cache.refurb || []).find(r => r.id === _labelVentaEquipoId);
    if(!eq) return;
    
    const modeloAbrev = document.getElementById('lv_modelo').value;
    const clase = document.getElementById('lv_clase').value.toUpperCase();
    const w = parseInt(document.getElementById('lv_width').value);
    const h = parseInt(document.getElementById('lv_height').value);
    const rot = parseInt(document.getElementById('lv_rotacion').value) || 0;
    const copias = document.getElementById('lv_copias').value || 1;
    
    if(!modeloAbrev || !modeloAbrev.trim()) return alert('Escribe el modelo abreviado.');
    if(!eq.imei) return alert('Este equipo no tiene IMEI registrado.');
    
    // Guardar calibración
    localStorage.setItem('bayol_lv_w', w);
    localStorage.setItem('bayol_lv_h', h);
    localStorage.setItem('bayol_lv_f', document.getElementById('lv_font').value);
    localStorage.setItem('bayol_lv_bh', document.getElementById('lv_barcode_h').value);
    localStorage.setItem('bayol_lv_rot', rot);
    
    // Guardar modelo abreviado y clase en BD para reimprimir igual
    try {
        await supabaseClient.from('equipos_refurbish').update({
            modelo_abreviado: modeloAbrev,
            clasificacion_final: clase || null
        }).eq('id', _labelVentaEquipoId);
    } catch(e) {
        logError('Guardar modelo abreviado', e);
        // No bloqueamos la impresión por esto
    }
    
    // Generar HTML y aplicar rotación
    const contenido = generarHtmlLabelVenta();
    const { html: contenidoFinal, anchoFinal, altoFinal } = aplicarRotacionImpresion(contenido, w, h, rot);
    
    cerrarModalLabelVenta();
    
    // === MÉTODO IMAGEN (idéntico a la vista previa) ===
    const metodo = localStorage.getItem('bayol_metodo_impresion') || 'imagen';
    if(metodo === 'imagen' && _qzConectado && typeof html2canvas === 'function') {
        const cont = document.createElement('div');
        cont.style.position = 'fixed';
        cont.style.left = '-9999px';
        cont.style.top = '0';
        cont.style.background = '#fff';
        cont.innerHTML = contenidoFinal;
        document.body.appendChild(cont);
        const labelEl = cont.firstElementChild || cont;
        const ok = await qzImprimirHtmlComoImagen(labelEl, anchoFinal, altoFinal, copias, 'labels');
        document.body.removeChild(cont);
        if(ok) { toast('🖨️ Label de venta enviado (igual a la vista previa).'); return; }
    }
    
    // === MÉTODO NORMAL (respaldo) ===
    const labelHtml = `
        <style>
            @page { size: ${anchoFinal}mm ${altoFinal}mm; margin: 0; }
            @media print {
                body { margin: 0; padding: 0; }
                .print-area { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        ${contenidoFinal}
    `;
    imprimirContenido(labelHtml, copias, anchoFinal, altoFinal);
}

/* ============================================================
   MÓDULO DE DEVOLUCIONES
   ============================================================ */
let _devolucionesCache = [];

async function cargarDevoluciones() {
    const cont = document.getElementById('devolucionesLista');
    if(!cont) return;
    cont.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">Cargando devoluciones...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('equipo_devoluciones')
            .select('*')
            .order('fecha_devolucion', { ascending: false });
        if(error) throw error;
        _devolucionesCache = data || [];
        renderDevoluciones();
    } catch(e) {
        logError('Cargar devoluciones', e);
        cont.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error al cargar: ${escapeHtml(getFriendlyError(e))}</p>`;
    }
}

function renderDevoluciones() {
    const cont = document.getElementById('devolucionesLista');
    if(!cont) return;
    if(_devolucionesCache.length === 0) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px; font-size:13px;">No hay devoluciones registradas. Cuando un cliente devuelva un equipo, regístralo aquí.</p>`;
        return;
    }
    
    cont.innerHTML = _devolucionesCache.map(d => {
        const eq = (cache.refurb || []).find(r => r.id === d.equipo_id);
        const fecha = new Date(d.fecha_devolucion).toLocaleString('es-DO', { dateStyle:'short', timeStyle:'short' });
        const cicloTxt = d.ciclo > 1 ? ` · Ciclo ${d.ciclo}` : '';
        const estadoActual = eq ? (eq.estado_evaluacion || 'pendiente') : 'desconocido';
        const estadoLabel = obtenerEtiquetaEstado(estadoActual);
        
        return `<div class="pieza-card" data-item-id="${d.id}" style="border-left:4px solid #dc2626;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <i class="ti ti-rotate-2" style="color:#dc2626; font-size:18px;"></i>
                        <b style="font-size:14px;">${escapeHtml(eq?.modelo || 'Equipo desconocido')}</b>
                        ${d.ciclo > 1 ? `<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:10px;">DEVUELTO ${d.ciclo - 1}× ANTES</span>` : ''}
                        <span class="badge" style="background:${estadoLabel.bg}; color:${estadoLabel.color}; font-size:10px;">${estadoLabel.text}</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <i class="ti ti-barcode"></i> IMEI: ${escapeHtml(eq?.imei || '—')}
                        · <i class="ti ti-calendar"></i> ${escapeHtml(fecha)}${cicloTxt}
                        ${d.cliente_que_devolvio ? ` · <i class="ti ti-user"></i> ${escapeHtml(d.cliente_que_devolvio)}` : ''}
                    </div>
                    <div style="background:#fef2f2; padding:8px 10px; border-radius:6px; margin-top:8px; font-size:12px;">
                        <b style="color:#991b1b;">Motivo:</b> ${escapeHtml(d.motivo_devolucion)}
                    </div>
                    ${d.problemas_reportados ? `<div style="background:#fef3c7; padding:6px 10px; border-radius:6px; margin-top:4px; font-size:11px;">
                        <b style="color:#92400e;">Problemas:</b> ${escapeHtml(d.problemas_reportados)}
                    </div>` : ''}
                    ${d.diagnostico_inicial ? `<div style="background:#f1f5f9; padding:6px 10px; border-radius:6px; margin-top:4px; font-size:11px;">
                        <b>Diagnóstico:</b> ${escapeHtml(d.diagnostico_inicial)}
                    </div>` : ''}
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                    ${eq ? `<button class="btn btn-dark" style="padding:8px 12px;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-tool"></i> Trabajar</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function obtenerEtiquetaEstado(estado) {
    const map = {
        'pendiente': { text: '🟡 Pendiente', bg:'#fef3c7', color:'#92400e' },
        'en_evaluacion': { text: '⚠️ Evaluación', bg:'#dbeafe', color:'#1e40af' },
        'evaluado': { text: '✅ Evaluado', bg:'#d1fae5', color:'#065f46' },
        'en_proceso': { text: '🔧 En Proceso', bg:'#fed7aa', color:'#9a3412' },
        'tecnico_recibio': { text: '📦 Recibido', bg:'#bfdbfe', color:'#1e40af' },
        'espera_pieza': { text: '⏳ Espera pieza', bg:'#fde68a', color:'#92400e' },
        'listo_revision': { text: '👁️ Revisión final', bg:'#e9d5ff', color:'#6b21a8' },
        'listo_venta': { text: '🛒 Listo Venta', bg:'#ddd6fe', color:'#5b21b6' },
        'vendido': { text: '✅ Despachado', bg:'#d1fae5', color:'#065f46' },
        'reasignado': { text: '👥 Reasignado', bg:'#fef3c7', color:'#92400e' }
    };
    return map[estado] || { text: estado, bg:'#f1f5f9', color:'#64748b' };
}

// === FASE 2: Estados del flujo de ÓRDENES DE CLIENTE ===
// Flujo: recibido → en_proceso → espera_repuesto / pendiente_cliente → finalizado → entregado (+ cancelado)
const ORDEN_FLUJO = ['recibido', 'en_proceso', 'espera_repuesto', 'pendiente_cliente', 'finalizado', 'entregado'];

function obtenerEtiquetaOrden(estado) {
    const map = {
        'recibido':         { text: '📥 Recibido', bg:'#e0f2fe', color:'#0369a1' },
        'en_proceso':       { text: '🔧 En proceso', bg:'#fed7aa', color:'#9a3412' },
        'espera_repuesto':  { text: '⏳ En espera de repuesto', bg:'#fde68a', color:'#92400e' },
        'pendiente_cliente':{ text: '🔔 Esperando autorización', bg:'#fbcfe8', color:'#9d174d' },
        'finalizado':       { text: '✅ Finalizado', bg:'#d1fae5', color:'#065f46' },
        'entregado':        { text: '📦 Entregado', bg:'#dcfce7', color:'#166534' },
        'cancelado':        { text: '❌ Cancelado', bg:'#fee2e2', color:'#991b1b' },
        // compatibilidad con estados viejos
        'diagnostico':      { text: '📥 Recibido', bg:'#e0f2fe', color:'#0369a1' },
        'en_reparacion':    { text: '🔧 En proceso', bg:'#fed7aa', color:'#9a3412' },
        'espera_pieza':     { text: '⏳ En espera de repuesto', bg:'#fde68a', color:'#92400e' },
        'listo':            { text: '✅ Finalizado', bg:'#d1fae5', color:'#065f46' },
        'listo_entrega':    { text: '✅ Finalizado', bg:'#d1fae5', color:'#065f46' }
    };
    return map[estado] || { text: estado, bg:'#f1f5f9', color:'#64748b' };
}

// Normaliza estados viejos al nuevo flujo
function normalizarEstadoOrden(estado) {
    const equiv = {
        'diagnostico': 'recibido', 'en_reparacion': 'en_proceso',
        'espera_pieza': 'espera_repuesto', 'listo': 'finalizado', 'listo_entrega': 'finalizado'
    };
    return equiv[estado] || estado || 'recibido';
}

// ============================================================
//   MÓDULO REPORTES — Rendimiento por técnico
// ============================================================
let _repChart = null;

// Calcula promedio de horas entre dos fechas para una lista de registros.
// Devuelve {prom, n} en horas (decimal) y cantidad de muestras válidas.
function promedioHoras(registros, campoInicio, campoFin) {
    let suma = 0, n = 0;
    registros.forEach(r => {
        const ini = r[campoInicio] ? new Date(r[campoInicio]) : null;
        const fin = r[campoFin] ? new Date(r[campoFin]) : null;
        if(ini && fin && !isNaN(ini) && !isNaN(fin) && fin > ini) {
            suma += (fin - ini) / 3600000; // ms → horas
            n++;
        }
    });
    return { prom: n ? suma / n : 0, n };
}

// Formatea horas decimales a "Xh Ym" o "Xd Yh"
function formatoHoras(horas) {
    if(!horas || horas <= 0) return '—';
    const totalMin = Math.round(horas * 60);
    const dias = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if(dias >= 1) return `${dias}d ${h}h`;
    if(h >= 1) return `${h}h ${m}min`;
    return `${m}min`;
}

// Métricas de tiempo (trabajo y total) para órdenes y reacondicionados de un técnico (o todos si tecnicoId=null)
function calcularTiemposReparacion(tecnicoId) {
    let ordenes = (cache.ordenes || []);
    let refurb = (cache.refurb || []);
    if(tecnicoId) {
        ordenes = ordenes.filter(o => o.tecnico_asignado_id === tecnicoId);
        refurb = refurb.filter(r => r.tecnico_asignado_id === tecnicoId);
    }
    return {
        // Órdenes de cliente
        ord_trabajo: promedioHoras(ordenes, 'fecha_asignacion', 'fecha_finalizado'),
        ord_total: promedioHoras(ordenes, 'creado_en', 'fecha_entregado'),
        // Reacondicionados (trabajo: desde asignación → hasta despacho/venta)
        rf_trabajo: promedioHoras(refurb, 'fecha_asignacion', 'fecha_despacho'),
    };
}

// Filtro de fechas para reportes/historial. Por defecto: último mes.
let _repFiltroFechas = { desde: null, hasta: null, label: '1 mes' };

// Devuelve true si una fecha ISO cae dentro del rango del filtro actual
function fechaEnRango(fechaISO) {
    if(!fechaISO) return false;
    const f = new Date(fechaISO);
    if(isNaN(f)) return false;
    if(_repFiltroFechas.desde && f < new Date(_repFiltroFechas.desde)) return false;
    if(_repFiltroFechas.hasta && f > new Date(_repFiltroFechas.hasta + 'T23:59:59')) return false;
    return true;
}

// Aplica un período rápido (en días) o 'todo'
function setPeriodoReporte(dias, label) {
    if(dias === 'todo') {
        _repFiltroFechas = { desde: null, hasta: null, label: 'Todo' };
    } else {
        const hasta = new Date();
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);
        _repFiltroFechas = {
            desde: desde.toISOString().slice(0,10),
            hasta: hasta.toISOString().slice(0,10),
            label: label
        };
    }
    const dDesde = document.getElementById('rep_fecha_desde');
    const dHasta = document.getElementById('rep_fecha_hasta');
    if(dDesde) dDesde.value = _repFiltroFechas.desde || '';
    if(dHasta) dHasta.value = _repFiltroFechas.hasta || '';
    inicializarReportes();
    if(typeof renderMiTrabajo === 'function' && document.getElementById('v-miTrabajo')?.classList.contains('active')) renderMiTrabajo();
    if(document.getElementById('v-atencion')?.classList.contains('active')) renderAtencionHistorial();
}

// Aplica fechas personalizadas desde los inputs
function aplicarFechasPersonalizadas() {
    const desde = document.getElementById('rep_fecha_desde')?.value || null;
    const hasta = document.getElementById('rep_fecha_hasta')?.value || null;
    _repFiltroFechas = { desde, hasta, label: 'Personalizado' };
    inicializarReportes();
    if(typeof renderMiTrabajo === 'function' && document.getElementById('v-miTrabajo')?.classList.contains('active')) renderMiTrabajo();
    if(document.getElementById('v-atencion')?.classList.contains('active')) renderAtencionHistorial();
}

// Construye la barra de filtro de fechas (reutilizable)
function construirFiltroFechas(conPersonalizado) {
    const lbl = _repFiltroFechas.label;
    const btn = (dias, texto) => {
        const activo = lbl === texto;
        return `<button onclick="setPeriodoReporte(${dias === 'todo' ? "'todo'" : dias},'${texto}')" style="padding:6px 12px; border-radius:8px; border:1px solid ${activo ? '#0891b2' : '#cbd5e1'}; background:${activo ? '#0891b2' : '#fff'}; color:${activo ? '#fff' : '#475569'}; font-size:12px; font-weight:600; cursor:pointer;">${texto}</button>`;
    };
    let html = `<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; font-weight:700; color:var(--text-muted);"><i class="ti ti-calendar"></i> Período:</span>
        ${btn(1, 'Hoy')}${btn(15, '15 días')}${btn(30, '1 mes')}${btn(90, '3 meses')}${btn('todo', 'Todo')}`;
    if(conPersonalizado) {
        html += `
        <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">Desde:</span>
        <input type="date" id="rep_fecha_desde" value="${_repFiltroFechas.desde || ''}" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
        <span style="font-size:12px; color:var(--text-muted);">Hasta:</span>
        <input type="date" id="rep_fecha_hasta" value="${_repFiltroFechas.hasta || ''}" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
        <button onclick="aplicarFechasPersonalizadas()" class="btn btn-blue" style="padding:5px 12px; font-size:12px;">Aplicar</button>`;
    }
    html += `</div>`;
    return html;
}

// Inicializar el filtro por defecto (último mes) la primera vez
(function initFiltroFechasDefault(){
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    _repFiltroFechas = { desde: desde.toISOString().slice(0,10), hasta: hasta.toISOString().slice(0,10), label: '1 mes' };
})();

// Reporte de fallas y modelos más comunes (ranking con barras)
function construirReporteComunes() {
    // Contar fallas (de tareas_trabajo) dentro del rango de fechas
    const fallasCount = {};
    (cache.tareas || []).forEach(t => {
        if(!fechaEnRango(t.creado_en)) return;
        const desc = (t.descripcion || '').trim();
        if(desc) { const k = desc.toLowerCase(); fallasCount[k] = (fallasCount[k] || 0) + 1; }
    });
    // Contar modelos (de equipos en órdenes + reacond) dentro del rango
    const modelosCount = {};
    (cache.ordenes || []).forEach(o => {
        if(!fechaEnRango(o.creado_en)) return;
        const e = findEquipo(o.equipo_id);
        const m = `${e.marca || ''} ${e.modelo || ''}`.trim();
        if(m) modelosCount[m] = (modelosCount[m] || 0) + 1;
    });
    (cache.refurb || []).forEach(eq => {
        if(!fechaEnRango(eq.creado_en)) return;
        const m = `${eq.marca || ''} ${eq.modelo || ''}`.trim();
        if(m) modelosCount[m] = (modelosCount[m] || 0) + 1;
    });
    
    const topFallas = Object.entries(fallasCount).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const topModelos = Object.entries(modelosCount).sort((a,b) => b[1]-a[1]).slice(0, 8);
    
    const barras = (datos, color) => {
        if(!datos.length) return `<div style="color:var(--text-muted); font-size:12px; padding:6px 0;">Sin datos aún.</div>`;
        const max = datos[0][1] || 1;
        return datos.map(([nombre, n]) => {
            const pct = Math.round((n / max) * 100);
            return `<div style="margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                    <span style="font-weight:600; text-transform:capitalize;">${escapeHtml(nombre)}</span>
                    <span style="font-weight:700; color:${color};">${n}</span>
                </div>
                <div style="background:#e2e8f0; border-radius:5px; height:8px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${color}; border-radius:5px;"></div>
                </div>
            </div>`;
        }).join('');
    };
    
    // Contar reparaciones terminadas en el período
    let repTerminadas = 0;
    (cache.ordenes || []).forEach(o => {
        const est = normalizarEstadoOrden(o.estado);
        if((est === 'finalizado' || est === 'entregado') && fechaEnRango(o.fecha_finalizado || o.fecha_entregado || o.creado_en)) repTerminadas++;
    });
    (cache.refurb || []).forEach(eq => {
        if(['listo_venta','vendido'].includes(eq.estado_evaluacion) && fechaEnRango(eq.fecha_despacho || eq.creado_en)) repTerminadas++;
    });
    
    return `
        <div class="card" style="margin-bottom:15px;">
            ${construirFiltroFechas(true)}
            <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px; margin-bottom:14px; text-align:center;">
                <div style="font-size:13px; color:#166534;">Reparaciones terminadas en el período (${_repFiltroFechas.label})</div>
                <div style="font-size:28px; font-weight:800; color:#16a34a;">${repTerminadas}</div>
            </div>
            <h3 style="margin:0 0 12px;"><i class="ti ti-chart-bar" style="color:#6366f1;"></i> Lo Más Común</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:18px;">
                <div>
                    <div style="font-weight:700; font-size:13px; margin-bottom:8px; color:#dc2626;"><i class="ti ti-alert-triangle"></i> Fallas más comunes</div>
                    ${barras(topFallas, '#dc2626')}
                </div>
                <div>
                    <div style="font-weight:700; font-size:13px; margin-bottom:8px; color:#0891b2;"><i class="ti ti-device-mobile"></i> Modelos que más entran</div>
                    ${barras(topModelos, '#0891b2')}
                </div>
            </div>
        </div>`;
}

function inicializarReportes() {
    // Bloque de promedio GENERAL del taller (todos los técnicos)
    const gen = calcularTiemposReparacion(null);
    const genCont = document.getElementById('reporteGeneralTiempos');
    if(genCont) {
        const kpiG = (label, val, color) => `<div class="kpi-box" style="border-top-color:${color};"><small>${label}</small><strong style="font-size:18px;">${val}</strong></div>`;
        genCont.innerHTML = `
            <div class="card" style="margin-bottom:15px; background:linear-gradient(135deg,#ecfeff,#f0f9ff);">
                <h3 style="margin:0 0 12px;"><i class="ti ti-building-store" style="color:#0891b2;"></i> Promedio General del Taller</h3>
                <div class="kpi-grid">
                    ${kpiG('⏱️ Trabajo órdenes', formatoHoras(gen.ord_trabajo.prom), '#0891b2')}
                    ${kpiG('📦 Total cliente', formatoHoras(gen.ord_total.prom), '#3b82f6')}
                    ${kpiG('🔧 Trabajo reacond.', formatoHoras(gen.rf_trabajo.prom), '#f59e0b')}
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:8px;">Basado en ${gen.ord_trabajo.n} orden(es) y ${gen.rf_trabajo.n} reacondicionado(s) completados.</div>
            </div>
            ${construirReporteComunes()}`;
    }
    
    const sel = document.getElementById('rep_tecnico');
    if(!sel) return;
    const tecnicos = (cache.tecnicos || []).filter(t => t.tipo_empleado === 'tecnico' || (!t.tipo_empleado && t.rol !== 'admin'));
    sel.innerHTML = '<option value="">-- Selecciona un técnico --</option>' +
        tecnicos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');
    if(tecnicos.length) { sel.value = tecnicos[0].id; renderReporteTecnico(); }
    else document.getElementById('reporteContenido').innerHTML = '<div class="card" style="color:var(--text-muted);">No hay técnicos registrados.</div>';
}

function calcularMetricasTecnico(tecnicoId) {
    const ordenes = (cache.ordenes || []).filter(o => o.tecnico_asignado_id === tecnicoId);
    const refurb = (cache.refurb || []).filter(r => r.tecnico_asignado_id === tecnicoId);
    
    const norm = (e) => normalizarEstadoOrden(e);
    return {
        // Servicio (clientes)
        srv_total: ordenes.length,
        srv_proceso: ordenes.filter(o => ['en_proceso','espera_repuesto','pendiente_cliente'].includes(norm(o.estado))).length,
        srv_finalizadas: ordenes.filter(o => ['finalizado','entregado'].includes(norm(o.estado))).length,
        srv_derivadas: ordenes.filter(o => o.tecnico_anterior_id === tecnicoId).length,
        // Reacondicionados
        rf_total: refurb.length,
        rf_proceso: refurb.filter(r => ['en_proceso','tecnico_recibio','espera_pieza','listo_revision'].includes(r.estado_evaluacion)).length,
        rf_terminados: refurb.filter(r => ['listo_venta','vendido'].includes(r.estado_evaluacion)).length,
        rf_devueltos: refurb.filter(r => (r.veces_devuelto || 0) > 0).length,
        // Piezas pendientes (Fase C)
        piezas_pend: (cache.ordenPiezas || []).filter(p => p.tecnico_id === tecnicoId && ['recibida','devolucion_solicitada'].includes(p.estado)).length,
        ordenes, refurb
    };
}

function renderReporteTecnico() {
    const tecnicoId = document.getElementById('rep_tecnico')?.value;
    const cont = document.getElementById('reporteContenido');
    if(!cont) return;
    if(!tecnicoId) { cont.innerHTML = '<div class="card" style="color:var(--text-muted);">Selecciona un técnico para ver su reporte.</div>'; return; }
    
    const m = calcularMetricasTecnico(tecnicoId);
    const mt = calcularTiemposReparacion(tecnicoId);
    const tec = (cache.tecnicos || []).find(t => t.id === tecnicoId);
    
    const kpi = (label, val, color) => `<div class="kpi-box" style="border-top-color:${color};"><small>${label}</small><strong>${val}</strong></div>`;
    
    cont.innerHTML = `
        <div class="card" style="margin-bottom:15px;">
            <h3 style="margin:0 0 12px;"><i class="ti ti-headset" style="color:#0891b2;"></i> Servicio (Clientes)</h3>
            <div class="kpi-grid">
                ${kpi('Órdenes totales', m.srv_total, '#3b82f6')}
                ${kpi('En proceso', m.srv_proceso, '#f59e0b')}
                ${kpi('Finalizadas', m.srv_finalizadas, '#10b981')}
                ${kpi('Derivó a otros', m.srv_derivadas, '#8b5cf6')}
            </div>
        </div>
        <div class="card" style="margin-bottom:15px;">
            <h3 style="margin:0 0 12px;"><i class="ti ti-refresh" style="color:#06b6d4;"></i> Reacondicionados</h3>
            <div class="kpi-grid">
                ${kpi('Equipos totales', m.rf_total, '#3b82f6')}
                ${kpi('En proceso', m.rf_proceso, '#f59e0b')}
                ${kpi('Terminados', m.rf_terminados, '#10b981')}
                ${kpi('Le devolvieron', m.rf_devueltos, '#ef4444')}
            </div>
        </div>
        <div class="card" style="margin-bottom:15px;">
            <h3 style="margin:0 0 12px;"><i class="ti ti-stopwatch" style="color:#0891b2;"></i> Tiempos Promedio</h3>
            <div class="kpi-grid">
                ${kpi('⏱️ Trabajo (órdenes)', formatoHoras(mt.ord_trabajo.prom), '#0891b2')}
                ${kpi('📦 Total cliente', formatoHoras(mt.ord_total.prom), '#3b82f6')}
                ${kpi('🔧 Trabajo (reacond.)', formatoHoras(mt.rf_trabajo.prom), '#f59e0b')}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:8px;">
                <i class="ti ti-info-circle"></i> Trabajo = desde que lo toma hasta finalizar · Total cliente = desde recepción hasta entrega.
                ${mt.ord_trabajo.n + mt.ord_total.n + mt.rf_trabajo.n === 0 ? '<br>Aún no hay trabajos completados para calcular promedios.' : ''}
            </div>
        </div>
        <div class="card" style="margin-bottom:15px;">
            <h3 style="margin:0 0 12px;"><i class="ti ti-chart-bar"></i> Comparativa</h3>
            <canvas id="repCanvas" style="max-height:280px;"></canvas>
        </div>
        ${m.piezas_pend > 0 ? `<div class="card" style="margin-bottom:15px; border-left:4px solid #f59e0b;">
            <b style="color:#9a3412;"><i class="ti ti-packages"></i> Tiene ${m.piezas_pend} pieza(s) pendiente(s)</b>
            <button class="btn btn-light" style="margin-left:10px; font-size:12px;" onclick="verPiezasDelTecnico('${tecnicoId}')">Ver piezas</button>
        </div>` : ''}
        <div class="card">
            <h3 style="margin:0 0 12px;"><i class="ti ti-list-details"></i> Detalle de trabajos</h3>
            <div style="overflow-x:auto;">
                <table class="data-table" style="width:100%; font-size:13px;">
                    <thead><tr><th>Área</th><th>Equipo</th><th>Estado</th><th>Ref.</th></tr></thead>
                    <tbody>
                        ${m.ordenes.map(o => { const e = findEquipo(o.equipo_id); const et = obtenerEtiquetaOrden(normalizarEstadoOrden(o.estado)); return `<tr><td>🧾 Servicio</td><td>${escapeHtml(e.marca||'')} ${escapeHtml(e.modelo||'')}</td><td><span class="badge" style="background:${et.bg};color:${et.color};">${et.text}</span></td><td>${formatoOrden(o.numero_orden)}</td></tr>`; }).join('')}
                        ${m.refurb.map(r => { const art = findArticulo(r.articulo_id); const et = obtenerEtiquetaEstado(r.estado_evaluacion||'pendiente'); return `<tr><td>🔧 Reacond</td><td>${escapeHtml(art.marca||r.marca||'')} ${escapeHtml(art.modelo||r.modelo||'')}</td><td><span class="badge" style="background:${et.bg};color:${et.color};">${et.text}</span></td><td>${escapeHtml(r.imei||'—')}</td></tr>`; }).join('')}
                        ${(m.ordenes.length + m.refurb.length) === 0 ? '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Este técnico aún no tiene trabajos registrados.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Gráfica comparativa
    setTimeout(() => {
        const canvas = document.getElementById('repCanvas');
        if(!canvas || typeof Chart === 'undefined') return;
        if(_repChart) { try { _repChart.destroy(); } catch(e){} }
        _repChart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Totales', 'En proceso', 'Terminadas', 'Problemas'],
                datasets: [
                    { label: 'Servicio', data: [m.srv_total, m.srv_proceso, m.srv_finalizadas, m.srv_derivadas], backgroundColor: '#0891b2' },
                    { label: 'Reacondicionados', data: [m.rf_total, m.rf_proceso, m.rf_terminados, m.rf_devueltos], backgroundColor: '#f59e0b' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }, 100);
}

// Filtro activo del tablero de taller
let _filtroTaller = 'activas';
function setFiltroTaller(f) {
    _filtroTaller = f;
    ['todas','libres','mias','reasignadas','activas','entregadas'].forEach(x => {
        const btn = document.getElementById('fltOrd' + x.charAt(0).toUpperCase() + x.slice(1));
        if(btn) { btn.style.background = (x === f) ? 'var(--blue-btn)' : ''; btn.style.color = (x === f) ? '#fff' : ''; }
    });
    renderTallerOrdenes();
}

function renderTallerOrdenes() {
    const cont = document.getElementById('tallerOrdenesLista');
    if(!cont) return;
    let ordenes = (cache.ordenes || []).slice();
    const esAdmin = isAdminUser();
    const miId = sessionUser?.id;
    
    // Aplicar filtro
    if(_filtroTaller === 'libres') {
        ordenes = ordenes.filter(o => !o.tecnico_asignado_id && normalizarEstadoOrden(o.estado) !== 'cancelado' && normalizarEstadoOrden(o.estado) !== 'entregado');
    } else if(_filtroTaller === 'mias') {
        // Mis órdenes: las que tengo asignadas O donde tengo alguna tarea/falla asignada (incl. reasignaciones)
        const misTareasOrden = new Set((cache.tareas || []).filter(t => t.tipo === 'orden' && t.tecnico_id === miId).map(t => t.ref_id));
        ordenes = ordenes.filter(o => o.tecnico_asignado_id === miId || misTareasOrden.has(o.id));
    } else if(_filtroTaller === 'reasignadas') {
        // Órdenes con tareas que me reasignaron a mí (vengo de otro técnico)
        const reasignadasAMi = new Set((cache.tareas || []).filter(t => t.tipo === 'orden' && t.tecnico_id === miId && t.tecnico_anterior_id).map(t => t.ref_id));
        ordenes = ordenes.filter(o => reasignadasAMi.has(o.id));
    } else if(_filtroTaller === 'activas') {
        ordenes = ordenes.filter(o => !['entregado','cancelado'].includes(normalizarEstadoOrden(o.estado)));
    } else if(_filtroTaller === 'entregadas') {
        ordenes = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'entregado');
    }
    
    // Buscador de texto (número de orden o cliente)
    const txtBuscar = (document.getElementById('buscadorTaller')?.value || '').trim().toLowerCase();
    if(txtBuscar) {
        ordenes = ordenes.filter(o => {
            const c = findCliente(o.cliente_id);
            const numTxt = formatoOrden(o.numero_orden).toLowerCase();
            const cliTxt = (c.nombre || '').toLowerCase();
            return numTxt.includes(txtBuscar) || cliTxt.includes(txtBuscar);
        });
    }
    
    if(!ordenes.length) {
        cont.innerHTML = `<div style="color:var(--text-muted); padding:14px 0;">No hay órdenes en este filtro${txtBuscar ? ' o búsqueda' : ''}.</div>`;
        return;
    }
    
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || !t.tipo_empleado));
    // Si el usuario es de servicio al cliente (no técnico, no admin), ocultar botones de técnico
    const esTecnicoReal = sessionUser?.tipo_empleado === 'tecnico';
    const esModoServicio = !esAdmin && !esTecnicoReal && (tienePermiso('solo_atencion') || tienePermiso('recepcion_ver') || sessionUser?.tipo_empleado === 'servicio');
    cont.innerHTML = ordenes.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos, esModoServicio)).join('');
}

// Construye el HTML de UNA orden (reutilizable: tablero taller + Mi Trabajo)
// Panel central que junta TODAS las piezas solicitadas (órdenes de cliente + reacondicionados)
let _psFiltro = 'todas';
function renderPiezasSolicitadas() {
    const cont = document.getElementById('piezasSolicitadasLista');
    if(!cont) return;
    const items = [];
    // Piezas de órdenes de cliente
    (cache.ordenPiezas || []).forEach(p => {
        const o = (cache.ordenes || []).find(x => x.id === p.orden_id);
        const c = o ? findCliente(o.cliente_id) : {};
        const tec = p.tecnico_id ? nombreEmpleado(p.tecnico_id) : (o && o.tecnico_asignado_id ? nombreEmpleado(o.tecnico_asignado_id) : '—');
        items.push({
            pieza: p.pieza_nombre || 'Pieza', cantidad: p.cantidad || 1, estado: p.estado || 'solicitada',
            origen: o ? `Orden ${formatoOrden(o.numero_orden)}` : 'Orden', cliente: c.nombre || '', tecnico: tec,
            tipo: 'Orden', color: '#3b82f6', fecha: p.creado_en
        });
    });
    // Piezas de reacondicionados
    (cache.piezasReacond || []).forEach(p => {
        const eq = (cache.refurb || []).find(x => x.id === p.equipo_id);
        const tec = eq && eq.tecnico_asignado_id ? nombreEmpleado(eq.tecnico_asignado_id) : '—';
        items.push({
            pieza: p.pieza_nombre || 'Pieza', cantidad: p.cantidad || 1, estado: p.estado || 'pendiente',
            origen: eq ? `${eq.marca||''} ${eq.modelo||''}`.trim() : 'Reacond', cliente: '', tecnico: tec,
            tipo: 'Reacond', color: '#f59e0b', fecha: p.fecha_entrega || p.creado_en
        });
    });
    
    // Filtro por estado
    let filtrados = items;
    if(_psFiltro === 'pendientes') filtrados = items.filter(i => ['solicitada','pendiente','extra_pendiente','aprobada'].includes(i.estado));
    else if(_psFiltro === 'entregadas') filtrados = items.filter(i => ['entregada','recibida'].includes(i.estado));
    
    // Buscador
    const txt = (document.getElementById('psBuscador')?.value || '').trim().toLowerCase();
    if(txt) filtrados = filtrados.filter(i => 
        i.pieza.toLowerCase().includes(txt) || i.tecnico.toLowerCase().includes(txt) ||
        i.origen.toLowerCase().includes(txt) || (i.cliente||'').toLowerCase().includes(txt)
    );
    
    filtrados.sort((a,b) => new Date(b.fecha||0) - new Date(a.fecha||0));
    
    if(!filtrados.length) { cont.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No hay piezas en este filtro.</div>`; return; }
    
    // Resumen por estado
    const pend = items.filter(i => ['solicitada','pendiente','extra_pendiente','aprobada'].includes(i.estado)).length;
    const entr = items.filter(i => ['entregada','recibida'].includes(i.estado)).length;
    
    const etiqEstado = (e) => {
        const map = {
            solicitada:['🟡 Solicitada','#d97706'], pendiente:['🟡 Pendiente','#d97706'],
            entregada:['📦 Entregada','#0891b2'], aprobada:['✅ Aprobada','#16a34a'],
            recibida:['✅ Recibida','#16a34a'], devuelta:['↩️ Devuelta','#64748b'],
            extra_pendiente:['⏳ Extra pendiente','#9a3412'], rechazada:['❌ Rechazada','#dc2626']
        };
        const [txt, col] = map[e] || [e, '#64748b'];
        return `<span style="background:${col}22; color:${col}; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">${txt}</span>`;
    };
    
    cont.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:10px; font-size:12px;">
            <span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:8px; font-weight:700;">🟡 ${pend} pendientes</span>
            <span style="background:#dbeafe; color:#1e40af; padding:4px 10px; border-radius:8px; font-weight:700;">📦 ${entr} entregadas/recibidas</span>
        </div>
        <div style="overflow-x:auto;"><table class="data-table" style="width:100%; font-size:13px;">
            <thead><tr><th>Pieza</th><th>Cant</th><th>Origen</th><th>Técnico</th><th>Tipo</th><th>Estado</th></tr></thead>
            <tbody>${filtrados.map(i => `<tr>
                <td style="font-weight:600;">${escapeHtml(i.pieza)}</td>
                <td>${i.cantidad}</td>
                <td style="font-size:12px;">${escapeHtml(i.origen)}${i.cliente ? ' · ' + escapeHtml(i.cliente) : ''}</td>
                <td style="font-size:12px;">${escapeHtml(i.tecnico)}</td>
                <td><span style="background:${i.color}22; color:${i.color}; font-size:10px; padding:2px 7px; border-radius:8px;">${i.tipo}</span></td>
                <td>${etiqEstado(i.estado)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${filtrados.length} pieza(s)</div>`;
}

// Lista de recepciones realizadas (con buscador y filtro de fecha) en el módulo Recepción
let _recepFechaFiltro = 0;
function renderRecepcionesRealizadas() {
    const cont = document.getElementById('recepcionesLista');
    if(!cont) return;
    let ordenes = (cache.ordenes || []).slice();
    // Filtro de fecha
    if(_recepFechaFiltro > 0) ordenes = ordenes.filter(o => diasDesde(o.creado_en) < _recepFechaFiltro);
    // Buscador
    const txt = (document.getElementById('recepBuscador')?.value || '').trim().toLowerCase();
    if(txt) {
        ordenes = ordenes.filter(o => {
            const c = findCliente(o.cliente_id);
            return formatoOrden(o.numero_orden).toLowerCase().includes(txt) || (c.nombre || '').toLowerCase().includes(txt);
        });
    }
    // Ordenar por fecha de recepción (más reciente primero)
    ordenes.sort((a,b) => new Date(b.creado_en||0) - new Date(a.creado_en||0));
    if(!ordenes.length) { cont.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No hay recepciones en este filtro.</div>`; return; }
    
    cont.innerHTML = `<div style="overflow-x:auto;"><table class="data-table" style="width:100%; font-size:13px;">
        <thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${ordenes.slice(0, 100).map(o => {
            const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
            const fecha = o.creado_en ? new Date(o.creado_en).toLocaleDateString('es-DO',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
            const est = etiquetaEstadoTexto(o.estado);
            const estadoN = normalizarEstadoOrden(o.estado);
            let accionHtml;
            if(estadoN === 'entregado') {
                // Entregada: cerrada pero se puede reabrir con concepto libre
                accionHtml = `<button class="btn btn-light" style="font-size:11px; padding:4px 9px; color:#6b21a8;" onclick="reabrirOrden('${o.id}','otra')"><i class="ti ti-rotate-clockwise"></i> Reabrir</button>`;
            } else if(estadoN === 'cancelado') {
                // Cancelada: cerrada definitivo
                accionHtml = `<span style="font-size:11px; color:#94a3b8;">Cerrada</span>`;
            } else {
                // Activa: editar
                accionHtml = `<button class="btn btn-light" style="font-size:11px; padding:4px 9px; color:#6b21a8;" onclick="abrirEditarRecepcion('${o.id}')"><i class="ti ti-edit"></i> Editar</button>`;
            }
            return `<tr>
                <td style="font-weight:700;">${formatoOrden(o.numero_orden)}</td>
                <td style="white-space:nowrap; font-size:12px;">${fecha}</td>
                <td>${escapeHtml(c.nombre || '—')}</td>
                <td style="font-size:12px;">${escapeHtml(e.marca||'')} ${escapeHtml(e.modelo||'')}</td>
                <td style="font-size:11px; color:#0891b2;">${est}</td>
                <td>${accionHtml}</td>
            </tr>`;
        }).join('')}</tbody>
    </table></div>
    <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${ordenes.length} recepción(es)${ordenes.length > 100 ? ' (mostrando 100)' : ''}</div>`;
}

// Editar datos de recepción de una orden (corrige errores de captura)
function abrirEditarRecepcion(ordenId) {
    const o = (cache.ordenes || []).find(x => x.id === ordenId);
    if(!o) return;
    // Permiso: solo admin o servicio (recepcion_ver). El técnico NO puede editar datos.
    if(!isAdminUser() && !tienePermiso('recepcion_ver')) {
        return alert('Solo el administrador o servicio al cliente pueden editar los datos de recepción.');
    }
    const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
    const contenido = `
        <div style="max-height:70vh; overflow-y:auto;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Corrige los datos que se capturaron mal en la recepción.</div>
            <label style="font-size:12px; font-weight:600;">Cliente (nombre)</label>
            <input id="ed_cliente" value="${escapeHtml(c.nombre || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">
            <label style="font-size:12px; font-weight:600;">Teléfono</label>
            <input id="ed_telefono" value="${escapeHtml(c.telefono || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">
            <div style="display:flex; gap:8px;">
                <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Marca</label>
                    <input id="ed_marca" value="${escapeHtml(e.marca || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;"></div>
                <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Modelo</label>
                    <input id="ed_modelo" value="${escapeHtml(e.modelo || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;"></div>
            </div>
            <div style="display:flex; gap:8px;">
                <div style="flex:1;"><label style="font-size:12px; font-weight:600;">Capacidad</label>
                    <input id="ed_capacidad" value="${escapeHtml(e.capacidad || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;"></div>
                <div style="flex:1;"><label style="font-size:12px; font-weight:600;">IMEI</label>
                    <input id="ed_imei" value="${escapeHtml(e.imei || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;"></div>
            </div>
            <label style="font-size:12px; font-weight:600;">Estado físico (cómo llegó)</label>
            <textarea id="ed_fisico" rows="2" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">${escapeHtml(o.condicion_fisica || '')}</textarea>
            <label style="font-size:12px; font-weight:600;">Falla reportada</label>
            <textarea id="ed_falla" rows="2" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">${escapeHtml(o.falla_reportada || '')}</textarea>
            <label style="font-size:12px; font-weight:600;">Accesorios recibidos</label>
            <input id="ed_accesorios" value="${escapeHtml(o.accesorios_recibidos || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">
            <label style="font-size:12px; font-weight:600;">Clave / patrón del equipo</label>
            <input id="ed_clave" value="${escapeHtml(o.clave_equipo || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin:3px 0 10px; font-size:13px;">
            
            <div style="border-top:2px dashed #cbd5e1; margin:12px 0 10px; padding-top:10px;">
                <label style="font-size:13px; font-weight:700; color:#0891b2;"><i class="ti ti-list-check"></i> Fallas / Problemas a reparar</label>
                <div style="font-size:11px; color:var(--text-muted); margin:6px 0 4px;">Marca los problemas que reporta el cliente:</div>
                <div id="ed_checksFallas" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:4px; margin-bottom:8px;">
                    ${construirChecklistFallasEdit(o.id)}
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin:6px 0 4px;">Fallas registradas (puedes quitarlas):</div>
                <div id="ed_listaFallas" style="margin:4px 0;">${construirListaFallasEditable(o.id)}</div>
                <div style="display:flex; gap:6px;">
                    <input id="ed_nuevaFalla" placeholder="Otra falla (texto libre)" style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;" onkeydown="if(event.key==='Enter'){event.preventDefault();agregarFallaEnEdicion('${o.id}');}">
                    <button onclick="agregarFallaEnEdicion('${o.id}')" class="btn btn-blue" style="font-size:12px; padding:8px 12px;"><i class="ti ti-plus"></i> Agregar</button>
                </div>
            </div>
            
            <button onclick="guardarEditarRecepcion('${o.id}','${o.cliente_id}','${o.equipo_id}')" class="btn btn-blue" style="width:100%; padding:10px; margin-top:6px;"><i class="ti ti-device-floppy"></i> Guardar cambios</button>
        </div>`;
    abrirModalGenerico('✏️ Editar datos de recepción · ' + formatoOrden(o.numero_orden), contenido);
}

// Checklist de fallas comunes en el modal de edición (marcadas = ya existen como tarea)
// Lista por defecto de fallas comunes (si la tabla está vacía)
const FALLAS_COMUNES_DEFAULT = ['Pantalla rota','Mojado','Tapa rota','No enciende','Sin señal','Batería mala','Cámara rota','Puerto malo'];
// Devuelve la lista actual de fallas comunes (de la tabla si hay, si no las default)
function obtenerFallasComunes() {
    const t = (cache.fallasComunes || []).filter(f => f.activo !== false);
    if(t.length) return t.map(f => f.nombre);
    return FALLAS_COMUNES_DEFAULT;
}
// Llena el checklist de recepción con las fallas comunes de la tabla
function refrescarChecklistRecepcion() {
    const cont = document.getElementById('checksFisico');
    if(!cont) return;
    const fallas = obtenerFallasComunes();
    cont.innerHTML = fallas.map(f => `<label><input type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join('');
    // Mostrar botón editar solo a admin
    const btn = document.getElementById('btnEditarFallasComunes');
    if(btn) btn.style.display = isAdminUser() ? 'inline-flex' : 'none';
}

// Editor de fallas comunes (admin): editar, agregar, quitar
function abrirEditorFallasComunes() {
    if(!isAdminUser()) return alert('Solo el administrador puede editar las fallas comunes.');
    const fallas = (cache.fallasComunes || []).filter(f => f.activo !== false).sort((a,b) => (a.orden||0)-(b.orden||0));
    let filas;
    if(!fallas.length) {
        // Si la tabla está vacía, mostrar las default como referencia
        filas = `<div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">La tabla está vacía. Corre el SQL primero, o agrega fallas abajo.</div>`;
    } else {
        filas = fallas.map(f => `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:5px;">
                <input id="fc_${f.id}" value="${escapeHtml(f.nombre)}" style="flex:1; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                <button onclick="guardarNombreFalla('${f.id}')" style="background:#dcfce7; color:#166534; border:0; padding:6px 9px; border-radius:6px; cursor:pointer;" title="Guardar"><i class="ti ti-check"></i></button>
                <button onclick="quitarFallaComun('${f.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:6px 9px; border-radius:6px; cursor:pointer;" title="Quitar"><i class="ti ti-trash"></i></button>
            </div>`).join('');
    }
    const contenido = `
        <div style="margin-bottom:10px;">${filas}</div>
        <div style="display:flex; gap:6px; border-top:1px dashed #cbd5e1; padding-top:10px;">
            <input id="fc_nueva" placeholder="Nueva falla común" style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;" onkeydown="if(event.key==='Enter'){event.preventDefault();agregarFallaComunNueva();}">
            <button onclick="agregarFallaComunNueva()" class="btn btn-blue" style="font-size:12px; padding:8px 12px;"><i class="ti ti-plus"></i> Agregar</button>
        </div>`;
    abrirModalGenerico('⚙️ Editar Fallas Comunes', contenido);
}

async function guardarNombreFalla(id) {
    const nuevo = (document.getElementById('fc_' + id)?.value || '').trim();
    if(!nuevo) return alert('El nombre no puede estar vacío.');
    try {
        await supabaseClient.from('fallas_comunes').update({ nombre: nuevo }).eq('id', id);
        await recargarFallasComunes();
        toast('✅ Falla actualizada.');
    } catch(e) { logError('Guardar falla común', e); alert(getFriendlyError(e)); }
}

async function quitarFallaComun(id) {
    if(!confirm('¿Quitar esta falla común de la lista?')) return;
    try {
        await supabaseClient.from('fallas_comunes').delete().eq('id', id);
        await recargarFallasComunes();
        abrirEditorFallasComunes(); // refrescar el modal
        toast('Falla quitada.');
    } catch(e) { logError('Quitar falla común', e); alert(getFriendlyError(e)); }
}

async function agregarFallaComunNueva() {
    const inp = document.getElementById('fc_nueva');
    const nombre = (inp?.value || '').trim();
    if(!nombre) return;
    try {
        const maxOrden = Math.max(0, ...(cache.fallasComunes || []).map(f => f.orden || 0));
        await supabaseClient.from('fallas_comunes').insert([{ nombre, orden: maxOrden + 1, activo: true }]);
        if(inp) inp.value = '';
        await recargarFallasComunes();
        abrirEditorFallasComunes(); // refrescar el modal
        toast('✅ Falla agregada.');
    } catch(e) { logError('Agregar falla común', e); alert(getFriendlyError(e)); }
}

async function recargarFallasComunes() {
    const { data } = await supabaseClient.from('fallas_comunes').select('*').order('orden', { ascending: true });
    cache.fallasComunes = data || cache.fallasComunes;
    refrescarChecklistRecepcion();
}

// Llena el checklist de recepción con las fallas comunes de la tabla
function construirChecklistFallasEdit(ordenId) {
    const existentes = (cache.tareas || [])
        .filter(t => t.tipo === 'orden' && t.ref_id === ordenId)
        .map(t => (t.descripcion || '').trim().toLowerCase());
    return obtenerFallasComunes().map(f => {
        const marcada = existentes.includes(f.toLowerCase());
        return `<label style="display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; padding:3px;">
            <input type="checkbox" ${marcada ? 'checked' : ''} onchange="toggleFallaComun('${ordenId}', this.value, this.checked)" value="${escapeHtml(f)}"> ${escapeHtml(f)}
        </label>`;
    }).join('');
}

// Al marcar/desmarcar una falla común: la agrega o la quita
async function toggleFallaComun(ordenId, falla, marcada) {
    try {
        if(marcada) {
            // Agregar si no existe
            const yaExiste = (cache.tareas || []).some(t => t.tipo === 'orden' && t.ref_id === ordenId && (t.descripcion||'').trim().toLowerCase() === falla.toLowerCase());
            if(!yaExiste) {
                await supabaseClient.from('tareas_trabajo').insert([{ tipo:'orden', ref_id:ordenId, descripcion:falla, estado:'pendiente', creado_por: sessionUser?.nombre || 'Servicio' }]);
            }
        } else {
            // Quitar la tarea con esa descripción (si no está hecha)
            const tarea = (cache.tareas || []).find(t => t.tipo === 'orden' && t.ref_id === ordenId && (t.descripcion||'').trim().toLowerCase() === falla.toLowerCase());
            if(tarea) {
                if(tarea.estado === 'hecha') { alert('Esa falla ya fue resuelta, no se puede quitar.'); construirChecklistRefrescar(ordenId); return; }
                await supabaseClient.from('tareas_trabajo').delete().eq('id', tarea.id);
            }
        }
        const { data } = await supabaseClient.from('tareas_trabajo').select('*');
        cache.tareas = data || cache.tareas;
        construirChecklistRefrescar(ordenId);
    } catch(e) { logError('Toggle falla común', e); alert(getFriendlyError(e)); }
}
function construirChecklistRefrescar(ordenId) {
    const chk = document.getElementById('ed_checksFallas');
    if(chk) chk.innerHTML = construirChecklistFallasEdit(ordenId);
    const lista = document.getElementById('ed_listaFallas');
    if(lista) lista.innerHTML = construirListaFallasEditable(ordenId);
}

// Construye la lista editable de fallas (tareas) de una orden, dentro del modal de edición
function construirListaFallasEditable(ordenId) {
    const fallas = (cache.tareas || []).filter(t => t.tipo === 'orden' && t.ref_id === ordenId);
    if(!fallas.length) return `<div style="font-size:12px; color:var(--text-muted);">Sin fallas registradas. Agrega una abajo.</div>`;
    return fallas.map(t => {
        const hecha = t.estado === 'hecha';
        return `<div style="display:flex; align-items:center; gap:6px; padding:5px 8px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:4px;">
            <span style="flex:1; font-size:12px; ${hecha ? 'text-decoration:line-through; color:#16a34a;' : ''}">${escapeHtml(t.descripcion)}${hecha ? ' ✓' : ''}</span>
            <button onclick="quitarFallaEnEdicion('${t.id}','${ordenId}')" style="background:#fee2e2; color:#991b1b; border:0; padding:4px 7px; border-radius:5px; cursor:pointer; font-size:11px;" title="Quitar"><i class="ti ti-trash"></i></button>
        </div>`;
    }).join('');
}

// Agrega una falla nueva durante la edición
async function agregarFallaEnEdicion(ordenId) {
    const inp = document.getElementById('ed_nuevaFalla');
    const desc = (inp?.value || '').trim();
    if(!desc) return;
    try {
        await supabaseClient.from('tareas_trabajo').insert([{
            tipo: 'orden', ref_id: ordenId, descripcion: desc, estado: 'pendiente',
            creado_por: sessionUser?.nombre || 'Servicio'
        }]);
        if(inp) inp.value = '';
        // Refrescar el cache de tareas y la lista del modal
        const { data } = await supabaseClient.from('tareas_trabajo').select('*');
        cache.tareas = data || cache.tareas;
        construirChecklistRefrescar(ordenId);
    } catch(e) { logError('Agregar falla edición', e); alert(getFriendlyError(e)); }
}

// Quita (elimina) una falla durante la edición
async function quitarFallaEnEdicion(tareaId, ordenId) {
    if(!confirm('¿Quitar esta falla?')) return;
    try {
        await supabaseClient.from('tareas_trabajo').delete().eq('id', tareaId);
        const { data } = await supabaseClient.from('tareas_trabajo').select('*');
        cache.tareas = data || cache.tareas;
        construirChecklistRefrescar(ordenId);
    } catch(e) { logError('Quitar falla edición', e); alert(getFriendlyError(e)); }
}

async function guardarEditarRecepcion(ordenId, clienteId, equipoId) {
    try {
        const g = id => (document.getElementById(id)?.value || '').trim();
        // Actualizar cliente
        await supabaseClient.from('clientes').update({ nombre: g('ed_cliente'), telefono: g('ed_telefono') }).eq('id', clienteId);
        // Actualizar equipo
        await supabaseClient.from('equipos').update({ marca: g('ed_marca'), modelo: g('ed_modelo'), capacidad: g('ed_capacidad'), imei: g('ed_imei') }).eq('id', equipoId);
        // Actualizar orden
        await supabaseClient.from('ordenes_reparacion').update({
            condicion_fisica: g('ed_fisico'), falla_reportada: g('ed_falla'),
            accesorios_recibidos: g('ed_accesorios'), clave_equipo: g('ed_clave')
        }).eq('id', ordenId);
        toast('✅ Datos de recepción actualizados.');
        document.getElementById('modalGenerico')?.remove();
        await loadAll();
    } catch(e) { logError('Editar recepción', e); alert(getFriendlyError(e)); }
}

// Editar datos de recepción de una orden (corrige errores de captura)
function construirCardOrden(o, esAdmin, miId, tecnicosActivos, modoServicio) {
        const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
        const estado = normalizarEstadoOrden(o.estado);
        const et = obtenerEtiquetaOrden(estado);
        const tecnico = o.tecnico_asignado_id ? nombreEmpleado(o.tecnico_asignado_id) : null;
        const esMia = o.tecnico_asignado_id === miId;
        // Servicio al cliente NO opera como técnico (no toma ni repara), pero sí asigna/entrega/reabre
        const esServicio = modoServicio && !esAdmin;
        const puedeOperar = (esAdmin || esMia) && !esServicio;
        const numOrden = formatoOrden(o.numero_orden);
        
        // Botones de acción según estado
        let acciones = '';
        if(!o.tecnico_asignado_id && estado !== 'cancelado' && estado !== 'entregado') {
            // Sin técnico: tomar (solo técnicos/admin, NO servicio) o asignar (admin y servicio)
            if(!esServicio) {
                acciones += `<button class="btn btn-blue" style="font-size:12px; padding:6px 12px;" onclick="tomarOrden('${o.id}')"><i class="ti ti-hand-grab"></i> Tomar orden</button>`;
            }
            if((esAdmin || esServicio) && tecnicosActivos.length) {
                acciones += `<select onchange="if(this.value)asignarOrdenTecnico('${o.id}', this.value)" style="font-size:12px; padding:6px;"><option value="">Asignar a un técnico…</option>${tecnicosActivos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')}</select>`;
            }
        } else if(puedeOperar && !['entregado','cancelado','finalizado'].includes(estado)) {
            // Estados de espera: RESOLVER (vuelve a en proceso) + opción de finalizar directo
            if(estado === 'pendiente_cliente') {
                acciones += `<button class="btn btn-blue" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','en_proceso')"><i class="ti ti-check"></i> Autorización resuelta</button>`;
                acciones += `<button class="btn btn-success" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','finalizado')"><i class="ti ti-circle-check"></i> Finalizar</button>`;
            } else if(estado === 'espera_repuesto') {
                acciones += `<button class="btn btn-blue" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','en_proceso')"><i class="ti ti-check"></i> Repuesto llegó</button>`;
                acciones += `<button class="btn btn-success" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','finalizado')"><i class="ti ti-circle-check"></i> Finalizar</button>`;
            } else {
                // EN PROCESO (o recibido): mostrar todas las opciones útiles
                acciones += `<button class="btn btn-success" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','finalizado')"><i class="ti ti-circle-check"></i> Finalizar</button>`;
                acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#92400e;" onclick="cambiarEstadoOrdenUI('${o.id}','espera_repuesto')"><i class="ti ti-hourglass"></i> En espera de repuesto</button>`;
                acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#9a3412;" onclick="cambiarEstadoOrdenUI('${o.id}','pendiente_cliente')"><i class="ti ti-bell"></i> Esperando autorización</button>`;
            }
        } else if((esAdmin || esServicio) && estado === 'finalizado') {
            // Orden finalizada: solo servicio al cliente y admin pueden actuar (el técnico no hace nada)
            acciones += `<button class="btn btn-blue" style="font-size:12px; padding:6px 12px;" onclick="marcarEntregadoConGarantia('${o.id}')"><i class="ti ti-package"></i> Marcar Entregado</button>`;
            // Volver a proceso solo admin (corrección de errores)
            if(esAdmin) acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px;" onclick="cambiarEstadoOrdenUI('${o.id}','en_proceso')"><i class="ti ti-rotate"></i> Volver a proceso</button>`;
        } else if(estado === 'finalizado') {
            // Técnico viendo una orden finalizada: solo informativo, no puede hacer nada
            acciones += `<span class="badge" style="background:#dcfce7; color:#166534; font-size:11px;">✓ Finalizada · esperando entrega</span>`;
        } else if(estado === 'entregado') {
            // Reabrir por garantía (si está dentro del plazo) — solo admin/servicio
            const puedeReabrir = esAdmin || tienePermiso('recepcion_ver');
            const info = infoGarantiaOrden(o);
            if(puedeReabrir) {
                if(info.vigente) {
                    acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#0369a1;" onclick="reabrirPorGarantia('${o.id}')"><i class="ti ti-shield-check"></i> Reabrir por garantía (${info.diasRestantes}d)</button>`;
                } else if(info.tieneGarantia) {
                    acciones += `<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:10px;">Garantía vencida</span>`;
                }
                // Reabrir por otra razón (siempre disponible para admin/servicio)
                acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#6b21a8;" onclick="reabrirOrden('${o.id}','otra')"><i class="ti ti-rotate-clockwise"></i> Reabrir (otra razón)</button>`;
            }
        }
        // Cancelar: SOLO servicio al cliente y admin (técnico NO puede cancelar)
        if((esAdmin || esServicio) && !['entregado','cancelado','finalizado'].includes(estado)) {
            acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#991b1b;" onclick="cambiarEstadoOrdenUI('${o.id}','cancelado')"><i class="ti ti-x"></i> Cancelar</button>`;
        }
        // Derivar a otro técnico (solo si está tomada y en proceso)
        if((esAdmin || esMia) && o.tecnico_asignado_id && !['entregado','cancelado','finalizado'].includes(estado)) {
            acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#6b21a8;" onclick="derivarOrden('${o.id}')"><i class="ti ti-arrows-exchange"></i> Derivar</button>`;
        }
        // Label de diagnóstico (con las fallas) — útil para el técnico
        acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px;" onclick="cargarEnLabel('${o.id}')"><i class="ti ti-clipboard-list"></i> Label</button>`;
        // Ver historial del cliente (admin y servicio)
        if((esAdmin || (typeof tienePermiso === 'function' && tienePermiso('recepcion_ver'))) && o.cliente_id) {
            acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#0891b2;" onclick="verHistorialCliente('${o.cliente_id}')"><i class="ti ti-history"></i> Historial cliente</button>`;
        }
        // Editar datos de recepción: SOLO servicio al cliente y admin (técnico NO)
        if((esAdmin || esServicio) && !['entregado','cancelado'].includes(estado)) {
            acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#6b21a8;" onclick="abrirEditarRecepcion('${o.id}')"><i class="ti ti-edit"></i> Editar datos</button>`;
        }
        // Solicitar pieza: si está tomada y activa, O en garantía (entregado pero con garantía vigente)
        const enGarantiaVigente = estado === 'entregado' && infoGarantiaOrden(o).vigente;
        if((esAdmin || esMia) && o.tecnico_asignado_id && (!['entregado','cancelado'].includes(estado) || enGarantiaVigente)) {
            const txtBtn = enGarantiaVigente ? 'Solicitar pieza (garantía)' : 'Solicitar pieza';
            acciones += `<button class="btn btn-light" style="font-size:11px; padding:5px 9px; color:#0e7490;" onclick="solicitarPiezaOrden('${o.id}')"><i class="ti ti-package-import"></i> ${txtBtn}</button>`;
        }
        
        // Piezas de esta orden
        const piezasOrden = (cache.ordenPiezas || []).filter(p => p.orden_id === o.id);
        let piezasHtml = '';
        if(piezasOrden.length) {
            piezasHtml = `<div style="margin-top:8px; border-top:1px dashed var(--border-color); padding-top:6px;">
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;"><i class="ti ti-packages"></i> PIEZAS ADICIONALES:</div>
                ${piezasOrden.map(p => {
                    const ep = etiquetaPiezaOrden(p.estado);
                    let btn = '';
                    // Servicio entrega; técnico recibe
                    if(p.estado === 'solicitada') {
                        btn = `<button class="btn btn-light" style="font-size:10px; padding:3px 7px; color:#1e40af;" onclick="entregarPiezaOrden('${p.id}')">Marcar entregada</button>`;
                    } else if(p.estado === 'entregada' && (esAdmin || p.tecnico_id === sessionUser?.id)) {
                        btn = `<button class="btn btn-light" style="font-size:10px; padding:3px 7px; color:#065f46;" onclick="recibirPiezaOrden('${p.id}')">Confirmar recibida</button>`;
                    } else if(p.estado === 'recibida' && (esAdmin || p.tecnico_id === sessionUser?.id)) {
                        // El técnico puede devolver la pieza que no usó
                        btn = `<button class="btn btn-light" style="font-size:10px; padding:3px 7px; color:#9a3412;" onclick="devolverPiezaOrden('${p.id}')"><i class="ti ti-arrow-back-up"></i> Devolver</button>`;
                    } else if(p.estado === 'devolucion_solicitada') {
                        // Servicio confirma la devolución
                        btn = `<button class="btn btn-light" style="font-size:10px; padding:3px 7px; color:#475569;" onclick="confirmarDevolucionPiezaOrden('${p.id}')">Confirmar devolución</button>`;
                    }
                    return `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:3px; font-size:12px;">
                        <span>${escapeHtml(p.pieza_nombre)} ${p.cantidad > 1 ? '×' + p.cantidad : ''}</span>
                        <span class="badge" style="background:${ep.bg}; color:${ep.color}; font-size:10px;">${ep.text}</span>
                        ${btn}
                    </div>`;
                }).join('')}
            </div>`;
        }
        
        // Tareas de esta orden (sistema genérico, tipo='orden')
        const tareasOrden = (cache.tareas || []).filter(t => t.tipo === 'orden' && t.ref_id === o.id);
        // Cerrada si entregada/cancelada. Servicio puede AGREGAR fallas pero no resolverlas (soloAgregar)
        const ordenCerrada = ['entregado','cancelado'].includes(estado);
        const tareasHtml = construirSeccionTareas('orden', o.id, tareasOrden, ordenCerrada, esServicio);
        
        return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:7px; padding:8px 10px; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
                <div style="flex:1; min-width:200px;">
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        <b style="font-size:13px;">${numOrden}</b>
                        <span class="badge" style="background:${et.bg}; color:${et.color}; font-size:10px; padding:1px 7px;">${et.text}</span>
                        ${tecnico ? `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:10px; padding:1px 7px;"><i class="ti ti-tool"></i> ${escapeHtml(tecnico)}</span>` : '<span class="badge" style="background:#f1f5f9; color:#94a3b8; font-size:10px; padding:1px 7px;">Sin tomar</span>'}
                        ${o.tecnico_anterior_id ? `<span class="badge" style="background:#f3e8ff; color:#6b21a8; font-size:10px; padding:1px 7px;"><i class="ti ti-arrows-exchange"></i> Derivada</span>` : ''}
                        ${o.es_garantia ? `<span class="badge" style="background:#dbeafe; color:#0369a1; font-size:10px; padding:1px 7px;"><i class="ti ti-shield-check"></i> GARANTÍA${o.veces_garantia > 1 ? ' ×' + o.veces_garantia : ''}</span>` : ''}
                    </div>
                    <div style="font-size:12px; margin-top:4px;"><b>${escapeHtml(c.nombre || '—')}</b> · ${escapeHtml(e.marca || '')} ${escapeHtml(e.modelo || '')}</div>
                    ${o.condicion_fisica && o.condicion_fisica !== 'Sin marcas' ? `<div style="font-size:10px; color:#7c3aed; margin-top:1px;"><i class="ti ti-note"></i> Estado físico: ${escapeHtml(o.condicion_fisica)}</div>` : ''}
                    <div style="font-size:10px; color:#94a3b8; margin-top:1px;"><i class="ti ti-clock"></i> Recibido: ${o.creado_en ? new Date(o.creado_en).toLocaleString('es-DO', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                    ${o.tecnico_asignado_id && o.fecha_asignacion ? `<div style="font-size:10px; color:#0891b2; font-weight:600; margin-top:1px;"><i class="ti ti-stopwatch"></i> Tomada: ${tiempoDesde(o.fecha_asignacion)}</div>` : ''}
                    ${o.nota_estado ? (estado === 'pendiente_cliente'
                        ? `<div style="background:#fef2f2; border:2px solid #f87171; padding:6px 8px; border-radius:6px; margin-top:5px; font-size:12px;"><b style="color:#b91c1c;"><i class="ti ti-bell-ringing"></i> REQUIERE AUTORIZACIÓN:</b><br><span style="color:#7f1d1d;">${escapeHtml(o.nota_estado)}</span></div>`
                        : `<div style="background:#fef9c3; border:1px solid #fde047; padding:4px 7px; border-radius:5px; margin-top:5px; font-size:11px;"><i class="ti ti-info-circle"></i> ${escapeHtml(o.nota_estado)}</div>`)
                      : ''}
                    ${piezasHtml}
                    ${tareasHtml}
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; align-items:stretch; min-width:140px;" class="acciones-verticales">
                    <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;"><i class="ti ti-settings"></i> Estado del Equipo</div>
                    <div style="background:${et.bg}; color:${et.color}; border:2px solid ${et.color}; padding:5px 9px; border-radius:7px; font-size:11px; font-weight:700; text-align:center;"><i class="ti ti-circle-dot"></i> ${et.text}</div>
                    ${acciones}
                </div>
            </div>
        </div>`;
}

// Detecta piezas "no utilizadas": el técnico las tiene pero el equipo ya terminó, o nunca las confirmó.
function detectarPiezasNoUtilizadas(soloTecnicoId) {
    let piezas = (cache.piezasReacond || []);
    if(soloTecnicoId) {
        const misEquipos = new Set((cache.refurb || []).filter(e => e.tecnico_asignado_id === soloTecnicoId).map(e => e.id));
        piezas = piezas.filter(p => misEquipos.has(p.equipo_id));
    }
    const terminados = ['listo_venta', 'vendido'];
    return piezas.filter(p => {
        const eq = (cache.refurb || []).find(e => e.id === p.equipo_id);
        if(!eq) return false;
        const equipoTerminado = terminados.includes(eq.estado_evaluacion);
        // Caso A: tiene la pieza (entregada o en uso) y el equipo ya terminó → sobrante
        const tieneYTermino = ['entregada','recibida'].includes(p.estado) && equipoTerminado;
        // Caso B: entregada pero nunca confirmada (limbo), sin importar estado del equipo
        const entregadaSinConfirmar = p.estado === 'entregada';
        return tieneYTermino || entregadaSinConfirmar;
    });
}

// Construye la alerta de piezas no utilizadas
function construirAlertaPiezasNoUsadas(soloTecnicoId) {
    const noUsadas = detectarPiezasNoUtilizadas(soloTecnicoId);
    if(!noUsadas.length) return '';
    const filas = noUsadas.map(p => {
        const eq = (cache.refurb || []).find(e => e.id === p.equipo_id) || {};
        const et = etiquetaEstadoPiezaReacond(p.estado);
        const tecNombre = eq.tecnico_asignado_id ? nombreEmpleado(eq.tecnico_asignado_id) : 'Sin asignar';
        const equipoTerminado = ['listo_venta','vendido'].includes(eq.estado_evaluacion);
        const motivo = equipoTerminado ? 'Equipo terminado, pieza no devuelta' : 'Entregada sin confirmar';
        return `<tr>
            <td style="font-weight:600;">${escapeHtml(p.pieza_nombre || '—')}</td>
            <td style="text-align:center;">${p.cantidad || 1}</td>
            <td>${escapeHtml(eq.marca || '')} ${escapeHtml(eq.modelo || '')}</td>
            <td style="font-size:12px;">${escapeHtml(tecNombre)}</td>
            <td><span class="badge" style="background:${et.bg}; color:${et.color}; font-size:11px;">${et.txt}</span></td>
            <td style="font-size:11px; color:#9a3412;">${motivo}</td>
        </tr>`;
    }).join('');
    return `
        <div style="background:#fff7ed; border:2px solid #fb923c; border-radius:10px; padding:12px; margin-bottom:15px;">
            <div style="font-weight:700; color:#9a3412; margin-bottom:8px;"><i class="ti ti-alert-triangle"></i> Piezas No Utilizadas (${noUsadas.length}) — requieren revisión</div>
            <div style="font-size:12px; color:#9a3412; margin-bottom:10px;">Estas piezas están en manos de un técnico pero el equipo ya terminó, o no fueron confirmadas. Conviene devolverlas al inventario o confirmar su uso.</div>
            <div style="overflow-x:auto;">
                <table class="data-table" style="width:100%; font-size:13px;">
                    <thead><tr><th>Pieza</th><th style="text-align:center;">Cant.</th><th>Equipo</th><th>Técnico</th><th>Estado</th><th>Motivo</th></tr></thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>`;
}

// ============================================================
//   PANEL DE PEDIDOS DE PIEZAS (reacondicionados)
// ============================================================
function etiquetaEstadoPiezaReacond(estado) {
    const map = {
        'pendiente':            { txt: '🟡 Pedida',        bg:'#fef3c7', color:'#92400e' },
        'solicitada':           { txt: '🟡 Pedida',        bg:'#fef3c7', color:'#92400e' },
        'entregada':            { txt: '📦 Entregada',     bg:'#dbeafe', color:'#1e40af' },
        'recibida':             { txt: '🔧 En uso',        bg:'#dcfce7', color:'#166534' },
        'devolucion_pendiente': { txt: '🔄 Devolución...', bg:'#fed7aa', color:'#9a3412' },
        'devuelta':             { txt: '↩️ Devuelta',      bg:'#f1f5f9', color:'#64748b' },
        'extra':                { txt: '➕ Extra',         bg:'#e9d5ff', color:'#6b21a8' }
    };
    return map[estado] || { txt: estado, bg:'#f1f5f9', color:'#64748b' };
}

// Construye el HTML del panel de pedidos de piezas. Si tecnicoId se pasa, filtra solo ese técnico.
function construirPanelPedidosPiezas(soloTecnicoId) {
    let piezas = (cache.piezasReacond || []);
    if(soloTecnicoId) {
        // filtrar por equipos asignados a ese técnico
        const misEquipos = new Set((cache.refurb || []).filter(e => e.tecnico_asignado_id === soloTecnicoId).map(e => e.id));
        piezas = piezas.filter(p => misEquipos.has(p.equipo_id));
    }
    if(!piezas.length) {
        const alerta = construirAlertaPiezasNoUsadas(soloTecnicoId);
        return alerta + `<div style="color:var(--text-muted); font-size:13px; padding:10px 0;">No hay pedidos de piezas.</div>`;
    }
    // Agrupar por estado para resumen
    const cuenta = {};
    piezas.forEach(p => { cuenta[p.estado] = (cuenta[p.estado] || 0) + 1; });
    const resumenChips = Object.keys(cuenta).map(est => {
        const e = etiquetaEstadoPiezaReacond(est);
        return `<span class="badge" style="background:${e.bg}; color:${e.color}; font-size:11px;">${e.txt}: ${cuenta[est]}</span>`;
    }).join(' ');
    
    const filas = piezas.map(p => {
        const eq = (cache.refurb || []).find(e => e.id === p.equipo_id) || {};
        const et = etiquetaEstadoPiezaReacond(p.estado);
        const tecNombre = eq.tecnico_asignado_id ? nombreEmpleado(eq.tecnico_asignado_id) : 'Sin asignar';
        const invPieza = p.pieza_id ? (cache.piezas || []).find(x => x.id === p.pieza_id) : null;
        const stock = invPieza ? (invPieza.cantidad || 0) : null;
        const stockTxt = stock === null ? '<span style="color:#94a3b8;">—</span>' : `<span style="font-weight:700; color:${stock <= 0 ? '#dc2626' : (stock <= 2 ? '#d97706' : '#16a34a')};">${stock}</span>`;
        return `<tr>
            <td style="font-weight:600;">${escapeHtml(p.pieza_nombre || '—')}</td>
            <td style="text-align:center;">${p.cantidad || 1}</td>
            <td style="text-align:center;">${stockTxt}</td>
            <td>${escapeHtml(eq.marca || '')} ${escapeHtml(eq.modelo || '')}</td>
            <td style="font-size:12px;">${escapeHtml(tecNombre)}</td>
            <td><span class="badge" style="background:${et.bg}; color:${et.color}; font-size:11px;">${et.txt}</span></td>
        </tr>`;
    }).join('');
    
    return `
        ${construirAlertaPiezasNoUsadas(soloTecnicoId)}
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">${resumenChips}</div>
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:13px;">
                <thead><tr>
                    <th>Pieza</th><th style="text-align:center;">Cant.</th><th style="text-align:center;">Stock</th><th>Equipo</th><th>Técnico</th><th>Estado</th>
                </tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}

// Renderiza el panel en la vista de reacondicionados (admin/supervisor: todos)
function renderPedidosPiezasReacond() {
    const cont = document.getElementById('pedidosPiezasReacondCont');
    if(!cont) return;
    cont.innerHTML = construirPanelPedidosPiezas(null);
}

// Muestra una ventana emergente con los pendientes del técnico al iniciar sesión
function mostrarPendientesTecnico() {
    if(!sessionUser || isAdminUser()) return;
    // Solo a técnicos (no a servicio/atención)
    const esTecnico = (sessionUser.tipo_empleado === 'tecnico' || !sessionUser.tipo_empleado) && !tienePermiso('solo_atencion');
    if(!esTecnico) return;
    const miId = sessionUser.id;
    
    const misOrdenes = (cache.ordenes || []).filter(o => o.tecnico_asignado_id === miId && !['entregado','cancelado','finalizado'].includes(normalizarEstadoOrden(o.estado)));
    const misFallas = (cache.tareas || []).filter(t => t.tecnico_id === miId && t.estado !== 'hecha');
    const misPiezas = (cache.piezasReacond || []).filter(p => {
        const eq = (cache.refurb || []).find(r => r.id === p.equipo_id);
        return eq && eq.tecnico_asignado_id === miId && p.estado === 'recibida';
    });
    const disponibles = (cache.ordenes || []).filter(o => !o.tecnico_asignado_id && !['entregado','cancelado'].includes(normalizarEstadoOrden(o.estado)));
    
    const total = misOrdenes.length + misFallas.length + misPiezas.length + disponibles.length;
    if(total === 0) return; // nada que mostrar
    
    const linea = (icon, color, texto, n) => n > 0 ? `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:${color}11; border:1px solid ${color}44; border-radius:10px; margin-bottom:8px;">
            <span style="font-size:22px;">${icon}</span>
            <div style="flex:1;"><strong style="font-size:15px; color:${color};">${n}</strong> <span style="font-size:13px;">${texto}</span></div>
        </div>` : '';
    
    const contenido = `
        <div style="margin-bottom:4px;">
            ${linea('🔧', '#0891b2', misOrdenes.length === 1 ? 'orden activa tuya' : 'órdenes activas tuyas', misOrdenes.length)}
            ${linea('⚠️', '#dc2626', misFallas.length === 1 ? 'falla sin resolver' : 'fallas sin resolver', misFallas.length)}
            ${linea('📦', '#f59e0b', misPiezas.length === 1 ? 'pieza recibida (úsala)' : 'piezas recibidas (úsalas)', misPiezas.length)}
            ${linea('📥', '#8b5cf6', disponibles.length === 1 ? 'orden disponible para tomar' : 'órdenes disponibles para tomar', disponibles.length)}
        </div>
        <div style="display:flex; gap:8px; margin-top:14px;">
            <button onclick="document.getElementById('modalGenerico').remove(); nav('miTrabajo');" class="btn btn-blue" style="flex:1; padding:10px;"><i class="ti ti-briefcase"></i> Ver Mi Trabajo</button>
            <button onclick="document.getElementById('modalGenerico').remove();" class="btn btn-light" style="padding:10px 16px;">Cerrar</button>
        </div>`;
    
    abrirModalGenerico(`🔔 Tus pendientes, ${(sessionUser.nombre || '').split(' ')[0]}`, contenido);
}

// Bloque visual de alertas de equipos demorados
function construirAlertaDemoras(incluirReacond) {
    const ordsDem = ordenesDemoradas();
    const verReacond = incluirReacond && (isAdminUser() || (typeof tienePermiso === 'function' && tienePermiso('refurb_ver')));
    const refDem = verReacond ? reacondDemorados() : [];
    const total = ordsDem.length + refDem.length;
    
    let html = `<div class="card" style="margin-bottom:14px; border-left:4px solid ${total > 0 ? '#ef4444' : '#86efac'};">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <h3 style="font-size:15px; margin:0;"><i class="ti ti-alert-triangle" style="color:${total > 0 ? '#ef4444' : '#16a34a'};"></i> Equipos Demorados (${total})</h3>
            <div style="display:flex; align-items:center; gap:6px; font-size:12px;">
                <span style="color:var(--text-muted);">Avisar tras</span>
                <input type="number" min="1" value="${_diasDemora}" onchange="setDiasDemora(this.value)" style="width:55px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
                <span style="color:var(--text-muted);">días</span>
            </div>
        </div>`;
    
    if(total === 0) {
        html += `<div style="color:#16a34a; font-size:13px;"><i class="ti ti-circle-check"></i> Ningún equipo demorado. ¡Todo al día!</div>`;
    } else {
        const fila = (nombre, detalle, dias, color) => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 10px; border:1px solid #fecaca; background:#fef2f2; border-radius:8px; margin-bottom:5px;">
                <div style="min-width:0;">
                    <div style="font-weight:600; font-size:13px;">${escapeHtml(nombre)}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(detalle)}</div>
                </div>
                <span style="background:${color}; color:#fff; font-size:11px; font-weight:700; padding:3px 9px; border-radius:12px; white-space:nowrap;">${dias} días</span>
            </div>`;
        ordsDem.forEach(o => {
            const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
            const d = diasDesde(o.creado_en);
            html += fila(`${formatoOrden(o.numero_orden)} · ${c.nombre || 'Cliente'}`, `${e.marca||''} ${e.modelo||''} · ${etiquetaEstadoTexto(o.estado)}`, d, d >= _diasDemora*2 ? '#991b1b' : '#ef4444');
        });
        if(verReacond && refDem.length) {
            html += `<div style="font-size:11px; font-weight:700; color:#9a3412; margin:8px 0 4px;">♻️ Reacondicionados demorados</div>`;
            refDem.forEach(eq => {
                const d = diasDesde(eq.creado_en);
                html += fila(`${eq.marca||''} ${eq.modelo||''}`.trim() || 'Equipo', `Reacondicionado · ${(eq.estado_evaluacion||'').replace(/_/g,' ')}`, d, d >= _diasDemora*2 ? '#991b1b' : '#f59e0b');
            });
        }
    }
    html += `</div>`;
    return html;
}

// ============================================================
//   PANEL INTELIGENTE (alertas automáticas + tendencias)
// ============================================================
let _diasPiezaTarda = parseInt(localStorage.getItem('bayol_dias_pieza') || '3', 10);
function setDiasPiezaTarda(n) {
    _diasPiezaTarda = Math.max(1, parseInt(n,10) || 3);
    localStorage.setItem('bayol_dias_pieza', _diasPiezaTarda);
    renderAll();
}

function construirPanelInteligente() {
    // Solo si tiene permiso
    if(!isAdminUser() && !tienePermiso('ver_panel_smart')) return '';
    
    const alertas = [];
    
    // 1. Piezas que tardan en llegar (solicitadas/entregada hace X días, no recibidas) - reacond + órdenes
    const ahora = Date.now();
    (cache.piezasReacond || []).forEach(p => {
        if(['solicitada','pendiente','entregada','aprobada'].includes(p.estado)) {
            const d = diasDesde(p.fecha_entrega || p.creado_en);
            if(d >= _diasPiezaTarda) alertas.push({ icon:'📦', color:'#f59e0b', txt:`Pieza "${p.pieza_nombre || 'pieza'}" pedida hace ${d} días, aún no se confirma recibida` });
        }
    });
    (cache.ordenPiezas || []).forEach(p => {
        if(['solicitada','entregada'].includes(p.estado)) {
            const d = diasDesde(p.creado_en);
            if(d >= _diasPiezaTarda) alertas.push({ icon:'📦', color:'#f59e0b', txt:`Pieza "${p.pieza_nombre || 'pieza'}" (orden) pedida hace ${d} días` });
        }
    });
    
    // 2. Técnico sobrecargado (+5 órdenes activas)
    const carga = {};
    (cache.ordenes || []).forEach(o => {
        if(o.tecnico_asignado_id && !['entregado','cancelado','finalizado'].includes(normalizarEstadoOrden(o.estado))) {
            carga[o.tecnico_asignado_id] = (carga[o.tecnico_asignado_id] || 0) + 1;
        }
    });
    Object.entries(carga).forEach(([tecId, n]) => {
        if(n > 5) alertas.push({ icon:'🔧', color:'#dc2626', txt:`${nombreEmpleado(tecId)} tiene ${n} órdenes activas (sobrecargado)` });
    });
    
    // 3. Cliente esperando autorización +2 días
    (cache.ordenes || []).forEach(o => {
        if(normalizarEstadoOrden(o.estado) === 'pendiente_cliente') {
            const d = diasDesde(o.fecha_derivacion || o.creado_en);
            if(d >= 2) {
                const c = findCliente(o.cliente_id);
                alertas.push({ icon:'🔔', color:'#9a3412', txt:`${c.nombre || 'Cliente'} (${formatoOrden(o.numero_orden)}) lleva ${d} días esperando autorización` });
            }
        }
    });
    
    // === TENDENCIAS ===
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);
    const enRango = (f, ini, fin) => { if(!f) return false; const d = new Date(f); return d >= ini && (!fin || d <= fin); };
    
    const recibMes = (cache.ordenes||[]).filter(o => enRango(o.creado_en, inicioMes)).length;
    const recibMesAnt = (cache.ordenes||[]).filter(o => enRango(o.creado_en, inicioMesAnt, finMesAnt)).length;
    const difRecib = recibMesAnt > 0 ? Math.round(((recibMes - recibMesAnt) / recibMesAnt) * 100) : (recibMes > 0 ? 100 : 0);
    
    // Falla y modelo más frecuente (todo el histórico)
    const fc = {}, mc = {}, dc = {};
    (cache.tareas||[]).forEach(t => { const k=(t.descripcion||'').trim().toLowerCase(); if(k) fc[k]=(fc[k]||0)+1; });
    (cache.ordenes||[]).forEach(o => {
        const e = findEquipo(o.equipo_id); const m = `${e.marca||''} ${e.modelo||''}`.trim(); if(m) mc[m]=(mc[m]||0)+1;
        if(o.creado_en){ const dia = new Date(o.creado_en).toLocaleDateString('es-DO',{weekday:'long'}); dc[dia]=(dc[dia]||0)+1; }
    });
    const top = obj => { const e = Object.entries(obj).sort((a,b)=>b[1]-a[1])[0]; return e ? `${e[0]} (${e[1]})` : '—'; };
    
    // Render
    let html = `<div class="card" style="margin-bottom:15px; background:linear-gradient(135deg,#faf5ff,#eff6ff); border:1px solid #ddd6fe;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <h3 style="margin:0;"><i class="ti ti-bulb" style="color:#7c3aed;"></i> Panel Inteligente</h3>
            <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:5px;">Pieza tarda tras <input type="number" min="1" value="${_diasPiezaTarda}" onchange="setDiasPiezaTarda(this.value)" style="width:48px; padding:3px 5px; border:1px solid #cbd5e1; border-radius:5px; font-size:11px;"> días</div>
        </div>`;
    
    // Alertas
    if(alertas.length) {
        html += `<div style="font-weight:700; font-size:12px; color:#dc2626; margin-bottom:6px;">⚡ ${alertas.length} alerta(s) que requieren atención</div>`;
        html += alertas.slice(0, 10).map(a => `
            <div style="display:flex; align-items:center; gap:8px; padding:7px 10px; background:#fff; border:1px solid ${a.color}33; border-left:3px solid ${a.color}; border-radius:7px; margin-bottom:5px;">
                <span>${a.icon}</span><span style="font-size:12px;">${escapeHtml(a.txt)}</span>
            </div>`).join('');
    } else {
        html += `<div style="color:#16a34a; font-size:13px; margin-bottom:10px;"><i class="ti ti-circle-check"></i> Sin alertas. Todo bajo control.</div>`;
    }
    
    // Tendencias
    const flecha = difRecib > 0 ? `▲ +${difRecib}%` : (difRecib < 0 ? `▼ ${difRecib}%` : '= igual');
    const colorTend = difRecib > 0 ? '#16a34a' : (difRecib < 0 ? '#dc2626' : '#64748b');
    html += `
        <div style="font-weight:700; font-size:12px; color:#7c3aed; margin:12px 0 6px;">📊 Tendencias</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px;">
            <div style="background:#fff; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--text-muted);">Recibidas este mes</div>
                <div style="font-size:20px; font-weight:800;">${recibMes}</div>
                <div style="font-size:11px; color:${colorTend}; font-weight:700;">${flecha} vs mes anterior (${recibMesAnt})</div>
            </div>
            <div style="background:#fff; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--text-muted);">⚠️ Falla más común</div>
                <div style="font-size:14px; font-weight:700; text-transform:capitalize;">${escapeHtml(top(fc))}</div>
            </div>
            <div style="background:#fff; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--text-muted);">📱 Modelo más frecuente</div>
                <div style="font-size:14px; font-weight:700;">${escapeHtml(top(mc))}</div>
            </div>
            <div style="background:#fff; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--text-muted);">📅 Día más ocupado</div>
                <div style="font-size:14px; font-weight:700; text-transform:capitalize;">${escapeHtml(top(dc))}</div>
            </div>
        </div>`;
    html += `</div>`;
    return html;
}

// Etiqueta de texto corta para un estado de orden
function etiquetaEstadoTexto(estado) {
    const e = normalizarEstadoOrden(estado);
    const map = { recibido:'En diagnóstico', en_proceso:'En reparación', espera_repuesto:'Espera pieza', pendiente_cliente:'Esperando autorización', finalizado:'Finalizado', entregado:'Entregado', cancelado:'Cancelado' };
    return map[e] || e;
}

// Historial completo de un cliente (todas sus órdenes)
function verHistorialCliente(clienteId) {
    const c = findCliente(clienteId);
    const ords = (cache.ordenes || []).filter(o => o.cliente_id === clienteId).sort((a,b) => new Date(b.creado_en) - new Date(a.creado_en));
    let html = `<div style="max-height:70vh; overflow-y:auto;">
        <h3 style="margin:0 0 4px;"><i class="ti ti-user"></i> ${escapeHtml(c.nombre || 'Cliente')}</h3>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">${escapeHtml(c.telefono || 'Sin teléfono')} · ${ords.length} orden(es) en total</div>`;
    if(!ords.length) {
        html += `<div style="color:var(--text-muted);">Sin órdenes registradas.</div>`;
    } else {
        html += ords.map(o => {
            const e = findEquipo(o.equipo_id);
            const fecha = o.creado_en ? new Date(o.creado_en).toLocaleDateString('es-DO') : '—';
            const est = etiquetaEstadoTexto(o.estado);
            const esGar = o.es_garantia ? ' 🛡️' : '';
            return `<div style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; gap:6px;">
                    <strong style="font-size:13px;">${formatoOrden(o.numero_orden)}${esGar}</strong>
                    <span style="font-size:11px; color:var(--text-muted);">${fecha}</span>
                </div>
                <div style="font-size:12px;">${e.marca||''} ${e.modelo||''} · ${escapeHtml(o.falla_reportada || 'Sin falla')}</div>
                <div style="font-size:11px; color:#0891b2; margin-top:2px;">${est}</div>
            </div>`;
        }).join('');
    }
    html += `</div>`;
    abrirModalGenerico('Historial del Cliente', html);
}

// Modal genérico simple
function abrirModalGenerico(titulo, contenidoHtml) {
    let modal = document.getElementById('modalGenerico');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'modalGenerico';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:50; display:flex; align-items:center; justify-content:center; padding:16px;';
        modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style="background:#fff; border-radius:12px; padding:18px; max-width:520px; width:100%; max-height:85vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <b style="font-size:16px;">${escapeHtml(titulo)}</b>
            <button onclick="document.getElementById('modalGenerico').remove()" style="background:#fee2e2; color:#991b1b; border:0; width:32px; height:32px; border-radius:8px; cursor:pointer; font-size:16px;">✕</button>
        </div>
        ${contenidoHtml}
    </div>`;
}

// ============================================================
//   ATENCIÓN AL CLIENTE (pantalla de servicio)
// ============================================================
let _atencionTecnicoHist = ''; // técnico seleccionado para el historial (vacío = todos)

function renderAtencionCliente() {
    const esAdmin = isAdminUser();
    const miId = sessionUser?.id;
    const kpisCont = document.getElementById('atencionKpis');
    const cont = document.getElementById('atencionContenido');
    if(!cont) return;
    
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || !t.tipo_empleado));
    const ordenes = (cache.ordenes || []);
    
    // KPIs (sin reacondicionados)
    const hoy = new Date().toDateString();
    const recibidosHoy = ordenes.filter(o => o.creado_en && new Date(o.creado_en).toDateString() === hoy).length;
    const enDiag = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'recibido').length;
    const enRep = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'en_proceso').length;
    const esperaPieza = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'espera_repuesto').length;
    const listos = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'finalizado').length;
    const espAutoriz = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'pendiente_cliente').length;
    
    if(kpisCont) {
        const kpi = (label, val, color, icon) => `<div class="kpi-box" style="border-top-color:${color};"><small>${label}</small><strong>${val}</strong><i class="ti ${icon}"></i></div>`;
        kpisCont.innerHTML = `
            ${kpi('Recibidos Hoy', recibidosHoy, '#3b82f6', 'ti-download')}
            ${kpi('En Diagnóstico', enDiag, '#f59e0b', 'ti-search')}
            ${kpi('En Reparación', enRep, '#10b981', 'ti-settings')}
            ${kpi('Espera Pieza', esperaPieza, '#ef4444', 'ti-hourglass')}
            ${kpi('Listos Entrega', listos, '#8b5cf6', 'ti-circle-check')}
        `;
    }
    
    let html = '';
    
    // SECCIÓN: Alertas de equipos demorados (con reacond si tiene permiso)
    html += construirAlertaDemoras(true);
    
    // SECCIÓN: Buscar historial de cliente
    html += `<div class="card" style="margin-bottom:14px;">
        <h3 style="font-size:15px; margin:0 0 10px;"><i class="ti ti-user-search" style="color:#0891b2;"></i> Buscar Historial de Cliente</h3>
        <input id="atencionBuscarCliente" oninput="renderAtencionClientesBusqueda()" placeholder="🔍 Nombre o teléfono del cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
        <div id="atencionClientesResultado" style="margin-top:8px;"></div>
    </div>`;
    const paraEntregar = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'finalizado');
    html += `<div class="card" style="margin-bottom:14px;">
        <h3 style="font-size:15px; margin:0 0 10px;"><i class="ti ti-circle-check" style="color:#8b5cf6;"></i> Listas para Entregar (${paraEntregar.length})</h3>`;
    if(paraEntregar.length) {
        html += paraEntregar.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos, true)).join('');
    } else {
        html += `<div style="color:var(--text-muted); font-size:13px;">No hay equipos listos para entregar.</div>`;
    }
    html += `</div>`;
    
    // SECCIÓN: Esperando autorización del cliente
    const espAut = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'pendiente_cliente');
    html += `<div class="card" style="margin-bottom:14px;">
        <h3 style="font-size:15px; margin:0 0 10px;"><i class="ti ti-bell" style="color:#9a3412;"></i> Esperando Autorización del Cliente (${espAut.length})</h3>`;
    if(espAut.length) {
        html += espAut.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos, true)).join('');
    } else {
        html += `<div style="color:var(--text-muted); font-size:13px;">Ninguna orden esperando autorización.</div>`;
    }
    html += `</div>`;
    
    // SECCIÓN: Todas las órdenes (buscador + filtros)
    html += `<div class="card" style="margin-bottom:14px;">
        <h3 style="font-size:15px; margin:0 0 10px;"><i class="ti ti-tool" style="color:#9a3412;"></i> Todas las Órdenes de Trabajo</h3>
        <input id="atencionBuscador" oninput="renderAtencionListaOrdenes()" placeholder="🔍 Buscar por número o cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;">
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
            <button class="btn btn-light" onclick="_atencionFiltro='todas'; renderAtencionListaOrdenes()" style="font-size:12px;">Todas</button>
            <button class="btn btn-light" onclick="_atencionFiltro='activas'; renderAtencionListaOrdenes()" style="font-size:12px;">⚙️ Activas</button>
            <button class="btn btn-light" onclick="_atencionFiltro='entregadas'; renderAtencionListaOrdenes()" style="font-size:12px;">📦 Entregadas</button>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:var(--text-muted);"><i class="ti ti-calendar"></i> Fecha:</span>
            <button class="btn btn-light" onclick="_atencionFechaFiltro=0; renderAtencionListaOrdenes()" style="font-size:11px; padding:4px 9px;">Todas</button>
            <button class="btn btn-light" onclick="_atencionFechaFiltro=1; renderAtencionListaOrdenes()" style="font-size:11px; padding:4px 9px;">Hoy</button>
            <button class="btn btn-light" onclick="_atencionFechaFiltro=7; renderAtencionListaOrdenes()" style="font-size:11px; padding:4px 9px;">7 días</button>
            <button class="btn btn-light" onclick="_atencionFechaFiltro=30; renderAtencionListaOrdenes()" style="font-size:11px; padding:4px 9px;">30 días</button>
        </div>
        <div id="atencionListaOrdenes"></div>
    </div>`;
    
    // SECCIÓN: Historial de reparaciones de los técnicos
    html += `<div class="card" style="margin-bottom:14px;">
        <h3 style="font-size:15px; margin:0 0 10px;"><i class="ti ti-history" style="color:#16a34a;"></i> Historial de Reparaciones</h3>
        ${construirFiltroFechas(true)}
        <div style="margin-bottom:10px;">
            <label style="font-size:12px; font-weight:600; color:var(--text-muted);">Técnico:</label>
            <select id="atencionTecnicoHist" onchange="_atencionTecnicoHist=this.value; renderAtencionHistorial()" style="padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-left:6px;">
                <option value="">Todos los técnicos</option>
                ${tecnicosActivos.map(t => `<option value="${t.id}" ${_atencionTecnicoHist === t.id ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`).join('')}
            </select>
        </div>
        <div id="atencionHistorial"></div>
    </div>`;
    
    cont.innerHTML = html;
    renderAtencionListaOrdenes();
    renderAtencionHistorial();
}

let _atencionFiltro = 'activas';
let _atencionFechaFiltro = 0; // 0 = todas las fechas; N = últimos N días
function renderAtencionClientesBusqueda() {
    const cont = document.getElementById('atencionClientesResultado');
    if(!cont) return;
    const txt = (document.getElementById('atencionBuscarCliente')?.value || '').trim().toLowerCase();
    if(!txt) { cont.innerHTML = ''; return; }
    const encontrados = (cache.clientes || []).filter(c => 
        (c.nombre || '').toLowerCase().includes(txt) || (c.telefono || '').toLowerCase().includes(txt)
    ).slice(0, 10);
    if(!encontrados.length) { cont.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">Sin clientes que coincidan.</div>`; return; }
    cont.innerHTML = encontrados.map(c => {
        const numOrds = (cache.ordenes || []).filter(o => o.cliente_id === c.id).length;
        return `<div onclick="verHistorialCliente('${c.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:5px; cursor:pointer;">
            <div>
                <div style="font-weight:600; font-size:13px;">${escapeHtml(c.nombre || 'Cliente')}</div>
                <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(c.telefono || 'Sin teléfono')}</div>
            </div>
            <span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:700; padding:3px 9px; border-radius:12px;">${numOrds} orden(es)</span>
        </div>`;
    }).join('');
}

function renderAtencionListaOrdenes() {
    const cont = document.getElementById('atencionListaOrdenes');
    if(!cont) return;
    const esAdmin = isAdminUser();
    const miId = sessionUser?.id;
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || !t.tipo_empleado));
    let ordenes = (cache.ordenes || []);
    if(_atencionFiltro === 'activas') ordenes = ordenes.filter(o => !['entregado','cancelado'].includes(normalizarEstadoOrden(o.estado)));
    else if(_atencionFiltro === 'entregadas') ordenes = ordenes.filter(o => normalizarEstadoOrden(o.estado) === 'entregado');
    
    // Filtro de fecha (días hacia atrás desde la recepción; 0 = todas)
    if(_atencionFechaFiltro > 0) {
        ordenes = ordenes.filter(o => diasDesde(o.creado_en) < _atencionFechaFiltro);
    }
    
    const txt = (document.getElementById('atencionBuscador')?.value || '').trim().toLowerCase();
    if(txt) {
        ordenes = ordenes.filter(o => {
            const c = findCliente(o.cliente_id);
            return formatoOrden(o.numero_orden).toLowerCase().includes(txt) || (c.nombre || '').toLowerCase().includes(txt);
        });
    }
    // Ordenar por fecha de recepción (más reciente primero)
    ordenes = ordenes.slice().sort((a,b) => new Date(b.creado_en||0) - new Date(a.creado_en||0));
    if(!ordenes.length) { cont.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No hay órdenes en este filtro.</div>`; return; }
    cont.innerHTML = ordenes.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos, true)).join('');
}

function renderAtencionHistorial() {
    const cont = document.getElementById('atencionHistorial');
    if(!cont) return;
    // Solo órdenes de cliente (sin reacondicionados). Filtra por técnico si hay uno elegido.
    cont.innerHTML = construirHistorialGeneral(_atencionTecnicoHist || null);
}

// Historial de técnicos (solo órdenes de cliente, sin reacondicionados). Si tecnicoId, filtra a uno.
function construirHistorialGeneral(tecnicoId) {
    const items = [];
    (cache.ordenes || []).forEach(o => {
        if(tecnicoId && o.tecnico_asignado_id !== tecnicoId) return;
        const est = normalizarEstadoOrden(o.estado);
        if(est === 'finalizado' || est === 'entregado') {
            const fecha = o.fecha_entregado || o.fecha_finalizado || o.creado_en;
            if(!fechaEnRango(fecha)) return;
            const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
            items.push({ fecha, equipo: `${e.marca||''} ${e.modelo||''}`.trim()||'Equipo', detalle: `${formatoOrden(o.numero_orden)} · ${c.nombre||'Cliente'}`, tec: o.tecnico_asignado_id ? nombreEmpleado(o.tecnico_asignado_id) : '—', tipo:'Servicio', color:'#3b82f6' });
        }
    });
    if(!items.length) return `<div style="color:var(--text-muted); font-size:13px;">No hay reparaciones terminadas en este período.</div>`;
    items.sort((a,b) => new Date(b.fecha||0) - new Date(a.fecha||0));
    const filas = items.map(it => {
        const f = it.fecha ? new Date(it.fecha).toLocaleDateString('es-DO',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
        return `<tr><td style="white-space:nowrap; font-size:12px;">${f}</td><td><span class="badge" style="background:${it.color}22; color:${it.color}; font-size:10px;">${it.tipo}</span></td><td style="font-weight:600;">${escapeHtml(it.equipo)}</td><td style="font-size:12px; color:var(--text-muted);">${escapeHtml(it.detalle)}</td><td style="font-size:12px;">${escapeHtml(it.tec)}</td></tr>`;
    }).join('');
    return `<div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${items.length} reparación(es) en el período (${_repFiltroFechas.label})</div>
        <div style="overflow-x:auto;"><table class="data-table" style="width:100%; font-size:13px;"><thead><tr><th>Fecha</th><th>Tipo</th><th>Equipo</th><th>Detalle</th><th>Técnico</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

// ============================================================
//   MI TRABAJO (pantalla del técnico: todo lo suyo junto)
// ============================================================
function renderMiTrabajo() {
    const miId = sessionUser?.id;
    const esAdmin = isAdminUser();
    const resumen = document.getElementById('miTrabajoResumen');
    const cont = document.getElementById('miTrabajoContenido');
    if(!cont) return;
    
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || !t.tipo_empleado));
    
    // Órdenes: disponibles (sin tomar) + mías
    const todasOrd = (cache.ordenes || []).filter(o => !['entregado','cancelado'].includes(normalizarEstadoOrden(o.estado)));
    const disponibles = todasOrd.filter(o => !o.tecnico_asignado_id);
    const misTareasOrden = new Set((cache.tareas || []).filter(t => t.tipo === 'orden' && t.tecnico_id === miId).map(t => t.ref_id));
    const misOrdenes = todasOrd.filter(o => o.tecnico_asignado_id === miId || misTareasOrden.has(o.id));
    
    // Reacondicionados míos
    const misReacond = (cache.refurb || []).filter(e => e.tecnico_asignado_id === miId && !['vendido'].includes(e.estado_evaluacion));
    
    // Fallas pendientes mías
    const misFallasPend = (cache.tareas || []).filter(t => t.tecnico_id === miId && t.estado !== 'hecha').length;
    const reasignadasAMi = (cache.tareas || []).filter(t => t.tecnico_id === miId && t.tecnico_anterior_id && t.estado !== 'hecha').length;
    
    // Resumen (KPIs)
    resumen.innerHTML = `
        <div class="kpi-box" style="border-top-color:#3b82f6;"><small>Disponibles</small><strong>${disponibles.length}</strong><i class="ti ti-inbox"></i></div>
        <div class="kpi-box" style="border-top-color:#0891b2;"><small>Mis órdenes</small><strong>${misOrdenes.length}</strong><i class="ti ti-tool"></i></div>
        <div class="kpi-box" style="border-top-color:#f59e0b;"><small>Mis reacond.</small><strong>${misReacond.length}</strong><i class="ti ti-refresh"></i></div>
        <div class="kpi-box" style="border-top-color:#dc2626;"><small>Fallas pend.</small><strong>${misFallasPend}</strong><i class="ti ti-alert-triangle"></i></div>
        ${reasignadasAMi > 0 ? `<div class="kpi-box" style="border-top-color:#d97706;"><small>Reasignadas a mí</small><strong>${reasignadasAMi}</strong><i class="ti ti-arrows-exchange"></i></div>` : ''}
    `;
    
    let html = '';
    
    // SECCIÓN: Órdenes disponibles
    html += `<div style="margin-bottom:18px;">
        <h3 style="font-size:15px; margin:0 0 8px;"><i class="ti ti-inbox" style="color:#3b82f6;"></i> Órdenes Disponibles (sin tomar)</h3>`;
    if(disponibles.length) {
        html += disponibles.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos)).join('');
    } else {
        html += `<div style="color:var(--text-muted); font-size:13px; padding:8px 0;">No hay órdenes disponibles ahora.</div>`;
    }
    html += `</div>`;
    
    // SECCIÓN: Mis órdenes
    html += `<div style="margin-bottom:18px;">
        <h3 style="font-size:15px; margin:0 0 8px;"><i class="ti ti-tool" style="color:#0891b2;"></i> Mis Órdenes Asignadas</h3>`;
    if(misOrdenes.length) {
        html += misOrdenes.map(o => construirCardOrden(o, esAdmin, miId, tecnicosActivos)).join('');
    } else {
        html += `<div style="color:var(--text-muted); font-size:13px; padding:8px 0;">No tienes órdenes asignadas.</div>`;
    }
    html += `</div>`;
    
    // SECCIÓN: Mis reacondicionados
    html += `<div style="margin-bottom:18px;">
        <h3 style="font-size:15px; margin:0 0 8px;"><i class="ti ti-refresh" style="color:#f59e0b;"></i> Mis Reacondicionados</h3>`;
    if(misReacond.length) {
        html += misReacond.map(eq => {
            const tareasEq = (cache.tareas || []).filter(t => t.tipo === 'equipo' && t.ref_id === eq.id);
            const pend = tareasEq.filter(t => t.estado !== 'hecha').length;
            const estLabel = (eq.estado_evaluacion || 'en_proceso').replace(/_/g, ' ');
            return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <b>${escapeHtml(eq.marca || '')} ${escapeHtml(eq.modelo || '')}</b> ${eq.capacidad ? '· ' + escapeHtml(eq.capacidad) : ''}
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Estado: ${escapeHtml(estLabel)} ${pend > 0 ? `· ${pend} falla(s) pendiente(s)` : '· ✅ sin pendientes'}</div>
                    ${eq.fecha_asignacion ? `<div style="font-size:11px; color:#0891b2; font-weight:600; margin-top:2px;"><i class="ti ti-stopwatch"></i> Tomado: ${tiempoDesde(eq.fecha_asignacion)}</div>` : ''}
                </div>
                <button class="btn btn-dark" style="padding:8px 14px;" onclick="abrirPanelProceso('${eq.id}')"><i class="ti ti-tool"></i> Trabajar</button>
            </div>`;
        }).join('');
    } else {
        html += `<div style="color:var(--text-muted); font-size:13px; padding:8px 0;">No tienes equipos reacondicionados asignados.</div>`;
    }
    html += `</div>`;
    
    // SECCIÓN: Mis pedidos de piezas (reacond)
    html += `<div style="margin-bottom:18px;">
        <h3 style="font-size:15px; margin:0 0 8px;"><i class="ti ti-packages" style="color:#0891b2;"></i> Mis Pedidos de Piezas</h3>
        ${construirPanelPedidosPiezas(miId)}
    </div>`;
    
    // SECCIÓN: Mi historial de reparaciones (terminadas)
    html += `<div style="margin-bottom:18px;">
        <h3 style="font-size:15px; margin:0 0 8px;"><i class="ti ti-history" style="color:#16a34a;"></i> Mi Historial de Reparaciones</h3>
        ${construirHistorialTecnico(miId)}
    </div>`;
    
    cont.innerHTML = html;
}

// Construye el historial de reparaciones terminadas de un técnico (órdenes entregadas/finalizadas + reacond vendidos)
function construirHistorialTecnico(tecnicoId) {
    const items = [];
    // Órdenes finalizadas o entregadas (dentro del rango de fechas)
    (cache.ordenes || []).forEach(o => {
        if(o.tecnico_asignado_id !== tecnicoId) return;
        const est = normalizarEstadoOrden(o.estado);
        if(est === 'finalizado' || est === 'entregado') {
            const fecha = o.fecha_entregado || o.fecha_finalizado || o.creado_en;
            if(!fechaEnRango(fecha)) return;
            const c = findCliente(o.cliente_id), e = findEquipo(o.equipo_id);
            items.push({
                fecha: fecha,
                equipo: `${e.marca || ''} ${e.modelo || ''}`.trim() || 'Equipo',
                detalle: `Orden ${formatoOrden(o.numero_orden)} · ${c.nombre || 'Cliente'}`,
                tipo: 'Servicio',
                color: '#3b82f6'
            });
        }
    });
    // Reacondicionados vendidos/terminados (dentro del rango)
    (cache.refurb || []).forEach(eq => {
        if(eq.tecnico_asignado_id !== tecnicoId) return;
        if(['listo_venta', 'vendido'].includes(eq.estado_evaluacion)) {
            const fecha = eq.fecha_despacho || eq.fecha_asignacion;
            if(!fechaEnRango(fecha)) return;
            items.push({
                fecha: fecha,
                equipo: `${eq.marca || ''} ${eq.modelo || ''}`.trim() || 'Equipo',
                detalle: `Reacondicionado · ${(eq.estado_evaluacion || '').replace(/_/g, ' ')}`,
                tipo: 'Reacond',
                color: '#f59e0b'
            });
        }
    });
    const filtroHtml = construirFiltroFechas(true);
    if(!items.length) {
        return filtroHtml + `<div style="color:var(--text-muted); font-size:13px; padding:8px 0;">No hay reparaciones terminadas en este período.</div>`;
    }
    // Ordenar por fecha descendente (más reciente primero)
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    
    const filas = items.map(it => {
        const fechaTxt = it.fecha ? new Date(it.fecha).toLocaleDateString('es-DO', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
        return `<tr>
            <td style="white-space:nowrap; font-size:12px;">${fechaTxt}</td>
            <td><span class="badge" style="background:${it.color}22; color:${it.color}; font-size:10px;">${it.tipo}</span></td>
            <td style="font-weight:600;">${escapeHtml(it.equipo)}</td>
            <td style="font-size:12px; color:var(--text-muted);">${escapeHtml(it.detalle)}</td>
        </tr>`;
    }).join('');
    
    return filtroHtml + `
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${items.length} reparación(es) terminada(s) en el período (${_repFiltroFechas.label})</div>
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:13px;">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Equipo</th><th>Detalle</th></tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}

// Cuenta cuántas fallas/tareas pendientes tiene una orden o equipo
function fallasPendientesDe(tipo, refId) {
    return (cache.tareas || []).filter(t => t.tipo === tipo && t.ref_id === refId && t.estado !== 'hecha').length;
}

// Maneja el cambio de estado desde la UI (pide nota si es pendiente_cliente)
async function cambiarEstadoOrdenUI(ordenId, nuevoEstado) {
    if(nuevoEstado === 'cancelado') {
        const piezasOrden = (cache.ordenPiezas || []).filter(p => p.orden_id === ordenId && !['devuelta','recibida'].includes(p.estado));
        let msg = '¿Cancelar esta orden? Esta acción la marca como anulada.';
        if(piezasOrden.length > 0) {
            msg = `⚠️ Esta orden tiene ${piezasOrden.length} pieza(s) solicitada(s)/en proceso.\n\nRevisa si debes devolverlas antes de cancelar.\n\n¿Cancelar de todos modos?`;
        }
        if(!confirm(msg)) return;
    }
    // No permitir finalizar si quedan fallas/tareas pendientes
    if(nuevoEstado === 'finalizado') {
        const pend = fallasPendientesDe('orden', ordenId);
        if(pend > 0) {
            if(isAdminUser()) {
                if(!confirm(`⚠️ Esta orden tiene ${pend} falla(s) SIN resolver.\n\nComo administrador puedes finalizarla de todos modos.\n\n¿Forzar finalización?`)) return;
            } else {
                return alert(`⚠️ No puedes finalizar todavía.\n\nQuedan ${pend} falla(s) pendiente(s). Marca todas las fallas como resueltas (✓) antes de finalizar.`);
            }
        }
    }
    if(nuevoEstado === 'pendiente_cliente') {
        const nota = prompt('🔔 ESPERANDO AUTORIZACIÓN DEL CLIENTE\n\n¿Qué necesitas que el cliente autorice o informe?\n\nEjemplos:\n• "Autorizar cambio de batería - RD$1,200"\n• "Se dañó el flex al abrir, autorizar reemplazo"\n• "Necesito la contraseña del equipo"');
        if(nota === null) return; // canceló
        if(!nota.trim()) return alert('Debes escribir qué se necesita autorizar.');
        await avanzarEstadoOrden(ordenId, nuevoEstado, nota.trim());
        return;
    }
    await avanzarEstadoOrden(ordenId, nuevoEstado);
}

// === FASE 3: Derivación técnica (pasar la orden a otro técnico) ===
async function derivarOrden(ordenId) {
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return alert('Orden no encontrada.');
    const esAdmin = isAdminUser();
    const esMia = orden.tecnico_asignado_id === sessionUser?.id;
    // Anti juez-y-parte: solo el técnico asignado o un admin pueden derivar
    if(!esAdmin && !esMia) {
        return alert('Solo el técnico asignado (o un administrador) puede derivar esta orden.');
    }
    const estado = normalizarEstadoOrden(orden.estado);
    if(['entregado','cancelado'].includes(estado)) {
        return alert('No se puede derivar una orden ya entregada o cancelada.');
    }
    // Técnicos disponibles (excluyendo al actual)
    const tecnicos = (cache.tecnicos || []).filter(t => t.activo && (t.tipo_empleado === 'tecnico' || (!t.tipo_empleado && t.rol !== 'admin')) && t.id !== orden.tecnico_asignado_id);
    if(!tecnicos.length) return alert('No hay otros técnicos disponibles para derivar.');
    
    // Construir lista para el prompt
    const lista = tecnicos.map((t, i) => `${i + 1}. ${t.nombre}`).join('\n');
    const sel = prompt(`DERIVAR ORDEN ${formatoOrden(orden.numero_orden)} a otro técnico:\n\n${lista}\n\nEscribe el número del técnico:`);
    if(sel === null) return;
    const idx = parseInt(sel) - 1;
    if(isNaN(idx) || idx < 0 || idx >= tecnicos.length) return alert('Selección inválida.');
    const nuevoTec = tecnicos[idx];
    
    const motivo = prompt(`Motivo de la derivación a ${nuevoTec.nombre}:\n\nEjemplo: "Requiere microsoldadura" o "No pude resolver el problema de carga"`);
    if(motivo === null) return;
    if(!motivo.trim()) return alert('Debes indicar el motivo de la derivación.');
    
    try {
        const { error } = await supabaseClient.from('ordenes_reparacion').update({
            tecnico_anterior_id: orden.tecnico_asignado_id || null,
            tecnico_asignado_id: nuevoTec.id,
            estado: 'en_proceso',
            fecha_derivacion: new Date().toISOString(),
            motivo_derivacion: motivo.trim(),
            nota_estado: `Derivado de ${nombreEmpleado(orden.tecnico_asignado_id)}: ${motivo.trim()}`
        }).eq('id', ordenId);
        if(error) throw error;
        toast(`🔄 Orden derivada a ${nuevoTec.nombre}.`);
        await loadAll();
    } catch(e) { logError('Derivar orden', e); alert(getFriendlyError(e)); }
}

// === FASE B: Piezas adicionales de una orden ===
// El técnico solicita una pieza (texto libre)
async function solicitarPiezaOrden(ordenId) {
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return;
    const esAdmin = isAdminUser();
    const esMia = orden.tecnico_asignado_id === sessionUser?.id;
    if(!esAdmin && !esMia) return alert('Solo el técnico asignado puede solicitar piezas para esta orden.');
    
    const nombre = prompt('🔧 SOLICITAR PIEZA ADICIONAL\n\nEscribe el nombre de la pieza que necesitas:\n\nEjemplo: "Pantalla iPhone 12", "Batería", "Flex de carga"');
    if(nombre === null) return;
    if(!nombre.trim()) return alert('Escribe el nombre de la pieza.');
    
    const cantStr = prompt('¿Cuántas unidades? (deja 1 si es una sola)', '1');
    if(cantStr === null) return;
    const cantidad = parseInt(cantStr) || 1;
    
    try {
        const { error } = await supabaseClient.from('orden_piezas').insert([{
            orden_id: ordenId,
            tecnico_id: orden.tecnico_asignado_id || sessionUser?.id,
            pieza_nombre: nombre.trim(),
            cantidad: cantidad,
            estado: 'solicitada'
        }]);
        if(error) throw error;
        toast('🔧 Pieza solicitada: ' + nombre.trim());
        await loadAll();
    } catch(e) { logError('Solicitar pieza orden', e); alert(getFriendlyError(e)); }
}

// Servicio marca la pieza como entregada al técnico
async function entregarPiezaOrden(piezaId) {
    try {
        const { error } = await supabaseClient.from('orden_piezas').update({
            estado: 'entregada',
            fecha_entregada: new Date().toISOString()
        }).eq('id', piezaId);
        if(error) throw error;
        toast('📦 Pieza marcada como entregada.');
        await loadAll();
    } catch(e) { logError('Entregar pieza orden', e); alert(getFriendlyError(e)); }
}

// El técnico confirma que recibió la pieza
async function recibirPiezaOrden(piezaId) {
    const pieza = (cache.ordenPiezas || []).find(p => p.id === piezaId);
    if(!pieza) return;
    const esAdmin = isAdminUser();
    const esMia = pieza.tecnico_id === sessionUser?.id;
    if(!esAdmin && !esMia) return alert('Solo el técnico que solicitó la pieza puede confirmar que la recibió.');
    try {
        const { error } = await supabaseClient.from('orden_piezas').update({
            estado: 'recibida',
            fecha_recibida: new Date().toISOString()
        }).eq('id', piezaId);
        if(error) throw error;
        toast('✅ Pieza recibida. Ahora la tienes tú.');
        await loadAll();
    } catch(e) { logError('Recibir pieza orden', e); alert(getFriendlyError(e)); }
}

// === FASE C: Devolución de pieza ===
// El técnico solicita devolver una pieza que no usó
async function devolverPiezaOrden(piezaId) {
    const pieza = (cache.ordenPiezas || []).find(p => p.id === piezaId);
    if(!pieza) return;
    const esAdmin = isAdminUser();
    const esMia = pieza.tecnico_id === sessionUser?.id;
    if(!esAdmin && !esMia) return alert('Solo el técnico que tiene la pieza puede solicitar devolverla.');
    const motivo = prompt(`↩️ DEVOLVER PIEZA: ${pieza.pieza_nombre}\n\n¿Por qué la devuelves?\n\nEjemplos:\n• "No se utilizó, el daño era otro"\n• "Era para probar, no hizo falta"`);
    if(motivo === null) return;
    try {
        const { error } = await supabaseClient.from('orden_piezas').update({
            estado: 'devolucion_solicitada',
            nota: motivo.trim() || 'Devolución solicitada'
        }).eq('id', piezaId);
        if(error) throw error;
        toast('↩️ Devolución solicitada. Entrégala a servicio para que la confirme.');
        await loadAll();
    } catch(e) { logError('Devolver pieza orden', e); alert(getFriendlyError(e)); }
}

// Servicio confirma que recibió la pieza devuelta
async function confirmarDevolucionPiezaOrden(piezaId) {
    if(!confirm('¿Confirmar que recibiste esta pieza devuelta del técnico?')) return;
    try {
        const { error } = await supabaseClient.from('orden_piezas').update({
            estado: 'devuelta',
            fecha_recibida: new Date().toISOString()
        }).eq('id', piezaId);
        if(error) throw error;
        toast('🔄 Devolución confirmada. La pieza ya no está con el técnico.');
        await loadAll();
    } catch(e) { logError('Confirmar devolución pieza', e); alert(getFriendlyError(e)); }
}

// Muestra las piezas que un técnico TIENE en su poder (recibidas o pendientes de devolver)
function verPiezasDelTecnico(tecnicoId) {
    const tec = (cache.tecnicos || []).find(t => t.id === tecnicoId);
    const nombre = tec?.nombre || nombreEmpleado(tecnicoId);
    // Piezas que el técnico tiene: recibidas o con devolución pendiente
    const piezas = (cache.ordenPiezas || []).filter(p =>
        p.tecnico_id === tecnicoId && ['recibida', 'devolucion_solicitada'].includes(p.estado)
    );
    
    const cont = document.getElementById('piezasTecnicoLista');
    const titulo = document.getElementById('piezasTecnicoTitulo');
    if(titulo) titulo.textContent = 'Piezas en poder de ' + nombre;
    
    if(!piezas.length) {
        if(cont) cont.innerHTML = `<div style="color:var(--text-muted); padding:14px;">Este técnico no tiene piezas pendientes. ✅</div>`;
    } else {
        if(cont) cont.innerHTML = piezas.map(p => {
            const orden = (cache.ordenes || []).find(o => o.id === p.orden_id);
            const numOrd = orden ? formatoOrden(orden.numero_orden) : '—';
            const ep = etiquetaPiezaOrden(p.estado);
            return `<div style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <b>${escapeHtml(p.pieza_nombre)}</b> ${p.cantidad > 1 ? '×' + p.cantidad : ''}
                        <span class="badge" style="background:${ep.bg}; color:${ep.color}; font-size:10px; margin-left:6px;">${ep.text}</span>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Orden ${numOrd}</div>
                        ${p.nota ? `<div style="font-size:11px; color:#9a3412; margin-top:2px;">↩️ ${escapeHtml(p.nota)}</div>` : ''}
                    </div>
                    <div>
                        ${p.estado === 'devolucion_solicitada' ? `<button class="btn btn-blue" style="font-size:11px; padding:5px 9px;" onclick="confirmarDevolucionPiezaOrden('${p.id}')"><i class="ti ti-check"></i> Confirmar devolución</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    document.getElementById('modalPiezasTecnico').classList.add('active');
}

function cerrarModalPiezasTecnico() {
    document.getElementById('modalPiezasTecnico').classList.remove('active');
}

// Etiqueta visual del estado de una pieza
function etiquetaPiezaOrden(estado) {
    const map = {
        'solicitada': { text: '🟡 Solicitada', bg:'#fef3c7', color:'#92400e' },
        'entregada':  { text: '📦 Entregada (confirmar)', bg:'#dbeafe', color:'#1e40af' },
        'recibida':   { text: '✅ Recibida (con el técnico)', bg:'#d1fae5', color:'#065f46' },
        'devolucion_solicitada': { text: '↩️ Devolución pendiente', bg:'#fed7aa', color:'#9a3412' },
        'devuelta':   { text: '🔄 Devuelta', bg:'#e2e8f0', color:'#475569' }
    };
    return map[estado] || { text: estado, bg:'#f1f5f9', color:'#64748b' };
}

// El técnico se auto-asigna una orden (la toma)
async function tomarOrden(ordenId) {
    if(!sessionUser) return;
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return alert('Orden no encontrada.');
    if(orden.tecnico_asignado_id && orden.tecnico_asignado_id !== sessionUser.id) {
        const t = nombreEmpleado(orden.tecnico_asignado_id);
        return alert(`Esta orden ya fue tomada por ${t}.`);
    }
    if(!confirm(`¿Tomar la orden ${formatoOrden(orden.numero_orden)}?\n\nQuedará asignada a ti y pasará a "En proceso".`)) return;
    try {
        const { error } = await supabaseClient.from('ordenes_reparacion').update({
            tecnico_asignado_id: sessionUser.id,
            estado: 'en_proceso',
            fecha_asignacion: new Date().toISOString()
        }).eq('id', ordenId);
        if(error) throw error;
        toast('✅ Orden tomada. Ahora está en proceso.');
        // Crear tareas automáticas desde las fallas reportadas (texto libre)
        const fallasTexto = (orden.falla_reportada || '').split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean);
        const n = await crearTareasDesdeFallas('orden', ordenId, fallasTexto);
        if(n > 0) toast(`📋 ${n} tarea(s) creada(s) desde las fallas.`);
        // Las fallas SIN asignar pasan a este técnico
        await asignarFallasSinDueno('orden', ordenId, sessionUser.id);
        await loadAll();
    } catch(e) { logError('Tomar orden', e); alert(getFriendlyError(e)); }
}

// Asigna al técnico todas las tareas/fallas que estén sin dueño (al tomar/asignar la orden o equipo)
async function asignarFallasSinDueno(tipo, refId, tecnicoId) {
    if(!tecnicoId) return;
    try {
        await supabaseClient.from('tareas_trabajo')
            .update({ tecnico_id: tecnicoId })
            .eq('tipo', tipo).eq('ref_id', refId).is('tecnico_id', null);
    } catch(e) { logError('Asignar fallas sin dueño', e); }
}

// Admin/servicio asigna la orden a un técnico específico
async function asignarOrdenTecnico(ordenId, tecnicoId) {
    if(!tecnicoId) return;
    try {
        const { error } = await supabaseClient.from('ordenes_reparacion').update({
            tecnico_asignado_id: tecnicoId,
            estado: 'en_proceso',
            fecha_asignacion: new Date().toISOString()
        }).eq('id', ordenId);
        if(error) throw error;
        toast('✅ Orden asignada a ' + nombreEmpleado(tecnicoId) + '.');
        // Crear tareas automáticas desde las fallas reportadas
        const ordenAsig = (cache.ordenes || []).find(o => o.id === ordenId);
        if(ordenAsig) {
            const fallasTexto = (ordenAsig.falla_reportada || '').split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean);
            await crearTareasDesdeFallas('orden', ordenId, fallasTexto);
        }
        // Las fallas SIN asignar pasan a este técnico
        await asignarFallasSinDueno('orden', ordenId, tecnicoId);
        await loadAll();
    } catch(e) { logError('Asignar orden', e); alert(getFriendlyError(e)); }
}

// Avanza el estado de la orden (solo hacia adelante)
async function avanzarEstadoOrden(ordenId, nuevoEstado, nota) {
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return;
    const actual = normalizarEstadoOrden(orden.estado);
    // Anti juez-y-parte: el técnico solo puede mover SU orden
    const esAdmin = isAdminUser();
    if(!esAdmin && orden.tecnico_asignado_id !== sessionUser?.id) {
        return alert('Solo el técnico asignado (o un administrador) puede cambiar el estado.');
    }
    // Validar que solo avance (no retroceda), salvo cancelar o resolver estados temporales
    const estadosTemporales = ['espera_repuesto', 'pendiente_cliente'];
    const esResolverTemporal = estadosTemporales.includes(actual) && nuevoEstado === 'en_proceso';
    if(nuevoEstado !== 'cancelado' && !esResolverTemporal) {
        const iActual = ORDEN_FLUJO.indexOf(actual);
        const iNuevo = ORDEN_FLUJO.indexOf(nuevoEstado);
        if(iNuevo !== -1 && iActual !== -1 && iNuevo < iActual) {
            return alert('El estado solo puede avanzar, no retroceder.');
        }
    }
    try {
        const upd = { estado: nuevoEstado };
        if(typeof nota === 'string') upd.nota_estado = nota || null;
        // Al resolver un estado temporal, limpiar la nota
        if(esResolverTemporal) upd.nota_estado = null;
        if(nuevoEstado === 'finalizado') upd.fecha_finalizado = new Date().toISOString();
        if(nuevoEstado === 'entregado') upd.fecha_entregado = new Date().toISOString();
        const { error } = await supabaseClient.from('ordenes_reparacion').update(upd).eq('id', ordenId);
        if(error) throw error;
        toast('✅ Estado actualizado: ' + obtenerEtiquetaOrden(nuevoEstado).text);
        await loadAll();
    } catch(e) { logError('Avanzar estado orden', e); alert(getFriendlyError(e)); }
}

// === GARANTÍA ===
// Calcula el estado de garantía de una orden
function infoGarantiaOrden(orden) {
    const dias = orden.dias_garantia || 0;
    if(!dias || !orden.fecha_entregado) return { tieneGarantia: false, vigente: false, diasRestantes: 0 };
    const entrega = new Date(orden.fecha_entregado);
    const vence = new Date(entrega.getTime() + dias * 24 * 60 * 60 * 1000);
    const hoy = new Date();
    const diasRestantes = Math.ceil((vence - hoy) / (24 * 60 * 60 * 1000));
    return { tieneGarantia: true, vigente: diasRestantes > 0, diasRestantes: Math.max(0, diasRestantes), vence };
}

// Marca como entregado y pregunta los días de garantía
async function marcarEntregadoConGarantia(ordenId) {
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return;
    const est = normalizarEstadoOrden(orden.estado);
    // Sentido común: solo se entrega lo que está finalizado
    if(est !== 'finalizado') {
        if(isAdminUser()) {
            if(!confirm('⚠️ Esta orden no está marcada como FINALIZADA.\n\n¿Entregar de todos modos? (recomendado finalizar primero)')) return;
        } else {
            return alert('⚠️ Solo se puede entregar una orden FINALIZADA.\n\nMarca la reparación como finalizada antes de entregar.');
        }
    }
    const diasStr = prompt('📦 ENTREGAR EQUIPO\n\n¿Cuántos días de garantía? (deja 0 si no aplica)\n\nEjemplos: 30, 90', '90');
    if(diasStr === null) return;
    const dias = parseInt(diasStr) || 0;
    try {
        const { error } = await supabaseClient.from('ordenes_reparacion').update({
            estado: 'entregado',
            fecha_entregado: new Date().toISOString(),
            dias_garantia: dias
        }).eq('id', ordenId);
        if(error) throw error;
        toast(dias > 0 ? `📦 Entregado con ${dias} días de garantía.` : '📦 Entregado (sin garantía).');
        await loadAll();
    } catch(e) { logError('Marcar entregado', e); alert(getFriendlyError(e)); }
}

// Reabre una orden entregada por garantía
async function reabrirPorGarantia(ordenId) {
    return reabrirOrden(ordenId, 'garantia');
}

// Reabre una orden entregada. motivo: 'garantia' o 'otra'. Vuelve al mismo técnico que la hizo.
async function reabrirOrden(ordenId, tipoMotivo) {
    const orden = (cache.ordenes || []).find(o => o.id === ordenId);
    if(!orden) return;
    // Permiso: admin o servicio al cliente
    if(!isAdminUser() && !tienePermiso('recepcion_ver')) {
        return alert('Solo un administrador o personal de servicio al cliente puede reabrir órdenes.');
    }
    const tecAnterior = orden.tecnico_asignado_id ? nombreEmpleado(orden.tecnico_asignado_id) : null;
    
    let updates = { estado: 'en_proceso' };
    let avisoTecnico = '';
    
    if(tipoMotivo === 'garantia') {
        const info = infoGarantiaOrden(orden);
        if(!info.vigente) {
            // Garantía vencida: ofrecer reabrir por otra razón
            if(!confirm('⚠️ La garantía de esta orden ya venció.\n\n¿Reabrir por OTRA razón (no garantía)?')) return;
            return reabrirOrden(ordenId, 'otra');
        }
        const motivo = prompt(`🛡️ REABRIR POR GARANTÍA\n\nQuedan ${info.diasRestantes} días de garantía.\n\n¿Qué problema reporta el cliente?\n\nEjemplo: "La pantalla volvió a fallar"`);
        if(motivo === null) return;
        if(!motivo.trim()) return alert('Indica el motivo de la garantía.');
        updates.es_garantia = true;
        updates.veces_garantia = (orden.veces_garantia || 0) + 1;
        updates.nota_estado = `🛡️ GARANTÍA: ${motivo.trim()}`;
        updates.fecha_reapertura_garantia = new Date().toISOString();
        avisoTecnico = '🛡️ Reabierta por GARANTÍA';
    } else {
        // Otra razón
        const motivo = prompt(`🔄 REABRIR ORDEN (otra razón)\n\n¿Por qué se reabre esta orden?\n\nEjemplo: "El cliente reporta otro problema", "Revisión adicional solicitada"`);
        if(motivo === null) return;
        if(!motivo.trim()) return alert('Indica la razón de la reapertura.');
        updates.nota_estado = `🔄 REABIERTA: ${motivo.trim()}`;
        updates.es_garantia = false;
        avisoTecnico = '🔄 Reabierta (no garantía)';
    }
    
    try {
        const { error } = await supabaseClient.from('ordenes_reparacion').update(updates).eq('id', ordenId);
        if(error) throw error;
        toast(`${avisoTecnico}. Vuelve a "En proceso"${tecAnterior ? ' con ' + tecAnterior : ''}.`);
        await loadAll();
    } catch(e) { logError('Reabrir orden', e); alert(getFriendlyError(e)); }
}

async function abrirModalNuevaDevolucion() {
    // Reset campos
    document.getElementById('dev_equipo_id').value = '';
    document.getElementById('dev_motivo').value = '';
    document.getElementById('dev_cliente').value = '';
    document.getElementById('dev_diagnostico').value = '';
    document.getElementById('devInfoEquipo').style.display = 'none';
    document.getElementById('devInfoEquipo').innerHTML = '';
    document.getElementById('devCamposExtras').style.display = 'none';
    document.getElementById('devProblemasChecklist').innerHTML = '';
    
    // Smart-select de equipos despachados
    const despachados = (cache.refurb || []).filter(r => r.estado_evaluacion === 'vendido');
    
    if(despachados.length === 0) {
        alert('No hay equipos despachados aún. Primero debes tener equipos en estado "Despachado" para poder registrar devoluciones.');
        return;
    }
    
    smartSelectInit({
        containerId: 'ss-dev-equipo',
        placeholder: '🔍 Buscar por IMEI, modelo o marca...',
        items: despachados.map(eq => ({
            id: eq.id,
            label: `${eq.modelo || 'Equipo'} · IMEI: ${eq.imei || '—'}`,
            sub: [
                eq.marca,
                eq.capacidad,
                eq.veces_devuelto > 0 ? `Devuelto ${eq.veces_devuelto}×` : null
            ].filter(x => x).join(' · '),
            search: [eq.modelo, eq.imei, eq.marca, eq.capacidad].filter(x => x).join(' ').toLowerCase(),
            meta: eq.veces_devuelto > 0 ? `${eq.veces_devuelto}×` : ''
        })),
        value: '',
        onChange: (id) => {
            if(id) cargarHistorialEquipoDevolucion(id);
            else {
                document.getElementById('devInfoEquipo').style.display = 'none';
                document.getElementById('devCamposExtras').style.display = 'none';
            }
        }
    });
    
    // Smart-select de técnicos activos
    const tecnicosActivos = (cache.tecnicos || []).filter(t => t.activo);
    smartSelectInit({
        containerId: 'ss-dev-tecnico',
        placeholder: '🔍 Buscar técnico...',
        items: tecnicosActivos.map(t => ({
            id: t.id,
            label: t.nombre,
            sub: [t.especialidad, t.telefono].filter(x => x).join(' · '),
            search: [t.nombre, t.especialidad].filter(x => x).join(' ').toLowerCase(),
            meta: t.rol === 'admin' ? 'ADMIN' : ''
        })),
        value: '',
        onChange: () => {}
    });
    
    document.getElementById('modalDevolucion').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalDevolucion() {
    document.getElementById('modalDevolucion').classList.remove('active');
}

async function cargarHistorialEquipoDevolucion(equipoId) {
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return;
    
    document.getElementById('dev_equipo_id').value = equipoId;
    
    // Cargar historial: fallas, piezas, devoluciones previas, lote
    try {
        const [fallasRes, piezasRes, devsRes, histRes] = await Promise.all([
            supabaseClient.from('equipo_fallas').select('*').eq('equipo_id', equipoId),
            supabaseClient.from('equipo_piezas_pedidas').select('*').eq('equipo_id', equipoId),
            supabaseClient.from('equipo_devoluciones').select('*').eq('equipo_id', equipoId).order('fecha_devolucion', { ascending: false }),
            supabaseClient.from('equipo_historial').select('*').eq('equipo_id', equipoId).order('fecha', { ascending: false }).limit(10)
        ]);
        
        const fallas = fallasRes.data || [];
        const piezas = piezasRes.data || [];
        const devsPrev = devsRes.data || [];
        const historial = histRes.data || [];
        const lote = (cache.lotes || []).find(l => l.id === eq.lote_id);
        const proveedor = lote ? (cache.proveedores || []).find(p => p.id === lote.proveedor_id) : null;
        
        // Construir info del equipo
        const fechaCompra = lote ? new Date(lote.fecha_compra || lote.creado_en).toLocaleDateString('es-DO') : '—';
        const totalPiezas = piezas.reduce((s, p) => s + ((p.cantidad||1) * (p.costo_unitario||0)), 0);
        const costoTotal = (eq.costo_compra || 0) + totalPiezas;
        
        document.getElementById('devInfoEquipo').style.display = 'block';
        document.getElementById('devInfoEquipo').innerHTML = `
            <div style="background:linear-gradient(135deg, #f1f5f9, #e2e8f0); border-radius:10px; padding:14px; margin-top:15px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
                    <i class="ti ti-device-mobile" style="color:var(--blue-btn); font-size:20px;"></i>
                    <b style="font-size:15px;">${escapeHtml(eq.modelo || 'Equipo')}</b>
                    ${eq.veces_devuelto > 0 ? `<span class="badge" style="background:#fee2e2; color:#991b1b;">⚠️ Ya devuelto ${eq.veces_devuelto}×</span>` : ''}
                </div>
                
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; font-size:12px; margin-bottom:10px;">
                    <div><b>IMEI:</b><br>${escapeHtml(eq.imei || '—')}</div>
                    ${eq.capacidad ? `<div><b>Capacidad:</b><br>${escapeHtml(eq.capacidad)}</div>` : ''}
                    <div><b>Compra:</b><br>${escapeHtml(fechaCompra)}</div>
                    ${proveedor ? `<div><b>Proveedor:</b><br>${escapeHtml(proveedor.nombre)}</div>` : ''}
                    ${lote ? `<div><b>Lote:</b><br>${escapeHtml(lote.codigo_lote || '—')}</div>` : ''}
                    <div><b>Costo total invertido:</b><br><span style="color:#dc2626; font-weight:700;">${money(costoTotal)}</span></div>
                </div>
                
                ${fallas.length > 0 ? `
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">
                    <b style="font-size:11px; color:#991b1b; text-transform:uppercase;"><i class="ti ti-alert-triangle"></i> Fallas detectadas anteriormente:</b>
                    <div style="margin-top:6px;">
                        ${fallas.map(f => `<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:10px; margin:2px;">${escapeHtml(f.falla_corto || f.falla_nombre)}</span>`).join('')}
                    </div>
                </div>` : ''}
                
                ${piezas.length > 0 ? `
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">
                    <b style="font-size:11px; color:#1e40af; text-transform:uppercase;"><i class="ti ti-tools"></i> Piezas usadas en reparaciones previas:</b>
                    <div style="margin-top:4px; font-size:11px;">
                        ${piezas.map(p => `<div>• ${escapeHtml(p.pieza_nombre || 'Pieza')} ×${p.cantidad || 1} ${p.estado === 'rechazada' ? '(rechazada)' : ''}</div>`).join('')}
                    </div>
                </div>` : ''}
                
                ${devsPrev.length > 0 ? `
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">
                    <b style="font-size:11px; color:#dc2626; text-transform:uppercase;"><i class="ti ti-rotate-2"></i> Devoluciones anteriores (${devsPrev.length}):</b>
                    <div style="margin-top:4px; font-size:11px;">
                        ${devsPrev.slice(0, 3).map(d => {
                            const fd = new Date(d.fecha_devolucion).toLocaleDateString('es-DO');
                            return `<div style="background:#fef2f2; padding:4px 8px; border-radius:4px; margin-top:3px;">• ${escapeHtml(fd)}: ${escapeHtml(d.motivo_devolucion.substring(0, 80))}${d.motivo_devolucion.length > 80 ? '...' : ''}</div>`;
                        }).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;
        
        // Llenar checklist de problemas con las fallas conocidas + opciones genéricas
        const todasFallas = cache.fallas || [];
        const fallasConocidas = todasFallas.filter(f => f.activa !== false);
        document.getElementById('devProblemasChecklist').innerHTML = fallasConocidas.map(f => {
            const yaEstaba = fallas.some(ef => ef.falla_id === f.id);
            return `<label style="display:flex; align-items:center; gap:6px; padding:6px 8px; background:${yaEstaba ? '#fef3c7' : '#fff'}; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer; font-size:12px;">
                <input type="checkbox" name="dev_problema" value="${escapeHtml(f.nombre_corto || f.nombre)}" data-falla-id="${f.id}">
                <span>${escapeHtml(f.nombre)}${yaEstaba ? ' <small style="color:#92400e;">(falla previa)</small>' : ''}</span>
            </label>`;
        }).join('');
        
        // Mostrar campos extras
        document.getElementById('devCamposExtras').style.display = 'block';
    } catch(e) {
        logError('Cargar historial devolución', e);
        alert(getFriendlyError(e));
    }
}

async function guardarDevolucion() {
    const equipoId = document.getElementById('dev_equipo_id').value;
    const motivo = document.getElementById('dev_motivo').value.trim();
    const cliente = document.getElementById('dev_cliente').value.trim();
    const diagnostico = document.getElementById('dev_diagnostico').value.trim();
    const tecnicoId = smartSelectGetValue('ss-dev-tecnico');
    
    if(!equipoId) return alert('Selecciona el equipo que se devolvió.');
    if(!motivo) return alert('El motivo de devolución es obligatorio.');
    if(!tecnicoId) return alert('Selecciona un técnico para esta reparación.');
    
    const eq = (cache.refurb || []).find(r => r.id === equipoId);
    if(!eq) return alert('Equipo no encontrado.');
    if(eq.estado_evaluacion !== 'vendido') {
        return alert('Este equipo no está en estado "Despachado". Solo se pueden devolver equipos despachados.');
    }
    
    // Capturar checklist de problemas
    const checkboxes = document.querySelectorAll('#devProblemasChecklist input[type="checkbox"]:checked');
    const problemasArr = Array.from(checkboxes).map(c => c.value);
    const problemasStr = problemasArr.length > 0 ? problemasArr.join(', ') : null;
    
    // Calcular nuevo ciclo
    const cicloNuevo = (eq.ciclo_actual || 1) + 1;
    const vecesDevueltoNuevo = (eq.veces_devuelto || 0) + 1;
    
    try {
        // 1. Registrar la devolución
        const { data: devData, error: devError } = await supabaseClient
            .from('equipo_devoluciones')
            .insert([{
                equipo_id: equipoId,
                motivo_devolucion: motivo,
                problemas_reportados: problemasStr,
                ciclo: vecesDevueltoNuevo,
                cliente_que_devolvio: cliente || null,
                diagnostico_inicial: diagnostico || null,
                registrado_por: sessionUser?.nombre || 'Admin'
            }])
            .select()
            .single();
        if(devError) throw devError;
        
        // 2. Actualizar el equipo: estado → en_proceso, contador, técnico, ciclo
        const tecnico = (cache.tecnicos || []).find(t => t.id === tecnicoId);
        const { error: eqError } = await supabaseClient
            .from('equipos_refurbish')
            .update({
                estado_evaluacion: 'en_proceso',
                tecnico_asignado_id: tecnicoId,
                fecha_asignacion: new Date().toISOString(),
                fecha_terminado: null,
                veces_devuelto: vecesDevueltoNuevo,
                ultima_devolucion: new Date().toISOString(),
                ciclo_actual: cicloNuevo
            })
            .eq('id', equipoId);
        if(eqError) throw eqError;
        
        // 3. Historial
        await supabaseClient.from('equipo_historial').insert([{
            equipo_id: equipoId,
            estado_anterior: 'vendido',
            estado_nuevo: 'en_proceso',
            accion: `🔄 Equipo devuelto (${vecesDevueltoNuevo}× total) → asignado a ${tecnico?.nombre || 'técnico'}`,
            notas: `Motivo: ${motivo}${problemasStr ? ' | Problemas: ' + problemasStr : ''}${diagnostico ? ' | Diagnóstico: ' + diagnostico : ''}`,
            usuario: sessionUser?.nombre || 'Admin'
        }]);
        
        toast('🔄 Devolución registrada. Equipo vuelto a "En Proceso".');
        cerrarModalDevolucion();
        await loadAll();
        cargarDevoluciones();
        if(devData?.id) resaltarItemNuevo(devData.id);
    } catch(e) {
        logError('Guardar devolución', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   MÓDULO DE CATÁLOGOS: CATEGORÍAS Y MARCAS
   ============================================================ */
let _categoriasCache = [];
let _marcasCache = [];

async function cargarCatalogosConfig() {
    await Promise.all([cargarCategorias(), cargarMarcas()]);
}

async function cargarCategorias() {
    const cont = document.getElementById('categoriasLista');
    try {
        const { data, error } = await supabaseClient.from('catalogo_categorias').select('*').order('nombre', { ascending: true });
        if(error) throw error;
        _categoriasCache = data || [];
        renderCategorias();
    } catch(e) {
        logError('Cargar categorías', e);
        if(cont) cont.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${escapeHtml(getFriendlyError(e))}</p>`;
    }
}

function renderCategorias() {
    const cont = document.getElementById('categoriasLista');
    if(!cont) return;
    if(_categoriasCache.length === 0) {
        cont.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px; font-size:13px;">No hay categorías. Crea la primera con "+ Nueva Categoría".</p>';
        return;
    }
    cont.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">` + 
        _categoriasCache.map(c => {
            const color = c.color || '#0891b2';
            const icono = c.icono || 'ti-category';
            return `<div data-item-id="${c.id}" style="background:#fff; border:1px solid var(--border-color); border-left:4px solid ${color}; border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ti ${escapeHtml(icono)}" style="color:${color}; font-size:18px;"></i>
                            <b style="font-size:14px;">${escapeHtml(c.nombre)}</b>
                            ${!c.activa ? '<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:9px;">INACTIVA</span>' : ''}
                        </div>
                        ${c.descripcion ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${escapeHtml(c.descripcion)}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:4px; flex-shrink:0;">
                        <button onclick="editarCategoria('${c.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;" title="Editar"><i class="ti ti-edit"></i></button>
                        <button onclick="eliminarCategoria('${c.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:6px 8px; border-radius:6px; cursor:pointer;" title="Eliminar"><i class="ti ti-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('') + `</div>`;
}

function abrirModalCategoria() {
    document.getElementById('mod_cat_id').value = '';
    document.getElementById('mod_cat_nombre').value = '';
    document.getElementById('mod_cat_descripcion').value = '';
    document.getElementById('mod_cat_color').value = '#0891b2';
    document.getElementById('mod_cat_icono').value = 'ti-category';
    document.getElementById('mod_cat_activa').checked = true;
    document.getElementById('modalCategoriaTitulo').textContent = 'Nueva Categoría';
    document.getElementById('modalCategoria').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function editarCategoria(id) {
    const c = _categoriasCache.find(x => x.id === id);
    if(!c) return;
    document.getElementById('mod_cat_id').value = c.id;
    document.getElementById('mod_cat_nombre').value = c.nombre || '';
    document.getElementById('mod_cat_descripcion').value = c.descripcion || '';
    document.getElementById('mod_cat_color').value = c.color || '#0891b2';
    document.getElementById('mod_cat_icono').value = c.icono || 'ti-category';
    document.getElementById('mod_cat_activa').checked = c.activa !== false;
    document.getElementById('modalCategoriaTitulo').textContent = 'Editar Categoría';
    document.getElementById('modalCategoria').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalCategoria() {
    document.getElementById('modalCategoria').classList.remove('active');
}

async function guardarCategoria() {
    const id = document.getElementById('mod_cat_id').value;
    const nombre = document.getElementById('mod_cat_nombre').value.trim();
    if(!nombre) return alert('El nombre es obligatorio.');
    
    const datos = {
        nombre,
        descripcion: document.getElementById('mod_cat_descripcion').value.trim() || null,
        color: document.getElementById('mod_cat_color').value,
        icono: document.getElementById('mod_cat_icono').value,
        activa: document.getElementById('mod_cat_activa').checked
    };
    
    try {
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('catalogo_categorias').update(datos).eq('id', id);
            if(error) throw error;
            toast('✅ Categoría actualizada.');
        } else {
            const { data, error } = await supabaseClient.from('catalogo_categorias').insert([datos]).select().single();
            if(error) throw error;
            nuevoId = data?.id;
            toast('✅ Categoría creada.');
        }
        cerrarModalCategoria();
        await cargarCategorias();
        resaltarItemNuevo(nuevoId);
    } catch(e) {
        logError('Guardar categoría', e);
        alert(getFriendlyError(e));
    }
}

async function eliminarCategoria(id) {
    const c = _categoriasCache.find(x => x.id === id);
    if(!c) return;
    if(!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    try {
        const { error } = await supabaseClient.from('catalogo_categorias').delete().eq('id', id);
        if(error) throw error;
        toast('🗑️ Categoría eliminada.');
        await cargarCategorias();
    } catch(e) {
        logError('Eliminar categoría', e);
        alert(getFriendlyError(e));
    }
}

/* ---------- MARCAS ---------- */
async function cargarMarcas() {
    const cont = document.getElementById('marcasLista');
    try {
        const { data, error } = await supabaseClient.from('catalogo_marcas').select('*').order('nombre', { ascending: true });
        if(error) throw error;
        _marcasCache = data || [];
        renderMarcas();
    } catch(e) {
        logError('Cargar marcas', e);
        if(cont) cont.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${escapeHtml(getFriendlyError(e))}</p>`;
    }
}

function renderMarcas() {
    const cont = document.getElementById('marcasLista');
    if(!cont) return;
    if(_marcasCache.length === 0) {
        cont.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px; font-size:13px;">No hay marcas. Crea la primera con "+ Nueva Marca".</p>';
        return;
    }
    cont.innerHTML = `<div style="display:flex; flex-wrap:wrap; gap:8px;">` + 
        _marcasCache.map(m => {
            return `<div data-item-id="${m.id}" style="background:#fff; border:1px solid var(--border-color); border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:8px;">
                <i class="ti ti-brand-apple" style="color:#6366f1;"></i>
                <b style="font-size:13px; ${m.activa ? '' : 'text-decoration:line-through; color:var(--text-muted);'}">${escapeHtml(m.nombre)}</b>
                ${!m.activa ? '<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:9px;">OFF</span>' : ''}
                <button onclick="editarMarca('${m.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:4px 6px; border-radius:5px; cursor:pointer;" title="Editar"><i class="ti ti-edit"></i></button>
                <button onclick="eliminarMarca('${m.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:4px 6px; border-radius:5px; cursor:pointer;" title="Eliminar"><i class="ti ti-trash"></i></button>
            </div>`;
        }).join('') + `</div>`;
}

function abrirModalMarca() {
    document.getElementById('mod_marca_id').value = '';
    document.getElementById('mod_marca_nombre').value = '';
    document.getElementById('mod_marca_activa').checked = true;
    document.getElementById('modalMarcaTitulo').textContent = 'Nueva Marca';
    document.getElementById('modalMarca').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function editarMarca(id) {
    const m = _marcasCache.find(x => x.id === id);
    if(!m) return;
    document.getElementById('mod_marca_id').value = m.id;
    document.getElementById('mod_marca_nombre').value = m.nombre || '';
    document.getElementById('mod_marca_activa').checked = m.activa !== false;
    document.getElementById('modalMarcaTitulo').textContent = 'Editar Marca';
    document.getElementById('modalMarca').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalMarca() {
    document.getElementById('modalMarca').classList.remove('active');
}

async function guardarMarca() {
    const id = document.getElementById('mod_marca_id').value;
    const nombre = document.getElementById('mod_marca_nombre').value.trim();
    if(!nombre) return alert('El nombre es obligatorio.');
    
    const datos = { nombre, activa: document.getElementById('mod_marca_activa').checked };
    
    try {
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('catalogo_marcas').update(datos).eq('id', id);
            if(error) throw error;
            toast('✅ Marca actualizada.');
        } else {
            const { data, error } = await supabaseClient.from('catalogo_marcas').insert([datos]).select().single();
            if(error) throw error;
            nuevoId = data?.id;
            toast('✅ Marca creada.');
        }
        cerrarModalMarca();
        await cargarMarcas();
        resaltarItemNuevo(nuevoId);
    } catch(e) {
        logError('Guardar marca', e);
        alert(getFriendlyError(e));
    }
}

async function eliminarMarca(id) {
    const m = _marcasCache.find(x => x.id === id);
    if(!m) return;
    if(!confirm(`¿Eliminar la marca "${m.nombre}"?`)) return;
    try {
        const { error } = await supabaseClient.from('catalogo_marcas').delete().eq('id', id);
        if(error) throw error;
        toast('🗑️ Marca eliminada.');
        await cargarMarcas();
    } catch(e) {
        logError('Eliminar marca', e);
        alert(getFriendlyError(e));
    }
}

/* ============================================================
   MÓDULO DE ROLES Y PERMISOS
   ============================================================ */

// Definición de los permisos en grupos
const PERMISOS_DEF = [
    {
        grupo: '🔧 Modo Técnico', color: '#0891b2',
        items: [
            { id: 'solo_mi_trabajo', label: 'SOLO ver la pantalla "Mi Trabajo" (oculta todo lo demás)' },
            { id: 'solo_atencion', label: 'SOLO ver la pantalla "Atención al Cliente" (oculta todo lo demás)' }
        ]
    },
    {
        grupo: '🏪 Atención al Cliente', color: '#0891b2',
        items: [
            { id: 'recepcion_ver', label: 'Ver módulo Recepción de Equipos' },
            { id: 'ordenes_ver', label: 'Ver módulo Órdenes de Trabajo' },
            { id: 'inventario_ver', label: 'Ver módulo Inventario Taller' }
        ]
    },
    {
        grupo: '🛒 Compras', color: '#1e40af',
        items: [
            { id: 'compras_ver', label: 'Ver módulo de Compras' },
            { id: 'compras_crear', label: 'Crear/editar lotes' },
            { id: 'compras_eliminar', label: 'Eliminar lotes' },
            { id: 'compras_ver_costos', label: 'Ver costos de compra' }
        ]
    },
    {
        grupo: '🔧 Reacondicionado', color: '#f59e0b',
        items: [
            { id: 'reacond_ver', label: 'Ver módulo Reacondicionado' },
            { id: 'reacond_ver_todos', label: 'Ver TODOS los equipos (no solo los suyos)' },
            { id: 'reacond_editar_propios', label: 'Editar equipos asignados a él' },
            { id: 'reacond_editar_otros', label: 'Editar equipos de OTROS técnicos' },
            { id: 'piezas_recibir', label: 'Marcar piezas como recibidas (técnico)' },
            { id: 'piezas_entregar', label: 'Marcar piezas como entregadas (admin)' },
            { id: 'piezas_aprobar_extra', label: 'Aprobar piezas extras' },
            { id: 'piezas_agregar_extra', label: 'Agregar piezas adicionales' },
            { id: 'estado_cambiar', label: 'Cambiar estado del equipo' },
            { id: 'estado_despachar', label: 'Marcar como Despachado' }
        ]
    },
    {
        grupo: '🔄 Devoluciones', color: '#dc2626',
        items: [
            { id: 'devoluciones_ver', label: 'Ver devoluciones' },
            { id: 'devoluciones_registrar', label: 'Registrar devoluciones' },
            { id: 'devoluciones_eliminar', label: 'Eliminar devoluciones' }
        ]
    },
    {
        grupo: '📊 Reportes', color: '#0891b2',
        items: [
            { id: 'reportes_ver', label: 'Ver módulo de Reportes de rendimiento' }
        ]
    },
    {
        grupo: '📋 Catálogos', color: '#06b6d4',
        items: [
            { id: 'catalogo_fallas', label: 'Ver/editar Catálogo de Fallas' },
            { id: 'catalogo_fallas_eliminar', label: 'Eliminar fallas' },
            { id: 'catalogo_proveedores', label: 'Ver/editar Proveedores' },
            { id: 'catalogo_proveedores_eliminar', label: 'Eliminar proveedores' },
            { id: 'catalogo_articulos', label: 'Ver/editar Artículos' },
            { id: 'catalogo_articulos_eliminar', label: 'Eliminar artículos' },
            { id: 'catalogo_clientes', label: 'Ver/editar Clientes' },
            { id: 'catalogo_clientes_eliminar', label: 'Eliminar clientes' }
        ]
    },
    {
        grupo: '⚙️ Configuración', color: '#64748b',
        items: [
            { id: 'config_ver', label: 'Ver módulo Configuración' },
            { id: 'config_tecnicos', label: 'Crear/editar Técnicos' },
            { id: 'config_tecnicos_eliminar', label: 'Eliminar técnicos' },
            { id: 'config_roles', label: 'Crear/editar Roles' },
            { id: 'config_roles_eliminar', label: 'Eliminar roles' },
            { id: 'config_impresora', label: 'Configurar impresoras' }
        ]
    },
    {
        grupo: '🖨️ Impresión y Reportes', color: '#7c3aed',
        items: [
            { id: 'imprimir_diag', label: 'Imprimir label diagnóstico' },
            { id: 'imprimir_venta', label: 'Imprimir label de venta' },
            { id: 'ver_dashboard', label: 'Ver Dashboard / KPIs' },
            { id: 'ver_panel_smart', label: '🧠 Ver Panel Inteligente (alertas y tendencias)' },
            { id: 'exportar_excel', label: 'Exportar a Excel' },
            { id: 'ver_auditoria', label: 'Ver auditoría/historial' }
        ]
    },
    {
        grupo: '💬 Comunicación y Ventas', color: '#10b981',
        items: [
            { id: 'comunicacion_whatsapp', label: 'Enviar WhatsApp a clientes' },
            { id: 'ver_datos_personales', label: 'Ver datos personales clientes (whatsapp/cédula)' },
            { id: 'ventas_realizar', label: 'Realizar ventas' },
            { id: 'ventas_descuentos', label: 'Aplicar descuentos' },
            { id: 'ventas_anular', label: 'Anular ventas' },
            { id: 'ventas_cobrar', label: 'Cobrar pagos' },
            { id: 'ventas_cierre_caja', label: 'Cierre de caja' }
        ]
    }
];

let _rolesCache = [];

async function cargarRoles() {
    const cont = document.getElementById('rolesLista');
    if(!cont) return;
    try {
        const { data, error } = await supabaseClient
            .from('roles_taller')
            .select('*')
            .order('es_sistema', { ascending: false })
            .order('nombre', { ascending: true });
        if(error) throw error;
        _rolesCache = data || [];
        renderRoles();
    } catch(e) {
        logError('Cargar roles', e);
        cont.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${escapeHtml(getFriendlyError(e))}</p>`;
    }
}

function renderRoles() {
    const cont = document.getElementById('rolesLista');
    if(!cont) return;
    if(_rolesCache.length === 0) {
        cont.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:30px;">No hay roles. Crea el primero con "+ Nuevo Rol".</p>';
        return;
    }
    
    cont.innerHTML = _rolesCache.map(r => {
        const permisos = r.permisos || {};
        const cantPermisos = Object.values(permisos).filter(v => v === true).length;
        const totalPosibles = PERMISOS_DEF.reduce((s, g) => s + g.items.length, 0);
        const tecnicosConRol = (cache.tecnicos || []).filter(t => t.rol_id === r.id).length;
        
        return `<div class="pieza-card" data-item-id="${r.id}" style="border-left:4px solid ${r.es_sistema ? '#dc2626' : '#6366f1'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <i class="ti ${r.es_sistema ? 'ti-crown' : 'ti-shield'}" style="color:${r.es_sistema ? '#dc2626' : '#6366f1'}; font-size:18px;"></i>
                        <b style="font-size:15px;">${escapeHtml(r.nombre)}</b>
                        ${r.es_sistema ? '<span class="badge" style="background:#fee2e2; color:#991b1b;">SISTEMA</span>' : ''}
                        ${!r.activo ? '<span class="badge" style="background:#fef3c7; color:#92400e;">INACTIVO</span>' : ''}
                    </div>
                    ${r.descripcion ? `<div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${escapeHtml(r.descripcion)}</div>` : ''}
                    <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; font-size:11px;">
                        <span class="badge" style="background:#dbeafe; color:#1e40af;"><i class="ti ti-check"></i> ${cantPermisos}/${totalPosibles} permisos</span>
                        <span class="badge" style="background:#e0e7ff; color:#3730a3;"><i class="ti ti-users"></i> ${tecnicosConRol} técnico${tecnicosConRol === 1 ? '' : 's'}</span>
                    </div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="editarRol('${r.id}')" style="background:#dbeafe; color:#1e40af; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Ver/Editar"><i class="ti ti-edit"></i></button>
                    ${!r.es_sistema ? `<button onclick="eliminarRol('${r.id}')" style="background:#fee2e2; color:#991b1b; border:0; padding:8px 10px; border-radius:6px; cursor:pointer;" title="Eliminar"><i class="ti ti-trash"></i></button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderPermisosCheckboxes(permisos = {}) {
    const cont = document.getElementById('permisosContainer');
    if(!cont) return;
    
    cont.innerHTML = PERMISOS_DEF.map(grupo => {
        const itemsHtml = grupo.items.map(item => {
            const checked = permisos[item.id] === true ? 'checked' : '';
            return `<label style="display:flex; align-items:flex-start; gap:8px; padding:8px; background:#fff; border-radius:6px; cursor:pointer; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                <input type="checkbox" data-permiso="${item.id}" ${checked}>
                <span style="font-size:12px; line-height:1.3;">${escapeHtml(item.label)}</span>
            </label>`;
        }).join('');
        
        return `<details open style="background:${grupo.color}10; border:1px solid ${grupo.color}40; border-radius:10px; padding:10px; margin-bottom:8px;">
            <summary style="cursor:pointer; font-weight:700; font-size:13px; color:${grupo.color}; padding:4px;">${escapeHtml(grupo.grupo)} (${grupo.items.length})</summary>
            <div style="margin-top:8px; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:4px;">
                ${itemsHtml}
            </div>
        </details>`;
    }).join('');
}

function abrirModalRol() {
    document.getElementById('mod_rol_id').value = '';
    document.getElementById('mod_rol_nombre').value = '';
    document.getElementById('mod_rol_descripcion').value = '';
    document.getElementById('mod_rol_activo').checked = true;
    document.getElementById('modalRolTitulo').textContent = 'Nuevo Rol';
    renderPermisosCheckboxes({});
    document.getElementById('modalRol').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function editarRol(id) {
    const r = _rolesCache.find(x => x.id === id);
    if(!r) return;
    document.getElementById('mod_rol_id').value = r.id;
    document.getElementById('mod_rol_nombre').value = r.nombre || '';
    document.getElementById('mod_rol_descripcion').value = r.descripcion || '';
    document.getElementById('mod_rol_activo').checked = r.activo !== false;
    document.getElementById('modalRolTitulo').textContent = r.es_sistema ? `Ver Rol: ${r.nombre}` : 'Editar Rol';
    renderPermisosCheckboxes(r.permisos || {});
    
    // Si es del sistema, deshabilitar nombre y permisos
    document.getElementById('mod_rol_nombre').disabled = !!r.es_sistema;
    
    document.getElementById('modalRol').classList.add('active');
    if(typeof inyectarBotonesVolver === 'function') inyectarBotonesVolver();
}

function cerrarModalRol() {
    document.getElementById('modalRol').classList.remove('active');
    document.getElementById('mod_rol_nombre').disabled = false;
}

function rolToggleTodos(marcar) {
    document.querySelectorAll('#permisosContainer input[type="checkbox"]').forEach(cb => {
        cb.checked = marcar;
    });
}

async function guardarRol() {
    const id = document.getElementById('mod_rol_id').value;
    const nombre = document.getElementById('mod_rol_nombre').value.trim();
    const descripcion = document.getElementById('mod_rol_descripcion').value.trim() || null;
    const activo = document.getElementById('mod_rol_activo').checked;
    
    if(!nombre) return alert('El nombre del rol es obligatorio.');
    
    // Construir objeto de permisos
    const permisos = {};
    document.querySelectorAll('#permisosContainer input[type="checkbox"]').forEach(cb => {
        permisos[cb.dataset.permiso] = cb.checked;
    });
    
    // Si es rol del sistema, no permitir cambiar nombre
    const rolExistente = id ? _rolesCache.find(r => r.id === id) : null;
    if(rolExistente?.es_sistema) {
        // Solo actualizar permisos y descripción
        try {
            const { error } = await supabaseClient
                .from('roles_taller')
                .update({ descripcion, permisos, activo })
                .eq('id', id);
            if(error) throw error;
            toast('✅ Rol del sistema actualizado.');
            cerrarModalRol();
            await cargarRoles();
            resaltarItemNuevo(id);
        } catch(e) {
            logError('Actualizar rol sistema', e);
            alert(getFriendlyError(e));
        }
        return;
    }
    
    const datos = { nombre, descripcion, permisos, activo };
    
    try {
        let nuevoId = id;
        if(id) {
            const { error } = await supabaseClient.from('roles_taller').update(datos).eq('id', id);
            if(error) throw error;
            toast('✅ Rol actualizado.');
        } else {
            const { data, error } = await supabaseClient.from('roles_taller').insert([datos]).select().single();
            if(error) throw error;
            nuevoId = data?.id;
            toast('✅ Rol creado.');
        }
        cerrarModalRol();
        await cargarRoles();
        resaltarItemNuevo(nuevoId);
    } catch(e) {
        logError('Guardar rol', e);
        alert(getFriendlyError(e));
    }
}

async function eliminarRol(id) {
    const r = _rolesCache.find(x => x.id === id);
    if(!r) return;
    if(r.es_sistema) return alert('No se puede eliminar el rol del sistema.');
    
    // Verificar si hay técnicos con este rol
    const tecnicosConRol = (cache.tecnicos || []).filter(t => t.rol_id === id);
    if(tecnicosConRol.length > 0) {
        return alert(`No se puede eliminar: ${tecnicosConRol.length} técnico(s) tienen este rol asignado. Primero cambia el rol de esos técnicos.`);
    }
    
    if(!confirm(`¿Eliminar el rol "${r.nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
        const { error } = await supabaseClient.from('roles_taller').delete().eq('id', id);
        if(error) throw error;
        toast('🗑️ Rol eliminado.');
        await cargarRoles();
    } catch(e) {
        logError('Eliminar rol', e);
        alert(getFriendlyError(e));
    }
}

function renderRefurbishItems() {
    const cont = document.getElementById("refurbListContainer");
    if(!cont) return; // El módulo viejo ya no existe, salir silenciosamente
    if(!cache.refurb.length) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; font-size:13px; margin-top:20px;">No hay equipos en reacondicionamiento.</p>`;
        return;
    }
    cont.innerHTML = cache.refurb.map(item => {
        const costoTotal = (item.costo_compra || 0) + (item.costo_repuestos || 0);
        const margen = (item.precio_venta_estimado || 0) - costoTotal;
        const piezasOpciones = cache.piezas.map(p => `<option value="${escapeHtml(p.id)}[SPLIT]${escapeHtml(p.costo)}">${escapeHtml(p.nombre)} (Stock: ${escapeHtml(p.cantidad)})</option>`).join("");
        return `<div class="refurb-item-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:14px; color:var(--blue-btn);">${escapeHtml(item.modelo)}</b>
                <span class="badge" style="background:#fef3c7; color:#d97706;">${item.estado}</span>
            </div>
            <small style="color:var(--text-muted); display:block; margin:2px 0 8px 0;">IMEI: ${escapeHtml(item.imei)}</small>
            <table style="width:100%; font-size:11px; margin-bottom:10px; border:1px solid #cbd5e1;">
                <tr><td>Costo Compra:</td><td><b>${money(item.costo_compra)}</b></td></tr>
                <tr><td>Inversión Piezas:</td><td style="color:#ef4444;"><b>+ ${money(item.costo_repuestos)}</b></td></tr>
                <tr style="background:#f1f5f9;"><td>Costo Total:</td><td><b>${money(costoTotal)}</b></td></tr>
                <tr><td>P. Venta Estimado:</td><td style="color:#0044aa;"><b>${money(item.precio_venta_estimado)}</b></td></tr>
                <tr style="background:#d1fae5;"><td>Margen:</td><td style="color:#065f46;"><b>${money(margen)}</b></td></tr>
            </table>
            <div style="display:flex; gap:6px; align-items:center; background:#fff; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
                <select id="sel_pz_${item.id}" style="font-size:11px; padding:4px;">
                    <option value="">-- Cargar Repuesto Usado --</option>
                    ${piezasOpciones}
                </select>
                <button class="btn btn-dark" style="padding:4px 8px; font-size:11px;" onclick="inyectarRepuestoARefurb('${item.id}')">Aplicar</button>
            </div>
            <div style="margin-top:8px; display:flex; gap:6px;">
                <button class="btn btn-blue" style="flex:1; padding:5px; font-size:11px;" onclick="enviarRefurbALabel('${item.id}')"><i class="ti ti-barcode"></i> Enviar a Etiquetadora</button>
            </div>
        </div>`;
    }).join("");
}

async function inyectarRepuestoARefurb(itemId) {
    const selectVal = document.getElementById("sel_pz_" + itemId).value;
    if(!selectVal) return alert("Selecciona una refacción.");
    const parts = selectVal.split("[SPLIT]");
    const piezaId = parts[0];
    const costoPieza = parseFloat(parts[1]) || 0;
    try {
        const equipo = cache.refurb.find(x => x.id === itemId);
        const nuevoCostoRepuestos = (equipo.costo_repuestos || 0) + costoPieza;
        const updRef = await supabaseClient.from('equipos_refurbish').update({ costo_repuestos: nuevoCostoRepuestos }).eq('id', itemId);
        requireSupabaseOk(updRef, 'Actualizar costo refurbish');
        const piezaOriginal = cache.piezas.find(x => x.id === piezaId);
        if(piezaOriginal) {
            const nuevoStock = Math.max(0, (piezaOriginal.cantidad || 1) - 1);
            const updPieza = await supabaseClient.from('piezas_inventario').update({ cantidad: nuevoStock }).eq('id', piezaId);
            requireSupabaseOk(updPieza, 'Actualizar stock pieza');
        }
        toast("Repuesto aplicado.");
        await loadAll();
    } catch(e) { logError("Procesar repuesto", e); alert(getFriendlyError(e)); }
}

function enviarRefurbALabel(id) {
    const item = cache.refurb.find(x => x.id === id);
    if(!item) return;
    const art = findArticulo(item.articulo_id);
    const marca = art.marca || item.marca || "";
    const modelo = art.modelo || item.modelo || "";
    const capacidad = art.capacidad || item.capacidad || "";
    const referencia = art.referencia || "";
    document.getElementById("lbl_marca").value = marca || "Generic";
    document.getElementById("lbl_modelo").value = `${marca} ${modelo} ${capacidad} ${referencia}`.trim().replace(/\s+/g, ' ');
    document.getElementById("lbl_imei").value = item.imei || "";
    document.getElementById("lbl_estado_texto").value = "";
    actualizarLabelLive();
    nav("etiquetas");
}

async function cargarEnLabel(id) {
    const o = cache.ordenes.find(x => x.id === id);
    if(!o) return;
    // Para órdenes de cliente: mostrar el label de DIAGNÓSTICO con las fallas (no código de barras)
    await abrirPreviewLabelDiagOrden(o);
}

// Genera y muestra el label de diagnóstico para una ORDEN DE CLIENTE
async function abrirPreviewLabelDiagOrden(orden) {
    const eq = findEquipo(orden.equipo_id);
    const cli = findCliente(orden.cliente_id);
    const w = localStorage.getItem('bayol_dlbl_w') || '51';
    const h = localStorage.getItem('bayol_dlbl_h') || '25';
    const f = localStorage.getItem('bayol_dlbl_f') || '10';
    
    const cliente = (cli.nombre || 'SIN CLIENTE').toUpperCase();
    const marca = (eq.marca || '').toUpperCase();
    const modelo = (eq.modelo || '').toUpperCase();
    const capacidad = (eq.capacidad || '').toUpperCase();
    const imei = (eq.imei || 'SIN IMEI').toUpperCase();
    const fecha = new Date().toLocaleDateString('es-DO');
    const modeloCorto = `${marca} ${modelo} ${capacidad}`.replace(/\s+/g, ' ').trim();
    
    // Reunir fallas: del texto libre (falla_reportada) + de las tareas de la orden
    const fallasTexto = (orden.falla_reportada || '').split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean);
    const fallasTareas = (cache.tareas || [])
        .filter(t => t.tipo === 'orden' && t.ref_id === orden.id)
        .map(t => (t.descripcion || '').trim())
        .filter(Boolean);
    // Combinar sin duplicar (comparando en minúsculas)
    const vistas = new Set();
    const todasFallas = [];
    [...fallasTexto, ...fallasTareas].forEach(fa => {
        const k = fa.toLowerCase();
        if(!vistas.has(k)) { vistas.add(k); todasFallas.push(fa); }
    });
    // Letra base más grande para orden de servicio
    const fBase = Math.max(parseInt(f), 12);
    const fmenor = Math.max(10, fBase - 1);
    let fallasHtml = '';
    if(todasFallas.length > 0) {
        const columnas = todasFallas.length >= 5 ? 2 : 1;
        const items = todasFallas.map(t =>
            `<div style="font-size:${fmenor}px; font-weight:900; -webkit-text-stroke:0.3px #000; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">☐ ${escapeHtml(t.toUpperCase())}</div>`
        ).join('');
        fallasHtml = `
            <div style="border-top:2px dashed #000; padding-top:0.5mm; margin-top:0.5mm;">
                <div style="font-size:${fmenor}px; font-weight:900; -webkit-text-stroke:0.3px #000; margin-bottom:1px; text-align:left;">REVISAR / REPARAR:</div>
                <div style="display:grid; grid-template-columns:repeat(${columnas}, 1fr); gap:0 6px; text-align:left;">${items}</div>
            </div>`;
    }
    
    const labelHtml = `
        <div class="diag-label" style="width:${w}mm; height:${h}mm; font-size:${fBase}px; font-weight:900; -webkit-text-stroke:0.4px #000; line-height:1.22; padding:1mm; box-sizing:border-box; overflow:hidden; font-family:Arial,Helvetica,sans-serif; color:#000; text-align:left;">
            <div style="font-size:${fBase}px; font-weight:900; -webkit-text-stroke:0.4px #000; text-align:center; border-bottom:2px solid #000; padding-bottom:0.5mm; margin-bottom:0.5mm;">ORDEN DE SERVICIO</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; text-align:left;">${formatoOrden(orden.numero_orden)}</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; text-align:left;">CLIENTE: ${escapeHtml(cliente)}</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; text-align:left;">${escapeHtml(modeloCorto)}</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; text-align:left;">IMEI: ${escapeHtml(imei)}</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; text-align:left;">FECHA: ${escapeHtml(fecha)}</div>
            ${fallasHtml}
        </div>
    `;
    
    // Reusar el modal de label de diagnóstico existente
    _labelDiagHtmlActual = labelHtml;
    _labelDiagEquipoActual = null;
    _labelDiagEquiposLote = null;
    _labelDiagOrdenActual = orden;
    document.getElementById('labelDiagPreview').innerHTML = labelHtml;
    document.getElementById('labelDiagInfo').textContent = 'Se imprimirá 1 label de orden de servicio';
    document.getElementById('modalLabelTitulo').textContent = 'Label Orden de Servicio · ' + formatoOrden(orden.numero_orden);
    document.getElementById('diag_copias').value = 1;
    document.getElementById('modalLabelDiag').classList.add('active');
}

/* LÓGICA DE ETIQUETAS */
function cambiarDimensionesManual() {
    const w = document.getElementById("cfg_width").value;
    const h = document.getElementById("cfg_height").value;
    const f = document.getElementById("cfg_font").value;
    const bh = document.getElementById("cfg_barcode_h").value;
    const rot = document.getElementById("cfg_rotacion")?.value || '0';
    document.getElementById("val_w").textContent = w + "mm";
    document.getElementById("val_h").textContent = h + "mm";
    document.getElementById("val_font").textContent = f + "px";
    document.getElementById("val_bar").textContent = bh + "px";
    const card = document.getElementById("labelCard");
    if(card) { card.style.width = w + "mm"; card.style.fontSize = f + "px"; }
    const bar = document.getElementById("lblLiveBarcode");
    if(bar) bar.style.fontSize = bh + "px";
    // Guardar en localStorage para que recuerde la calibración
    localStorage.setItem('bayol_lbl_w', w);
    localStorage.setItem('bayol_lbl_h', h);
    localStorage.setItem('bayol_lbl_f', f);
    localStorage.setItem('bayol_lbl_bh', bh);
    localStorage.setItem('bayol_lbl_rot', rot);
}

function cargarCalibracionLabelVenta() {
    const w = localStorage.getItem('bayol_lbl_w');
    const h = localStorage.getItem('bayol_lbl_h');
    const f = localStorage.getItem('bayol_lbl_f');
    const bh = localStorage.getItem('bayol_lbl_bh');
    const rot = localStorage.getItem('bayol_lbl_rot') || '0';
    if(w) document.getElementById("cfg_width").value = w;
    if(h) document.getElementById("cfg_height").value = h;
    if(f) document.getElementById("cfg_font").value = f;
    if(bh) document.getElementById("cfg_barcode_h").value = bh;
    if(document.getElementById("cfg_rotacion")) document.getElementById("cfg_rotacion").value = rot;
    cambiarDimensionesManual();
    cargarOrientacionPreferida();
}

function presetLabel2x1() {
    document.getElementById("cfg_width").value = 51;
    document.getElementById("cfg_height").value = 25;
    document.getElementById("cfg_font").value = 10;
    document.getElementById("cfg_barcode_h").value = 35;
    cambiarDimensionesManual();
    toast('Preset 2x1 pulgadas aplicado.');
}

function presetLabel1x2() {
    document.getElementById("cfg_width").value = 25;
    document.getElementById("cfg_height").value = 51;
    document.getElementById("cfg_font").value = 9;
    document.getElementById("cfg_barcode_h").value = 30;
    cambiarDimensionesManual();
    toast('Preset 1x2 pulgadas aplicado.');
}

function aplicarOrientacionConfig(orient) {
    if(orient === '2x1') {
        presetLabel2x1();
    } else {
        presetLabel1x2();
    }
    // Guardar preferencia
    localStorage.setItem('bayol_orientacion_preferida', orient);
    // Actualizar UI: marcar botón activo
    document.querySelectorAll('.btn-orientacion').forEach(b => {
        b.classList.toggle('activo', b.dataset.orient === orient);
    });
}

function cargarOrientacionPreferida() {
    const pref = localStorage.getItem('bayol_orientacion_preferida') || '2x1';
    document.querySelectorAll('.btn-orientacion').forEach(b => {
        b.classList.toggle('activo', b.dataset.orient === pref);
    });
}

/* Envuelve un contenido en un wrapper rotado para imprimir.
   En 90°/270° INTERCAMBIA W×H del papel (porque el papel físico cambia de orientación).
   Devuelve { html, anchoFinal, altoFinal } con las dimensiones FINALES del papel. */
function aplicarRotacionImpresion(htmlContenido, anchoMm, altoMm, rotacion) {
    rotacion = parseInt(rotacion) || 0;
    
    if(rotacion === 0) {
        return { html: htmlContenido, anchoFinal: anchoMm, altoFinal: altoMm };
    }
    
    // Para 90° y 270°: el PAPEL FINAL tiene W×H intercambiados
    // Ejemplo: 51×25 (2x1 horizontal) → 25×51 (1x2 vertical)
    if(rotacion === 90 || rotacion === 270) {
        const papelW = altoMm;   // el ancho del papel ahora es el alto original
        const papelH = anchoMm;  // el alto del papel ahora es el ancho original
        // El contenido se renderiza con el tamaño original (anchoMm × altoMm) y se rota
        // para encajar en el nuevo papel (papelW × papelH)
        const translateX = (rotacion === 90) ? papelW : 0;
        const translateY = (rotacion === 90) ? 0 : papelH;
        const htmlRotado = `
            <div style="width:${papelW}mm; height:${papelH}mm; position:relative; overflow:hidden;">
                <div style="width:${anchoMm}mm; height:${altoMm}mm; position:absolute; top:0; left:0; transform:translate(${translateX}mm, ${translateY}mm) rotate(${rotacion}deg); transform-origin:0 0;">
                    ${htmlContenido}
                </div>
            </div>
        `;
        return { html: htmlRotado, anchoFinal: papelW, altoFinal: papelH };
    }
    
    // Para 180°: mismas dimensiones, rotar todo
    if(rotacion === 180) {
        const htmlRotado = `
            <div style="width:${anchoMm}mm; height:${altoMm}mm; position:relative; overflow:hidden;">
                <div style="width:${anchoMm}mm; height:${altoMm}mm; position:absolute; top:0; left:0; transform:rotate(180deg); transform-origin:center center;">
                    ${htmlContenido}
                </div>
            </div>
        `;
        return { html: htmlRotado, anchoFinal: anchoMm, altoFinal: altoMm };
    }
    
    return { html: htmlContenido, anchoFinal: anchoMm, altoFinal: altoMm };
}

function actualizarLabelLive() {
    const marca = document.getElementById("lbl_marca").value.toLowerCase();
    const mod = document.getElementById("lbl_modelo").value;
    const imei = document.getElementById("lbl_imei").value;
    const estado = document.getElementById("lbl_estado_texto").value;
    document.getElementById("lblLiveMod").textContent = mod;
    document.getElementById("lblLiveImei").textContent = imei;
    const liveBar = document.getElementById("lblLiveBarcode");
    if(liveBar) {
        const bh = parseInt(document.getElementById('cfg_barcode_h')?.value) || 35;
        const imgB = generarBarcodeImg(imei || '000000000', bh);
        liveBar.innerHTML = imgB ? `<img src="${imgB}" style="height:${bh}px; max-width:100%;" />` : `${imei || '000000000'}`;
    }
    document.getElementById("lblLiveEstadoContainer").textContent = estado;
    document.getElementById("lblLiveLogo").innerHTML = (marca.includes("apple") || marca.includes("iphone")) ? `<i class="ti ti-brand-apple"></i>` : `<i class="ti ti-device-mobile"></i>`;
    cambiarDimensionesManual();
}

async function imprimirLabelAdhesivo() {
    const mod = document.getElementById("lbl_modelo").value;
    const imei = document.getElementById("lbl_imei").value;
    const estadoText = document.getElementById("lbl_estado_texto").value;
    const logoHtml = document.getElementById("lblLiveLogo").innerHTML;
    const configW = parseInt(document.getElementById("cfg_width").value);
    const configH = parseInt(document.getElementById("cfg_height").value);
    const configF = document.getElementById("cfg_font").value;
    const configBH = document.getElementById("cfg_barcode_h").value;
    const rotacion = parseInt(document.getElementById("cfg_rotacion")?.value) || 0;
    const copias = document.getElementById("lbl_copias")?.value || 1;
    
    // Guardar calibración en localStorage para próximas impresiones
    localStorage.setItem('bayol_lbl_w', configW);
    localStorage.setItem('bayol_lbl_h', configH);
    localStorage.setItem('bayol_lbl_f', configF);
    localStorage.setItem('bayol_lbl_bh', configBH);
    localStorage.setItem('bayol_lbl_rot', rotacion);
    
    const contenidoLabel = `
        <div style="width:${configW}mm; height:${configH}mm; padding:2px; font-family:Arial,Helvetica,sans-serif; font-weight:900; -webkit-text-stroke:0.4px #000; text-align:center; color:#000; font-size:${configF}px; box-sizing:border-box; overflow:hidden;">
            <div style="font-size:${parseInt(configF) + 6}px; line-height:1;">${logoHtml}</div>
            <div style="border-bottom:2px solid #000; margin:2px 0;"></div>
            <div style="text-align:left; line-height: 1.2; font-weight:900; -webkit-text-stroke:0.4px #000;">
                EQUIPO: ${escapeHtml(mod)}<br>
                IMEI: ${escapeHtml(imei)}
            </div>
            <div style="margin:2px 0; display:flex; justify-content:center;">${(function(){ const b=generarBarcodeImg(imei, configBH); return b?`<img src="${b}" style="height:${configBH}px; max-width:95%;" />`:escapeHtml(imei); })()}</div>
            <div style="text-transform:uppercase; display:block; font-weight:900; -webkit-text-stroke:0.4px #000; font-size:${parseInt(configF) - 1}px;">${escapeHtml(estadoText)}</div>
        </div>
    `;
    
    // Aplicar rotación si está configurada
    const { html: contenidoFinal, anchoFinal, altoFinal } = aplicarRotacionImpresion(contenidoLabel, configW, configH, rotacion);
    
    // === MÉTODO IMAGEN (negrita marcada, igual a la vista previa) ===
    const metodo = localStorage.getItem('bayol_metodo_impresion') || 'imagen';
    if(metodo === 'imagen' && _qzConectado && typeof html2canvas === 'function') {
        const cont = document.createElement('div');
        cont.style.position = 'fixed';
        cont.style.left = '-9999px';
        cont.style.top = '0';
        cont.style.background = '#fff';
        cont.innerHTML = contenidoFinal;
        document.body.appendChild(cont);
        const labelEl = cont.firstElementChild || cont;
        const ok = await qzImprimirHtmlComoImagen(labelEl, anchoFinal, altoFinal, copias, 'labels');
        document.body.removeChild(cont);
        if(ok) { toast('🖨️ Label enviado (negrita marcada).'); return; }
    }
    
    const labelHtml = `
        <style>
            @page { size: ${anchoFinal}mm ${altoFinal}mm; margin: 0; }
            @media print {
                body { margin: 0; padding: 0; }
                .print-area { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        ${contenidoFinal}
    `;
    imprimirContenido(labelHtml, copias, anchoFinal, altoFinal);
}

function togglePasswordField(inputId, boton) {
    const input = document.getElementById(inputId);
    if(!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    boton.innerHTML = visible ? '<i class="ti ti-eye"></i> Mostrar' : '<i class="ti ti-eye-off"></i> Ocultar';
}

function togglePatternPanel() {
    const panel = document.getElementById('patternPanel');
    const tipo = val('o_acceso');
    if(!panel) return;
    if(tipo === 'Patrón') panel.classList.add('active');
    else { panel.classList.remove('active'); clearPattern(); }
}

function getPatternSequence() { return val('o_patron_secuencia'); }

function setPatternSequence(seq) {
    const hidden = document.getElementById('o_patron_secuencia');
    if(hidden) hidden.value = seq;
    document.querySelectorAll('.pattern-dot').forEach(btn => {
        btn.classList.toggle('active', seq.split('-').includes(btn.dataset.dot));
    });
    const summary = document.getElementById('patternSummary');
    if(summary) summary.textContent = seq ? `Secuencia marcada: ${seq}` : 'Sin patrón marcado';
}

function selectPatternDot(num) {
    const current = getPatternSequence().split('-').filter(Boolean);
    const value = String(num);
    if(current.includes(value)) return;
    current.push(value);
    setPatternSequence(current.join('-'));
}

function undoPatternDot() {
    const current = getPatternSequence().split('-').filter(Boolean);
    current.pop();
    setPatternSequence(current.join('-'));
}

function clearPattern() { setPatternSequence(''); }

function hasSensitiveAccessData() {
    return !!(val('o_clave') || val('o_apple_password') || val('o_google_password') || val('o_samsung_password') || getPatternSequence());
}

function buildTicketHtml(orden, incluirCredenciales) {
    return `
        <div class="ticket-box">
            <h2>BAYOL CELL</h2>
            <div style="text-align:center;font-weight:bold;">TICKET DE RECEPCIÓN</div>
            <div class="line"></div>
            <b>Orden:</b> ${escapeHtml(orden?.numero_orden != null ? formatoOrden(orden.numero_orden) : (orden?.id || ''))}<br>
            <b>Cliente:</b> ${escapeHtml(val('c_nombre'))}<br>
            <b>WhatsApp:</b> ${escapeHtml(val('c_whatsapp'))}<br>
            <b>Cédula:</b> ${escapeHtml(val('c_cedula') || 'N/A')}<br>
            <div class="line"></div>
            <b>Equipo:</b> ${escapeHtml(val('e_marca'))} ${escapeHtml(val('e_modelo'))}<br>
            <b>Capacidad:</b> ${escapeHtml(val('e_capacidad') || 'N/A')}<br>
            <b>IMEI / Serial:</b> ${escapeHtml(val('e_imei'))}<br>
            <b>Falla:</b> ${escapeHtml(val('o_falla') || 'N/A')}<br>
            <b>Condición física:</b> ${escapeHtml(val('o_estado_fisico') || 'Sin marcas')}<br>
            <b>Accesorios:</b> ${escapeHtml(val('o_accesorios') || 'Ninguno')}<br>
            <b>Tipo de bloqueo:</b> ${escapeHtml(val('o_acceso') || 'N/A')}<br>
            <b>Atendido por:</b> ${escapeHtml(sessionUser?.nombre || sessionUser?.usuario || '—')}<br>
            <div class="line"></div>
            <b>Seguridad:</b>
            <div class="ticket-sensitive">${buildTicketSecurityHtml(incluirCredenciales)}</div>
            <div class="line"></div>
            <div class="small">El cliente autoriza diagnóstico y manipulación técnica del equipo recibido.</div>
            <br><br>
            ___________________________<br>
            Firma del cliente
        </div>
    `;
}

function buildTicketSecurityHtml(incluirCredenciales) {
    if(!incluirCredenciales) {
        return `<div class="cred-line">Credenciales suministradas: <b>${hasSensitiveAccessData() ? 'SÍ' : 'NO'}</b></div>`;
    }
    const lines = [];
    const add = (label, value) => { if(value) lines.push(`<div class="cred-line"><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`); };
    add('PIN / patrón / contraseña del equipo', val('o_clave'));
    add('Apple ID / correo', val('o_apple_id'));
    add('Contraseña Apple ID', val('o_apple_password'));
    add('Cuenta Google / Gmail', val('o_google_account'));
    add('Contraseña Google', val('o_google_password'));
    add('Cuenta Samsung', val('o_samsung_account'));
    add('Contraseña Samsung', val('o_samsung_password'));
    let html = lines.length ? lines.join('') : '<div class="cred-line">Sin clave registrada</div>';
    if(val('o_acceso') === 'Patrón' && getPatternSequence()) html += renderPatternTicketHtml(getPatternSequence());
    return html;
}

function renderPatternTicketHtml(sequence) {
    const seq = String(sequence || '').split('-').map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 9);
    if(!seq.length) return '';
    const coords = { 1:[25,25], 2:[60,25], 3:[95,25], 4:[25,60], 5:[60,60], 6:[95,60], 7:[25,95], 8:[60,95], 9:[95,95] };
    const lineParts = [];
    for(let i=0; i<seq.length-1; i++) {
        const a = coords[seq[i]], b = coords[seq[i+1]];
        if(a && b) lineParts.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#000" stroke-width="3" stroke-linecap="round" />`);
    }
    const dots = Object.entries(coords).map(([n, c]) => {
        const active = seq.includes(parseInt(n, 10));
        return `<circle cx="${c[0]}" cy="${c[1]}" r="8" fill="${active ? '#000' : '#fff'}" stroke="#000" stroke-width="2" />`;
    }).join('');
    return `<div class="ticket-pattern-wrap"><div class="ticket-pattern-title">Patrón visual</div><svg class="ticket-pattern-svg" viewBox="0 0 120 120">${lineParts.join('')}${dots}</svg><div class="ticket-pattern-seq">Secuencia: ${escapeHtml(seq.join('-'))}</div></div>`;
}

function imprimirTicketRecepcion(orden, incluirCredenciales) {
    const ticketHtml = buildTicketHtml(orden, incluirCredenciales);
    imprimirContenido(ticketHtml, 1, 76, null, 'tickets');
}

function buildAccessPayload() {
    const lines = [];
    const add = (label, value) => { if(value) lines.push(`${label}: ${value}`); };
    add('Tipo de bloqueo', val('o_acceso'));
    if(val('o_acceso') === 'Patrón') add('Patrón visual', getPatternSequence());
    add('PIN / patrón / contraseña del equipo', val('o_clave'));
    add('Apple ID / correo', val('o_apple_id'));
    add('Contraseña Apple ID', val('o_apple_password'));
    add('Cuenta Google / Gmail', val('o_google_account'));
    add('Contraseña Google', val('o_google_password'));
    add('Cuenta Samsung', val('o_samsung_account'));
    add('Contraseña Samsung', val('o_samsung_password'));
    return lines.length ? lines.join('\n') : 'Sin clave registrada';
}

function buildAccountSummary() {
    const accounts = [];
    if(val('o_apple_id')) accounts.push(`Apple: ${val('o_apple_id')}`);
    if(val('o_google_account')) accounts.push(`Google: ${val('o_google_account')}`);
    if(val('o_samsung_account')) accounts.push(`Samsung: ${val('o_samsung_account')}`);
    return accounts.length ? accounts.join(' | ') : null;
}

function formatAccessDetails(o) {
    const sensitive = o.clave_equipo || 'Sin clave registrada';
    const account = o.cuenta_icloud_google ? `\nCuenta registrada: ${o.cuenta_icloud_google}` : '';
    if(String(sensitive).includes('Apple ID') || String(sensitive).includes('Cuenta Google') || String(sensitive).includes('Cuenta Samsung')) return sensitive;
    return `${sensitive}${account}`.trim();
}

async function revelarClave(ordenId, boton) {
    const o = cache.ordenes.find(x => x.id === ordenId);
    if(!o) return;
    const container = boton.parentElement;
    const isVisible = container.dataset.visible === '1';
    if(isVisible) {
        container.dataset.visible = '0';
        container.innerHTML = `•••• <button class="btn btn-light" style="padding:1px 4px; font-size:10px" onclick="revelarClave('${ordenId}', this)">Mostrar</button>`;
        return;
    }
    container.dataset.visible = '1';
    container.innerHTML = `<div class="access-reveal-box">${escapeHtml(formatAccessDetails(o))}</div><button class="btn btn-light" style="padding:1px 4px; font-size:10px; margin-top:4px;" onclick="revelarClave('${ordenId}', this)">Ocultar</button>`;
}

async function guardarRecepcion(imprimir) {
    try {
        if(!val("c_nombre") || !val("c_whatsapp") || !val("e_marca") || !val("e_modelo") || !val("e_imei")) return alert("Faltan campos mandatorios.");
        const insC = await supabaseClient.from('clientes').insert([{ nombre: val("c_nombre"), whatsapp: val("c_whatsapp") || null, cedula: val("c_cedula") || null }]).select().single();
        requireSupabaseOk(insC, 'Crear cliente');
        const insE = await supabaseClient.from('equipos').insert([{ cliente_id: insC.data.id, marca: val("e_marca") || 'Generic', modelo: val("e_modelo"), imei: val("e_imei"), capacidad: val("e_capacidad") || null }]).select().single();
        requireSupabaseOk(insE, 'Crear equipo');
        const fallasCheck = getChecked("checksFisico"); // las fallas marcadas (problemas a reparar)
        const insO = await supabaseClient.from('ordenes_reparacion').insert([{
            cliente_id: insC.data.id, equipo_id: insE.data.id, falla_reportada: val("o_falla"), condicion_fisica: val("o_estado_fisico") || 'Sin marcas', accesorios_recibidos: val("o_accesorios") || 'Ninguno',
            tipo_acceso: val("o_acceso"), clave_equipo: buildAccessPayload(), cuenta_icloud_google: buildAccountSummary(), creado_by: sessionUser.id, estado: 'recibido'
        }]).select().single();
        requireSupabaseOk(insO, 'Crear orden');
        toast("Equipo registrado.");
        // Crear tareas automáticas desde: falla escrita + fallas marcadas en el checklist
        const fallasDesdeTexto = (val("o_falla") || '').split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean);
        const fallasDesdeCheck = fallasCheck ? fallasCheck.split(',').map(s => s.trim()).filter(Boolean) : [];
        const todasFallas = [...fallasDesdeTexto, ...fallasDesdeCheck];
        if(todasFallas.length > 0) {
            await crearTareasDesdeFallas('orden', insO.data.id, todasFallas);
        }
        if(imprimir) {
            const imprimirCredenciales = hasSensitiveAccessData() ? confirm("¿Imprimir credenciales en el ticket?") : false;
            imprimirTicketRecepcion(insO.data, imprimirCredenciales);
        }
        limpiarRecepcion();
        await loadAll();
        nav("ordenes");
    } catch(e) { logError("Guardar recepción", e); alert(getFriendlyError(e)); }
}

function limpiarRecepcion() {
    document.querySelectorAll("#v-recepcion input, #v-recepcion textarea").forEach(x => x.value = "");
    document.querySelectorAll("#v-recepcion input[type='checkbox']").forEach(x => x.checked = false);
    const tipo = document.getElementById('o_acceso');
    if(tipo) tipo.value = 'PIN';
    clearPattern();
    togglePatternPanel();
}

function startAppRefurbPoller() {
    if(refreshTimer) clearInterval(refreshTimer);
    // RESPALDO: poller cada 30s (funciona aunque Realtime no esté activo).
    // Solo recarga si NO hay un modal abierto (para no interrumpir formularios).
    refreshTimer = setInterval(() => {
        if(sessionUser && !hayModalAbierto()) loadAll();
    }, 30000);
    // Intentar activar Supabase Realtime (tiempo real de verdad)
    iniciarRealtime();
}

// Detecta si hay algún modal abierto (para no interrumpir al usuario)
function hayModalAbierto() {
    return document.querySelector('.modal-backdrop.active') !== null;
}

let _realtimeChannel = null;
let _realtimeDebounce = null;

function iniciarRealtime() {
    // Si ya hay un canal, no duplicar
    if(_realtimeChannel) return;
    if(!supabaseClient || typeof supabaseClient.channel !== 'function') return;
    
    try {
        // Escuchar cambios en TODAS las tablas principales
        _realtimeChannel = supabaseClient
            .channel('bayol-realtime')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                // Recarga inteligente: con debounce para no saturar,
                // y sin interrumpir si hay un modal abierto
                onCambioRealtime(payload);
            })
            .subscribe((status) => {
                if(status === 'SUBSCRIBED') {
                    console.log('✅ Realtime activo - cambios en tiempo real');
                }
            });
    } catch(e) {
        // Si Realtime no está activo en Supabase, el poller de respaldo sigue funcionando
        console.log('Realtime no disponible, usando poller de respaldo.');
    }
}

function onCambioRealtime(payload) {
    // Debounce corto: si llegan varios cambios juntos, recargar una sola vez
    if(_realtimeDebounce) clearTimeout(_realtimeDebounce);
    _realtimeDebounce = setTimeout(() => {
        if(!sessionUser) return;
        // Si hay un modal abierto, recargar datos en segundo plano para detectar notificaciones,
        // pero sin re-renderizar la vista (para no interrumpir lo que el usuario escribe)
        loadAll();
    }, 400);
}

function detenerRealtime() {
    if(_realtimeChannel) {
        try { supabaseClient.removeChannel(_realtimeChannel); } catch(e) {}
        _realtimeChannel = null;
    }
}

// Cerrar modales con tecla Escape
document.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
        cerrarModalProveedor();
        cerrarModalArticulo();
    }
});

// Cerrar modal al hacer clic fuera
['modalProveedor','modalArticulo'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
        if(e.target.id === id) document.getElementById(id).classList.remove('active');
    });
});

/* ============================================================
   MÓDULO COMPRAS (Tabs + Nueva Compra)
   ============================================================ */

function cambiarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    document.getElementById('content-' + tab)?.classList.add('active');
    if(tab === 'compras') renderComprasTab();
    if(tab === 'proveedores') renderProveedores();
}

function renderComprasTab() {
    const cont = document.getElementById('comprasContainer');
    if(!cont) return;
    const filtro = (document.getElementById('compras_buscar')?.value || '').toLowerCase().trim();
    let lista = cache.lotes || [];
    
    if(filtro) {
        lista = lista.filter(l => {
            const prov = findProveedor(l.proveedor_id);
            return (l.codigo_lote || '').toLowerCase().includes(filtro) ||
                   (prov.nombre || '').toLowerCase().includes(filtro) ||
                   (l.notas || '').toLowerCase().includes(filtro);
        });
    }
    
    if(!lista.length) {
        cont.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px;">${filtro ? 'Sin resultados' : 'No hay compras registradas. Crea una con el botón "+ Nueva Compra".'}</p>`;
        return;
    }
    
    cont.innerHTML = lista.map(l => {
        const equiposLote = cache.refurb.filter(r => r.lote_id === l.id);
        const totalLote = equiposLote.reduce((s, e) => s + (parseFloat(e.costo_compra) || 0), 0);
        const prov = findProveedor(l.proveedor_id);
        let estadoStyle = 'background:#e0f2fe; color:#0369a1;';
        if(l.estado === 'En Proceso') estadoStyle = 'background:#fef3c7; color:#92400e;';
        if(l.estado === 'Cerrado') estadoStyle = 'background:#d1fae5; color:#065f46;';
        const totalDisplay = isAdminUser() ? money(totalLote) : '';
        return `<div class="lote-card">
            <div>
                <div class="lote-codigo">${escapeHtml(l.codigo_lote || 'Sin código')} <span class="badge" style="${estadoStyle}; margin-left:6px;">${escapeHtml(l.estado || 'Abierto')}</span></div>
                <div class="lote-meta">
                    <i class="ti ti-truck"></i> <b style="text-transform:uppercase;">${escapeHtml(prov.nombre || 'SIN PROVEEDOR')}</b> · 
                    📅 ${l.fecha_compra ? new Date(l.fecha_compra).toLocaleDateString('es-DO') : '-'} · 
                    ${equiposLote.length} equipo${equiposLote.length === 1 ? '' : 's'}
                    ${l.notas ? '<br><span style="text-transform:uppercase;">' + escapeHtml(l.notas) + '</span>' : ''}
                </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                ${totalDisplay ? `<div class="lote-totals"><div class="total">${totalDisplay}</div></div>` : ''}
                <button class="btn btn-blue" style="padding:6px 12px; font-size:12px;" onclick="abrirLoteDesdeCompras('${l.id}')"><i class="ti ti-folder-open"></i> Abrir</button>
                ${l.enviado_reacond 
                    ? `<span class="badge" style="background:#d1fae5; color:#065f46; font-size:11px;"><i class="ti ti-circle-check"></i> En Reacond</span>`
                    : `<button class="btn btn-dark" style="padding:6px 10px; font-size:12px; background:#06b6d4;" onclick="enviarLoteAReacond('${l.id}')" title="Enviar este lote a Reacondicionado"><i class="ti ti-send"></i> A Reacond</button>`
                }
                <button class="btn btn-light" style="padding:6px 10px; font-size:12px;" onclick="eliminarLote('${l.id}')"><i class="ti ti-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function abrirLoteDesdeCompras(loteId) {
    const lote = cache.lotes.find(l => l.id === loteId);
    if(!lote) return alert('Compra no encontrada.');
    proveedorActualId = lote.proveedor_id;
    document.getElementById('prov-lista').style.display = 'none';
    document.getElementById('prov-detalle').style.display = 'none';
    document.getElementById('lote-detalle').style.display = 'block';
    abrirLote(loteId);
}

async function enviarLoteAReacond(loteId) {
    const lote = cache.lotes.find(l => l.id === loteId);
    if(!lote) return alert('Lote no encontrado.');
    const equiposLote = cache.refurb.filter(r => r.lote_id === loteId);
    if(equiposLote.length === 0) {
        return alert('Este lote no tiene equipos registrados. Agrega equipos primero antes de enviarlo a Reacondicionado.');
    }
    if(!confirm(`¿Enviar lote "${lote.nombre || lote.id.slice(0,8)}" a Reacondicionado?\n\n${equiposLote.length} equipos quedarán pendientes de evaluación.`)) return;
    try {
        const { error } = await supabaseClient
            .from('refurb_lotes')
            .update({ enviado_reacond: true, fecha_envio_reacond: new Date().toISOString() })
            .eq('id', loteId);
        if(error) throw error;
        toast('Lote enviado a Reacondicionado.');
        await loadAll();
    } catch(e) {
        logError('Enviar lote a reacond', e);
        alert(getFriendlyError(e));
    }
}

function abrirModalNuevaCompra() {
    // Inicializar smart-select de proveedores
    smartSelectInit({
        containerId: 'ss-compra-proveedor',
        placeholder: '🔍 Buscar proveedor por nombre, ciudad o tipo...',
        items: (cache.proveedores || []).map(p => ({
            id: p.id,
            label: p.nombre,
            sub: [p.ciudad, p.tipo, p.whatsapp].filter(x => x).join(' · '),
            search: [p.nombre, p.ciudad, p.tipo, p.contacto, p.whatsapp].filter(x => x).join(' ').toLowerCase()
        })),
        value: '',
        onChange: () => {}
    });
    
    document.getElementById('mod_compra_fecha').value = new Date().toISOString().slice(0, 10);
    document.getElementById('mod_compra_notas').value = '';
    document.getElementById('modalNuevaCompra').classList.add('active');
}

function cerrarModalNuevaCompra() {
    document.getElementById('modalNuevaCompra').classList.remove('active');
}

async function crearNuevaCompra() {
    try {
        const provId = smartSelectGetValue('ss-compra-proveedor');
        if(!provId) return alert('Selecciona un proveedor.');
        
        const codigo = calcularSiguienteCodigoLote();
        const { data, error } = await supabaseClient.from('refurb_lotes').insert([{
            codigo_lote: codigo,
            proveedor_id: provId,
            fecha_compra: val('mod_compra_fecha') || new Date().toISOString().slice(0, 10),
            notas: val('mod_compra_notas') || null,
            estado: 'Abierto',
            creado_por: sessionUser?.id || null
        }]).select().single();
        if(error) throw error;
        toast(`Compra ${codigo} creada.`);
        cerrarModalNuevaCompra();
        await loadAll();
        abrirLoteDesdeCompras(data.id);
    } catch(e) { logError('Crear compra', e); alert(getFriendlyError(e)); }
}

// Cerrar modal con Escape y clic fuera
document.addEventListener('keydown', e => {
    if(e.key === 'Escape') cerrarModalNuevaCompra();
});
document.getElementById('modalNuevaCompra')?.addEventListener('click', e => {
    if(e.target.id === 'modalNuevaCompra') cerrarModalNuevaCompra();
});

/* ============================================================
   CONFIGURACIÓN IMPRESORA
   ============================================================ */
function abrirModalConfigImpresora() {
    document.getElementById('modalConfigImpresora').classList.add('active');
}
function cerrarModalConfigImpresora() {
    document.getElementById('modalConfigImpresora').classList.remove('active');
}
document.getElementById('modalConfigImpresora')?.addEventListener('click', e => {
    if(e.target.id === 'modalConfigImpresora') cerrarModalConfigImpresora();
});

/* ============================================================
   LABELS DE DIAGNÓSTICO (individual + lote)
   ============================================================ */

// Cache de fallas por equipo para el label (se llena al abrir preview)
let _fallasPorEquipo = {};

function generarHtmlLabelDiag(equipo) {
    const art = findArticulo(equipo.articulo_id);
    const lote = cache.lotes.find(l => l.id === equipo.lote_id);
    const w = localStorage.getItem('bayol_dlbl_w') || '51';
    const h = localStorage.getItem('bayol_dlbl_h') || '25';
    const f = localStorage.getItem('bayol_dlbl_f') || '10';
    
    const marca = (art.marca || equipo.marca || '').toUpperCase();
    const modelo = (art.modelo || equipo.modelo || '').toUpperCase();
    const capacidad = (art.capacidad || equipo.capacidad || '').toUpperCase();
    const referencia = (art.referencia || '').toUpperCase();
    const imei = (equipo.imei || 'SIN IMEI').toUpperCase();
    const codigoLote = (lote?.codigo_lote || '').toUpperCase();
    const fecha = new Date().toLocaleDateString('es-DO');
    const notas = (equipo.notas_diagnostico || '').toUpperCase();
    
    // Modelo abreviado (ej: "IP12 128GB") usando la misma lógica del label de venta
    let modeloCorto = '';
    try { modeloCorto = construirModeloAbreviado(equipo).toUpperCase(); } catch(e) { modeloCorto = `${marca} ${modelo}`.trim(); }
    if(capacidad && !modeloCorto.includes(capacidad)) modeloCorto += ' ' + capacidad;
    modeloCorto = modeloCorto.trim();
    
    // Fallas del equipo (checklist para que el técnico marque)
    const fallasEq = _fallasPorEquipo[equipo.id] || [];
    const fmenor = Math.max(7, parseInt(f) - 1); // texto fallas un pelín menor
    let fallasHtml = '';
    if(fallasEq.length > 0) {
        // 1 columna si son pocas (≤4), 2 columnas si son muchas (5+)
        const columnas = fallasEq.length >= 5 ? 2 : 1;
        const itemsHtml = fallasEq.map(fa => {
            const txt = (fa.falla_corto || fa.falla_nombre || '').toUpperCase();
            return `<div style="font-size:${fmenor}px; font-weight:900; -webkit-text-stroke:0.3px #000; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">☐ ${escapeHtml(txt)}</div>`;
        }).join('');
        fallasHtml = `
            <div class="diag-fallas-area" style="border-top:2px dashed #000; padding-top:0.5mm; margin-top:0.5mm;">
                <div style="font-size:${fmenor}px; font-weight:900; -webkit-text-stroke:0.3px #000; margin-bottom:1px;">REVISAR / REPARAR:</div>
                <div style="display:grid; grid-template-columns:repeat(${columnas}, 1fr); gap:0 6px;">${itemsHtml}</div>
            </div>`;
    }
    
    return `
        <div class="diag-label" style="width:${w}mm; min-height:${h}mm; font-size:${f}px; font-weight:900; -webkit-text-stroke:0.4px #000; line-height:1.25; padding:1mm; box-sizing:border-box; overflow:hidden; font-family:Arial,Helvetica,sans-serif; color:#000; page-break-after:always;">
            <div class="diag-header" style="font-size:${f}px; font-weight:900; -webkit-text-stroke:0.4px #000; text-align:center; border-bottom:2px solid #000; padding-bottom:0.5mm; margin-bottom:0.5mm; font-family:Arial,Helvetica,sans-serif;">
                DIAGNÓSTICO
            </div>
            <div class="diag-section" style="margin-bottom:0.5mm;">
                <div class="diag-line diag-modelo" style="font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif;">${escapeHtml(modeloCorto)}</div>
            </div>
            <div class="diag-section" style="margin-bottom:0.5mm;">
                <div class="diag-line" style="font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif;">IMEI: <span class="diag-imei" style="font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif; letter-spacing:0.3px;">${escapeHtml(imei)}</span></div>
                <div class="diag-line" style="font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif;">FECHA: ${escapeHtml(fecha)}</div>
            </div>
            ${notas ? `<div class="diag-notas-area" style="border-top:2px dashed #000; padding-top:0.5mm; font-size:${f}px; font-weight:900; -webkit-text-stroke:0.4px #000; font-family:Arial,Helvetica,sans-serif;">NOTAS: ${escapeHtml(notas)}</div>` : ''}
            ${fallasHtml}
        </div>
    `;
}

let _labelDiagHtmlActual = '';
let _labelDiagEquipoActual = null;
let _labelDiagEquiposLote = null;
let _labelDiagOrdenActual = null;

async function abrirPreviewLabelDiagIndividual(equipoId) {
    const equipo = cache.refurb.find(r => r.id === equipoId);
    if(!equipo) return alert('Equipo no encontrado.');
    
    // Cargar las fallas del equipo para el checklist
    await cargarFallasParaLabel([equipoId]);
    
    _labelDiagEquipoActual = equipo;
    _labelDiagEquiposLote = null;
    const previewHtml = generarHtmlLabelDiag(equipo);
    _labelDiagHtmlActual = previewHtml;
    document.getElementById('labelDiagPreview').innerHTML = previewHtml;
    document.getElementById('labelDiagInfo').textContent = 'Se imprimirá 1 label';
    document.getElementById('modalLabelTitulo').textContent = 'Vista Previa del Label';
    document.getElementById('diag_copias').value = 1;
    document.getElementById('modalLabelDiag').classList.add('active');
}

// Carga las fallas de uno o varios equipos en _fallasPorEquipo
async function cargarFallasParaLabel(equipoIds) {
    try {
        const { data, error } = await supabaseClient
            .from('equipo_fallas')
            .select('*')
            .in('equipo_id', equipoIds);
        if(error) throw error;
        // Agrupar por equipo
        _fallasPorEquipo = {};
        (data || []).forEach(f => {
            if(!_fallasPorEquipo[f.equipo_id]) _fallasPorEquipo[f.equipo_id] = [];
            _fallasPorEquipo[f.equipo_id].push(f);
        });
    } catch(e) {
        logError('Cargar fallas para label', e);
    }
}

async function abrirPreviewLabelsLote() {
    if(!loteActualId) return alert('Sin lote activo.');
    const equipos = cache.refurb.filter(r => r.lote_id === loteActualId);
    if(!equipos.length) return alert('Este lote no tiene equipos.');
    
    // Cargar fallas de todos los equipos del lote
    await cargarFallasParaLabel(equipos.map(e => e.id));
    
    _labelDiagEquipoActual = null;
    _labelDiagEquiposLote = equipos;
    const previewHtml = equipos.map(e => generarHtmlLabelDiag(e)).join('');
    _labelDiagHtmlActual = previewHtml;
    document.getElementById('labelDiagPreview').innerHTML = previewHtml;
    document.getElementById('labelDiagInfo').textContent = `Se imprimirán ${equipos.length} label${equipos.length === 1 ? '' : 's'} de este lote (× copias)`;
    document.getElementById('modalLabelTitulo').textContent = `Vista Previa · ${equipos.length} Labels`;
    document.getElementById('diag_copias').value = 1;
    document.getElementById('modalLabelDiag').classList.add('active');
}

function cerrarModalLabelDiag() {
    document.getElementById('modalLabelDiag').classList.remove('active');
}

async function confirmarImprimirLabelDiag() {
    const copias = parseInt(document.getElementById('diag_copias')?.value || 1);
    const w = parseInt(localStorage.getItem('bayol_dlbl_w') || '51');
    const h = parseInt(localStorage.getItem('bayol_dlbl_h') || '25');
    const rot = parseInt(localStorage.getItem('bayol_dlbl_rot') || '0');
    const metodo = localStorage.getItem('bayol_metodo_impresion') || 'imagen'; // imagen | tspl | normal
    cerrarModalLabelDiag();
    
    // === CASO ORDEN DE CLIENTE: ya tenemos el HTML en _labelDiagHtmlActual ===
    if(_labelDiagOrdenActual) {
        const ordenLbl = _labelDiagOrdenActual;
        _labelDiagOrdenActual = null; // reset
        if(metodo === 'imagen' && _qzConectado && typeof html2canvas === 'function') {
            const cont = document.createElement('div');
            cont.style.position = 'fixed'; cont.style.left = '-9999px'; cont.style.top = '0'; cont.style.background = '#fff';
            cont.style.width = w + 'mm'; cont.style.height = h + 'mm'; cont.style.overflow = 'hidden';
            cont.innerHTML = _labelDiagHtmlActual;
            document.body.appendChild(cont);
            const labelEl = cont.firstElementChild || cont;
            // Forzar alto exacto del label (no min-height) para que no avance etiqueta en blanco
            if(labelEl && labelEl.style) { labelEl.style.minHeight = '0'; labelEl.style.height = h + 'mm'; }
            const ok = await qzImprimirHtmlComoImagen(labelEl, w, h, copias, 'labels');
            document.body.removeChild(cont);
            if(ok) { toast('🖨️ Label de diagnóstico enviado.'); return; }
        }
        // Respaldo HTML normal
        const { html: cf, anchoFinal: af, altoFinal: alf } = aplicarRotacionImpresion(_labelDiagHtmlActual, w, h, rot);
        imprimirContenido(`<style>@page{size:${af}mm ${alf}mm;margin:0;}@media print{body{margin:0;padding:0;}}</style>${cf}`, copias, af, alf);
        return;
    }
    
    // === MÉTODO IMAGEN (idéntico a la vista previa) — POR DEFECTO ===
    if(metodo === 'imagen' && _qzConectado && typeof html2canvas === 'function') {
        // Renderizar cada label en un contenedor oculto y mandarlo como imagen
        const equipos = (_labelDiagEquiposLote && _labelDiagEquiposLote.length)
            ? _labelDiagEquiposLote
            : (_labelDiagEquipoActual ? [_labelDiagEquipoActual] : []);
        if(equipos.length) {
            let algunoOk = false;
            for(const eq of equipos) {
                // Crear elemento oculto con el HTML del label
                const cont = document.createElement('div');
                cont.style.position = 'fixed';
                cont.style.left = '-9999px';
                cont.style.top = '0';
                cont.style.background = '#fff';
                cont.innerHTML = generarHtmlLabelDiag(eq);
                document.body.appendChild(cont);
                const labelEl = cont.firstElementChild || cont;
                const ok = await qzImprimirHtmlComoImagen(labelEl, w, h, copias, 'labels');
                document.body.removeChild(cont);
                if(ok) algunoOk = true;
            }
            if(algunoOk) { toast('🖨️ Enviado a la impresora (igual a la vista previa).'); return; }
        }
    }
    
    // === MÉTODO TSPL (nativo, respaldo) ===
    if(metodo === 'tspl' && _qzConectado) {
        let cmd = '';
        if(_labelDiagEquiposLote && _labelDiagEquiposLote.length) {
            cmd = _labelDiagEquiposLote.map(e => generarTSPLLabelDiag(e, copias)).join('');
        } else if(_labelDiagEquipoActual) {
            cmd = generarTSPLLabelDiag(_labelDiagEquipoActual, copias);
        }
        if(cmd) {
            const ok = await qzImprimirRaw(cmd, 'labels');
            if(ok) { toast('🖨️ Enviado a la impresora (TSPL).'); return; }
        }
    }
    
    // === MÉTODO NORMAL HTML (último respaldo) ===
    const { html: contenidoFinal, anchoFinal, altoFinal } = aplicarRotacionImpresion(_labelDiagHtmlActual, w, h, rot);
    const conPagina = `
        <style>
            @page { size: ${anchoFinal}mm ${altoFinal}mm; margin: 0; }
            @media print {
                body { margin: 0; padding: 0; }
                .print-area { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        ${contenidoFinal}
    `;
    imprimirContenido(conPagina, copias, anchoFinal, altoFinal);
}

// Cerrar modal de label con Escape
document.addEventListener('keydown', e => {
    if(e.key === 'Escape') cerrarModalLabelDiag();
});

// Cerrar modal al hacer clic fuera
document.getElementById('modalLabelDiag').addEventListener('click', e => {
    if(e.target.id === 'modalLabelDiag') cerrarModalLabelDiag();
});

/* ============================================================
   QZ TRAY — IMPRESIÓN DIRECTA (como cliente InfoPlus)
   ============================================================ */
let _qzConectado = false;

// Certificado público de BAYOL CELL (para que QZ Tray confíe sin avisos)
const QZ_CERTIFICADO = `-----BEGIN CERTIFICATE-----
MIIDwzCCAqugAwIBAgIUF/OKLfJLpukDit/9lCy2eMEyZ7kwDQYJKoZIhvcNAQEL
BQAwcTELMAkGA1UEBhMCRE8xETAPBgNVBAgMCFZhbHZlcmRlMQwwCgYDVQQHDANN
YW8xEzARBgNVBAoMCkJBWU9MIENFTEwxDzANBgNVBAsMBlRhbGxlcjEbMBkGA1UE
AwwSQkFZT0wgQ0VMTCBTaXN0ZW1hMB4XDTI2MDUyODE2MzY0MFoXDTQ2MDUyMzE2
MzY0MFowcTELMAkGA1UEBhMCRE8xETAPBgNVBAgMCFZhbHZlcmRlMQwwCgYDVQQH
DANNYW8xEzARBgNVBAoMCkJBWU9MIENFTEwxDzANBgNVBAsMBlRhbGxlcjEbMBkG
A1UEAwwSQkFZT0wgQ0VMTCBTaXN0ZW1hMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEA00OsJ6+GVdEDcPr9yq0A0uD8R7lNlVEPXAHHmM6tvdxFtyvGm6NT
mN5Y2GXYHSPG+kyEdV5vtKVc6DmqnASEu59Z4cFcYs49Lbcq6vM/stlBPn2G+Lme
U1Co985AvQN9qc/0DLzrofwUQ8R23k0QISq+aL/RvrI/WckQyuonDkCUA6aURHFf
kFzDIf/7ceMGAMRIXD13VUI22j4i2RqvTJiXE7HOb7+XygmVuI2jaPQqugCymaW0
QSyr3qEqTwSo2MEemXPES6yIQYC6fwaZO5RdO7i8OsJLiI9T+D0EbtEb0C1Otf0f
8Ak8/GUlaW/0kTIJXT+C4sMky4UAuwFLKwIDAQABo1MwUTAdBgNVHQ4EFgQUIekC
6qRSbAWWRcUD4ZHaaLPoNR0wHwYDVR0jBBgwFoAUIekC6qRSbAWWRcUD4ZHaaLPo
NR0wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAVpsz7VlP9ay9
HKU06g37xqBwcxLe2wy8BzbVuW8XVySBuD1B3IcOJ5Tbug9biQsd9nvXoXT2Psdk
HAjp4Drk9Dosr4dIUON5V9Q8N4x0z1LilgAbkXsSewxPtLal4tZW1dTvjZvHYUpk
yBfMk5PyVW6VbatNdZi3cnRGZYEkmUadU3PLvFVczvTwFOOOe0LQPYxYJbgVrD11
JLQsGGa4RnJLfCYCxxjhyxsC94JHM+BWbQgxQEw0q4SAXR/CrWsvChxgi1F9OCI0
H/IOwMsfPaJug2TrK4segfFDizhlb9JPTviV9eipowF2GpiMfeafBQlG5WkqRLMH
DnOjztecxg==
-----END CERTIFICATE-----`;

// Llave privada (firma local; riesgo mínimo, solo permite imprimir en QZ local)
const QZ_LLAVE_PRIVADA = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDTQ6wnr4ZV0QNw
+v3KrQDS4PxHuU2VUQ9cAceYzq293EW3K8abo1OY3ljYZdgdI8b6TIR1Xm+0pVzo
OaqcBIS7n1nhwVxizj0ttyrq8z+y2UE+fYb4uZ5TUKj3zkC9A32pz/QMvOuh/BRD
xHbeTRAhKr5ov9G+sj9ZyRDK6icOQJQDppREcV+QXMMh//tx4wYAxEhcPXdVQjba
PiLZGq9MmJcTsc5vv5fKCZW4jaNo9Cq6ALKZpbRBLKveoSpPBKjYwR6Zc8RLrIhB
gLp/Bpk7lF07uLw6wkuIj1P4PQRu0RvQLU61/R/wCTz8ZSVpb/SRMgldP4LiwyTL
hQC7AUsrAgMBAAECggEAFEAmXl961vsEA25rqWPP8mbSh+WBRFDS0hTxlvoouUxF
+nrdvMl5F+woRAXvI0vspM103PNCbeRz9WahrfbY6ksqCHPKcUYnoxwtpvvOHUyp
7l2F9I2GWaIfsDE7D2MoRoDCef4Z8BsDrkNEyaZFZ4h7W/sXFdpsLCUT0P+E4t6t
K10VktSHXDHK7n8U0/vnaAnqiEhlmnzxokXi59cpHjcSZNRtU5Jxlv4ASbS7G3hC
FwcKSifBgw8gEQpQBSHm+gGRdUJU5vulk5AsFmBqFzkU2ZolW4eT4hcDEPqWA6hs
hZfAMDidsA8asIafE9YvJHiXmivkPM+TvgbybKhVsQKBgQD1avWFvqviUtt/K4s5
pvAB7teBP82b5ZtafA920BXhC6DIM2edyCFd0ICG4jEg5hnAggryHLM+4IrDv/xy
AiVlkXe7dwTA1uZQfLtZBncNNDo5C6b7zMY2rIANxqw6lGjhBRCQDL9LsYqWMoX2
vvIJqw16M6a5m0WPmdStO6jhpQKBgQDcX7X9ffFpUvmEgEbRJ0MTjtCN+DY9SOpr
7RN7y/h1r483H0IIjjLXDa7nkKKRqZfDfkAxE3sSEu80+FJb5hmyIDmEHADlkpT3
qH/0ZeBMEFnk1RJdVec9n9/K4WGO1dM8QoCtDsLYX410WnxV7n7GMjIV79UABTyF
ZhEiCppAjwKBgQCfp/ygDKHvc63d9mr1j5e1+jZynBpboCzH2cuJpOeG5zSq6V4w
NEEYsgrbNQ129JquNSt/xJILhrJflGdbl+/SOqdk6pHKDkP4+pw610zd5ys1b1Ir
n1UXvnL0A1qKJYBxWwUiYViVmqOpAKdMFX6KMaBr7mw5dTz0pcPJCvXcDQKBgQDR
Dws6+6t1W33SMU79Q93iQ+2dgQcThIS+9h0xqAKAwpd+l2yxaRTZ5uUyUIeo39ZV
YwPKisyKDORYv+qBu/xMez2VEmvXXgNsHrGkTLFH94sQBwJxAPlqAKzxbnZ6ZmcK
F5yyj/pQAfXTl7O0YZhqtVvGa8sJRe5wLq+6N4y2CQKBgQDn5tLIe4hYgupJl0i/
myl8zfasybWLq7FU+QFZE9VSAvsLhcRI57gQyN9RP0hpyKtqx044f0A0Kc9DS7rH
a266U2lEn8S9Lw69TyNcnMmWY9HAZRFGiy293s4q2fE4ZfPe9N6AFdVooNdR37wH
WboKZRe8Qt4O/fHxWtRqlkh1Tw==
-----END PRIVATE KEY-----`;

// Configurar firma de QZ Tray para que NO pida permiso
function qzConfigurarFirma() {
    if(!qzDisponible()) return;
    // Certificado
    qz.security.setCertificatePromise(function(resolve, reject) {
        resolve(QZ_CERTIFICADO);
    });
    // Firma con la llave privada usando jsrsasign
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(function(toSign) {
        return function(resolve, reject) {
            try {
                if(typeof KJUR === 'undefined') { reject('jsrsasign no cargado'); return; }
                const sig = new KJUR.crypto.Signature({ alg: "SHA512withRSA" });
                sig.init(QZ_LLAVE_PRIVADA);
                sig.updateString(toSign);
                const hex = sig.sign();
                resolve(stob64(hextorstr(hex)));
            } catch(e) {
                logError('QZ firma', e);
                reject(e);
            }
        };
    });
}

function qzDisponible() {
    return typeof qz !== 'undefined';
}

async function qzVerificarConexion() {
    const badge = document.getElementById('qzEstadoBadge');
    const noInst = document.getElementById('qzNoInstalado');
    const conect = document.getElementById('qzConectado');
    
    if(!qzDisponible()) {
        badge.textContent = 'Librería no cargada';
        badge.style.cssText = 'background:#fee2e2; color:#991b1b;';
        if(noInst) noInst.style.display = 'block';
        if(conect) conect.style.display = 'none';
        return;
    }
    
    badge.textContent = 'Conectando...';
    badge.style.cssText = 'background:#fef3c7; color:#92400e;';
    
    try {
        qzConfigurarFirma();
        // Si ya hay conexión activa, no reconectar
        if(qz.websocket.isActive()) {
            _qzConectado = true;
            qzMostrarConectado();
            return;
        }
        
        await qz.websocket.connect();
        _qzConectado = true;
        qzMostrarConectado();
    } catch(e) {
        logError('QZ conexión', e);
        _qzConectado = false;
        badge.textContent = 'No instalado / No activo';
        badge.style.cssText = 'background:#fee2e2; color:#991b1b;';
        if(noInst) noInst.style.display = 'block';
        if(conect) conect.style.display = 'none';
    }
}

function qzMostrarConectado() {
    const badge = document.getElementById('qzEstadoBadge');
    const noInst = document.getElementById('qzNoInstalado');
    const conect = document.getElementById('qzConectado');
    badge.textContent = '✅ Conectado';
    badge.style.cssText = 'background:#d1fae5; color:#065f46;';
    if(noInst) noInst.style.display = 'none';
    if(conect) conect.style.display = 'block';
    qzCargarImpresoras();
}

async function qzCargarImpresoras() {
    if(!_qzConectado) return;
    const selL = document.getElementById('qzImpresoraLabels');
    const selT = document.getElementById('qzImpresoraTickets');
    if(!selL || !selT) return;
    try {
        const impresoras = await qz.printers.find();
        const lista = Array.isArray(impresoras) ? impresoras : [impresoras];
        const guardadaL = localStorage.getItem('bayol_qz_labels') || '';
        const guardadaT = localStorage.getItem('bayol_qz_tickets') || '';
        
        const opciones = lista.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        selL.innerHTML = opciones;
        selT.innerHTML = opciones;
        
        // Restaurar selección guardada o autodetectar
        if(guardadaL) selL.value = guardadaL;
        else {
            const etiq = lista.find(p => /4barcode|4b-|label|2connect/i.test(p));
            if(etiq) selL.value = etiq;
        }
        if(guardadaT) selT.value = guardadaT;
        else {
            const ticket = lista.find(p => /ticket|recibo|pos|80mm|58mm/i.test(p));
            if(ticket) selT.value = ticket;
        }
        qzGuardarImpresoras();
    } catch(e) {
        logError('QZ cargar impresoras', e);
        const errOpt = '<option value="">Error al listar impresoras</option>';
        selL.innerHTML = errOpt;
        selT.innerHTML = errOpt;
    }
}

function qzGuardarImpresoras() {
    const selL = document.getElementById('qzImpresoraLabels');
    const selT = document.getElementById('qzImpresoraTickets');
    if(selL && selL.value) localStorage.setItem('bayol_qz_labels', selL.value);
    if(selT && selT.value) localStorage.setItem('bayol_qz_tickets', selT.value);
    toast('Impresoras guardadas.');
}

function qzImpresoraLabels() {
    return localStorage.getItem('bayol_qz_labels') || '';
}

/* ============================================================
   TSPL — LENGUAJE NATIVO DE LA 4BARCODE (impresión directa)
   ============================================================ */
// Escapa comillas para TSPL
function tsplTxt(s) {
    return String(s || '').replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim();
}

// Convierte mm a dots (203 dpi = 8 dots/mm)
function mmToDots(mm) { return Math.round(parseFloat(mm) * 8); }

// Genera comandos TSPL para el label de diagnóstico
function generarTSPLLabelDiag(equipo, copias) {
    const art = findArticulo(equipo.articulo_id);
    const lote = cache.lotes.find(l => l.id === equipo.lote_id);
    const w = parseInt(localStorage.getItem('bayol_dlbl_w') || '51');
    const h = parseInt(localStorage.getItem('bayol_dlbl_h') || '25');
    
    const marca = tsplTxt((art.marca || equipo.marca || '').toUpperCase());
    const modelo = tsplTxt((art.modelo || equipo.modelo || '').toUpperCase());
    const capacidad = tsplTxt((art.capacidad || equipo.capacidad || '').toUpperCase());
    const imei = tsplTxt((equipo.imei || 'SIN IMEI').toUpperCase());
    const codigoLote = tsplTxt((lote?.codigo_lote || '').toUpperCase());
    const fecha = tsplTxt(new Date().toLocaleDateString('es-DO'));
    const notas = tsplTxt((equipo.notas_diagnostico || '').toUpperCase()).substring(0, 40);
    
    copias = parseInt(copias) || 1;
    
    // TSPL: coordenadas en dots. Fuente "1"=pequeña, "2","3" más grandes.
    let cmd = '';
    cmd += `SIZE ${w} mm, ${h} mm\r\n`;
    cmd += `GAP 2 mm, 0 mm\r\n`;
    cmd += `DIRECTION 1\r\n`;
    cmd += `CLS\r\n`;
    // Encabezado
    cmd += `TEXT 10,8,"2",0,1,1,"BAYOL CELL - DIAGNOSTICO"\r\n`;
    cmd += `BAR 10,28,${mmToDots(w)-20},2\r\n`;
    // Modelo
    cmd += `TEXT 10,36,"3",0,1,1,"${marca} ${modelo}"\r\n`;
    cmd += `TEXT 10,62,"1",0,1,1,"${capacidad}"\r\n`;
    // IMEI
    cmd += `TEXT 10,80,"1",0,1,1,"IMEI: ${imei}"\r\n`;
    cmd += `TEXT 10,98,"1",0,1,1,"LOTE: ${codigoLote}"\r\n`;
    cmd += `TEXT 10,116,"1",0,1,1,"FECHA: ${fecha}"\r\n`;
    // Notas (si hay)
    if(notas) {
        cmd += `TEXT 10,138,"1",0,1,1,"NOTAS: ${notas}"\r\n`;
    }
    cmd += `PRINT ${copias},1\r\n`;
    return cmd;
}

// Manda comandos TSPL crudos por QZ Tray (lenguaje nativo de la impresora)
async function qzImprimirRaw(comandosTSPL, tipo) {
    if(!_qzConectado || !qzDisponible()) return false;
    const impresora = (tipo === 'tickets') ? qzImpresoraTickets() : qzImpresoraLabels();
    if(!impresora) { toast('No hay impresora de labels configurada.'); return false; }
    
    try {
        const config = qz.configs.create(impresora);
        const data = [{
            type: 'raw',
            format: 'command',
            flavor: 'plain',
            data: comandosTSPL
        }];
        await qz.print(config, data);
        return true;
    } catch(e) {
        logError('QZ imprimir RAW (TSPL)', e);
        toast('Error al imprimir TSPL: ' + (e?.message || e));
        return false;
    }
}

function qzImpresoraTickets() {
    return localStorage.getItem('bayol_qz_tickets') || '';
}

/* ============================================================
   IMPRESIÓN HTML → IMAGEN (idéntico a la vista previa)
   Renderiza el HTML del label como imagen con html2canvas
   y la manda a la impresora. Imprime EXACTO a lo que se ve.
   ============================================================ */
// Guarda la densidad (nitidez) que el sistema pasará a la impresora
function guardarDensidad() {
    const d = document.getElementById('cfgi_density')?.value || '8';
    document.getElementById('cfgi_dens_val').textContent = d;
    localStorage.setItem('bayol_densidad', d);
}

async function qzImprimirHtmlComoImagen(elementoHtml, anchoMm, altoMm, copias, tipo) {
    if(!_qzConectado || !qzDisponible()) return false;
    if(typeof html2canvas !== 'function') { 
        console.log('html2canvas no cargado'); 
        return false; 
    }
    const impresora = (tipo === 'tickets') ? qzImpresoraTickets() : qzImpresoraLabels();
    if(!impresora) { toast('No hay impresora de labels configurada.'); return false; }
    
    copias = parseInt(copias) || 1;
    
    try {
        // 203 dpi: 8 dots/mm. Renderizamos a MAYOR densidad para texto grueso y nítido.
        const dpi = 203;
        const escala = (dpi / 96) * 2; // x2 extra para que la negrita se marque fuerte
        
        // Tamaño físico exacto en px @96dpi (1mm = 3.7795px) para que la imagen
        // NO sea más alta que la etiqueta (evita que avance un label en blanco extra)
        const pxPorMm = 96 / 25.4;
        const wPx = anchoMm ? Math.round(anchoMm * pxPorMm) : elementoHtml.offsetWidth;
        const hPx = altoMm ? Math.round(altoMm * pxPorMm) : elementoHtml.offsetHeight;
        
        const canvas = await html2canvas(elementoHtml, {
            scale: escala,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            width: wPx,
            height: hPx,
            windowWidth: wPx,
            windowHeight: hPx
        });
        
        const imgBase64 = canvas.toDataURL('image/png').split(',')[1];
        
        // Densidad (nitidez/oscuridad) que controla el sistema y pasa a la impresora
        const densidad = parseInt(localStorage.getItem('bayol_densidad') || '8');
        const opciones = { units: 'mm', margins: 0, copies: copias, density: densidad };
        if(anchoMm && altoMm) opciones.size = { width: anchoMm, height: altoMm };
        const config = qz.configs.create(impresora, opciones);
        
        const data = [{
            type: 'pixel',
            format: 'image',
            flavor: 'base64',
            data: imgBase64
        }];
        
        await qz.print(config, data);
        return true;
    } catch(e) {
        logError('QZ imprimir imagen', e);
        toast('Error al imprimir imagen: ' + (e?.message || e));
        return false;
    }
}

// Imprime HTML directo por QZ Tray. tipo: 'labels' o 'tickets'. Devuelve true si lo hizo.
async function qzImprimirHtml(htmlContenido, anchoMm, altoMm, copias, tipo) {
    if(!_qzConectado || !qzDisponible()) return false;
    const impresora = (tipo === 'tickets') ? qzImpresoraTickets() : qzImpresoraLabels();
    if(!impresora) return false;
    
    copias = parseInt(copias) || 1;
    
    try {
        const opciones = { units: 'mm', margins: 0, copies: copias, rasterize: true, scaleContent: true };
        // Los labels tienen tamaño fijo; los tickets usan ancho de rollo con alto automático
        if(tipo !== 'tickets' && anchoMm && altoMm) {
            opciones.size = { width: anchoMm, height: altoMm };
        } else if(tipo === 'tickets' && anchoMm) {
            opciones.size = { width: anchoMm, height: null };
        }
        const config = qz.configs.create(impresora, opciones);
        
        const data = [{
            type: 'pixel',
            format: 'html',
            flavor: 'plain',
            data: htmlContenido
        }];
        
        await qz.print(config, data);
        return true;
    } catch(e) {
        logError('QZ imprimir', e);
        toast('Error al imprimir por QZ Tray, usando método normal.');
        return false;
    }
}

async function qzImprimirPrueba() {
    const w = parseInt(document.getElementById('cfgi_width')?.value) || 51;
    const h = parseInt(document.getElementById('cfgi_height')?.value) || 25;
    
    // Prueba con TSPL nativo (lenguaje de la 4BARCODE)
    let cmd = '';
    cmd += `SIZE ${w} mm, ${h} mm\r\n`;
    cmd += `GAP 2 mm, 0 mm\r\n`;
    cmd += `DIRECTION 1\r\n`;
    cmd += `CLS\r\n`;
    cmd += `TEXT 10,10,"3",0,1,1,"BAYOL CELL"\r\n`;
    cmd += `TEXT 10,45,"2",0,1,1,"PRUEBA TSPL OK"\r\n`;
    cmd += `TEXT 10,75,"1",0,1,1,"${tsplTxt(new Date().toLocaleString('es-DO'))}"\r\n`;
    cmd += `BARCODE 10,100,"128",50,1,0,2,2,"123456789"\r\n`;
    cmd += `PRINT 1,1\r\n`;
    
    const ok = await qzImprimirRaw(cmd, 'labels');
    if(ok) toast('🖨️ Prueba TSPL enviada a la impresora.');
    else alert('No se pudo imprimir. Verifica que QZ Tray esté conectado y la impresora de labels seleccionada.');
}

// Auto-conectar QZ al iniciar sesión (silencioso)
async function qzAutoConectar() {
    if(!qzDisponible()) return;
    try {
        qzConfigurarFirma();
        if(!qz.websocket.isActive()) {
            await qz.websocket.connect();
        }
        _qzConectado = true;
        const impL = qzImpresoraLabels();
        const impT = qzImpresoraTickets();
        if(!impL || !impT) {
            try {
                const impresoras = await qz.printers.find();
                const lista = Array.isArray(impresoras) ? impresoras : [impresoras];
                if(!impL) {
                    const etiq = lista.find(p => /4barcode|4b-|label|2connect/i.test(p));
                    if(etiq) localStorage.setItem('bayol_qz_labels', etiq);
                }
                if(!impT) {
                    const ticket = lista.find(p => /ticket|recibo|pos|80mm|58mm/i.test(p));
                    if(ticket) localStorage.setItem('bayol_qz_tickets', ticket);
                }
            } catch(e) { /* silencioso */ }
        }
    } catch(e) {
        _qzConectado = false; // QZ no está corriendo, se usará método normal
    }
}

/* ============================================================
   CONFIGURACIÓN DE IMPRESORA — PERFILES MÚLTIPLES
   ============================================================ */

const PERFILES_DEFAULT = [
    { nombre: 'Label Venta 58mm', width: 58, height: 40, font: 11, barcode: 40, margin: 1, tipo: 'venta' },
    { nombre: 'Label Diagnóstico 58mm', width: 58, height: 40, font: 10, barcode: 0, margin: 1, tipo: 'diagnostico' },
    { nombre: 'Label Diag Reacond 58mm', width: 58, height: 50, font: 10, barcode: 0, margin: 1, tipo: 'diag_reacond' }
];

function obtenerPerfilesImpresora() {
    const raw = localStorage.getItem('bayol_perfiles_impresora');
    if(!raw) {
        localStorage.setItem('bayol_perfiles_impresora', JSON.stringify(PERFILES_DEFAULT));
        return [...PERFILES_DEFAULT];
    }
    try { return JSON.parse(raw); } catch(e) { return [...PERFILES_DEFAULT]; }
}

function guardarPerfilesImpresora(perfiles) {
    localStorage.setItem('bayol_perfiles_impresora', JSON.stringify(perfiles));
}

function obtenerPerfilActivoNombre() {
    return localStorage.getItem('bayol_perfil_activo') || 'Label Venta 58mm';
}

function setPerfilActivoNombre(nombre) {
    localStorage.setItem('bayol_perfil_activo', nombre);
}

function obtenerPerfilPorNombre(nombre) {
    const perfiles = obtenerPerfilesImpresora();
    return perfiles.find(p => p.nombre === nombre) || perfiles[0];
}

function inicializarConfigImpresora() {
    const perfiles = obtenerPerfilesImpresora();
    const activo = obtenerPerfilActivoNombre();
    const sel = document.getElementById('cfg_perfil_actual');
    if(!sel) return;
    sel.innerHTML = perfiles.map(p => `<option value="${escapeHtml(p.nombre)}" ${p.nombre === activo ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('');
    cargarPerfilImpresora();
    // Cargar densidad guardada
    const dens = localStorage.getItem('bayol_densidad') || '8';
    const densEl = document.getElementById('cfgi_density');
    if(densEl) { densEl.value = dens; document.getElementById('cfgi_dens_val').textContent = dens; }
}

function cargarPerfilImpresora() {
    const sel = document.getElementById('cfg_perfil_actual');
    if(!sel) return;
    const nombre = sel.value;
    const perfil = obtenerPerfilPorNombre(nombre);
    setPerfilActivoNombre(nombre);
    document.getElementById('cfgi_width').value = perfil.width;
    document.getElementById('cfgi_height').value = perfil.height;
    document.getElementById('cfgi_font').value = perfil.font;
    document.getElementById('cfgi_barcode_h').value = perfil.barcode;
    document.getElementById('cfgi_margin').value = perfil.margin;
    document.getElementById('cfgi_tipo').value = perfil.tipo || 'venta';
    actualizarPreviewImpresora();
}

function actualizarPreviewImpresora() {
    const w = parseInt(document.getElementById('cfgi_width').value);
    const h = parseInt(document.getElementById('cfgi_height').value);
    const f = parseInt(document.getElementById('cfgi_font').value);
    const bh = parseInt(document.getElementById('cfgi_barcode_h').value);
    const m = parseInt(document.getElementById('cfgi_margin').value);
    const tipo = document.getElementById('cfgi_tipo').value;
    
    document.getElementById('cfgi_w_val').textContent = w + 'mm';
    document.getElementById('cfgi_h_val').textContent = h + 'mm';
    document.getElementById('cfgi_f_val').textContent = f + 'px';
    document.getElementById('cfgi_bh_val').textContent = bh + 'px';
    document.getElementById('cfgi_m_val').textContent = m + 'mm';
    
    const card = document.getElementById('previewImpresoraCard');
    if(!card) return;
    
    let contenido = '';
    if(tipo === 'venta') {
        contenido = `
            <div style="font-size:${f + 2}px; text-align:center; font-weight:900; -webkit-text-stroke:0.4px #000;">📱 BAYOL CELL</div>
            <div style="border-bottom:2px solid #000; margin:3px 0;"></div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">EQUIPO: APPLE IPHONE 12 PRO</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">IMEI: 356789123456789</div>
            ${bh > 0 ? `<div style="text-align:center; margin:3px 0;">${(function(){ const b=generarBarcodeImg('356789123456789', bh); return b?`<img src="${b}" style="height:${bh}px; max-width:95%;" />`:''; })()}</div>` : ''}
            <div style="text-align:center; font-weight:900; -webkit-text-stroke:0.4px #000; text-transform:uppercase; font-size:${f - 1}px;">CLASE A · GARANTÍA 90 DÍAS</div>
        `;
    } else if(tipo === 'diagnostico') {
        contenido = `
            <div style="text-align:center; font-weight:900; -webkit-text-stroke:0.4px #000; font-size:${f + 1}px; border-bottom:2px solid #000; padding-bottom:2px;">DIAGNÓSTICO</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; margin-top:3px;">IP12 PRO MAX 256GB</div>
            <div style="border-top:2px dashed #000; margin-top:3px; padding-top:3px;">
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">IMEI: 356789123456789</div>
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">FECHA: 27/05/2026</div>
            </div>
            <div style="border-top:2px dashed #000; margin-top:3px; padding-top:3px;">
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">REVISAR / REPARAR:</div>
                <div style="font-weight:900; -webkit-text-stroke:0.3px #000;">☐ CRISTAL ROTO</div>
                <div style="font-weight:900; -webkit-text-stroke:0.3px #000;">☐ GHOST TOUCH</div>
            </div>
        `;
    } else if(tipo === 'diag_reacond') {
        contenido = `
            <div style="text-align:center; font-weight:900; -webkit-text-stroke:0.4px #000; font-size:${f + 1}px; border-bottom:2px solid #000; padding-bottom:2px;">DIAGNÓSTICO</div>
            <div style="font-weight:900; -webkit-text-stroke:0.4px #000; margin-top:3px;">IP12 PRO MAX 256GB</div>
            <div style="border-top:2px dashed #000; margin-top:3px; padding-top:3px;">
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">IMEI: 356789123456789</div>
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">FECHA: 27/05/2026</div>
            </div>
            <div style="border-top:2px dashed #000; margin-top:3px; padding-top:3px;">
                <div style="font-weight:900; -webkit-text-stroke:0.4px #000;">REVISAR / REPARAR:</div>
                <div style="font-weight:900; -webkit-text-stroke:0.3px #000;">☐ GHOST TOUCH</div>
                <div style="font-weight:900; -webkit-text-stroke:0.3px #000;">☐ PANT ROTA</div>
            </div>
        `;
    }
    
    card.style.cssText = `width:${w}mm; min-height:${h}mm; padding:${m}mm; background:#fff; color:#000; font-family:Arial,Helvetica,sans-serif; font-weight:900; font-size:${f}px; line-height:1.3; box-shadow:0 4px 12px rgba(0,0,0,0.15); border:1px dashed #94a3b8; box-sizing:border-box;`;
    card.innerHTML = contenido;
    
    // Actualizar detalles del perfil
    const detalles = document.getElementById('perfilDetalles');
    if(detalles) {
        detalles.innerHTML = `
            <b>Tamaño:</b> ${w}mm × ${h}mm<br>
            <b>Tipo:</b> ${tipo === 'venta' ? 'Label de Venta' : tipo === 'diagnostico' ? 'Diagnóstico Taller' : 'Diagnóstico Reacondicionados'}<br>
            <b>Fuente:</b> ${f}px · <b>Margen:</b> ${m}mm<br>
            ${bh > 0 ? `<b>Barcode:</b> ${bh}px de alto` : '<b>Sin código de barras</b>'}
        `;
    }
}

async function guardarPerfilActual() {
    const sel = document.getElementById('cfg_perfil_actual');
    if(!sel) return;
    const nombre = sel.value;
    const perfiles = obtenerPerfilesImpresora();
    const idx = perfiles.findIndex(p => p.nombre === nombre);
    if(idx < 0) return alert('Perfil no encontrado.');
    
    perfiles[idx] = {
        nombre: nombre,
        width: parseInt(document.getElementById('cfgi_width').value),
        height: parseInt(document.getElementById('cfgi_height').value),
        font: parseInt(document.getElementById('cfgi_font').value),
        barcode: parseInt(document.getElementById('cfgi_barcode_h').value),
        margin: parseInt(document.getElementById('cfgi_margin').value),
        tipo: document.getElementById('cfgi_tipo').value
    };
    
    guardarPerfilesImpresora(perfiles);
    toast(`Perfil "${nombre}" guardado.`);
}

function abrirModalNuevoPerfil() {
    document.getElementById('mod_perfil_nombre').value = '';
    document.getElementById('modalNuevoPerfil').classList.add('active');
    setTimeout(() => document.getElementById('mod_perfil_nombre').focus(), 100);
}

function cerrarModalNuevoPerfil() {
    document.getElementById('modalNuevoPerfil').classList.remove('active');
}

function confirmarNuevoPerfil() {
    const nombre = val('mod_perfil_nombre');
    if(!nombre) return alert('Escribe un nombre para el perfil.');
    
    const perfiles = obtenerPerfilesImpresora();
    if(perfiles.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        return alert('Ya existe un perfil con ese nombre.');
    }
    
    perfiles.push({
        nombre: nombre,
        width: parseInt(document.getElementById('cfgi_width').value),
        height: parseInt(document.getElementById('cfgi_height').value),
        font: parseInt(document.getElementById('cfgi_font').value),
        barcode: parseInt(document.getElementById('cfgi_barcode_h').value),
        margin: parseInt(document.getElementById('cfgi_margin').value),
        tipo: document.getElementById('cfgi_tipo').value
    });
    
    guardarPerfilesImpresora(perfiles);
    setPerfilActivoNombre(nombre);
    inicializarConfigImpresora();
    cerrarModalNuevoPerfil();
    toast(`Perfil "${nombre}" creado.`);
}

function eliminarPerfilActual() {
    const sel = document.getElementById('cfg_perfil_actual');
    if(!sel) return;
    const nombre = sel.value;
    
    const perfiles = obtenerPerfilesImpresora();
    if(perfiles.length <= 1) return alert('No puedes eliminar el único perfil. Debe haber al menos uno.');
    
    if(!confirm(`¿Eliminar el perfil "${nombre}"?`)) return;
    
    const nuevos = perfiles.filter(p => p.nombre !== nombre);
    guardarPerfilesImpresora(nuevos);
    setPerfilActivoNombre(nuevos[0].nombre);
    inicializarConfigImpresora();
    toast(`Perfil eliminado.`);
}

function imprimirTestImpresora() {
    const w = parseInt(document.getElementById('cfgi_width').value);
    const h = parseInt(document.getElementById('cfgi_height').value);
    const m = parseInt(document.getElementById('cfgi_margin').value);
    const card = document.getElementById('previewImpresoraCard');
    
    const testHtml = `
        <style>
            @page { size: ${w}mm ${h}mm; margin: 0; }
            @media print {
                body { margin: 0; padding: 0; }
                .print-area { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        <div style="width:${w}mm; min-height:${h}mm; padding:${m}mm; background:#fff; color:#000; font-family:'Courier New', monospace; box-sizing:border-box;">
            ${card.innerHTML}
        </div>
    `;
    imprimirContenido(testHtml, 1, w, h);
}

function imprimirReglaCalibracion() {
    const w = parseInt(document.getElementById('cfgi_width').value);
    
    // Generar marcas de regla cada 5mm
    let marcasHtml = '';
    for(let i = 0; i <= w; i++) {
        const esCm = i % 10 === 0;
        const esMedio = i % 5 === 0;
        const altura = esCm ? '4mm' : (esMedio ? '2.5mm' : '1.5mm');
        const grosor = esCm ? '0.4mm' : '0.2mm';
        const label = esCm && i > 0 ? `<div style="position:absolute; bottom:5mm; font-size:6px; transform:translateX(-50%);">${i/10}cm</div>` : '';
        marcasHtml += `<div style="position:absolute; left:${i}mm; bottom:0; width:${grosor}; height:${altura}; background:#000;">${label}</div>`;
    }
    
    const reglaHtml = `
        <style>
            @page { size: ${w}mm 15mm; margin: 0; }
            @media print {
                body { margin: 0; padding: 0; }
                .print-area { margin: 0 !important; padding: 0 !important; }
            }
        </style>
        <div style="width:${w}mm; height:15mm; padding:0; background:#fff; color:#000; position:relative; box-sizing:border-box;">
            <div style="font-size:7px; text-align:center; padding-top:1mm;">REGLA DE CALIBRACIÓN BAYOL CELL</div>
            <div style="position:absolute; left:0; right:0; bottom:0; height:8mm;">${marcasHtml}</div>
        </div>
    `;
    imprimirContenido(reglaHtml, 1, w, 15);
}

function abrirConfigWindows() {
    alert('Para abrir la configuración de la impresora:\n\n1. Presiona Windows + R\n2. Escribe: control printers\n3. Presiona Enter\n4. Clic derecho en "4BARCODE 4B-2074B" → Preferencias de impresión\n\nDesde ahí ajustas tamaño del papel, velocidad, densidad, etc.');
}

// Cerrar modal nuevo perfil con Escape y clic fuera
document.addEventListener('keydown', e => {
    if(e.key === 'Escape') cerrarModalNuevoPerfil();
});
document.getElementById('modalNuevoPerfil')?.addEventListener('click', e => {
    if(e.target.id === 'modalNuevoPerfil') cerrarModalNuevoPerfil();
});

const saved = localStorage.getItem("bayol_session");
if(saved) { try { sessionUser = JSON.parse(saved); startApp(); } catch(e){ logError("Restaurar sesión local", e); localStorage.removeItem("bayol_session"); } }
</script>
</body>
</html>
