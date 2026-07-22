/* ====================================================================
 * SEÇÃO 1: INPUTS — Coleta e validação dos parâmetros de entrada
 * ==================================================================== */

// Definição das regras centralizadas de todos os campos da ferramenta
const FIELDS = {
  // Parâmetros Gerais
  'geral-label': { type: 'text', required: true, label: 'Nome da Simulação' },
  'geral-estrategia': { type: 'select', required: true, label: 'Estratégia do BESS' },
  'geral-aplicacao': { type: 'text', required: true, label: 'Aplicação' },
  'geral-regime': { type: 'select', required: true, label: 'Regime de Contratação' },
  'geral-concessionaria': { type: 'text', required: true, label: 'Concessionária' },
  'geral-grupo-tarifario': { type: 'select', required: true, label: 'Grupo Tarifário' },
  'geral-modalidade': { type: 'select', required: true, label: 'Modalidade Tarifária' },
  
  // Parâmetros de Projeto
  'projeto-consumo-kwh': { type: 'number', required: true, min: 0.0001, label: 'Consumo (Energia Deslocamento)' },
  'projeto-demanda-kw': { type: 'number', required: true, min: 0.0001, label: 'Demanda Contratada' },
  'projeto-dias-uteis': { type: 'integer', required: true, min: 1, label: 'Dias Úteis' },
  'projeto-ciclos-dia': { type: 'integer', required: true, min: 1, label: 'Ciclos por Dia' },
  'projeto-hora-inicio-hp': { type: 'time', required: true, label: 'Hora Início HP' },
  'projeto-tarifa-hp': { type: 'number', required: true, min: 0, label: 'Tarifa Ponta' },
  'projeto-tarifa-fp': { type: 'number', required: true, min: 0, label: 'Tarifa Fora Ponta' },
  
  // Parâmetros do Equipamento
  'equipamento-rte': { type: 'percentage', required: true, label: 'RTE' },
  'equipamento-dod': { type: 'percentage', required: true, label: 'DoD' },
  'equipamento-eol': { type: 'percentage', required: true, label: 'EOL' },
  'equipamento-ciclos': { type: 'integer', required: true, min: 1, label: 'Ciclos Garantidos' },
  'equipamento-energia-kwh': { type: 'number', required: true, min: 0.0001, label: 'Energia BESS Unitária' },
  'equipamento-potencia-kw': { type: 'number', required: true, min: 0.0001, label: 'Potência BESS Unitária' },
  'equipamento-modelo': { type: 'text', required: true, label: 'Modelo do Equipamento' },
  'equipamento-protecao': { type: 'select', required: true, label: 'Tipo de Proteção' },
  'equipamento-perdas': { type: 'percentage', required: true, label: 'Perdas do Sistema' }
};

// Converte strings de inputs numéricos (aceitando vírgula ou ponto) para floats normais
function parseLocaleFloat(val) {
  if (val === undefined || val === null) return NaN;
  if (typeof val !== 'string') return parseFloat(val);
  const clean = val.replace(/\s+/g, '').replace(',', '.');
  return parseFloat(clean);
}

// Coleta todos os inputs da tela de forma segura (protegendo contra elementos DOM ausentes)
function collectInputs() {
  const inputs = {};
  for (const fieldId in FIELDS) {
    const el = document.getElementById(fieldId);
    if (!el) {
      inputs[fieldId] = null;
      continue;
    }
    
    const rawValue = el.value;
    const rule = FIELDS[fieldId];
    
    if (rule.type === 'integer') {
      inputs[fieldId] = parseInt(rawValue, 10);
    } else if (rule.type === 'number' || rule.type === 'percentage') {
      inputs[fieldId] = parseLocaleFloat(rawValue);
    } else {
      inputs[fieldId] = rawValue.trim();
    }
  }
  return inputs;
}

// Valida um campo específico e renderiza o erro correspondente se houver (validação estruturada por tipo)
function validateField(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return true;
  
  const rule = FIELDS[fieldId];
  if (!rule) return true;
  
  const raw = el.value.trim();
  
  // 1. Validação de Obrigatoriedade
  if (rule.required && !raw) {
    showError(fieldId, "Campo obrigatório");
    return false;
  }
  
  // 2. Validações por Tipo
  if (rule.type === 'integer') {
    const val = parseInt(raw, 10);
    if (isNaN(val)) {
      showError(fieldId, "Insira um número inteiro");
      return false;
    }
    if (rule.min !== undefined && val < rule.min) {
      if (fieldId === 'projeto-dias-uteis') {
        showError(fieldId, `Mínimo ${rule.min} dia útil`);
      } else if (fieldId === 'projeto-ciclos-dia') {
        showError(fieldId, `Mínimo ${rule.min} ciclo por dia`);
      } else {
        showError(fieldId, `Mínimo ${rule.min}`);
      }
      return false;
    }
  }
  
  else if (rule.type === 'number') {
    const val = parseLocaleFloat(raw);
    if (isNaN(val)) {
      showError(fieldId, "Insira um número válido");
      return false;
    }
    if (rule.min !== undefined) {
      if (rule.min > 0 && val <= 0) {
        showError(fieldId, "Valor deve ser maior que zero");
        return false;
      }
      if (rule.min === 0 && val < 0) {
        showError(fieldId, "Valor não pode ser negativo");
        return false;
      }
    }
  }
  
  else if (rule.type === 'percentage') {
    const val = parseLocaleFloat(raw);
    if (isNaN(val)) {
      showError(fieldId, "Insira um número válido");
      return false;
    }
    if (val < 0 || val > 100) {
      showError(fieldId, "Valor deve estar entre 0 e 100%");
      return false;
    }
  }
  
  else if (rule.type === 'time') {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(raw)) {
      showError(fieldId, "Formato inválido (HH:MM)");
      return false;
    }
  }
  
  clearError(fieldId);
  return true;
}

// Valida todos os campos de uma vez, foca e rola até o primeiro erro se houver
function validateInputs() {
  let firstInvalidEl = null;
  let isValid = true;
  
  for (const fieldId in FIELDS) {
    const fieldValid = validateField(fieldId);
    if (!fieldValid) {
      isValid = false;
      if (!firstInvalidEl) {
        firstInvalidEl = document.getElementById(fieldId);
      }
    }
  }
  
  if (!isValid && firstInvalidEl) {
    firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalidEl.focus();
  }
  
  return isValid;
}

// Exibe mensagem de erro e adiciona classe visual e atributos de acessibilidade (aria-describedby / aria-invalid)
function showError(fieldId, message) {
  const el = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (el) {
    el.classList.add('input-error');
    el.setAttribute('aria-describedby', `${fieldId}-error`);
    el.setAttribute('aria-invalid', 'true');
  }
  if (errEl) {
    errEl.textContent = message;
    errEl.style.display = 'block';
  }
}

// Limpa erro e remove classe visual e atributos de acessibilidade
function clearError(fieldId) {
  const el = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (el) {
    el.classList.remove('input-error');
    el.removeAttribute('aria-describedby');
    el.removeAttribute('aria-invalid');
  }
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
}

// Limpa os erros de todos os campos cadastrados de uma vez (Task 5.4)
function clearAllErrors() {
  for (const fieldId in FIELDS) {
    clearError(fieldId);
  }
}

/* ====================================================================
 * SEÇÃO 2: CALCULATIONS — Motor de cálculo (fórmulas do AGENTS.md §2)
 * ==================================================================== */

const LOAD_PROFILE = [
  0.70, 0.72, 0.70, 0.72, 0.68, 0.65, // 0h-5h: patamar noturno
  0.68, 0.70, 0.80, 0.88, 0.92, 0.95, // 6h-11h: rampa matinal
  0.97, 1.00, 0.98, 0.95, 0.95, 0.95, // 12h-17h: pico e patamar
  0.95, 0.92, 0.88, 0.82, 0.78, 0.73  // 18h-23h: queda noturna
];

const DEGRADATION_TABLE = {
  '0.5P': [100.0, 95.0, 92.8, 90.9, 89.1, 87.5, 85.9, 84.4, 82.9, 81.4, 80.0, 78.6, 77.3, 76.0, 74.7, 73.4],
  '0.25P': [100.0, 95.3, 93.1, 91.2, 89.4, 87.8, 86.2, 84.7, 83.2, 81.7, 80.3, 78.9, 77.6, 76.3, 75.0, 73.7]
};

function linearInterpolate(arr, year) {
  const idx = Math.floor(year);
  if (idx >= arr.length - 1) return arr[arr.length - 1];
  if (idx < 0) return arr[0];
  const frac = year - idx;
  return arr[idx] + frac * (arr[idx + 1] - arr[idx]);
}

function getSoH(cRate, year, cyclesPerDay) {
  let soh_base = 100;
  if (cRate === '0.5P') {
    soh_base = linearInterpolate(DEGRADATION_TABLE['0.5P'], year);
  } else if (cRate === '0.25P') {
    soh_base = linearInterpolate(DEGRADATION_TABLE['0.25P'], year);
  } else if (cRate === '0.1C') {
    const soh_025P = linearInterpolate(DEGRADATION_TABLE['0.25P'], year);
    const degradacao_025P = 100 - soh_025P;
    const degradacao_01C = degradacao_025P * 0.85; // 15% menos degradação
    soh_base = 100 - degradacao_01C;
  }
  
  const degradacao_base = 100 - soh_base;
  // Separar degradação calendárica (40%) e cíclica (60%) escalada por ciclos/dia
  const degradacao_calendario = degradacao_base * 0.4;
  const degradacao_ciclica = degradacao_base * 0.6 * cyclesPerDay;
  
  return Math.max(0, 100 - degradacao_calendario - degradacao_ciclica);
}

function calcDegradationCurves(cyclesPerDay, eolPercent) {
  const curves = {
    '0.5P': [],
    '0.25P': [],
    '0.1C': []
  };
  for (let year = 0; year <= 15; year++) {
    curves['0.5P'].push(getSoH('0.5P', year, cyclesPerDay));
    curves['0.25P'].push(getSoH('0.25P', year, cyclesPerDay));
    curves['0.1C'].push(getSoH('0.1C', year, cyclesPerDay));
  }
  return curves;
}

function getEfficiencyConstants(rtePercent, systemLossesPercent) {
  const rte = rtePercent / 100;
  const perdas = systemLossesPercent / 100;
  
  const eta_charge = Math.sqrt(rte);
  const eta_discharge = Math.sqrt(rte);
  const eta_system = 1 - perdas;
  
  return { eta_charge, eta_discharge, eta_system };
}

function getEnergyPerCycle(consumptionKwh, workingDays, cyclesPerDay) {
  return consumptionKwh / workingDays / cyclesPerDay;
}

function getNominalEnergyRequired(energyPerCycle, dodPercent, rtePercent, etaSystem) {
  const dod = dodPercent / 100;
  const rte = rtePercent / 100;
  if (dod === 0 || rte === 0 || etaSystem === 0) return 0;
  return energyPerCycle / (dod * rte * etaSystem);
}

function getBessQuantity(nominalEnergyRequired, bessEnergyKwh) {
  if (bessEnergyKwh <= 0) return { exact: 0, rounded: 0, roundedDown: false };
  const exact = nominalEnergyRequired / bessEnergyKwh;
  const frac = exact - Math.floor(exact);
  let rounded = (frac >= 0.2) ? Math.ceil(exact) : Math.floor(exact);
  
  // Force at least 1 BESS
  rounded = Math.max(1, rounded);
  
  const roundedDown = (rounded < exact);
  
  return { exact, rounded, roundedDown };
}

function getEnergyFlow(totalBessEnergy, dodPercent, etaCharge, etaDischarge, etaSystem) {
  const dod = dodPercent / 100;
  const bessDOD = totalBessEnergy * dod;
  
  const E_carga = bessDOD / etaCharge;
  const E_descarga = bessDOD * etaDischarge;
  const E_compensada = E_descarga * etaSystem;
  const E_consumida = E_carga / etaSystem;
  
  return { E_carga, E_descarga, E_compensada, E_consumida };
}

