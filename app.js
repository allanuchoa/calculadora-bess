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
    degradation_curves: {
      '0.5P': [],
      '0.25P': [],
      '0.1C': []
    }
  };
}

/* ====================================================================
 * SEÇÃO 3: SVG_CHARTS — Geração do diagrama de funcionamento BESS
 * ==================================================================== */

// Função auxiliar global para formatar números no padrão brasileiro (pt-BR)
function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
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
// (Desabilitado na Fundação / Sprint 1)

/* ====================================================================
 * SEÇÃO 5: SVG_UNIFILAR — Geração do diagrama unifilar
 * ==================================================================== */
// (Desabilitado na Fundação / Sprint 1)

/* ====================================================================
 * SEÇÃO 6: SVG_DEGRADATION — Geração do gráfico de degradação
 * ==================================================================== */
// (Desabilitado na Fundação / Sprint 1)

/* ====================================================================
 * SEÇÃO 7: PDF_EXPORT — Geração do relatório PDF (jsPDF + svg2pdf.js)
 * ==================================================================== */
// (Desabilitado na Fundação / Sprint 1)

/* ====================================================================
 * SEÇÃO 8: SUPABASE_PERSISTENCE — Auto-save e carregamento de simulações
 * ==================================================================== */
// (Desabilitado na Fundação / Sprint 1)

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
function initApp(session) {
  isAppInitialized = true;
  
  // Oculta o overlay de carregamento de forma suave
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }
  
  const welcomeEl = document.getElementById('user-welcome');
  if (welcomeEl) {
    if (session && session.user) {
      welcomeEl.textContent = `Bem-vindo, ${session.user.email}!`;
    } else {
      welcomeEl.textContent = `Modo Offline (Sem sincronização)`;
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
      
      // Restaurar opacidade instantaneamente ao re-calcular (Recomendação 6)
      const l2 = document.getElementById('linha-2');
      const l3 = document.getElementById('linha-3-col1');
      if (l2) l2.style.opacity = '1';
      if (l3) l3.style.opacity = '1';
      
      const isValid = validateInputs();
      
      if (isValid) {
        console.log("Validação efetuada com sucesso!");
        
        const btn = document.getElementById('btn-calcular');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Calculando...';
        }
        
        // Collect inputs & execute the sizing engine
        const inputs = collectInputs();
        
        try {
          const outputs = runCalculation(inputs);
          
          // Defensive check for NaN or Infinity (Task 5.5)
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
          
          const diagramContainer = document.getElementById('diagram-container');
          if (diagramContainer) {
            diagramContainer.innerHTML = generateFlowDiagram(outputs, inputs['equipamento-protecao']);
          }
          
          // Reveal result containers with slide-down animation and reset opacity (PRD §3.3)
          if (l2) {
            l2.classList.remove('slide-down');
            void l2.offsetWidth; // Force layout reflow (Risco 6)
            l2.style.display = 'block';
            l2.style.opacity = '1';
            l2.classList.add('slide-down');
          }
          if (l3) {
            l3.classList.remove('slide-down');
            void l3.offsetWidth; // Force layout reflow (Risco 6)
            l3.style.display = 'block';
            l3.style.opacity = '1';
            l3.classList.add('slide-down');
          }
          
          showToast("✓ Simulação concluída com sucesso!");
          
          // Efeito visual de sucesso no botão de calcular (Recomendação 9)
          if (btn) {
            btn.disabled = false;
            btn.classList.add('validated');
            btn.textContent = '✓ PRONTO!';
            
            setTimeout(() => {
              btn.classList.remove('validated');
              btn.textContent = 'CALCULAR';
            }, 2000);
          }
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

// copyToClipboard function drawing SVG/HTML onto Canvas and copying PNG to clipboard (Task 5.3)
function copyToClipboard(sectionId) {
  let svgString = "";
  if (sectionId === 'linha-2') {
    svgString = getLinha2SvgString();
  } else if (sectionId === 'linha-3-col1') {
    const svgEl = document.querySelector('#linha-3-col1 svg');
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
    ctx.clearRect(0, 0, width, height); // Keep transparent background (Task 2.7)
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

// downloadSvg triggers browser to download result representation as pure vector SVG (Task 5.3)
function downloadSvg(sectionId) {
  let svgString = "";
  let filename = "bess-diagrama-funcionamento.svg";
  
  if (sectionId === 'linha-2') {
    svgString = getLinha2SvgString();
    filename = "bess-racional-dimensionamento.svg";
  } else if (sectionId === 'linha-3-col1') {
    const svgEl = document.querySelector('#linha-3-col1 svg');
    if (!svgEl) return;
    svgString = new XMLSerializer().serializeToString(svgEl);
    filename = "bess-diagrama-funcionamento.svg";
  }
  
  if (!svgString) {
    showToast("Não foi possível baixar o arquivo");
    return;
  }
  
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Wire Sprint 2 outputs actions (Task 5.3)
function setupResultEvents() {
  const btnCopyL2 = document.getElementById('btn-copy-linha-2');
  const btnDownloadL2 = document.getElementById('btn-download-linha-2');
  const btnCopyL3 = document.getElementById('btn-copy-linha-3');
  const btnDownloadL3 = document.getElementById('btn-download-linha-3');
  
  if (btnCopyL2) btnCopyL2.addEventListener('click', () => copyToClipboard('linha-2'));
  if (btnDownloadL2) btnDownloadL2.addEventListener('click', () => downloadSvg('linha-2'));
  if (btnCopyL3) btnCopyL3.addEventListener('click', () => copyToClipboard('linha-3-col1'));
  if (btnDownloadL3) btnDownloadL3.addEventListener('click', () => downloadSvg('linha-3-col1'));
  
  // Real-time opacity fade when input is modified (PRD §3.3)
  const formInputs = document.querySelectorAll('#bess-form input, #bess-form select');
  formInputs.forEach(el => {
    el.addEventListener('input', () => {
      const l2 = document.getElementById('linha-2');
      const l3 = document.getElementById('linha-3-col1');
      if (l2 && l2.style.display !== 'none') {
        l2.style.opacity = '0.5';
      }
      if (l3 && l3.style.display !== 'none') {
        l3.style.opacity = '0.5';
      }
    });
  });
}

