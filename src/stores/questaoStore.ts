import { create } from 'zustand'
import type { ResolucaoView, HistoricoResolucao, FilterOptions } from '../types/database'

interface QuestaoCacheState {
  // fetchAllQuestoes cache
  questoesCache: ResolucaoView[] | null
  questoesCacheTimestamp: number

  // fetchAllQuestoesLeves cache
  questoesLevesCache: ResolucaoView[] | null
  questoesLevesCacheTimestamp: number

  // fetchAllResolucoes cache (completo e leve)
  resolucoesCache: ResolucaoView[] | null
  resolucoesCacheTimestamp: number
  resolucoesLevesCache: ResolucaoView[] | null
  resolucoesLevesCacheTimestamp: number

  // fetchPaginatedQuestoes progressive cache
  progressiveCache: ResolucaoView[]
  progressiveCachedPages: string[]
  progressiveFilterHash: string | null
  progressiveTotalCount: number
  progressiveTotalPages: number

  // historico cache
  historicoCache: HistoricoResolucao[] | null
  historicoCachePromise: boolean

  // filter options cache
  filterOptionsCache: FilterOptions | null
  filterOptionsPromise: boolean

  // promise dedup flags
  questoesCachePromise: boolean
  questoesLevesCachePromise: boolean
  resolucoesCachePromise: boolean
  resolucoesLevesCachePromise: boolean

  // Actions
  setQuestoesCache: (data: ResolucaoView[]) => void
  invalidateQuestoesCache: () => void
  isQuestoesCacheValid: (ttlMs: number) => boolean
  setQuestoesLevesCache: (data: ResolucaoView[]) => void
  isQuestoesLevesCacheValid: (ttlMs: number) => boolean
  setResolucoesCache: (data: ResolucaoView[]) => void
  isResolucoesCacheValid: (ttlMs: number) => boolean
  setResolucoesLevesCache: (data: ResolucaoView[]) => void
  isResolucoesLevesCacheValid: (ttlMs: number) => boolean

  setProgressivePage: (hash: string, page: string, data: ResolucaoView[], totalCount: number, totalPages: number) => void
  getProgressivePage: (hash: string, page: string) => { data: ResolucaoView[]; totalCount: number; totalPages: number } | null
  resetProgressiveCache: (hash: string) => void

  setHistoricoCache: (data: HistoricoResolucao[]) => void
  getHistoricoCache: () => HistoricoResolucao[] | null
  setHistoricoCachePromise: (v: boolean) => void

  setFilterOptionsCache: (data: FilterOptions) => void
  getFilterOptionsCache: () => FilterOptions | null
  setFilterOptionsPromise: (v: boolean) => void

  setQuestoesCachePromise: (v: boolean) => void
  setQuestoesLevesCachePromise: (v: boolean) => void
  setResolucoesCachePromise: (v: boolean) => void
  setResolucoesLevesCachePromise: (v: boolean) => void
}

const CACHE_TTL_MS = 60000

