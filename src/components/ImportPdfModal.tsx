import { useState } from 'react'
import { fetchQuestaoIds, insertQuestoesBatch, fetchAllQuestoes, clearQuestoesCache } from '../services/supabase.service'
import { trackEvent } from '../services/hermesTracker'
import type { Questao, ResolucaoView } from '../types/database'
import { useToast } from '../contexts/ToastContext'

import { loadPdfJs, extractPdfText, parsePdfContent } from '../lib/pdfParser'

import { ImportPdfHeader } from './ImportPdfHeader'
import { ImportPdfIdleStep } from './ImportPdfIdleStep'
import { ImportPdfLoadingStep } from './ImportPdfLoadingStep'
import { ImportPdfQuestionList } from './ImportPdfQuestionList'
import { ImportPdfQuestionEditor } from './ImportPdfQuestionEditor'
import { ImportPdfSuccessState } from './ImportPdfSuccessState'
import { ImportPdfErrorState } from './ImportPdfErrorState'
import { ImportPdfReviewFooter } from './ImportPdfReviewFooter'

// Alias para compatibilidade com o código de parse abaixo
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
import { getGrupo } from '../lib/grupoUtils'

export function ImportPdfModal({ isOpen, onClose, onImportSuccess, existingQuestions }: ImportPdfModalProps) {
  const toast = useToast()
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

  const fullReset = () => {
    setImportFile(null)
    setCustomCadernoName('')
    setImportStatus({ step: 'idle', progress: 0, total: 0 })
    setTempQuestions([])
    setSelectedTempIndex(0)
  }

  const handleCloseWithReset = () => {
    fullReset()
    onClose()
  }

  const handleImportPdf = async () => {
    if (!importFile) return

    const nameToUse = customCadernoName.trim() || importFile.name.replace(/\.[^/.]+$/, '')

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
        errorMsg: err instanceof Error ? err.message : 'Erro inesperado durante a importação.',
      })
    }
  }

  const handleConfirmSavePdf = async () => {
    if (tempQuestions.length === 0) return
    try {
      setImportStatus({ step: 'checking_existing', progress: 0, total: 100 })
      const existingIds = await fetchQuestaoIds()

      const newQuestions = tempQuestions.filter(q => !existingIds.has(q.questao_tec_id!))

      if (newQuestions.length === 0) {
        setImportStatus({ step: 'success', progress: 0, total: 0, importedCount: 0 })
        clearQuestoesCache()
        const updatedData = await fetchAllQuestoes()
        onImportSuccess(updatedData)
        return
      }

      setImportStatus({ step: 'saving', progress: 0, total: newQuestions.length })

      const questoesPayload: Questao[] = newQuestions.map(q => {
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
          grupo: getGrupo(q.materia, q.assunto),
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
        importedCount: successCount,
      })

      trackEvent('importar_pdf', { questoes: successCount })
    } catch (err: unknown) {
      console.error(err)
      setImportStatus({
        step: 'error',
        progress: 0,
        total: 0,
        errorMsg: err instanceof Error ? err.message : 'Erro inesperado durante o salvamento.',
      })
    }
  }

  const dbDuplicateCount = tempQuestions.filter(q => checkIsDbDuplicate(q)).length
  const localDuplicateCount = tempQuestions.filter(q => checkIsLocalDuplicate(q)).length

  const xDisabled = importStatus.step !== 'idle' && importStatus.step !== 'review' && importStatus.step !== 'success' && importStatus.step !== 'error'

  const hasValidationErrors = tempQuestions.some(q => getQuestionValidation(q).length > 0)
  const hasLocalDuplicates = localDuplicateCount > 0

  const isLoadingStep = importStatus.step === 'loading_engine' ||
    importStatus.step === 'reading_pages' ||
    importStatus.step === 'parsing' ||
    importStatus.step === 'checking_existing' ||
    importStatus.step === 'saving'

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full overflow-hidden transform transition-all duration-300 animate-in zoom-in-95 duration-200 ${
        importStatus.step === 'review' ? 'max-w-6xl h-[85vh] flex flex-col' : 'max-w-lg'
      }`}>

        <ImportPdfHeader
          step={importStatus.step}
          tempQuestionsLength={tempQuestions.length}
          onClose={handleCloseWithReset}
          disabled={xDisabled}
        />

        {/* Modal Body */}
        <div className={`p-6 ${importStatus.step === 'review' ? 'flex-1 overflow-hidden p-0 flex flex-col lg:flex-row' : ''}`}>

          {/* Passo 1: Seleção de Arquivo e Nome Customizado (Idle) */}
          {importStatus.step === 'idle' && (
            <ImportPdfIdleStep
              importFile={importFile}
              customCadernoName={customCadernoName}
              onFileChange={(file) => {
                setImportFile(file)
                setCustomCadernoName(file.name.replace(/\.[^/.]+$/, ''))
              }}
              onRemoveFile={() => {
                setImportFile(null)
                setCustomCadernoName('')
              }}
              onNameChange={setCustomCadernoName}
              onCancel={handleCloseWithReset}
              onAnalyze={handleImportPdf}
              onError={(msg) => toast.warning('Arquivo inválido', msg)}
            />
          )}

          {/* Loading Engine / Ingesting Steps */}
          {isLoadingStep && (
            <ImportPdfLoadingStep
              step={importStatus.step as 'loading_engine' | 'reading_pages' | 'parsing' | 'checking_existing' | 'saving'}
              progress={importStatus.progress}
              total={importStatus.total}
            />
          )}

          {/* Passo 2: Visualizador/Revisor Interativo de Questões Detectadas (Review) */}
          {importStatus.step === 'review' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <ImportPdfQuestionList
                questions={tempQuestions}
                selectedIndex={selectedTempIndex}
                onSelectQuestion={setSelectedTempIndex}
                dbDuplicateCount={dbDuplicateCount}
                localDuplicateCount={localDuplicateCount}
                onDiscardDbDuplicates={handleDiscardDbDuplicates}
                onDiscardLocalDuplicates={handleDiscardLocalDuplicates}
                checkIsDbDuplicate={checkIsDbDuplicate}
                checkIsLocalDuplicate={checkIsLocalDuplicate}
              />

              {/* Direita: Workspace de Edição */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 flex flex-col">
                {tempQuestions.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                    Todas as questões foram descartadas.
                  </div>
                ) : (
                  <ImportPdfQuestionEditor
                    question={tempQuestions[selectedTempIndex]}
                    index={selectedTempIndex}
                    totalQuestions={tempQuestions.length}
                    onUpdate={handleUpdateTempQuestion}
                    onDelete={handleDeleteTempQuestion}
                    checkIsDbDuplicate={checkIsDbDuplicate}
                    checkIsLocalDuplicate={checkIsLocalDuplicate}
                  />
                )}
              </div>
            </div>
          )}

          {/* Success / Error States */}
          {importStatus.step === 'success' && (
            <ImportPdfSuccessState
              total={importStatus.total}
              importedCount={importStatus.importedCount}
              onClose={handleCloseWithReset}
            />
          )}

          {importStatus.step === 'error' && (
            <ImportPdfErrorState
              errorMsg={importStatus.errorMsg}
              onRetry={() => setImportStatus({ step: 'idle', progress: 0, total: 0 })}
              onClose={handleCloseWithReset}
            />
          )}

        </div>

        {/* Modal Footer (Review Step only) */}
        {importStatus.step === 'review' && (
          <ImportPdfReviewFooter
            selectedIndex={selectedTempIndex}
            totalQuestions={tempQuestions.length}
            hasValidationErrors={hasValidationErrors}
            hasLocalDuplicates={hasLocalDuplicates}
            onPrevious={() => setSelectedTempIndex(prev => prev - 1)}
            onNext={() => setSelectedTempIndex(prev => prev + 1)}
            onDiscard={handleCloseWithReset}
            onSave={handleConfirmSavePdf}
          />
        )}

      </div>
    </div>
  )
}
