import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuestoes } from '../hooks/useQuestoes'
import { ImportPdfModal } from '../components/ImportPdfModal'
import { QuestaoVisualizador } from '../components/QuestaoVisualizador'
import { MeuDesempenho } from '../components/MeuDesempenho'
import { QuestaoEstatisticas } from '../components/QuestaoEstatisticas'
import { QuestaoGabarito } from '../components/QuestaoGabarito'
import { QuestaoModalEdicao } from '../components/QuestaoModalEdicao'
import { QuestaoIndice } from '../components/QuestaoIndice'
import { QuestaoTabs } from '../components/QuestaoTabs'
import { QuestaoResolucaoProfessor } from '../components/QuestaoResolucaoProfessor'
import { QuestaoNavegacao } from '../components/QuestaoNavegacao'
import { QuestaoPrintView } from '../components/QuestaoPrintView'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { QuestaoSkeleton } from '../components/ui/QuestaoSkeleton'
import { QuestaoFilterPanel } from '../components/QuestaoFilterPanel'
import {
  CARREIRAS_DISPONIVEIS,
  ESCOLARIDADES_DISPONIVEIS,
  FORMACOES_DISPONIVEIS,
  REGIOES_DISPONIVEIS,
  FAVORITAS_OPCOES,
  ENUNCIADOS_OPCOES,
} from '../hooks/useQuestoesFilter'
import { AlertCircle, RefreshCw, Layers, Upload, Filter, X } from 'lucide-react'
import { ErrorBoundary } from '../components/ErrorBoundary'


