# UI-SPEC — Questões Concursos

> **Status**: `draft`  
> **Data**: 2026-06-16  
> **Analista**: GSD UI Researcher  
> **Propósito**: Documentar o design system, componentes, padrões de layout e gaps do frontend React + TypeScript + Tailwind v4.

---

## 1. Stack de Design Detectada

| Camada | Tecnologia | Notas |
|---|---|---|
| CSS Framework | **Tailwind CSS v4** | `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` |
| Plugin Vite | `@tailwindcss/vite` | Plugin oficial Tailwind v4 para Vite |
| Pós-processamento | N/A | Tailwind v4 não precisa mais de PostCSS |
| Font Loading | **Inter** (sistema) | `font-sans: 'Inter', system-ui, sans-serif` |
| Ícones | **Lucide React** v1.16 | 20+ ícones diferentes usados |
| Gráficos | **Recharts** v3.8 | AreaChart, BarChart, RadarChart, ResponsiveContainer |
| Markdown | **ReactMarkdown** v10 + render custom `MarkdownAI` | Parse inline próprio (sem `react-markdown` de fato — é um parser custom) |
| State global | **Zustand** v5 + Context API | `AuthContext`, `ToastContext` (Context), hooks com estado local |
| Roteamento | **React Router** v7 | Layout aninhado com `<Outlet />` |
| Animações | **CSS Keyframes** custom | `fadeInUp`, `scaleIn`, `slideInRight`, `shimmer`, `pulseGlow`, `gaugeStroke`, `countUp` |
| shadcn | **Não detectado** | Nenhum `components.json`. Componentes são 100% custom |

---

## 2. Design Tokens (CSS Custom Properties)

### 2.1 Cores — Modo Escuro (`:root` — default)

| Token | HEX | Uso |
|---|---|---|
| `--background` | `#030712` (gray-950) | Fundo principal (60% dominante) |
| `--foreground` | `#f8fafc` (slate-50) | Texto principal |
| `--card` | `#111827` (gray-900) | Cards, sidebars, nav (30% secundário) |
| `--card-foreground` | `#f8fafc` | Texto em cards |
| `--border` | `#1f2937` (gray-800) | Bordas, divisores |
| `--input` | `#1f2937` | Background de inputs |
| `--muted` | `#1f2937` | Fundos muted |
| `--muted-foreground` | `#9ca3af` | Texto secundário |
| `--primary` | `#7c3aed` (violet-600) | **Acento principal** (10%): botões primários, links, indicadores ativos, gradientes de nav |
| `--primary-foreground` | `#ffffff` | Texto em botão primário |
| `--secondary` | `#8b5cf6` (violet-500) | Gradientes, variante secundária |
| `--secondary-foreground` | `#ffffff` | Texto em botão secundário |
| `--destructive` | `#ef4444` (red-500) | Ações destrutivas (excluir, sair) |
| `--success` | `#10b981` (emerald-500) | Acertos, indicadores positivos |
| `--warning` | `#f59e0b` (amber-500) | Alertas, médias |
| `--info` | `#3b82f6` (blue-500) | Informativo |

### 2.2 Cores — Modo Claro (`html.light`)

| Token | HEX | Nota |
|---|---|---|
| `--background` | `#e8ddd0` | Fundo principal — tom bege claro |
| `--foreground` | `#1a0f0a` | Texto principal — marrom escuro |
| `--card` | `#f0e8dc` | Cards |
| `--card-foreground` | `#1a0f0a` | |
| `--border` | `#c9bbaa` | Bordas em tom areia |
| `--primary` | `#6d28d9` (violet-700) | Mais escuro que o dark para contraste |
| `--destructive` | `#b91c1c` (red-700) | |
| `--success` | `#047857` (emerald-700) | |
| `--warning` | `#b45309` (amber-700) | |
| `--info` | `#1d4ed8` (blue-700) | |

**⚠️ Gap**: O modo claro tem apenas as variáveis base definidas. NÃO há estilos específicos para componentes neste modo. O usuário reportou que "dói a vista" — pendente de nova tentativa.

