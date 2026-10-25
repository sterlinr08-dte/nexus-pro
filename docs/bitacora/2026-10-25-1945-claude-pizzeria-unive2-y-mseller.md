# Proyecto nuevo PIZZERÍA UNIVE 2 y proveedor de e-CF MSeller (decisiones del dueño)

## Pedido del dueño (25-oct-2026)
- «Tengo un nuevo proyecto, una cafetería». Después la nombró **PIZZERÍA UNIVE 2**.
- **«Nada que ver con STUDIO»:** base de datos aparte, bajo el dominio de NEXUS PRO. Es la empresa de un cliente suyo, a quien le venderá el servicio de facturación, **incluida la facturación electrónica**. Mismo modelo que Deluxe y Amatista Dental: proyecto Supabase propio, subdominio de nexusprord.com, `NX_BASES_POR_HOST` y `organizaciones`.
- Lo primero que necesita: la **caja / punto de venta**.
- Para la e-CF señaló **eCF MSeller** (https://ecf.mseller.app/), una API dominicana que firma, valida con la DGII y devuelve el QR. Queda como **PSFE candidato** para la pizzería y para sus otros clientes.

## Hecho
- Se abrió un **chat propio** para el proyecto: sesión «PIZZERÍA UNIVE 2 — sistema de facturación (cliente)», con el contexto y las lecturas obligatorias:
  - `ARQUITECTURA-POS.md`, `CONSULTORIO-CLAUDE.md` y la bitácora del alta de STUDIO;
  - `REGLAMENTOS.md` §4 (e-CF obligatoria desde el 15-nov-2026).
- Se le enviaron dos notas por tarea programada de un solo disparo:
  - la lista de herramientas (`HERRAMIENTAS.md` y cuándo usar cada una);
  - la decisión de MSeller.
- **Secreto:** el dueño pegó en el chat lo que parece la clave de la API de MSeller. No se usó ni se guardó. Se le pidió cambiarla y confirmó «Listo». La nueva va solo en Supabase → Edge Functions → Secrets (`MSELLER_API_KEY`), nunca en el chat ni en el repo.

## Riesgos y pendientes
- La cuota de Supabase quedó **restringida desde el 27-oct-2026**. Crear el proyecto nuevo puede exigir subir de plan.
- La e-CF necesita el **certificado digital** del contribuyente (de 2 a 4 semanas). Hay que confirmar si MSeller lo exige y cuáles son los límites de su plan gratis.
