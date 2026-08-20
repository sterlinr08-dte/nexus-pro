#!/usr/bin/env python3
"""Aplica el handoff visual Glass V1 de Financiamiento sobre parches.js.

Uso esperado en chatgpt/visual-draft:
  python scripts/financiamiento_glass_v1/apply.py

El aplicador es deliberadamente estricto: usa anclas únicas, no corre en main/master,
valida que no se duplique el parche y ejecuta `node --check parches.js` cuando Node está
disponible. Si la validación sintáctica falla, restaura el archivo original.
"""
from __future__ import annotations

import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
TARGET = ROOT / "parches.js"
MARKER = "GLASS V1 · ChatGPT · 2026-08-19"


def die(msg: str) -> None:
    raise SystemExit(f"[fin-glass] ERROR: {msg}")


def read_asset(name: str) -> str:
    p = HERE / name
    if not p.exists():
        die(f"falta el asset {p}")
    return p.read_text(encoding="utf-8").rstrip("\n")


def branch_name() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except Exception as exc:
        die(f"no pude detectar la rama Git: {exc}")


def replace_once(haystack: str, old: str, new: str, label: str) -> str:
    n = haystack.count(old)
    if n != 1:
        die(f"ancla {label!r}: esperaba 1 coincidencia y encontré {n}")
    return haystack.replace(old, new, 1)


def main() -> None:
    branch = branch_name()
    if branch in {"main", "master"}:
        die("no se permite aplicar esta entrega visual en main/master")
    if branch != "chatgpt/visual-draft" and not branch.startswith("chatgpt/"):
        die(f"rama no autorizada para este handoff: {branch}")
    if not TARGET.exists():
        die(f"no existe {TARGET}")

    original = TARGET.read_text(encoding="utf-8")
    if MARKER in original:
        die("Glass V1 ya aparece aplicado; no duplico el parche")
    text = original

    # 1) Dashboard de Financiamiento. Se modifica SOLO el renderLista que vive
    # después de prCobranzaMainHTML; hay otro renderLista en Vehículos.
    cob_idx = text.index("  function prCobranzaMainHTML()")
    render_start = text.index("  function renderLista(view) {", cob_idx)
    render_end = text.index(
        "  // ══════════════════════════════════════════════════════════════════\n"
        "  //  REPORTES DE FINANCIAMIENTO",
        render_start,
    )
    render = text[render_start:render_end]

    calc_anchor = "    }).length;\n    const nav = (key, lbl, ico) =>"
    render = replace_once(
        render,
        calc_anchor,
        "    }).length;\n" + read_asset("dashboard_data.jsfrag") + "\n    const nav = (key, lbl, ico) =>",
        "renderLista-datos-glass",
    )

    intro_anchor = ': `\n        <div class="nxFP-topbar">'
    intro_repl = ': `\n        ${esDashboardGlass ? glassIntro : \'\'}\n        <div class="nxFP-topbar">'
    render = replace_once(render, intro_anchor, intro_repl, "renderLista-glass-intro")

    search_anchor = '        <div class="nxFP-searchRow"><span id="nxPrBuscarLupa"></span></div>\n'
    search_repl = search_anchor + '        ${esDashboardGlass ? glassBody : \'\'}\n'
    render = replace_once(render, search_anchor, search_repl, "renderLista-glass-body")
    text = text[:render_start] + render + text[render_end:]

    # 2) Dock móvil: se conserva el host directo de <body> que evita el bug de
    # position:fixed dentro del contenedor con scroll en iOS.
    side_idx = text.index("  window.nxFPToggleSide = function ()")
    dock_start = text.index("  function renderFPDock() {", side_idx)
    dock_end = text.index("  window.nxFPToggleMore = function ()", dock_start)
    text = text[:dock_start] + read_asset("dock.jsfrag") + "\n" + text[dock_end:]

    # 3) Historial crediticio. Se conserva el resto de hcRender: las seis pestañas,
    # tablas, recomendaciones, indicadores, alertas y handlers actuales.
    hc_start = text.index("  function hcRender() {")
    hdr_start = text.index("    // ── Header cliente ──", hc_start)
    hdr_end = text.index("    // ── 10 KPI tiles ──", hdr_start)
    text = text[:hdr_start] + read_asset("history_header.jsfrag") + "\n" + text[hdr_end:]

    old_comp = '    body.innerHTML = clihead + kpis + `<div class="hc-2col"><div class="hc-main">${tabs}${mainTab}</div><aside class="hc-side">${rec}${indicadores}${alertPanel}</aside></div>`;'
    new_comp = '    body.innerHTML = clihead + hcHero + kpis + `<div class="hc-2col"><div class="hc-main">${tabs}${mainTab}</div><aside class="hc-side">${rec}${indicadores}${alertPanel}</aside></div>`;'
    text = replace_once(text, old_comp, new_comp, "hcRender-composicion")

    # 4) CSS al final de nxFPEnsureCSS para ganar por cascada sin reescribir el
    # motor compartido con Cuotas POS. El CSS nuevo está escopeado a .nxFPShell,
    # .hcModal y #nxFPDockHost; no toca .nxFP-pos. El guard desktop preserva la
    # composición existente porque el prototipo de Dashboard aprobado es móvil.
    css_fn = text.index("  window.nxFPEnsureCSS = function () {")
    css_append = text.index("    document.head.appendChild(st);", css_fn)
    css = read_asset("glass_v1.css") + "\n" + read_asset("glass_v1_desktop_guard.css")
    if "`" in css:
        die("los assets CSS contienen backticks y no pueden incrustarse de forma segura")
    css_js = (
        "    // GLASS V1 · ChatGPT · 2026-08-19 — apéndice visual aprobado.\n"
        "    st.textContent += `\n" + css + "\n    `;\n"
    )
    text = text[:css_append] + css_js + text[css_append:]

    # Guardas mínimas del handoff aprobado.
    required = [
        MARKER,
        "Nuevo financiamiento",
        ">Contratos</b><em>Próximamente</em>",
        ">MDM</b><em>Próximamente</em>",
        "nxFP-dockCenter",
        "moreItem('cuotas', 'Cuotas'",
        "hcHero",
        "hc-glScoreChip",
        "window.nxPrestamoNuevo()",
        "window.nxPrestamoFiltroTipo('vencidos')",
        "window.nxPrView('reportes')",
    ]
    for needle in required:
        if needle not in text:
            die(f"guardia ausente después del parche: {needle}")
    if text == original:
        die("el parche no produjo cambios")

    backup = TARGET.with_suffix(TARGET.suffix + ".glass-v1.bak")
    backup.write_text(original, encoding="utf-8")
    TARGET.write_text(text, encoding="utf-8")
    try:
        node = shutil.which("node")
        if node:
            subprocess.run([node, "--check", str(TARGET)], cwd=ROOT, check=True)
            syntax_msg = "node --check: OK"
        else:
            syntax_msg = "Node no disponible: validación sintáctica pendiente"
    except Exception:
        TARGET.write_text(original, encoding="utf-8")
        die("node --check falló; parches.js fue restaurado automáticamente")
    finally:
        try:
            backup.unlink()
        except FileNotFoundError:
            pass

    print(f"[fin-glass] Aplicado en {branch}")
    print(f"[fin-glass] {syntax_msg}")
    print("[fin-glass] Revisar: git diff -- parches.js")
    print("[fin-glass] Luego: Playwright 390px + consola limpia + auditoría funcional.")
    print("[fin-glass] No hacer merge directo a main; pasar por PR.")


if __name__ == "__main__":
    main()
