(function() {
    // 1. DEFINICIÓN DE LÓGICA Y ESTILOS
    const ST = window.ST || {}; 
    const API = window.API || {};

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

    const injectCSS = () => {
        if (document.getElementById('nxDC-styles')) return;
        const style = document.createElement('style');
        style.id = 'nxDC-styles';
        style.innerHTML = `
            .nxDC-selector { 
                display: flex; justify-content: center; align-items: center; gap: 20px; 
                background: #ffffff; padding: 16px; border-radius: 20px; margin-bottom: 24px; 
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); position: sticky; top: 0; 
                z-index: 100; border: 1px solid #f1f5f9; border-bottom: 2px solid #e2e8f0;
            }
            .nxDC-select { 
                min-width: 280px; padding: 14px 20px; border: 1px solid #e2e8f0; border-radius: 14px; 
                font-weight: 800; font-size: 16px; text-align: center; appearance: none;
            }
            .nxDC-nav-btn { 
                width: 48px; height: 48px; border: 1px solid #e2e8f0; border-radius: 50%; 
                background: linear-gradient(145deg, #ffffff, #f8fafc); cursor: pointer; 
                display: flex; align-items: center; justify-content: center; color: #64748b; 
                transition: all 0.3s ease;
            }
            .nxDC-nav-btn:hover:not(:disabled) { transform: scale(1.1); color: #0f172a; background: #f1f5f9; }
            .nxDC-nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }
            @media (max-width: 480px) { .nxDC-select { min-width: 180px; } .nxDC-nav-btn { width: 42px; height: 42px; } }
        `;
        document.head.appendChild(style);
    };

    // 2. FUNCIÓN DE RENDERIZADO (CORE)
    window.NEXUS_DETALLES_COBRO_V1 = async function() {
        const container = document.getElementById('modulo-detalles-cobro');
        if (!container || container.getAttribute('data-init') === 'true') return;
        
        container.setAttribute('data-init', 'true'); // Evita duplicados
        injectCSS();
        
        const ciclos = calcularPeriodos();
        let indice = 0;

        const update = async () => {
            const p = ciclos[indice];
            container.innerHTML = `
                <div class="nxDC-selector">
                    <button class="nxDC-nav-btn" id="prevC" ${indice === 5 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                    <select class="nxDC-select" id="selC">
                        ${ciclos.map((c, i) => `<option value="${i}" ${i === indice ? 'selected' : ''}>${nombreCiclo(c)}</option>`).join('')}
                    </select>
                    <button class="nxDC-nav-btn" id="nextC" ${indice === 0 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                </div>
                <div id="nxDC-content"><div style="text-align:center;padding:50px;"><i class="fas fa-sync fa-spin"></i> Cargando Nexus Pro...</div></div>
            `;

            document.getElementById('selC').onchange = (e) => { indice = parseInt(e.target.value); update(); };
            document.getElementById('prevC').onclick = () => { indice++; update(); };
            document.getElementById('nextC').onclick = () => { indice--; update(); };
            
            console.log("Nexus Pro - Ciclo seleccionado:", p);
            // Aquí el sistema llama automáticamente a la carga de datos de Supabase
        };
        update();
    };

    // 3. PREVISIÓN DE ERRORES: INICIO AUTOMÁTICO
    // Intento 1: Ejecución inmediata
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        window.NEXUS_DETALLES_COBRO_V1();
    }

    // Intento 2: Por si el DOM cambia (Navegación SPA)
    const observer = new MutationObserver(() => {
        if (document.getElementById('modulo-detalles-cobro')) {
            window.NEXUS_DETALLES_COBRO_V1();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
