// QA del botón «Compartir imagen» del recibo animado (07-oct-2026). App real; toda la red externa simulada
// (nunca toca la base real ni manda WhatsApp). Uso (desde la raíz): python3 -m http.server 8944 &   node scripts/qa-recibo-compartir.mjs
import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '/tmp';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };

const DATOS = { empresa: 'CORREDORES DE SEGURO DEMO', titulo: 'Pago registrado', cliente: 'MARÍA ALTAGRACIA DE LOS SANTOS RODRÍGUEZ', monto: 3250.5,
  filas: [{ label: 'Método', valor: 'Transferencia' }, { label: 'Referencia', valor: 'BHD-778812' }, { label: 'Póliza', valor: 'SH-0012345' }],
  folio: 'ABO-1A2B3C4D', compartirImagen: true };

async function abrir(b, vw, conShare) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vw < 500 ? 844 : 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
    const u = r.request().url();
    if (/supabase\.co/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' });
  });
  await page.addInitScript(cs => {
    window.__shares = [];
    if (cs) { navigator.canShare = o => !!(o && o.files && o.files.length); navigator.share = o => { window.__shares.push(o); return Promise.resolve(); }; }
    else { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch (e) {} navigator.share = undefined; navigator.canShare = undefined; }
  }, conShare);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(2500);
  return { ctx, page, errs };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const vw of [390, 1280]) {
    // ── Con compartir nativo de archivos (iPhone/Android) ──
    {
      const { ctx, page, errs } = await abrir(b, vw, true);
      ok(await page.evaluate(() => typeof window.nxReciboAnimado === 'function'), `[${vw}] el recibo animado existe`);
      await page.evaluate(d => window.nxReciboAnimado(d, [{ label: 'WhatsApp', icon: 'ti-brand-whatsapp', cls: 'wa', onclick: () => { window.__wa = 1; } }, { label: 'Ver / compartir recibo', icon: 'ti-receipt', onclick: () => {} }]), DATOS);
      await page.waitForTimeout(1200);
      const bt = await page.evaluate(() => [...document.querySelectorAll('.nxRA-acts .nxRA-btn')].map(x => x.textContent.trim()));
      ok(bt.join('|') === 'WhatsApp|Ver / compartir recibo|Compartir imagen|Cerrar', `[${vw}] botones en orden: WhatsApp, Ver/compartir, Compartir imagen, Cerrar`, bt);
      const desb = await page.evaluate(() => { const o = document.querySelector('.nxRA-ov'); const r = [...o.querySelectorAll('.nxRA-btn')].map(x => x.getBoundingClientRect()); return { sw: document.documentElement.scrollWidth, iw: innerWidth, fuera: r.filter(x => x.right > innerWidth + 0.5 || x.left < -0.5).length }; });
      ok(desb.sw <= desb.iw && desb.fuera === 0, `[${vw}] ningún botón se sale de la pantalla`, desb);
      await page.screenshot({ path: `${OUT}/qa-recibo-${vw}.png` });
      await page.click('[data-share-img="1"]'); await page.waitForTimeout(400);
      const sh = await page.evaluate(async () => { const s = window.__shares[0]; if (!s) return null; const f = s.files && s.files[0];
        const buf = new Uint8Array(await f.arrayBuffer()); const bmp = await createImageBitmap(f);
        let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return { n: window.__shares.length, nombre: f.name, tipo: f.type, sig: [...buf.slice(0, 4)], w: bmp.width, h: bmp.height, kb: Math.round(buf.length / 1024), texto: 'text' in s || 'url' in s, b64: btoa(bin), sigueAbierto: !!document.querySelector('.nxRA-ov') }; });
      ok(sh && sh.n === 1, `[${vw}] tocar «Compartir imagen» abre el compartir nativo una vez`);
      ok(sh && sh.nombre === 'recibo-ABO-1A2B3C4D.png' && sh.tipo === 'image/png', `[${vw}] archivo recibo-<folio>.png de tipo image/png`, sh && { n: sh.nombre, t: sh.tipo });
      ok(sh && sh.sig.join(',') === '137,80,78,71' && sh.w === 1080 && sh.h > 900, `[${vw}] PNG válido a 1080 px de ancho`, sh && { sig: sh.sig, w: sh.w, h: sh.h, kb: sh.kb });
      ok(sh && !sh.texto, `[${vw}] se comparte solo el archivo (sin texto, para que WhatsApp en iPhone no descarte la imagen)`);
      ok(sh && sh.sigueAbierto, `[${vw}] la tarjeta sigue abierta después de compartir (se puede tocar WhatsApp o Cerrar)`);
      if (sh && vw === 390) { writeFileSync(`${OUT}/qa-recibo-imagen.png`, Buffer.from(sh.b64, 'base64')); console.log(`      imagen: ${sh.w}x${sh.h}, ${sh.kb} KB`); }
      await page.click('.nxRA-btn.wa'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => window.__wa === 1 && !document.querySelector('.nxRA-ov')), `[${vw}] WhatsApp sigue haciendo lo de antes y cierra la tarjeta`);
      // Módulos que no lo piden (Financiamiento, POS): sin botón nuevo
      await page.evaluate(d => { const x = Object.assign({}, d); delete x.compartirImagen; window.nxReciboAnimado(x, []); }, DATOS); await page.waitForTimeout(300);
      ok(await page.evaluate(() => !document.querySelector('[data-share-img]')), `[${vw}] sin datos.compartirImagen no aparece el botón (Financiamiento y POS quedan igual)`);
      ok(errs.length === 0, `[${vw}] sin errores de JavaScript`, errs.slice(0, 3));
      await ctx.close();
    }
    // ── Sin compartir de archivos (escritorio / navegador viejo): descarga ──
    {
      const { ctx, page, errs } = await abrir(b, vw, false);
      await page.evaluate(d => window.nxReciboAnimado(d, []), DATOS); await page.waitForTimeout(1000);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }).catch(() => null), page.click('[data-share-img="1"]')]);
      ok(dl && dl.suggestedFilename() === 'recibo-ABO-1A2B3C4D.png', `[${vw}] sin compartir nativo: descarga recibo-<folio>.png`, dl && dl.suggestedFilename());
      ok(errs.length === 0, `[${vw}] sin errores de JavaScript (descarga)`, errs.slice(0, 3));
      await ctx.close();
    }
  }
  // Los dos recibos de Seguros (abono y deuda anterior) piden el botón; ningún otro módulo
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  ok((html.match(/compartirImagen:true/g) || []).length === 2, 'Seguros: abono y deuda anterior activan el botón (2 sitios)');
  const otros = ['parches-financiamiento.js', 'parches-pos.js'].filter(f => /compartirImagen/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8')));
  ok(otros.length === 0, 'Financiamiento y POS no lo activan', otros);
  await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
