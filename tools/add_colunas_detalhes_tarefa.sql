-- ============================================================
-- Migração: Adiciona colunas de detalhes do modal "Ver" na LS
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE tarefas_meta ADD COLUMN IF NOT EXISTS assunto TEXT;
ALTER TABLE tarefas_meta ADD COLUMN IF NOT EXISTS conteudo TEXT;
ALTER TABLE tarefas_meta ADD COLUMN IF NOT EXISTS conteudo_dicas TEXT;
