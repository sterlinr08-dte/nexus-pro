// QA de la página pública «Crear mi tienda» (registro.html, 15-nov-2026). La Edge `registro-tienda` va SIMULADA
// (nunca crea nada real). Uso: python3 -m http.server 8944 &  NODE_PATH=... node scripts/qa-registro-web.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const pedidos = [];
    await ctx.route(/registro-tienda/, async r => { const body = JSON.parse(r.request().postData() || '{}'); pedidos.push(body);
      if (body.usuario === 'ocupado') return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, campo: 'usuario', error: 'Usuario de 3 a 30 letras o números, sin espacios.' }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, slug: 'colmado-la-fe', entrar: body.usuario + '@colmado-la-fe', prueba_hasta: new Date(Date.now() + 14 * 864e5).toISOString(), access_token: 'TOK', refresh_token: 'REF', expires_in: 3600 }) }); });
    await ctx.route(/\/index\.html/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>app</p>' }));
    await p.goto(BASE + '/registro.html'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => ({ inputs: [...document.querySelectorAll('input')].map(i => ({ h: Math.round(i.getBoundingClientRect().height), f: getComputedStyle(i).fontSize })), btn: Math.round(document.getElementById('crear').getBoundingClientRect().height), sx: document.documentElement.scrollWidth > innerWidth }));
    ok(m.inputs.length === 5 && m.inputs.every(i => i.h >= 48 && i.f === '16px'), `${w}px: 5 campos de 48 px con letra de 16 px`, m.inputs);
    ok(m.btn >= 54 && !m.sx, `${w}px: botón de 54 px y sin desplazamiento horizontal`, m);
    if (OUT) await p.screenshot({ path: `${OUT}/registro-${w}.png`, fullPage: true });
    await p.click('#crear'); await p.waitForTimeout(200);
    ok(pedidos.length === 0 && /negocio/i.test(await p.textContent('#err')), `${w}px: vacío no envía y pide el negocio`);
    await p.fill('#negocio', 'Colmado La Fe'); await p.fill('#nombre', 'María Pérez'); await p.fill('#telefono', '305-555-0000'); await p.fill('#usuario', 'Maria Pérez!'); await p.fill('#clave', '12345678');
    ok((await p.inputValue('#usuario')) === 'mariaperez', `${w}px: el usuario se limpia mientras se escribe (minúsculas, sin espacios)`, await p.inputValue('#usuario'));
    await p.click('#crear'); await p.waitForTimeout(200);
    ok(pedidos.length === 0 && /WhatsApp de RD/.test(await p.textContent('#err')) && (await p.getAttribute('#telefono', 'aria-invalid')) === 'true', `${w}px: teléfono fuera de RD no se envía y se marca el campo`);
    await p.fill('#telefono', '809-555-0000'); await p.fill('#clave', '123'); await p.click('#crear'); await p.waitForTimeout(200);
    ok(pedidos.length === 0 && /8 caracteres/.test(await p.textContent('#err')), `${w}px: clave corta no se envía`);
    await p.fill('#clave', '12345678'); await p.fill('#usuario', 'ocupado'); await p.click('#crear'); await p.waitForTimeout(500);
    ok(pedidos.length === 1 && (await p.getAttribute('#usuario', 'aria-invalid')) === 'true', `${w}px: el error del servidor marca el campo`);
    await p.fill('#usuario', 'maria'); await p.click('#crear'); await p.waitForTimeout(600);
    const d = pedidos[pedidos.length - 1];
    ok(d && d.negocio === 'Colmado La Fe' && d.telefono === '809-555-0000' && d.usuario === 'maria' && d.clave === '12345678', `${w}px: envía los datos del formulario`, d);
    const ok2 = await p.evaluate(() => ({ vis: getComputedStyle(document.getElementById('paso2')).display, u: document.getElementById('entrarTxt').textContent, pr: document.getElementById('pruebaTxt').textContent }));
    ok(ok2.vis === 'block' && ok2.u === 'maria@colmado-la-fe' && /Prueba gratis hasta/.test(ok2.pr), `${w}px: muestra «maria@colmado-la-fe» y la fecha de la prueba`, ok2);
    if (OUT) await p.screenshot({ path: `${OUT}/registro-listo-${w}.png`, fullPage: true });
    await Promise.all([p.waitForURL(/index\.html#access_token=TOK/), p.click('#ir')]);
    ok(/refresh_token=REF/.test(p.url()) && (await p.evaluate(() => localStorage.getItem('nx_org_tipo'))) === 'tienda', `${w}px: «Entrar a mi tienda» entra con la sesión y en modo tienda`);
    ok(errs.length === 0, `${w}px: 0 errores de JS`, errs); await ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