### 2.3 Tokens Glassmorphism

| Token | Dark Value | Light Value |
|---|---|---|
| `--glass-bg-start` | `rgba(17,24,39,0.80)` | `rgba(240,232,220,0.88)` |
| `--glass-bg-end` | `rgba(17,24,39,0.95)` | `rgba(240,232,220,0.98)` |
| `--glass-border` | `rgba(255,255,255,0.06)` | `rgba(122,107,92,0.20)` |
| `--glass-shadow` | `rgba(0,0,0,0.30)` | `rgba(122,107,92,0.12)` |

### 2.4 Border Radius

| Token | Valor | Uso típico |
|---|---|---|
| `--radius-sm` | `0.25rem` (4px) | Badges, labels |
| `--radius-md` | `0.5rem` (8px) | Botões, inputs, cards pequenos |
| `--radius-lg` | `1rem` (16px) | Cards, modais, containers principais |
| `--radius-xl` | `1.25rem` (20px) | Glass cards, containers hero |

**Uso real observado (Tailwind classes):**
- `rounded-sm` — raro
- `rounded-md` — tabs do login, botões de período
- `rounded-lg` — inputs, botões, containers de ícone, badges (mais comum)
- `rounded-xl` — cards principais, glass cards, containers de navegação (padrão do sistema)
- `rounded-2xl` — modal de login, paleta de comandos
- `rounded-full` — avatares, badges de status, botões hero da Landing
- `rounded-[...]` (arbitrário) — alguns usos pontuais

### 2.5 Sombras

| Classe | Uso típico |
|---|---|
| `shadow-xxs` (custom, não Tailwind) | Cards pequenos, inputs, badges |
| `shadow-sm` | Cards padrão (`Card.tsx`) |
| `shadow-md` | Botões primários, cards em hover |
| `shadow-lg` | Glass cards, botões CTA |
| `shadow-xl` | Tooltips Recharts, modais, hero CTA |
| `shadow-2xl` | Modal de login, comando palette |
| `shadow-inner` | Containers de ícone na Landing |

**⚠️ Gap**: `shadow-xxs` é uma classe arbitrária não definida em lugar nenhum — provavelmente não tem efeito real, mas é usada em ~10 lugares.

### 2.6 Tipografia

| Propriedade | Especificação |
|---|---|
| Font Family | `'Inter', system-ui, sans-serif` |
| Body line-height | `leading-relaxed` (1.625) na maioria dos casos |
| Heading line-height | `leading-tight` (1.25) |
| Font weights usados | `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-black` (900) |
| `--font-sans` | `'Inter', system-ui, sans-serif` |

**Escala de tamanhos observada** (mais usados):

| Tamanho | Classe | Onde |
|---|---|---|
| 8px | `text-[8px]` | Subtítulo "Concursos" no header |
| 9px | `text-[9px]` | Badges de status, versão |
| 10px | `text-[10px]` | Badges, tags, timestamps, metadados |
| 11px | `text-[11px]` | Metadados, subtítulos de card |
| 12-13px | `text-xs`, `text-[13px]` | **Corpo padrão do sistema** — texto de cards, labels, navegação |
| 14px | `text-sm` | Corpo secundário, descrições |
| 16px | `text-base` | Headers de seção, botões LG |
| 18-20px | `text-lg`, `text-xl` | Títulos de seção, headers de página |
| 24-30px | `text-2xl`, `text-3xl` | Headers de página principais |
| 40px+ | `text-[40px]`, `text-[64px]` | Métricas grandes (Dashboard) |