function getEconomicSummary(consumedEnergy, tariffFp, compensatedEnergy, tariffHp) {
  const Custo_carga_FP = consumedEnergy * tariffFp;
  const Custo_evitado_HP = compensatedEnergy * tariffHp;
  const Economia_por_ciclo = Custo_evitado_HP - Custo_carga_FP;
  
  return { Custo_carga_FP, Custo_evitado_HP, Economia_por_ciclo };
}

function getPeakHours(peakStartTimeStr) {
  if (!peakStartTimeStr) return { start: "18:00", end: "21:00", duration: 3 };
  const [h, m] = peakStartTimeStr.split(':').map(Number);
  const endH = (h + 3) % 24;
  const end = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { start: peakStartTimeStr, end, duration: 3 };
}

function runCalculation(inputs) {
  if (
    !inputs['projeto-consumo-kwh'] || 
    !inputs['projeto-dias-uteis'] || 
    !inputs['projeto-ciclos-dia'] || 
    inputs['projeto-ciclos-dia'] <= 0
  ) {
    throw new Error("Inputs inválidos para cálculo.");
  }
  
  const consumptionKwh = inputs['projeto-consumo-kwh'];
  const workingDays = inputs['projeto-dias-uteis'];
  const cyclesPerDay = inputs['projeto-ciclos-dia'];
  const rtePercent = inputs['equipamento-rte'];
  const systemLossesPercent = inputs['equipamento-perdas'];
  const dodPercent = inputs['equipamento-dod'];
  const bessEnergyKwh = inputs['equipamento-energia-kwh'];
  const peakStartTime = inputs['projeto-hora-inicio-hp'];
  const tariffFp = inputs['projeto-tarifa-fp'];
  const tariffHp = inputs['projeto-tarifa-hp'];
  
  const { eta_charge, eta_discharge, eta_system } = getEfficiencyConstants(rtePercent, systemLossesPercent);
  
  const energy_per_cycle_kwh = getEnergyPerCycle(consumptionKwh, workingDays, cyclesPerDay);
  
  const nominal_energy_required_kwh = getNominalEnergyRequired(energy_per_cycle_kwh, dodPercent, rtePercent, eta_system);
  
  const { exact, rounded, roundedDown } = getBessQuantity(nominal_energy_required_kwh, bessEnergyKwh);
  
  const total_bess_energy_kwh = rounded * bessEnergyKwh;
  const total_bess_power_kw = rounded * inputs['equipamento-potencia-kw'];
  
  const { E_carga, E_descarga, E_compensada, E_consumida } = getEnergyFlow(total_bess_energy_kwh, dodPercent, eta_charge, eta_discharge, eta_system);
  
  const { Custo_carga_FP, Custo_evitado_HP, Economia_por_ciclo } = getEconomicSummary(E_consumida, tariffFp, E_compensada, tariffHp);
  
  const peak_hours = getPeakHours(peakStartTime);
  
  return {
    energy_per_cycle_kwh,
    eta_charge,
    eta_discharge,
    eta_system,
    nominal_energy_required_kwh,
    bess_quantity_exact: exact,
    bess_quantity: rounded,
    bess_quantity_rounded_down: roundedDown,
    total_bess_energy_kwh,
    total_bess_power_kw,
    charge_energy_kwh: E_carga,
    discharge_energy_kwh: E_descarga,
    compensated_energy_kwh: E_compensada,
    consumed_energy_kwh: E_consumida,
    cost_charge_offpeak_brl: Custo_carga_FP,
    cost_avoided_peak_brl: Custo_evitado_HP,
    savings_per_cycle_brl: Economia_por_ciclo,
    peak_hours,
    dod_percent: dodPercent,
    rte_percent: rtePercent,
    system_losses_percent: systemLossesPercent,
    degradation_curves: calcDegradationCurves(cyclesPerDay, inputs['equipamento-eol'])
  };
}

/* ====================================================================
 * SEÇÃO 3: FLOW_DIAGRAM — Diagrama de funcionamento BESS em HTML/CSS
 * ==================================================================== */

// Função auxiliar global para formatar números no padrão brasileiro (pt-BR)
function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null || isNaN(val) || !Number.isFinite(val)) return '0,00';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Registro global das instâncias ApexCharts (para export e re-render)
const bessCharts = {
  loadCurve: null,
  degradation: null
};

// Renderiza o diagrama de fluxo de energia com nós HTML (.node-card) e conectores CSS
function renderFlowDiagram(container, outputs, protectionType) {
  if (!container) return;

  const protectionLabel = (protectionType === 'ATS') ? 'Chave ATS' : 'Barramento QGBT';

  const E_consumida = formatNumber(outputs.consumed_energy_kwh);
  const E_carga = formatNumber(outputs.charge_energy_kwh);
  const E_descarga = formatNumber(outputs.discharge_energy_kwh);
  const E_compensada = formatNumber(outputs.compensated_energy_kwh);

  const eta_charge = formatNumber(outputs.eta_charge * 100, 2);
  const eta_discharge = formatNumber(outputs.eta_discharge * 100, 2);
  const eta_system = formatNumber(outputs.eta_system * 100, 1);
  const lossPercent = formatNumber((1 - outputs.eta_system) * 100, 1);
  const totalBessKwh = formatNumber(outputs.total_bess_energy_kwh, 0);

  container.innerHTML = `
    <div class="archify-flow-card" id="flow-diagram-capture">
      <div class="archify-unifilar-header">
        <div class="archify-unifilar-title">
          <span class="archify-dot"></span>
          <span class="archify-title-text">Diagrama de Fluxo de Energia (Load-Shifting)</span>
          <span class="archify-tag">η_sistema = ${eta_system}%</span>
        </div>
      </div>
      <div class="archify-svg-viewport">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 530" width="100%" height="100%" class="archify-unifilar-svg" id="flow-svg">
          <defs>
            <linearGradient id="flowBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f0f7fc"/>
              <stop offset="100%" stop-color="#ffffff"/>
            </linearGradient>
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#f8fafc"/>
            </linearGradient>
            <linearGradient id="bessCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.08"/>
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#10b981" flood-opacity="0.6"/>
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#f59e0b" flood-opacity="0.6"/>
            </filter>
          </defs>

          <!-- Background Canvas -->
          <rect width="1020" height="530" fill="url(#flowBgGrad)" rx="10"/>

          <!-- TOP RIGHT FLOW LEGEND -->
          <g transform="translate(805, 12)">
            <rect x="0" y="0" width="200" height="75" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <line x1="15" y1="20" x2="55" y2="20" stroke="#10b981" stroke-width="3.5" stroke-dasharray="6,3"/>
            <text x="65" y="24" font-size="11" font-weight="600" fill="#334155">Carga FP (Rede)</text>
            <line x1="15" y1="40" x2="55" y2="40" stroke="#f59e0b" stroke-width="3.5" stroke-dasharray="6,3"/>
            <text x="65" y="44" font-size="11" font-weight="600" fill="#334155">Descarga BESS (HP)</text>
            <line x1="15" y1="60" x2="55" y2="60" stroke="#00d992" stroke-width="3.5"/>
            <text x="65" y="63" font-size="11" font-weight="600" fill="#334155">Alimentação Cargas (HP)</text>
          </g>

          <!-- WIRING PATHS & LINES -->

          <!-- 1. CARGA FP PATH: Grid -> PCC -> BESS (Green #10b981) -->
          <path d="M 210,85 L 435,85" stroke="#10b981" stroke-width="3.5" stroke-dasharray="6,3" fill="none" filter="url(#glowGreen)"/>
          <path d="M 470,125 L 470,305" stroke="#10b981" stroke-width="3.5" stroke-dasharray="6,3" fill="none" filter="url(#glowGreen)"/>
          <polygon points="470,308 464,296 476,296" fill="#10b981"/>

          <!-- 2. DESCARGA HP PATH: BESS -> PCC -> Cargas C&I (Amber #f59e0b) -->
          <path d="M 550,305 L 550,125" stroke="#f59e0b" stroke-width="3.5" stroke-dasharray="6,3" fill="none" filter="url(#glowAmber)"/>
          <polygon points="550,122 544,134 556,134" fill="#f59e0b"/>
          <path d="M 585,85 L 805,85" stroke="#00d992" stroke-width="3.5" stroke-dasharray="6,3" fill="none" filter="url(#glowAmber)"/>
          <polygon points="808,85 796,79 796,91" fill="#00d992"/>

          <!-- CALLOUT DATA CARDS -->

          <!-- Callout 1: Carga FP (Grid to PCC) -->
          <g transform="translate(230, 40)">
            <rect x="0" y="0" width="180" height="42" rx="6" fill="#ffffff" stroke="#10b981" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="10" y="16" font-size="10" font-weight="700" fill="#10b981">CARGA FORA DE PONTA</text>
            <text x="10" y="32" font-size="11" font-weight="800" fill="#1e293b">E_consumida = ${E_consumida} kWh</text>
          </g>

          <!-- Callout 2: Carga BESS (PCC to BESS) -->
          <g transform="translate(325, 195)">
            <rect x="0" y="0" width="130" height="44" rx="6" fill="#ffffff" stroke="#10b981" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="10" y="16" font-size="10" font-weight="700" fill="#0284c7">ENTRADA BESS</text>
            <text x="10" y="30" font-size="10" font-weight="800" fill="#1e293b">E_carga = ${E_carga} kWh</text>
            <text x="10" y="40" font-size="9" font-weight="600" fill="#64748b">η_carga = ${eta_charge}%</text>
          </g>

          <!-- Callout 3: Descarga BESS (BESS to PCC) -->
          <g transform="translate(565, 195)">
            <rect x="0" y="0" width="140" height="44" rx="6" fill="#ffffff" stroke="#f59e0b" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="10" y="16" font-size="10" font-weight="700" fill="#d97706">SAÍDA BESS (PONTAS)</text>
            <text x="10" y="30" font-size="10" font-weight="800" fill="#1e293b">E_descarga = ${E_descarga} kWh</text>
            <text x="10" y="40" font-size="9" font-weight="600" fill="#64748b">η_descarga = ${eta_discharge}%</text>
          </g>

          <!-- Callout 4: Abastecimento HP (PCC to Cargas C&I) -->
          <g transform="translate(615, 40)">
            <rect x="0" y="0" width="175" height="42" rx="6" fill="#ffffff" stroke="#00d992" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="10" y="16" font-size="10" font-weight="700" fill="#059669">COMPENSAÇÃO EM PONTA</text>
            <text x="10" y="32" font-size="11" font-weight="800" fill="#1e293b">E_compensada = ${E_compensada} kWh</text>
          </g>

          <!-- NODES -->

          <!-- NODE 1: REDE CONCESSIONÁRIA (Top Left) -->
          <g transform="translate(50, 45)">
            <rect x="0" y="0" width="160" height="80" rx="8" fill="url(#cardGrad)" stroke="#64748b" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <circle cx="35" cy="40" r="22" fill="#0f172a"/>
            <polygon points="35,24 25,52 45,52" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
            <line x1="20" y1="32" x2="50" y2="32" stroke="#38bdf8" stroke-width="1.5"/>
            <text x="70" y="36" font-size="12" font-weight="800" fill="#0f172a">Rede AC</text>
            <text x="70" y="52" font-size="10" font-weight="600" fill="#64748b">Concessionária</text>
          </g>

          <!-- NODE 2: PONTO DE CONEXÃO COMUM (Center Top) -->
          <g transform="translate(435, 45)">
            <rect x="0" y="0" width="150" height="80" rx="8" fill="#334155" stroke="#475569" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <circle cx="35" cy="40" r="20" fill="#0f172a"/>
            <text x="35" y="45" font-size="16" text-anchor="middle">🔀</text>
            <text x="65" y="35" font-size="12" font-weight="800" fill="#ffffff">${protectionLabel}</text>
            <text x="65" y="52" font-size="10" font-weight="600" fill="#cbd5e1">PCC Conexão</text>
          </g>

          <!-- NODE 3: CARGAS C&I (Top Right) -->
          <g transform="translate(805, 45)">
            <rect x="0" y="0" width="160" height="80" rx="8" fill="url(#cardGrad)" stroke="#64748b" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <circle cx="35" cy="40" r="22" fill="#0f172a"/>
            <text x="35" y="46" font-size="18" text-anchor="middle">🏭</text>
            <text x="70" y="36" font-size="12" font-weight="800" fill="#0f172a">Cargas C&amp;I</text>
            <text x="70" y="52" font-size="10" font-weight="600" fill="#64748b">Instalação</text>
          </g>

          <!-- NODE 4: SISTEMA BESS (Center Bottom) -->
          <g transform="translate(370, 305)">
            <rect x="0" y="0" width="280" height="135" rx="10" fill="url(#bessCardGrad)" stroke="#0284c7" stroke-width="2" filter="url(#shadowFilter)"/>
            <rect x="0" y="0" width="280" height="28" rx="10" fill="#0284c7" opacity="0.2"/>
            <text x="140" y="19" font-size="11" font-weight="800" fill="#38bdf8" letter-spacing="1" text-anchor="middle">SISTEMA BESS LIVOLTEK</text>
            
            <g transform="translate(20, 42)">
              <rect x="0" y="0" width="45" height="75" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
              <text x="22.5" y="42" font-size="10" font-weight="800" fill="#0f172a" text-anchor="middle" transform="rotate(-90 22.5 42)">LIVOLTEK</text>
              <rect x="5" y="62" width="35" height="8" rx="1" fill="#10b981"/>
            </g>

            <g transform="translate(80, 42)">
              <rect x="0" y="0" width="60" height="75" rx="4" fill="#1e293b" stroke="#475569" stroke-width="1"/>
              <text x="30" y="16" font-size="9" font-weight="800" fill="#38bdf8" text-anchor="middle">PCS 3Φ</text>
              <circle cx="30" cy="45" r="12" fill="#0f172a"/>
              <circle cx="30" cy="45" r="8" fill="#10b981" filter="url(#glowGreen)"/>
            </g>

            <text x="155" y="62" font-size="12" font-weight="800" fill="#ffffff">Capacidade BESS</text>
            <text x="155" y="80" font-size="16" font-weight="900" fill="#10b981">${totalBessKwh} kWh</text>
            <text x="155" y="100" font-size="10" font-weight="600" fill="#94a3b8">Baterias LFP Nível II</text>
          </g>

          <!-- BOTTOM METRICS SUMMARY BAR -->
          <g transform="translate(45, 465)">
            <rect x="0" y="0" width="930" height="50" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" filter="url(#shadowFilter)"/>
            
            <g transform="translate(20, 15)">
              <text x="0" y="12" font-size="10" font-weight="700" fill="#64748b">ENERGIA CONSUMIDA DA REDE</text>
              <text x="0" y="26" font-size="12" font-weight="900" fill="#0f172a">${E_consumida} kWh</text>
            </g>
            <line x1="240" y1="10" x2="240" y2="40" stroke="#e2e8f0" stroke-width="1.5"/>

            <g transform="translate(265, 15)">
              <text x="0" y="12" font-size="10" font-weight="700" fill="#64748b">ENERGIA CARREGADA NO BESS</text>
              <text x="0" y="26" font-size="12" font-weight="900" fill="#0284c7">${E_carga} kWh</text>
            </g>
            <line x1="480" y1="10" x2="480" y2="40" stroke="#e2e8f0" stroke-width="1.5"/>

            <g transform="translate(505, 15)">
              <text x="0" y="12" font-size="10" font-weight="700" fill="#64748b">ENERGIA ENTREGUE NA PONTA</text>
              <text x="0" y="26" font-size="12" font-weight="900" fill="#d97706">${E_compensada} kWh</text>
            </g>
            <line x1="720" y1="10" x2="720" y2="40" stroke="#e2e8f0" stroke-width="1.5"/>

            <g transform="translate(745, 15)">
              <text x="0" y="12" font-size="10" font-weight="700" fill="#64748b">RENDIMENTO GLOBAL (RTE)</text>
              <text x="0" y="26" font-size="12" font-weight="900" fill="#10b981">${eta_system}%</text>
            </g>
          </g>

        </svg>
      </div>
    </div>
  `;
}

