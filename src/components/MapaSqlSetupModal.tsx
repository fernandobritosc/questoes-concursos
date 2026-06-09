import { useState } from 'react'
import { Cloud, AlertCircle, X, Copy, Check } from 'lucide-react'

interface MapaSqlSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => Promise<void>
}

const sqlCode = `-- ==========================================
-- 1. CRIAR TABELA DE METADADOS DOS PDFs
-- ==========================================
CREATE TABLE IF NOT EXISTS public.materiais_estudo (
    id text PRIMARY KEY, -- Formato: "materia | assunto"
    materia text NOT NULL,
    assunto text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL, -- URL pública direta do PDF no Supabase Storage
    original_size integer NOT NULL, -- Tamanho original em bytes
    compressed_size integer NOT NULL, -- Tamanho compactado em bytes
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e liberar acesso total para usuários anônimos (anon)
ALTER TABLE public.materiais_estudo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select anon" ON public.materiais_estudo FOR SELECT USING (true);
CREATE POLICY "Permitir insert anon" ON public.materiais_estudo FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update anon" ON public.materiais_estudo FOR UPDATE USING (true);
CREATE POLICY "Permitir delete anon" ON public.materiais_estudo FOR DELETE USING (true);

-- ==========================================
-- 2. CRIAR POLÍTICAS DE UPLOAD NO STORAGE
-- ==========================================
-- Habilita upload anônimo (INSERT) para o bucket 'materiais-estudo'
CREATE POLICY "Permitir upload anon no bucket" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'materiais-estudo');

-- Habilita download anônimo (SELECT) para o bucket 'materiais-estudo'
CREATE POLICY "Permitir select anon no bucket" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'materiais-estudo');

-- Habilita substituição anônima (UPDATE) para o bucket 'materiais-estudo'
CREATE POLICY "Permitir update anon no bucket" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'materiais-estudo')
WITH CHECK (bucket_id = 'materiais-estudo');

-- Habilita exclusão anônima (DELETE) para o bucket 'materiais-estudo'
CREATE POLICY "Permitir delete anon no bucket" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'materiais-estudo');`

export function MapaSqlSetupModal({ isOpen, onClose, onRetry }: MapaSqlSetupModalProps) {
  const [copiedSql, setCopiedSql] = useState(false)

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">

        <div className="px-6 py-4 border-b border-border/80 bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-400">
            <Cloud className="w-5.5 h-5.5 animate-bounce" />
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              Ativar Sincronização em Nuvem (Supabase)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl text-violet-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-foreground">Configuração Rápida em Nuvem</p>
              <p className="font-medium text-violet-300/90 leading-relaxed">
                Para habilitar a sincronização automática de PDFs entre múltiplos aparelhos, você só precisa criar uma tabela leve de metadados no Supabase executando o script abaixo no seu <strong>SQL Editor</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Script SQL de Ativação</span>
              <button
                onClick={handleCopySql}
                className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-750 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-xl border border-border/80 bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto select-all leading-normal max-h-60">
              {sqlCode}
            </pre>
          </div>

          <div className="border-t border-border/40 pt-4 space-y-3">
            <p className="text-xxs font-black text-muted-foreground uppercase tracking-wider">Passos após rodar o SQL:</p>
            <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-2 font-medium">
              <li>Crie um novo bucket público de Storage chamado <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">materiais-estudo</code> no console do seu Supabase.</li>
              <li>Clique em <strong>"Tentar Novamente"</strong> no botão abaixo ou mude o switch para <strong>Nuvem</strong> para começar a sincronizar instantaneamente!</li>
            </ol>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/80 bg-muted/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border/60 hover:bg-muted/60 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer font-bold active:scale-95"
          >
            Tentar Novamente
          </button>
        </div>

      </div>
    </div>
  )
}
