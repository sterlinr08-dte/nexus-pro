# Integración RIFA ↔ Taller BayolCell

Guía completa para que el repo del taller (`bayolcell-taller`) conecte la **rifa presencial**.
La rifa vive en la base de **NEXUS PRO** (compartida); el taller solo **llama 2 funciones**
ya desplegadas. **No se replica nada** de la rifa en el taller.

> Modelo: la rifa es para clientes que **compran o reparan** en la tienda. Cada compra/recepción
> genera **un boleto** con el nombre + teléfono del cliente. Sin link, sin página pública, sin
> "por confirmar": el boleto entra **confirmado** y con número **al azar**, precio 0 (regalo).

---

## 1) Funciones ya desplegadas (base del taller `vkhwdvjtowrhkhqavnvk`)

Ambas con `verify_jwt:true` → **solo staff logueado del taller** puede llamarlas. La clave que
conecta con NEXUS PRO vive **server-side** (no va al navegador).

### `recepcion-boleto` — genera un boleto para un cliente
```
POST https://vkhwdvjtowrhkhqavnvk.supabase.co/functions/v1/recepcion-boleto
Headers:
  Authorization: Bearer <access_token del usuario del taller>
  apikey: <ANON KEY del taller>
  Content-Type: application/json
Body:
  { "nombre": "Juan Pérez", "telefono": "809-555-1234" }   // telefono es opcional
Respuesta OK:
  { "ok": true, "numero": "0423", "id": "<uuid>", "rifa": "Rifa iPhone" }
Errores (con mensaje listo para mostrar en .msg):
  { "error": "falta_nombre", "msg": "..." }      (400)
  { "error": "sin_rifa",     "msg": "No hay una rifa activa..." }  (404)
  { "error": "sin_numeros",  "msg": "Ya no quedan números..." }    (409)
```

### `puente-rifa` — abre el panel admin de la rifa SIN re-login (SSO)
```
POST https://vkhwdvjtowrhkhqavnvk.supabase.co/functions/v1/puente-rifa
Headers:
  Authorization: Bearer <access_token del usuario del taller>
  apikey: <ANON KEY del taller>
Respuesta OK:
  { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
```

**ANON KEY del taller** (pública, va en el frontend):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHdkdmp0b3dyaGtocWF2bnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzIwMzUsImV4cCI6MjA5NDkwODAzNX0.t1Vb8peJbT_9F7S3UajxvqklVl3fLm8nytZT02UIzPI
```

---

## 2) Código frontend (adáptalo al framework del taller)

> `supabaseClient` = el cliente Supabase del taller (el que usa `signInWithPassword`/`getSession`).
> Reemplaza `TALLER_ANON` por la anon key de arriba (o la constante que ya tengas).

```js
const RIFA_FN = 'https://vkhwdvjtowrhkhqavnvk.supabase.co/functions/v1';
const TALLER_ANON = '<ANON KEY del taller>';

async function _authHeaders(json) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Inicia sesión primero');
  const h = { 'Authorization': 'Bearer ' + session.access_token, 'apikey': TALLER_ANON };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// (A) Genera UN boleto para un cliente. Devuelve el número (o lanza error con mensaje).
async function generarBoletoRifa(nombre, telefono) {
  const headers = await _authHeaders(true);
  const r = await fetch(`${RIFA_FN}/recepcion-boleto`, {
    method: 'POST', headers, body: JSON.stringify({ nombre, telefono: telefono || null })
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.msg || 'No se pudo generar el boleto');
  return j.numero; // ej. "0423"
}

// (B) Abre el panel admin de la rifa sin re-login (pestaña nueva).
async function abrirRifaAdmin() {
  const headers = await _authHeaders(false);
  const r = await fetch(`${RIFA_FN}/puente-rifa`, { method: 'POST', headers });
  const j = await r.json();
  if (!j.access_token) { alert('No se pudo abrir Rifas'); return; }
  const h = '#access_token=' + encodeURIComponent(j.access_token)
    + '&refresh_token=' + encodeURIComponent(j.refresh_token || '')
    + '&expires_in=' + (j.expires_in || 3600) + '&token_type=bearer&type=magiclink';
  window.open('https://nexusprord.com/' + h, '_blank'); // mañana: el dominio propio de la rifa
}
```

### Uso 1 — Acceso en la barra lateral
```html
<button onclick="abrirRifaAdmin()">🎟️ Rifa (admin)</button>
```

### Uso 2 — Botón manual en Recepción de equipo
```js
async function onGenerarBoletoClick() {
  const nombre = document.getElementById('rifaNombre').value.trim();
  const tel = document.getElementById('rifaTel').value.trim();
  if (!nombre) { alert('Escribe el nombre del cliente'); return; }
  try {
    const numero = await generarBoletoRifa(nombre, tel);
    // Muéstralo GRANDE en pantalla / imprímelo en el comprobante
    alert('🎟️ Boleto de rifa N° ' + numero + '\nCliente: ' + nombre);
  } catch (e) { alert(e.message); }
}
```

### Uso 3 — UN boleto AUTOMÁTICO por cada compra/recepción  ⭐ (lo que pediste)
En el punto donde el taller **termina una venta o registra una recepción de equipo**, después de
guardar, llama a `generarBoletoRifa` con los datos del cliente de esa venta:

```js
// Llamar JUSTO DESPUÉS de guardar la venta/recepción con éxito.
async function darBoletoPorCompra(cliente) {
  // cliente = { nombre, telefono } de la venta recién hecha
  try {
    const numero = await generarBoletoRifa(cliente.nombre, cliente.telefono);
    // Mostrarlo en el ticket / toast: "Te ganaste el boleto de rifa N° 0423"
    return numero;
  } catch (e) {
    // Si no hay rifa activa (sin_rifa) o no quedan números, NO frenes la venta:
    // solo avisa suave. La venta ya está hecha.
    console.warn('Rifa:', e.message);
    return null;
  }
}

// Ejemplo dentro del flujo de venta:
// await guardarVenta(venta);
// const num = await darBoletoPorCompra({ nombre: venta.cliente_nombre, telefono: venta.cliente_telefono });
// if (num) mostrarToast('🎟️ Boleto de rifa N° ' + num);
```

**Importante:** que el fallo de la rifa **nunca rompa la venta** (envuélvelo en try/catch como arriba).
Si quieres "1 boleto por compra" exacto, llama **una sola vez por venta** (no por cada artículo).

---

## 3) Requisitos / orden de arranque
1. El **admin** entra al panel (botón "Rifa (admin)") y **crea la rifa** (nombre, premio, cantidad de
   números, dígitos). Sin rifa creada, `recepcion-boleto` responde `sin_rifa`.
2. A partir de ahí, **cada compra/recepción genera su boleto** automáticamente (Uso 3) y/o la recepción
   lo genera a mano (Uso 2).
3. El **sorteo, reportes, ganador, etc.** se manejan desde el panel admin (en NEXUS PRO).

## 4) Notas de seguridad
- Las funciones exigen sesión del taller (`verify_jwt`). Un usuario no logueado no puede generar boletos.
- La conexión con NEXUS PRO (clave de la cuenta-puente) está **server-side**, nunca en el navegador.
- Los boletos quedan aislados en la organización de BayolCell (RLS): nadie más los ve.
