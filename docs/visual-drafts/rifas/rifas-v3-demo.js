const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const states=['available','available','confirmed','review','available','reserved','available','confirmed','available','blocked'];
const pad=n=>String(n).padStart(4,'0');
function makeNumbers(el,start,count){const box=$(el);if(!box)return;box.innerHTML='';for(let i=0;i<count;i++){const n=start+i;const st=states[n%states.length];const b=document.createElement('button');b.className='rfNumber '+st;b.textContent=pad(n);b.dataset.state=st;b.dataset.number=String(n);b.addEventListener('click',()=>openNumber(n,st));box.appendChild(b)}}
makeNumbers('#miniNumbers',241,24);makeNumbers('#numberGrid',1,120);
const payments=[
 {name:'Juan Pérez',phone:'829-555-0123',number:'0254',amount:'RD$500',time:'Hace 5 min',ticket:'TK-000245'},
 {name:'Ana Martínez',phone:'809-555-0201',number:'0675',amount:'RD$500',time:'Hace 8 min',ticket:'TK-000244'},
 {name:'Luis Castillo',phone:'849-555-0188',number:'0321, 0322',amount:'RD$1,000',time:'Hace 11 min',ticket:'TK-000243'},
 {name:'Carla Reyes',phone:'829-555-0177',number:'0901',amount:'RD$500',time:'Hace 16 min',ticket:'TK-000242'}
];
function renderPayments(){const el=$('#paymentList');if(!el)return;el.innerHTML=payments.map((p,i)=>`<div class="rfInboxItem" data-index="${i}"><div class="rfInitial">${p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><b>${p.name}</b><small>#${p.number} · ${p.time}</small></div><strong>${p.amount}</strong></div>`).join('');$$('.rfInboxItem').forEach(x=>x.onclick=()=>previewPayment(Number(x.dataset.index)))}
renderPayments();
function previewPayment(i){$$('.rfInboxItem').forEach(x=>x.classList.toggle('active',Number(x.dataset.index)===i));const p=payments[i];$('#paymentPreview').innerHTML=`<div class="rfCardHead"><div><h2>${p.ticket}</h2><p>${p.name} · ${p.phone}</p></div><span class="status review">En revisión</span></div><div class="rfReceipt">Vista previa del comprobante</div><div class="rfDetailList"><div><span>Número</span><b>${p.number}</b></div><div><span>Monto esperado</span><b>${p.amount}</b></div><div><span>Método</span><b>Transferencia</b></div><div><span>Recibido</span><b>${p.time}</b></div></div><div class="rfPreviewActions"><button class="ghost" onclick="toast('Comprobante rechazado')">Rechazar</button><button class="primary" onclick="toast('Pago aprobado')">Aprobar pago</button></div>`}
function switchView(name){$$('.rfView').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(innerWidth<801)$('.rfSide')?.classList.remove('open')}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$('#rfMenu')?.addEventListener('click',()=>$('.rfSide').classList.toggle('open'));
$('#statusFilter')?.addEventListener('change',filterNumbers);$('#numberSearch')?.addEventListener('input',filterNumbers);
function filterNumbers(){const q=($('#numberSearch')?.value||'').trim();const st=$('#statusFilter')?.value||'all';$$('#numberGrid .rfNumber').forEach(n=>{const okQ=!q||n.textContent.includes(q);const okS=st==='all'||n.dataset.state===st;n.style.display=okQ&&okS?'grid':'none'})}
function openNumber(n,st){openDrawer('Número #'+pad(n),`<div class="rfDetailList"><div><span>Estado</span><b>${label(st)}</b></div><div><span>Ticket</span><b>${st==='available'?'Sin asignar':'TK-000245'}</b></div><div><span>Participante</span><b>${st==='available'?'—':'Juan Pérez'}</b></div><div><span>Monto</span><b>${st==='available'?'—':'RD$500'}</b></div></div><div class="rfDrawerActions"><button class="primary" onclick="toast('Acción simulada')">${st==='available'?'Asignar número':'Ver ticket'}</button><button class="ghost" onclick="toast('WhatsApp abierto')">WhatsApp</button><button class="ghost" onclick="toast('Historial abierto')">Historial</button><button class="ghost" onclick="toast('Menú secundario')">Más acciones</button></div>`)}
function label(st){return({available:'Disponible',reserved:'Apartado',review:'En revisión',confirmed:'Confirmado',blocked:'Bloqueado'})[st]||st}
function openDrawer(title,html){$('#drawerTitle').textContent=title;$('#drawerBody').innerHTML=html;$('#rfDrawer').classList.add('open');$('#rfDrawer').setAttribute('aria-hidden','false')}
function closeDrawer(){$('#rfDrawer').classList.remove('open');$('#rfDrawer').setAttribute('aria-hidden','true')}
$$('[data-close]').forEach(b=>b.addEventListener('click',closeDrawer));
$$('[data-open="pago"]').forEach(b=>b.addEventListener('click',()=>{switchView('pagos');setTimeout(()=>previewPayment(0),0)}));
$$('[data-open="cliente"]').forEach(b=>b.addEventListener('click',()=>openDrawer('Juan Pérez',`<div class="rfDetailList"><div><span>Teléfono</span><b>829-555-0123</b></div><div><span>Tickets</span><b>1</b></div><div><span>Números</span><b>0254</b></div><div><span>Total pagado</span><b>RD$0</b></div></div><div class="rfDrawerActions"><button class="primary">Ver participante</button><button class="ghost">WhatsApp</button></div>`)));
function toast(msg){const t=$('#rfToast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__rfToast);window.__rfToast=setTimeout(()=>t.classList.remove('show'),1800)}
window.toast=toast;