/* ====================================================================
 * SEÇÃO 4: LOAD_CURVE_CHART — Curva de carga 24h com ApexCharts
 * ==================================================================== */

function renderLoadCurve(container, outputs, inputs) {
  if (!container || typeof ApexCharts === 'undefined') return;

  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';
  const colorHairline = rootStyles.getPropertyValue('--color-hairline').trim() || '#3d3a39';

  const contracted_demand_kw = inputs['projeto-demanda-kw'] || 470.0;

  const baseLoad = [];
  for (let h = 0; h < 24; h++) {
    baseLoad.push(LOAD_PROFILE[h] * contracted_demand_kw);
  }

  const startHP = parseInt(outputs.peak_hours.start.split(':')[0], 10);
  const endHP = (startHP + 3) % 24;

  function isHP(h) {
    return endHP > startHP ? (h >= startHP && h < startHP + 3) : (h >= startHP || h < endHP);
  }

  // 1. Determinar N (duração da carga): ~6h contínuas ou mais se a potência do BESS for limitante
  const nonHPHourCount = baseLoad.reduce((count, _, h) => count + (isHP(h) ? 0 : 1), 0);
  const minHoursRequired = Math.ceil(outputs.consumed_energy_kwh / outputs.total_bess_power_kw);
  const N = Math.min(Math.max(6, minHoursRequired), nonHPHourCount);

  // 2. Buscar a janela CONTÍNUA de N horas (fora do HP) com a menor demanda média —
  // carregamento real do BESS ocorre em bloco constante, não em horas avulsas
  let bestStart = 0;
  let bestSum = Infinity;
  for (let start = 0; start < 24; start++) {
    let sum = 0;
    let valid = true;
    for (let i = 0; i < N; i++) {
      const hr = (start + i) % 24;
      if (isHP(hr)) { valid = false; break; }
      sum += baseLoad[hr];
    }
    if (valid && sum < bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }

  const chargeHoursSet = new Set();
  for (let i = 0; i < N; i++) {
    chargeHoursSet.add((bestStart + i) % 24);
  }

  const P_carga = outputs.consumed_energy_kwh / N;
  const P_descarga = outputs.discharge_energy_kwh / 3;

  const baseSeries = [];
  const gridSeries = [];
  for (let h = 0; h <= 24; h++) {
    const hr = h % 24;
    let p = baseLoad[hr];
    if (isHP(hr)) {
      p -= P_descarga;
    } else if (chargeHoursSet.has(hr)) {
      p += P_carga;
    }
    baseSeries.push([h, Math.round(baseLoad[hr] * 100) / 100]);
    gridSeries.push([h, Math.round(p * 100) / 100]);
  }

  // Zonas do Horário de Ponta (com suporte a virada de dia)
  const hpZones = [];
  if (endHP > startHP) {
    hpZones.push({ from: startHP, to: startHP + 3 });
  } else {
    hpZones.push({ from: startHP, to: 24 });
    hpZones.push({ from: 0, to: endHP });
  }

  const xAnnotations = hpZones.map((zone, idx) => ({
    x: zone.from,
    x2: zone.to,
    fillColor: '#ef4444',
    opacity: 0.08,
    borderColor: 'transparent',
    label: idx === 0 ? {
      text: 'Horário de Ponta',
      orientation: 'horizontal',
      position: 'top',
      offsetY: -8,
      style: {
        color: '#fca5a5',
        background: 'transparent',
        fontSize: '11px',
        fontWeight: 600
      }
    } : undefined
  }));

  // Anotações de custo (carga FP e descarga HP)
  const chargeAnnHour = [...chargeHoursSet].sort((a, b) => a - b)[Math.floor(N / 2)] || 3;
  const midHP = (startHP + 1.5) % 24;
  const pointAnnotations = [
    {
      x: chargeAnnHour,
      y: baseLoad[chargeAnnHour] + P_carga,
      marker: { size: 4, fillColor: '#3b82f6', strokeColor: '#1a1a1a', strokeWidth: 2 },
      label: {
        text: `Carga FP: R$ ${formatNumber(outputs.cost_charge_offpeak_brl, 2)}`,
        offsetY: -8,
        borderColor: '#3b82f6',
        style: { background: '#101010', color: '#60a5fa', fontSize: '11px', fontWeight: 600, padding: { left: 6, right: 6, top: 3, bottom: 3 } }
      }
    },
    {
      x: midHP,
      y: baseLoad[Math.floor(midHP) % 24] - P_descarga,
      marker: { size: 4, fillColor: '#f59e0b', strokeColor: '#1a1a1a', strokeWidth: 2 },
      label: {
        text: `Evitado HP: R$ ${formatNumber(outputs.cost_avoided_peak_brl, 2)}`,
        offsetY: 42,
        borderColor: '#f59e0b',
        style: { background: '#101010', color: '#fbbf24', fontSize: '11px', fontWeight: 600, padding: { left: 6, right: 6, top: 3, bottom: 3 } }
      }
    }
  ];

  const options = {
    chart: {
      type: 'area',
      height: 360,
      background: 'transparent',
      fontFamily: "'Inter', system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 500 }
    },
    theme: { mode: 'dark' },
    series: [
      { name: 'Rede Base', data: baseSeries },
      { name: 'Rede com BESS', data: gridSeries }
    ],
    colors: [colorPrimary, '#a78bfa'],
    stroke: {
      curve: 'straight',
      width: [3, 2.5],
      dashArray: [0, 6]
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: [0.45, 0.12],
        opacityTo: [0.05, 0.02],
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: colorHairline,
      strokeDashArray: 3,
      padding: { top: 10 }
    },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      type: 'numeric',
      min: 0,
      max: 24,
      tickAmount: 12,
      labels: {
        style: { colors: colorMute, fontSize: '11px' },
        formatter: (val) => `${Math.round(val)}h`
      },
      axisBorder: { show: false },
      axisTicks: { color: colorHairline },
      title: { text: 'Hora (h)', style: { color: colorMute, fontSize: '11px', fontWeight: 500 } }
    },
    yaxis: {
      labels: {
        style: { colors: colorMute, fontSize: '11px' },
        formatter: (val) => `${formatNumber(val, 0)} kW`
      },
      title: { text: 'Potência (kW)', style: { color: colorMute, fontSize: '11px', fontWeight: 500 } }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      labels: { colors: colorMute },
      markers: { width: 10, height: 10, radius: 3 }
    },
    tooltip: {
      shared: true,
      theme: 'dark',
      x: { formatter: (val) => `Hora: ${Math.round(val)}h` },
      y: { formatter: (val) => `${formatNumber(val, 1)} kW` }
    },
    annotations: {
      xaxis: xAnnotations,
      points: pointAnnotations
    }
  };

  if (bessCharts.loadCurve) {
    bessCharts.loadCurve.destroy();
    bessCharts.loadCurve = null;
  }
  container.innerHTML = '';

  bessCharts.loadCurve = new ApexCharts(container, options);
  bessCharts.loadCurve.render();
}

/* ====================================================================
 * SEÇÃO 5: UNIFILAR — Diagrama unifilar em HTML/CSS
 * ==================================================================== */

/* ====================================================================
 * SEÇÃO 5: UNIFILAR — Diagrama unifilar com Arquitetura Archify (SVG)
 * ==================================================================== */

