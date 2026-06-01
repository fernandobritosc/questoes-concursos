import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllQuestoes, fetchAllResolucoes } from '../services/supabase.service'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { 
  saveStudyMaterial,
  getStudyMaterial,
  deleteStudyMaterial,
  listAllStudyMaterialsMetadata,
  checkCloudAvailability
} from '../services/studyMaterial.service'
import type { StudyMaterialMetadata } from '../services/studyMaterial.service'
import { 
  Map as MapIcon, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Play, 
  Percent, 
  ShieldAlert, 
  Award, 
  AlertTriangle, 
  HelpCircle,
  TrendingUp,
  Layers,
  Cloud,
  HardDrive,
  FileText,
  BookOpen,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'

interface SubTopicData {
  nome: string
  totalQuestoes: number
  totalTentativas: number
  acertos: number
  erros: number
  taxaAcerto: number
  status: 'excelente' | 'atencao' | 'critico' | 'nao_estudado'
}

interface SubjectData {
  nome: string
  totalQuestoes: number
  totalTentativas: number
  acertos: number
  erros: number
  taxaAcerto: number
  assuntos: SubTopicData[]
}

export function MapaQuestoes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})
  const [subjectsData, setSubjectsData] = useState<SubjectData[]>([])
  
  // Estados para armazenamento de PDFs
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>(() => {
    return (localStorage.getItem('mapa_storage_mode') as 'local' | 'cloud') || 'local'
  })
  const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null)
  const [materialsMetadata, setMaterialsMetadata] = useState<Record<string, StudyMaterialMetadata>>({})
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [showSqlModal, setShowSqlModal] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Overall statistics variables
  const [overallStats, setOverallStats] = useState({
    totalAssuntos: 0,
    totalQuestoes: 0,
    totalResolvidasUnicas: 0,
    totalTentativas: 0,
    totalAcertos: 0,
    aproveitamentoGeral: 0,
    topAssuntoEstudado: 'N/A'
  })

  // Carrega disponibilidade da nuvem e metadados de estudo
  useEffect(() => {
    async function initStorage() {
      const isCloudAvailable = await checkCloudAvailability()
      setCloudAvailable(isCloudAvailable)
      
      let activeMode = storageMode
      if (storageMode === 'cloud' && !isCloudAvailable) {
        activeMode = 'local'
        setStorageMode('local')
        localStorage.setItem('mapa_storage_mode', 'local')
      }
      
      try {
        const meta = await listAllStudyMaterialsMetadata(activeMode)
        setMaterialsMetadata(meta)
      } catch (err) {
        console.error('Erro ao buscar metadados de estudo:', err)
      }
    }
    
    initStorage()
  }, [storageMode])

  useEffect(() => {
    async function loadData() {
      try {
        const [questoes, historico] = await Promise.all([
          fetchAllQuestoes(),
          fetchAllResolucoes()
        ])

        const subjectsMap = new Map<string, {
          nome: string
          totalQuestoes: number
          totalTentativas: number
          acertos: number
          erros: number
          assuntosMap: Map<string, {
            nome: string
            totalQuestoes: number
            totalTentativas: number
            acertos: number
            erros: number
          }>
        }>

        // 1. Agrega matérias e assuntos com base em todas as questões disponíveis
        questoes.forEach(q => {
          const mat = q.materia || 'Sem Matéria'
          const ass = q.assunto || 'Sem Assunto'

          if (!subjectsMap.has(mat)) {
            subjectsMap.set(mat, {
              nome: mat,
              totalQuestoes: 0,
              totalTentativas: 0,
              acertos: 0,
              erros: 0,
              assuntosMap: new Map()
            })
          }
          const subject = subjectsMap.get(mat)!
          subject.totalQuestoes++

          if (!subject.assuntosMap.has(ass)) {
            subject.assuntosMap.set(ass, {
              nome: ass,
              totalQuestoes: 0,
              totalTentativas: 0,
              acertos: 0,
              erros: 0
            })
          }
          const subtopic = subject.assuntosMap.get(ass)!
          subtopic.totalQuestoes++
        })

        // 2. Agrega os logs de tentativas cronológicas
        historico.forEach(h => {
          const mat = h.materia || 'Sem Matéria'
          const ass = h.assunto || 'Sem Assunto'

          if (subjectsMap.has(mat)) {
            const subject = subjectsMap.get(mat)!
            subject.totalTentativas++
            if (h.acertou) subject.acertos++
            else subject.erros++

            const subtopic = subject.assuntosMap.get(ass)
            if (subtopic) {
              subtopic.totalTentativas++
              if (h.acertou) subtopic.acertos++
              else subtopic.erros++
            }
          }
        })

        // 3. Converte o mapa agrupado em array formatado de SubjectData
        let totalAssuntosCount = 0
        let totalTentativasCount = 0
        let totalAcertosCount = 0
        let topAssunto = { nome: 'N/A', tentativas: 0 }

        const formattedData: SubjectData[] = Array.from(subjectsMap.values()).map(subj => {
          const assuntos: SubTopicData[] = Array.from(subj.assuntosMap.values()).map(ass => {
            totalAssuntosCount++
            totalTentativasCount += ass.totalTentativas
            totalAcertosCount += ass.acertos

            if (ass.totalTentativas > topAssunto.tentativas) {
              topAssunto = { nome: `${subj.nome} > ${ass.nome}`, tentativas: ass.totalTentativas }
            }

            const taxaAcerto = ass.totalTentativas > 0 ? Math.round((ass.acertos / ass.totalTentativas) * 100) : 0
            
            let status: SubTopicData['status'] = 'nao_estudado'
            if (ass.totalTentativas > 0) {
              if (taxaAcerto >= 80) status = 'excelente'
              else if (taxaAcerto >= 50) status = 'atencao'
              else status = 'critico'
            }

            return {
              nome: ass.nome,
              totalQuestoes: ass.totalQuestoes,
              totalTentativas: ass.totalTentativas,
              acertos: ass.acertos,
              erros: ass.erros,
              taxaAcerto,
              status
            }
          }).sort((a, b) => b.totalTentativas - a.totalTentativas || b.totalQuestoes - a.totalQuestoes)

          const subjTaxa = subj.totalTentativas > 0 ? Math.round((subj.acertos / subj.totalTentativas) * 100) : 0

          return {
            nome: subj.nome,
            totalQuestoes: subj.totalQuestoes,
            totalTentativas: subj.totalTentativas,
            acertos: subj.acertos,
            erros: subj.erros,
            taxaAcerto: subjTaxa,
            assuntos
          }
        }).sort((a, b) => b.totalTentativas - a.totalTentativas || b.totalQuestoes - a.totalQuestoes)

        // Calcula questões respondidas únicas (que possuem alguma resposta registrada)
        const uniqueResolvedCount = questoes.filter(q => q.alternativa && q.alternativa !== '').length

        setOverallStats({
          totalAssuntos: totalAssuntosCount,
          totalQuestoes: questoes.length,
          totalResolvidasUnicas: uniqueResolvedCount,
          totalTentativas: totalTentativasCount,
          totalAcertos: totalAcertosCount,
          aproveitamentoGeral: totalTentativasCount > 0 ? Math.round((totalAcertosCount / totalTentativasCount) * 100) : 0,
          topAssuntoEstudado: topAssunto.nome
        })

        setSubjectsData(formattedData)
        
        // Abre automaticamente a primeira matéria mais estudada para conveniência visual
        if (formattedData.length > 0) {
          setExpandedSubjects({ [formattedData[0].nome]: true })
        }

      } catch (err) {
        console.error('Erro ao carregar mapa de questões:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handleRevisar = (materia: string, assunto: string) => {
    const matUrl = encodeURIComponent(materia)
    const assUrl = encodeURIComponent(assunto)
    navigate(`/app/questoes?materia=${matUrl}&assunto=${assUrl}`)
  }

  // Lógica de Manipulação de PDF
  const handleToggleStorageMode = async (mode: 'local' | 'cloud') => {
    if (mode === 'cloud') {
      const isCloudAvailable = await checkCloudAvailability()
      if (!isCloudAvailable) {
        setShowSqlModal(true)
        return
      }
    }
    setStorageMode(mode)
    localStorage.setItem('mapa_storage_mode', mode)
  }

  const handleUploadPdf = async (materia: string, assunto: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo válido no formato PDF.')
      return
    }

    const key = `${materia} | ${assunto}`
    setUploadingKey(key)
    try {
      const result = await saveStudyMaterial(materia, assunto, file.name, file, storageMode)
      
      // Atualiza metadados localmente no estado
      setMaterialsMetadata(prev => ({
        ...prev,
        [key]: {
          fileName: file.name,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          updatedAt: new Date().toISOString()
        }
      }))
    } catch (err: any) {
      console.error('Erro ao salvar material:', err)
      alert(`Erro ao salvar material de estudo: ${err.message}`)
    } finally {
      setUploadingKey(null)
    }
  }

  const handleOpenPdf = async (materia: string, assunto: string) => {
    const key = `${materia} | ${assunto}`
    setUploadingKey(key)
    try {
      const result = await getStudyMaterial(materia, assunto, storageMode)
      if (result) {
        // Abre o PDF compactado descompactado diretamente em uma nova aba do navegador!
        // Excelente para Snapping (lado a lado) ou uso em monitor secundário.
        window.open(result.blobUrl, '_blank')
      } else {
        alert('Material de estudo não localizado no armazenamento.')
      }
    } catch (err: any) {
      console.error('Erro ao abrir material:', err)
      alert(`Erro ao abrir material de estudo: ${err.message}`)
    } finally {
      setUploadingKey(null)
    }
  }

  const handleDeletePdf = async (materia: string, assunto: string) => {
    if (!confirm(`Deseja realmente excluir o material de estudo anexado ao assunto "${assunto}"?`)) {
      return
    }
    const key = `${materia} | ${assunto}`
    try {
      await deleteStudyMaterial(materia, assunto, storageMode)
      setMaterialsMetadata(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch (err: any) {
      console.error('Erro ao remover material:', err)
      alert(`Erro ao remover material de estudo: ${err.message}`)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto w-full pb-16">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div>
          <span className="text-xxs font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-500/20">
            Painel de Rastreabilidade
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-3 flex items-center gap-2">
            <MapIcon className="w-7 h-7 text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
            Mapa de Desempenho
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-semibold">
            Monitore seu progresso e identifique pontos fracos por assunto no seu banco de questões.
          </p>
        </div>

        {/* Seletor de Modo de Armazenamento */}
        <div className="flex items-center gap-3 bg-card/45 border border-border/80 px-4 py-2 rounded-xl shadow-xxs backdrop-blur-xxs self-start md:self-auto shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estudo PDF:</span>
          <div className="flex items-center bg-muted/65 p-0.5 rounded-lg border border-border/40">
            <button
              onClick={() => handleToggleStorageMode('local')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                storageMode === 'local' 
                  ? 'bg-violet-600 text-white shadow-xs font-black' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer font-bold'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              Local
            </button>
            <button
              onClick={() => handleToggleStorageMode('cloud')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                storageMode === 'cloud' 
                  ? 'bg-violet-600 text-white shadow-xs font-black' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer font-bold'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              Nuvem {cloudAvailable === true && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-xxs">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Assuntos Mapeados</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">{overallStats.totalAssuntos}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Em {subjectsData.length} matérias</p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-xxs">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Resolvidas / Totais</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">
              {overallStats.totalResolvidasUnicas} <span className="text-xs text-muted-foreground font-semibold">/ {overallStats.totalQuestoes}</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
              {overallStats.totalQuestoes > 0 
                ? `${Math.round((overallStats.totalResolvidasUnicas / overallStats.totalQuestoes) * 100)}% de cobertura` 
                : '0% de cobertura'}
            </p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-xxs">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
            overallStats.aproveitamentoGeral >= 80 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : overallStats.aproveitamentoGeral >= 50 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <Percent className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Aproveitamento Geral</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">{overallStats.aproveitamentoGeral}%</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
              De {overallStats.totalTentativas} tentativas
            </p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-xxs">
          <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Mais Estudado</span>
            <h3 className="text-xs font-black text-foreground mt-1 truncate" title={overallStats.topAssuntoEstudado}>
              {overallStats.topAssuntoEstudado}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
              {overallStats.totalTentativas > 0 
                ? `${overallStats.totalTentativas} resoluções globais`
                : 'Nenhuma tentativa'}
            </p>
          </div>
        </div>

      </div>

      {/* Listagem de Matérias (Capsulas) */}
      <div className="space-y-4">
        
        {subjectsData.map((subject) => {
          const isExpanded = expandedSubjects[subject.nome]
          const resolvidosCount = subject.assuntos.filter(a => a.totalTentativas > 0).length
          const totalAssuntosSubject = subject.assuntos.length
          const firstExpandedSubject = subjectsData.find(s => expandedSubjects[s.nome])
          const isFirstExpanded = firstExpandedSubject?.nome === subject.nome

          return (
            <div key={subject.nome} className="bg-card/25 border border-border/80 rounded-2xl overflow-hidden shadow-xxs transition-all">
              
              {/* Capsula Principal / Accordion Header */}
              <div 
                onClick={() => toggleSubject(subject.nome)}
                className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-card/45 ${isExpanded ? 'bg-muted/30 border-b border-border/80' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-extrabold text-foreground truncate max-w-lg">
                      {subject.nome}
                    </h2>
                    
                    {/* Badge de Resumo de Desempenho da Matéria */}
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {resolvidosCount} / {totalAssuntosSubject} Tópicos
                    </span>

                    {subject.totalTentativas > 0 && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        subject.taxaAcerto >= 80 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : subject.taxaAcerto >= 50 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        Aproveitamento: {subject.taxaAcerto}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                    {subject.totalQuestoes} {subject.totalQuestoes === 1 ? 'questão disponível' : 'questões disponíveis'} • {subject.totalTentativas} tentativas no histórico
                  </p>
                </div>
                
                <div className="ml-4 text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Grid Expansível de Quadradinhos / Sub-tópicos */}
              {isExpanded && (
                <div className="p-6 bg-card/10 animate-in slide-in-from-top-2 duration-300 space-y-5">
                  {/* Legenda dos Níveis de Aproveitamento - Apenas no primeiro card expandido */}
                  {isFirstExpanded && (
                    <div className="bg-card/45 border border-border/80 p-4 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start">
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-emerald-400" /> Excelência (&gt;= 80%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30 border border-amber-400" /> Regular (50% a 79%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30 border border-rose-400" /> Crítico (&lt; 50%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-zinc-500 shadow-sm shadow-zinc-500/30 border border-zinc-400" /> Não Resolvido</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {subject.assuntos.map((assunto) => {
                      // Cores e ícones baseados no status de acerto
                      let cardBorder = 'border-border/60 hover:border-zinc-500/40'
                      let statusBadge = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      let statusText = 'Não Resolvido'
                      let Icon = HelpCircle
                      let tooltipText = 'Não Resolvido: nenhuma questão resolvida'

                      if (assunto.status === 'excelente') {
                        cardBorder = 'border-l-4 border-l-emerald-500 hover:border-emerald-500/40'
                        statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        statusText = `Excelente (${assunto.taxaAcerto}%)`
                        Icon = Award
                        tooltipText = 'Excelência: >= 80% de acerto'
                      } else if (assunto.status === 'atencao') {
                        cardBorder = 'border-l-4 border-l-amber-500 hover:border-amber-500/40'
                        statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        statusText = `Regular (${assunto.taxaAcerto}%)`
                        Icon = AlertTriangle
                        tooltipText = 'Regular: 50% a 79% de acerto'
                      } else if (assunto.status === 'critico') {
                        cardBorder = 'border-l-4 border-l-rose-500 hover:border-rose-500/40'
                        statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        statusText = `Crítico (${assunto.taxaAcerto}%)`
                        Icon = ShieldAlert
                        tooltipText = 'Crítico: < 50% de acerto'
                      }

                      const key = `${subject.nome} | ${assunto.nome}`
                      const material = materialsMetadata[key]
                      const isUploading = uploadingKey === key

                      return (
                        <div 
                          key={assunto.nome}
                          className={`bg-card border p-4 rounded-xl flex flex-col justify-between space-y-4 shadow-xxs transition-all ${cardBorder}`}
                        >
                          <div className="space-y-2">
                            {/* Nome do Assunto */}
                            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2" title={assunto.nome}>
                              {assunto.nome}
                            </h3>
                            
                            {/* Info de Métricas e Performance */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span 
                                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 cursor-help transition-all duration-200 ${statusBadge}`}
                                title={tooltipText}
                              >
                                <Icon className="w-3 h-3" />
                                {statusText}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* Medidor de cobertura */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                <span>{assunto.totalTentativas} tentativas</span>
                                <span>{assunto.acertos} acertos</span>
                              </div>
                              
                              {/* Barra de progresso visual */}
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    assunto.status === 'excelente' 
                                      ? 'bg-emerald-500' 
                                      : assunto.status === 'atencao' 
                                        ? 'bg-amber-500' 
                                        : assunto.status === 'critico' 
                                          ? 'bg-rose-500' 
                                          : 'bg-zinc-500'
                                  }`}
                                  style={{ width: `${assunto.totalTentativas > 0 ? assunto.taxaAcerto : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Seção de Material de Estudo (PDF com Compressão) */}
                            <div className="border-t border-border/40 pt-3 mt-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-violet-400" />
                                  Material de Estudo
                                </span>
                                {material && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={`Original: ${formatSize(material.originalSize)} | Compactado: ${formatSize(material.compressedSize)}`}>
                                    {Math.round(((material.originalSize - material.compressedSize) / material.originalSize) * 100)}% menor
                                  </span>
                                )}
                              </div>

                              {material ? (
                                <div className="flex items-center gap-1.5">
                                  {/* Botão de abrir PDF */}
                                  <button
                                    onClick={() => handleOpenPdf(subject.nome, assunto.nome)}
                                    disabled={isUploading}
                                    className="flex-1 py-1.5 px-3 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all cursor-pointer disabled:opacity-50"
                                    title={`Arquivo compactado: ${material.fileName} (${formatSize(material.compressedSize)})`}
                                  >
                                    {isUploading ? (
                                      <div className="w-3.5 h-3.5 border-2 border-t-transparent border-violet-400 rounded-full animate-spin" />
                                    ) : (
                                      <BookOpen className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isUploading ? 'Processando...' : 'Estudar PDF'}</span>
                                  </button>

                                  {/* Botão de Excluir */}
                                  <button
                                    onClick={() => handleDeletePdf(subject.nome, assunto.nome)}
                                    className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
                                    title="Remover Material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <label 
                                    className="w-full py-1.5 px-3 rounded-lg border border-dashed border-border/80 hover:border-violet-500/40 hover:bg-violet-500/5 text-[10px] font-extrabold text-muted-foreground hover:text-violet-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    {isUploading ? (
                                      <div className="w-3.5 h-3.5 border-2 border-t-transparent border-violet-400 rounded-full animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isUploading ? 'Compactando...' : 'Adicionar PDF'}</span>
                                    <input 
                                      type="file" 
                                      accept=".pdf" 
                                      className="hidden" 
                                      onChange={(e) => handleUploadPdf(subject.nome, assunto.nome, e)}
                                      disabled={isUploading}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Botão integrado de Revisar Assunto */}
                            <button
                              onClick={() => handleRevisar(subject.nome, assunto.nome)}
                              className="w-full py-2 px-3 rounded-lg text-xxs font-black uppercase tracking-wider flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-750 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Revisar Assunto</span>
                            </button>
                          </div>

                        </div>
                      )
                    })}

                  </div>
                </div>
              )}

            </div>
          )
        })}

        {subjectsData.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card/25 border border-border border-dashed rounded-2xl">
            <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-bold text-foreground">Nenhuma questão cadastrada no banco</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Importe seus cadernos de PDF do TEC Concursos para carregar o seu mapa de desempenho.
            </p>
          </div>
        )}

      </div>

      {/* Modal Instrutivo SQL para Ativar Nuvem (Supabase) */}
      {showSqlModal && (
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
                onClick={() => setShowSqlModal(false)}
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
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 border border-border/60 hover:bg-muted/60 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const isAvail = await checkCloudAvailability()
                  if (isAvail) {
                    setCloudAvailable(true)
                    setStorageMode('cloud')
                    localStorage.setItem('mapa_storage_mode', 'cloud')
                    setShowSqlModal(false)
                    alert('Sincronização na Nuvem ativada com sucesso!')
                  } else {
                    alert('A tabela ainda não foi detectada. Verifique se executou o SQL no editor do Supabase.')
                  }
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer font-bold active:scale-95"
              >
                Tentar Novamente
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

