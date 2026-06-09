import { AlertTriangle } from 'lucide-react'
import type { Resolucao } from '../types/database'
import { getQuestionValidation } from '../lib/validation'

interface ImportPdfQuestionListProps {
  questions: Resolucao[]
  selectedIndex: number
  onSelectQuestion: (index: number) => void
  dbDuplicateCount: number
  localDuplicateCount: number
  onDiscardDbDuplicates: () => void
  onDiscardLocalDuplicates: () => void
  checkIsDbDuplicate: (q: Resolucao) => boolean
  checkIsLocalDuplicate: (q: Resolucao) => boolean
}

export function ImportPdfQuestionList({
  questions,
  selectedIndex,
  onSelectQuestion,
  dbDuplicateCount,
  localDuplicateCount,
  onDiscardDbDuplicates,
  onDiscardLocalDuplicates,
  checkIsDbDuplicate,
  checkIsLocalDuplicate,
}: ImportPdfQuestionListProps) {
  return (
    <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col overflow-hidden bg-muted/20 shrink-0">
      <div className="p-3 border-b border-border bg-card flex flex-col gap-2">
        <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
          Lista de Questões ({questions.length})
        </h4>
        {questions.some(q => getQuestionValidation(q).length > 0) && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Existem questões com alertas ou campos ausentes. Corrija-os antes de gravar.</span>
          </div>
        )}
        {/* Filtros de Duplicidade */}
        {(dbDuplicateCount > 0 || localDuplicateCount > 0) && (
          <div className="flex flex-col gap-1.5 pt-1">
            {dbDuplicateCount > 0 && (
              <button
                onClick={onDiscardDbDuplicates}
                className="w-full flex items-center justify-between text-xxs bg-amber-500/10 hover:bg-amber-500/20 text-amber-550 border border-amber-500/20 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
              >
                <span>{dbDuplicateCount} já existem no banco</span>
                <span className="underline">Descartar</span>
              </button>
            )}
            {localDuplicateCount > 0 && (
              <button
                onClick={onDiscardLocalDuplicates}
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
        {questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs italic">
            Nenhuma questão restante.
          </div>
        ) : (
          questions.map((q, idx) => {
            const isSelected = selectedIndex === idx
            const validation = getQuestionValidation(q)
            const isDbDup = checkIsDbDuplicate(q)
            const isLocDup = checkIsLocalDuplicate(q)
            const hasErr = validation.length > 0

            let borderStyle = 'border-border hover:border-[#1976d2]/30 bg-card'
            if (isSelected) borderStyle = 'border-primary bg-primary/5 ring-1 ring-primary/20'
            else if (isDbDup || isLocDup) borderStyle = 'border-amber-300 bg-amber-50/10 opacity-70'
            else if (hasErr) borderStyle = 'border-red-300 bg-red-50/10'

            return (
              <button
                key={idx}
                onClick={() => onSelectQuestion(idx)}
                className={`w-full text-left p-2.5 rounded-xl border text-xxs flex flex-col gap-1 transition-all cursor-pointer ${borderStyle}`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-foreground">Questão {idx + 1}</span>
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
                      Já existe no BD
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
