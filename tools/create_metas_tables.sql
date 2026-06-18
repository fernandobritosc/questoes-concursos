-- ============================================================
-- SQL para criar tabelas de Metas de Concurso (Plano de Estudos)
-- Execute no Supabase SQL Editor
-- ============================================================

-- ─── TABELA: metas_concurso (cabeçalho da meta semanal) ─────

CREATE TABLE IF NOT EXISTS metas_concurso (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  semana_numero INTEGER NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  total_tarefas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE metas_concurso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver suas próprias metas" ON metas_concurso;
CREATE POLICY "Usuário pode ver suas próprias metas"
  ON metas_concurso FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário pode inserir suas próprias metas" ON metas_concurso;
CREATE POLICY "Usuário pode inserir suas próprias metas"
  ON metas_concurso FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário pode atualizar suas próprias metas" ON metas_concurso;
CREATE POLICY "Usuário pode atualizar suas próprias metas"
  ON metas_concurso FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário pode deletar suas próprias metas" ON metas_concurso;
CREATE POLICY "Usuário pode deletar suas próprias metas"
  ON metas_concurso FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_metas_concurso_user_id ON metas_concurso(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_concurso_semana ON metas_concurso(semana_numero);

-- ─── TABELA: tarefas_meta (tarefas individuais de cada meta) ─

CREATE TABLE IF NOT EXISTS tarefas_meta (
  id BIGSERIAL PRIMARY KEY,
  meta_id BIGINT NOT NULL REFERENCES metas_concurso(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  disciplina TEXT NOT NULL,
  formato TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tempo_estimado TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'iniciada', 'concluída', 'ignorada')),
  desempenho INTEGER CHECK (desempenho >= 0 AND desempenho <= 100),
  avaliacao TEXT,
  relevancia TEXT,
  material_indicado TEXT,
  link_tec TEXT,
  assunto TEXT,
  conteudo TEXT,
  conteudo_dicas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tarefas_meta ENABLE ROW LEVEL SECURITY;

-- RLS: acesso via meta_id → user_id indireto
DROP POLICY IF EXISTS "Usuário pode ver tarefas das suas metas" ON tarefas_meta;
CREATE POLICY "Usuário pode ver tarefas das suas metas"
  ON tarefas_meta FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM metas_concurso
      WHERE metas_concurso.id = tarefas_meta.meta_id
      AND metas_concurso.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuário pode inserir tarefas nas suas metas" ON tarefas_meta;
CREATE POLICY "Usuário pode inserir tarefas nas suas metas"
  ON tarefas_meta FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM metas_concurso
      WHERE metas_concurso.id = tarefas_meta.meta_id
      AND metas_concurso.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuário pode atualizar tarefas das suas metas" ON tarefas_meta;
CREATE POLICY "Usuário pode atualizar tarefas das suas metas"
  ON tarefas_meta FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM metas_concurso
      WHERE metas_concurso.id = tarefas_meta.meta_id
      AND metas_concurso.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM metas_concurso
      WHERE metas_concurso.id = tarefas_meta.meta_id
      AND metas_concurso.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuário pode deletar tarefas das suas metas" ON tarefas_meta;
CREATE POLICY "Usuário pode deletar tarefas das suas metas"
  ON tarefas_meta FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM metas_concurso
      WHERE metas_concurso.id = tarefas_meta.meta_id
      AND metas_concurso.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_tarefas_meta_meta_id ON tarefas_meta(meta_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_meta_status ON tarefas_meta(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_meta_disciplina ON tarefas_meta(disciplina);
