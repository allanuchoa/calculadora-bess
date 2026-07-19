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
 * SEÇÃO 3: SVG_CHARTS — Geração do diagrama de funcionamento BESS
 * ==================================================================== */

// Função auxiliar global para formatar números no padrão brasileiro (pt-BR)
function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null || isNaN(val) || !Number.isFinite(val)) return '0,00';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function generateFlowDiagram(outputs, protectionType) {
  // Resolve theme colors dynamically using document styles to ensure exact dark-theme coherence
  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';
  const colorInkStrong = rootStyles.getPropertyValue('--color-ink-strong').trim() || '#ffffff';
  
  const protectionLabel = (protectionType === 'ATS') ? 'Chave ATS' : 'Barramento QGBT';
  
  const E_consumida = formatNumber(outputs.consumed_energy_kwh);
  const E_carga = formatNumber(outputs.charge_energy_kwh);
  const E_descarga = formatNumber(outputs.discharge_energy_kwh);
  const E_compensada = formatNumber(outputs.compensated_energy_kwh);
  
  const eta_charge = formatNumber(outputs.eta_charge * 100, 2);
  const eta_discharge = formatNumber(outputs.eta_discharge * 100, 2);
  const eta_system = formatNumber(outputs.eta_system * 100, 1);
  const lossPercent = formatNumber((1 - outputs.eta_system) * 100, 1);
  
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" style="background: transparent; font-family: 'Inter', system-ui, sans-serif;">
  <defs>
    <!-- Arrow heads -->
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${colorPrimary}" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
    </marker>
  </defs>

  <!-- Rede Concessionaria Block -->
  <rect x="300" y="30" width="200" height="70" rx="8" fill="#1a1a1a" stroke="${colorPrimary}" stroke-width="2" />
  <text x="400" y="65" text-anchor="middle" fill="${colorInkStrong}" font-size="14" font-weight="bold">Rede Concessionária</text>
  <text x="400" y="85" text-anchor="middle" fill="${colorMute}" font-size="11">AC 3Φ</text>

  <!-- Central Switch/Busbar Block (ATS / QGBT) -->
  <rect x="300" y="210" width="200" height="80" rx="8" fill="#1a1a1a" stroke="${colorMute}" stroke-width="2" />
  <text x="400" y="245" text-anchor="middle" fill="${colorInkStrong}" font-size="14" font-weight="bold">${protectionLabel}</text>
  <text x="400" y="265" text-anchor="middle" fill="${colorMute}" font-size="11">Ponto de Conexão Comum</text>

  <!-- Cargas C&I Block -->
  <rect x="40" y="215" width="180" height="70" rx="8" fill="#1a1a1a" stroke="${colorMute}" stroke-width="2" />
  <text x="130" y="250" text-anchor="middle" fill="${colorInkStrong}" font-size="14" font-weight="bold">Cargas C&I</text>
  <text x="130" y="270" text-anchor="middle" fill="${colorMute}" font-size="11">Consumo Industrial</text>

  <!-- BESS Block -->
  <rect x="580" y="215" width="180" height="70" rx="8" fill="#1a1a1a" stroke="#3b82f6" stroke-width="2" />
  <text x="670" y="250" text-anchor="middle" fill="${colorInkStrong}" font-size="14" font-weight="bold">BESS (Baterias LFP)</text>
  <text x="670" y="270" text-anchor="middle" fill="${colorMute}" font-size="11">Capacidade: ${formatNumber(outputs.total_bess_energy_kwh, 0)} kWh</text>

  <!-- FLOW PATHS & LABELS -->
  
  <!-- 1. Rede -> ATS/QGBT (Carga - FP) -->
  <path d="M 400 100 L 400 200" fill="none" stroke="${colorPrimary}" stroke-width="3" marker-end="url(#arrow-green)" />
  <text x="415" y="140" fill="${colorPrimary}" font-size="12" font-weight="bold">Carga (Fora de Ponta)</text>
  <text x="415" y="160" fill="${colorInkStrong}" font-size="11">E<sub>consumida</sub> = ${E_consumida} kWh</text>
  <text x="415" y="175" fill="${colorMute}" font-size="10">Inclui perdas de conexão (${lossPercent}%)</text>

  <!-- 2. ATS/QGBT -> BESS (Carga - FP) - Top horizontal path -->
  <path d="M 500 235 L 570 235" fill="none" stroke="#3b82f6" stroke-width="3" marker-end="url(#arrow-blue)" />
  <text x="535" y="195" text-anchor="middle" fill="#3b82f6" font-size="12" font-weight="bold">Carga BESS</text>
  <text x="535" y="210" text-anchor="middle" fill="${colorInkStrong}" font-size="11">E<sub>carga</sub> = ${E_carga} kWh</text>
  <text x="535" y="222" text-anchor="middle" fill="${colorMute}" font-size="10">η<sub>carga</sub> = ${eta_charge}%</text>

  <!-- 3. BESS -> ATS/QGBT (Descarga - HP) - Bottom horizontal path -->
  <path d="M 580 265 L 510 265" fill="none" stroke="#f59e0b" stroke-width="3" marker-end="url(#arrow-amber)" />
  <text x="535" y="285" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="bold">Descarga</text>
  <text x="535" y="300" text-anchor="middle" fill="${colorInkStrong}" font-size="11">E<sub>descarga</sub> = ${E_descarga} kWh</text>
  <text x="535" y="312" text-anchor="middle" fill="${colorMute}" font-size="10">η<sub>descarga</sub> = ${eta_discharge}%</text>

  <!-- 4. ATS/QGBT -> Cargas C&I (Descarga - HP) -->
  <path d="M 300 250 L 230 250" fill="none" stroke="#f59e0b" stroke-width="3" marker-end="url(#arrow-amber)" />
  <text x="265" y="215" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="bold">Alimentação</text>
  <text x="265" y="230" text-anchor="middle" fill="${colorInkStrong}" font-size="11">E<sub>compensada</sub> = ${E_compensada} kWh</text>
  <text x="265" y="242" text-anchor="middle" fill="${colorMute}" font-size="10">Rendimento: ${eta_system}%</text>

  <!-- System info label in background -->
  <text x="400" y="450" text-anchor="middle" fill="${colorMute}" font-size="11" font-style="italic">Diagrama de Fluxo de Energia por Ciclo (Load-Shifting)</text>
</svg>
  `;
  return svg.trim();
}

/* ====================================================================
 * SEÇÃO 4: SVG_LOAD_CURVE — Geração do gráfico de curva de carga 24h
 * ==================================================================== */

function generateLoadCurve(outputs, inputs) {
  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';
  const colorInkStrong = rootStyles.getPropertyValue('--color-ink-strong').trim() || '#ffffff';
  
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

  // 1. Coletar horas fora do HP e ordená-las por demanda (carga base) crescente
  const nonHPHours = [];
  for (let h = 0; h < 24; h++) {
    if (!isHP(h)) {
      nonHPHours.push({ hour: h, demand: baseLoad[h] });
    }
  }
  nonHPHours.sort((a, b) => a.demand - b.demand);

  // 2. Determinar N (duração da carga): ~5-6h ou mais se a potência do BESS for limitante
  const minHoursRequired = Math.ceil(outputs.consumed_energy_kwh / outputs.total_bess_power_kw);
  const N = Math.min(Math.max(6, minHoursRequired), nonHPHours.length);

  // 3. Selecionar as primeiras N horas com menor demanda
  const chargeHoursSet = new Set();
  for (let i = 0; i < N; i++) {
    chargeHoursSet.add(nonHPHours[i].hour);
  }

  const P_carga = outputs.consumed_energy_kwh / N;
  const P_descarga = outputs.discharge_energy_kwh / 3;

  const loadRede = [];
  for (let h = 0; h < 24; h++) {
    let p = baseLoad[h];
    if (isHP(h)) {
      p -= P_descarga;
    } else if (chargeHoursSet.has(h)) {
      p += P_carga;
    }
    loadRede.push(p);
  }

  const maxP = Math.max(...baseLoad, ...loadRede);
  const maxY = Math.max(10, Math.ceil(maxP * 1.15 / 50) * 50);

  const w = 800;
  const h_svg = 450;
  const padL = 70;
  const padR = 40;
  const padT = 50;
  const padB = 60;
  const chartW = w - padL - padR;
  const chartH = h_svg - padT - padB;

  function getX(hour) {
    return padL + (hour / 24) * chartW;
  }
  function getY(power) {
    if (Number.isNaN(power) || !Number.isFinite(power)) return padT + chartH;
    return padT + chartH - (power / maxY) * chartH;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h_svg}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.background = 'transparent';
  svg.style.fontFamily = "'Inter', system-ui, sans-serif";

  // HP Highlight Rect
  const hpGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  if (endHP > startHP) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', getX(startHP));
    rect.setAttribute('y', padT);
    rect.setAttribute('width', getX(startHP + 3) - getX(startHP));
    rect.setAttribute('height', chartH);
    rect.setAttribute('class', 'load-curve__hp-zone');
    hpGroup.appendChild(rect);
  } else {
    const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect1.setAttribute('x', getX(startHP));
    rect1.setAttribute('y', padT);
    rect1.setAttribute('width', getX(24) - getX(startHP));
    rect1.setAttribute('height', chartH);
    rect1.setAttribute('class', 'load-curve__hp-zone');
    hpGroup.appendChild(rect1);

    const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect2.setAttribute('x', getX(0));
    rect2.setAttribute('y', padT);
    rect2.setAttribute('width', getX(endHP) - getX(0));
    rect2.setAttribute('height', chartH);
    rect2.setAttribute('class', 'load-curve__hp-zone');
    hpGroup.appendChild(rect2);
  }
  svg.appendChild(hpGroup);

  // Gridlines & Ticks Y
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const tickCountY = 5;
  for (let i = 0; i <= tickCountY; i++) {
    const val = (maxY / tickCountY) * i;
    const y = getY(val);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padL);
    line.setAttribute('y1', y);
    line.setAttribute('x2', w - padR);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'load-curve__grid');
    gridGroup.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', padL - 10);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'load-curve__label');
    text.textContent = formatNumber(val, 0) + ' kW';
    gridGroup.appendChild(text);
  }

  // Ticks X (De 2 em 2 horas)
  for (let h = 0; h <= 24; h += 2) {
    const x = getX(h);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', padT);
    line.setAttribute('x2', x);
    line.setAttribute('y2', padT + chartH);
    line.setAttribute('class', 'load-curve__grid');
    gridGroup.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', padT + chartH + 18);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'load-curve__label');
    text.textContent = `${h}h`;
    gridGroup.appendChild(text);
  }

  // Centered X-axis label "Hora (h)" (Recommendation 2)
  const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  xAxisLabel.setAttribute('x', padL + chartW / 2);
  xAxisLabel.setAttribute('y', padT + chartH + 34);
  xAxisLabel.setAttribute('text-anchor', 'middle');
  xAxisLabel.setAttribute('class', 'load-curve__label');
  xAxisLabel.setAttribute('font-weight', 'bold');
  xAxisLabel.textContent = 'Hora (h)';
  gridGroup.appendChild(xAxisLabel);

  svg.appendChild(gridGroup);

  // Area: BESS Charge (Blue) hour-by-hour polygon path
  chargeHoursSet.forEach(h => {
    const chargeArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const topStart = loadRede[h];
    const topEnd = chargeHoursSet.has((h + 1) % 24) ? loadRede[(h + 1) % 24] : baseLoad[(h + 1) % 24];
    const d = `M ${getX(h)} ${getY(baseLoad[h])} ` +
              `L ${getX(h)} ${getY(topStart)} ` +
              `L ${getX(h + 1)} ${getY(topEnd)} ` +
              `L ${getX(h + 1)} ${getY(baseLoad[(h + 1) % 24])} Z`;
    chargeArea.setAttribute('d', d);
    chargeArea.setAttribute('fill', '#3b82f6');
    chargeArea.setAttribute('fill-opacity', '0.25');
    svg.appendChild(chargeArea);
  });

  // Area: BESS Discharge (Amber)
  const dischargeArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let dischargeD = `M ${getX(startHP)} ${getY(baseLoad[startHP])}`;
  for (let h = startHP; h <= startHP + 3; h++) {
    const hr = h % 24;
    const val = h === startHP + 3 ? baseLoad[hr] : (baseLoad[hr] - P_descarga);
    dischargeD += ` L ${getX(h)} ${getY(val)}`;
  }
  for (let h = startHP + 3; h >= startHP; h--) {
    const hr = h % 24;
    dischargeD += ` L ${getX(h)} ${getY(baseLoad[hr])}`;
  }
  dischargeD += ' Z';
  dischargeArea.setAttribute('d', dischargeD);
  dischargeArea.setAttribute('fill', '#f59e0b');
  dischargeArea.setAttribute('fill-opacity', '0.3');
  svg.appendChild(dischargeArea);

  // Curve: Base Load - Primary Green Line (Recommendation 8)
  const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let baseD = `M ${getX(0)} ${getY(baseLoad[0])}`;
  for (let h = 1; h <= 24; h++) {
    baseD += ` L ${getX(h)} ${getY(baseLoad[h % 24])}`;
  }
  baseLine.setAttribute('d', baseD);
  baseLine.setAttribute('fill', 'none');
  baseLine.setAttribute('stroke', colorPrimary);
  baseLine.setAttribute('stroke-width', '2.5');
  baseLine.setAttribute('class', 'load-curve__curve');
  svg.appendChild(baseLine);

  // Curve: Grid Load (Rede + BESS) (Recommendation 8)
  const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let gridD = `M ${getX(0)} ${getY(loadRede[0])}`;
  for (let h = 1; h <= 24; h++) {
    gridD += ` L ${getX(h)} ${getY(loadRede[h % 24])}`;
  }
  gridLine.setAttribute('d', gridD);
  gridLine.setAttribute('fill', 'none');
  gridLine.setAttribute('stroke', '#a78bfa');
  gridLine.setAttribute('stroke-dasharray', '4 3');
  gridLine.setAttribute('stroke-width', '2.0');
  gridLine.setAttribute('class', 'load-curve__curve');
  svg.appendChild(gridLine);

  // Cost Annotations
  // Encontrar uma das horas de carga representativas para a anotação
  const chargeAnnHour = [...chargeHoursSet].sort((a,b) => a-b)[Math.floor(N/2)] || 3;
  const chargeAnn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  chargeAnn.setAttribute('x', getX(chargeAnnHour));
  chargeAnn.setAttribute('y', getY(baseLoad[chargeAnnHour] + P_carga) - 12);
  chargeAnn.setAttribute('text-anchor', 'middle');
  chargeAnn.setAttribute('fill', '#60a5fa');
  chargeAnn.setAttribute('font-size', '10');
  chargeAnn.setAttribute('font-weight', 'bold');
  chargeAnn.textContent = `Carga FP: R$ ${formatNumber(outputs.cost_charge_offpeak_brl, 2)}`;
  svg.appendChild(chargeAnn);

  const dischargeAnn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  const midHP = startHP + 1.5;
  dischargeAnn.setAttribute('x', getX(midHP));
  dischargeAnn.setAttribute('y', getY(baseLoad[Math.floor(midHP) % 24] - P_descarga) + 20);
  dischargeAnn.setAttribute('text-anchor', 'middle');
  dischargeAnn.setAttribute('fill', '#fbbf24');
  dischargeAnn.setAttribute('font-size', '10');
  dischargeAnn.setAttribute('font-weight', 'bold');
  dischargeAnn.textContent = `Evitado HP: R$ ${formatNumber(outputs.cost_avoided_peak_brl, 2)}`;
  svg.appendChild(dischargeAnn);

  const hpLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  hpLabel.setAttribute('x', getX(midHP));
  hpLabel.setAttribute('y', padT - 10);
  hpLabel.setAttribute('text-anchor', 'middle');
  hpLabel.setAttribute('fill', '#fca5a5');
  hpLabel.setAttribute('font-size', '10');
  hpLabel.setAttribute('font-weight', '600');
  hpLabel.textContent = 'Horário de Ponta';
  svg.appendChild(hpLabel);

  const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  yAxisLabel.setAttribute('transform', 'rotate(-90)');
  yAxisLabel.setAttribute('x', -(padT + chartH / 2));
  yAxisLabel.setAttribute('y', padL - 48);
  yAxisLabel.setAttribute('text-anchor', 'middle');
  yAxisLabel.setAttribute('fill', colorMute);
  yAxisLabel.setAttribute('font-size', '10');
  yAxisLabel.textContent = 'Potência (kW)';
  svg.appendChild(yAxisLabel);

  // Legend Group inside the SVG (Problem 3)
  const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  legendGroup.setAttribute('transform', 'translate(0, 430)');

  const legendItems = [
    { label: 'Rede Base', color: colorPrimary, type: 'line' },
    { label: 'Rede com BESS', color: '#a78bfa', type: 'dashed-line' },
    { label: 'Carga BESS (FP)', color: '#3b82f6', type: 'rect', opacity: 0.25 },
    { label: 'Descarga BESS (HP)', color: '#f59e0b', type: 'rect', opacity: 0.3 },
    { label: 'Horário de Ponta', color: '#ef4444', type: 'rect', opacity: 0.12 }
  ];

  let currentX = 50;
  legendItems.forEach(item => {
    if (item.type === 'line') {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', currentX);
      line.setAttribute('y1', -4);
      line.setAttribute('x2', currentX + 15);
      line.setAttribute('y2', -4);
      line.setAttribute('stroke', item.color);
      line.setAttribute('stroke-width', '2.5');
      legendGroup.appendChild(line);
    } else if (item.type === 'dashed-line') {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', currentX);
      line.setAttribute('y1', -4);
      line.setAttribute('x2', currentX + 15);
      line.setAttribute('y2', -4);
      line.setAttribute('stroke', item.color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '4 3');
      legendGroup.appendChild(line);
    } else if (item.type === 'rect') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', currentX);
      rect.setAttribute('y', -10);
      rect.setAttribute('width', 15);
      rect.setAttribute('height', 12);
      rect.setAttribute('rx', 2);
      rect.setAttribute('fill', item.color);
      rect.setAttribute('fill-opacity', item.opacity);
      legendGroup.appendChild(rect);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', currentX + 22);
    text.setAttribute('y', 0);
    text.setAttribute('fill', colorMute);
    text.setAttribute('font-size', '11');
    text.textContent = item.label;
    legendGroup.appendChild(text);

    currentX += item.label.length * 6 + 45;
  });
  svg.appendChild(legendGroup);

  return svg;
}

/* ====================================================================
 * SEÇÃO 5: SVG_UNIFILAR — Geração do diagrama unifilar
 * ==================================================================== */

function generateUnifilar(outputs, inputs) {
  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';
  
  const protectionType = inputs['equipamento-protecao'] || 'ATS';
  const protectionLabel = (protectionType === 'ATS') ? 'Chave ATS' : 'Barramento QGBT';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%" style="background: transparent; font-family: 'Inter', system-ui, sans-serif;">
  <!-- Rede Concessionária -->
  <g class="unifilar-group">
    <circle cx="200" cy="40" r="15" fill="#1a1a1a" stroke="var(--color-primary)" stroke-width="2" />
    <path d="M 193 40 L 207 40 M 200 33 L 200 47" stroke="var(--color-primary)" stroke-width="2" />
    <text x="200" y="72" text-anchor="middle" class="unifilar__text-primary">⚡ Rede Concessionária</text>
  </g>

  <!-- AC Line: Rede -> Medidor -->
  <line x1="200" y1="78" x2="200" y2="120" class="unifilar__line unifilar__line-ac" />

  <!-- Medidor -->
  <g class="unifilar-group">
    <rect x="150" y="120" width="100" height="50" rx="4" class="unifilar__node" />
    <text x="200" y="140" text-anchor="middle" class="unifilar__text-primary">Medidor</text>
    <text x="200" y="158" text-anchor="middle" class="unifilar__text-secondary">Medidor Inteligente</text>
  </g>

  <!-- AC Line: Medidor -> Proteção -->
  <line x1="200" y1="170" x2="200" y2="220" class="unifilar__line unifilar__line-ac" />

  <!-- ATS / QGBT -->
  <g class="unifilar-group">
    <rect x="130" y="220" width="140" height="60" rx="6" class="unifilar__node" />
    <text x="200" y="244" text-anchor="middle" class="unifilar__text-primary">${protectionLabel}</text>
    <text x="200" y="264" text-anchor="middle" class="unifilar__text-secondary">Ponto Conexão</text>
  </g>

  <!-- AC Line Left: Proteção -> Cargas -->
  <path d="M 200 280 L 200 310 L 90 310 L 90 360" class="unifilar__line unifilar__line-ac" />

  <!-- AC Line Right: Proteção -> PCS -->
  <path d="M 200 280 L 200 310 L 310 310 L 310 360" class="unifilar__line unifilar__line-ac" />

  <!-- Cargas C&I -->
  <g class="unifilar-group">
    <rect x="40" y="360" width="100" height="60" rx="6" class="unifilar__node" />
    <text x="90" y="386" text-anchor="middle" class="unifilar__text-primary">Cargas C&I</text>
    <text x="90" y="404" text-anchor="middle" class="unifilar__text-secondary">Consumo Inst.</text>
  </g>

  <!-- PCS (Inversor Bidirecional) -->
  <g class="unifilar-group">
    <rect x="260" y="360" width="100" height="60" rx="6" class="unifilar__node" />
    <text x="310" y="386" text-anchor="middle" class="unifilar__text-primary">PCS (Inversor)</text>
    <text x="310" y="404" text-anchor="middle" class="unifilar__text-secondary">Bidirecional</text>
  </g>

  <!-- DC Line: PCS -> Bateria -->
  <line x1="310" y1="420" x2="310" y2="480" class="unifilar__line unifilar__line-dc" />
  <text x="325" y="455" fill="var(--color-dc-line)" font-size="10" font-weight="bold">Barramento CC</text>

  <!-- Bateria LFP -->
  <g class="unifilar-group">
    <rect x="260" y="480" width="100" height="60" rx="6" class="unifilar__node" />
    <text x="310" y="506" text-anchor="middle" class="unifilar__text-primary">Bateria LFP</text>
    <text x="310" y="524" text-anchor="middle" class="unifilar__text-secondary">${formatNumber(outputs.total_bess_energy_kwh, 0)} kWh</text>
  </g>

  <!-- EMS (Gerenciador de Energia) -->
  <g class="unifilar-group">
    <rect x="40" y="480" width="100" height="60" rx="6" class="unifilar__node" />
    <text x="90" y="506" text-anchor="middle" class="unifilar__text-primary">Controlador EMS</text>
    <text x="90" y="524" text-anchor="middle" class="unifilar__text-secondary">Gestão Local</text>
  </g>

  <!-- Communication Line (Dashed) -->
  <path d="M 90 480 L 90 440 L 310 440" class="unifilar__line unifilar__line-comm" />
  <path d="M 90 440 L 90 250 L 130 250" class="unifilar__line unifilar__line-comm" />
  <text x="145" y="435" fill="var(--color-comm-line)" font-size="9" font-style="italic">Modbus TCP / RS485</text>
</svg>
  `;
  return svg.trim();
}

