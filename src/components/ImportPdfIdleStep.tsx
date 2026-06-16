import { Upload, Book } from 'lucide-react'

interface ImportPdfIdleStepProps {
  importFile: File | null
  customCadernoName: string
  onFileChange: (file: File) => void
  onRemoveFile: () => void
  onNameChange: (name: string) => void
  onCancel: () => void
  onAnalyze: () => void
  onError?: (msg: string) => void
}

export function ImportPdfIdleStep({
  importFile,
  customCadernoName,
  onFileChange,
  onRemoveFile,
  onNameChange,
  onCancel,
  onAnalyze,
  onError,
}: ImportPdfIdleStepProps) {
  return (
    <div className="space-y-5">
      {!importFile ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file && file.type === 'application/pdf') {
              onFileChange(file)
            } else {
              onError?.('Apenas arquivos PDF são permitidos.')
            }
          }}
          className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-[#1976d2] bg-blue-50/10 hover:bg-blue-50/20 rounded-xl p-8 text-center cursor-pointer transition-all group"
        >
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onFileChange(file)
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
            onClick={onRemoveFile}
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
            placeholder="Ex: Informática Polícia Federal 2026"
            value={customCadernoName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] shadow-xxs"
          />
          <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
            Este nome será usado para agrupar as novas questões no seu Banco de Questões Pessoal.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onAnalyze}
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
  )
}
