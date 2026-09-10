/* NEXUS PRO · WhatsApp · carga resiliente del Inbox · 2026-09-10
   Corrige el falso estado "0 conversaciones" cuando la primera consulta a
   whatsapp_hilos falla de forma transitoria. No toca mensajes, pagos, Realtime,
   scroll ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaCargaResiliente20260910)return;
  window.__nxWaCargaResiliente20260910=true;

  var intentos=0,timer=null,enCurso=false;
  var MAX=4;
  var DELAYS=[500,1200,2500,5000];

  function api(){
    try{return window.API||(typeof API!=='undefined'?API:null);}catch(e){return window.API||null;}
  }
  function root(){return document.getElementById('v-waInbox');}
  function visible(){var r=root();return !!(r&&r.classList.contains('on'));}
  function uiCero(){
    var r=root();if(!r)return false;
    var k=r.querySelector('.nxWaProKpi .v');
    var lista=r.querySelector('#nxWaLista');
    var txt=lista?String(lista.textContent||'').toLowerCase():'';
    return !!(k&&String(k.textContent||'').trim()==='0'&&txt.indexOf('todavia no han llegado mensajes')>=0);
  }
  function ponerError(){
    var r=root(),lista=r&&r.querySelector('#nxWaLista');if(!lista)return;
    lista.innerHTML='<div class="nxWaEmpty" style="padding:22px 14px;text-align:center">'
      +'<b style="display:block;margin-bottom:6px;color:#b45309">No se pudieron cargar las conversaciones.</b>'
      +'<span style="display:block;margin-bottom:10px">Tus chats siguen guardados. Reintentaremos automáticamente.</span>'
      +'<button type="button" onclick="nxWaInboxReintentarCarga()" style="min-height:30px;padding:0 11px;border:1px solid rgba(37,99,235,.25);border-radius:999px;background:#fff;color:#1d4ed8;font-weight:800;cursor:pointer">Reintentar</button>'
      +'</div>';
  }
  function limpiarTimer(){if(timer){clearTimeout(timer);timer=null;}}
  function programar(){
    limpiarTimer();
    if(!visible()||intentos>=MAX)return;
    var espera=DELAYS[Math.min(intentos,DELAYS.length-1)];
    timer=setTimeout(verificar,espera);
  }
  async function verificar(){
    timer=null;
    if(!visible()||enCurso)return;
    var A=api();
    if(!A||typeof A.get!=='function'){intentos++;programar();return;}
    enCurso=true;
    try{
      var filas=await A.get('whatsapp_hilos','order=ultimo_mensaje_at.desc.nullslast&limit=100&select=id');
      filas=Array.isArray(filas)?filas:[];
      if(filas.length>0&&uiCero()){
        intentos++;
        if(typeof window.nxAbrirWaInbox==='function'){
          window.nxAbrirWaInbox(document.getElementById('nxWaInboxNav'));
          programar();
        }
      }else{
        intentos=0;
        limpiarTimer();
      }
    }catch(e){
      intentos++;
      if(uiCero())ponerError();
      if(intentos<MAX)programar();
      try{console.warn('[WA Inbox] carga inicial falló; reintento '+intentos,e);}catch(_e){}
    }finally{enCurso=false;}
  }

  window.nxWaInboxReintentarCarga=function(){
    intentos=0;limpiarTimer();
    if(typeof window.nxAbrirWaInbox==='function')window.nxAbrirWaInbox(document.getElementById('nxWaInboxNav'));
    programar();
  };

  function envolverNav(){
    var n=window.nav;
    if(typeof n!=='function'||n.__nxWaCargaResiliente)return;
    var w=function(view,el){
      var r=n.apply(this,arguments);
      if(view==='waInbox'){
        intentos=0;
        setTimeout(function(){if(visible()&&uiCero())programar();},120);
      }
      return r;
    };
    w.__nxWaCargaResiliente=1;
    window.nav=w;
    try{nav=w;}catch(e){}
  }

  function start(){
    envolverNav();
    if(visible()&&uiCero())programar();
    var obs=new MutationObserver(function(){
      envolverNav();
      if(visible()&&uiCero()&&!timer&&!enCurso)programar();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
