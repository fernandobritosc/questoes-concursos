import { useState, useMemo } from 'react'
import { Activity, ChevronDown, ChevronUp } from 'lucide-react'

/* ──────────────── Componente StudyHeatmap (GitHub-style) ──────────────── */

interface DashboardStudyHeatmapProps {
  resolucoes: Array<{ alternativa: string | null; data_resolucao: string }>
}

export function DashboardStudyHeatmap({ resolucoes }: DashboardStudyHeatmapProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 1. Agrupar resoluções válidas por dia (formato local AAAA-MM-DD)
  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    resolucoes.forEach(r => {
      if (r.alternativa && r.alternativa !== '' && r.data_resolucao) {
        const d = new Date(r.data_resolucao)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const dateKey = `${year}-${month}-${day}`
        map.set(dateKey, (map.get(dateKey) || 0) + 1)
      }
    })
    return map
  }, [resolucoes])

  // 2. Calcular o intervalo de 365 dias terminando hoje e alinhando no domingo inicial
  const { diasGrid, mesesRotulos } = useMemo(() => {
    const hoje = new Date()
    // Data de 364 dias atrás
    const dataInicial = new Date(hoje)
    dataInicial.setDate(hoje.getDate() - 364)

    // Retroceder até o domingo anterior da data inicial para alinhar o grid vertical
    const diaSemanaInicial = dataInicial.getDay()
    dataInicial.setDate(dataInicial.getDate() - diaSemanaInicial)

    const dias = []
    const mesesMap = new Map<number, { label: string; index: number }>()

    const temp = new Date(dataInicial)
    let indexColuna = 0

    while (temp <= hoje) {
      const year = temp.getFullYear()
      const month = temp.getMonth()
      const monthStr = temp.toLocaleString('pt-BR', { month: 'short' })
      const day = String(temp.getDate()).padStart(2, '0')
      const formattedMonth = String(month + 1).padStart(2, '0')
      const dateKey = `${year}-${formattedMonth}-${day}`
      const count = porDia.get(dateKey) || 0

      // Registrar meses para rótulos na primeira linha (Domingo) da coluna
      if (temp.getDay() === 0) {
        if (!mesesMap.has(month) || temp.getDate() <= 7) {
          mesesMap.set(month, { label: monthStr.charAt(0).toUpperCase() + monthStr.slice(1, 3), index: indexColuna })
        }
      }

      dias.push({
        dataKey: dateKey,
        dataObj: new Date(temp),
        count,
        level: getContributionLevel(count)
      })

      if (temp.getDay() === 6) {
        indexColuna++
      }

      temp.setDate(temp.getDate() + 1)
    }

    return {
      diasGrid: dias,
      mesesRotulos: Array.from(mesesMap.values()).sort((a, b) => a.index - b.index)
    }
  }, [porDia])

  // 3. Determinar o nível de cor baseado na quantidade de questões
  function getContributionLevel(count: number): number {
    if (count === 0) return 0
    if (count < 5) return 1
    if (count < 10) return 2
    if (count < 20) return 3
    return 4
  }

  // Cores do tema Violeta Premium
  const levelClasses = [
    'bg-muted/40 border border-border/50 hover:bg-muted/70 dark:bg-white/[0.02] dark:border-white/[0.03] dark:hover:bg-white/[0.08]',
    'bg-violet-100 border border-violet-200 hover:bg-violet-200 dark:bg-violet-900/35 dark:border-violet-500/10 dark:hover:bg-violet-900/50',
    'bg-violet-300 border border-violet-400 hover:bg-violet-400 dark:bg-violet-700/55 dark:border-violet-500/30 dark:hover:bg-violet-700/70',
    'bg-violet-500/75 border border-violet-400 hover:bg-violet-500/90 dark:bg-violet-500/75 dark:border-violet-400/50',
    'bg-violet-600 border border-violet-500 hover:bg-violet-700 dark:bg-violet-400 dark:border-violet-300 hover:brightness-110 shadow-[0_0_8px_rgba(167,139,250,0.3)]'
  ]

  // Agrupar dias em colunas (semanas) de 7 elementos
  const colunasSemanas = useMemo(() => {
    const colunas = []
    for (let i = 0; i < diasGrid.length; i += 7) {
      colunas.push(diasGrid.slice(i, i + 7))
    }
    return colunas
  }, [diasGrid])

  return (
    <div className="glass-card flex flex-col animate-fade-in-up col-span-full transition-all duration-300">
      {/* Header bar - Clickable to toggle collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-5 flex items-center justify-between shrink-0 flex-wrap gap-3 cursor-pointer select-none ${
          isExpanded ? 'border-b border-border/50 dark:border-white/[0.04]' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-foreground">Consistência e Frequência de Estudos</h3>
          <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full shrink-0 ml-1.5">
            Últimos 365 Dias
          </span>
        </div>

        <div className="flex items-center gap-4 text-xxs text-muted-foreground">
          {/* Legenda de Níveis - Apenas visível quando expandido */}
          {isExpanded && (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <span>Menos</span>
              {levelClasses.map((cls, idx) => (
                <span key={idx} className={`w-2.5 h-2.5 rounded-xs ${cls.split(' ')[0]} ${cls.split(' ')[1]}`} />
              ))}
              <span>Mais</span>
            </div>
          )}

          {/* Botão Indicador Expandir/Recolher */}
          <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all px-2.5 py-1.5 rounded-lg bg-muted border border-border/65 hover:bg-muted/80 dark:bg-white/[0.03] dark:border-white/[0.05] dark:hover:bg-white/[0.06]">
            {isExpanded ? (
              <>
                <span className="uppercase tracking-wider">Ocultar</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="uppercase tracking-wider">Visualizar</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Grid - Visível apenas quando expandido */}
      {isExpanded && (
        <div className="p-5 flex flex-1 overflow-x-auto min-h-0 py-4 scrollbar-thin select-none animate-fade-in-up">
          <div className="flex gap-1.5 flex-1 min-w-max">
            {/* Rótulos dos Dias da Semana */}
            <div className="grid grid-rows-7 text-[9px] text-muted-foreground/60 font-bold w-7 pt-4 pr-1 shrink-0 select-none">
              <span className="row-start-2 leading-none">Ter</span>
              <span className="row-start-4 leading-none">Qui</span>
              <span className="row-start-6 leading-none">Sáb</span>
            </div>

            {/* Grid Principal do Heatmap */}
            <div className="flex flex-col flex-1">
              {/* Rótulos dos Meses */}
              <div className="relative h-4 text-[9px] text-muted-foreground/60 font-extrabold select-none mb-1">
                {mesesRotulos.map((m, idx) => (
                  <span
                    key={idx}
                    className="absolute"
                    style={{ left: `${m.index * 13}px` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Grid de Quadradinhos agrupados em Colunas (Semanas) */}
              <div className="flex gap-1">
                {colunasSemanas.map((semana, colIdx) => (
                  <div key={colIdx} className="grid grid-rows-7 gap-1">
                    {semana.map((dia) => {
                      const dataFormatada = dia.dataObj.toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                      const qDesc = dia.count === 1 ? 'questão' : 'questões'
                      const tooltipText = `${dia.count} ${qDesc} em ${dataFormatada}`

                      return (
                        <div
                          key={dia.dataKey}
                          className={`w-2.5 h-2.5 rounded-xs transition-colors duration-150 relative group cursor-pointer ${levelClasses[dia.level]}`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-slate-950/95 backdrop-blur-md border border-border/60 dark:border-white/10 text-white font-extrabold text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap">
                              {tooltipText}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