function renderUnifilar(container, outputs, inputs) {
  if (!container) return;

  const totalBessKwh = (outputs && outputs.total_bess_energy_kwh) ? outputs.total_bess_energy_kwh : 1000;
  const numCabinets = Math.min(5, Math.max(3, Math.ceil(totalBessKwh / 300)));
  const bessCabinetsSvg = [];

  const startX = 32;
  const cabWidth = 70;
  const gap = 12;

  for (let i = 0; i < numCabinets; i++) {
    const cabX = startX + i * (cabWidth + gap);
    const isParallelBridge = (i === numCabinets - 1 && numCabinets > 3);
    
    bessCabinetsSvg.push(`
      <g class="bess-cabinet-node" transform="translate(${cabX}, 215)">
        <rect x="0" y="0" width="${cabWidth}" height="220" rx="4" fill="url(#bessCabinetGrad)" stroke="#94a3b8" stroke-width="1.5" filter="url(#shadowFilter)"/>
        <rect x="2" y="2" width="${cabWidth - 4}" height="216" rx="3" fill="none" stroke="#ffffff" stroke-width="1"/>
        
        <text x="${cabWidth - 14}" y="110" font-size="10" font-weight="800" fill="#334155" letter-spacing="3" transform="rotate(-90 ${cabWidth - 14} 110)">LIVOLTEK</text>
        
        <circle cx="12" cy="20" r="3" fill="#ef4444"/>
        <circle cx="12" cy="32" r="2.5" fill="#10b981"/>
        <circle cx="12" cy="42" r="2.5" fill="#f59e0b"/>
        <circle cx="12" cy="52" r="2.5" fill="#ef4444"/>
        
        <rect x="7" y="105" width="4" height="22" rx="1" fill="#475569"/>
        
        <polygon points="12,165 22,180 2,180" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
        <text x="12" y="177" font-size="8" font-weight="bold" fill="#000" text-anchor="middle">!</text>
        
        <rect x="5" y="192" width="${cabWidth - 10}" height="20" rx="2" fill="#1e293b"/>
        <line x1="8" y1="196" x2="${cabWidth - 8}" y2="196" stroke="#475569" stroke-width="1.5"/>
        <line x1="8" y1="200" x2="${cabWidth - 8}" y2="200" stroke="#475569" stroke-width="1.5"/>
        <line x1="8" y1="204" x2="${cabWidth - 8}" y2="204" stroke="#475569" stroke-width="1.5"/>
        <line x1="8" y1="208" x2="${cabWidth - 8}" y2="208" stroke="#475569" stroke-width="1.5"/>
      </g>
    `);
    
    if (isParallelBridge) {
      const bridgeX1 = cabX - gap + 2;
      const bridgeX2 = cabX - 2;
      bessCabinetsSvg.push(`
        <line x1="${bridgeX1}" y1="325" x2="${bridgeX2}" y2="325" stroke="#334155" stroke-width="2" stroke-dasharray="3,3"/>
      `);
    }
  }

  container.innerHTML = `
    <div class="archify-unifilar-card" id="unifilar-capture">
      <div class="archify-unifilar-header">
        <div class="archify-unifilar-title">
          <span class="archify-dot"></span>
          <span class="archify-title-text">Sistema BESS Livoltek &amp; Fotovoltaico</span>
          <span class="archify-tag">${formatNumber(totalBessKwh, 0)} kWh Total</span>
        </div>
      </div>
      <div class="archify-svg-viewport">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 530" width="100%" height="100%" class="archify-unifilar-svg" id="unifilar-svg">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f0f7fc"/>
              <stop offset="100%" stop-color="#ffffff"/>
            </linearGradient>
            <linearGradient id="bessCabinetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="70%" stop-color="#f1f5f9"/>
              <stop offset="100%" stop-color="#e2e8f0"/>
            </linearGradient>
            <linearGradient id="inverterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#f8fafc"/>
            </linearGradient>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
            <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.08"/>
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#10b981" flood-opacity="0.8"/>
            </filter>
          </defs>

          <!-- Diagram Canvas Base Background -->
          <rect width="1020" height="530" fill="url(#bgGradient)" rx="10"/>

          <!-- LEGEND TOP RIGHT -->
          <g transform="translate(825, 12)">
            <rect x="0" y="0" width="180" height="70" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <line x1="15" y1="20" x2="55" y2="20" stroke="#0072ff" stroke-width="3.5"/>
            <text x="65" y="24" font-size="12" font-weight="600" fill="#334155">DC</text>
            <line x1="15" y1="40" x2="55" y2="40" stroke="#ff2d2d" stroke-width="3.5"/>
            <text x="65" y="44" font-size="12" font-weight="600" fill="#334155">AC</text>
            <line x1="15" y1="58" x2="55" y2="58" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3"/>
            <text x="65" y="61" font-size="11" font-weight="600" fill="#334155">Communication</text>
          </g>

          <!-- 1. PV PANELS (Top Left) -->
          <g class="pv-group" transform="translate(25, 50)">
            <polygon points="5,40 30,10 65,10 40,40" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
            <line x1="17.5" y1="25" x2="52.5" y2="25" stroke="#38bdf8" stroke-width="1"/>
            <line x1="35" y1="10" x2="22.5" y2="40" stroke="#38bdf8" stroke-width="1"/>
            
            <polygon points="45,40 70,10 105,10 80,40" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
            <line x1="57.5" y1="25" x2="92.5" y2="25" stroke="#38bdf8" stroke-width="1"/>
            <line x1="75" y1="10" x2="62.5" y2="40" stroke="#38bdf8" stroke-width="1"/>

            <circle cx="8" cy="8" r="5" fill="#f59e0b"/>
            <line x1="8" y1="1" x2="8" y2="0" stroke="#f59e0b" stroke-width="1.5"/>
            <line x1="8" y1="15" x2="8" y2="16" stroke="#f59e0b" stroke-width="1.5"/>
            <line x1="1" y1="8" x2="0" y2="8" stroke="#f59e0b" stroke-width="1.5"/>
            <line x1="15" y1="8" x2="16" y2="8" stroke="#f59e0b" stroke-width="1.5"/>

            <text x="55" y="58" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">PV</text>
          </g>

          <!-- 2. GRID-TIED SYSTEM BOX -->
          <rect x="165" y="30" width="280" height="115" rx="10" fill="rgba(59, 130, 246, 0.03)" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6,4"/>
          <text x="305" y="138" font-size="12" font-weight="600" fill="#3b82f6" text-anchor="middle">Grid-tied System</text>

          <!-- Inverter 1 -->
          <g transform="translate(185, 45)">
            <rect x="0" y="0" width="105" height="68" rx="5" fill="url(#inverterGrad)" stroke="#94a3b8" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="52.5" y="18" font-size="9" font-weight="800" fill="#475569" letter-spacing="2" text-anchor="middle">LIVOLTEK</text>
            <circle cx="52.5" cy="40" r="9" fill="#0f172a"/>
            <circle cx="52.5" cy="40" r="6" fill="#10b981" filter="url(#glowGreen)"/>
            <path d="M 52.5,36 L 52.5,40" stroke="#ffffff" stroke-width="1.5"/>
            <rect x="15" y="60" width="75" height="4" fill="#334155" rx="1"/>
            <rect x="10" y="68" width="6" height="4" fill="#64748b"/>
            <rect x="89" y="68" width="6" height="4" fill="#64748b"/>
          </g>

          <!-- Parallel line between inverters -->
          <line x1="290" y1="80" x2="315" y2="80" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>

          <!-- Inverter 2 -->
          <g transform="translate(315, 45)">
            <rect x="0" y="0" width="105" height="68" rx="5" fill="url(#inverterGrad)" stroke="#94a3b8" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <text x="52.5" y="18" font-size="9" font-weight="800" fill="#475569" letter-spacing="2" text-anchor="middle">LIVOLTEK</text>
            <circle cx="52.5" cy="40" r="9" fill="#0f172a"/>
            <circle cx="52.5" cy="40" r="6" fill="#10b981" filter="url(#glowGreen)"/>
            <path d="M 52.5,36 L 52.5,40" stroke="#ffffff" stroke-width="1.5"/>
            <rect x="15" y="60" width="75" height="4" fill="#334155" rx="1"/>
            <rect x="10" y="68" width="6" height="4" fill="#64748b"/>
            <rect x="89" y="68" width="6" height="4" fill="#64748b"/>
          </g>

          <!-- 3. LIVOLTEK BESS SYSTEM BOX -->
          <rect x="15" y="195" width="425" height="280" rx="10" fill="rgba(59, 130, 246, 0.03)" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6,4"/>
          <text x="227" y="465" font-size="13" font-weight="700" fill="#3b82f6" text-anchor="middle">Livoltek BESS System</text>

          <!-- BESS Cabinets rendered dynamically -->
          ${bessCabinetsSvg.join('')}

          <!-- 4. PV CABINET -->
          <g transform="translate(485, 55)">
            <rect x="0" y="0" width="70" height="85" rx="5" fill="#334155" stroke="#475569" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <circle cx="35" cy="38" r="16" fill="#0f172a" stroke="#64748b" stroke-width="1"/>
            <path d="M 36,28 L 28,40 L 34,40 L 32,48 L 42,35 L 35,35 Z" fill="#f59e0b"/>
            <line x1="15" y1="68" x2="55" y2="68" stroke="#94a3b8" stroke-width="2"/>
            <line x1="15" y1="73" x2="55" y2="73" stroke="#94a3b8" stroke-width="2"/>
            <text x="35" y="103" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">PV Cabinet</text>
          </g>

          <!-- 5. iEMS -->
          <g transform="translate(535, 270)">
            <rect x="0" y="0" width="85" height="55" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" filter="url(#shadowFilter)"/>
            <rect x="15" y="12" width="55" height="30" rx="3" fill="#1e293b"/>
            <rect x="20" y="16" width="20" height="8" rx="1" fill="#38bdf8"/>
            <circle cx="50" cy="20" r="2" fill="#10b981"/>
            <circle cx="58" cy="20" r="2" fill="#f59e0b"/>
            <rect x="20" y="30" width="6" height="6" fill="#64748b"/>
            <rect x="30" y="30" width="6" height="6" fill="#64748b"/>
            <rect x="40" y="30" width="6" height="6" fill="#64748b"/>
            <text x="42.5" y="72" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">iEMS</text>
          </g>

          <!-- 6. APP / WEB -->
          <g transform="translate(675, 45)">
            <path d="M 30,22 Q 22,12 35,10 Q 42,2 54,8 Q 66,2 72,12 Q 82,14 80,26 Q 80,34 68,34 L 28,34 Q 18,34 20,24 Z" fill="#0284c7" opacity="0.9"/>
            <path d="M 68,14 A 8 8 0 0 1 76,22" stroke="#ffffff" stroke-width="2" fill="none"/>
            <path d="M 71,17 A 4 4 0 0 1 75,21" stroke="#ffffff" stroke-width="2" fill="none"/>
            <rect x="15" y="30" width="50" height="32" rx="3" fill="#0f172a" stroke="#0284c7" stroke-width="1.5"/>
            <rect x="18" y="33" width="44" height="24" fill="#38bdf8" opacity="0.2"/>
            <polygon points="35,62 45,62 40,68" fill="#475569"/>
            <rect x="30" y="68" width="20" height="3" fill="#475569" rx="1"/>
            <rect x="62" y="38" width="16" height="26" rx="2" fill="#0f172a" stroke="#0284c7" stroke-width="1.5"/>
            <rect x="64" y="41" width="12" height="18" fill="#38bdf8" opacity="0.3"/>
            <text x="42.5" y="88" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">App/Web</text>
          </g>

          <!-- 7. TS CABINET (Central Hub) -->
          <g transform="translate(610, 240)">
            <rect x="0" y="0" width="65" height="235" rx="4" fill="url(#bessCabinetGrad)" stroke="#64748b" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <rect x="3" y="3" width="59" height="229" rx="2" fill="none" stroke="#e2e8f0" stroke-width="1"/>
            <rect x="8" y="15" width="49" height="190" rx="2" fill="#0f172a" opacity="0.85"/>
            <rect x="12" y="20" width="41" height="180" fill="url(#glassGrad)" opacity="0.4"/>
            <text x="32.5" y="125" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="3" transform="rotate(-90 32.5 125)" opacity="0.8">LIVOLTEK</text>
            <rect x="52" y="110" width="3" height="18" rx="1" fill="#cbd5e1"/>
            <rect x="0" y="225" width="65" height="10" fill="#1e293b" rx="1"/>
            <text x="32.5" y="252" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">TS Cabinet</text>
          </g>

          <!-- 8. CONTACTOR -->
          <g transform="translate(705, 225)">
            <rect x="0" y="0" width="75" height="40" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" filter="url(#shadowFilter)"/>
            <rect x="22" y="8" width="30" height="24" rx="2" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
            <line x1="28" y1="14" x2="46" y2="14" stroke="#475569" stroke-width="1.5"/>
            <line x1="28" y1="20" x2="46" y2="20" stroke="#475569" stroke-width="1.5"/>
            <line x1="28" y1="26" x2="46" y2="26" stroke="#475569" stroke-width="1.5"/>
            <circle cx="37" cy="20" r="3" fill="#ef4444"/>
            <text x="37.5" y="55" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">Contactor</text>
          </g>

          <!-- 9. SMART METER -->
          <g transform="translate(705, 325)">
            <rect x="0" y="0" width="75" height="40" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" filter="url(#shadowFilter)"/>
            <rect x="20" y="8" width="35" height="24" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1"/>
            <rect x="24" y="11" width="27" height="10" fill="#10b981" opacity="0.3"/>
            <text x="37.5" y="18" font-size="7" font-weight="bold" fill="#10b981" text-anchor="middle">230.5V</text>
            <circle cx="26" cy="27" r="1.5" fill="#38bdf8"/>
            <circle cx="32" cy="27" r="1.5" fill="#f59e0b"/>
            <circle cx="38" cy="27" r="1.5" fill="#ef4444"/>
            <text x="37.5" y="55" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">Smart Meter</text>
          </g>

          <!-- 10. TRANSFORMER -->
          <g transform="translate(825, 220)">
            <rect x="0" y="0" width="75" height="60" rx="4" fill="#475569" stroke="#334155" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <circle cx="28" cy="30" r="16" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
            <circle cx="47" cy="30" r="16" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
            <rect x="15" y="-6" width="6" height="6" fill="#94a3b8"/>
            <rect x="35" y="-6" width="6" height="6" fill="#94a3b8"/>
            <rect x="55" y="-6" width="6" height="6" fill="#94a3b8"/>
            <text x="37.5" y="78" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">Transformer</text>
          </g>

          <!-- 11. GRID (Tower) -->
          <g transform="translate(935, 215)">
            <polygon points="27,5 12,65 42,65" fill="none" stroke="#1e293b" stroke-width="2.5"/>
            <line x1="5" y1="20" x2="49" y2="20" stroke="#1e293b" stroke-width="2"/>
            <line x1="2" y1="35" x2="52" y2="35" stroke="#1e293b" stroke-width="2"/>
            <line x1="12" y1="65" x2="42" y2="35" stroke="#1e293b" stroke-width="1.5"/>
            <line x1="42" y1="65" x2="12" y2="35" stroke="#1e293b" stroke-width="1.5"/>
            <polygon points="27,10 20,20 34,20" fill="none" stroke="#1e293b" stroke-width="1.5"/>
            <circle cx="27" cy="48" r="8" fill="#ef4444"/>
            <path d="M 28,43 L 23,49 L 27,49 L 25,53 L 31,46 L 27,46 Z" fill="#ffffff"/>
            <text x="27" y="80" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">Grid</text>
          </g>

          <!-- 12. GEN (Generator) -->
          <g transform="translate(825, 320)">
            <rect x="0" y="0" width="75" height="55" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5" filter="url(#shadowFilter)"/>
            <rect x="10" y="10" width="55" height="35" rx="3" fill="#1e293b"/>
            <circle cx="28" cy="27" r="10" fill="none" stroke="#f59e0b" stroke-width="2"/>
            <text x="28" y="31" font-size="11" font-weight="bold" fill="#f59e0b" text-anchor="middle">G</text>
            <circle cx="52" cy="22" r="5" fill="#0f172a" stroke="#64748b" stroke-width="1"/>
            <line x1="52" y1="22" x2="55" y2="19" stroke="#ef4444" stroke-width="1.5"/>
            <rect x="62" y="-4" width="5" height="14" rx="1" fill="#64748b"/>
            <text x="37.5" y="72" font-size="12" font-weight="600" fill="#1e293b" text-anchor="middle">GEN</text>
          </g>

          <!-- 13. C&I LOADS -->
          <g transform="translate(740, 435)">
            <path d="M 10,60 L 10,25 L 25,35 L 25,25 L 40,35 L 40,25 L 55,35 L 55,60 Z" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
            <polygon points="10,25 25,15 40,25" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
            <rect x="30" y="42" width="10" height="18" fill="#f59e0b"/>
            <rect x="16" y="42" width="8" height="8" fill="#38bdf8" opacity="0.6"/>
            <rect x="44" y="42" width="8" height="8" fill="#38bdf8" opacity="0.6"/>
            <rect x="60" y="35" width="16" height="25" rx="2" fill="#334155" stroke="#64748b" stroke-width="1"/>
            <path d="M 68,40 L 64,48 L 68,48 L 66,54 L 72,45 L 68,45 Z" fill="#ef4444"/>
            <text x="37.5" y="76" font-size="12" font-weight="700" fill="#1e293b" text-anchor="middle">C&amp;I Loads</text>
          </g>

          <!-- WIRING CONNECTIONS -->
          <!-- DC WIRING (Blue #0072ff) -->
          <path d="M 125,80 L 185,80" stroke="#0072ff" stroke-width="3.5" fill="none"/>

          <!-- AC WIRING (Red #ff2d2d) -->
          <path d="M 420,80 L 485,80" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 555,80 L 642,80 L 642,240" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 440,355 L 610,355" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 675,245 L 705,245" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 780,245 L 825,245" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 900,245 L 935,245" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 825,345 L 780,345" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 705,345 L 675,345" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>
          <path d="M 642,475 L 642,467 L 740,467" stroke="#ff2d2d" stroke-width="3.5" fill="none"/>

          <!-- COMMUNICATION WIRING (Dashed Blue #0099ff) -->
          <path d="M 237,45 L 237,20 L 690,20" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>
          <path d="M 367,45 L 367,20" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>
          <path d="M 690,20 L 690,45" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>
          <path d="M 565,20 L 565,270" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>
          <path d="M 440,270 L 535,270" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>
          <path d="M 620,295 L 640,295 M 620,270 L 645,270 L 645,80 L 675,80" stroke="#0099ff" stroke-width="2.5" stroke-dasharray="5,3" fill="none"/>

        </svg>
      </div>
    </div>
  `;
}

