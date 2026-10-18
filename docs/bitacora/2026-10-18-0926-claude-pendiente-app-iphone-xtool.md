# PENDIENTE: app nativa de iPhone con Claude Code + xtool — Claude (solo estudio)

- **Pedido del dueño:** mandó el reel `DemfNLkB0-K` (Billy | Inteligência Artificial, 78 s, en portugués) y dijo: «estudia este video y dime si desde aquí lo podemos hacer esa app, vamos a ponerlo en pendiente».
- **Qué dice el video:** Claude Code puede crear apps reales de iPhone en Swift e instalarlas en el teléfono sin Mac, con **xtool** (https://github.com/xtool-org/xtool). Es «Cross-platform Xcode replacement», funciona en Linux, Windows (WSL) y macOS y es de código abierto. El prompt del video pide crear una app SwiftUI de 3 pantallas, nativa y en modo oscuro.
- **Lo que hace xtool:** `setup` / `auth` (cuenta de Apple) / `sdk` (SDK de Apple) / `new` / `dev` (compila y corre) / `devices` / `install` / `launch`.
- **Desde esta sesión en la nube:**
  - **Sí:** escribir todo el código Swift/SwiftUI de la app y dejarlo en un repo.
  - **No:** compilar, firmar e instalar. Eso requiere el SDK de Apple (sale de Xcode con la cuenta de Apple del dueño), iniciar sesión con su Apple ID (regla: nunca pedir ni usar las claves del dueño) y el iPhone conectado por cable o emparejado a una computadora del dueño. El contenedor de la nube no tiene acceso a su teléfono.
- **Cómo se haría:**
  1. Claude escribe la app aquí.
  2. El dueño, en su PC con Windows (WSL) o en una Mac, instala xtool, inicia sesión con su Apple ID y conecta el iPhone.
  3. Ejecuta `xtool dev`.
  - **Límites conocidos de Apple:** con una cuenta gratis las apps instaladas así se vencen a los 7 días y hay un límite de apps; con la cuenta de desarrollador (US$99/año) duran más y se puede usar TestFlight. Hay que confirmarlo al empezar.
- **Alternativa ya disponible:** NEXUS, Bayol y STUDIO ya funcionan como web en el iPhone. Si se agregan a la pantalla de inicio, se ven como app sin pasar por Apple.
- **Estado:** PENDIENTE. Hay que decidir qué app (por ejemplo, la app de cobros de NEXUS para los agentes) y si vale la pena frente a la web.