/* ====================================================================
 * SEÇÃO 6: SVG_DEGRADATION — Geração do gráfico de degradação
 * ==================================================================== */

function generateDegradationCurve(outputs, inputs) {
  const rootStyles = getComputedStyle(document.documentElement);
  const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim() || '#00d992';
  const colorMute = rootStyles.getPropertyValue('--color-mute').trim() || '#8b949e';

  const curves = outputs.degradation_curves;
  const eolPercent = inputs['equipamento-eol'] || 70.0;
  const cyclesPerDay = inputs['projeto-ciclos-dia'] || 1;

  const minSoH = Math.min(...curves['0.5P'], ...curves['0.25P'], ...curves['0.1C']);
  const minY = Math.max(0, Math.floor(Math.min(minSoH, eolPercent) / 10) * 10 - 10);

  const w = 800;
  const h_svg = 400;
  const padL = 60;
  const padR = 40;
  const padT = 40;
  const padB = 75; // Adjusted to leave space for the inline legend
  const chartW = w - padL - padR;
  const chartH = h_svg - padT - padB;

  function getX(yr) {
    return padL + (yr / 15) * chartW;
  }
  function getY(soh) {
    if (Number.isNaN(soh) || !Number.isFinite(soh)) return padT + chartH;
    return padT + chartH - ((soh - minY) / (100 - minY)) * chartH;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h_svg}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.background = 'transparent';
  svg.style.fontFamily = "'Inter', system-ui, sans-serif";

  // Grid Y
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const startTick = Math.ceil(minY / 10) * 10;
  for (let val = startTick; val <= 100; val += 10) {
    const y = getY(val);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padL);
    line.setAttribute('y1', y);
    line.setAttribute('x2', w - padR);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'degradation__grid');
    gridGroup.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', padL - 10);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'degradation__label');
    text.textContent = `${val}%`;
    gridGroup.appendChild(text);
  }

  // Grid X & Labels
  for (let yr = 0; yr <= 15; yr += 5) {
    const x = getX(yr);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', padT);
    line.setAttribute('x2', x);
    line.setAttribute('y2', padT + chartH);
    line.setAttribute('class', 'degradation__grid');
    gridGroup.appendChild(line);

    const textYr = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textYr.setAttribute('x', x);
    textYr.setAttribute('y', padT + chartH + 18);
    textYr.setAttribute('text-anchor', 'middle');
    textYr.setAttribute('class', 'degradation__label');
    textYr.setAttribute('font-weight', 'bold');
    textYr.textContent = `Ano ${yr}`;
    gridGroup.appendChild(textYr);

    const textCyc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textCyc.setAttribute('x', x);
    textCyc.setAttribute('y', padT + chartH + 30);
    textCyc.setAttribute('text-anchor', 'middle');
    textCyc.setAttribute('class', 'degradation__label');
    const cycles = Math.round(yr * 365 * cyclesPerDay);
    textCyc.textContent = `(${formatNumber(cycles, 0)} cic)`;
    gridGroup.appendChild(textCyc);
  }
  svg.appendChild(gridGroup);

  // EOL Line
  const eolY = getY(eolPercent);
  const eolLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  eolLine.setAttribute('x1', padL);
  eolLine.setAttribute('y1', eolY);
  eolLine.setAttribute('x2', w - padR);
  eolLine.setAttribute('y2', eolY);
  eolLine.setAttribute('class', 'degradation__eol-line');
  svg.appendChild(eolLine);

  const eolText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  eolText.setAttribute('x', w - padR - 5);
  eolText.setAttribute('y', eolY - 6);
  eolText.setAttribute('text-anchor', 'end');
  eolText.setAttribute('fill', '#8b5cf6');
  eolText.setAttribute('font-size', '10');
  eolText.setAttribute('font-weight', 'bold');
  eolText.textContent = `EOL: ${formatNumber(eolPercent, 1)}%`;
  svg.appendChild(eolText);

  // Curves
  const cRates = ['0.5P', '0.25P', '0.1C'];
  const colors = {
    '0.5P': '#ef4444',
    '0.25P': '#f59e0b',
    '0.1C': colorPrimary
  };
  
  cRates.forEach(rate => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = `M ${getX(0)} ${getY(curves[rate][0])}`;
    for (let yr = 1; yr <= 15; yr++) {
      d += ` L ${getX(yr)} ${getY(curves[rate][yr])}`;
    }
    path.setAttribute('d', d);
    path.setAttribute('class', 'degradation__curve');
    path.setAttribute('stroke', colors[rate]);
    svg.appendChild(path);
  });

  const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  yLabel.setAttribute('transform', 'rotate(-90)');
  yLabel.setAttribute('x', -(padT + chartH / 2));
  yLabel.setAttribute('y', padL - 42);
  yLabel.setAttribute('text-anchor', 'middle');
  yLabel.setAttribute('fill', colorMute);
  yLabel.setAttribute('font-size', '10');
  yLabel.textContent = 'Estado de Saúde (SoH %)';
  svg.appendChild(yLabel);

  // Legend Group inside the SVG (Problem 3)
  const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  legendGroup.setAttribute('transform', 'translate(0, 382)');

  const legendItems = [
    { label: '0.1C (Extrapolado)', color: colors['0.1C'], type: 'line' },
    { label: '0.25P (Datasheet)', color: colors['0.25P'], type: 'line' },
    { label: '0.5P (Datasheet)', color: colors['0.5P'], type: 'line' },
    { label: 'Limite EOL', color: '#8b5cf6', type: 'dashed-line' }
  ];

  let currentX = 60;
  legendItems.forEach(item => {
    if (item.type === 'line') {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', currentX);
      line.setAttribute('y1', -4);
      line.setAttribute('x2', currentX + 15);
      line.setAttribute('y2', -4);
      line.setAttribute('stroke', item.color);
      line.setAttribute('stroke-width', '2.5');
      legendGroup.appendChild(line);
    } else if (item.type === 'dashed-line') {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', currentX);
      line.setAttribute('y1', -4);
      line.setAttribute('x2', currentX + 15);
      line.setAttribute('y2', -4);
      line.setAttribute('stroke', item.color);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 4');
      legendGroup.appendChild(line);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', currentX + 22);
    text.setAttribute('y', 0);
    text.setAttribute('fill', colorMute);
    text.setAttribute('font-size', '11');
    text.textContent = item.label;
    legendGroup.appendChild(text);

    currentX += item.label.length * 6 + 40;
  });
  svg.appendChild(legendGroup);

  return svg;
}