/* ====================================================================
 * SEÇÃO 6: DEGRADATION_CHART — Curva de degradação com ApexCharts
 * ==================================================================== */

function renderDegradationChart(container, outputs, inputs) {
  if (!container || typeof ApexCharts === 'undefined') return;

  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';
  const colorHairline = rootStyles.getPropertyValue('--color-hairline').trim() || '#3d3a39';

  const curves = outputs.degradation_curves;
  const eolPercent = inputs['equipamento-eol'] || 70.0;
  const cyclesPerDay = inputs['projeto-ciclos-dia'] || 1;

  const toSeries = (arr) => arr.map((soh, yr) => [yr, Math.round(soh * 100) / 100]);

  const minSoH = Math.min(...curves['0.5P'], ...curves['0.25P'], ...curves['0.1C']);
  const minY = Math.max(0, Math.floor(Math.min(minSoH, eolPercent) / 10) * 10 - 5);

  const options = {
    chart: {
      type: 'area',
      height: 360,
      background: 'transparent',
      fontFamily: "'Inter', system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 500 }
    },
    theme: { mode: 'dark' },
    series: [
      { name: '0.1C (Extrapolado)', data: toSeries(curves['0.1C']) },
      { name: '0.25P (Datasheet)', data: toSeries(curves['0.25P']) },
      { name: '0.5P (Datasheet)', data: toSeries(curves['0.5P']) }
    ],
    colors: [colorPrimary, '#f59e0b', '#ef4444'],
    stroke: { curve: 'straight', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.18,
        opacityTo: 0.02,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: colorHairline,
      strokeDashArray: 3,
      padding: { top: 10 }
    },
    markers: { size: 3, hover: { size: 5 }, strokeWidth: 0 },
    xaxis: {
      type: 'numeric',
      min: 0,
      max: 15,
      tickAmount: 15,
      labels: {
        style: { colors: colorMute, fontSize: '11px' },
        formatter: (val) => `${Math.round(val)}`
      },
      axisBorder: { show: false },
      axisTicks: { color: colorHairline },
      title: { text: 'Anos de Operação', style: { color: colorMute, fontSize: '11px', fontWeight: 500 } }
    },
    yaxis: {
      min: minY,
      max: 100,
      tickAmount: Math.max(2, Math.round((100 - minY) / 5)),
      labels: {
        style: { colors: colorMute, fontSize: '11px' },
        formatter: (val) => `${formatNumber(val, 0)}%`
      },
      title: { text: 'Estado de Saúde (SoH %)', style: { color: colorMute, fontSize: '11px', fontWeight: 500 } }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      labels: { colors: colorMute },
      markers: { width: 10, height: 10, radius: 3 }
    },
    tooltip: {
      shared: true,
      theme: 'dark',
      x: {
        formatter: (val) => {
          const cycles = Math.round(val * 365 * cyclesPerDay);
          return `Ano ${Math.round(val)} • ${formatNumber(cycles, 0)} ciclos acumulados`;
        }
      },
      y: { formatter: (val) => `${formatNumber(val, 1)}% SoH` }
    },
    annotations: {
      yaxis: [
        {
          y: eolPercent,
          borderColor: '#8b5cf6',
          strokeDashArray: 5,
          label: {
            text: `Limite EOL: ${formatNumber(eolPercent, 1)}%`,
            position: 'right',
            offsetY: -6,
            borderColor: 'transparent',
            style: { background: 'transparent', color: '#a78bfa', fontSize: '11px', fontWeight: 600 }
          }
        }
      ]
    }
  };

  if (bessCharts.degradation) {
    bessCharts.degradation.destroy();
    bessCharts.degradation = null;
  }
  container.innerHTML = '';

  bessCharts.degradation = new ApexCharts(container, options);
  bessCharts.degradation.render();
}

/* ====================================================================
 * SEÇÃO 7: PDF_EXPORT — Geração do relatório PDF (jsPDF + html2canvas)
 * ==================================================================== */

