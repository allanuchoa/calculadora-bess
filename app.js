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

  container.innerHTML = `
    <div class="flow-diagram" id="flow-diagram-capture">
      <div class="flow-diagram__top">
        <div class="node-card node-card--grid">
          <span class="node-card__icon" aria-hidden="true">⚡</span>
          <span class="node-card__title">Rede Concessionária</span>
          <span class="node-card__sub">AC 3Φ</span>
        </div>
      </div>

      <div class="flow-vertical">
        <div class="flow-vertical__line"></div>
        <div class="flow-vertical__info">
          <span class="flow-label flow-text--green">Carga (Fora de Ponta)</span>
          <span class="flow-value"><code>E_consumida</code> = ${E_consumida} kWh</span>
          <span class="flow-sub">Inclui perdas de conexão (${lossPercent}%)</span>
        </div>
      </div>

      <div class="flow-diagram__middle">
        <div class="node-card node-card--loads">
          <span class="node-card__icon" aria-hidden="true">🏭</span>
          <span class="node-card__title">Cargas C&amp;I</span>
          <span class="node-card__sub">Consumo Industrial</span>
        </div>

        <div class="flow-connector">
          <span class="flow-label flow-text--amber">Alimentação (HP)</span>
          <div class="flow-line flow-line--amber flow-line--left"></div>
          <span class="flow-value"><code>E_compensada</code> = ${E_compensada} kWh</span>
          <span class="flow-sub">Rendimento: ${eta_system}%</span>
        </div>

        <div class="node-card node-card--accent">
          <span class="node-card__icon" aria-hidden="true">🔀</span>
          <span class="node-card__title">${protectionLabel}</span>
          <span class="node-card__sub">Ponto de Conexão Comum</span>
        </div>

        <div class="flow-connector flow-connector--dual">
          <div class="flow-channel">
            <span class="flow-label flow-text--blue">Carga BESS</span>
            <div class="flow-line flow-line--blue flow-line--right"></div>
            <span class="flow-value"><code>E_carga</code> = ${E_carga} kWh</span>
            <span class="flow-sub">η_carga = ${eta_charge}%</span>
          </div>
          <div class="flow-channel">
            <span class="flow-label flow-text--amber">Descarga (HP)</span>
            <div class="flow-line flow-line--amber flow-line--left"></div>
            <span class="flow-value"><code>E_descarga</code> = ${E_descarga} kWh</span>
            <span class="flow-sub">η_descarga = ${eta_discharge}%</span>
          </div>
        </div>

        <div class="node-card node-card--bess">
          <span class="node-card__icon" aria-hidden="true">🔋</span>
          <span class="node-card__title">BESS (Baterias LFP)</span>
          <span class="node-card__sub">Capacidade: ${formatNumber(outputs.total_bess_energy_kwh, 0)} kWh</span>
        </div>
      </div>

      <div class="flow-diagram__caption">Diagrama de Fluxo de Energia por Ciclo (Load-Shifting)</div>
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
      curve: 'smooth',
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

function renderUnifilar(container, outputs, inputs) {
  if (!container) return;

  const protectionType = inputs['equipamento-protecao'] || 'ATS';
  const protectionLabel = (protectionType === 'ATS') ? 'Chave ATS' : 'Barramento QGBT';

  container.innerHTML = `
    <div class="unifilar" id="unifilar-capture">
      <div class="node-card node-card--grid">
        <span class="node-card__icon" aria-hidden="true">⚡</span>
        <span class="node-card__title">Rede Concessionária</span>
        <span class="node-card__sub">AC 3Φ — Média Tensão</span>
      </div>

      <div class="uni-wire uni-wire--ac"></div>

      <div class="node-card">
        <span class="node-card__icon" aria-hidden="true">📟</span>
        <span class="node-card__title">Medidor</span>
        <span class="node-card__sub">Medidor Inteligente</span>
      </div>

      <div class="uni-wire uni-wire--ac"></div>

      <div class="node-card node-card--accent">
        <span class="node-card__icon" aria-hidden="true">🔀</span>
        <span class="node-card__title">${protectionLabel}</span>
        <span class="node-card__sub">Ponto de Conexão</span>
      </div>

      <div class="uni-branch" aria-hidden="true"></div>

      <div class="uni-row">
        <div class="uni-col">
          <div class="node-card node-card--loads">
            <span class="node-card__icon" aria-hidden="true">🏭</span>
            <span class="node-card__title">Cargas C&amp;I</span>
            <span class="node-card__sub">Consumo Instalado</span>
          </div>
          <div class="uni-wire uni-wire--comm uni-wire--tall"></div>
          <div class="node-card node-card--comm">
            <span class="node-card__icon" aria-hidden="true">🖥️</span>
            <span class="node-card__title">Controlador EMS</span>
            <span class="node-card__sub">Gestão Local</span>
          </div>
        </div>

        <div class="uni-col">
          <div class="node-card">
            <span class="node-card__icon" aria-hidden="true">🔄</span>
            <span class="node-card__title">PCS (Inversor)</span>
            <span class="node-card__sub">Bidirecional</span>
          </div>
          <div class="uni-wire-labeled">
            <div class="uni-wire uni-wire--dc uni-wire--tall"></div>
            <span class="uni-wire-label uni-text--dc">Barramento CC</span>
          </div>
          <div class="node-card node-card--bess">
            <span class="node-card__icon" aria-hidden="true">🔋</span>
            <span class="node-card__title">Bateria LFP</span>
            <span class="node-card__sub">${formatNumber(outputs.total_bess_energy_kwh, 0)} kWh</span>
          </div>
        </div>
      </div>

      <div class="uni-comm-link" aria-hidden="true">
        <div class="uni-comm-link__line"></div>
        <span class="uni-comm-link__label">Modbus TCP / RS485</span>
      </div>

      <div class="uni-legend">
        <span class="uni-legend__item"><span class="uni-legend__swatch uni-legend__swatch--ac"></span>Fiação AC</span>
        <span class="uni-legend__item"><span class="uni-legend__swatch uni-legend__swatch--dc"></span>Fiação DC</span>
        <span class="uni-legend__item"><span class="uni-legend__swatch uni-legend__swatch--comm"></span>Comunicação</span>
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
    stroke: { curve: 'smooth', width: 2.5 },
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
    markers: { size: 0, hover: { size: 5 } },
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
    const unifilarEl = document.querySelector("#unifilar-container .unifilar");

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
    return captureElementPng(document.querySelector('#diagram-container .flow-diagram'), null);
  }
  if (sectionId === 'linha-3-col2') {
    return captureChartPng(bessCharts.loadCurve);
  }
  if (sectionId === 'linha-4-col1') {
    return captureElementPng(document.querySelector('#unifilar-container .unifilar'), null);
  }
  if (sectionId === 'linha-4-col2') {
    return captureChartPng(bessCharts.degradation);
  }
  return Promise.resolve(null);
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

