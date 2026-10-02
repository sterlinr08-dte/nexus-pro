// QA del brillo fijo (59.07, 02-oct-2026): barra superior, lo seleccionado y la línea vertical del menú lateral.
// Uso: node scripts/qa-crm-mock-server.js &   OUT=/ruta node scripts/qa-brillo-fijo.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8942', OUT=process.env.OUT||process.env.QA_OUT||require('os').tmpdir();
const qa=(p)=>new Promise(r=>http.get(BASE+'/__qa/'+p,res=>{res.resume();res.on('end',r);}).on('error',r));
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('PASS  '+m);}else{fail++;console.log('FAIL  '+m+(x!==undefined?' :: '+JSON.stringify(x):''));}};
async function abrir(b,w){
  const o={viewport:{width:w,height:w<500?844:720},hasTouch:w<500,isMobile:w<500};
  const ctx=await b.newContext(o);const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,async r=>{try{const u=r.request().url();
    if(/supabase\.co\//.test(u)){const resp=await r.fetch({url:u.replace(/^https:\/\/[^/]+/,BASE+'/supa')});return r.fulfill({response:resp});}
    return r.fulfill({status:200,contentType:/\.css|fonts\.googleapis/.test(u)?'text/css':'application/javascript',body:''});}catch(e){}});
  await page.addInitScript(()=>{localStorage.setItem('nx_auth_mode','legacy');sessionStorage.setItem('nx_sesion',JSON.stringify({id:'00000000-0000-4000-8000-000000000001',nom:'Esterlin Espinal',rol:'admin',cargo:'ADMIN',organizacion_id:'00000000-0000-4000-8000-000000000009',inicio:Date.now()}));sessionStorage.setItem('nx_sesion_actividad',String(Date.now()));sessionStorage.setItem('nx_ya_saludo','1');});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(4500);
  return {ctx,page,errs};
}
const marcas=(p)=>p.evaluate(()=>[...document.querySelectorAll('.nx-marca')].filter(m=>getComputedStyle(m).display!=='none'&&m.getBoundingClientRect().width>0).map(m=>{const h=m.parentElement;return (h.className||h.tagName).toString().slice(0,40)+(m.classList.contains('v')?' [v]':'');}));
(async()=>{
  await qa('tema/none');
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  // ESCRITORIO
  {const {ctx,page,errs}=await abrir(b,1280);
   const ref=await page.$('.tnav #btnRefrescar');const bb=await ref.boundingBox();
   const op0=await page.evaluate(()=>getComputedStyle(document.querySelector('.tnav'),'::after').opacity);
   ok(+op0>0.5,'barra superior: reflejo de arriba siempre encendido sin tocar nada ('+op0+')');
   await page.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await page.waitForTimeout(600);
   await page.mouse.move(640,500,{steps:6});await page.waitForTimeout(900);
   const g=await page.evaluate(()=>{const g=document.querySelector('.tnav > .nx-glide');const r=document.querySelector('#btnRefrescar').getBoundingClientRect();const gr=g&&g.getBoundingClientRect();return {cls:g&&g.className,op:g&&getComputedStyle(g).opacity,dx:gr?Math.abs(gr.left-r.left):99};});
   ok(/\bfijo\b/.test(g.cls)&&+g.op>0.9&&g.dx<3,'barra superior: tras clic la luz queda fija en el botón aunque el mouse se vaya',g);
   // pasar por otro botón y volver
   const otro=await (await page.$('.tnav .notif-bell')).boundingBox();
   await page.mouse.move(otro.x+otro.width/2,otro.y+otro.height/2,{steps:6});await page.waitForTimeout(600);
   await page.mouse.move(640,500,{steps:6});await page.waitForTimeout(900);
   const g2=await page.evaluate(()=>{const g=document.querySelector('.tnav > .nx-glide');const r=document.querySelector('#btnRefrescar').getBoundingClientRect();return Math.abs(g.getBoundingClientRect().left-r.left);});
   ok(g2<3,'barra superior: al salir, la luz vuelve al botón elegido',g2);
   await page.screenshot({path:OUT+'/fijo-1280-inicio.png'});
   // menú lateral
   const sp=await page.evaluate(()=>{const s=document.querySelector('#springInd');const a=getComputedStyle(s,'::after');return {w:a.width,h:parseFloat(a.height),bg:a.backgroundImage.slice(0,30),op:getComputedStyle(s).opacity};});
   ok(sp.w==='2px'&&sp.h>10&&/gradient/.test(sp.bg)&&+sp.op>0.5,'menú lateral: línea vertical de luz en el ítem elegido',sp);
   // navegar a otra pantalla y ver que la línea viaja
   const cli=await page.$('nav#sbEl .ni[onclick*="clientes"]');await cli.click();await page.waitForTimeout(1500);
   const sp2=await page.evaluate(()=>{const s=document.querySelector('#springInd').getBoundingClientRect();const o=document.querySelector('nav#sbEl .ni.on').getBoundingClientRect();return Math.abs(s.top-o.top);});
   ok(sp2<4,'menú lateral: la línea viaja con la píldora al elegir otro ítem',sp2);
   const m1=await marcas(page);
   ok(!m1.some(x=>/\bni\b/.test(x)),'escritorio: el ítem del menú no duplica la línea (la lleva el resorte)',m1);
   console.log('marcas clientes:',JSON.stringify(m1));
   await page.screenshot({path:OUT+'/fijo-1280-clientes.png'});
   for(const v of ['facturas','polizas','crm','solicitudes','whatsapp']){await page.evaluate(v=>{try{nav(v,document.querySelector('nav#sbEl .ni[onclick*="'+v+'"]'))}catch(e){}},v);await page.mouse.move(900,650);await page.waitForTimeout(1500);const m=await marcas(page);console.log('marcas '+v+':',JSON.stringify(m));await page.screenshot({path:OUT+'/fijo-1280-'+v+'.png'});}
   ok(errs.length===0,'escritorio: sin errores',errs);await ctx.close();}
  // IPHONE
  {const {ctx,page,errs}=await abrir(b,390);
   const ref=await page.$('.tnav #btnRefrescar');const bb=await ref.boundingBox();
   await page.tap('.tnav #btnRefrescar');await page.waitForTimeout(900);
   const g=await page.evaluate(()=>{const g=document.querySelector('.tnav > .nx-glide');return g?{cls:g.className,op:getComputedStyle(g).opacity,d:getComputedStyle(g).display}:null;});
   ok(g&&/\bfijo\b/.test(g.cls)&&+g.op>0.9&&g.d!=='none','iPhone: tocar un botón de la barra deja la luz fija',g);
   await page.screenshot({path:OUT+'/fijo-390-barra.png'});
   await page.evaluate(()=>{try{nav('clientes',document.querySelector('nav#sbEl .ni[onclick*="clientes"]'))}catch(e){}});await page.waitForTimeout(1500);
   await page.evaluate(()=>{try{toggleSB()}catch(e){}});await page.waitForTimeout(900);
   const m=await marcas(page);console.log('iphone menu:',JSON.stringify(m));
   const dup=await page.evaluate(()=>{const s=document.querySelector('#springInd');return s?{op:getComputedStyle(s).opacity,vis:s.getBoundingClientRect().height}:null;});
   console.log('iphone spring:',JSON.stringify(dup));
   ok(m.some(x=>/\[v\]/.test(x))||(dup&&+dup.op>0.5&&dup.vis>10),'iPhone: ítem elegido del menú con línea vertical',m);
   await page.screenshot({path:OUT+'/fijo-390-menu.png'});
   await page.evaluate(()=>{try{toggleSB()}catch(e){}});await page.waitForTimeout(500);
   for(const v of ['clientes','facturas','whatsapp']){await page.evaluate(v=>{try{nav(v,null)}catch(e){}},v);await page.waitForTimeout(1500);console.log('iphone '+v+':',JSON.stringify(await marcas(page)));await page.screenshot({path:OUT+'/fijo-390-'+v+'.png'});}
   ok(errs.length===0,'iPhone: sin errores',errs);await ctx.close();}
  await b.close();console.log(`\n${pass} PASS · ${fail} FAIL`);
})();
