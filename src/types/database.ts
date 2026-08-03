/**
 * database.ts
 * Tipos TypeScript que espelham o esquema relacional do Supabase.
 *
 * Modelo:
 *  questoes           → dados estáticos (enunciado, alternativas, gabarito…)
 *  historico_resolucoes → tentativas (uma por resolução, com data/acertou/tempo)
 */

// ─── Questão (tabela: questoes) ───────────────────────────────────────────────

export interface Questao {
  id?: number
  questao_tec_id: number
  materia: string | null
  assunto: string | null
  grupo?: string | null
  banca_texto: string | null
  orgao: string | null
  concurso: string | null
  prova: string | null
  ano: number | null
  caderno_nome: string | null
  enunciado: string | null
  gabarito: string | null
  alternativas: Record<string, string>
  resolucao_professor?: string | null
  created_at?: string
}

// ─── Histórico de Resolução (tabela: historico_resolucoes) ────────────────────

export interface HistoricoResolucao {
  id?: number
  questao_id: number          // FK → questoes.id
  questao_tec_id: number      // desnormalizado para filtros rápidos
  alternativa: string | null
  acertou: boolean
  tempo_segundos: number
  data_resolucao: string      // ISO 8601
  created_at?: string
  /** Dados da questão via JOIN (retornados pelo Supabase com select aninhado) */
  questao?: Questao | null
}

// ─── Tipo composto para a UI (compatibilidade com código legado) ───────────────

/**
 * ResolucaoView une os dados de `historico_resolucoes` com os campos de `questoes`.
 * É o tipo que os hooks expõem para as páginas.
 */
export interface ResolucaoView {
  /** id do registro em historico_resolucoes */
  id: number
  questao_id: number
  questao_tec_id: number

  // Campos da questão (de questoes)
  materia: string | null
  assunto: string | null
  grupo?: string | null
  banca_texto: string | null
  orgao: string | null
  concurso: string | null
  prova: string | null
  ano: number | null
  caderno_nome: string | null
  enunciado: string | null
  gabarito: string | null
  alternativas: Record<string, string>
  resolucao_professor: string | null

  // Campos do histórico
  alternativa: string | null
  acertou: boolean
  tempo_segundos: number
  data_resolucao: string
}

// ─── Opções de filtro para a página de questões ──────────────────────────────

export interface FilterOptions {
  materias: string[]
  bancas: string[]
  anos: number[]
  orgaos: string[]
  concursos: string[]
  assuntosPorMateria: Record<string, string[]>
}

// ─── Edital (estrutura genérica de editais de concursos) ───────────────────────

export interface Edital {
  id: string
  orgao: string
  sigla: string
  banca: string
  ano: number
  cargos: Cargo[]
}

export interface Cargo {
  id: string
  nome: string
  nivel: string
  materias: MateriaEdital[]
}

export interface MateriaEdital {
  id: string
  nome: string
  topicos: string[]
}

/** @deprecated Use ResolucaoView. Mantido para migração gradual. */
export type Resolucao = ResolucaoView

// ─── Metas de Concurso (Plano de Estudos LS Concurso) ────────

export interface MetaConcurso {
  id?: number
  user_id?: string
  titulo: string
  semana_numero: number
  data_inicio: string | null
  data_fim: string | null
  total_tarefas: number
  created_at?: string
  tarefas?: TarefaMeta[]
}

export interface TarefaMeta {
  id?: number
  meta_id: number
  ordem: number
  disciplina: string
  formato: string
  descricao: string
  tempo_estimado: string | null
  status: 'pendente' | 'iniciada' | 'concluída' | 'ignorada'
  desempenho: number | null
  avaliacao: string | null
  relevancia: string | null
  material_indicado: string | null
  link_tec: string | null
  assunto: string | null
  conteudo: string | null
  conteudo_dicas: string | null
  created_at?: string
}
