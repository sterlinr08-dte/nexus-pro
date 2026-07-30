# GLOBAL STICKY ACTION BAR V1

## Objetivo
Crear una barra de acciones inferior fija reutilizable para todo NEXUS PRO.

## Principios
- Siempre visible.
- Misma ubicación en todos los módulos.
- Acciones contextuales según el módulo y estado del registro.
- Responsive para escritorio y móvil.

## Diseño
- Fondo blanco.
- Borde superior sutil.
- Sombra ligera.
- Altura aproximada: 64–72 px.
- Botones alineados a la derecha en escritorio.
- En móvil, barra fija inferior con desplazamiento horizontal si es necesario.

## Botones estándar
### Registro nuevo
- Cancelar
- Guardar borrador (cuando aplique)
- Guardar
- Guardar + Imprimir (acción principal)

### Registro existente
- Cancelar
- Guardar cambios
- Imprimir
- Guardar + Imprimir

## Ejemplos por módulo
### Facturación
Cancelar · Guardar borrador · Facturar · Facturar + Imprimir

### Cobranza
Cancelar · Registrar pago · Guardar + Imprimir · Enviar por WhatsApp

### Recepción Taller
Cancelar · Guardar recepción · Guardar + Imprimir

### Inventario
Cancelar · Guardar · Imprimir etiqueta

### Reportes
Actualizar · Exportar Excel · Exportar PDF · Imprimir

## Reglas
- El botón principal debe destacarse con el color primario.
- 'Guardar + Imprimir' será el flujo predeterminado en módulos que generan documentos.
- La barra nunca debe desaparecer durante el desplazamiento.
- Mantener consistencia visual en todo el ERP.
