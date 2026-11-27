// Busca textos de bajo contraste que aparecen SOLO con el tema Stripe (comparado con el Claro, misma pantalla) y dice
// qué regla de tema-stripe.css los pinta. Uso: igual que qa-tema-stripe.mjs (servidor simulado en :8942).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ir = (v) => `nav('${v}',document.querySelector('[onclick*="nav(\\'${v}\\'"]'))`;
const PANTALLAS = [['inicio', ir('dashboard')], ['clientes', ir('clientes')], ['facturas', ir('facturas')], ['cobros', ir('facturas') + ";setTimeout(()=>switchTab('cob'),300)"], ['pagos', ir('facturas') + ";setTimeout(()=>switchTab('pagos'),300)"], ['custodia', ir('custodia')], ['polizas', ir('polizas')], ['agentes', ir('agentes')], ['config', ir('config')], ['registrar-pago', ir('clientes') + ';setTimeout(()=>abrirAbono(ST.clientes[0].id),300)']];
const MEDIR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const fondo = (el) => { for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); const bi = cs.backgroundImage; if (bi && bi !== 'none' && /gradient/.test(bi)) { const m = /rgba?\([^)]+\)/.exec(bi); if (m) { const c = parse(m[0]); if (c && c.a > .5) return c; } } const c = parse(cs.backgroundColor); if (c && c.a > .6) return c; } return { r: 246, g: 249, b: 252, a: 1 }; };
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!el.getClientRects().length) return;
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!/[\p{L}\p{N}]/u.test(t)) return;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < .2) return;
    const c = parse(cs.color); if (!c) return;
    const f = fondo(el); const k = ratio(c, f);
    const id = (el.id ? '#' + el.id : '') + (typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    out.push({ k: +k.toFixed(2), t: t.slice(0, 30), id: el.tagName.toLowerCase() + id, color: cs.color, x: Math.round(r.x), y: Math.round(r.y) });
  });
  return out;
};
const browser = await chromium.launch();
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 800 }, isMobile: w < 500, hasTouch: w < 500 });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); } if (/sentry|emailjs/i.test(u)) return r.fulfill({ status: 200, body: '' }); return r.continue(); } catch (e) {} });
  await page.addInitScript(() => { localStorage.setItem('nx_tema', 'clasico'); localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2500);
  for (const [nom, js] of PANTALLAS) {
    const med = {};
    for (const tema of ['clasico', 'stripe']) {
      await page.evaluate((t) => aplicarTema(t, false), tema); await sleep(900);
      await page.evaluate((js) => { try { closeM('mAbono'); } catch (e) {} try { (0, eval)(js); } catch (e) {} }, js); await sleep(1300);
      med[tema] = await page.evaluate(MEDIR);
    }
    const claro = new Map(med.clasico.map(m => [m.id + '|' + m.t + '|' + m.x + '|' + m.y, m.k]));
    const malos = med.stripe.filter(m => m.k < 3 && (claro.get(m.id + '|' + m.t + '|' + m.x + '|' + m.y) ?? 9) >= 3);
    for (const m of malos.slice(0, 12)) console.log(`${w} ${nom}: ${m.k}:1 «${m.t}» ${m.id} color ${m.color} (en Claro ${claro.get(m.id + '|' + m.t + '|' + m.x + '|' + m.y)})`);
    if (!malos.length) console.log(`${w} ${nom}: sin textos que empeoren`);
  }
  await ctx.close();
}
await browser.close();
