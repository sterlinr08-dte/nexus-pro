(function() {
    // 1. REGLAS DE ORO NEXUS PRO
    const ST = window.ST || {}; 
    const API = window.API || {};

    // Configuración de Ciclos 20-20
    const nombreCiclo = (p) => {
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return `Ciclo: 20 ${meses[p.inicio.getMonth()]} - 20 ${meses[p.fin.getMonth()]} ${p.fin.getFullYear()}`;
    };

    const calcularPeriodos = () => {
        const ciclos = [];
        let ref = new Date();
        for (let i = 0; i < 6; i++) {
            let inicio, fin, dia = ref.getDate();
            if (dia >= 20) {
                inicio = new Date(ref.getFullYear(), ref.getMonth() - 1, 20);
                fin = new Date(ref.getFullYear(), ref.getMonth(), 20);
            } else {
                inicio = new Date(ref.getFullYear(), ref.getMonth() - 2, 20);
                fin = new Date(ref.getFullYear(), ref.getMonth() - 1, 20);
            }
            ciclos.push({ inicio, fin });
            ref = new Date(inicio.getTime() - (5 * 24 * 60 * 60 * 1000));
        }
        return ciclos;
    };

    // Inyección de Estética Premium (Botones redondos y Sombras)
    const injectCSS = () => {
        if (document.getElementById('nxDC-premium-styles')) return;
        const style = document.createElement('style');
        style.id = 'nxDC-premium-styles';
        style.innerHTML = `
            .nxDC-selector-container { 
                display: flex; justify-content: center; align-items: center; gap: 20px; 
                background: #ffffff; padding: 16px; border-radius: 20px; margin-bottom: 25px; 
                box-shadow: 0 10px 25px rgba(15,23,42,0.1); position: sticky; top: 0; 
                z-index: 9999; border: 1px solid #f1f5f9;
            }
            .nxDC-select-main { 
                min-width: 280px; padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 14px; 
                font-weight: 800; font-size: 16px; color: #0f172a; text-align: center;
                background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'%3E%3C/path%3E%3C/svg%3E") no-repeat right 15px center;
                appearance: none; -webkit-appearance: none; cursor: pointer;
            }
            .nxDC-btn-round { 
                width: 48px; height: 48px; border: 1px solid #e2e8f0; border-radius: 50%; 
                background: linear-gradient(145deg, #ffffff, #f8fafc); cursor: pointer; 
                display: flex; align-items: center; justify-content: center; 
                font-size: 18px; color: #64748b; transition: 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }
            .nxDC-btn-round:hover:not(:disabled) { transform: scale(1.1); background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
            .nxDC-btn-round:disabled { opacity: 0.2; cursor: not-allowed; }
            @media (max-width: 480px) { .nxDC-select-main { min-width: 200px; font-size: 14px; } .nxDC-btn-round { width: 42px; height: 42px; } }
        `;
        document.head.appendChild(style);
    };

    // 2. FUNCIÓN DE RENDERIZADO PROTEGIDA
    window.NEXUS_DETALLES_COBRO_V1 = async function() {
        const target = document.getElementById('modulo-detalles-cobro');
        if (!target) return;
        
        // Si ya está inicializado con nuestro selector, no sobreescribir
        if (target.querySelector('.nxDC-selector-container')) return;

        injectCSS();
        const ciclos = calcularPeriodos();
        let currentIdx = 0;

        const draw = () => {
            const p = ciclos[currentIdx];
            // El selector se inserta AL PRINCIPIO del contenedor
            const selectorHTML = `
                <div class="nxDC-selector-container">
                    <button class="nxDC-btn-round" id="nx-prev" ${currentIdx === 5 ? 'disabled' : ''}>❮</button>
                    <select class="nxDC-select-main" id="nx-select">
                        ${ciclos.map((c, i) => `<option value="${i}" ${i === currentIdx ? 'selected' : ''}>${nombreCiclo(c)}</option>`).join('')}
                    </select>
                    <button class="nxDC-btn-round" id="nx-next" ${currentIdx === 0 ? 'disabled' : ''}>❯</button>
                </div>
            `;
            
            // Si ya existe el contenido, solo actualizamos o insertamos el selector
            if (!document.getElementById('nx-content-wrapper')) {
                target.innerHTML = selectorHTML + `<div id="nx-content-wrapper"></div>`;
            } else {
                const oldSelector = target.querySelector('.nxDC-selector-container');
                if (oldSelector) oldSelector.remove();
                target.insertAdjacentHTML('afterbegin', selectorHTML);
            }

            // Bind de eventos
            document.getElementById('nx-select').onchange = (e) => { currentIdx = parseInt(e.target.value); draw(); };
            document.getElementById('nx-prev').onclick = () => { currentIdx++; draw(); };
            document.getElementById('nx-next').onclick = () => { currentIdx--; draw(); };

            // DISPARAR CARGA DE DATOS ORIGINAL
            console.log("Nexus Pro: Cargando Ciclo", p);
            // Si tienes una función de carga global, llámala aquí:
            // API.fetchDatos(p.inicio, p.fin);
        };

        draw();
    };

    // 3. SISTEMA DE VIGILANCIA (MutationObserver + Polling)
    // Esto asegura que si entras y sales del módulo, el código se re-ejecute
    const watcher = () => {
        if (document.getElementById('modulo-detalles-cobro')) {
            window.NEXUS_DETALLES_COBRO_V1();
        }
    };

    // Ejecutar cada vez que el DOM cambie
    const observer = new MutationObserver(watcher);
    observer.observe(document.body, { childList: true, subtree: true });

    // Ejecutar por polling cada 1 segundo (seguro de vida)
    setInterval(watcher, 1000);

    // Ejecución inicial
    watcher();

})();
