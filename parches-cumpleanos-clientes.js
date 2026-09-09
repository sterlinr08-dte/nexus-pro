/* NEXUS PRO · Clientes · fecha de nacimiento para automatizaciones de cumpleaños · 2026-09-09
   Campo real del modal #mCli. Se integra con abrirNuevoCli/editarCli/guardarCli y añade
   fecha_nacimiento al mismo INSERT/PATCH de clientes, sin duplicar el formulario. */
(function(){
  'use strict';
  if(window.__nxCumpleClientes20260909)return;
  window.__nxCumpleClientes20260909=true;

  const $=s=>document.querySelector(s);
  const STX=()=>{try{return window.ST||(typeof ST!=='undefined'?ST:{})}catch(e){return window.ST||{}}};
  const APIX=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const EDITID=()=>{try{return typeof editCliId!=='undefined'?editCliId:(window.editCliId||null)}catch(e){return window.editCliId||null}};

  function hoyLocal(){
    const d=new Date(),p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  function toastSafe(tipo,titulo,detalle){
    try{if(typeof window.toast==='function')return window.toast(tipo,titulo,detalle||'');}catch(e){}
  }

  function asegurarCampo(){
    if($('#cFecNac'))return $('#cFecNac');
    const email=$('#cEmail');
    const emailFr=email&&email.closest('.fr');
    if(!emailFr)return null;

    const fr=document.createElement('div');
    fr.className='fr nxCumpleClienteFr';
    fr.innerHTML='<label>Fecha de nacimiento</label><input type="date" id="cFecNac" autocomplete="bday" min="1900-01-01" aria-label="Fecha de nacimiento para felicitación de cumpleaños"/>';
    emailFr.insertAdjacentElement('afterend',fr);

    const input=$('#cFecNac');
    if(input)input.max=hoyLocal();
    return input;
  }

  function valorNacimiento(){
    const el=asegurarCampo();
    return el&&el.value?el.value:null;
  }

  function validarNacimiento(){
    const v=valorNacimiento();
    if(!v)return true;
    if(v>hoyLocal()){
      toastSafe('err','Fecha inválida','La fecha de nacimiento no puede estar en el futuro.');
      try{$('#cFecNac')?.focus();}catch(e){}
      return false;
    }
    return true;
  }

  function envolver(){
    asegurarCampo();

    const abrirOriginal=window.abrirNuevoCli;
    if(typeof abrirOriginal==='function'&&!abrirOriginal.__nxCumpleWrap){
      const fn=function(){
        asegurarCampo();
        const r=abrirOriginal.apply(this,arguments);
        const el=$('#cFecNac');if(el){el.value='';el.max=hoyLocal();}
        return r;
      };
      fn.__nxCumpleWrap=true;window.abrirNuevoCli=fn;
    }

    const editarOriginal=window.editarCli;
    if(typeof editarOriginal==='function'&&!editarOriginal.__nxCumpleWrap){
      const fn=function(id){
        asegurarCampo();
        const r=editarOriginal.apply(this,arguments);
        const c=(STX().clientes||[]).find(x=>String(x.id)===String(id));
        const el=$('#cFecNac');if(el){el.value=(c&&c.fecha_nacimiento)||'';el.max=hoyLocal();}
        return r;
      };
      fn.__nxCumpleWrap=true;window.editarCli=fn;
    }

    const guardarOriginal=window.guardarCli;
    if(typeof guardarOriginal==='function'&&!guardarOriginal.__nxCumpleWrap){
      const fn=async function(){
        asegurarCampo();
        if(!validarNacimiento())return;
        const nacimiento=valorNacimiento();
        const editIdAntes=EDITID();
        const A=APIX();
        if(!A||typeof A.post!=='function'||typeof A.patch!=='function')return await guardarOriginal.apply(this,arguments);

        const postOriginal=A.post;
        const patchOriginal=A.patch;
        A.post=async function(tabla,datos){
          if(tabla==='clientes'&&datos&&typeof datos==='object')datos={...datos,fecha_nacimiento:nacimiento};
          return await postOriginal.call(this,tabla,datos);
        };
        A.patch=async function(tabla,filtro,datos){
          if(tabla==='clientes'&&datos&&typeof datos==='object')datos={...datos,fecha_nacimiento:nacimiento};
          return await patchOriginal.call(this,tabla,filtro,datos);
        };

        try{
          const r=await guardarOriginal.apply(this,arguments);
          if(editIdAntes){
            const c=(STX().clientes||[]).find(x=>String(x.id)===String(editIdAntes));
            if(c)c.fecha_nacimiento=nacimiento;
          }
          return r;
        }finally{
          A.post=postOriginal;
          A.patch=patchOriginal;
        }
      };
      fn.__nxCumpleWrap=true;window.guardarCli=fn;
    }
  }

  envolver();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',envolver,{once:true});
})();
