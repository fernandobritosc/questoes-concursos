import { type StudyMaterialMetadata } from '../services/studyMaterial.service'
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Award,
  AlertTriangle,
  ShieldAlert,
  FileText,
  BookOpen,
  Trash2,
  Upload,
  Play,
  Layers
} from 'lucide-react'

export interface SubTopicData {
  nome: string
  totalQuestoes: number
  totalTentativas: number
  acertos: number
  erros: number
  taxaAcerto: number
  status: 'excelente' | 'atencao' | 'critico' | 'nao_estudado'
}

export interface SubjectData {
  nome: string
  totalQuestoes: number
  totalTentativas: number
  acertos: number
  erros: number
  taxaAcerto: number
  assuntos: SubTopicData[]
}

interface MapaMateriaAccordionProps {
  subjects: SubjectData[]
  expandedSubjects: Record<string, boolean>
  onToggleSubject: (name: string) => void
  uploadingKey: string | null
  materialsMetadata: Record<string, StudyMaterialMetadata>
  onUploadPdf: (materia: string, assunto: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onOpenPdf: (materia: string, assunto: string) => void
  onDeletePdf: (materia: string, assunto: string) => void
  onRevisar: (materia: string, assunto: string) => void
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function MapaMateriaAccordion({
  subjects,
  expandedSubjects,
  onToggleSubject,
  uploadingKey,
  materialsMetadata,
  onUploadPdf,
  onOpenPdf,
  onDeletePdf,
  onRevisar
}: MapaMateriaAccordionProps) {
  const firstExpandedSubject = subjects.find(s => expandedSubjects[s.nome])

  return (
    <div className="space-y-4">

      {subjects.map((subject) => {
        const isExpanded = expandedSubjects[subject.nome]
        const resolvidosCount = subject.assuntos.filter(a => a.totalTentativas > 0).length
        const totalAssuntosSubject = subject.assuntos.length
        const isFirstExpanded = firstExpandedSubject?.nome === subject.nome

        return (
          <div key={subject.nome} className="bg-card/25 border border-border/80 rounded-2xl overflow-hidden shadow-xxs transition-all">

            {/* Capsula Principal / Accordion Header */}
            <div
              onClick={() => onToggleSubject(subject.nome)}
              className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-card/45 ${isExpanded ? 'bg-muted/30 border-b border-border/80' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-extrabold text-foreground truncate max-w-lg">
                    {subject.nome}
                  </h2>

                  {/* Badge de Resumo de Desempenho da Matéria */}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {resolvidosCount} / {totalAssuntosSubject} Tópicos
                  </span>

                  {subject.totalTentativas > 0 && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      subject.taxaAcerto >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : subject.taxaAcerto >= 50
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      Aproveitamento: {subject.taxaAcerto}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                  {subject.totalQuestoes} {subject.totalQuestoes === 1 ? 'questão disponível' : 'questões disponíveis'} • {subject.totalTentativas} tentativas no histórico
                </p>
              </div>

              <div className="ml-4 text-muted-foreground hover:text-foreground transition-colors">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Grid Expansível de Quadradinhos / Sub-tópicos */}
            {isExpanded && (
              <div className="p-6 bg-card/10 animate-in slide-in-from-top-2 duration-300 space-y-5">
                {/* Legenda dos Níveis de Aproveitamento - Apenas no primeiro card expandido */}
                {isFirstExpanded && (
                  <div className="bg-card/45 border border-border/80 p-4 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start">
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-emerald-400" /> Excelência (&gt;= 80%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30 border border-amber-400" /> Regular (50% a 79%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30 border border-rose-400" /> Crítico (&lt; 50%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-zinc-500 shadow-sm shadow-zinc-500/30 border border-zinc-400" /> Não Resolvido</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                  {subject.assuntos.map((assunto) => {
                    // Cores e ícones baseados no status de acerto
                    let cardBorder = 'border-border/60 hover:border-zinc-500/40'
                    let statusBadge = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    let statusText = 'Não Resolvido'
                    let Icon = HelpCircle
                    let tooltipText = 'Não Resolvido: nenhuma questão resolvida'

                    if (assunto.status === 'excelente') {
                      cardBorder = 'border-l-4 border-l-emerald-500 hover:border-emerald-500/40'
                      statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      statusText = `Excelente (${assunto.taxaAcerto}%)`
                      Icon = Award
                      tooltipText = 'Excelência: >= 80% de acerto'
                    } else if (assunto.status === 'atencao') {
                      cardBorder = 'border-l-4 border-l-amber-500 hover:border-amber-500/40'
                      statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      statusText = `Regular (${assunto.taxaAcerto}%)`
                      Icon = AlertTriangle
                      tooltipText = 'Regular: 50% a 79% de acerto'
                    } else if (assunto.status === 'critico') {
                      cardBorder = 'border-l-4 border-l-rose-500 hover:border-rose-500/40'
                      statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      statusText = `Crítico (${assunto.taxaAcerto}%)`
                      Icon = ShieldAlert
                      tooltipText = 'Crítico: < 50% de acerto'
                    }

                    const key = `${subject.nome} | ${assunto.nome}`
                    const material = materialsMetadata[key]
                    const isUploading = uploadingKey === key

                    return (
                      <div
                        key={assunto.nome}
                        className={`bg-card border p-4 rounded-xl flex flex-col justify-between space-y-4 shadow-xxs transition-all ${cardBorder}`}
                      >
                        <div className="space-y-2">
                          {/* Nome do Assunto */}
                          <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2" title={assunto.nome}>
                            {assunto.nome}
                          </h3>

                          {/* Info de Métricas e Performance */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 cursor-help transition-all duration-200 ${statusBadge}`}
                              title={tooltipText}
                            >
                              <Icon className="w-3 h-3" />
                              {statusText}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Medidor de cobertura */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                              <span>{assunto.totalTentativas} tentativas</span>
                              <span>{assunto.acertos} acertos</span>
                            </div>

                            {/* Barra de progresso visual */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  assunto.status === 'excelente'
                                    ? 'bg-emerald-500'
                                    : assunto.status === 'atencao'
                                      ? 'bg-amber-500'
                                      : assunto.status === 'critico'
                                        ? 'bg-rose-500'
                                        : 'bg-zinc-500'
                                }`}
                                style={{ width: `${assunto.totalTentativas > 0 ? assunto.taxaAcerto : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Seção de Material de Estudo (PDF com Compressão) */}
                          <div className="border-t border-border/40 pt-3 mt-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3 text-violet-400" />
                                Material de Estudo
                              </span>
                              {material && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={`Original: ${formatSize(material.originalSize)} | Compactado: ${formatSize(material.compressedSize)}`}>
                                  {Math.round(((material.originalSize - material.compressedSize) / material.originalSize) * 100)}% menor
                                </span>
                              )}
                            </div>

                            {material ? (
                              <div className="flex items-center gap-1.5">
                                {/* Botão de abrir PDF */}
                                <button
                                  onClick={() => onOpenPdf(subject.nome, assunto.nome)}
                                  disabled={isUploading}
                                  className="flex-1 py-1.5 px-3 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all cursor-pointer disabled:opacity-50"
                                  title={`Arquivo compactado: ${material.fileName} (${formatSize(material.compressedSize)})`}
                                >
                                  {isUploading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-violet-400 rounded-full animate-spin" />
                                  ) : (
                                    <BookOpen className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isUploading ? 'Processando...' : 'Estudar PDF'}</span>
                                </button>

                                {/* Botão de Excluir */}
                                <button
                                  onClick={() => onDeletePdf(subject.nome, assunto.nome)}
                                  className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
                                  title="Remover Material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label
                                  className="w-full py-1.5 px-3 rounded-lg border border-dashed border-border/80 hover:border-violet-500/40 hover:bg-violet-500/5 text-[10px] font-extrabold text-muted-foreground hover:text-violet-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  {isUploading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-violet-400 rounded-full animate-spin" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isUploading ? 'Compactando...' : 'Adicionar PDF'}</span>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => onUploadPdf(subject.nome, assunto.nome, e)}
                                    disabled={isUploading}
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Botão integrado de Revisar Assunto */}
                          <button
                            onClick={() => onRevisar(subject.nome, assunto.nome)}
                            className="w-full py-2 px-3 rounded-lg text-xxs font-black uppercase tracking-wider flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-750 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Revisar Assunto</span>
                          </button>
                        </div>

                      </div>
                    )
                  })}

                </div>
              </div>
            )}

          </div>
        )
      })}

      {subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card/25 border border-border border-dashed rounded-2xl">
          <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-base font-bold text-foreground">Nenhuma questão cadastrada no banco</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Importe seus cadernos de PDF do TEC Concursos para carregar o seu mapa de desempenho.
          </p>
        </div>
      )}

    </div>
  )
}
