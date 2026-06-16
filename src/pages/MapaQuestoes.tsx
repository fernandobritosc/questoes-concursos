import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllQuestoes, fetchAllResolucoes } from '../services/supabase.service'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { 
  saveStudyMaterial,
  getStudyMaterial,
  revokeStudyMaterialUrl,
  deleteStudyMaterial,
  listAllStudyMaterialsMetadata,
  checkCloudAvailability
} from '../services/studyMaterial.service'
import type { StudyMaterialMetadata } from '../services/studyMaterial.service'
import { Map as MapIcon, Cloud, HardDrive } from 'lucide-react'
import { MapaStatsCards } from '../components/MapaStatsCards'
import { MapaMateriaAccordion, type SubjectData, type SubTopicData } from '../components/MapaMateriaAccordion'
import { MapaSqlSetupModal } from '../components/MapaSqlSetupModal'
import { useToast } from '../contexts/ToastContext'

export function MapaQuestoes() {
  const toast = useToast()
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

  const blobUrlsRef = useRef<string[]>([])

  useEffect(() => {
    const urls = blobUrlsRef.current
    return () => {
      urls.forEach(revokeStudyMaterialUrl)
    }
  }, [])

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
      } catch (err: unknown) {
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

      } catch (err: unknown) {
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
      toast.warning('Arquivo inválido', 'Por favor, selecione um arquivo válido no formato PDF.')
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
    } catch (err: unknown) {
      console.error('Erro ao salvar material:', err)
      toast.error('Erro ao salvar', `Erro ao salvar material de estudo: ${err instanceof Error ? err.message : String(err)}`)
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
        blobUrlsRef.current.push(result.blobUrl)
        window.open(result.blobUrl, '_blank')
      } else {
        toast.warning('Não encontrado', 'Material de estudo não localizado no armazenamento.')
      }
    } catch (err: unknown) {
      console.error('Erro ao abrir material:', err)
      toast.error('Erro ao abrir', `Erro ao abrir material de estudo: ${err instanceof Error ? err.message : String(err)}`)
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
    } catch (err: unknown) {
      console.error('Erro ao remover material:', err)
      toast.error('Erro ao remover', `Erro ao remover material de estudo: ${err instanceof Error ? err.message : String(err)}`)
    }
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
        <div className="flex items-center gap-3 bg-card/45 border border-border/80 px-4 py-2 rounded-xl shadow-xxs backdrop-blur-sm self-start md:self-auto shrink-0">
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

      <MapaStatsCards
        totalAssuntos={overallStats.totalAssuntos}
        totalQuestoes={overallStats.totalQuestoes}
        totalResolvidasUnicas={overallStats.totalResolvidasUnicas}
        totalTentativas={overallStats.totalTentativas}
        aproveitamentoGeral={overallStats.aproveitamentoGeral}
        topAssuntoEstudado={overallStats.topAssuntoEstudado}
        subjectsCount={subjectsData.length}
      />

      <MapaMateriaAccordion
        subjects={subjectsData}
        expandedSubjects={expandedSubjects}
        onToggleSubject={toggleSubject}
        uploadingKey={uploadingKey}
        materialsMetadata={materialsMetadata}
        onUploadPdf={handleUploadPdf}
        onOpenPdf={handleOpenPdf}
        onDeletePdf={handleDeletePdf}
        onRevisar={handleRevisar}
      />

      <MapaSqlSetupModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
        onRetry={async () => {
          const isAvail = await checkCloudAvailability()
          if (isAvail) {
            setCloudAvailable(true)
            setStorageMode('cloud')
            localStorage.setItem('mapa_storage_mode', 'cloud')
            setShowSqlModal(false)
            toast.success('Nuvem ativada', 'Sincronização na Nuvem ativada com sucesso!')
          } else {
            toast.warning('Tabela não encontrada', 'A tabela ainda não foi detectada. Verifique se executou o SQL no editor do Supabase.')
          }
        }}
      />

    </div>
  )
}

