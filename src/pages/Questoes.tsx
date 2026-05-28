import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuestoes } from '../hooks/useQuestoes'
import { ImportPdfModal } from '../components/ImportPdfModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import type { HistoricoResolucao } from '../types/database'
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Copy, 
  Check, 
  ExternalLink, 
  BrainCircuit, 
  Loader2,
  Trash2,
  Layers,
  GraduationCap,
  Search,
  X,
  Printer,
  List,
  Shuffle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  Pencil,
  PieChart,
  MoreVertical,
  Book,
  ChevronDown,
  ChevronUp,
  Upload
} from 'lucide-react'

export function Questoes() {
  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')
  const [organizarPor, setOrganizarPor] = useState('materia_assunto')
  const [exibirPor, setExibirPor] = useState<'indice' | 'quantidade'>('quantidade')

  const [customOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('caderno_materias_assuntos_ordem')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const ORGANIZAR_OPTIONS = [
    { id: 'materia_assunto', label: 'Matéria e Assunto', levels: ['materia', 'assunto'] },
    { id: 'materia', label: 'Matéria', levels: ['materia'] },
    { id: 'assunto', label: 'Assunto', levels: ['assunto'] },
    { id: 'banca', label: 'Banca', levels: ['banca_texto'] },
    { id: 'banca_ano', label: 'Banca e Ano', levels: ['banca_texto', 'ano'] },
    { id: 'ano', label: 'Ano', levels: ['ano'] },
    { id: 'orgao', label: 'Órgão', levels: ['orgao'] },
  ]

  const {
    resolucoes,
    setResolucoes,
    loading,
    cadernoQuestoes,
    setCadernoQuestoes,
    currentQuestaoIndex,
    setCurrentQuestaoIndex,
    alternativaSelecionada,
    setAlternativaSelecionada,
    revelado,
    setRevelado,
    explicacoes,
    loadingExplicacao,
    copiedId,
    editingResolucao,
    setEditingResolucao,
    resolucaoText,
    setResolucaoText,
    resolucaoExpanded,
    setResolucaoExpanded,
    savingResolucao,
    isImportModalOpen,
    setIsImportModalOpen,
    handleCopy,
    handleExplicacaoIA,
    handleSaveResolucao,
    tempoSegundos,
    salvandoResposta,
    historicoQuestaoAtiva,
    loadingHistoricoAtivo,
    handleConfirmarResposta,
  } = useQuestoes()

  const statsTotal = historicoQuestaoAtiva?.length || 0
  const statsAcertos = historicoQuestaoAtiva?.filter(h => h.acertou).length || 0
  const statsErros = statsTotal - statsAcertos
  const statsTaxaAcerto = statsTotal > 0 ? Math.round((statsAcertos / statsTotal) * 100) : 0
  const statsRadius = 28
  const statsCircumference = 2 * Math.PI * statsRadius
  const statsStrokeDashoffset = statsCircumference - (statsTaxaAcerto / 100) * statsCircumference

  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('id')

  useEffect(() => {
    if (targetId && cadernoQuestoes.length > 0) {
      const idNum = parseInt(targetId, 10)
      const index = cadernoQuestoes.findIndex(q => q.questao_tec_id === idNum)
      if (index !== -1) {
        setCurrentQuestaoIndex(index)
        setTopTab('questoes')
        setSearchParams({}, { replace: true })
      }
    }
  }, [targetId, cadernoQuestoes, setCurrentQuestaoIndex, setSearchParams])

  const [filtros, setFiltros] = useState<Record<string, string> | null>(null)
  
  const questoesExibidas = useMemo(() => {
    if (!filtros) return cadernoQuestoes;
    return cadernoQuestoes.filter(q => {
      for (const [key, val] of Object.entries(filtros)) {
        if (String((q as any)[key] || `Sem ${key}`) !== val) return false;
      }
      return true;
    })
  }, [cadernoQuestoes, filtros])
  
  const handleNodeClick = (nodeName: string, levelIndex: number, parentNames: string[]) => {
    const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0];
    const levels = currentOption.levels;
    
    const newFiltros: Record<string, string> = {};
    for (let i = 0; i < levelIndex; i++) {
      newFiltros[levels[i]] = parentNames[i];
    }
    newFiltros[levels[levelIndex]] = nodeName;
    
    setFiltros(newFiltros);
    setCurrentQuestaoIndex(0);
    setTopTab('questoes');
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 animate-in fade-in duration-300 overflow-hidden print:hidden">
        
        {/* Top Tabs Header Estilo TEC */}
        <div className="bg-card border-b border-border px-4 flex items-center justify-between text-xs sm:text-sm font-bold text-muted-foreground select-none shrink-0 shadow-xxs">
          <div className="flex items-center justify-start overflow-x-auto scrollbar-none flex-1">
            <button
              onClick={() => setTopTab('questoes')}
              className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${topTab === 'questoes' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Questões
            </button>
            <button
              onClick={() => setTopTab('indice')}
              className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${topTab === 'indice' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
            >
              <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Índice
            </button>
            <button
              onClick={() => setTopTab('estatisticas')}
              className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${topTab === 'estatisticas' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
            >
              <PieChart className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Estatísticas
            </button>
            <button
              onClick={() => setTopTab('gabarito')}
              className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${topTab === 'gabarito' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
            >
              <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Gabarito
            </button>
            <button
              onClick={() => window.print()}
              className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap hidden sm:flex cursor-pointer active:scale-95 duration-100"
            >
              <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Imprimir
            </button>
          </div>
        
        {/* Botão de Importar sempre visível à direita se houver questões */}
        {cadernoQuestoes.length > 0 && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="my-2 ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-xxs font-black transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar PDF</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {topTab === 'questoes' && (
          <div className="w-full max-w-5xl mx-auto">
            {cadernoQuestoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
                <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Importe um PDF do TEC Concursos para ver questões.
                </p>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-sm font-bold transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Importar PDF do TEC
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto pb-12">
          
          {/* Card Central do Visualizador */}
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            
            {/* 1. Cabeçalho Principal: Questão X de Y & Ícones de Ação */}
            <div className="p-5 border-b border-border bg-card flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                <GraduationCap className="w-5.5 h-5.5 text-primary" />
                Questão {currentQuestaoIndex + 1} de {cadernoQuestoes.length}
              </h3>

              {/* 7 ícones de ação da direita exatamente como o TEC Concursos */}
              <div className="flex items-center gap-3 text-muted-foreground/80">
                <button className="hover:text-foreground transition-colors p-1" title="Visualizar Teoria/Aula Relacionada">
                  <GraduationCap className="w-5.5 h-5.5" />
                </button>
                <button className="hover:text-red-500 transition-colors p-1" title="Adicionar ao meu Caderno de Teoria">
                  <Book className="w-5 h-5 text-red-500/80 fill-red-50" />
                </button>
                <button className="hover:text-sky-500 transition-colors p-1 flex items-center relative" title="Comentários dos alunos">
                  <MessageSquare className="w-5 h-5 text-sky-500/80 fill-sky-50" />
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">3</span>
                </button>
                <button className="hover:text-yellow-500 transition-colors p-1" title="Marcar como Favorita">
                  <Star className="w-5 h-5 text-amber-500/80 hover:fill-amber-400" />
                </button>
                <button className="hover:text-purple-500 transition-colors p-1" title="Anotações e Rasuras">
                  <Pencil className="w-5 h-5 text-purple-500/80" />
                </button>
                <button className="hover:text-teal-500 transition-colors p-1" title="Estatísticas globais e taxas de acerto">
                  <PieChart className="w-5 h-5 text-teal-500/80" />
                </button>
                <button className="hover:text-foreground transition-colors p-1" title="Outros recursos">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Caminho/Crumbs links azuis estilo TEC */}
            <div className="bg-muted px-6 py-2.5 border-b border-border flex flex-wrap items-center gap-2 text-xxs font-bold">
              <span className="text-muted-foreground uppercase tracking-wide">Estudo</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-primary hover:underline cursor-pointer">
                {questoesExibidas[currentQuestaoIndex].materia}
              </span>
              {questoesExibidas[currentQuestaoIndex].assunto && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
                    {questoesExibidas[currentQuestaoIndex].assunto}
                    <button className="text-red-500 hover:text-red-700 p-0.5 ml-1">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                </>
              )}
            </div>

            {/* 3. Barra Sub-header de dados do Concurso com navegação integrada */}
            <div className="bg-muted mx-6 mt-5 p-3 rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xxs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground font-bold">
                
                {/* ID da questão em azul, clicável (TEC Link) e copiável */}
                <button
                  onClick={() => handleCopy(questoesExibidas[currentQuestaoIndex].questao_tec_id)}
                  className="text-primary font-black hover:underline flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded shadow-xxs"
                  title="Copiar ID da Questão"
                >
                  {copiedId === questoesExibidas[currentQuestaoIndex].questao_tec_id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span>Q{questoesExibidas[currentQuestaoIndex].questao_tec_id}</span>
                </button>

                {/* Ícone de redirecionamento externo para o TEC */}
                <a
                  href={`https://www.tecconcursos.com.br/questoes/${questoesExibidas[currentQuestaoIndex].questao_tec_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-1 border-r border-border pr-2"
                  title="Abrir diretamente no site oficial do TEC Concursos"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <span className="text-primary uppercase font-black tracking-wide ml-1">
                  {questoesExibidas[currentQuestaoIndex].banca_texto}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-semibold">{questoesExibidas[currentQuestaoIndex].ano}</span>
                
                {questoesExibidas[currentQuestaoIndex].orgao && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground font-extrabold">{questoesExibidas[currentQuestaoIndex].orgao}</span>
                  </>
                )}
                
                {questoesExibidas[currentQuestaoIndex].concurso && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground font-semibold truncate max-w-[280px]" title={questoesExibidas[currentQuestaoIndex].concurso}>
                      {questoesExibidas[currentQuestaoIndex].concurso}
                    </span>
                  </>
                )}
              </div>

              {/* Setas direcionais no mesmo bloco subheader */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto border-l border-border/80 pl-3">
                <button
                  disabled={currentQuestaoIndex === 0}
                  onClick={() => {
                    setCurrentQuestaoIndex(prev => prev - 1)
                    setAlternativaSelecionada(null)
                    setRevelado(false)
                  }}
                  className="w-7 h-7 flex items-center justify-center border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground shadow-xxs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentQuestaoIndex === questoesExibidas.length - 1}
                  onClick={() => {
                    setCurrentQuestaoIndex(prev => prev + 1)
                    setAlternativaSelecionada(null)
                    setRevelado(false)
                  }}
                  className="w-7 h-7 flex items-center justify-center border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground shadow-xxs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4. Enunciado (Padded, legibilidade excelente) */}
            <div className="px-6 py-6 md:p-8 space-y-6">
              <p className="text-foreground leading-relaxed text-sm font-medium whitespace-pre-line bg-card rounded-lg selection:bg-primary/20">
                {questoesExibidas[currentQuestaoIndex].enunciado}
              </p>

              {/* 5. Alternativas Dispostas como Barras de Largura Total */}
              {questoesExibidas[currentQuestaoIndex].alternativas && (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {Object.entries(questoesExibidas[currentQuestaoIndex].alternativas)
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                    .map(([letra, texto]) => {
                      const isSelected = alternativaSelecionada === letra
                      const isCorrect = questoesExibidas[currentQuestaoIndex].gabarito === letra

                      let barStyles = "border-border hover:border-border bg-card"
                      let circleStyles = "bg-muted text-muted-foreground font-bold border border-border"
                      
                      if (revelado) {
                        if (isCorrect) {
                          barStyles = "border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 font-bold"
                          circleStyles = "bg-emerald-500 text-white font-extrabold border border-emerald-600 animate-pulse"
                        } else if (isSelected && !isCorrect) {
                          barStyles = "border-red-500 bg-red-50/50 hover:bg-red-50"
                          circleStyles = "bg-red-500 text-white font-extrabold border border-red-600"
                        } else {
                          barStyles = "border-border opacity-55 bg-card"
                          circleStyles = "bg-muted text-muted-foreground font-semibold border border-border"
                        }
                      } else if (isSelected) {
                        barStyles = "border-[#1976d2] bg-blue-50/30 font-bold shadow-xxs ring-1 ring-[#1976d2]"
                        circleStyles = "bg-primary text-white font-black border border-[#1565c0]"
                      }

                      return (
                        <button
                          key={letra}
                          disabled={revelado}
                          onClick={() => setAlternativaSelecionada(letra)}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left text-xs transition-all duration-200 leading-relaxed group cursor-pointer ${barStyles}`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${circleStyles}`}>
                            {letra}
                          </span>
                          <span className="flex-1 mt-0.5 text-foreground font-medium group-hover:text-foreground">{String(texto)}</span>
                        </button>
                      )
                    })
                  }
                </div>
              )}
            </div>

            {/* 6. Resolver Questão e Explicação IA no Rodapé do Card */}
            <div className="bg-muted/70 p-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 flex-wrap">
                {!revelado ? (
                  <button
                    disabled={!alternativaSelecionada || salvandoResposta}
                    onClick={handleConfirmarResposta}
                    className={`px-6 py-2.5 rounded-lg text-xs font-black shadow-sm transition-all uppercase tracking-wider flex items-center gap-2 ${
                      alternativaSelecionada 
                        ? 'bg-[#00c853] hover:bg-[#00b0ff] text-white cursor-pointer active:scale-98' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                  >
                    {salvandoResposta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    RESOLVER QUESTÃO
                  </button>
                ) : (
                  <span className="text-xs font-black flex items-center gap-1.5">
                    {alternativaSelecionada === questoesExibidas[currentQuestaoIndex].gabarito ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-emerald-600 uppercase tracking-wide">Você acertou!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-650 uppercase tracking-wide">Você errou!</span>
                      </>
                    )}
                  </span>
                )}
                
                <button
                  onClick={() => handleExplicacaoIA(questoesExibidas[currentQuestaoIndex])}
                  disabled={loadingExplicacao === questoesExibidas[currentQuestaoIndex].id}
                  className="flex items-center gap-1.5 bg-primary/20 hover:bg-primary/20 text-primary font-black px-4 py-2.5 rounded-lg text-xxs transition-all border border-[#1976d2]/20 shadow-xxs active:scale-98 cursor-pointer"
                >
                  {loadingExplicacao === questoesExibidas[currentQuestaoIndex].id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Me Explique (IA)</span>
                </button>
              </div>

              {/* Cronômetro de Resolução */}
              <div className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide border shadow-xxs self-start sm:self-auto bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1.5 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Tempo Gasto: {Math.floor(tempoSegundos / 60)}m {tempoSegundos % 60}s</span>
              </div>
            </div>

          </div>

          {/* Painel Meu Desempenho Relacional */}
          <MeuDesempenho // @ts-ignore
            historico={historicoQuestaoAtiva} loading={loadingHistoricoAtivo} />

          {/* Card de Resolução do Professor */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div 
              onClick={() => setResolucaoExpanded(!resolucaoExpanded)}
              className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Book className="w-5 h-5 text-amber-500 fill-amber-100" />
                <span>Resolução do Professor</span>
              </div>
              <div className="flex items-center gap-3">
                {resolucaoExpanded && !editingResolucao && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingResolucao(true)
                    }}
                    className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-muted/60 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Editar Resolução"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                )}
                <span className="text-muted-foreground text-xs font-bold">
                  {resolucaoExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
                </span>
              </div>
            </div>

            {/* Content */}
            {resolucaoExpanded && (
              <div className="p-6 space-y-4 animate-in fade-in duration-200">
                {editingResolucao ? (
                  <div className="space-y-3">
                    <textarea
                      value={resolucaoText}
                      onChange={(e) => setResolucaoText(e.target.value)}
                      placeholder="Digite a resolução detalhada do professor para esta questão..."
                      className="w-full min-h-[180px] p-3 text-xs border border-border rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] bg-card font-medium text-foreground shadow-inner resize-y leading-relaxed"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setResolucaoText(questoesExibidas[currentQuestaoIndex].resolucao_professor || '')
                          setEditingResolucao(false)
                        }}
                        disabled={savingResolucao}
                        className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveResolucao}
                        disabled={savingResolucao}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {savingResolucao ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-foreground leading-relaxed text-xs font-semibold">
                    {resolucaoText ? (
                      <MarkdownAI text={resolucaoText} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2 border border-dashed border-border rounded-lg bg-muted/30">
                        <Book className="w-8 h-8 text-muted-foreground" />
                        <span className="text-[11px] font-bold">Nenhuma resolução cadastrada para esta questão.</span>
                        <button
                          onClick={() => setEditingResolucao(true)}
                          className="mt-1 flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/20 border border-[#1976d2]/20 text-primary rounded-lg text-xxs font-extrabold transition-all"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Adicionar Resolução</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. Caixa de Análise do Mentor IA */}
          {explicacoes[questoesExibidas[currentQuestaoIndex].id!] && (
            <div className="bg-blue-50/30 border border-border/80 rounded-xl p-6 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <span>Explicação do Professor IA</span>
              </div>
              <div className="text-foreground leading-relaxed text-sm max-w-none">
                <MarkdownAI text={explicacoes[questoesExibidas[currentQuestaoIndex].id!]} />
              </div>
            </div>
          )}

          {/* 8. Barra de navegação inferior estilo TEC */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-2">
              <button
                disabled={currentQuestaoIndex === 0}
                onClick={() => {
                  setCurrentQuestaoIndex(prev => prev - 1)
                  setAlternativaSelecionada(null)
                  setRevelado(false)
                }}
                className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted text-xxs font-black transition-colors rounded-lg shadow-xxs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 uppercase tracking-wider"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              
              <button
                disabled={currentQuestaoIndex === questoesExibidas.length - 1}
                onClick={() => {
                  setCurrentQuestaoIndex(prev => prev + 1)
                  setAlternativaSelecionada(null)
                  setRevelado(false)
                }}
                className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted text-xxs font-black transition-colors rounded-lg shadow-xxs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 uppercase tracking-wider"
              >
                Próxima
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const randomIndex = Math.floor(Math.random() * questoesExibidas.length)
                  setCurrentQuestaoIndex(randomIndex)
                  setAlternativaSelecionada(null)
                  setRevelado(false)
                }}
                className="p-2 bg-card border border-border hover:bg-muted text-muted-foreground rounded-lg shadow-xxs flex items-center gap-1 text-xxs font-black uppercase tracking-wide"
                title="Ir para uma questão aleatória do caderno"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Aleatório</span>
              </button>
              
              <button 
                onClick={() => {
                  setAlternativaSelecionada(null)
                  setRevelado(false)
                }}
                className="p-2 bg-card border border-border hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-lg shadow-xxs flex items-center gap-1 text-xxs font-black uppercase tracking-wide"
                title="Limpar resolução atual"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

        </div>
            )}
          </div>
        )}

        {topTab === 'estatisticas' && (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {cadernoQuestoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
                <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
                <p className="text-sm text-muted-foreground">Importe um PDF para ver as estatísticas.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-12">
                {/* Cabeçalho da Questão Ativa */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xxs font-black text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md">Questão Ativa</span>
                    <h4 className="text-sm font-black text-foreground mt-3">
                      Q{questoesExibidas[currentQuestaoIndex]?.questao_tec_id} — {questoesExibidas[currentQuestaoIndex]?.banca_texto} ({questoesExibidas[currentQuestaoIndex]?.ano})
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">
                      {questoesExibidas[currentQuestaoIndex]?.materia} {questoesExibidas[currentQuestaoIndex]?.assunto && `> ${questoesExibidas[currentQuestaoIndex]?.assunto}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setTopTab('questoes')}
                    className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-xxs active:scale-95 duration-100 cursor-pointer"
                  >
                    Voltar para a Questão
                  </button>
                </div>

                {/* Estatísticas Gerais */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted border-b border-border flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                    <PieChart className="w-5 h-5 text-teal-500 fill-teal-50" />
                    <span>Desempenho nesta Questão</span>
                  </div>

                  {loadingHistoricoAtivo ? (
                    <div className="p-12 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : statsTotal === 0 ? (
                    <div className="p-8 flex items-center gap-3 text-muted-foreground text-xs font-semibold justify-center">
                      <PieChart className="w-5 h-5 text-muted-foreground/50" />
                      <span>Você ainda não resolveu esta questão. Sua primeira tentativa será registrada no histórico.</span>
                    </div>
                  ) : (
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Donut Chart */}
                        <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                          <div className="relative flex items-center justify-center w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r={statsRadius}
                                className="text-border"
                                strokeWidth="7"
                                stroke="currentColor"
                                fill="transparent"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r={statsRadius}
                                className="text-emerald-500 transition-all duration-500 ease-out"
                                strokeWidth="7"
                                strokeDasharray={statsCircumference}
                                strokeDashoffset={statsStrokeDashoffset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                              />
                            </svg>
                            <span className="absolute text-sm font-black text-foreground">{statsTaxaAcerto}%</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-xs font-bold text-foreground">Taxa de Acerto</h4>
                            <p className="text-xxs text-muted-foreground">
                              {statsAcertos} {statsAcertos === 1 ? 'acerto' : 'acertos'} e {statsErros} {statsErros === 1 ? 'erro' : 'erros'} de {statsTotal} {statsTotal === 1 ? 'tentativa' : 'tentativas'}
                            </p>
                          </div>
                        </div>

                        {/* Estatísticas Simples */}
                        <div className="grid grid-cols-2 gap-3 md:col-span-2">
                          <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Vezes Resolvida</span>
                            <span className="text-xl font-black text-foreground">{statsTotal} {statsTotal === 1 ? 'vez' : 'vezes'}</span>
                          </div>
                          <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Último Resultado</span>
                            <span className={`text-xs font-black uppercase tracking-wide ${historicoQuestaoAtiva[historicoQuestaoAtiva.length - 1]?.acertou ? 'text-emerald-600' : 'text-red-650'}`}>
                              {historicoQuestaoAtiva[historicoQuestaoAtiva.length - 1]?.acertou ? 'Acertou (Correto)' : 'Errou (Incorreto)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Histórico Cronológico */}
                      <div className="border border-border rounded-xl overflow-hidden bg-card">
                        <div className="px-5 py-3.5 bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Histórico de Tentativas
                        </div>
                        <div className="max-h-[250px] overflow-y-auto divide-y divide-border/60">
                          {historicoQuestaoAtiva.slice().reverse().map((tentativa, idx) => {
                            const data = new Date(tentativa.data_resolucao).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            const tempo = tentativa.tempo_segundos
                              ? `${Math.floor(tentativa.tempo_segundos / 60)}m ${tentativa.tempo_segundos % 60}s`
                              : 'N/D'

                            return (
                              <div key={tentativa.id || idx} className="px-6 py-3 flex items-center justify-between text-xxs font-semibold hover:bg-muted/10 transition-colors">
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">{data}</span>
                                  <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
                                    tentativa.acertou 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {tentativa.acertou ? 'Acertou' : 'Errou'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <span>Opção: <strong className="text-foreground">{tentativa.alternativa || 'N/A'}</strong></span>
                                  <span>Tempo: <strong className="text-foreground">{tempo}</strong></span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {topTab === 'gabarito' && (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {cadernoQuestoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
                <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
                <p className="text-sm text-muted-foreground">Importe um PDF para ver o gabarito.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-12">
                {/* Info Header */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xxs font-black text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-md">Gabarito Oficial</span>
                    <h4 className="text-sm font-black text-foreground mt-3">
                      Questão Q{questoesExibidas[currentQuestaoIndex]?.questao_tec_id}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">
                      {questoesExibidas[currentQuestaoIndex]?.materia} {questoesExibidas[currentQuestaoIndex]?.assunto && `> ${questoesExibidas[currentQuestaoIndex]?.assunto}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setTopTab('questoes')}
                    className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-xxs active:scale-95 duration-100 cursor-pointer"
                  >
                    Voltar para a Questão
                  </button>
                </div>

                {/* Big Answer Reveal Card */}
                <div className="bg-card border border-border rounded-xl p-8 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-3xl font-black text-emerald-500 shadow-lg shadow-emerald-500/10 animate-bounce">
                    {questoesExibidas[currentQuestaoIndex]?.gabarito}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">Alternativa Correta</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Veja abaixo o texto completo da opção oficial recomendada:</p>
                  </div>
                  
                  {/* Full Text of Correct Alternative */}
                  <div className="w-full max-w-2xl bg-emerald-500/[0.03] border border-emerald-500/20 p-5 rounded-xl text-left leading-relaxed text-xs text-foreground font-semibold mt-4">
                    {questoesExibidas[currentQuestaoIndex]?.gabarito ? (questoesExibidas[currentQuestaoIndex]?.alternativas?.[questoesExibidas[currentQuestaoIndex]?.gabarito as string] || 'Texto da alternativa não disponível.') : 'Texto da alternativa não disponível.'}
                  </div>
                </div>

                {/* Resolução do Professor e IA se disponível */}
                {(questoesExibidas[currentQuestaoIndex]?.resolucao_professor || explicacoes[questoesExibidas[currentQuestaoIndex]?.id!]) && (
                  <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5 text-primary" /> Explicação e Resolução
                    </h3>
                    
                    {questoesExibidas[currentQuestaoIndex]?.resolucao_professor && (
                      <div className="space-y-1">
                        <h4 className="text-xxs font-black uppercase text-amber-600">Comentário do Professor</h4>
                        <div className="text-xs text-foreground leading-relaxed mt-2">
                          <MarkdownAI text={questoesExibidas[currentQuestaoIndex]?.resolucao_professor} />
                        </div>
                      </div>
                    )}

                    {explicacoes[questoesExibidas[currentQuestaoIndex]?.id!] && (
                      <div className="space-y-1 pt-3 border-t border-border/60">
                        <h4 className="text-xxs font-black uppercase text-primary">Comentário do Mentor IA</h4>
                        <div className="text-xs text-foreground leading-relaxed mt-2">
                          <MarkdownAI text={explicacoes[questoesExibidas[currentQuestaoIndex]?.id!]} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {topTab === 'indice' && (
          <div className="w-full max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <div className="relative inline-block">
                  <span className="flex items-center gap-1">Organizar por: 
                    <select 
                      className="text-primary font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                      value={organizarPor}
                      onChange={(e) => setOrganizarPor(e.target.value)}
                    >
                      {ORGANIZAR_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="text-foreground">{opt.label}</option>)}
                    </select>
                  </span>
                </div>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">Ordenar questões por: <strong className="text-primary cursor-pointer">Data</strong></span>
                <span className="hidden sm:inline">|</span>
                <div className="relative inline-block hidden sm:inline">
                  <span className="flex items-center gap-1">Exibir questões por: 
                    <select 
                      className="text-primary font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                      value={exibirPor}
                      onChange={(e) => setExibirPor(e.target.value as 'indice' | 'quantidade')}
                    >
                      <option value="quantidade" className="text-foreground">Quantidade</option>
                      <option value="indice" className="text-foreground">Índice</option>
                    </select>
                  </span>
                </div>
              </div>
              <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Remover questões
              </button>
            </div>
            
            <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-3 text-xs font-bold text-primary">
              <button className="hover:underline flex items-center gap-1">
                <ChevronDown className="w-3.5 h-3.5" /> Expandir
              </button>
              <button className="hover:underline flex items-center gap-1">
                <ChevronUp className="w-3.5 h-3.5" /> Retrair
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-1">
              {(() => {
                const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0]
                const levels = currentOption.levels
                
                type Node = { name: string; count: number; children: Record<string, Node> }
                const root: Record<string, Node> = {}

                cadernoQuestoes.forEach(q => {
                  const level1Val = (q as any)[levels[0]] || `Sem ${levels[0]}`
                  const l1Str = String(level1Val)
                  
                  if (!root[l1Str]) {
                    root[l1Str] = { name: l1Str, count: 0, children: {} }
                  }
                  root[l1Str].count++

                  if (levels.length > 1) {
                    const level2Val = (q as any)[levels[1]] || `Sem ${levels[1]}`
                    const l2Str = String(level2Val)
                    if (!root[l1Str].children[l2Str]) {
                      root[l1Str].children[l2Str] = { name: l2Str, count: 0, children: {} }
                    }
                    root[l1Str].children[l2Str].count++
                  }
                })

                return Object.values(root).sort((a,b) => exibirPor === 'quantidade' ? b.count - a.count : a.name.localeCompare(b.name)).map((node1, idx1) => (
                  <div key={node1.name} className="text-sm">
                    <div 
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer"
                      onClick={() => handleNodeClick(node1.name, 0, [])}
                    >
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        {levels.length > 1 && <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                        {exibirPor === 'indice' ? <span className="text-muted-foreground mr-1">{idx1 + 1}.</span> : null}
                        {node1.name}
                      </div>
                      {exibirPor === 'quantidade' && (
                        <div className="text-muted-foreground flex gap-1 items-center">
                          <span className="text-foreground font-semibold">{node1.count}</span>
                          <span className="text-xs opacity-60">({((node1.count / (cadernoQuestoes.length || 1)) * 100).toFixed(2)}%)</span>
                        </div>
                      )}
                    </div>
                    
                    {levels.length > 1 && Object.keys(node1.children).length > 0 && (
                      <div className="pl-6 border-l-2 border-border/50 ml-4 mt-1 space-y-1 pb-2">
                        {Object.values(node1.children).sort((a, b) => {
                          if (exibirPor === 'indice') {
                            const savedOrder = customOrder[node1.name] || []
                            if (savedOrder.length > 0) {
                              let idxA = savedOrder.indexOf(a.name)
                              let idxB = savedOrder.indexOf(b.name)
                              if (idxA === -1) idxA = savedOrder.length
                              if (idxB === -1) idxB = savedOrder.length
                              if (idxA !== idxB) return idxA - idxB
                            }
                          }
                          return exibirPor === 'quantidade' ? b.count - a.count : a.name.localeCompare(b.name)
                        }).map((node2, idx2) => (
                          <div 
                            key={node2.name} 
                            className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeClick(node2.name, 1, [node1.name]);
                            }}
                          >
                            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                              <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
                              {exibirPor === 'indice' ? <span className="mr-1">{idx1 + 1}.{idx2 + 1}.</span> : null}
                              {node2.name}
                            </div>
                            {exibirPor === 'quantidade' && (
                              <div className="text-muted-foreground flex gap-1 items-center text-xs">
                                <span>{node2.count}</span>
                                <span className="opacity-60">({((node2.count / (cadernoQuestoes.length || 1)) * 100).toFixed(2)}%)</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              })()}
              
              {cadernoQuestoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm italic">
                  Nenhuma questão no caderno para exibir o índice.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Importação de PDF do TEC Concursos */}
      <ImportPdfModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(updatedQuestions) => {
          setResolucoes(updatedQuestions)
          setCadernoQuestoes(updatedQuestions)
          setIsImportModalOpen(false)
        }}
        existingQuestions={resolucoes}
      />

      </div>

      {/* Dedicated Print-Only Container */}
      {cadernoQuestoes.length > 0 && (
        <div className="hidden print:block w-full max-w-4xl mx-auto p-8 bg-white text-black text-sm leading-relaxed space-y-6">
          
          {/* Header Info */}
          <div className="border-b-2 border-black pb-4">
            <div className="flex justify-between items-start text-xs font-bold uppercase tracking-wider text-neutral-600">
              <div>
                <span>Questão Q{questoesExibidas[currentQuestaoIndex]?.questao_tec_id}</span>
                <span className="mx-2">•</span>
                <span className="text-neutral-900">{questoesExibidas[currentQuestaoIndex]?.banca_texto} ({questoesExibidas[currentQuestaoIndex]?.ano})</span>
              </div>
              <div>
                <span>TEC Concursos</span>
              </div>
            </div>
            
            <h1 className="text-lg font-extrabold text-neutral-900 mt-3">
              {questoesExibidas[currentQuestaoIndex]?.materia}
              {questoesExibidas[currentQuestaoIndex]?.assunto && (
                <span className="text-neutral-500 font-normal"> &gt; {questoesExibidas[currentQuestaoIndex]?.assunto}</span>
              )}
            </h1>
            
            {questoesExibidas[currentQuestaoIndex]?.orgao && (
              <div className="text-xs text-neutral-500 mt-1 font-semibold">
                Órgão: <span className="text-neutral-800 font-bold">{questoesExibidas[currentQuestaoIndex]?.orgao}</span>
                {questoesExibidas[currentQuestaoIndex]?.concurso && (
                  <>
                    <span className="mx-2">•</span>
                    Concurso: <span className="text-neutral-800 font-bold">{questoesExibidas[currentQuestaoIndex]?.concurso}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Enunciado */}
          <div className="space-y-4 print:break-inside-avoid">
            <p className="text-neutral-800 font-medium leading-relaxed whitespace-pre-line text-sm bg-neutral-50 p-4 rounded border border-neutral-200">
              {questoesExibidas[currentQuestaoIndex]?.enunciado}
            </p>
          </div>

          {/* Alternativas */}
          {questoesExibidas[currentQuestaoIndex]?.alternativas && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Alternativas:</h3>
              {Object.entries(questoesExibidas[currentQuestaoIndex]?.alternativas)
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([letra, texto]) => {
                  const isCorrect = questoesExibidas[currentQuestaoIndex]?.gabarito === letra
                  const isSelected = alternativaSelecionada === letra

                  let printBorder = "border-neutral-200"
                  let printBg = "bg-white"
                  let label = ""

                  if (isCorrect && isSelected) {
                    printBorder = "border-emerald-600 border-2"
                    printBg = "bg-emerald-50/70 font-semibold"
                    label = " [GABARITO OFICIAL - SUA RESPOSTA]"
                  } else if (isCorrect) {
                    printBorder = "border-emerald-500 border-2"
                    printBg = "bg-emerald-50/50"
                    label = " [GABARITO OFICIAL]"
                  } else if (isSelected) {
                    printBorder = "border-red-500 border-2"
                    printBg = "bg-red-50/50"
                    label = " [SUA RESPOSTA - INCORRETA]"
                  }

                  return (
                    <div 
                      key={letra} 
                      className={`p-3 rounded border text-xs leading-relaxed flex items-start gap-3 print:break-inside-avoid ${printBorder} ${printBg}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center flex-shrink-0 text-xxs border border-neutral-300">
                        {letra}
                      </span>
                      <div className="flex-1 mt-0.5 text-neutral-900 font-medium">
                        {String(texto)}
                        {label && <span className="ml-2 text-xxs font-black text-emerald-700 tracking-wider">{label}</span>}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* Resolução do Professor ou Comentários da IA */}
          {(() => {
            const resolucaoText = questoesExibidas[currentQuestaoIndex]?.resolucao_professor
            const explicacaoText = explicacoes[questoesExibidas[currentQuestaoIndex]?.id!]
            const hasProf = !!resolucaoText
            const hasIA = !!explicacaoText
            const isIdentical = hasProf && hasIA && resolucaoText.trim() === explicacaoText.trim()

            if (!hasProf && !hasIA) return null

            return (
              <div className="border-t-2 border-black pt-6 space-y-6">
                {hasProf && (
                  <div className="space-y-2 print:break-inside-avoid">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-amber-800 flex items-center gap-1">
                      Comentário do Professor:
                    </h3>
                    <div className="text-neutral-800 text-xs bg-amber-50/20 p-4 rounded border border-amber-200">
                      <MarkdownAI text={resolucaoText} />
                    </div>
                  </div>
                )}

                {hasIA && !isIdentical && (
                  <div className="space-y-2 print:break-inside-avoid">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1">
                      Explicação Detalhada do Mentor IA:
                    </h3>
                    <div className="text-neutral-800 text-xs bg-blue-50/20 p-4 rounded border border-blue-100">
                      <MarkdownAI text={explicacaoText} />
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

        </div>
      )}
    </>
  )
}

function MeuDesempenho({
  historico,
  loading
}: {
  historico: HistoricoResolucao[]
  loading: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const total = historico.length
  const acertos = historico.filter(h => h.acertou).length
  const erros = total - acertos
  const taxaAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0

  // Para o gráfico donut em SVG:
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (taxaAcerto / 100) * circumference

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
          <PieChart className="w-5 h-5 text-teal-650 fill-teal-50" />
          <span>Desempenho</span>
        </div>
        <span className="text-muted-foreground text-xs font-bold">
          {isExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="animate-in fade-in duration-200">
          {total === 0 ? (
            <div className="p-6 flex items-center gap-3 text-muted-foreground text-xs font-semibold">
              <PieChart className="w-5 h-5 text-muted-foreground/50" />
              <span>Você ainda não resolveu esta questão. Sua primeira tentativa será registrada no histórico.</span>
            </div>
          ) : (
            <>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gráfico Donut de Desempenho */}
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Círculo de Fundo */}
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className="text-border"
                        strokeWidth="6"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      {/* Círculo de Progresso */}
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className="text-emerald-500 transition-all duration-500 ease-out"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-xs font-black text-foreground">{taxaAcerto}%</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">Taxa de Acerto</h4>
                    <p className="text-xxs text-muted-foreground">
                      {acertos} {acertos === 1 ? 'acerto' : 'acertos'} e {erros} {erros === 1 ? 'erro' : 'erros'} de {total} {total === 1 ? 'resolução' : 'resoluções'}
                    </p>
                  </div>
                </div>

                {/* Estatísticas Simples */}
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Resolvida</span>
                    <span className="text-lg font-black text-foreground">{total} {total === 1 ? 'vez' : 'vezes'}</span>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Último Resultado</span>
                    <span className={`text-xs font-black uppercase tracking-wide ${historico[historico.length - 1].acertou ? 'text-emerald-600' : 'text-red-650'}`}>
                      {historico[historico.length - 1].acertou ? 'Acerto (Correto)' : 'Erro (Incorreto)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Tentativas Anteriores */}
              <div className="border-t border-border bg-card">
                <div className="max-h-[160px] overflow-y-auto divide-y divide-border/60">
                  {historico.slice().reverse().map((tentativa, idx) => {
                    const data = new Date(tentativa.data_resolucao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    const tempo = tentativa.tempo_segundos
                      ? `${Math.floor(tentativa.tempo_segundos / 60)}m ${tentativa.tempo_segundos % 60}s`
                      : 'N/D'

                    return (
                      <div key={tentativa.id || idx} className="px-6 py-2.5 flex items-center justify-between text-xxs font-medium hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{data}</span>
                          <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
                            tentativa.acertou 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {tentativa.acertou ? 'Acertou' : 'Errou'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>Opção: <strong className="text-foreground">{tentativa.alternativa || 'N/A'}</strong></span>
                          <span>Tempo: <strong className="text-foreground">{tempo}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