// Captura um bloco HTML como PNG (dataURL) via html2canvas
async function captureElementPng(element, backgroundColor = null, scale = 2) {
  if (!element || typeof html2canvas === 'undefined') return null;
  const canvas = await html2canvas(element, { backgroundColor, scale, logging: false });
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

// Obtém o PNG de um gráfico via exportador nativo do ApexCharts
async function captureChartPng(chart) {
  if (!chart) return null;
  const { imgURI } = await chart.dataURI({ scale: 2 });
  const size = await getImageSize(imgURI);
  return { dataUrl: imgURI, width: size.width, height: size.height };
}

// Resolve as dimensões reais de uma imagem dataURL
function getImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Insere uma captura no PDF ajustada a uma caixa (mantendo proporção) sobre fundo escuro
function addCaptureToPdf(doc, capture, x, y, boxW, boxH) {
  if (!capture || !capture.width || !capture.height) return;
  const ratio = Math.min(boxW / capture.width, boxH / capture.height);
  const w = capture.width * ratio;
  const h = capture.height * ratio;
  doc.setFillColor(16, 16, 16);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
  doc.addImage(capture.dataUrl, 'PNG', x, y, w, h);
}

// Normalize accented characters and remove spaces/special characters
function sanitizeFilename(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function generatePDF() {
  const btn = document.getElementById('btn-pdf-report');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando PDF...';
  }
  
  try {
    // Explicit CDN guards (Issue 11)
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("SDK do jsPDF não foi carregado. Verifique sua conexão à internet.");
    }
    if (typeof html2canvas === 'undefined') {
      throw new Error("Biblioteca html2canvas não foi carregada. Verifique sua conexão à internet.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Capture from last calculated state to avoid recalculation divergence (Issue 1)
    const inputs = lastCalculationInputs || collectInputs();
    const outputs = lastCalculationOutputs || runCalculation(inputs);
    
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const userEmail = (currentSession && currentSession.user && currentSession.user.email) ? currentSession.user.email : ''; // Avoid hardcoded email fallback (Issue 3)
    const appName = inputs['geral-aplicacao'] || 'Sem Nome';
    
    // ==========================================
    // PÁGINA 1: CAPA
    // ==========================================
    
    // Top primary color accent bar
    doc.setFillColor(0, 217, 146);
    doc.rect(0, 0, 210, 15, 'F');
    
    // Title / branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 217, 146);
    doc.text("ALLAN WORKBENCH", 20, 40);
    
    doc.setDrawColor(61, 58, 57);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // Main report headings
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(16, 16, 16);
    doc.text("Relatório de Dimensionamento", 20, 75);
    doc.text("Sistema BESS", 20, 87);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Estudo de Viabilidade Técnica e Econômica (Load-Shifting)", 20, 98);
    
    // Project info block
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 120, 170, 75, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 16, 16);
    doc.text("DADOS DO PROJETO", 28, 132);
    
    doc.setFont("helvetica", "normal");
    doc.text("Cliente / Aplicação:", 28, 145);
    doc.text(appName, 70, 145);
    
    doc.text("Concessionária:", 28, 155);
    doc.text(inputs['geral-concessionaria'] || '—', 70, 155);
    
    doc.text("Regime de Contratação:", 28, 165);
    doc.text(inputs['geral-regime'] || '—', 70, 165);
    
    if (userEmail) {
      doc.text("Responsável Técnico:", 28, 175);
      doc.text(userEmail, 70, 175);
      doc.text("Data de Emissão:", 28, 185);
      doc.text(dateStr, 70, 185);
    } else {
      doc.text("Data de Emissão:", 28, 175);
      doc.text(dateStr, 70, 175);
    }
    
    // Cover page footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Calculadora BESS v1.0 — Allan Workbench. Todos os direitos reservados.", 20, 275);
    
    // ==========================================
    // PÁGINA 2: PREMISSAS E RACIONAL
    // ==========================================
    doc.addPage();
    
    // Page Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Simulação BESS — ${appName}`, 20, 12);
    doc.text(dateStr, 180, 12);
    doc.line(20, 14, 190, 14);
    
    // Section 1 header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 16, 16);
    doc.text("1. Premissas de Entrada", 20, 25);
    
    // Premises table formatting mapping UI columns 1, 2, 3
    const bodyRows = [
      [
        `Nome: ${inputs['geral-label'] || '—'}\nAplicação: ${appName}\nRegime: ${inputs['geral-regime'] || '—'}\nConcessionária: ${inputs['geral-concessionaria'] || '—'}\nGrupo: ${inputs['geral-grupo-tarifario'] || '—'}\nModalidade: ${inputs['geral-modalidade'] || '—'}`,
        `Consumo: ${formatNumber(inputs['projeto-consumo-kwh'])} kWh\nDemanda: ${formatNumber(inputs['projeto-demanda-kw'])} kW\nDias Úteis: ${inputs['projeto-dias-uteis'] || '—'}\nCiclos/Dia: ${inputs['projeto-ciclos-dia'] || '—'}\nHora Início HP: ${inputs['projeto-hora-inicio-hp'] || '—'}\nTarifa HP: R$ ${formatNumber(inputs['projeto-tarifa-hp'])}\nTarifa FP: R$ ${formatNumber(inputs['projeto-tarifa-fp'])}`,
        `RTE: ${formatNumber(inputs['equipamento-rte'])}%\nDoD: ${formatNumber(inputs['equipamento-dod'])}%\nEOL: ${formatNumber(inputs['equipamento-eol'])}%\nCiclos: ${inputs['equipamento-ciclos'] || '—'}\nEnergia BESS: ${formatNumber(inputs['equipamento-energia-kwh'])} kWh\nPotência BESS: ${formatNumber(inputs['equipamento-potencia-kw'])} kW\nModelo: ${inputs['equipamento-modelo'] || '—'}\nProteção: ${inputs['equipamento-protecao'] || '—'}\nPerdas: ${formatNumber(inputs['equipamento-perdas'])}%`
      ]
    ];
    
    doc.autoTable({
      head: [['Parâmetros Gerais', 'Parâmetros de Projeto', 'Parâmetros do Equipamento']],
      body: bodyRows,
      startY: 28,
      theme: 'grid',
      styles: {
        valign: 'top',
        fontSize: 9, // Increased from 8 to 9 for PDF legibility (Issue 10)
        cellPadding: 4,
        font: 'helvetica',
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: [0, 217, 146],
        textColor: [16, 16, 16],
        fontSize: 9.5,
        fontWeight: 'bold'
      }
    });
    
    // Rationale Header
    const rationaleY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 16, 16);
    doc.text("2. Racional de Dimensionamento", 20, rationaleY);
    
    const rationaleRows = [
      ["Energia por Ciclo (E_ciclo)", "Consumo / Dias Úteis / Ciclos por Dia", `${formatNumber(outputs.energy_per_cycle_kwh)} kWh`],
      ["Energia Nominal Necessária", "E_ciclo / (DoD * RTE * (1 - perdas))", `${formatNumber(outputs.nominal_energy_required_kwh)} kWh`],
      ["Quantidade de BESS (exata)", "E_nom / E_bess_unitária", `${formatNumber(outputs.bess_quantity_exact, 3)}`],
      ["Quantidade de BESS (instalada)", "Arredondamento inteligente (threshold = 0.2)", `${outputs.bess_quantity} BESS`],
      ["Rendimento Carga (η_carga)", "√RTE", `${formatNumber(outputs.eta_charge * 100, 2)}%`],
      ["Rendimento Descarga (η_descarga)", "√RTE", `${formatNumber(outputs.eta_discharge * 100, 2)}%`],
      ["Energia de Carga", "E_bess_total * DoD / η_carga", `${formatNumber(outputs.charge_energy_kwh)} kWh`],
      ["Energia de Descarga", "E_bess_total * DoD * η_descarga", `${formatNumber(outputs.discharge_energy_kwh)} kWh`],
      ["Energia Compensada (às cargas)", "E_descarga * η_sistema", `${formatNumber(outputs.compensated_energy_kwh)} kWh`],
      ["Energia Consumida (da rede)", "E_carga / η_sistema", `${formatNumber(outputs.consumed_energy_kwh)} kWh`],
      ["Custo da Carga (Fora da Ponta)", "E_consumida * Tarifa FP", `R$ ${formatNumber(outputs.cost_charge_offpeak_brl)}`],
      ["Custo Evitado (Na Ponta)", "E_compensada * Tarifa HP", `R$ ${formatNumber(outputs.cost_avoided_peak_brl)}`],
      ["Economia por Ciclo", "Custo Evitado - Custo Carga", `R$ ${formatNumber(outputs.savings_per_cycle_brl)}`]
    ];
    
    doc.autoTable({
      head: [['Métrica / Indicador', 'Fórmula de Referência', 'Valor Calculado']],
      body: rationaleRows,
      startY: rationaleY + 4,
      theme: 'striped',
      styles: {
        valign: 'middle',
        fontSize: 9, // Increased from 7.5 to 9 for PDF legibility (Issue 10)
        cellPadding: 3,
        font: 'helvetica',
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: [16, 16, 16],
        textColor: [240, 240, 240],
        fontSize: 9,
        fontWeight: 'bold'
      }
    });
    
    if (outputs.bess_quantity_rounded_down) {
      const alertY = doc.lastAutoTable.finalY + 5;
      doc.setFillColor(254, 243, 199);
      doc.rect(20, alertY, 170, 12, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text("⚠️ Alerta de Subdimensionamento:", 24, alertY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema subdimensionado. A capacidade instalada é inferior à necessária e a degradação", 24, alertY + 8);
    }
    
    // ==========================================
    // PÁGINA 3: GRÁFICOS
    // ==========================================
    doc.addPage();
    
    // Page Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Simulação BESS — ${appName}`, 20, 12);
    doc.text(dateStr, 180, 12);
    doc.line(20, 14, 190, 14);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 16, 16);
    doc.text("3. Gráficos Operacionais e Topologia", 20, 23);
    
    const diagramEl = document.querySelector("#diagram-container .flow-diagram");
    const unifilarEl = document.querySelector("#unifilar-container .archify-unifilar-card") || document.querySelector("#unifilar-container .unifilar");

    if (diagramEl && unifilarEl && bessCharts.loadCurve && bessCharts.degradation) {
      const [capDiag, capLoad, capUni, capDeg] = await Promise.all([
        captureElementPng(diagramEl, '#101010'),
        captureChartPng(bessCharts.loadCurve),
        captureElementPng(unifilarEl, '#101010'),
        captureChartPng(bessCharts.degradation)
      ]);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(16, 16, 16);

      // Top row of charts
      doc.text("Diagrama de Funcionamento", 20, 31);
      doc.text("Curva de Carga 24h", 115, 31);
      addCaptureToPdf(doc, capDiag, 20, 33, 85, 85);
      addCaptureToPdf(doc, capLoad, 115, 33, 85, 85);

      // Bottom row of charts
      doc.text("Diagrama Unifilar", 20, 125);
      doc.text("Curva de Degradação (SoH)", 115, 125);
      addCaptureToPdf(doc, capUni, 20, 128, 85, 130);
      addCaptureToPdf(doc, capDeg, 115, 128, 85, 130);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Gráficos operacionais indisponíveis para renderização.", 20, 35);
    }
    
    const filename = `relatorio-bess-${sanitizeFilename(appName)}.pdf`;
    doc.save(filename);
    showToast("✓ Relatório PDF gerado com sucesso!", 2000);
    
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    showToast(error.message || "Erro ao gerar PDF", 3000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'DOWNLOAD REPORT (PDF)';
    }
  }
}

/* ====================================================================
 * SEÇÃO 8: SUPABASE_PERSISTENCE — Auto-save e carregamento de simulações
 * ==================================================================== */

let loadedSimulations = [];
let currentSession = null;
let lastCalculationInputs = null;
let lastCalculationOutputs = null;

function getCurrentUserId() {
  return (currentSession && currentSession.user) ? currentSession.user.id : null;
}

// Trata o auto-save silenciosamente em background
async function saveSimulation(inputs, outputs) {
  const userId = getCurrentUserId();
  if (!userId) {
    console.log("Persistence: Usuário não logado. Auto-save pulado.");
    return;
  }
  
  const appName = inputs['geral-aplicacao'] || 'Sem Nome';
  const timestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const labelVal = document.getElementById('geral-label').value.trim();
  const simulationName = labelVal || `${appName} — ${timestamp}`;
  
  if (userId === 'mock-user-12345') {
    // Modo de teste local (LocalStorage) - Salva silenciosamente em background (Issue 5)
    try {
      let mockDb = [];
      try {
        mockDb = JSON.parse(localStorage.getItem('bes_simulations_mock') || '[]');
      } catch (e) {
        mockDb = [];
      }
      
      const newSim = {
        id: 'mock-sim-' + Date.now(),
        user_id: userId,
        name: simulationName,
        inputs: inputs,
        outputs: outputs,
        created_at: new Date().toISOString()
      };
      
      mockDb.unshift(newSim);
      if (mockDb.length > 10) mockDb.pop();
      
      localStorage.setItem('bes_simulations_mock', JSON.stringify(mockDb));
      loadedSimulations = mockDb;
      
      updateSimulationsDropdown(loadedSimulations, newSim.id);
      console.log("Mock Persistence: Simulação salva localmente silenciosamente.");
    } catch (e) {
      console.error("Erro ao salvar simulação no mock local:", e);
    }
    return;
  }
  
  // Produção real com Supabase
  if (!supabaseDb) {
    console.warn("Supabase não disponível. Auto-save pulado.");
    return;
  }
  
  try {
    const { data, error } = await supabaseDb
      .from('bes_simulations')
      .insert({
        user_id: userId,
        name: simulationName,
        inputs: inputs,
        outputs: outputs
      })
      .select();
      
    if (error) {
      console.error("Erro Supabase ao salvar simulação:", error);
      showToast("Erro ao salvar simulação", 3000);
    } else if (data && data[0]) {
      console.log("Simulação salva com sucesso no Supabase:", data[0]);
      loadedSimulations.unshift(data[0]);
      if (loadedSimulations.length > 10) loadedSimulations.pop();
      updateSimulationsDropdown(loadedSimulations, data[0].id);
    }
  } catch (err) {
    console.error("Erro de rede ao salvar simulação no Supabase:", err);
    showToast("Erro ao salvar simulação", 3000);
  }
}

// Carrega as últimas 10 simulações do banco ou mock local
async function fetchSimulations() {
  const userId = getCurrentUserId();
  if (!userId) return [];
  
  if (userId === 'mock-user-12345') {
    try {
      return JSON.parse(localStorage.getItem('bes_simulations_mock') || '[]');
    } catch (e) {
      console.error("Erro ao ler simulações do mock local:", e);
      return [];
    }
  }
  
  if (!supabaseDb) return [];
  
  try {
    const { data, error } = await supabaseDb
      .from('bes_simulations')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error("Erro ao buscar simulações no Supabase:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar simulações:", err);
    return [];
  }
}

// Popula o dropdown UI de simulações com os dados informados
function updateSimulationsDropdown(simulations, activeId = '') {
  const select = document.getElementById('simulations-select');
  if (!select) return;
  
  select.innerHTML = '<option value="">Carregar simulação...</option>';
  
  if (simulations.length === 0) {
    const option = document.createElement('option');
    option.value = "";
    option.disabled = true;
    option.textContent = "Nenhuma simulação encontrada";
    select.appendChild(option);
    // Removed redundant select.style.display (Issue 8)
    select.disabled = true;
    return;
  }
  
  simulations.forEach(sim => {
    const option = document.createElement('option');
    option.value = sim.id;
    option.textContent = sim.name || `Simulação - ${new Date(sim.created_at).toLocaleDateString()}`;
    if (sim.id === activeId) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.style.display = 'block';
  select.disabled = false;
}

// Popula os campos de entrada com os dados informados
function populateInputs(inputs) {
  if (!inputs) return;
  
  for (const fieldId in FIELDS) {
    const value = inputs[fieldId];
    const el = document.getElementById(fieldId);
    if (!el) continue;
    
    if (value !== undefined && value !== null) {
      const rule = FIELDS[fieldId];
      if (rule.type === 'number' || rule.type === 'percentage') {
        let displayVal = value;
        // Trata valores salvos como frações decimais (ex: 0.9) para escala percentual da UI (ex: 90) (Issue 4)
        if (rule.type === 'percentage' && value <= 1 && value > 0) {
          displayVal = value * 100;
        }
        el.value = displayVal.toString().replace('.', ',');
      } else {
        el.value = value;
      }
      
      el.dispatchEvent(new Event('input'));
    }
  }
}

/* ====================================================================
 * SEÇÃO 9: UI — Manipulação do DOM, eventos, toast, animações
 * ==================================================================== */

let isAppInitialized = false;

// Evento disparado pelo App Bridge real ou mockado
document.addEventListener('workbench-ready', (event) => {
  if (isAppInitialized) return;
  const session = event.detail.session;
  console.log("SSO Workbench ativo. Iniciando com sessão.");
  initApp(session);
});

// Fallback de carregamento caso a bridge não inicialize (modo standalone)
window.addEventListener('DOMContentLoaded', () => {
  setupAccordion();
  setupRealTimeValidation();
  setupFormSubmit();
  setupResultEvents();

  // Wire do dropdown de simulações
  const select = document.getElementById('simulations-select');
  if (select) {
    select.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (!selectedId) return;
      
      const found = loadedSimulations.find(sim => sim.id === selectedId);
      if (found) {
        populateInputs(found.inputs);
        
        // Dispara o cálculo submetendo o form
        const form = document.getElementById('bess-form');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }
    });
  }

  setTimeout(() => {
    if (!isAppInitialized) {
      console.log("App Bridge não respondeu em 500ms. Iniciando em modo standalone...");
      initApp(null);
    }
  }, 500);

  // Segurança de 1000ms contra falhas de carregamento permanentes
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay && overlay.style.opacity !== '0') {
      console.warn("Segurança: Forçando remoção do loading overlay devido a atraso.");
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    }
  }, 1000);
});

