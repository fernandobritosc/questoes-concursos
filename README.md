# 🚀 Questões Concursos - Plataforma Premium de Preparação

Uma plataforma de altíssimo nível desenvolvida em **React, TypeScript, Vite e Tailwind CSS v4**, integrada de forma robusta ao **Supabase** (banco de dados) e **Google Gemini IA** (mentor inteligente).

Projetada especificamente para concurseiros de alta performance, a plataforma transforma a preparação passiva em um ecossistema ativo de aprendizado, análise de dados e gamificação de estudos.

---

## ✨ Recursos de Destaque (Premium SaaS)

### 1. 📅 Calendário de Consistência Retrátil (Heatmap)
* **Visualização Estilo GitHub**: Um grid completo de 53 semanas (últimos 365 dias) alinhado de Domingo a Sábado para acompanhar a constância diária de estudos.
* **Glow & Intensidade Violeta**: Quadradinhos que brilham em tons progressivos de violeta baseados no volume diário de questões respondidas.
* **Foco em Espaço**: Inicia recolhido por padrão para economizar espaço de tela, expandindo com um clique suave e apresentando legenda de níveis.
* **Tooltip Glassmorphic**: Balão informativo flutuante de alta performance exibindo a data e o volume exato de questões respondidas por extenso em português.

### 2. 📊 Visual Analytics Avançado (Recharts)
* **Gráfico de Evolução Temporal (Area Chart)**: Gráfico de área dupla que plota o volume de resoluções (eixo esquerdo) e a taxa de acerto (eixo direito) ao longo do tempo. Sincroniza dinamicamente entre a visão "Geral" (últimos 10 dias de estudo ativos) e "Últimas 24h" (fluxo de estudos por hora).
* **Radar de Competências de RPG (Radar Chart)**: Mapeia o perfil de forças e fraquezas do estudante nas principais matérias em um gráfico de teia interativo.
* **Failsafe Inteligente**: Se o estudante tiver resolvido questões em menos de 3 matérias (o que impossibilita formar o polígono do radar), o sistema exibe automaticamente um **Bar Chart** estilizado em seu lugar, mantendo o visual impecável.

### 3. ⌨️ Paleta de Comandos Global (`Ctrl + K` / `Cmd + K`)
* **Navegação Instantânea**: Atalho global acessível de qualquer página para pular entre Dashboard, Edital, Revisões e Mentor instantaneamente.
* **Busca Direta por ID de Questão (Q-ID)**: Digite um ID numérico (ex: `123456`) e a paleta abrirá instantaneamente a tela correspondente no Banco de Questões, carregando a questão em tempo real.
* **Dúvida no Mentor**: Digite qualquer dúvida conceitual e selecione "Perguntar ao Mentor" para ser redirecionado com a pergunta preenchida para a IA.
* **Interface Glassmorphic**: Modal com fundo desfocado e navegação autônoma por teclado (Setas, Enter, Escape).

### 4. 🃏 Caderno de Erros Inteligente & Revisão Spaced Repetition
* **Foco Cirúrgico**: Listagem automática de todas as questões cuja última tentativa do usuário foi incorreta.
* **Explicação do Professor IA**: Acione o Mentor IA integrado ao Gemini para obter uma análise didática detalhada de por que você errou aquela alternativa específica e por que o gabarito é o correto.
* **Resolução do Professor**: Espaço dinâmico para cadastrar e editar resoluções oficiais das questões de forma estruturada.

### 5. 📋 Edital Verticalizado
* **Sequenciamento Manual**: Controle absoluto e reordenação (mover para cima, baixo, topo, fim) da ordem dos tópicos e assuntos do edital.
* **Mapeamento de Status**: Marque tópicos concluídos com checkboxes intuitivos e veja a taxa de conclusão ("Syllabus Concluído") e taxa de acerto real em cada tópico em tempo real.

---

## 🛠️ Stack Tecnológico

* **Frontend**: React 19, TypeScript, Vite.
* **Estilização**: Tailwind CSS v4 (configuração baseada em variáveis CSS nativas), Lucide Icons, Glassmorphism e micro-animações CSS.
* **Banco de Dados (DB)**: Supabase JS Client (relação de tabelas `questoes` + `historico_resolucoes`).
* **Inteligência Artificial (AI)**: SDK Oficial do Google Generative AI (modelo Gemini) para análise de erros e geração de planos de estudos semanais táticos.
* **Gráficos**: Recharts (Area, Radar, Bar, ResponsiveContainer).

---

## 🔒 Segurança de Credenciais

Este projeto utiliza variáveis de ambiente (`.env`) para todas as conexões sensíveis de banco de dados e APIs.
* **NUNCA** envie o arquivo `.env` ou `.env.local` para o repositório do GitHub.
* O arquivo `.gitignore` do projeto está configurado para bloquear automaticamente qualquer vazamento de credenciais locais.
* As credenciais de produção devem ser cadastradas de forma segura diretamente no painel do seu provedor de hospedagem (como o Vercel).

Consulte o arquivo [.env.example](.env.example) para verificar o modelo de variáveis de ambiente necessárias para o correto funcionamento da plataforma.

---

## 🚀 Como Iniciar Localmente

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/fernandobritosc/questoes-concursos.git
   cd questoes-concursos
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz do projeto seguindo o modelo do `.env.example`:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   VITE_GEMINI_API_KEY=sua_chave_de_api_do_gemini
   ```

4. **Rodar em Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Abra `http://localhost:5173` no seu navegador.