/* ====================================================================
 * SEÇÃO 7: PDF_EXPORT — Geração do relatório PDF (jsPDF + svg2pdf.js)
 * ==================================================================== */

// Helper to inline computed styles on cloned SVG nodes before rendering in jsPDF
function prepareSvgForPdf(svgElement) {
  const clone = svgElement.cloneNode(true);
  
  function applyStyles(original, copy) {
    const computed = window.getComputedStyle(original);
    const styleProps = [
      'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity',
      'fill', 'fill-opacity',
      'font-family', 'font-size', 'font-weight', 'text-anchor',
      'opacity', 'display', 'visibility'
    ];
    
    styleProps.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== 'normal' && val !== 'auto') {
        copy.setAttribute(prop, val);
      }
    });
    
    for (let i = 0; i < original.children.length; i++) {
      if (copy.children[i]) {
        applyStyles(original.children[i], copy.children[i]);
      }
    }
  }
  
  applyStyles(svgElement, clone);
  
  // Embed document stylesheets inside the clone as a <style> block to handle any foreignObject/KaTeX styles (Issue 2)
  let cssText = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            cssText += rule.cssText + "\n";
          }
        }
      } catch (e) {
        // Ignora erros de CORS de fontes externas
      }
    }
  } catch (e) {
    console.warn("prepareSvgForPdf: Erro ao ler folhas de estilo:", e);
  }
  
  if (cssText) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = cssText;
    clone.insertBefore(styleEl, clone.firstChild);
  }
  
  return clone;
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
    if (!window.svg2pdf) {
      throw new Error("Biblioteca svg2pdf.js não foi carregada. Verifique sua conexão à internet.");
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
    
    const diagramSvg = document.querySelector("#diagram-container svg");
    const loadCurveSvg = document.querySelector("#load-curve-container svg");
    const unifilarSvg = document.querySelector("#unifilar-container svg");
    const degradationSvg = document.querySelector("#degradation-container svg");
    
    if (diagramSvg && loadCurveSvg && unifilarSvg && degradationSvg) {
      const preparedDiag = prepareSvgForPdf(diagramSvg);
      const preparedLoad = prepareSvgForPdf(loadCurveSvg);
      const preparedUni = prepareSvgForPdf(unifilarSvg);
      const preparedDeg = prepareSvgForPdf(degradationSvg);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(16, 16, 16);
      
      // Top row of charts
      doc.text("Diagrama de Funcionamento", 20, 31);
      doc.text("Curva de Carga 24h", 115, 31);
      await doc.svg(preparedDiag, { x: 20, y: 33, width: 85, height: 53.1 });
      await doc.svg(preparedLoad, { x: 115, y: 33, width: 85, height: 53.1 });
      
      // Bottom row of charts
      doc.text("Diagrama Unifilar", 20, 105);
      doc.text("Curva de Degradação (SoH)", 115, 105);
      await doc.svg(preparedUni, { x: 25, y: 108, width: 75, height: 112.5 });
      await doc.svg(preparedDeg, { x: 115, y: 108, width: 75, height: 112.5 });
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
  if (!supabase) {
    console.warn("Supabase não disponível. Auto-save pulado.");
    return;
  }
  
  try {
    const { data, error } = await supabase
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
  
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
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
let cachedKatexStyles = "";

// Tenta carregar a folha de estilo do KaTeX via fetch para injeção posterior sem restrições CORS (Risco 1)
async function cacheKatexStyles() {
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css");
    if (res.ok) {
      cachedKatexStyles = await res.text();
      console.log("Calculadora BESS: Estilos KaTeX carregados em cache para exportação.");
    }
  } catch (e) {
    console.warn("Calculadora BESS: Erro ao cachear estilos KaTeX via fetch:", e);
  }
}

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
  cacheKatexStyles(); // Executa em background para cachear CSS do KaTeX

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
          
          const diagramContainer = document.getElementById('diagram-container');
          if (diagramContainer) {
            diagramContainer.innerHTML = generateFlowDiagram(outputs, inputs['equipamento-protecao']);
          }

          const loadCurveContainer = document.getElementById('load-curve-container');
          if (loadCurveContainer) {
            loadCurveContainer.innerHTML = '';
            loadCurveContainer.appendChild(generateLoadCurve(outputs, inputs));
          }

          const unifilarContainer = document.getElementById('unifilar-container');
          if (unifilarContainer) {
            unifilarContainer.innerHTML = generateUnifilar(outputs, inputs);
          }

          const degradationContainer = document.getElementById('degradation-container');
          if (degradationContainer) {
            degradationContainer.innerHTML = '';
            degradationContainer.appendChild(generateDegradationCurve(outputs, inputs));
          }
          
          // Reveal result containers with slide-down animation and reset opacity (PRD §3.3)
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

// Helper to render math formulas with KaTeX or fallback to plain text (Task 3.2, 5.4)
function renderMath(formula, plainText) {
  if (typeof katex !== 'undefined') {
    try {
      return katex.renderToString(formula, { displayMode: true, throwOnError: false });
    } catch (e) {
      console.warn("KaTeX render failed, using fallback:", e);
      return `<div class="katex-fallback">${plainText}</div>`;
    }
  } else {
    return `<div class="katex-fallback">${plainText}</div>`;
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

// Populates Linha 2 with math equations and calculation details (Task 3.1)
function renderRationale(outputs) {
  // Dimensionamento Formulas
  const fNom = `E_{\\text{nom}} = \\frac{E_{\\text{ciclo}}}{DoD \\times RTE \\times \\eta_{\\text{sistema}}}`;
  const fNomPlain = "E_nom = E_ciclo / (DoD * RTE * eta_sistema)";
  document.getElementById('formula-nom').innerHTML = renderMath(fNom, fNomPlain);
  
  const dodDecimal = outputs.dod_percent / 100;
  const rteDecimal = outputs.rte_percent / 100;
  const etaSys = outputs.eta_system;
  
  document.getElementById('sub-nom').textContent = `E_nom = ${formatNumber(outputs.energy_per_cycle_kwh)} / (${formatNumber(dodDecimal)} * ${formatNumber(rteDecimal)} * ${formatNumber(etaSys)})`;
  document.getElementById('result-nom').textContent = `E_nom ≈ ${formatNumber(outputs.nominal_energy_required_kwh)} kWh`;
  
  const bessModel = document.getElementById('equipamento-modelo').value || "BESS";
  document.getElementById('bess-qty').textContent = `${outputs.bess_quantity}x ${bessModel}`;
  
  // Warning label for rounded down (Task 3.4)
  const warningLabel = document.getElementById('warning-subdimensionado');
  if (outputs.bess_quantity_rounded_down) {
    warningLabel.style.display = 'block';
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

// Helper to serialize Linha 2 HTML into a self-contained SVG wrapping foreignObject (Task 5.3)
function getLinha2SvgString() {
  const element = document.querySelector('#linha-2 .rationale-grid');
  if (!element) return '';
  
  const width = element.offsetWidth || 1200;
  const height = element.offsetHeight || 400;
  
  const stylesText = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      color: #f2f2f2;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      background: transparent;
      padding: 10px;
    }
    .rationale-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      width: 100%;
      height: 100%;
    }
    .rationale-block {
      background-color: #1a1a1a;
      border: 1px solid #3d3a39;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .rationale-block h4 {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #ffffff;
      border-bottom: 1px solid #3d3a39;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .katex-zone {
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      overflow-x: auto;
      padding: 4px 0;
    }
    .math-substitution {
      font-family: monospace;
      font-size: 11px;
      color: #8b949e;
      text-align: center;
      word-break: break-all;
      margin-bottom: 4px;
    }
    .math-result {
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .bess-qty-container {
      display: flex;
      justify-content: center;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .bess-qty-value {
      font-size: 16px;
      font-weight: 700;
      color: #00d992;
      background-color: rgba(0, 217, 146, 0.1);
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid rgba(0, 217, 146, 0.2);
    }
    .warning-label {
      background-color: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
    }
    .energy-flow-list, .economic-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .energy-flow-list li, .economic-list li {
      display: flex;
      flex-direction: column;
      border-bottom: 1px dashed #3d3a39;
      padding-bottom: 4px;
    }
    .energy-flow-list li:last-child, .economic-list li:last-child {
      border-bottom: none;
    }
    .energy-flow-list .label, .economic-list .label {
      font-size: 11px;
      color: #8b949e;
    }
    .energy-flow-list .value, .economic-list .value {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .energy-flow-list .subtext {
      font-size: 10.5px;
      color: #8b949e;
      font-style: italic;
    }
    .economic-list .savings-item {
      border-top: 1px solid #3d3a39;
      padding-top: 8px;
      margin-top: 4px;
      border-bottom: none;
    }
    .economic-list .value.highlight {
      color: #00d992;
      font-size: 18px;
    }
  `;
  
  let katexStyles = cachedKatexStyles;
  if (!katexStyles) {
    try {
      for (const sheet of document.styleSheets) {
        if (sheet.href && sheet.href.includes("katex")) {
          for (const rule of sheet.cssRules) {
            katexStyles += rule.cssText + "\n";
          }
        }
      }
    } catch (e) {
      console.warn("Could not inline KaTeX styles automatically: ", e);
    }
  }
  
  const clone = element.cloneNode(true);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>
        ${stylesText}
        ${katexStyles}
      </style>
      <div class="rationale-grid">
        ${clone.innerHTML}
      </div>
    </div>
  </foreignObject>
</svg>
  `;
  return svg.trim();
}

function copyToClipboard(sectionId) {
  let svgString = "";
  if (sectionId === 'linha-2') {
    svgString = getLinha2SvgString();
  } else {
    const svgEl = document.querySelector(`#${sectionId} svg`);
    if (!svgEl) return;
    svgString = new XMLSerializer().serializeToString(svgEl);
  }
  
  if (!svgString) {
    showToast("Não foi possível copiar");
    return;
  }
  
  let width = 800;
  let height = 500;
  if (sectionId === 'linha-2') {
    const el = document.querySelector('#linha-2 .rationale-grid');
    width = el ? (el.offsetWidth || 1200) : 1200;
    height = el ? (el.offsetHeight || 400) : 400;
  } else {
    const svgEl = document.querySelector(`#${sectionId} svg`);
    if (svgEl) {
      const viewBox = svgEl.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4) {
          width = parts[2];
          height = parts[3];
        }
      }
    }
  }
  
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height); // Keep transparent background
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(blobURL);
      if (!blob) {
        showToast("Não foi possível copiar");
        return;
      }
      
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]).then(() => {
        showToast("Copiado!", 2000);
      }).catch((err) => {
        console.error("Clipboard write error:", err);
        showToast("Não foi possível copiar");
      });
    }, 'image/png');
  };
  img.onerror = (e) => {
    console.error("Image loading error during clipboard copy:", e);
    URL.revokeObjectURL(blobURL);
    showToast("Não foi possível copiar");
  };
  img.src = blobURL;
}

