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
// (Desabilitado na Fundação / Sprint 1)

/* ====================================================================
 * SEÇÃO 3: SVG_CHARTS — Geração do diagrama de funcionamento BESS
 * ==================================================================== */
// (Desabilitado na Fundação / Sprint 1)

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
function showToast(message) {
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
  
  // Esconde após 3 segundos
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Configura o tratamento do envio do formulário
function setupFormSubmit() {
  const form = document.getElementById('bess-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const isValid = validateInputs();
      
      if (isValid) {
        console.log("Validação efetuada com sucesso!");
        showToast("✓ Parâmetros validados! Pronto para iniciar a simulação (Sprint 2).");
        
        // Efeito visual de sucesso no botão de calcular
        const btn = document.getElementById('btn-calcular');
        if (btn) {
          btn.classList.add('validated');
          const originalText = btn.textContent;
          btn.textContent = '✓ PRONTO!';
          
          setTimeout(() => {
            btn.classList.remove('validated');
            btn.textContent = originalText;
          }, 2000);
        }
      } else {
        console.log("Validação falhou.");
      }
    });
  }
}
