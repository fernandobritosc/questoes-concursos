import { AlertTriangle, Trash2 } from 'lucide-react'
import type { Resolucao } from '../types/database'
import { getQuestionValidation } from '../lib/validation'

interface ImportPdfQuestionEditorProps {
  question: Resolucao
  index: number
  totalQuestions: number
  onUpdate: (index: number, fields: Partial<Resolucao>) => void
  onDelete: (index: number) => void
  checkIsDbDuplicate: (q: Resolucao) => boolean
  checkIsLocalDuplicate: (q: Resolucao) => boolean
}

export function ImportPdfQuestionEditor({
  question,
  index,
  totalQuestions,
  onUpdate,
  onDelete,
  checkIsDbDuplicate,
  checkIsLocalDuplicate,
}: ImportPdfQuestionEditorProps) {
  const validationErrors = getQuestionValidation(question)
  const isDbDup = checkIsDbDuplicate(question)
  const isLocDup = checkIsLocalDuplicate(question)

  return (
    <div className="space-y-4 flex-1">
      {/* Status alertas */}
      {(validationErrors.length > 0 || isDbDup || isLocDup) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-550 text-xs font-bold space-y-1">
          <h5 className="flex items-center gap-1 font-black">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Alertas para esta Questão:
          </h5>
          <ul className="list-disc pl-4 space-y-0.5 font-semibold text-[11px]">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-red-500">{err}</li>
            ))}
            {isDbDup && <li>Esta questão já está registrada no seu banco de dados Supabase e será ignorada para evitar duplicações.</li>}
            {isLocDup && <li className="text-red-500">Há outra questão com o mesmo ID neste lote de importação.</li>}
          </ul>
        </div>
      )}

      {totalQuestions > 0 && (
        <div className="text-[11px] font-bold text-muted-foreground text-right">
          {index + 1} de {totalQuestions}
        </div>
      )}

      {/* Linha 1: ID e Gabarito */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">ID TEC Concursos</label>
          <input
            type="number"
            value={question.questao_tec_id || ''}
            onChange={(e) => onUpdate(index, { questao_tec_id: parseInt(e.target.value, 10) || 0 })}
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Banca Organizadora</label>
          <input
            type="text"
            value={question.banca_texto || ''}
            onChange={(e) => onUpdate(index, { banca_texto: e.target.value })}
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Gabarito Oficial</label>
          <select
            value={question.gabarito || ''}
            onChange={(e) => onUpdate(index, { gabarito: e.target.value })}
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

      {/* Linha 2: Matéria e Assunto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Matéria</label>
          <input
            type="text"
            value={question.materia || ''}
            onChange={(e) => onUpdate(index, { materia: e.target.value })}
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Assunto</label>
          <input
            type="text"
            value={question.assunto || ''}
            onChange={(e) => onUpdate(index, { assunto: e.target.value })}
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
      </div>

      {/* Linha 3: Órgão, Concurso e Ano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Órgão</label>
          <input
            type="text"
            value={question.orgao || ''}
            onChange={(e) => {
              const newOrgao = e.target.value
              const updatedProva = newOrgao ? `${newOrgao} / ${question.ano || ''}` : ''
              onUpdate(index, { orgao: newOrgao, prova: updatedProva })
            }}
            placeholder="Ex: TRE MS"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Cargo / Concurso</label>
          <input
            type="text"
            value={question.concurso || ''}
            onChange={(e) => onUpdate(index, { concurso: e.target.value })}
            placeholder="Ex: CEBRASPE - Analista Judiciário"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Ano</label>
          <input
            type="number"
            value={question.ano || ''}
            onChange={(e) => {
              const newAno = parseInt(e.target.value, 10) || null
              const updatedProva = question.orgao ? `${question.orgao} / ${newAno || ''}` : ''
              onUpdate(index, { ano: newAno, prova: updatedProva })
            }}
            placeholder="Ex: 2024"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2]"
          />
        </div>
      </div>

      {/* Linha 4: Enunciado */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Enunciado da Questão</label>
        <textarea
          value={question.enunciado || ''}
          onChange={(e) => onUpdate(index, { enunciado: e.target.value })}
          className="w-full min-h-[120px] bg-card border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#1976d2] resize-y leading-relaxed"
        />
      </div>

      {/* Linha 5: Alternativas */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide block">Textos das Alternativas</label>
        {['A', 'B', 'C', 'D', 'E'].map(letter => {
          const optionText = question.alternativas?.[letter]

          return (
            <div key={letter} className="flex gap-2 items-center">
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-black text-xxs shrink-0 border border-border">
                {letter}
              </span>
              <input
                type="text"
                value={optionText || ''}
                onChange={(e) => {
                  const currentAlts = { ...question.alternativas }
                  currentAlts[letter] = e.target.value
                  onUpdate(index, { alternativas: currentAlts })
                }}
                className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#1976d2]"
                placeholder={`Texto da alternativa ${letter}...`}
              />
            </div>
          )
        })}
      </div>

      {/* Ações da questão */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={() => onDelete(index)}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Descartar esta questão</span>
        </button>
      </div>
    </div>
  )
}
