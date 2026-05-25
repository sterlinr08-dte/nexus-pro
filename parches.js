(function() {
    // 1. REGLAS NEXUS PRO (No tocar)
    const ST = window.ST || {}; 
    const API = window.API || {};

    const injectPremiumCSS = () => {
        if (document.getElementById('nx-3d-styles')) return;
        const style = document.createElement('style');
        style.id = 'nx-3d-styles';
        style.innerHTML = `
            .nx-3d-container { 
                display: flex; justify-content: center; align-items: center; gap: 20px; 
                background: linear-gradient(145deg, #ffffff, #f0f4f8); 
                padding: 15px 25px; border-radius: 20px; margin-bottom: 30px; 
                box-shadow: 15px 15px 35px #d1d9e6, -15px -15px 35px #ffffff;
                position: sticky; top: 10px; z-index: 999;
                border: 1px solid rgba(255,255,255,0.8);
            }
            .nx-3d-select { 
                min-width: 320px; padding: 12px 15px; border: none; border-radius: 12px; 
                font-weight: 800; font-size: 19px; color: #1e293b; text-align: center;
                background: #f0f4f8;
                box-shadow: inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff;
                appearance: none; -webkit-appearance: none; cursor: pointer;
                transition: all 0.3s ease; font-family: sans-serif;
            }
            .nx-3d-btn { 
                width: 50px; height: 50px; border: none; border-radius: 50%; 
                background: #f0f4f8; cursor: pointer; 
                display: flex; align-items: center; justify-content: center; 
                font-size: 18px; font-weight: bold; color: #3b82f6;
                box-shadow: 5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff;
                transition: all 0.2s ease;
            }
            .nx-3d-btn:hover:not(:disabled) { transform: scale(1.1); color: #2563eb; }
            .nx-3d-btn:active { box-shadow: inset 3px 3px 6px #d1d9e6, inset -3px -3px 6px #ffffff; }
            .nx-3d-btn:disabled { opacity: 0.2; cursor: not-allowed; box-shadow: none; }
            
            @media (max-width: 480px) { 
                .nx-3d-select { min-width: 220px; font-size: 16px; } 
                .nx-3d-btn { width: 42px; height: 42px; } 
            }
        `;
        document.head.appendChild(style);
    };

    window.NEXUS_DETALLES_COBRO_V1 = async function() {
        const target = document.getElementById('modulo-detalles-cobro');
        if (!target || target.getAttribute('data-loaded') === 'true') return;
        
        target.setAttribute('data-loaded', 'true');
        injectPremiumCSS();

        const obtenerCiclos = () => {
            const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const lista = [];
            let r = new Date();
            for(let i=0; i<6; i++) {
                let ini, fin, d = r.getDate();
                if(d >= 20) {
                    ini = new Date(r.getFullYear(), r.getMonth()-1, 20);
                    fin = new Date(r.getFullYear(), r.getMonth(), 20);
                } else {
                    ini = new Date(r.getFullYear(), r.getMonth()-2, 20);
                    fin = new Date(r.getFullYear(), r.getMonth()-1, 20);
                }
                lista.push({ ini, fin, txt: `Ciclo: 20 ${meses[ini.getMonth()]} - 20 ${meses[fin.getMonth()]} ${fin.getFullYear()}` });
                r = new Date(ini.getTime() - (5*24*60*60*1000));
            }
            return lista;
        };

        const ciclos = obtenerCiclos();
        let actual = 0;

        const render = () => {
            target.innerHTML = `
                <div class="nx-3d-container">
                    <button class="nx-3d-btn" id="nx-p" ${actual === 5 ? 'disabled' : ''}>❮</button>
                    <select class="nx-3d-select" id="nx-s">
                        ${ciclos.map((c, i) => `<option value="${i}" ${i === actual ? 'selected' : ''}>${c.txt}</option>`).join('')}
                    </select>
                    <button class="nx-3d-btn" id="nx-n" ${actual === 0 ? 'disabled' : ''}>❯</button>
                </div>
                <div id="nx-content-data"></div>
            `;

            document.getElementById('nx-s').onchange = (e) => { actual = parseInt(e.target.value); render(); };
            document.getElementById('nx-p').onclick = () => { actual++; render(); };
            document.getElementById('nx-n').onclick = () => { actual--; render(); };
            
            console.log("Nexus Pro 3D - Mostrando:", ciclos[actual].txt);
        };

        render();
    };

    // Auto-activación
    setInterval(() => {
        if (document.getElementById('modulo-detalles-cobro') && !document.querySelector('.nx-3d-container')) {
            window.NEXUS_DETALLES_COBRO_V1();
        }
    }, 1000);
})();