// Inicialização principal da aplicação
async function initApp(session) {
  isAppInitialized = true;
  currentSession = session;
  
  // Oculta o overlay de carregamento de forma suave
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }
  
  const welcomeEl = document.getElementById('user-welcome');
  const select = document.getElementById('simulations-select');
  
  if (session && session.user) {
    if (welcomeEl) {
      welcomeEl.textContent = `Bem-vindo, ${session.user.email}!`;
      welcomeEl.style.display = 'block';
    }
    
    if (select) {
      select.innerHTML = '<option value="">Carregando...</option>';
      select.style.display = 'block';
      select.disabled = true;
    }
    
    try {
      loadedSimulations = await fetchSimulations();
      updateSimulationsDropdown(loadedSimulations);
    } catch (e) {
      console.error("Erro ao inicializar simulações:", e);
      if (select) {
        select.innerHTML = '<option value="">Carregar simulação...</option>';
        select.disabled = true;
      }
    }
  } else {
    if (welcomeEl) {
      welcomeEl.textContent = `Modo Offline (Sem sincronização)`;
      welcomeEl.style.display = 'block';
    }
    if (select) {
      select.innerHTML = '<option value="">Modo Offline (Sem sincronização)</option>';
      select.style.display = 'block';
      select.disabled = true;
    }
  }
}

// Configuração do comportamento do Accordion para telas mobile (com acessibilidade ARIA e teclado)
function setupAccordion() {
  const headers = document.querySelectorAll('.calc-group-header');
  
  // Collapse do grupo de Projeto e Equipamento por padrão em telas pequenas
  if (window.innerWidth < 768) {
    const proj = document.getElementById('group-projeto');
    const equip = document.getElementById('group-equipamento');
    if (proj) proj.classList.add('collapsed');
    if (equip) equip.classList.add('collapsed');
  }

  headers.forEach(header => {
    // Inicializa o estado de aria-expanded do header com base nas classes
    const group = header.closest('.calc-group');
    if (group) {
      const isCollapsed = group.classList.contains('collapsed');
      header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    }

    const toggleAccordion = () => {
      if (window.innerWidth < 768) {
        const currentGroup = header.closest('.calc-group');
        const allGroups = document.querySelectorAll('.calc-group');
        
        allGroups.forEach(group => {
          const groupHeader = group.querySelector('.calc-group-header');
          if (group === currentGroup) {
            const collapsedNow = group.classList.toggle('collapsed');
            if (groupHeader) {
              groupHeader.setAttribute('aria-expanded', collapsedNow ? 'false' : 'true');
            }
          } else {
            group.classList.add('collapsed');
            if (groupHeader) {
              groupHeader.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }
    };

    header.addEventListener('click', toggleAccordion);
    
    // Suporte a acessibilidade de teclado (Space/Enter)
    header.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleAccordion();
      }
    });
  });

  // Garante que o accordion seja removido ao expandir a tela para desktop/tablet
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      const groups = document.querySelectorAll('.calc-group');
      groups.forEach(group => {
        group.classList.remove('collapsed');
        const groupHeader = group.querySelector('.calc-group-header');
        if (groupHeader) {
          groupHeader.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });
}

// Associa eventos de blur e input em tempo real nos campos para feedback dinâmico
function setupRealTimeValidation() {
  for (const fieldId in FIELDS) {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener('blur', () => {
        validateField(fieldId);
      });
      
      el.addEventListener('input', () => {
        if (el.classList.contains('input-error')) {
          const raw = el.value.trim();
          if (raw) {
            // Se corrigido, remove o erro imediatamente
            validateField(fieldId);
          }
        }
      });
    }
  }
}

// Exibe uma notificação elegante no rodapé da página
function showToast(message, duration = 3000) {
  const oldToast = document.getElementById('app-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background-color: var(--color-primary-deep, #10b981);
    color: var(--color-on-primary, #101010);
    padding: var(--spacing-sm, 8px) var(--spacing-lg, 16px);
    border-radius: var(--rounded-md, 8px);
    font-weight: 600;
    font-size: 13px;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s;
    opacity: 0;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animação de entrada
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });
  
  // Esconde após a duração especificada
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Configura o tratamento do envio do formulário
function setupFormSubmit() {
  const form = document.getElementById('bess-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const l2 = document.getElementById('linha-2');
      const l3 = document.getElementById('linha-3-col1');
      const l3_c2 = document.getElementById('linha-3-col2');
      const l4_c1 = document.getElementById('linha-4-col1');
      const l4_c2 = document.getElementById('linha-4-col2');
      
      if (l2) l2.style.opacity = '1';
      if (l3) l3.style.opacity = '1';
      if (l3_c2) l3_c2.style.opacity = '1';
      if (l4_c1) l4_c1.style.opacity = '1';
      if (l4_c2) l4_c2.style.opacity = '1';
      
      const isValid = validateInputs();
      
      if (isValid) {
        console.log("Validação efetuada com sucesso!");
        
        const btn = document.getElementById('btn-calcular');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Calculando...';
        }
        
        const inputs = collectInputs();
        
        try {
          const outputs = runCalculation(inputs);
          
          if (hasInvalidValues(outputs)) {
            console.warn("Aviso: Os outputs contêm valores inválidos (NaN/Infinity). Evitando renderização.", outputs);
            showToast("Erro: Valores inválidos nos cálculos. Verifique os dados de entrada.");
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'CALCULAR';
            }
            return;
          }
          
          // Render results
          renderRationale(outputs);

          // Guardar dados para o PDF (Issue 1)
          lastCalculationInputs = inputs;
          lastCalculationOutputs = outputs;

          // Reveal result containers ANTES da renderização — o ApexCharts precisa
          // do container visível para medir a largura corretamente (PRD §3.3)
          const sectionsToReveal = [l2, l3, l3_c2, l4_c1, l4_c2];
          sectionsToReveal.forEach(sec => {
            if (sec) {
              sec.classList.remove('slide-down');
              void sec.offsetWidth; // Force layout reflow
              sec.style.display = 'block';
              sec.style.opacity = '1';
              sec.classList.add('slide-down');
            }
          });

          renderFlowDiagram(document.getElementById('diagram-container'), outputs, inputs['equipamento-protecao']);
          renderLoadCurve(document.getElementById('load-curve-container'), outputs, inputs);
          renderUnifilar(document.getElementById('unifilar-container'), outputs, inputs);
          renderDegradationChart(document.getElementById('degradation-container'), outputs, inputs);
          
          // Exibe o botão de relatório PDF
          const pdfBtn = document.getElementById('btn-pdf-report');
          if (pdfBtn) {
            pdfBtn.style.display = 'block';
            pdfBtn.style.opacity = '1';
          }
          
          showToast("✓ Simulação concluída com sucesso!");
          
          if (btn) {
            btn.disabled = false;
            btn.classList.add('validated');
            btn.textContent = '✓ PRONTO!';
            
            setTimeout(() => {
              btn.classList.remove('validated');
              btn.textContent = 'CALCULAR';
            }, 2000);
          }
          
          // Dispara o auto-save de forma assíncrona (fire-and-forget)
          saveSimulation(inputs, outputs);
          
        } catch (calcError) {
          console.error("Erro durante o processamento do cálculo:", calcError);
          showToast("Erro ao processar simulação. Verifique as premissas.");
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'CALCULAR';
          }
        }
        
      } else {
        console.log("Validação falhou.");
      }
    });
  }
}

