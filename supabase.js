// Inicialização do Cliente Supabase
let supabaseClientInstance = null;

function getSupabaseClient() {
  if (!supabaseClientInstance) {
    if (typeof window.supabase === 'undefined') {
      console.error("SDK do Supabase não foi carregado na página.");
      return null;
    }
    
    // Protege contra URLs/keys vazias ou indefinidas na configuração local
    if (typeof CONFIG === 'undefined' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      console.warn("Supabase não configurado. Sincronização e autenticação desabilitadas.");
      return null;
    }
    
    try {
      supabaseClientInstance = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          storageKey: `sb-${CONFIG.SUPABASE_PROJECT_ID || 'bess'}-auth-token`
        }
      });
    } catch (err) {
      console.error("Falha ao inicializar o cliente Supabase:", err);
      return null;
    }
  }
  return supabaseClientInstance;
}

// Inicializa a instância global se possível, mas de forma segura
let supabase = null;
try {
  supabase = getSupabaseClient();
} catch (e) {
  console.warn("Erro ao instanciar o Supabase globalmente:", e);
}

