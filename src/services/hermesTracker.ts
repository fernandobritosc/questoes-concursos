const RELAY_URL = import.meta.env.VITE_HERMES_RELAY_URL || 'http://127.0.0.1:3333'

export type DadosQuestao = {
  questao_id: number
  questao_tec_id?: number | null
  materia: string | null
  assunto: string | null
  banca_texto: string | null
  gabarito: string | null
  alternativa_selecionada: string | null
  acertou: boolean
  tempo_segundos: number
}

export type HermesEventPayload = {
  responder_questao: DadosQuestao
  gerar_caderno: { quantidade: number; total_filtros: number }
  editar_questao: { questao_id?: number; campos: string[] }
  gerar_explicacao_ia: { questao_id?: number; materia?: string | null; assunto?: string | null }
  importar_pdf: { questoes: number }
  iniciar_simulado: { qtd_questoes: number; tempo_minutos: number }
  finalizar_simulado: { acertos: number; total: number; taxa: number }
  revisar_questao: DadosQuestao
  classificar_revisao: { questao_id?: number; grade: number }
  alternar_tarefa: { index: number; concluida: boolean }
}

export type HermesEventType = keyof HermesEventPayload

let counter = 0

export function trackEvent<T extends HermesEventType>(tipo: T, dados: HermesEventPayload[T]) {
  const evento = {
    id: `evt_${Date.now()}_${++counter}`,
    tipo,
    dados,
    timestamp: new Date().toISOString(),
  }

  fetch(`${RELAY_URL}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
    keepalive: true,
  }).catch(() => {
    /* relay offline — silent fail */
  })
}
