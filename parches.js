(function() {
  // CRÍTICO: Uso de constantes directas del sistema NEXUS PRO
  const ST = window.ST || {}; 
  const API = window.API || {};

  /**
   * CAMBIO 1: Formato de nombre de ciclo premium
   * "Ciclo: 20 Abr - 20 May 2026"
   */
  function nombreCiclo(periodo) {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mi = meses[periodo.inicio.getMonth()];
    const mf = meses[periodo.fin.getMonth()];
    return `Ciclo: 20 ${mi} - 20 ${mf} ${periodo.fin.getFullYear()}`;
  }

  /**
   * Lógica de cálculo de periodos (Regla 20-20)
   */
  function calcularPeriodo(fechaReferencia) {
    let inicio, fin;
    const dia = fechaReferencia.getDate();
    if (dia >= 20) {
      inicio = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - 1, 20);
      fin = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), 20);
    } else {
      inicio = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - 2, 20);
      fin = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - 1, 20);
    }
    return { inicio, fin };
  }

  function calcularUltimosCiclos() {
    const ciclos = [];
    let ref = new Date();
    for (let i = 0; i < 6; i++) {
      const p = calcularPeriodo(ref);
      ciclos.push(p);
      ref = new Date(p.inicio.getTime() - (5 * 24 * 60 * 60 * 1000));
    }
    return ciclos;
  }

  /**
   * CAMBIO 2: CSS Actualizado (Estética Premium e Identidad Visual)
   */
  const injectCSS = () => {
    if (document.getElementById('nxDC-styles')) return;
    const style = document.createElement('style');
    style.id = 'nxDC-styles';
    style.innerHTML = `
      .nxDC-selector { 
        display: flex; justify-content: center; align-items: center; gap: 20px; 
        background: #ffffff; padding: 16px; border-radius: 20px; margin-bottom: 24px; 
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04);
        position: sticky; top: 0; z-index: 100; border: 1px solid #f1f5f9;
        border-bottom: 2px solid #e2e8f0;
      }
      .nxDC-select { 
        min-width: 280px; padding: 14px 20px; border: 1px solid #e2e8f0; border-radius: 14px; 
        font-weight: 800; font-size: 16px; background: #fdfeff; color: #0f172a; 
        cursor: pointer; text-align: center; appearance: none; -webkit-appearance: none;
      }
      .nxDC-nav-btn { 
        width: 48px; height: 48px; border: 1px solid #e2e8f0; border-radius: 50%; 
        background: linear-gradient(145deg, #ffffff, #f8fafc); cursor: pointer; 
        display: flex; align-items: center; justify-content: center; color: #64748b; 
        transition: all 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      }
      .nxDC-nav-btn:hover:not(:disabled) { 
        background: #f1f5f9; color: #0f172a; transform: scale(1.08); border-color: #cbd5e1;
      }
      .nxDC-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
      #nxDC-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
      @media (max-width: 480px) { 
        .nxDC-selector { padding: 12px; gap: 10px; } 
        .nxDC-select { min-width: 180px; font-size: 14px; } 
        .nxDC-nav-btn { width: 42px; height: 42px; }
      }
    `;
    document.head.appendChild(style);
  };

  /**
   * FUNCIÓN PRINCIPAL
   */
  window.NEXUS_DETALLES_COBRO_V1 = async function() {
    injectCSS();
    const container = document.getElementById('modulo-detalles-cobro');
    if (!container) return;

    const ciclos = calcularUltimosCiclos();
    let indiceActual = 0;

    const render = async () => {
      const periodo = ciclos[indiceActual];
      
      container.innerHTML = `
        <div class="nxDC-selector">
          <button class="nxDC-nav-btn" id="prevCiclo" ${indiceActual === 5 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
          </button>
          <select class="nxDC-select" id="cicloSelect">
            ${ciclos.map((c, i) => `<option value="${i}" ${i === indiceActual ? 'selected' : ''}>${nombreCiclo(c)}</option>`).join('')}
          </select>
          <button class="nxDC-nav-btn" id="nextCiclo" ${indiceActual === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div id="nxDC-content">
          <div style="text-align:center; padding:40px; color:#64748b;"><i class="fas fa-sync fa-spin"></i> Cargando...</div>
        </div>
      `;

      // Listeners
      document.getElementById('cicloSelect').onchange = (e) => {
        indiceActual = parseInt(e.target.value);
        render();
      };
      document.getElementById('prevCiclo').onclick = () => {
        if (indiceActual < 5) { indiceActual++; render(); }
      };
      document.getElementById('nextCiclo').onclick = () => {
        if (indiceActual > 0) { indiceActual--; render(); }
      };

      // Aquí conectas con tu API existente pasando el 'periodo'
      console.log("Nexus Pro Activo:", periodo);
    };

    render();
  };

})();
