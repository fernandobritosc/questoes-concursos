import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useQuestoes } from '../hooks/useQuestoes'
import { ImportPdfModal } from '../components/ImportPdfModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
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
  Settings,
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
    <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 animate-in fade-in duration-300 overflow-hidden">
      
      {/* Top Tabs Header Estilo TEC */}
      <div className="bg-card border-b border-border px-4 flex items-center justify-start text-xs sm:text-sm font-bold text-muted-foreground select-none overflow-x-auto shrink-0 shadow-xxs">
        <button
          onClick={() => setTopTab('questoes')}
          className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${topTab === 'questoes' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Questões
        </button>
        <button
          onClick={() => setTopTab('indice')}
          className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${topTab === 'indice' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
        >
          <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Índice
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap">
          <PieChart className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Estatísticas
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Gabarito
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap hidden sm:flex">
          <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Configurações
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap hidden sm:flex">
          <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Imprimir
        </button>
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
                  <div className="text-foreground leading-relaxed text-xs font-semibold whitespace-pre-line">
                    {resolucaoText ? (
                      resolucaoText
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
              <div className="text-foreground leading-relaxed text-sm prose prose-sm prose-p:my-2 prose-headings:my-3 prose-headings:text-primary prose-strong:text-primary max-w-none">
                <ReactMarkdown>{explicacoes[questoesExibidas[currentQuestaoIndex].id!]}</ReactMarkdown>
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
