# Revisión de la cuota de Supabase (aviso de restricción del 27-oct-2026)

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo lectura: no se cambió nada.

## Hallazgo
- Organización `sterlinr08` (`gmjedhkktbffnanmebkf`): **plan Pro**, con 6 proyectos activos.
- Tamaños, medidos con SQL de solo lectura:

| Proyecto | Base | Archivos | Usuarios |
|---|---:|---:|---:|
| BayolCell-taller | 851 MB | 4,680 MB | 10 |
| STUDIO RD | 71 MB | 1,003 MB | 16 |
| sterlinr08-dte's Project | 200 MB | 5 MB | 3 |
| NEXUS PRO Seguros | 126 MB | 152 MB | 6 |
| Consultorio Geriatra | 18 MB | 0 | 1 |
| Amatista Dental | 17 MB | 0 | 2 |

- Se compararon los totales con lo que incluye el plan Pro.
  - Base: todos los proyectos están lejos de los 8 GB por proyecto.
  - Archivos: unos 5.8 GB en total, contra 100 GB incluidos.
  - Conclusión: **ni la base ni los archivos explican el aviso.**
- Probable causa: la **transferencia de salida (egress)** o el **cómputo** de los proyectos extra. Las fotos del taller (4.7 GB) y los bauches son las que más se descargan.
- Esto no se puede leer desde la herramienta: el dueño tiene que ver la página Usage del panel.
- «sterlinr08-dte's Project»: no se sabe para qué es. No se tocó. Es candidato a pausarse si el dueño confirma que no se usa.
- Deluxe no aparece como proyecto en esta organización.

## Siguiente paso
1. El dueño abre `supabase.com/dashboard/org/gmjedhkktbffnanmebkf/usage` y dice qué renglón está en rojo.
2. Con eso se decide:
   - quitar el tope de gasto;
   - bajar el egress (caché o imágenes más livianas);
   - pausar el proyecto sin uso.
3. Se resuelve antes de crear la base de Pizzería Unive 2.