export function Questoes() {
  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')


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
    handleSaveResolucao,
    tempoSegundos,
    salvandoResposta,
    historicoQuestaoAtiva,
    loadingHistoricoAtivo,
    handleConfirmarResposta,
    setFiltros,
    questoesExibidas,
    handleEditQuestao,
    loadingError,
    // NEW — pagination
    pageLoading,
    pageLoadingError,
    page,
    totalPages,
    handleNavigatePage,
    // Filter panel
    isFilterExpanded,
    setIsFilterExpanded,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    questaoTecId,
    setQuestaoTecId,
    objetivo,
    setObjetivo,
    selectedMaterias,
    selectedAssuntos,
    selectedBancas,
    selectedAnos,
    selectedOrgaos,
    selectedConcursos,
    selectedCarreiras,
    selectedEscolaridades,
    selectedFormacoes,
    selectedRegioes,
    selectedFavoritas,
    selectedEnunciados,
    handleToggleMateria,
    handleToggleAssunto,
    handleToggleBanca,
    handleToggleAno,
    handleToggleOrgao,
    handleToggleConcurso,
    handleToggleCarreira,
    handleToggleEscolaridade,
    handleToggleFormacao,
    handleToggleRegiao,
    handleToggleFavorita,
    handleToggleEnunciado,
    handleResetFilters,
    totalFiltrosAtivos,
    filteredCount,
    expandedMateriaFolder,
    setExpandedMateriaFolder,
    materiasUnicas,
    materiasComAssuntos,
    bancasUnicas,
    anosUnicos,
    orgaosUnicos,
    concursosUnicos,
  } = useQuestoes()
  
  // Referenced for future use (pagination UI)
  void page; void totalPages; void handleNavigatePage;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleOpenEditModal = () => setIsEditModalOpen(true)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const idParam = searchParams.get('id')
    const matParam = searchParams.get('materia')
    const assParam = searchParams.get('assunto')

    if (idParam && cadernoQuestoes.length > 0) {
      const index = cadernoQuestoes.findIndex(q => q.questao_tec_id === parseInt(idParam, 10))
      if (index !== -1) {
        setFiltros(null)
        setCurrentQuestaoIndex(index)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTopTab('questoes')
        setSearchParams({}, { replace: true })
      }
    } else if ((matParam || assParam) && cadernoQuestoes.length > 0) {
      const newFiltros: Record<string, string> = {}
      if (matParam) newFiltros.materia = matParam
      if (assParam) newFiltros.assunto = assParam

      setFiltros(newFiltros)
      setCurrentQuestaoIndex(0)
      setTopTab('questoes')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, cadernoQuestoes, setCurrentQuestaoIndex, setSearchParams, setFiltros])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos se o usuário estiver focando em algum campo de texto/entrada
      const active = document.activeElement;
      if (active) {
        const tagName = active.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || active.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      const currentQuestao = questoesExibidas[currentQuestaoIndex];
      if (!currentQuestao) return;

      // Teclas 1-5 para selecionar alternativas (apenas se não estiver revelado)
      if (!revelado && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const mapping: Record<string, string> = {
          '1': 'A',
          '2': 'B',
          '3': 'C',
          '4': 'D',
          '5': 'E'
        };
        const letter = mapping[e.key];
        if (letter && currentQuestao.alternativas?.[letter]) {
          e.preventDefault();
          setAlternativaSelecionada(letter);
        }
        return;
      }

      // Enter ou Espaço
      if (e.key === 'Enter' || e.key === ' ') {
        // Evita scroll da página com barra de espaço
        e.preventDefault();

        if (!revelado) {
          // Se tiver alternativa selecionada, confirma/resolve
          if (alternativaSelecionada && !salvandoResposta) {
            handleConfirmarResposta();
          }
        } else {
          // Se já estiver revelado, avança para próxima questão
          if (currentQuestaoIndex < questoesExibidas.length - 1) {
            setCurrentQuestaoIndex(prev => prev + 1);
            setAlternativaSelecionada(null);
            setRevelado(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    revelado,
    alternativaSelecionada,
    currentQuestaoIndex,
    questoesExibidas,
    salvandoResposta,
    handleConfirmarResposta,
    setCurrentQuestaoIndex,
    setAlternativaSelecionada,
    setRevelado
  ]);

  const handleIndiceNavigate = (filtros: Record<string, string>) => {
    setFiltros(filtros);
    setCurrentQuestaoIndex(0);
    setTopTab('questoes');
  }

  if (loadingError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] p-12 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Erro ao carregar questões</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{loadingError}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 overflow-hidden print:hidden">
        
        <QuestaoTabs
          topTab={topTab}
          onTabChange={setTopTab}
          totalQuestoes={cadernoQuestoes.length}
          onImportClick={() => setIsImportModalOpen(true)}
        />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {topTab === 'questoes' && (
          <div className="w-full max-w-5xl mx-auto space-y-4">
            <QuestaoFilterPanel
              isExpanded={isFilterExpanded}
              onToggle={() => setIsFilterExpanded(!isFilterExpanded)}
              objetivo={objetivo}
              setObjetivo={setObjetivo}
              activeCategory={activeTab}
              setActiveCategory={setActiveTab}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              questaoTecId={questaoTecId}
              onQuestaoTecIdChange={setQuestaoTecId}
              materias={materiasUnicas}
              materiasComAssuntos={materiasComAssuntos}
              bancas={bancasUnicas}
              anos={anosUnicos}
              orgaos={orgaosUnicos}
              concursos={concursosUnicos}
              selectedMaterias={selectedMaterias}
              selectedAssuntos={selectedAssuntos}
              selectedBancas={selectedBancas}
              selectedAnos={selectedAnos}
              selectedOrgaos={selectedOrgaos}
              selectedConcursos={selectedConcursos}
              selectedCarreiras={selectedCarreiras}
              selectedEscolaridades={selectedEscolaridades}
              selectedFormacoes={selectedFormacoes}
              selectedRegioes={selectedRegioes}
              selectedFavoritas={selectedFavoritas}
              selectedEnunciados={selectedEnunciados}
              onToggleMateria={handleToggleMateria}
              onToggleAssunto={handleToggleAssunto}
              onToggleBanca={handleToggleBanca}
              onToggleAno={handleToggleAno}
              onToggleOrgao={handleToggleOrgao}
              onToggleConcurso={handleToggleConcurso}
              onToggleCarreira={handleToggleCarreira}
              onToggleEscolaridade={handleToggleEscolaridade}
              onToggleFormacao={handleToggleFormacao}
              onToggleRegiao={handleToggleRegiao}
              onToggleFavorita={handleToggleFavorita}
              onToggleEnunciado={handleToggleEnunciado}
              onResetFilters={handleResetFilters}
              totalFiltrosAtivos={totalFiltrosAtivos}
              filteredCount={filteredCount}
              expandedMateriaFolder={expandedMateriaFolder}
              setExpandedMateriaFolder={setExpandedMateriaFolder}
              carreiras={CARREIRAS_DISPONIVEIS}
              escolaridades={ESCOLARIDADES_DISPONIVEIS}
              formacoes={FORMACOES_DISPONIVEIS}
              regioes={REGIOES_DISPONIVEIS}
              favoritas={FAVORITAS_OPCOES}
              enunciados={ENUNCIADOS_OPCOES}
            />

            {cadernoQuestoes.length === 0 || questoesExibidas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
                {totalFiltrosAtivos > 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Filter className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão com esses filtros</h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Tente limpar os filtros ou selecionar outras opções.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Limpar filtros
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto pb-12">

          {pageLoadingError && !pageLoading && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
              {pageLoadingError}
            </div>
          )}

          {pageLoading ? (
            <QuestaoSkeleton />
          ) : (
            <ErrorBoundary>
            <QuestaoVisualizador
              questao={questoesExibidas[currentQuestaoIndex]}
              index={currentQuestaoIndex}
              total={cadernoQuestoes.length}
              alternativaSelecionada={alternativaSelecionada}
              onSelectAlternativa={setAlternativaSelecionada}
              revelado={revelado}
              onReset={() => { setAlternativaSelecionada(null); setRevelado(false) }}
              onConfirmarResposta={handleConfirmarResposta}
              copiedId={copiedId}
              onCopyId={handleCopy}
              tempoSegundos={tempoSegundos}
              salvandoResposta={salvandoResposta}
              onEditar={handleOpenEditModal}
              onAnterior={() => { setCurrentQuestaoIndex(prev => prev - 1); setAlternativaSelecionada(null); setRevelado(false) }}
              onProxima={() => { setCurrentQuestaoIndex(prev => prev + 1); setAlternativaSelecionada(null); setRevelado(false) }}
              podeAnterior={currentQuestaoIndex > 0}
              podeProxima={currentQuestaoIndex < questoesExibidas.length - 1}
            />
            </ErrorBoundary>
          )}

          <ErrorBoundary>
            <MeuDesempenho
              historico={historicoQuestaoAtiva} loading={loadingHistoricoAtivo} />
          </ErrorBoundary>

          <ErrorBoundary>
            <QuestaoResolucaoProfessor
              expanded={resolucaoExpanded}
              onToggle={() => setResolucaoExpanded(!resolucaoExpanded)}
              editing={editingResolucao}
              text={resolucaoText}
              onTextChange={setResolucaoText}
              onStartEdit={() => setEditingResolucao(true)}
              onCancelEdit={() => {
                setResolucaoText(questoesExibidas[currentQuestaoIndex].resolucao_professor || '')
                setEditingResolucao(false)
              }}
              onSave={handleSaveResolucao}
              saving={savingResolucao}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <QuestaoNavegacao
              onAnterior={() => { setCurrentQuestaoIndex(prev => prev - 1); setAlternativaSelecionada(null); setRevelado(false) }}
              onProxima={() => { setCurrentQuestaoIndex(prev => prev + 1); setAlternativaSelecionada(null); setRevelado(false) }}
              onAleatorio={() => { const r = Math.floor(Math.random() * questoesExibidas.length); setCurrentQuestaoIndex(r); setAlternativaSelecionada(null); setRevelado(false) }}
              onLimpar={() => { setAlternativaSelecionada(null); setRevelado(false) }}
              podeAnterior={currentQuestaoIndex > 0}
              podeProxima={currentQuestaoIndex < questoesExibidas.length - 1}
            />
          </ErrorBoundary>

        </div>
            )}
          </div>
        )}

        {topTab === 'estatisticas' && (
          <ErrorBoundary>
            <QuestaoEstatisticas
              questao={questoesExibidas[currentQuestaoIndex]}
              historico={historicoQuestaoAtiva}
              loading={loadingHistoricoAtivo}
              totalQuestoes={cadernoQuestoes.length}
              onVoltar={() => setTopTab('questoes')}
            />
          </ErrorBoundary>
        )}

        {topTab === 'gabarito' && (() => {
          const q = questoesExibidas[currentQuestaoIndex]
          return (
            <ErrorBoundary>
              <QuestaoGabarito
                questao={q}
                totalQuestoes={cadernoQuestoes.length}
                onVoltar={() => setTopTab('questoes')}
              />
            </ErrorBoundary>
          )
        })()}

        {topTab === 'indice' && (
          <QuestaoIndice
            questoes={cadernoQuestoes}
            onNavigate={handleIndiceNavigate}
          />
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

      {cadernoQuestoes.length > 0 && (
        <QuestaoPrintView
          questao={questoesExibidas[currentQuestaoIndex]}
          alternativaSelecionada={alternativaSelecionada}
        />
      )}

      <QuestaoModalEdicao
        isOpen={isEditModalOpen}
        questao={questoesExibidas[currentQuestaoIndex]}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditQuestao}
      />
    </ErrorBoundary>
  )
}




