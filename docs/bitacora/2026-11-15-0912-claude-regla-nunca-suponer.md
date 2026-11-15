# Regla del dueño: nunca suponer; datos de Apple verificados

## Pedido del dueño
Tras varias respuestas sobre la App Store dadas «de lo que sé», sin comprobar, el dueño dijo: «Verifica bien por favor, nunca me supongas».

## Qué se hizo
1. Regla nueva en `docs/MEMORIA.md` §2: comprobar cada dato en la fuente oficial o en el sistema antes de afirmarlo, y decir de dónde salió.
2. Se verificó en las páginas oficiales de Apple (developer.apple.com) lo dicho antes:
   - Cuota del Apple Developer Program: 99 USD al año (Enterprise 299). Página «Program enrollment».
   - Sin cuota («Personal Team»): hasta 3 equipos y 3 apps por equipo; los perfiles vencen a los 7 días y hay que reinstalar. Página «Developer account overview».
   - TestFlight: hasta 10,000 invitados externos y 100 internos; cada versión se puede probar hasta 90 días; la primera versión para externos pasa revisión. Páginas «TestFlight» y «TestFlight overview».
   - App no listada («unlisted»): sale en la App Store solo con enlace directo; hay que tener la app lista (no beta), enviarla a revisión y solicitar la modalidad. Página «Unlisted app distribution».
   - Revisión: al menos 50 % en menos de 24 horas y 90 % en menos de 48. Las apps que son solo una página web dentro de una app son causa común de rechazo (guía 4.2). Página «App Review».
   - Cuota vencida: la app deja de estar disponible para descargar, pero sigue funcionando para quien ya la instaló; al renovar vuelve en 24 horas sin reenviarla. Página «Program Renewal».
   - Inscripción como empresa: entidad legal, número D-U-N-S, correo del dominio y sitio web. Como persona, sale el nombre legal como vendedor.
3. Plugin de Xcode: confirmado en el directorio oficial de Anthropic (`anthropics/claude-plugins-official`, PR #6338 «Add Xcode plugin (xcode)», unido el 6-nov-2026; descripción: plugin de Apple que expone Xcode por MCP). El comando de instalación `/plugin install xcode@claude-plugins-official` sale de fuentes secundarias, no de documentación oficial leída.

## Correcciones a lo dicho antes al dueño
- Se dijo revisión «de 1 a 3 días»: lo oficial es 50 % en menos de 24 h y 90 % en menos de 48 h.
- Se dijo «si deja de pagar, la app sale de la tienda»: cierto, pero faltó decir que sigue funcionando para quien ya la tiene.
- «App privada» se llama «no listada» y hay que solicitarla después de la revisión.