function downloadSvg(sectionId, filename) {
  let svgString = "";
  if (sectionId === 'linha-2') {
    svgString = getLinha2SvgString();
  } else {
    const svgEl = document.querySelector(`#${sectionId} svg`);
    if (!svgEl) return;
    svgString = new XMLSerializer().serializeToString(svgEl);
  }
  
  if (!svgString) {
    showToast("Não foi possível baixar o arquivo");
    return;
  }
  
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || "bess-export.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupExportButtons(sectionId, copyBtnId, downloadBtnId, filename) {
  const copyBtn = document.getElementById(copyBtnId);
  const downloadBtn = document.getElementById(downloadBtnId);
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyToClipboard(sectionId));
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => downloadSvg(sectionId, filename));
  }
}

function setupResultEvents() {
  setupExportButtons('linha-2', 'btn-copy-linha-2', 'btn-download-linha-2', 'bess-racional-dimensionamento.svg');
  setupExportButtons('linha-3-col1', 'btn-copy-linha-3', 'btn-download-linha-3', 'bess-diagrama-funcionamento.svg');
  setupExportButtons('linha-3-col2', 'btn-copy-linha-3-col2', 'btn-download-linha-3-col2', 'bess-curva-carga-24h.svg');
  setupExportButtons('linha-4-col1', 'btn-copy-linha-4-col1', 'btn-download-linha-4-col1', 'bess-diagrama-unifilar.svg');
  setupExportButtons('linha-4-col2', 'btn-copy-linha-4-col2', 'btn-download-linha-4-col2', 'bess-curva-degradacao.svg');
  
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

