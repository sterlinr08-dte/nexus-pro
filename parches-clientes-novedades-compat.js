/* NEXUS PRO · compatibilidad de Novedades con globals léxicos del index monolítico.
   index.html declara API/sesion con const/let: existen para scripts clásicos posteriores,
   pero no necesariamente como propiedades de window. La capa de Novedades usa window.API /
   window.sesion solo como detector seguro; aquí exponemos referencias sin duplicar estado. */
(function(){
  'use strict';
  try{
    if(typeof API!=='undefined' && !window.API){
      Object.defineProperty(window,'API',{configurable:true,enumerable:false,get:function(){return API;}});
    }
  }catch(e){}
  try{
    if(typeof sesion!=='undefined' && !Object.prototype.hasOwnProperty.call(window,'sesion')){
      Object.defineProperty(window,'sesion',{configurable:true,enumerable:false,get:function(){return sesion;}});
    }
  }catch(e){}
})();
