-- ============================================================
-- SQL para corrigir as políticas RLS do Supabase
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard → seu projeto → SQL Editor
-- ============================================================

-- ─── TABELA: questoes ───────────────────────────────────────

-- Remove políticas antigas (se existirem) para recriar do zero
DROP POLICY IF EXISTS "Permitir select para todos em questoes" ON questoes;
DROP POLICY IF EXISTS "Permitir insert para todos em questoes" ON questoes;
DROP POLICY IF EXISTS "Permitir update para todos em questoes" ON questoes;
DROP POLICY IF EXISTS "Permitir delete para todos em questoes" ON questoes;

-- Garante que RLS está habilitado
ALTER TABLE questoes ENABLE ROW LEVEL SECURITY;

-- Policies permissivas: qualquer role (anon ou authenticated) pode ler, inserir, atualizar e deletar
CREATE POLICY "Permitir select para todos em questoes"
  ON questoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir insert para todos em questoes"
  ON questoes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir update para todos em questoes"
  ON questoes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir delete para todos em questoes"
  ON questoes FOR DELETE
  TO anon, authenticated
  USING (true);


-- ─── TABELA: historico_resolucoes ───────────────────────────

DROP POLICY IF EXISTS "Permitir select para todos em historico" ON historico_resolucoes;
DROP POLICY IF EXISTS "Permitir insert para todos em historico" ON historico_resolucoes;
DROP POLICY IF EXISTS "Permitir update para todos em historico" ON historico_resolucoes;
DROP POLICY IF EXISTS "Permitir delete para todos em historico" ON historico_resolucoes;

ALTER TABLE historico_resolucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir select para todos em historico"
  ON historico_resolucoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir insert para todos em historico"
  ON historico_resolucoes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir update para todos em historico"
  ON historico_resolucoes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir delete para todos em historico"
  ON historico_resolucoes FOR DELETE
  TO anon, authenticated
  USING (true);


-- ─── TABELA: profiles (mantém RLS com acesso por user_id) ──

-- Profiles já deve ter suas próprias policies, mas garantimos que existam
DROP POLICY IF EXISTS "Permitir select profiles pelo próprio user" ON profiles;
DROP POLICY IF EXISTS "Permitir update profiles pelo próprio user" ON profiles;
DROP POLICY IF EXISTS "Permitir insert profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir select profiles pelo próprio user"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Permitir update profiles pelo próprio user"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Também permite leitura anônima de profiles (para exibição)
CREATE POLICY "Permitir select anon profiles"
  ON profiles FOR SELECT
  TO anon
  USING (true);
