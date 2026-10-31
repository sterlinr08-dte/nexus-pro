# 2026-10-31 11:30 — Claude — Shannon (pentester de IA): estudio y plan con precio, sin instalar nada

## Dueño
Mandó el reel de Javi Niguez (`instagram.com/reel/DfHq9FsqT2N`, 37 s): «Esta IA intenta hackear tu web». Eligió la opción **A**:
estudiarlo a fondo y traer un plan con precio antes de tocar nada.

## Fuente
Reel bajado y mirado con `ver-video-redes` (mosaicos de fotogramas). Documentación completa de Shannon (`llms-full.txt` de
`github.com/KeygraphHQ/shannon`, README + docs, último commit 7-oct-2026), leída en su totalidad. **No se instaló ni se ejecutó nada.**

## Qué es
- Pentester **autónomo de IA**, código abierto (AGPL-3.0), de Keygraph. «No exploit, no report»: lee el **código fuente**, levanta
  hipótesis, explora la app en vivo y **solo reporta lo que logra explotar** con prueba reproducible.
- Cubre OWASP: inyección, XSS, SSRF, autenticación y autorización. Informe en PDF, Markdown, JSON y SARIF.
- Una corrida completa dura **1–1,5 h** y corre con la clave de IA de uno (BYOK). Keygraph no ve el código ni el tráfico.

## Requisitos
| Qué | Detalle |
|---|---|
| Máquina | **Docker** + **Node 18+**. Windows solo con **WSL2** (la PC del dueño sirve). `npx @keygraph/shannon@latest` |
| Objetivo | URL de la app corriendo + repo local (solo lectura). Acepta usuario/clave de login, TOTP, correo |
| IA | Anthropic, OpenAI, xAI, Bedrock u otro. Por defecto `anthropic:claude-sonnet-4-6`; sugiere también `claude-sonnet-5` / `claude-opus-5` |
| **Permiso «cyber» del proveedor** | Anthropic y OpenAI aplican salvaguardas en tiempo real a cargas de ciberseguridad y **pueden cortar la corrida a la mitad**. Hay que completar antes su **verificación para pruebas legítimas** (enlace en la discusión #483 del repo). Hoy mismo esa salvaguarda bloqueó a un agente mío por solo *leer* estos documentos |

## Seguridad (del propio manual)
- «Do not run Shannon against production systems.» Crea usuarios, manda formularios, **cambia datos** y dispara peticiones.
- Solo contra sistemas **propios** y con autorización escrita.
- Los hallazgos **requieren revisión humana**; pueden traer detalles débiles o errados.
- No escanear código ajeno (riesgo de inyección de instrucciones al modelo).

## Costo
| Concepto | Precio |
|---|---|
| Shannon open source | **RD$ 0** de licencia |
| Modelo de IA | Lo que consuma la corrida. Los docs no dan cifra; dicen que «varía por modelo, complejidad y concurrencia». **Estimado propio**, 1–1,5 h de agente con Sonnet: **US$ 15–40 por corrida**; con Opus, 2–4 veces más. Se mide en la primera corrida y se anota |
| Keygraph Pro (nube, gestionado) | US$ 50 por desarrollador al mes. **No hace falta** |
| Programa comunitario (Pro gratis) | Solo ONG de EE. UU. o startups con inversión semilla. **No aplica** |

## Cómo encaja con lo nuestro
- Los 3 proyectos están en GitHub (código) y tienen URL: **aplica**. La superficie real son las **políticas RLS de Supabase y las
  Edge Functions**; Shannon prueba web y API, así que llega ahí.
- Ya tenemos las skills **Strix** (pentest, corregir, escaneo en CI) y las auditorías de octubre. Shannon aporta la **explotación real
  con prueba**; Strix y `security-audit` aportan revisión de código y configuración. Se complementan, no se repiten.

## Plan propuesto (nada arranca sin el OK del dueño)
| Paso | Qué | Quién | Costo |
|---|---|---|---|
| 0 | El dueño completa la **verificación cyber** de Anthropic (u OpenAI) con la cuenta cuya clave se usará | Dueño | RD$ 0 |
| 1 | **Copia de pruebas**: rama de Supabase (`create_branch`) o proyecto gemelo con datos de mentira; nunca la base real | Claude | RD$ 0 (rama) |
| 2 | Instalar Shannon en la PC del dueño (WSL2 + Docker) o en una máquina de prueba; configurar URL de pruebas + repo + usuario de prueba | Claude guía, dueño ejecuta | RD$ 0 |
| 3 | **Primera corrida: Bayol** (es el que más expone: prefactura, CRM, app de empleados). Medir costo real y duración | Dueño corre, Claude lee el informe | ~US$ 15–40 |
| 4 | Revisar hallazgos a mano, corregir en ramas, volver a correr solo lo corregido | Claude | ~US$ 15–40 |
| 5 | Repetir con NEXUS y STUDIO; después, si vale la pena, GitHub Action en `staging` por cada publicación | — | por corrida |

## Riesgos
- La salvaguarda del proveedor puede abortar corridas aunque esté verificado.
- Un modelo barato da pentests flojos (lo dice el manual); Sonnet es el mínimo razonable.
- Nuestras apps dependen de Supabase: la copia de pruebas debe incluir Auth, RLS y Edge Functions para que la prueba sirva.

## Qué no dicen los documentos
Cifra concreta de costo por corrida; consumo de memoria/CPU; si el usuario de pruebas necesita permisos de administrador.

## Siguiente paso
Decisión del dueño: **A)** empezar por el paso 0 (verificación) y preparar la copia de pruebas de Bayol; **B)** dejarlo anotado y
seguir con lo demás.
