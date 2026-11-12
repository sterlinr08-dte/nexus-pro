/* NEXUS PRO · «Cuenta segura» en Registrar pago (dueño, 12-nov-2026).
   Problema: pagos que entraron a la cuenta del administrador quedaban como efectivo o «a cuenta de» otro agente.
   Esta capa solo AVISA antes de guardar; la regla real vive en el servidor
   (supabase/migrations/20261112220000_seguros_cobro_cuenta_segura.sql):
     · Transferencia/Depósito sin comprobante no se registra (el administrador sí puede).
     · Cuenta de otro agente: el pago queda pendiente y lo valida el administrador.
     · Si el comprobante dice otra cuenta, el servidor lo rechaza y dice cuál elegir.
   No cambia la lógica del cobro: envuelve regAbono() por fuera, como la capa del comprobante único.
   Apagar los avisos en un equipo: localStorage.nx_cuenta_segura_off='1' (la regla del servidor sigue). */
(function () {
  'use strict';
  if (window.__nxCuentaSegura) return; window.__nxCuentaSegura = true;
  try { if (localStorage.getItem('nx_cuenta_segura_off') === '1') return; } catch (e) {}

  const ses = () => { try { return (typeof sesion !== 'undefined') ? sesion : null; } catch (e) { return null; } };
  const esAdmin = () => { const s = ses(); return !!(s && s.rol === 'admin'); };
  const agentes = () => { try { const s = (typeof ST !== 'undefined') ? ST : window.ST; return (s && s.agentes) || []; } catch (e) { return []; } };
  const esCuentaAdmin = id => { const a = agentes().find(x => String(x.id) === String(id)); return !!(a && String(a.cargo || '').toLowerCase() === 'admin'); };
  const bancario = () => { const m = (document.getElementById('aMet') || {}).value || ''; return m === 'Transferencia' || m === 'Depósito'; };
  const toast = (t, a, b) => { try { window.toast && window.toast(t, a, b || ''); } catch (e) {} };

  /* Estado corto bajo «Cuenta de destino» (la ayuda larga sigue en la ⓘ): dice qué pasa con la cuenta elegida. */
  function nota() {
    const wrap = document.getElementById('aDirectoWrap'); if (!wrap) return;
    let n = document.getElementById('nxCtaSegNota');
    if (!n) {
      n = document.createElement('div'); n.id = 'nxCtaSegNota'; n.setAttribute('role', 'status');
      n.style.cssText = 'font-size:12.5px;line-height:1.35;font-weight:600;margin-top:8px';
      wrap.appendChild(n);
    }
    const id = (document.getElementById('aDirectoCuenta') || {}).value || '';
    const falta = bancario() && !window._nxBaucheURL && !esAdmin();
    const partes = [];
    if (id && !esCuentaAdmin(id)) partes.push('La valida el administrador'); // la cuenta del administrador no necesita aviso
    if (falta) partes.push('Falta el comprobante');
    const t = partes.join(' · ');
    if (n.textContent !== t) n.textContent = t;
    n.style.display = t ? '' : 'none';
    n.style.color = falta ? '#b45309' : '#1d4ed8';
    // El rótulo del comprobante deja de decir «(opcional)» cuando es obligatorio.
    const lb = document.querySelector('#nxBaucheWrap > label');
    if (lb) { const tn = [...lb.childNodes].find(x => x.nodeType === 3 && /\(opcional\)|\*/.test(x.nodeValue));
      if (tn) { const q = bancario() && !esAdmin(); const v = tn.nodeValue.replace(/\s*(\(opcional\)|\*)/, q ? ' *' : ' (opcional)'); if (v !== tn.nodeValue) tn.nodeValue = v; } }
  }

  /* Candado antes de guardar: sin comprobante no se llama al servidor. */
  function envolver() {
    if (window.__nxRegAbonoCtaSegura) return true;
    if (typeof window.regAbono !== 'function') return false;
    window.__nxRegAbonoCtaSegura = true;
    const orig = window.regAbono;
    window.regAbono = async function () {
      if (bancario() && !window._nxBaucheURL && !esAdmin()) {
        toast('err', 'Falta el comprobante', 'Adjunte la foto de la transferencia o del depósito');
        const z = document.getElementById('nxBaucheWrap') || document.getElementById('aDirectoWrap');
        try { z && z.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        nota();
        return;
      }
      return orig.apply(this, arguments);
    };
    return true;
  }

  let n = 0;
  (function intento() { if (envolver() || ++n > 60) return; setTimeout(intento, 500); })();
  document.addEventListener('change', e => { const id = e.target && e.target.id; if (id === 'aMet' || id === 'aDirectoCuenta') nota(); }, true);
  let pend = false;
  new MutationObserver(() => { if (pend) return; pend = true; setTimeout(() => { pend = false; if (document.getElementById('aDirectoWrap')) nota(); }, 150); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
