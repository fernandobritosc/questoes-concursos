-- ============================================================
-- SCHEMA UNIFICADO — Migração Supabase → Oracle Cloud VM
-- Substitui auth.users + todas as tabelas dos 2 apps:
--   • Questões Concursos (questoes, historico_resolucoes, metas_concurso,
--     tarefas_meta, materiais_estudo, profiles)
--   • Monitor Pro (study_materials, notifications, flashcards,
--     registros_estudos, editais_materias, gabaritos_salvos, discursivas,
--     news_feed, ranking_geral, profiles)
-- Execute como superusuário: psql -U postgres -d concursos -f schema.sql
-- ============================================================

-- ─── Extensões ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── USERS (substitui auth.users) ───────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT,
  approved    BOOLEAN NOT NULL DEFAULT true,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROFILES (compartilhado pelos 2 apps) ─────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT,
  username   TEXT,
  chat_id    TEXT,
  approved   BOOLEAN NOT NULL DEFAULT false,
  is_admin   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── QUESTÕES CONCURSOS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS questoes (
  id                   BIGSERIAL PRIMARY KEY,
  questao_tec_id       INTEGER UNIQUE NOT NULL,
  materia              TEXT,
  assunto              TEXT,
  grupo                TEXT,
  banca_texto          TEXT,
  orgao                TEXT,
  concurso             TEXT,
  prova                TEXT,
  ano                  INTEGER,
  caderno_nome         TEXT,
  enunciado            TEXT,
  gabarito             TEXT,
  alternativas         JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolucao_professor  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questoes_materia      ON questoes(materia);
CREATE INDEX IF NOT EXISTS idx_questoes_banca        ON questoes(banca_texto);
CREATE INDEX IF NOT EXISTS idx_questoes_ano          ON questoes(ano);
CREATE INDEX IF NOT EXISTS idx_questoes_orgao        ON questoes(orgao);
CREATE INDEX IF NOT EXISTS idx_questoes_concurso     ON questoes(concurso);
CREATE INDEX IF NOT EXISTS idx_questoes_grupo        ON questoes(grupo);

CREATE TABLE IF NOT EXISTS historico_resolucoes (
  id              BIGSERIAL PRIMARY KEY,
  questao_id      BIGINT NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  questao_tec_id  INTEGER NOT NULL,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  alternativa     TEXT,
  acertou         BOOLEAN NOT NULL DEFAULT false,
  tempo_segundos  INTEGER,
  data_resolucao  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_user      ON historico_resolucoes(user_id);
CREATE INDEX IF NOT EXISTS idx_historico_questao   ON historico_resolucoes(questao_id);
CREATE INDEX IF NOT EXISTS idx_historico_tec_id    ON historico_resolucoes(questao_tec_id);

-- ─── METAS (Questões Concursos) ─────────────────────────────

CREATE TABLE IF NOT EXISTS metas_concurso (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  semana_numero INTEGER NOT NULL,
  data_inicio   DATE,
  data_fim      DATE,
  total_tarefas INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT metas_concurso_user_id_semana_numero_key UNIQUE (user_id, semana_numero)
);

CREATE TABLE IF NOT EXISTS tarefas_meta (
  id              BIGSERIAL PRIMARY KEY,
  meta_id         BIGINT NOT NULL REFERENCES metas_concurso(id) ON DELETE CASCADE,
  ordem           INTEGER NOT NULL,
  disciplina      TEXT NOT NULL,
  formato         TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  tempo_estimado  TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'iniciada', 'concluída', 'ignorada')),
  desempenho      INTEGER CHECK (desempenho >= 0 AND desempenho <= 100),
  avaliacao       TEXT,
  relevancia      TEXT,
  material_indicado TEXT,
  link_tec        TEXT,
  assunto         TEXT,
  conteudo        TEXT,
  conteudo_dicas  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tarefas_meta_meta_id_ordem_key UNIQUE (meta_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_tarefas_meta_status ON tarefas_meta(status);

-- ─── MATERIAIS DE ESTUDO (Questões Concursos) ──────────────

CREATE TABLE IF NOT EXISTS materiais_estudo (
  id              TEXT PRIMARY KEY,
  materia         TEXT,
  assunto         TEXT,
  file_name       TEXT,
  file_url        TEXT,
  original_size   BIGINT,
  compressed_size BIGINT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── MONITOR PRO ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_materials (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  materia            TEXT NOT NULL,
  assunto            TEXT,
  storage_path       TEXT NOT NULL,
  file_size          BIGINT,
  mime_type          TEXT DEFAULT 'application/pdf',
  podcast_path       TEXT,
  podcast_file_size  BIGINT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS flashcards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concurso            TEXT DEFAULT 'Geral',
  materia             TEXT NOT NULL,
  assunto             TEXT,
  front               TEXT NOT NULL,
  back                TEXT NOT NULL,
  status              TEXT DEFAULT 'novo',
  next_review         TIMESTAMPTZ,
  interval            NUMERIC,
  ease_factor         NUMERIC,
  original_audio_id   TEXT,
  author_name         TEXT,
  ai_generated_assets JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS flashcards_user_concurso_materia_front_key
  ON flashcards (user_id, concurso, materia, front);

CREATE TABLE IF NOT EXISTS registros_estudos (
  id              TEXT PRIMARY KEY,
  data_estudo     DATE,
  usuario         TEXT,
  concurso        TEXT,
  materia         TEXT,
  assunto         TEXT,
  acertos         INTEGER,
  total           INTEGER,
  taxa            NUMERIC,
  proxima_revisao TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT now(),
  tempo           INTEGER,
  rev_24h         BOOLEAN DEFAULT false,
  rev_07d         BOOLEAN DEFAULT false,
  rev_15d         BOOLEAN DEFAULT false,
  rev_30d         BOOLEAN DEFAULT false,
  comentarios     TEXT,
  dificuldade     TEXT,
  relevancia      INTEGER,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  analise_erros   JSONB,
  sugestao_mentor TEXT,
  meta            TEXT,
  tipo            TEXT DEFAULT 'Estudo'
);

CREATE INDEX IF NOT EXISTS idx_registros_user ON registros_estudos(user_id);

CREATE TABLE IF NOT EXISTS editais_materias (
  id                   TEXT PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concurso             TEXT NOT NULL,
  cargo                TEXT,
  materia              TEXT NOT NULL,
  topicos              JSONB DEFAULT '[]'::jsonb,
  data_prova           TEXT,
  is_principal         BOOLEAN NOT NULL DEFAULT false,
  peso                 INTEGER,
  usuario              TEXT,
  meta_horas           INTEGER,
  meta_questoes        INTEGER,
  is_template          BOOLEAN NOT NULL DEFAULT false,
  template_criador_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  template_nome        TEXT,
  template_descricao   TEXT,
  template_clones      INTEGER,
  CONSTRAINT editais_materias_user_concurso_materia_key UNIQUE (user_id, concurso, materia)
);

CREATE TABLE IF NOT EXISTS gabaritos_salvos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_name             TEXT,
  results_json          JSONB,
  user_answers_json     JSONB,
  official_answers_json JSONB
);

CREATE TABLE IF NOT EXISTS discursivas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  prompt         TEXT,
  image_url      TEXT,
  analysis_text  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_feed (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  summary      TEXT,
  source_name  TEXT,
  source_url   TEXT,
  image_url    TEXT,
  tags         JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ranking_geral (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT,
  email          TEXT,
  total_questoes INTEGER NOT NULL DEFAULT 0,
  total_acertos  INTEGER NOT NULL DEFAULT 0,
  total_tempo    INTEGER NOT NULL DEFAULT 0
);

-- ─── FUNÇÃO: ranking por período ────────────────────────────
-- Agrega registros_estudos (Monitor Pro) em vez de historico_resolucoes.

CREATE OR REPLACE FUNCTION get_ranking_by_period(p_days INTEGER DEFAULT NULL)
RETURNS TABLE (
  user_id        UUID,
  name           TEXT,
  total_questoes BIGINT,
  total_acertos  BIGINT,
  total_tempo    BIGINT
) LANGUAGE sql AS $$
  SELECT
    r.user_id,
    u.name,
    COUNT(*)::BIGINT                                  AS total_questoes,
    COALESCE(SUM(r.acertos), 0)::BIGINT               AS total_acertos,
    COALESCE(SUM(r.tempo), 0)::BIGINT                 AS total_tempo
  FROM registros_estudos r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE r.user_id IS NOT NULL
    AND (p_days IS NULL OR r.data_estudo >= (now() - (p_days || ' days')::interval)::date)
  GROUP BY r.user_id, u.name
  ORDER BY total_tempo DESC;
$$;
