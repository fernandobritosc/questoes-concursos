import { useState } from 'react'
import { 
  X, 
  Upload, 
  Book, 
  AlertTriangle, 
  Loader2, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Trash2 
} from 'lucide-react'
import { fetchQuestaoIds, insertQuestoesBatch, fetchAllQuestoes, clearQuestoesCache } from '../services/supabase.service'
import { trackEvent } from '../services/hermesTracker'
import type { Questao, ResolucaoView } from '../types/database'

import { loadPdfJs, extractPdfText, parsePdfContent } from '../lib/pdfParser'

// Alias para compatibilidade com o cÃ³digo de parse abaixo
type Resolucao = ResolucaoView

interface ImportStatus {
  step: 'idle' | 'loading_engine' | 'reading_pages' | 'parsing' | 'review' | 'checking_existing' | 'saving' | 'success' | 'error'
  progress: number
  total: number
  errorMsg?: string
  importedCount?: number
}

interface ImportPdfModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (updatedQuestions: ResolucaoView[]) => void
  existingQuestions: ResolucaoView[]
}

import { getQuestionValidation } from '../lib/validation'

export function ImportPdfModal({ isOpen, onClose, onImportSuccess, existingQuestions }: ImportPdfModalProps) {
  const [customCadernoName, setCustomCadernoName] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<ImportStatus>({ step: 'idle', progress: 0, total: 0 })
  const [tempQuestions, setTempQuestions] = useState<Resolucao[]>([])
  const [selectedTempIndex, setSelectedTempIndex] = useState<number>(0)

  if (!isOpen) return null

  const checkIsDbDuplicate = (q: Resolucao) => {
    if (!q.questao_tec_id) return false
    return existingQuestions.some(r => r.questao_tec_id === q.questao_tec_id)
  }

  const checkIsLocalDuplicate = (q: Resolucao) => {
    if (!q.questao_tec_id) return false
    return tempQuestions.filter(t => t.questao_tec_id === q.questao_tec_id).length > 1
  }

  const handleUpdateTempQuestion = (index: number, fields: Partial<Resolucao>) => {
    setTempQuestions(prev => prev.map((q, idx) => idx === index ? { ...q, ...fields } : q))
  }

  const handleDeleteTempQuestion = (index: number) => {
    setTempQuestions(prev => {
      const next = prev.filter((_, idx) => idx !== index)
      if (selectedTempIndex >= next.length && next.length > 0) {
        setSelectedTempIndex(next.length - 1)
      }
      return next
    })
  }

  const handleDiscardDbDuplicates = () => {
    setTempQuestions(prev => {
      const next = prev.filter(q => !checkIsDbDuplicate(q))
      setSelectedTempIndex(0)
      return next
    })
  }

  const handleDiscardLocalDuplicates = () => {
    setTempQuestions(prev => {
      const seen = new Set<number>()
      const next = prev.filter(q => {
        if (!q.questao_tec_id) return true
        if (seen.has(q.questao_tec_id)) return false
        seen.add(q.questao_tec_id)
        return true
      })
      setSelectedTempIndex(0)
      return next
    })
  }

  const handleImportPdf = async () => {
    if (!importFile) return

    const nameToUse = customCadernoName.trim() || importFile.name.replace(/\.[^/.]+$/, "")

    setImportStatus({ step: 'loading_engine', progress: 0, total: 0 })

    try {
      const pdfjsLib = await loadPdfJs()

      setImportStatus({ step: 'reading_pages', progress: 0, total: 100 })
      const arrayBuffer = await importFile.arrayBuffer()

      const { fullText } = await extractPdfText(pdfjsLib, arrayBuffer, (pageNum) => {
        setImportStatus(prev => ({
          ...prev,
          step: 'reading_pages',
          progress: pageNum,
        }))
      })

      setImportStatus({ step: 'parsing', progress: 0, total: 100 })

      const parsedQuestions = parsePdfContent(fullText, nameToUse)

      setTempQuestions(parsedQuestions)
      setSelectedTempIndex(0)
      setImportStatus({
        step: 'review',
        progress: parsedQuestions.length,
        total: parsedQuestions.length,
      })

    } catch (err: unknown) {
      console.error(err)
      setImportStatus({
        step: 'error',
        progress: 0,
        total: 0,
        errorMsg: err instanceof Error ? err.message : 'Erro inesperado durante a importação.'
      })
    }
  }

  const handleConfirmSavePdf = async () => {
    if (tempQuestions.length === 0) return
    try {
      setImportStatus({ step: 'checking_existing', progress: 0, total: 100 })
      // Verifica IDs jÃ¡ existentes na tabela 'questoes'
      const existingIds = await fetchQuestaoIds()
      
      // Filtra apenas as questÃµes novas (nÃ£o duplicadas)
      const newQuestions = tempQuestions.filter(q => !existingIds.has(q.questao_tec_id!))

      if (newQuestions.length === 0) {
        setImportStatus({ step: 'success', progress: 0, total: 0, importedCount: 0 })
        clearQuestoesCache()
        const updatedData = await fetchAllQuestoes()
        onImportSuccess(updatedData)
        return
      }

      setImportStatus({ step: 'saving', progress: 0, total: newQuestions.length })

      // Monta o payload para a tabela 'questoes' (sem campos de histÃ³rico)
      const questoesPayload: Questao[] = newQuestions.map(q => {
        // Limpar alternativas vazias para que fiquem ausentes
        const cleanedAlts: Record<string, string> = {}
        if (q.alternativas) {
          Object.entries(q.alternativas).forEach(([letter, text]) => {
            if (text && text.trim() !== '') {
              cleanedAlts[letter.toUpperCase()] = text.trim()
            }
          })
        }

        return {
          questao_tec_id: q.questao_tec_id,
          materia: q.materia,
          assunto: q.assunto,
          banca_texto: q.banca_texto,
          orgao: q.orgao,
          concurso: q.concurso,
          prova: q.prova,
          ano: q.ano,
          caderno_nome: q.caderno_nome,
          enunciado: q.enunciado,
          gabarito: q.gabarito,
          alternativas: cleanedAlts,
          resolucao_professor: null,
        }
      })

      const successCount = await insertQuestoesBatch(questoesPayload, (current) => {
        setImportStatus(prev => ({ ...prev, progress: current }))
      })

      clearQuestoesCache()
      const updatedData = await fetchAllQuestoes()
      onImportSuccess(updatedData)

      setImportStatus({ 
        step: 'success', 
        progress: successCount, 
        total: newQuestions.length, 
        importedCount: successCount 
      })

      trackEvent('importar_pdf', { questoes: successCount })
    } catch (err: unknown) {
      console.error(err)
      setImportStatus({ 
        step: 'error', 
        progress: 0, 
        total: 0, 
        errorMsg: err instanceof Error ? err.message : 'Erro inesperado durante o salvamento.' 
      })
    }
  }

  const dbDuplicateCount = tempQuestions.filter(q => checkIsDbDuplicate(q)).length
  const localDuplicateCount = tempQuestions.filter(q => checkIsLocalDuplicate(q)).length

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full overflow-hidden transform transition-all duration-300 animate-in zoom-in-95 duration-200 ${
        importStatus.step === 'review' ? 'max-w-6xl h-[85vh] flex flex-col' : 'max-w-lg'
      }`}>
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">
                {importStatus.step === 'review' ? 'RevisÃ£o Interativa do Caderno' : 'Importar PDF do TEC Concursos'}
              </h3>
              <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                {importStatus.step === 'review' ? `Revise e edite as ${tempQuestions.length} questÃµes detectadas` : 'IngestÃ£o client-side ultra-rÃ¡pida'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              onClose()
              setImportFile(null)
              setCustomCadernoName('')
              setImportStatus({ step: 'idle', progress: 0, total: 0 })
              setTempQuestions([])
            }}
            disabled={importStatus.step !== 'idle' && importStatus.step !== 'review' && importStatus.step !== 'success' && importStatus.step !== 'error'}
            className="text-muted-foreground hover:text-muted-foreground p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className={`p-6 ${importStatus.step === 'review' ? 'flex-1 overflow-hidden p-0 flex flex-col lg:flex-row' : ''}`}>
          
          {/* Passo 1: SeleÃ§Ã£o de Arquivo e Nome Customizado (Idle) */}
          {importStatus.step === 'idle' && (
            <div className="space-y-5">
              {!importFile ? (
                <label 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type === "application/pdf") {
                      setImportFile(file);
                      setCustomCadernoName(file.name.replace(/\.[^/.]+$/, ""));
                    } else {
                      alert("Apenas arquivos PDF sÃ£o permitidos.");
                    }
                  }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-[#1976d2] bg-blue-50/10 hover:bg-blue-50/20 rounded-xl p-8 text-center cursor-pointer transition-all group"
                >
                  <input 
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        setCustomCadernoName(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                  <div className="bg-primary/20 p-3 rounded-full text-primary group-hover:scale-110 transition-transform shadow-xxs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-extrabold text-foreground mt-4 leading-snug">
                    Arraste o PDF do caderno aqui ou <span className="text-primary underline">clique para procurar</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold mt-1.5">
                    Apenas arquivos .pdf oficiais do TEC Concursos
                  </span>
                </label>
              ) : (
                <div className="bg-muted border border-border rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-500 shadow-xxs">
                      <Book className="w-5 h-5 fill-red-100" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-foreground truncate" title={importFile.name}>
                        {importFile.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                        {(importFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setImportFile(null);
                      setCustomCadernoName('');
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer font-bold text-xs"
                  >
                    Remover
                  </button>
                </div>
              )}

              {importFile && (
                <div className="space-y-1.5 animate-in slide-in-from-top-3 duration-250">
                  <label htmlFor="customCadernoName" className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Nome do Caderno no Sistema
                  </label>
                  <input 
                    id="customCadernoName"
                    type="text"
                    placeholder="Ex: InformÃ¡tica PolÃ­cia Federal 2026"
                    value={customCadernoName}
                    onChange={(e) => setCustomCadernoName(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] shadow-xxs"
                  />
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                    Este nome serÃ¡ usado para agrupar as novas questÃµes no seu Banco de QuestÃµes Pessoal.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button 
                  onClick={() => {
                    onClose()
                    setImportFile(null)
                    setCustomCadernoName('')
                  }}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleImportPdf}
                  disabled={!importFile}
                  className={`px-5 py-2.5 rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 ${
                    importFile 
                      ? 'bg-primary hover:bg-[#1565c0] text-white cursor-pointer active:scale-98' 
                      : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                  }`}
                >
                  <span>Analisar PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Engine / Ingesting Steps */}
          {(importStatus.step === 'loading_engine' || 
            importStatus.step === 'reading_pages' || 
            importStatus.step === 'parsing' || 
            importStatus.step === 'checking_existing' || 
            importStatus.step === 'saving') && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <h4 className="text-xs font-black text-foreground">
                {importStatus.step === 'loading_engine' && "Inicializando motor de inteligÃªncia do PDF..."}
                {importStatus.step === 'reading_pages' && `Extraindo textos e analisando pÃ¡ginas...`}
                {importStatus.step === 'parsing' && "Mapeando gabarito e estruturando as questÃµes..."}
                {importStatus.step === 'checking_existing' && "Evitando duplicidade: verificando registros existentes no Supabase..."}
                {importStatus.step === 'saving' && "Gravando novas questÃµes exclusivas no seu Banco de Dados..."}
              </h4>
              {importStatus.step === 'reading_pages' && (
                <div className="w-full max-w-xs bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-200" 
                    style={{ width: `${(importStatus.progress / (importStatus.total || 1)) * 100}%` }}
                  />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground font-bold">
                {importStatus.step === 'reading_pages' && `Lendo pÃ¡gina ${importStatus.progress} de ${importStatus.total}...`}
                {importStatus.step === 'saving' && `Gravando item ${importStatus.progress} de ${importStatus.total}...`}
              </p>
            </div>
          )}

          {/* Passo 2: Visualizador/Revisor Interativo de QuestÃµes Detectadas (Review) */}
          {importStatus.step === 'review' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Esquerda: Lista de QuestÃµes */}
              <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col overflow-hidden bg-muted/20 shrink-0">
                <div className="p-3 border-b border-border bg-card flex flex-col gap-2">
                  <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                    Lista de QuestÃµes ({tempQuestions.length})
                  </h4>
                  {tempQuestions.some(q => getQuestionValidation(q).length > 0) && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Existem questÃµes com alertas ou campos ausentes. Corrija-os antes de gravar.</span>
                    </div>
                  )}
                  {/* Filtros de Duplicidade */}
                  {(dbDuplicateCount > 0 || localDuplicateCount > 0) && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {dbDuplicateCount > 0 && (
                        <button 
                          onClick={handleDiscardDbDuplicates}
                          className="w-full flex items-center justify-between text-xxs bg-amber-500/10 hover:bg-amber-500/20 text-amber-550 border border-amber-500/20 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                        >
                          <span>{dbDuplicateCount} jÃ¡ existem no banco</span>
                          <span className="underline">Descartar</span>
                        </button>
                      )}
                      {localDuplicateCount > 0 && (
                        <button 
                          onClick={handleDiscardLocalDuplicates}
                          className="w-full flex items-center justify-between text-xxs bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                        >
                          <span>{localDuplicateCount} duplicadas no PDF</span>
                          <span className="underline">Descartar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
                  {tempQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                      Nenhuma questÃ£o restante.
                    </div>
                  ) : (
                    tempQuestions.map((q, idx) => {
                      const isSelected = selectedTempIndex === idx
                      const validation = getQuestionValidation(q)
                      const isDbDup = checkIsDbDuplicate(q)
                      const isLocDup = checkIsLocalDuplicate(q)
                      const hasErr = validation.length > 0

                      let borderStyle = "border-border hover:border-[#1976d2]/30 bg-card"
                      if (isSelected) borderStyle = "border-primary bg-primary/5 ring-1 ring-primary/20"
                      else if (isDbDup || isLocDup) borderStyle = "border-amber-300 bg-amber-50/10 opacity-70"
                      else if (hasErr) borderStyle = "border-red-300 bg-red-50/10"

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedTempIndex(idx)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xxs flex flex-col gap-1 transition-all cursor-pointer ${borderStyle}`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-foreground">QuestÃ£o {idx + 1}</span>
                            <span className="text-muted-foreground">Q{q.questao_tec_id || 'SEM ID'}</span>
                          </div>
                          <p className="text-foreground/80 truncate max-w-full font-medium">
                            {q.enunciado || 'Enunciado vazio'}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-bold text-muted-foreground">
                              {q.banca_texto}
                            </span>
                            {hasErr && (
                              <span className="bg-red-500/10 text-red-500 px-1 py-0.2 rounded font-black text-[8px] uppercase tracking-wide">
                                Alertas: {validation.length}
                              </span>
                            )}
                            {isDbDup && (
                              <span className="bg-amber-500/10 text-amber-550 px-1 py-0.2 rounded font-black text-[8px] uppercase tracking-wide">
                                JÃ¡ existe no BD
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Direita: Workspace de EdiÃ§Ã£o */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 flex flex-col">
                {tempQuestions.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                    Todas as questÃµes foram descartadas.
                  </div>
                ) : (
                  (() => {
                    const selectedQuestion = tempQuestions[selectedTempIndex]
                    const validationErrors = getQuestionValidation(selectedQuestion)
                    const isDbDup = checkIsDbDuplicate(selectedQuestion)
                    const isLocDup = checkIsLocalDuplicate(selectedQuestion)

                    return (
                      <div className="space-y-4 flex-1">
                        {/* Status alertas */}
                        {(validationErrors.length > 0 || isDbDup || isLocDup) && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-550 text-xs font-bold space-y-1">
                            <h5 className="flex items-center gap-1 font-black">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              Alertas para esta QuestÃ£o:
                            </h5>
                            <ul className="list-disc pl-4 space-y-0.5 font-semibold text-[11px]">
                              {validationErrors.map((err, index) => (
                                <li key={index} className="text-red-500">{err}</li>
                              ))}
                              {isDbDup && <li>Esta questÃ£o jÃ¡ estÃ¡ registrada no seu banco de dados Supabase e serÃ¡ ignorada para evitar duplicaÃ§Ãµes.</li>}
                              {isLocDup && <li className="text-red-500">HÃ¡ outra questÃ£o com o mesmo ID neste lote de importaÃ§Ã£o.</li>}
                            </ul>
                          </div>
                        )}

                        {/* Linha 1: ID e Gabarito */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">ID TEC Concursos</label>
                            <input 
                              type="number"
                              value={selectedQuestion.questao_tec_id || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { questao_tec_id: parseInt(e.target.value, 10) || 0 })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Banca Organizadora</label>
                            <input 
                              type="text"
                              value={selectedQuestion.banca_texto || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { banca_texto: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Gabarito Oficial</label>
                            <select 
                              value={selectedQuestion.gabarito || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { gabarito: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-[#1976d2]"
                            >
                              <option value="">Selecione...</option>
                              <option value="A">Alternativa A</option>
                              <option value="B">Alternativa B</option>
                              <option value="C">Alternativa C</option>
                              <option value="D">Alternativa D</option>
                              <option value="E">Alternativa E</option>
                            </select>
                          </div>
                        </div>

                        {/* Linha 2: MatÃ©ria e Assunto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">MatÃ©ria</label>
                            <input 
                              type="text"
                              value={selectedQuestion.materia || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { materia: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Assunto</label>
                            <input 
                              type="text"
                              value={selectedQuestion.assunto || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { assunto: e.target.value })}
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                        </div>

                        {/* Linha 3: Ã“rgÃ£o, Concurso e Ano */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Ã“rgÃ£o</label>
                            <input 
                              type="text"
                              value={selectedQuestion.orgao || ''}
                              onChange={(e) => {
                                const newOrgao = e.target.value
                                const updatedProva = newOrgao ? `${newOrgao} / ${selectedQuestion.ano || ''}` : ''
                                handleUpdateTempQuestion(selectedTempIndex, { orgao: newOrgao, prova: updatedProva })
                              }}
                              placeholder="Ex: TRE MS"
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Cargo / Concurso</label>
                            <input 
                              type="text"
                              value={selectedQuestion.concurso || ''}
                              onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { concurso: e.target.value })}
                              placeholder="Ex: CEBRASPE - Analista JudiciÃ¡rio"
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Ano</label>
                            <input 
                              type="number"
                              value={selectedQuestion.ano || ''}
                              onChange={(e) => {
                                const newAno = parseInt(e.target.value, 10) || null
                                const updatedProva = selectedQuestion.orgao ? `${selectedQuestion.orgao} / ${newAno || ''}` : ''
                                handleUpdateTempQuestion(selectedTempIndex, { ano: newAno, prova: updatedProva })
                              }}
                              placeholder="Ex: 2024"
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
                            />
                          </div>
                        </div>

                        {/* Linha 3: Enunciado */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Enunciado da QuestÃ£o</label>
                          <textarea 
                            value={selectedQuestion.enunciado || ''}
                            onChange={(e) => handleUpdateTempQuestion(selectedTempIndex, { enunciado: e.target.value })}
                            className="w-full min-h-[120px] bg-card border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#1976d2] resize-y leading-relaxed"
                          />
                        </div>

                        {/* Linha 4: Alternativas */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide block">Textos das Alternativas</label>
                          {['A', 'B', 'C', 'D', 'E'].map(letter => {
                            const optionText = selectedQuestion.alternativas?.[letter]

                            return (
                              <div key={letter} className="flex gap-2 items-center">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-black text-xxs shrink-0 border border-border">
                                  {letter}
                                </span>
                                <input 
                                  type="text"
                                  value={optionText || ''}
                                  onChange={(e) => {
                                    const currentAlts = { ...selectedQuestion.alternativas }
                                    currentAlts[letter] = e.target.value
                                    handleUpdateTempQuestion(selectedTempIndex, { alternativas: currentAlts })
                                  }}
                                  className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#1976d2]"
                                  placeholder={`Texto da alternativa ${letter}...`}
                                />
                              </div>
                            )
                          })}
                        </div>

                        {/* AÃ§Ãµes da questÃ£o */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button 
                            onClick={() => handleDeleteTempQuestion(selectedTempIndex)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Descartar esta questÃ£o</span>
                          </button>
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
          )}

          {/* Success / Error States */}
          {importStatus.step === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black text-foreground">ImportaÃ§Ã£o concluÃ­da com sucesso!</h3>
              <p className="text-xs text-muted-foreground max-w-sm font-semibold">
                Foram processadas com sucesso {importStatus.total} questÃµes. 
                Dessas, **{importStatus.importedCount} novas questÃµes exclusivas** foram gravadas no banco e as duplicadas existentes foram filtradas.
              </p>
              <button
                onClick={() => {
                  onClose()
                  setImportFile(null)
                  setCustomCadernoName('')
                  setImportStatus({ step: 'idle', progress: 0, total: 0 })
                  setTempQuestions([])
                }}
                className="px-6 py-2.5 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          )}

          {importStatus.step === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black text-foreground">Falha na ingestÃ£o do PDF</h3>
              <p className="text-xs text-red-500 max-w-sm font-semibold leading-relaxed">
                {importStatus.errorMsg || 'Erro desconhecido durante o processamento do documento.'}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setImportStatus({ step: 'idle', progress: 0, total: 0 })}
                  className="px-5 py-2.5 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => {
                    onClose()
                    setImportFile(null)
                    setCustomCadernoName('')
                    setImportStatus({ step: 'idle', progress: 0, total: 0 })
                    setTempQuestions([])
                  }}
                  className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer (Review Step only) */}
        {importStatus.step === 'review' && (
          <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                disabled={selectedTempIndex === 0}
                onClick={() => setSelectedTempIndex(prev => prev - 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xxs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-card"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                disabled={selectedTempIndex === tempQuestions.length - 1}
                onClick={() => setSelectedTempIndex(prev => prev + 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xxs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-card"
              >
                <span>PrÃ³xima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  onClose()
                  setImportFile(null)
                  setCustomCadernoName('')
                  setImportStatus({ step: 'idle', progress: 0, total: 0 })
                  setTempQuestions([])
                }}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Descartar Lote
              </button>
              <button 
                onClick={handleConfirmSavePdf}
                disabled={tempQuestions.length === 0 || tempQuestions.some(q => getQuestionValidation(q).length > 0) || tempQuestions.some(q => checkIsLocalDuplicate(q))}
                className={`px-5 py-2.5 rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 ${
                  tempQuestions.length > 0 && !tempQuestions.some(q => getQuestionValidation(q).length > 0) && !tempQuestions.some(q => checkIsLocalDuplicate(q))
                    ? 'bg-primary hover:bg-[#1565c0] text-white cursor-pointer active:scale-98' 
                    : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar e Gravar ({tempQuestions.length} questÃµes)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