**⚠️ Gap**: Uso inconsistente de valores arbitrários (`text-[8px]`, `text-[9px]`, `text-[11px]`, `text-[13px]`, `text-[40px]`, `text-[64px]`). Não há uma escala declarada no `@theme`. Há classes Tailwind padrão não usadas (`text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px, etc.) mas o sistema frequentemente usa valores arbitrários.

---

## 3. Componentes

### 3.1 UI Primitives (`src/components/ui/`)

| Componente | Props | Variantes |
|---|---|---|
| **Button** | `variant`, `size`, `loading`, `icon`, `className` + HTMLButton | `variant`: `primary` \| `secondary` \| `destructive` \| `ghost` \| `outline` |
| | | `size`: `sm` \| `md` \| `lg` \| `icon` |
| | | `loading`: mostra `<Loader2 />` girando |
| **Card** | `padding`, `className` | `padding`: `none` \| `sm` \| `md` \| `lg` |
| **CardHeader** | `className` | Subtítulo com borda inferior |
| **CardBody** | `padding`, `className` | `padding`: `sm` \| `md` \| `lg` |
| **LoadingSpinner** | `size`, `text`, `className` | `size`: `sm` \| `md` \| `lg` |
| | | Com `text`: layout horizontal (ícone + label) |
| | | Sem `text`: centralizado no pai |
| **MarkdownAI** | `text` | Renderiza markdown com callouts, tabelas, formatação inline |
| **QuestaoSkeleton** | (none) | Skeleton de 60 linhas para estado de loading de questão |

### 3.2 Componentes de Domínio (`src/components/`)

| Componente | Props principais | Função |
|---|---|---|
| **Layout** | `children` (via Outlet) | Nav bottom (desktop) + top bar + drawer (mobile), theme toggle, command palette, logout |
| **ProtectedRoute** | `children` | Verifica sessão, redireciona para `/login` |
| **ErrorBoundary** | `children` | Class component, captura erros de renderização |
| **CommandPalette** | (none, global) | `Ctrl+K`, busca de páginas e questões |
| **QuestaoVisualizador** | `questao`, callbacks, estado | Card principal de visualização de questão |
| **QuestaoTabs** | `topTab`, `onTabChange`, `totalQuestoes` | Navegação entre abas (Questões, Índice, Estatísticas, Gabarito) |
| **QuestaoNavegacao** | `onAnterior`, `onProxima`, `onAleatorio`, `onLimpar` | Botões de navegação inferior |
| **QuestaoFilterPanel** | 30+ props de filtro | Painel lateral de filtros (matéria, banca, ano, órgão, etc.) |
| **QuestaoIndice** | `questoes`, `onNavigate` | Árvore 3 níveis (matéria → grupo → assunto) |
| **QuestaoGabarito** | dados da questão | Exibição de gabarito |
| **QuestaoEstatisticas** | `historico`, `loading` | Gráficos de desempenho por questão |
| **QuestaoModalEdicao** | `questao`, callbacks | Modal de edição inline de questão |
| **QuestaoResolucaoProfessor** | `resolucao_professor` | Renderiza resolução do professor via MarkdownAI |
| **QuestaoPrintView** | (oculto) | Layout para impressão |
| **MeuDesempenho** | `historico`, `loading` | Gráfico de desempenho expansível |
| **ImportPdfModal** | (complexo, 797 linhas) | Modal de importação de PDF com múltiplos steps |
| **ImportPdfHeader** | `step`, `totalSteps` | Cabeçalho do fluxo de importação |
| **ImportPdfIdleStep** | callbacks | Step: selecionar arquivo |
| **ImportPdfLoadingStep** | `status` | Step: processando |
| **ImportPdfQuestionList** | `questoes`, callbacks | Step: listar questões extraídas |
| **ImportPdfQuestionEditor** | `questao`, callbacks | Step: editar questão individual |
| **ImportPdfReviewFooter** | callbacks | Rodapé com ações de revisão |
| **ImportPdfErrorState** | `erro`, `onRetry` | Estado de erro |
| **ImportPdfSuccessState** | `count`, callbacks | Estado de sucesso |
| **SimuladoSetup** | `selectedQtd`, `selectedTempo`, callbacks | Configuração de simulado |
| **SimuladoExamView** | (complexo) | Tela de prova cronometrada |
| **SimuladoResultados** | `pontuacao`, `questoes`, callbacks | Resultados pós-simulado com feedback IA |
| **SimuladoHistorico** | `historico` | Lista de simulados anteriores |
| **DashboardMetricCard** | `title`, `value`, `subtitle`, `icon`, `gradientClass`, `sparkColor`, `stagger`, `trend` | Card de métrica com sparkline e trend |
| **DashboardResolucaoItem** | `res`, `index` | Item de resolução na lista |
| **DashboardStudyHeatmap** | `resolucoes` | Calendário de contribuição |
| **DashboardBancaCard** | `bancas` | Barras de desempenho por banca |
| **DashboardOrgaoCard** | `orgaos` | Cards de desempenho por órgão (categorizado) |
| **DashboardMetasSemanais** | `metaQuestoes`, callbacks | Configuração e progresso de meta semanal |
| **RevisaoFilterBar** | `busca`, `onBuscaChange` | Input de busca |
| **RevisaoStatsCards** | `stats` | Cards de estatísticas na revisão |
| **RevisaoMiniStats** | `stats` | Mini estatísticas |
| **RevisaoFocusView** | `questao`, callbacks | Visualização foco na revisão |
| **RevisaoMateriaTable** | `materias` | Tabela de matérias na revisão |
| **EditalSidebar** | `topicos`, callbacks | Sidebar de navegação do edital |
| **EditalMateriaDetalhes** | `materia`, callbacks | Detalhes de matéria no edital |
| **EditalAssuntoItem** | `assunto`, `status` | Item de assunto no edital |
| **MapaMateriaAccordion** | `subjects`, callbacks | Accordion de matérias no mapa |
| **MapaStatsCards** | `stats` | Cards de estatísticas no mapa |
| **MapaSqlSetupModal** | (modal) | Modal de setup SQL |

### 3.3 Padrões de Componentes Identificados

**Padrão glass-card** (mais de 20 ocorrências):
```tsx
<div className="glass-card p-5 flex flex-col animate-fade-in-up">
```
Usado em: Dashboard, SimuladoSetup, Login, CommandPalette.

**Cores semânticas por contexto visual:**
- ✅ Acerto: `emerald-500/10` bg, `emerald-500` border, `CheckCircle2`
- ❌ Erro: `red-500/10` bg, `red-500` border, `XCircle`
- ⚡ IA/Mentor: `violet-500` / `violet-600` / `indigo-600` gradientes
- ⚠️ Alerta: `amber-500` / `orange-500`
- ℹ️ Info: `sky-500`

**Botões de ação no padrão do sistema:**
- Primário: `bg-primary text-primary-foreground` (ou gradiente `from-violet-600 to-indigo-600`)
- Outline: `bg-card border border-border`
- Ghost: `hover:bg-muted`
- Destrutivo: `text-red-400 hover:text-red-300 hover:bg-red-500/10`

---

## 4. Layout

### 4.1 Estrutura de Páginas

```
<AuthProvider>
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        / → Landing (pública)
        /login → Login (pública)
        /app → <ProtectedRoute> → <Layout> → <Outlet />
          /app/dashboard → Dashboard
          /app/revisao → Revisao
          /app/mentor → Mentor
          /app/questoes → Questoes
          /app/simulados → Simulados
          /app/edital → EditalVerticalizado
          /app/mapa → MapaQuestoes
      </Routes>
    </BrowserRouter>
  </ToastProvider>
</AuthProvider>
```

### 4.2 Layout Component (`Layout.tsx`)

| Área | Mobile (< md: 768px) | Desktop (>= md: 768px) |
|---|---|---|
| Header | Top bar fixa (sticky) com logo + hamburguer | Sem top bar |
| Navigation | Drawer lateral (`.fixed inset-y-0 left-0 w-64`) | Bottom nav (`.flex h-14 border-t`) |
| Main content | `p-4` com overflow scroll | `p-6` com overflow scroll |
| Theme toggle | Dentro do drawer | Na bottom nav (ícone + label "Claro/Escuro") |
| Logout | Dentro do drawer | Na bottom nav |

**Bottom nav (desktop)** — 7 itens:
1. Dashboard (`LayoutDashboard`)
2. Edital Verticalizado (`ClipboardList`)
3. Simulados IA (`Timer`)
4. Mapa de Questões (`Map`)
5. Caderno de Erros (`BookOpen`)
6. Banco de Questões (`Database`)
7. Mentor IA (`BrainCircuit`)

**Nav item ativo**: gradiente `from-violet-600/90 to-indigo-600/90 text-white font-semibold shadow-lg shadow-violet-500/20 nav-glow`

### 4.3 Sistema de Grid

Usa **Tailwind CSS Grid** (`grid grid-cols-{N}`) sem um design system de grid declarado:

| Contexto | Grid | Breakpoints |
|---|---|---|
| Dashboard métricas | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | sm: 640px, lg: 1024px |
| Dashboard gráficos | `grid-cols-1 lg:grid-cols-2` | lg: 1024px |
| Dashboard inferiores | `grid-cols-1 lg:grid-cols-2` | lg: 1024px |
| SimuladoSetup | `lg:col-span-12` + `lg:col-span-5` + `lg:col-span-7` (grid implícito de 12 colunas) | lg: 1024px |
| Login tabs | `grid-cols-2` | none |
| MapaQuestões | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` | md: 768px, xl: 1280px |

### 4.4 Breakpoints Ativos

| Breakpoint | Largura | Uso principal |
|---|---|---|
| `sm` | 640px | Cards 2 colunas, header flex-row |
| `md` | 768px | **Divisor mobile/desktop** do Layout |
| `lg` | 1024px | Grid 2 colunas, labels visíveis na nav |
| `xl` | 1280px | Grid 3 colunas (Mapa) |

### 4.5 Global Command Palette (`Ctrl+K`)

- Modal full-screen overlay com `bg-black/60 backdrop-blur-sm`
- Input de busca com filtro de comandos
- Navegação por setas + Enter + Escape
- Suporte a busca por ID de questão (`Q123456`)
- Suporte a pergunta ao Mentor IA

---

## 5. Tema Claro/Escuro

### 5.1 Mecanismo

- Estado `theme` em `Layout.tsx` com valor inicial de `localStorage.getItem('app-theme')` (default `'dark'`)
- `useEffect` alterna `document.documentElement.classList.toggle('light')`
- Botão toggle com ícone `Sun`/`Moon` e label "Modo Claro"/"Modo Escuro"

### 5.2 Cobertura do Tema Claro

**Apenas variáveis CSS base** estão definidas em `html.light` no `index.css` (linhas 34-63). Não há:
- Estilos específicos para componentes no modo claro
- Ajustes de glass-card para fundo claro
- Cores de gradiente ajustadas
- Estilos de foco, hover, active calibrados
- **Nenhum componente testado visualmente no modo claro**

**⚠️ Gap Crítico**: O modo claro NÃO está funcional. Foi reportado como "muito claro, dói a vista" nos logs do AGENTS.md (pendente de nova tentativa com paleta mais suave).

### 5.3 Tema na Landing Page

A página Landing (`Landing.tsx`) **não** usa o sistema de temas. Ela tem cores hardcoded (`bg-gray-950 text-slate-50`) e NÃO alterna com o toggle.

---

## 6. Animações e Transições

### 6.1 CSS Keyframes (em `index.css`)

| Keyframe | Propósito | Duração |
|---|---|---|
| `fadeInUp` | Entrada de cards, seções | 0.6s |
| `scaleIn` | Modais, zoom-in | 0.5s |
| `slideInRight` | Toasts, elementos laterais | 0.5s |
| `shimmer` | Efeito de brilho em progress bars | 2.5s infinido |
| `pulseGlow` | Glow pulsante em bordas | 2s infinido |
| `gaugeStroke` | Animação de gauge SVG | -- |
| `countUp` | Contadores | 0.4s |
| `progressGrow` | Barra de progresso | 1.2s |
| `borderGlow` | Glow em borda | 2s infinido |

### 6.2 Utility Classes de Animação

| Classe | Keyframe | Timing |
|---|---|---|
| `animate-fade-in-up` | `fadeInUp` | `0.6s var(--ease-spring)` |
| `animate-scale-in` | `scaleIn` | `0.5s var(--ease-spring)` |
| `animate-slide-in-right` | `slideInRight` | `0.5s var(--ease-smooth)` |

### 6.3 Easing Functions

| Token | Curva |
|---|---|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` — overshoot |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` — suave padrão |

### 6.4 Stagger Pattern

```tsx
<div className="animate-fade-in-up stagger-1" style={{ animationDelay: `${index * 80 + 150}ms` }}>
```

Delay classes: `stagger-1` (0ms), `stagger-2` (80ms), `stagger-3` (160ms), `stagger-4` (240ms)

---

## 7. Print Styles

Vários componentes incluem classes `print:*`:

| Componente | Classes print |
|---|---|
| `Layout` | `print:hidden` (nav, header), `print:p-0`, `print:h-auto`, `print:block`, `print:bg-white` |
| `MarkdownAI` | `print:border-neutral-300`, `print:bg-transparent`, `print:text-black`, `print:text-neutral-900`, `print:break-inside-avoid` |
| `QuestaoPrintView` | Componente separado para impressão |
| `QuestaoVisualizador` | Classes `print:*` inline |

**⚠️ Gap**: Não há um sistema de print styles coeso. As classes `print:*` estão espalhadas ad-hoc.

---

## 8. Gaps e Inconsistências Identificados

### 8.1 Críticos

| # | Gap | Localização | Impacto |
|---|---|---|---|
| C1 | **Modo claro quebrado** | `html.light` só tem variáveis base; sem estilos de componente | Usuário não consegue usar; "dói a vista" |
| C2 | **Sem componente Modal reutilizável** | `ImportPdfModal` é específico, `CommandPalette` é fixo, `QuestaoModalEdicao` é específico | Duplicação de padrão de overlay/backdrop |
| C3 | **Sem sistema de notificação acessível** | `ToastContext` usa `fixed bottom-4 right-4` sem `role="alert"` ou `aria-live` | Acessibilidade de notificações |
| C4 | **`shadow-xxs` não definida** | Usada em ~10 componentes (QuestaoNavegacao, QuestaoFilterPanel, etc.) | Classe Tailwind inexistente não tem efeito real |

### 8.2 Moderados

| # | Gap | Localização | Impacto |
|---|---|---|---|
| M1 | **Escala tipográfica não declarada** | Valores arbitrários de 8px a 64px | Inconsistência visual entre páginas |
| M2 | **Sem componente Select/ComboBox** | Inputs nativos + inputs text usados para seleção | UX inconsistente, sem estilo unificado |
| M3 | **Sem componente Tabs reutilizável** | `QuestaoTabs` é específico das questões | Duplicação se outras páginas precisarem |
| M4 | **Sem componente Badge** | Badges criados inline com classes soltas | Inconsistência visual entre badges |
| M5 | **Sem componente Dialog/AlertDialog** | Confirmações usam `window.confirm()` ou nada | UX de ações destrutivas |
| M6 | **Landing Page fora do theme system** | `Landing.tsx` tem cores hardcoded `bg-gray-950` | Não respeita toggle claro/escuro |

### 8.3 Leves

| # | Gap | Localização | Impacto |
|---|---|---|---|
| L1 | **Print styles ad-hoc** | Espalhados em vários componentes | Inconsistência na impressão |
| L2 | **Focus-visible inconsistente** | `Login.tsx` usa, mas maioria dos componentes não | Acessibilidade de teclado |
| L3 | **Grid não declarado como sistema** | Grids declarados inline em cada página | Dificuldade de manutenção |
| L4 | **Sem variante de tamanho para Card** | Só `padding` varia; largura é 100% do container | Cards não tem tamanhos predefinidos |
| L5 | **Sem breakpoint `xl` para Layout** | Layout só divide em `md` | Telas muito largas têm nav ocupando pouco espaço |

### 8.4 Oportunidades de Refinamento

| # | Oportunidade | Sugestão |
|---|---|---|
| R1 | **Declarar escala de texto no `@theme`** | Definir `--text-xs` a `--text-4xl` com valores fixos |
| R2 | **Criar Modal genérico** | Extrair padrão de overlay + backdrop + close |
| R3 | **Criar Tabs reutilizável** | Extrair de `QuestaoTabs` |
| R4 | **Criar Badge semântico** | Com variantes `success`, `error`, `warning`, `info`, `default` |
| R5 | **Criar sistema de ícones para status** | `CheckCircle2`/`XCircle`/`AlertTriangle`/`Info` com cores padronizadas |
| R6 | **Centralizar cores de gradiente** | As 5 classes `.gradient-*` já existem mas são subusadas |

---

## 9. Acessibilidade (Auditoria Rápida)

| Critério | Status | Observação |
|---|---|---|
| `role` attributes | ❌ Não usado | Toasts não têm `role="alert"`, modais não têm `role="dialog"` |
| `aria-*` attributes | ❌ Não usado | Nenhum componente usa aria-labels, aria-describedby, etc. |
| `aria-live` regions | ❌ Ausente | Loading states, toasts |
| Focus management | ⚠️ Parcial | CommandPalette foca input; modais não gerenciam foco |
| Focus-visible | ⚠️ Parcial | `Login.tsx` usa; resto não |
| Keyboard navigation | ⚠️ Parcial | CommandPalette (setas/enter/esc); botões são nativos `<button>` |
| Color contrast | ⚠️ Não verificado | Modo claro não testado |
| `html lang` | ❌ `lang="en"` | Deveria ser `lang="pt-BR"` |
| Skip to content | ❌ Ausente | Não há link de pular para conteúdo |
| Reduced motion | ❌ Não implementado | Animações não respeitam `prefers-reduced-motion` |

---

## 10. Resumo de Arquivos CSS

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `src/index.css` | 268 | Tailwind v4 import, CSS variables, keyframes, utilities (glass-card, progress-bar, gradients, nav-glow) |
| `src/App.css` | 184 | **Código legado/morto** do template Vite inicial — `.counter`, `.hero`, `#center`, `#next-steps`. **Não usado por nenhum componente atual.** |

---

## 11. Dependências do Design System

| Pacote | Versão | Uso no design |
|---|---|---|
| `tailwindcss` | ^4.3.0 | Framework CSS |
| `@tailwindcss/typography` | ^0.5.19 | Plugin prose (instalado mas não detectado em uso) |
| `@tailwindcss/vite` | ^4.3.0 | Plugin Vite |
| `lucide-react` | ^1.16.0 | Todos os ícones |
| `recharts` | ^3.8.1 | Gráficos (Dashboard, Estatísticas) |
| `react-markdown` | ^10.1.0 | Instalado mas **substituído** por `MarkdownAI` custom |
| `tailwind-merge` | ^3.6.0 | Utilitário (instalado mas não detectado em uso direto) |
| `clsx` | ^2.1.1 | Utilitário de classes (instalado mas não detectado em uso direto) |

---

## 12. Convenções de Código (Design)

1. **Padding de cards**: `p-4.5` (18px) em glass-cards, `p-5` (20px), `p-6` (24px)
2. **Input fields**: `bg-card border border-border rounded-lg px-3 py-2 text-xs`
3. **Badges semânticos**: `px-2 py-0.5 rounded-full text-[10px] font-bold` com cor de borda e bg
4. **Headers de seção**: `text-sm font-bold text-foreground flex items-center gap-2` com ícone + label
5. **Botões de toggle/aba**:  `px-3 py-1.5 rounded-lg text-xs font-bold` com estado ativo `bg-violet-600 text-white`
6. **Containers de ícone**: `p-2 rounded-lg gradient-* shadow-lg` para ícones em cards de métrica
7. **Separadores**: `<div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />`
8. **Data display**: `tabular-nums` para números em tabelas e métricas

---

**Fim do UI-SPEC.md**
