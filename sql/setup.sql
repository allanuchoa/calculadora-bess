-- ============================================================================
-- Calculadora BESS — Script de Setup (idempotente)
-- Slug: calculadora-bess
-- Prefixo de tabelas: bes_
-- ============================================================================
-- PROPÓSITO
--   Criar as tabelas de dados da ferramenta (bes_simulations, bes_user_defaults),
--   policies RLS, triggers, e registrar no registry do ecossistema Allan Workbench.
--   100% re-executável sem erros.
--
-- ONDE RODAR
--   Supabase SQL Editor (Dashboard) — roda no contexto `service_role`, que
--   bypassa RLS.
--
-- CONTRATO RLS
--   As policies em applications, user_applications e profiles são
--   definidas UMA ÚNICA vez na instalação do registry e NÃO devem ser
--   recriadas aqui. Este script só faz INSERT nessas tabelas.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Bloco 1: Registro da ferramenta no registry (idempotente)
-- ---------------------------------------------------------------------------
INSERT INTO public.applications (slug, name, url, icon, category, is_active, status)
VALUES (
  'calculadora-bess',
  'Calculadora BESS',
  'https://allanuchoa.github.io/calculadora-bess/',
  'battery-charging',
  'Engineering',
  true,
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name      = EXCLUDED.name,
  url       = EXCLUDED.url,
  icon      = EXCLUDED.icon,
  category  = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  status    = EXCLUDED.status;

-- ---------------------------------------------------------------------------
-- Bloco 2: Tabela bes_simulations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bes_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Simulação BESS sem nome',
    description TEXT,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bloco 3: Tabela bes_user_defaults
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bes_user_defaults (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    defaults JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bloco 4: Habilitar RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.bes_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bes_user_defaults ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Bloco 5: Policies — bes_simulations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bes_simulations_select" ON public.bes_simulations;
CREATE POLICY "bes_simulations_select" ON public.bes_simulations
FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_simulations_insert" ON public.bes_simulations;
CREATE POLICY "bes_simulations_insert" ON public.bes_simulations
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_simulations_update" ON public.bes_simulations;
CREATE POLICY "bes_simulations_update" ON public.bes_simulations
FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_simulations_delete" ON public.bes_simulations;
CREATE POLICY "bes_simulations_delete" ON public.bes_simulations
FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

-- ---------------------------------------------------------------------------
-- Bloco 6: Policies — bes_user_defaults
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bes_user_defaults_select" ON public.bes_user_defaults;
CREATE POLICY "bes_user_defaults_select" ON public.bes_user_defaults
FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_user_defaults_insert" ON public.bes_user_defaults;
CREATE POLICY "bes_user_defaults_insert" ON public.bes_user_defaults
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_user_defaults_update" ON public.bes_user_defaults;
CREATE POLICY "bes_user_defaults_update" ON public.bes_user_defaults
FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

DROP POLICY IF EXISTS "bes_user_defaults_delete" ON public.bes_user_defaults;
CREATE POLICY "bes_user_defaults_delete" ON public.bes_user_defaults
FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid()
          AND app.slug = 'calculadora-bess'
          AND app.is_active = true
    )
);

-- ---------------------------------------------------------------------------
-- Bloco 7: Trigger updated_at (idempotente)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_bes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bes_simulations_updated_at ON public.bes_simulations;
CREATE TRIGGER trg_bes_simulations_updated_at
BEFORE UPDATE ON public.bes_simulations
FOR EACH ROW EXECUTE FUNCTION public.trigger_bes_updated_at();

DROP TRIGGER IF EXISTS trg_bes_user_defaults_updated_at ON public.bes_user_defaults;
CREATE TRIGGER trg_bes_user_defaults_updated_at
BEFORE UPDATE ON public.bes_user_defaults
FOR EACH ROW EXECUTE FUNCTION public.trigger_bes_updated_at();

-- ---------------------------------------------------------------------------
-- Bloco 8: Index para performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bes_simulations_user_created
ON public.bes_simulations (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Bloco 9: Atribuição de Acessos para Usuários (Modo de Exemplo)
--          Substitua '<user-uuid>' pelo UUID do seu usuário no Supabase
-- ---------------------------------------------------------------------------
-- INSERT INTO public.user_applications (user_id, application_id)
-- VALUES
--   ('<user-uuid>', (SELECT id FROM public.applications WHERE slug = 'calculadora-bess'))
-- ON CONFLICT (user_id, application_id) DO NOTHING;

COMMIT;
