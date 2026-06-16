import { useState } from 'react'
import { Pencil, Loader2, Check } from 'lucide-react'
import type { ResolucaoView } from '../types/database'
import { Modal } from './ui/Modal'

interface QuestaoModalEdicaoProps {
  isOpen: boolean
  questao: ResolucaoView | null
  onClose: () => void
  onSave: (data: {
    enunciado: string
    materia: string
    assunto: string
    banca_texto: string
    orgao: string
    concurso: string
    prova: string
    ano: number | null
    gabarito: string
    alternativas: Record<string, string>
  }) => Promise<boolean>
}

function getFormFromQuestao(questao: ResolucaoView) {
  return {
    enunciado: questao.enunciado || '',
    materia: questao.materia || '',
    assunto: questao.assunto || '',
    banca_texto: questao.banca_texto || '',
    orgao: questao.orgao || '',
    concurso: questao.concurso || '',
    prova: questao.prova || '',
    ano: questao.ano || null as number | null,
    gabarito: questao.gabarito || '',
    alternativas: questao.alternativas || {} as Record<string, string>,
  }
}

export function QuestaoModalEdicao({ isOpen, questao, onClose, onSave }: QuestaoModalEdicaoProps) {
  const [form, setForm] = useState({
    enunciado: '',
    materia: '',
    assunto: '',
    banca_texto: '',
    orgao: '',
    concurso: '',
    prova: '',
    ano: null as number | null,
    gabarito: '',
    alternativas: {} as Record<string, string>,
  })
  const [saving, setSaving] = useState(false)

  if (isOpen && questao) {
    const fresh = getFormFromQuestao(questao)
    if (form.enunciado !== fresh.enunciado) {
      setForm(fresh)
    }
  }

  const set = (field: string, value: string | number | null | Record<string, string>) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const ok = await onSave({
        enunciado: form.enunciado,
        materia: form.materia,
        assunto: form.assunto,
        banca_texto: form.banca_texto,
        orgao: form.orgao,
        concurso: form.concurso,
        prova: form.prova,
        ano: form.ano,
        gabarito: form.gabarito,
        alternativas: form.alternativas,
      })
      if (ok) {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Dados da Questão"
      subtitle="Modifique o texto, alternativas e metadados diretamente no banco de dados"
      icon={<Pencil className="w-5 h-5" />}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !form.enunciado.trim()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar e Salvar</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Matéria</label>
              <input 
                type="text"
                value={form.materia}
                onChange={(e) => set('materia', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Assunto</label>
              <input 
                type="text"
                value={form.assunto}
                onChange={(e) => set('assunto', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Banca</label>
              <input 
                type="text"
                value={form.banca_texto}
                onChange={(e) => set('banca_texto', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Órgão</label>
              <input 
                type="text"
                value={form.orgao}
                onChange={(e) => set('orgao', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Ano</label>
              <input 
                type="number"
                value={form.ano || ''}
                onChange={(e) => set('ano', e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Gabarito</label>
              <select 
                value={form.gabarito}
                onChange={(e) => set('gabarito', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Concurso / Cargo</label>
              <input 
                type="text"
                value={form.concurso}
                onChange={(e) => set('concurso', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Prova</label>
              <input 
                type="text"
                value={form.prova}
                onChange={(e) => set('prova', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Enunciado da Questão</label>
            <textarea 
              value={form.enunciado}
              onChange={(e) => set('enunciado', e.target.value)}
              className="w-full min-h-[140px] bg-card border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none resize-y leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide block">Alternativas</label>
            {['A', 'B', 'C', 'D', 'E'].map(letter => {
              const optionText = form.alternativas[letter] || ''

              return (
                <div key={letter} className="flex gap-2 items-center">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-black text-xxs shrink-0 border border-border">
                    {letter}
                  </span>
                  <input 
                    type="text"
                    value={optionText}
                    onChange={(e) => {
                      setForm(prev => ({
                        ...prev,
                        alternativas: { ...prev.alternativas, [letter]: e.target.value }
                      }))
                    }}
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] text-foreground focus:outline-none"
                    placeholder={`Texto da alternativa ${letter}...`}
                  />
                </div>
              )
            })}
          </div>
      </div>
    </Modal>
  )
}