// Check recursively for NaN or Infinity values (Task 5.5)
function hasInvalidValues(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'number') {
      if (isNaN(obj[key]) || !isFinite(obj[key])) {
        return true;
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasInvalidValues(obj[key])) return true;
    }
  }
  return false;
}

// Popula a Linha 2 com os cards de racional (badge de fórmula + destaque numérico)
function renderRationale(outputs) {
  const dodDecimal = outputs.dod_percent / 100;
  const rteDecimal = outputs.rte_percent / 100;
  const etaSys = outputs.eta_system;

  document.getElementById('sub-nom').textContent = `E_nom = ${formatNumber(outputs.energy_per_cycle_kwh)} / (${formatNumber(dodDecimal)} * ${formatNumber(rteDecimal)} * ${formatNumber(etaSys)})`;
  document.getElementById('result-nom').textContent = `${formatNumber(outputs.nominal_energy_required_kwh)} kWh`;

  const bessModel = document.getElementById('equipamento-modelo').value || "BESS";
  document.getElementById('bess-qty').textContent = `${outputs.bess_quantity}x ${bessModel}`;

  // Banner de alerta de subdimensionamento (arredondamento para baixo)
  const warningLabel = document.getElementById('warning-subdimensionado');
  if (outputs.bess_quantity_rounded_down) {
    warningLabel.style.display = 'flex';
  } else {
    warningLabel.style.display = 'none';
  }
  
  // Energia por Ciclo Block (Task 2.5, 3.1)
  document.getElementById('val-carga').textContent = `${formatNumber(outputs.charge_energy_kwh)} kWh`;
  document.getElementById('sub-val-carga').textContent = `Rendimento Carga (η_carga): ${formatNumber(outputs.eta_charge * 100, 2)}%`;
  
  document.getElementById('val-descarga').textContent = `${formatNumber(outputs.discharge_energy_kwh)} kWh`;
  document.getElementById('sub-val-descarga').textContent = `Rendimento Descarga (η_descarga): ${formatNumber(outputs.eta_discharge * 100, 2)}%`;
  
  document.getElementById('val-compensada').textContent = `${formatNumber(outputs.compensated_energy_kwh)} kWh`;
  document.getElementById('sub-val-compensada').textContent = `Rendimento Sistema (η_sistema): ${formatNumber(outputs.eta_system * 100, 1)}%`;
  
  document.getElementById('val-consumida').textContent = `${formatNumber(outputs.consumed_energy_kwh)} kWh`;
  document.getElementById('sub-val-consumida').textContent = `Energia total consumida da rede (com perdas)`;
  
  // Resumo Econômico Block (Task 2.6, 3.1)
  document.getElementById('val-custo-fp').textContent = `R$ ${formatNumber(outputs.cost_charge_offpeak_brl)}`;
  document.getElementById('val-custo-hp').textContent = `R$ ${formatNumber(outputs.cost_avoided_peak_brl)}`;
  document.getElementById('val-economia').textContent = `R$ ${formatNumber(outputs.savings_per_cycle_brl)}`;
}

// Mapeia cada seção de resultado para sua estratégia de exportação:
// blocos HTML → html2canvas (PNG transparente) | gráficos → exportador nativo do ApexCharts
function getExportCapture(sectionId) {
  if (sectionId === 'linha-2') {
    return captureElementPng(document.getElementById('rationale-capture'), null);
  }
  if (sectionId === 'linha-3-col1') {
    const el = document.querySelector('#diagram-container .archify-flow-card') || document.querySelector('#diagram-container .flow-diagram');
    return captureElementPng(el, null);
  }
  if (sectionId === 'linha-3-col2') {
    return captureChartPng(bessCharts.loadCurve);
  }
  if (sectionId === 'linha-4-col1') {
    const el = document.querySelector('#unifilar-container .archify-unifilar-card') || document.querySelector('#unifilar-container .unifilar');
    return captureElementPng(el, null);
  }
  if (sectionId === 'linha-4-col2') {
    return captureChartPng(bessCharts.degradation);
  }
  return Promise.resolve(null);
}

// Exporta o diagrama de funcionamento como arquivo JPEG com fundo sólido
function downloadFlowJpeg() {
  const el = document.querySelector('#diagram-container .archify-flow-card') || document.querySelector('#diagram-container');
  if (!el || typeof html2canvas === 'undefined') {
    showToast("Calcule uma simulação antes de baixar");
    return;
  }
  html2canvas(el, { backgroundColor: '#ffffff', scale: 2, logging: false }).then(canvas => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'bess-diagrama-funcionamento.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("JPEG baixado com sucesso!");
  }).catch(err => {
    console.error("Erro ao exportar JPEG do fluxo:", err);
    showToast("Não foi possível baixar o JPEG");
  });
}

// Exporta o diagrama de funcionamento diretamente em vetor SVG puro
function downloadFlowSvg() {
  const svgEl = document.querySelector('#diagram-container svg');
  if (!svgEl) {
    showToast("Calcule uma simulação antes de baixar");
    return;
  }
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bess-diagrama-funcionamento.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("SVG baixado com sucesso!");
}

// Exporta o diagrama unifilar como arquivo JPEG com fundo sólido
function downloadUnifilarJpeg() {
  const el = document.querySelector('#unifilar-container .archify-unifilar-card') || document.querySelector('#unifilar-container');
  if (!el || typeof html2canvas === 'undefined') {
    showToast("Calcule uma simulação antes de baixar");
    return;
  }
  html2canvas(el, { backgroundColor: '#ffffff', scale: 2, logging: false }).then(canvas => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'bess-diagrama-unifilar.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("JPEG baixado com sucesso!");
  }).catch(err => {
    console.error("Erro ao exportar JPEG:", err);
    showToast("Não foi possível baixar o JPEG");
  });
}

// Exporta o diagrama unifilar diretamente em vetor SVG puro
function downloadUnifilarSvg() {
  const svgEl = document.querySelector('#unifilar-container svg');
  if (!svgEl) {
    showToast("Calcule uma simulação antes de baixar");
    return;
  }
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bess-diagrama-unifilar.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("SVG baixado com sucesso!");
}

// Copia a seção como PNG para a área de transferência
async function copySectionPng(sectionId) {
  try {
    const capture = await getExportCapture(sectionId);
    if (!capture || !capture.dataUrl) {
      showToast("Calcule uma simulação antes de copiar");
      return;
    }

    const blob = await (await fetch(capture.dataUrl)).blob();
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    showToast("Copiado!", 2000);
  } catch (err) {
    console.error("Erro ao copiar seção como PNG:", err);
    showToast("Não foi possível copiar");
  }
}

// Baixa a seção como arquivo PNG
async function downloadSectionPng(sectionId, filename) {
  try {
    const capture = await getExportCapture(sectionId);
    if (!capture || !capture.dataUrl) {
      showToast("Calcule uma simulação antes de baixar");
      return;
    }

    const a = document.createElement('a');
    a.href = capture.dataUrl;
    a.download = filename || "bess-export.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Erro ao baixar seção como PNG:", err);
    showToast("Não foi possível baixar o arquivo");
  }
}

function setupExportButtons(sectionId, copyBtnId, downloadBtnId, filename) {
  const copyBtn = document.getElementById(copyBtnId);
  const downloadBtn = document.getElementById(downloadBtnId);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => copySectionPng(sectionId));
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => downloadSectionPng(sectionId, filename));
  }
}

function setupResultEvents() {
  setupExportButtons('linha-2', 'btn-copy-linha-2', 'btn-download-linha-2', 'bess-racional-dimensionamento.png');
  setupExportButtons('linha-3-col1', 'btn-copy-linha-3', 'btn-download-linha-3', 'bess-diagrama-funcionamento.png');
  setupExportButtons('linha-3-col2', 'btn-copy-linha-3-col2', 'btn-download-linha-3-col2', 'bess-curva-carga-24h.png');
  setupExportButtons('linha-4-col1', 'btn-copy-linha-4-col1', 'btn-download-linha-4-col1', 'bess-diagrama-unifilar.png');
  setupExportButtons('linha-4-col2', 'btn-copy-linha-4-col2', 'btn-download-linha-4-col2', 'bess-curva-degradacao.png');
  
  // Handlers adicionais da toolbar dedicada do Diagrama de Funcionamento Archify
  const btnCopyFlow = document.getElementById('btn-copy-flow');
  const btnPngFlow = document.getElementById('btn-download-flow-png');
  const btnJpgFlow = document.getElementById('btn-download-flow-jpg');
  const btnSvgFlow = document.getElementById('btn-download-flow-svg');

  if (btnCopyFlow) btnCopyFlow.addEventListener('click', () => copySectionPng('linha-3-col1'));
  if (btnPngFlow) btnPngFlow.addEventListener('click', () => downloadSectionPng('linha-3-col1', 'bess-diagrama-funcionamento.png'));
  if (btnJpgFlow) btnJpgFlow.addEventListener('click', downloadFlowJpeg);
  if (btnSvgFlow) btnSvgFlow.addEventListener('click', downloadFlowSvg);

  // Handlers adicionais da toolbar dedicada do Diagrama Unifilar Archify
  const btnCopyUnifilar = document.getElementById('btn-copy-unifilar');
  const btnPngUnifilar = document.getElementById('btn-download-unifilar-png');
  const btnJpgUnifilar = document.getElementById('btn-download-unifilar-jpg');
  const btnSvgUnifilar = document.getElementById('btn-download-unifilar-svg');

  if (btnCopyUnifilar) btnCopyUnifilar.addEventListener('click', () => copySectionPng('linha-4-col1'));
  if (btnPngUnifilar) btnPngUnifilar.addEventListener('click', () => downloadSectionPng('linha-4-col1', 'bess-diagrama-unifilar.png'));
  if (btnJpgUnifilar) btnJpgUnifilar.addEventListener('click', downloadUnifilarJpeg);
  if (btnSvgUnifilar) btnSvgUnifilar.addEventListener('click', downloadUnifilarSvg);
  
  const pdfBtn = document.getElementById('btn-pdf-report');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', generatePDF);
  }
  
  const formInputs = document.querySelectorAll('#bess-form input, #bess-form select');
  const sectionsToDim = ['linha-2', 'linha-3-col1', 'linha-3-col2', 'linha-4-col1', 'linha-4-col2'];
  formInputs.forEach(el => {
    el.addEventListener('input', () => {
      sectionsToDim.forEach(id => {
        const sec = document.getElementById(id);
        if (sec && sec.style.display !== 'none') {
          sec.style.opacity = '0.5';
        }
      });
      if (pdfBtn && pdfBtn.style.display !== 'none') {
        pdfBtn.style.opacity = '0.5';
      }
    });
  });
}