export const useQuestaoStore = create<QuestaoCacheState>((set, get) => ({
  // State
  questoesCache: null,
  questoesCacheTimestamp: 0,
  questoesLevesCache: null,
  questoesLevesCacheTimestamp: 0,
  resolucoesCache: null,
  resolucoesCacheTimestamp: 0,
  resolucoesLevesCache: null,
  resolucoesLevesCacheTimestamp: 0,
  progressiveCache: [],
  progressiveCachedPages: [],
  progressiveFilterHash: null,
  progressiveTotalCount: 0,
  progressiveTotalPages: 0,
  historicoCache: null,
  historicoCachePromise: false,
  filterOptionsCache: null,
  filterOptionsPromise: false,
  questoesCachePromise: false,
  questoesLevesCachePromise: false,
  resolucoesCachePromise: false,
  resolucoesLevesCachePromise: false,

  // Actions - fetchAllQuestoes
  setQuestoesCache: (data) => set({
    questoesCache: data,
    questoesCacheTimestamp: Date.now(),
    questoesCachePromise: false,
  }),

  setQuestoesLevesCache: (data) => set({
    questoesLevesCache: data,
    questoesLevesCacheTimestamp: Date.now(),
    questoesLevesCachePromise: false,
  }),

  setResolucoesCache: (data) => set({
    resolucoesCache: data,
    resolucoesCacheTimestamp: Date.now(),
    resolucoesCachePromise: false,
  }),

  setResolucoesLevesCache: (data) => set({
    resolucoesLevesCache: data,
    resolucoesLevesCacheTimestamp: Date.now(),
    resolucoesLevesCachePromise: false,
  }),

  invalidateQuestoesCache: () => set({
    questoesCache: null,
    questoesCacheTimestamp: 0,
    questoesCachePromise: false,
    questoesLevesCache: null,
    questoesLevesCacheTimestamp: 0,
    questoesLevesCachePromise: false,
    resolucoesCache: null,
    resolucoesCacheTimestamp: 0,
    resolucoesCachePromise: false,
    resolucoesLevesCache: null,
    resolucoesLevesCacheTimestamp: 0,
    resolucoesLevesCachePromise: false,
    progressiveCache: [],
    progressiveCachedPages: [],
    progressiveFilterHash: null,
    progressiveTotalCount: 0,
    progressiveTotalPages: 0,
    historicoCache: null,
    filterOptionsCache: null,
  }),

  isQuestoesCacheValid: (ttlMs = CACHE_TTL_MS) => {
    const state = get()
    return state.questoesCache !== null && Date.now() - state.questoesCacheTimestamp < ttlMs
  },

  isQuestoesLevesCacheValid: (ttlMs = CACHE_TTL_MS) => {
    const state = get()
    return state.questoesLevesCache !== null && Date.now() - state.questoesLevesCacheTimestamp < ttlMs
  },

  isResolucoesCacheValid: (ttlMs = CACHE_TTL_MS) => {
    const state = get()
    return state.resolucoesCache !== null && Date.now() - state.resolucoesCacheTimestamp < ttlMs
  },

  isResolucoesLevesCacheValid: (ttlMs = CACHE_TTL_MS) => {
    const state = get()
    return state.resolucoesLevesCache !== null && Date.now() - state.resolucoesLevesCacheTimestamp < ttlMs
  },

  // Actions - progressive cache
  setProgressivePage: (hash, page, data, totalCount, totalPages) => set(state => ({
    progressiveFilterHash: hash,
    progressiveCache: [...state.progressiveCache, ...data],
    progressiveCachedPages: [...state.progressiveCachedPages, page],
    progressiveTotalCount: totalCount,
    progressiveTotalPages: totalPages,
  })),

  getProgressivePage: (hash, page) => {
    const state = get()
    if (state.progressiveFilterHash !== hash) return null
    if (!state.progressiveCachedPages.includes(page)) return null
    return {
      data: state.progressiveCache,
      totalCount: state.progressiveTotalCount,
      totalPages: state.progressiveTotalPages,
    }
  },

  resetProgressiveCache: (hash) => set({
    progressiveCache: [],
    progressiveCachedPages: [],
    progressiveFilterHash: hash,
    progressiveTotalCount: 0,
    progressiveTotalPages: 0,
  }),

  // Actions - historico
  setHistoricoCache: (data) => set({
    historicoCache: data,
    historicoCachePromise: false,
  }),

  getHistoricoCache: () => get().historicoCache,

  setHistoricoCachePromise: (v) => set({ historicoCachePromise: v }),

  // Actions - filter options
  setFilterOptionsCache: (data) => set({
    filterOptionsCache: data,
    filterOptionsPromise: false,
  }),

  getFilterOptionsCache: () => get().filterOptionsCache,

  setFilterOptionsPromise: (v) => set({ filterOptionsPromise: v }),

  setQuestoesCachePromise: (v) => set({ questoesCachePromise: v }),
  setQuestoesLevesCachePromise: (v) => set({ questoesLevesCachePromise: v }),
  setResolucoesCachePromise: (v) => set({ resolucoesCachePromise: v }),
  setResolucoesLevesCachePromise: (v) => set({ resolucoesLevesCachePromise: v }),
}))
