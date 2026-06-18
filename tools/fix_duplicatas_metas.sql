-- ============================================================
-- SQL para corrigir duplicatas e adicionar UNIQUE constraints
-- Execute no Supabase SQL Editor
-- ============================================================

-- ─── 1. Remove tarefas duplicadas (mesma meta_id + ordem) ───
-- Mantém a que tem mais campos preenchidos (detalhes)

DELETE FROM tarefas_meta
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY meta_id, ordem
        ORDER BY
          (CASE WHEN assunto IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN conteudo IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN conteudo_dicas IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN material_indicado IS NOT NULL THEN 1 ELSE 0 END) DESC,
          created_at DESC
      ) AS rn
    FROM tarefas_meta
  ) sub
  WHERE sub.rn > 1
);

-- ─── 2. Adiciona UNIQUE em tarefas_meta(meta_id, ordem) ─────

ALTER TABLE tarefas_meta
DROP CONSTRAINT IF EXISTS tarefas_meta_meta_id_ordem_key;

ALTER TABLE tarefas_meta
ADD CONSTRAINT tarefas_meta_meta_id_ordem_key
UNIQUE (meta_id, ordem);

-- ─── 3. Remove metas duplicadas (mesmo user_id + semana) ────
-- Mantém a que tem mais tarefas (mais completa)

DELETE FROM metas_concurso
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, semana_numero
        ORDER BY total_tarefas DESC, created_at DESC
      ) AS rn
    FROM metas_concurso
  ) sub
  WHERE sub.rn > 1
);

-- ─── 4. Adiciona UNIQUE em metas_concurso(user_id, semana) ──

ALTER TABLE metas_concurso
DROP CONSTRAINT IF EXISTS metas_concurso_user_id_semana_numero_key;

ALTER TABLE metas_concurso
ADD CONSTRAINT metas_concurso_user_id_semana_numero_key
UNIQUE (user_id, semana_numero);
