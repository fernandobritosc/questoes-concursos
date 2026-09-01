/**
 * MonitorPro Extrator - Content Script
 * 
 * Este script possui duas funções principais:
 * 1. Módulo de Sincronização: Roda nos domínios do App React para capturar credenciais de sessão do Supabase.
 * 2. Módulo de Extração: Roda no site do TEC Concursos para capturar reativamente a resolução de questões.
 */

// Backend próprio (Fastify + Postgres na Oracle VM) — substitui o Supabase.
// INTERINO: IP:porta do backend. Em produção será o domínio HTTPS (ex: https://fernandoestudos.com/api).
const BACKEND_URL = "http://204.216.111.13:3000";

// Faz o fetch via background service worker para evitar o bloqueio de mixed
// content (página https do TEC -> backend http). Devolve um objeto "Response-like".
function backendFetch(url, options) {
  return new Promise((resolve, reject) => {
    if (isContextInvalidated()) {
      reject(new Error("Contexto da extensão invalidado"));
      return;
    }
    const fullUrl = url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
    chrome.runtime.sendMessage(
      {
        type: "monitorpro_fetch",
        url: fullUrl,
        method: (options && options.method) || "GET",
        headers: (options && options.headers) || {},
        ...(options && options.body !== undefined ? { body: options.body } : {})
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error("Sem resposta do background"));
          return;
        }
        if (response.status === 0 && !response.ok) {
          reject(new Error(response.statusText || "Falha de rede"));
          return;
        }
        resolve({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          async json() {
            if (!response.bodyText) return null;
            return JSON.parse(response.bodyText);
          },
          async text() {
            return response.bodyText || "";
          }
        });
      }
    );
  });
}

// Helper para detectar se o contexto da extensão foi invalidado (ex: após reload ou reinício)
function isContextInvalidated() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    return true;
  }
  try {
    chrome.runtime.getURL("");
    return false;
  } catch (e) {
    return true;
  }
}

// ============================================================================
// 1. MÓDULO DE SINCRONIZAÇÃO DE CREDENCIAIS (Para o App React)
// ============================================================================

const hostname = window.location.hostname;
const isReactApp = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app") || hostname.includes("204.216.111.13");

if (isReactApp) {
  console.log("content.js:3 MonitorPro v3.1: Olho invisível ativado!", "extId=" + (chrome.runtime?.id ?? "?"));
  console.log("content.js:10 ⚡ MonitorPro: Receptor DOM de sessão iniciado...");

  let jaSincronizouNestaPagina = false;

  function sincronizarSessao() {
    if (isContextInvalidated()) return;
    try {
      // Novo formato: sessão do backend próprio
      // O app grava { access_token, user: { id, ... } } (ver setSessionAndSession em src/lib/supabase.ts)
      let sessionStr = localStorage.getItem("monitorpro_session");
      let session = sessionStr ? JSON.parse(sessionStr) : null;
      const token = session?.access_token || session?.token || null;
      const userId = session?.user?.id || session?.userId || null;
      console.log("[MonitorPro v3.1] sessão do page:", sessionStr ? "presente" : "ausente", "| token:", token ? "SIM" : "nao", "| userId:", userId);
      // Fallback legado (Supabase)
      if (!token && !userId) {
        const legacyStr = localStorage.getItem("sb-dyxtalcvjcprmhuktyfd-auth-token");
        if (legacyStr) {
          const legacy = JSON.parse(legacyStr);
          session = { token: legacy.access_token, userId: legacy.user?.id };
        }
      }

      if (token && userId) {
        jaSincronizouNestaPagina = true;
        chrome.storage.local.get(["monitorpro_token", "monitorpro_user_id"], (stored) => {
            if (isContextInvalidated()) return;
            if (stored.monitorpro_token !== token || stored.monitorpro_user_id !== userId) {
              chrome.storage.local.set({
                monitorpro_token: token,
                monitorpro_user_id: userId
              }, () => {
                if (isContextInvalidated()) return;
                console.log(`content.js:38 ⚡ MonitorPro: Sessão sincronizada com sucesso via DOM! UserID: ${userId}`);
              });
            }
          });
      } else if (jaSincronizouNestaPagina) {
        // ÚNICAMENTE se esta aba JÁ sincronizou uma sessão antes (ou seja, o usuário
        // realmente deslogou AQUI). Evita que qualquer aba sem sessão (ex: outra página
        // vercel.app, localhost, app deslogado) apague o token que outra aba gravou.
        chrome.storage.local.get(["monitorpro_token"], (stored) => {
          if (isContextInvalidated()) return;
          if (stored.monitorpro_token) {
            chrome.storage.local.remove(["monitorpro_token", "monitorpro_user_id"], () => {
              if (isContextInvalidated()) return;
              console.log("content.js:118: ⚡ MonitorPro: Sessão limpa (usuário deslogado do aplicativo).");
            });
          }
        });
      }
    } catch (e) {
      if (isContextInvalidated()) return;
      console.error("⚡ MonitorPro: Erro ao sincronizar sessão:", e);
    }
  }

  // Verifica na carga e a cada 3 segundos (captura logins/logouts em tempo real)
  sincronizarSessao();
  const syncInterval = setInterval(() => {
    if (isContextInvalidated()) {
      clearInterval(syncInterval);
      return;
    }
    sincronizarSessao();
  }, 3000);
}

// ============================================================================
// 2. MÓDULO DE EXTRAÇÃO E SCRAPING (Para o TEC Concursos)
// ============================================================================

if (window.location.hostname.includes("tecconcursos.com.br")) {
  console.log("⚡ MonitorPro: Extrator iniciado na página do TEC Concursos.", "extId=" + (chrome.runtime?.id ?? "?"));

  // Controle de envios de tentativas e comentários de forma independente
  const sentAttempts = new Set();
  const sentComments = new Set();
  const pendingRequests = new Set();
  
  // Dicionário de tempos de carregamento para medir o tempo gasto por questão
  const questionLoadTimes = {};

  /**
   * Converte recursivamente os nós do DOM para Markdown simplificado
   */
  function htmlToMarkdown(node) {
    if (!node) return "";
    
    // Se for nó de texto (TEXT_NODE = 3)
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (text.trim() === "") return "";
      return text;
    }
    
    // Se for elemento (ELEMENT_NODE = 1)
    if (node.nodeType === 1) {
      const tagName = node.tagName.toLowerCase();
      
      // Processa os filhos primeiro
      let childrenMarkdown = "";
      node.childNodes.forEach(child => {
        childrenMarkdown += htmlToMarkdown(child);
      });
      
      switch (tagName) {
        case "strong":
        case "b":
          return `**${childrenMarkdown}**`;
          
        case "em":
        case "i":
          return `*${childrenMarkdown}*`;
          
        case "s":
        case "strike":
        case "del":
          return `~~${childrenMarkdown}~~`;
          
        case "p":
          // Evita parágrafos vazios ou apenas com espaços/&nbsp;
          if (!childrenMarkdown.trim() || childrenMarkdown.trim() === "\u00A0") {
            return "\n\n";
          }
          return `\n\n${childrenMarkdown}\n\n`;
          
        case "blockquote":
          const cleanBlock = childrenMarkdown.trim().replace(/\n{2,}/g, "\n\n");
          return `\n\n> ${cleanBlock.replace(/\n/g, "\n> ")}\n\n`;
          
        case "br":
          return "\n";
          
        case "li": {
          const parent = node.parentNode;
          const isOrdered = parent && parent.tagName.toLowerCase() === "ol";
          if (isOrdered) {
            const siblings = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === "li");
            const index = siblings.indexOf(node) + 1;
            return `\n${index}. ${childrenMarkdown.trim()}`;
          }
          return `\n- ${childrenMarkdown.trim()}`;
        }
          
        case "ul":
        case "ol":
          return `\n${childrenMarkdown}\n`;
          
        case "table":
          return `\n\n${childrenMarkdown}\n\n`;
          
        case "tr": {
          const cells = node.querySelectorAll("td, th");
          const cellsCount = cells.length;
          let rowMarkdown = `\n| ${childrenMarkdown}`;
          
          // Verifica se é a linha de cabeçalho
          const isHeader = node.querySelector("th") !== null || (node.parentNode && node.parentNode.children[0] === node);
          if (isHeader && cellsCount > 0) {
            rowMarkdown += "\n|" + Array(cellsCount).fill(" --- |").join("");
          }
          return rowMarkdown;
        }
        
        case "td":
        case "th":
          return `${childrenMarkdown.trim().replace(/\n/g, " ")} |`;
          
        case "h1":
          return `\n\n# ${childrenMarkdown}\n\n`;
        case "h2":
          return `\n\n## ${childrenMarkdown}\n\n`;
        case "h3":
          return `\n\n### ${childrenMarkdown}\n\n`;
        case "h4":
        case "h5":
        case "h6":
          return `\n\n#### ${childrenMarkdown}\n\n`;
          
        case "img": {
          const src = node.getAttribute("src") || "";
          const alt = node.getAttribute("alt") || "";
          if (!src) return "";
          return `![${alt}](${src})`;
        }
        default:
          return childrenMarkdown;
      }
    }
    
    return "";
  }

  function convertElementToMarkdown(element) {
    if (!element) return null;
    let md = htmlToMarkdown(element);
    // Limpa espaços e quebras de linha duplicadas
    md = md.replace(/\n{3,}/g, "\n\n");
    md = md.replace(/&nbsp;/g, " ");
    md = md.replace(/\u00A0/g, " "); // decodifica non-breaking spaces
    return md.trim();
  }

  /**
   * Helper para verificar se a questão no container foi resolvida.
   * Utiliza múltiplos critérios (classes dos LIs, mensagens de gabarito e visibilidade)
   * para máxima resiliência e velocidade.
   */
  function verificarSeResolvida(container) {
    const hasCorrecao = container.querySelector("li.correcao") !== null;
    const hasErro = container.querySelector("li.erro") !== null;
    const hasResolvidaClass = container.querySelector(".resolucao-visivel") !== null || container.querySelector("[class*='resolucao-visivel']") !== null;
    const hasErrouMsg = container.querySelector(".questao-enunciado-resolucao-errou") !== null || container.querySelector("[class*='resolucao-errou']") !== null;
    const hasAcertouMsg = container.querySelector(".questao-enunciado-resolucao-acertou") !== null || container.querySelector("[class*='resolucao-acertou']") !== null || container.querySelector(".questao-enunciado-resolucao-ok") !== null;
    const hasGabaritoMsg = container.querySelector(".questao-enunciado-mensagem-resolucao") !== null;

    return hasCorrecao || hasErro || hasResolvidaClass || hasErrouMsg || hasAcertouMsg || hasGabaritoMsg;
  }

  /**
   * Obtém o elemento de comentário de forma resiliente
   */
  function obterElementoComentario(container) {
    let commentEl = container.querySelector(".questao-complementos-comentario-conteudo-texto");
    if (!commentEl) {
      // Fallback para quando o comentário é renderizado fora do container (ex: em páginas de questão única)
      const allComments = document.querySelectorAll(".questao-complementos-comentario-conteudo-texto");
      if (allComments.length === 1) {
        commentEl = allComments[0];
      }
    }
    return commentEl;
  }

  /**
   * Processa e salva a resolução de uma questão de forma segura e deduplicada
   */
  function processarResolucao(container, questaoTecId) {
    if (pendingRequests.has(questaoTecId)) {
      return;
    }
    const hasAttemptSent = sentAttempts.has(questaoTecId);
    const commentEl = obterElementoComentario(container);
    const commentText = commentEl ? commentEl.textContent.trim() : "";
    const hasComment = commentText.length > 5 && !commentText.toLowerCase().includes("carregando");
    const hasCommentSent = sentComments.has(questaoTecId);

    // Se já enviou a tentativa E (ou não tem comentário no DOM ou já enviou o comentário), não faz nada.
    if (hasAttemptSent && (!hasComment || hasCommentSent)) {
      return;
    }

    console.log(`[MonitorPro] ⚡ Processando dados da Questão #${questaoTecId}...`);
    try {
      pendingRequests.add(questaoTecId);
      const userJustAnswered = !!questionLoadTimes[questaoTecId];
      extrairESalvarQuestao(container, questaoTecId, hasAttemptSent, hasCommentSent, userJustAnswered);
    } catch (err) {
      if (isContextInvalidated()) return;
      console.error(`[MonitorPro] ❌ Falha ao extrair dados da Questão #${questaoTecId}:`, err);
      pendingRequests.delete(questaoTecId);
      // Em caso de erro, limpa os conjuntos correspondentes para permitir novas tentativas
      if (!hasAttemptSent) sentAttempts.delete(questaoTecId);
      if (hasComment && !hasCommentSent) sentComments.delete(questaoTecId);
    }
  }

  const globalObserver = new MutationObserver(() => {
    if (isContextInvalidated()) {
      globalObserver.disconnect();
      return;
    }
    
    const questionContainers = document.querySelectorAll(".questao");
    questionContainers.forEach((container) => {
      const idInput = container.querySelector("input[id-questao]");
      if (!idInput || !idInput.value) return;

      const questaoTecId = parseInt(idInput.value);
      if (isNaN(questaoTecId)) return;

      const isResolved = verificarSeResolvida(container);

      if (!isResolved) {
        if (!questionLoadTimes[questaoTecId]) {
          questionLoadTimes[questaoTecId] = Date.now();
        }
        if (sentAttempts.has(questaoTecId)) {
          sentAttempts.delete(questaoTecId);
        }
      }

      if (isResolved) {
        processarResolucao(container, questaoTecId);
      }
    });
  });

  globalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "aria-checked"]
  });

  /**
   * Extrai todos os campos da questão a partir do seu container e envia para o Supabase
   */
  function extrairESalvarQuestao(container, questaoTecId, hasAttemptSent, hasCommentSent, userJustAnswered) {
    // 1. Matéria
    let materia = null;
    const materiaEl = container.querySelector(".questao-cabecalho-informacoes-materia a");
    if (materiaEl) {
      materia = materiaEl.textContent.replace("Matéria:", "").trim();
    } else {
      const fallbackMateria = container.querySelector(".questao-cabecalho-informacoes-materia");
      if (fallbackMateria) {
        materia = fallbackMateria.textContent.replace("Matéria:", "").trim();
      }
    }

    // 2. Assunto
    let assunto = null;
    const assuntoEl = container.querySelector(".questao-cabecalho-informacoes-assunto-link a");
    if (assuntoEl) {
      assunto = assuntoEl.textContent.replace("Assunto:", "").trim();
    } else {
      const fallbackAssunto = container.querySelector(".questao-cabecalho-informacoes-assunto");
      if (fallbackAssunto) {
        assunto = fallbackAssunto.textContent.replace("Assunto:", "").trim();
      }
    }

    // 3. Caderno
    let cadernoNome = null;
    const titleEl = document.querySelector(".caderno-subtitulo-secao-name .titulo") || document.querySelector(".titulo");
    if (titleEl) {
      cadernoNome = titleEl.textContent.trim();
    }

    // 4. Órgão, Banca, Concurso, Prova, Ano
    let orgao = null;
    let bancaTexto = null;
    let concurso = null;
    let prova = null;
    let ano = null;

    // Órgão (via logotipo alt)
    const organImg = container.querySelector(".questao-cabecalho-logotipo img");
    if (organImg) {
      orgao = organImg.getAttribute("alt") || organImg.getAttribute("title");
    }

    // Banca, Ano, Concurso e Prova
    const linksResumo = container.querySelectorAll(".resumo-questao");
    if (linksResumo.length > 0) {
      bancaTexto = linksResumo[0].textContent.trim();
    }

    // Ano — busca no texto de toda a .questao, excluindo falsos positivos (CF/1988, etc.)
    const questaoText = container.textContent || "";
    console.log(`[MonitorPro] Questão #${questaoTecId}: texto completo da .questao (primeiros 500 chars) = "${questaoText.substring(0, 500)}"`);
    
    // Encontra TODOS os anos no texto
    const todosAnos = [...questaoText.matchAll(/\b(19\d\d|20\d\d)\b/g)].map(m => parseInt(m[0], 10));
    console.log(`[MonitorPro] Questão #${questaoTecId}: todos os anos encontrados = [${todosAnos.join(", ")}]`);
    
    if (todosAnos.length > 0) {
      // Filtra anos que NÃO são de matéria/assunto (ex: CF/1988, 1789, 1822, etc.)
      // e escolhe o mais provável (geralmente entre 1990 e ano atual)
      const anoCorrente = new Date().getFullYear();
      const anoCandidato = todosAnos.find(a => a >= 1990 && a <= anoCorrente && a !== 1988);
      if (anoCandidato) {
        ano = anoCandidato;
        console.log(`[MonitorPro] Questão #${questaoTecId}: ano selecionado = ${ano}`);
      } else {
        console.log(`[MonitorPro] Questão #${questaoTecId}: nenhum candidato valido, mantendo null`);
      }
    }

    // Concurso/Prova — do último .resumo-questao
    const ultimoResumo = linksResumo[linksResumo.length - 1]?.textContent.trim() ?? "";
    if (ultimoResumo) {
      const semAno = ultimoResumo.replace(/\b(19\d\d|20\d\d)\b\s*[-–]\s*/, '').replace(/\s+\d{4}$/, '').trim();
      const partes = semAno.split("/");
      if (partes[0] && partes[0].trim() !== bancaTexto) concurso = partes[0].trim();
      if (partes.length >= 2) prova = partes.slice(1).join("/").trim();
    }

    // 5. Enunciado
    let enunciado = null;
    const enunciadoEl = container.querySelector(".questao-enunciado-texto");
    if (enunciadoEl) {
      enunciado = convertElementToMarkdown(enunciadoEl);
    }

    // 6. Alternativas
    const alternativas = {};
    const liAlternativas = container.querySelectorAll(".questao-enunciado-alternativas li");
    
    liAlternativas.forEach((li, index) => {
      // Letra da alternativa
      let letra = null;
      const opcaoEl = li.querySelector(".questao-enunciado-alternativa-opcao label") || li.querySelector(".questao-enunciado-alternativa-opcao");
      if (opcaoEl) {
        letra = opcaoEl.textContent.trim().toUpperCase();
      }
      if (!letra || letra.length > 1) {
        // Fallback alfabético posicional
        letra = String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.
      }

      // Texto da alternativa
      const textoEl = li.querySelector(".questao-enunciado-alternativa-texto");
      const textoClean = textoEl ? (textoEl.innerText ? textoEl.innerText.trim() : textoEl.textContent.trim()) : "";
      
      alternativas[letra] = textoClean;
    });

    // 7. Gabarito Correto e Resposta do Usuário
    let gabarito = null;
    let alternativaUsuario = null;

    // Gabarito correto (marcado com classe .correcao)
    const correctLi = container.querySelector("li.correcao");
    if (correctLi) {
      const correctOpcao = correctLi.querySelector(".questao-enunciado-alternativa-opcao label") || correctLi.querySelector(".questao-enunciado-alternativa-opcao");
      if (correctOpcao) {
        gabarito = correctOpcao.textContent.trim().toUpperCase();
      }
    }
    // Fallback do texto do gabarito (strong dentro da mensagem de resolução)
    if (!gabarito) {
      const gabaritoStrong = container.querySelector(".questao-enunciado-mensagem-resolucao strong");
      if (gabaritoStrong) {
        gabarito = gabaritoStrong.textContent.trim().toUpperCase();
      }
    }

    // Resposta do usuário (li que tem aria-checked="true" ou classe erro)
    let selectedLi = container.querySelector('li[aria-checked="true"]') || container.querySelector('li.erro');
    if (!selectedLi) {
      // Busca pelo span interno com classe selecionada
      const selectedSpan = container.querySelector(".questao-alternativa-selecionada");
      if (selectedSpan) {
        selectedLi = selectedSpan.closest("li");
      }
    }
    if (!selectedLi) {
      // Se acertou e não achou selectedLi, por eliminação é o correctLi
      const errouDiv = container.querySelector(".questao-enunciado-resolucao-errou");
      if (!errouDiv && correctLi) {
        selectedLi = correctLi;
      }
    }

    if (selectedLi) {
      const selectedOpcao = selectedLi.querySelector(".questao-enunciado-alternativa-opcao label") || selectedLi.querySelector(".questao-enunciado-alternativa-opcao");
      if (selectedOpcao) {
        alternativaUsuario = selectedOpcao.textContent.trim().toUpperCase();
      }
    }

    // 8. Determina se acertou
    let acertou = false;
    if (alternativaUsuario && gabarito) {
      acertou = alternativaUsuario === gabarito;
    } else {
      // Fallback visual pela presença da caixa de erro
      acertou = container.querySelector(".questao-enunciado-resolucao-errou") === null;
    }

    // 9. Tempo em segundos
    let tempoSegundos = 30; // fallback padrão
    const loadTime = questionLoadTimes[questaoTecId];
    if (loadTime) {
      const elapsed = Math.round((Date.now() - loadTime) / 1000);
      if (elapsed >= 1 && elapsed <= 3600) {
        tempoSegundos = elapsed;
      }
    } else {
      // Tenta ler do relógio do caderno
      const clockEl = document.querySelector(".caderno-relogio-marcador");
      if (clockEl) {
        const parts = clockEl.textContent.trim().split(":").map(Number);
        if (parts.length === 3) {
          tempoSegundos = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          tempoSegundos = parts[0] * 60 + parts[1];
        }
      }
    }

    // 8.5. Resolução do Professor
    let resolucaoProfessor = null;
    const commentEl = obterElementoComentario(container);
    console.log(`[MonitorPro] Questão #${questaoTecId}: Buscando comentário do professor. Elemento encontrado:`, commentEl);
    if (commentEl) {
      resolucaoProfessor = convertElementToMarkdown(commentEl);
      console.log(`[MonitorPro] Questão #${questaoTecId}: Comentário convertido (100 chs):`, resolucaoProfessor ? resolucaoProfessor.substring(0, 100) + '...' : 'null');
    }

    // Monta os payloads finais
    const questaoPayload = {
      questao_tec_id: questaoTecId,
      materia,
      assunto,
      banca_texto: bancaTexto,
      orgao,
      concurso,
      prova,
      ano,
      caderno_nome: cadernoNome,
      enunciado,
      alternativas,
      gabarito,
      resolucao_professor: resolucaoProfessor
    };

    const tentativaPayload = {
      questao_tec_id: questaoTecId,
      alternativa: alternativaUsuario,
      acertou,
      tempo_segundos: tempoSegundos
    };

    console.log(`[MonitorPro] Extração completa da Questão #${questaoTecId}:`, { questaoPayload, tentativaPayload });

    // Salva no Supabase!
    salvarNoSupabase(questaoPayload, tentativaPayload, hasAttemptSent, hasCommentSent, userJustAnswered);
  }

  /**
   * Salva os payloads de forma relacional no Supabase
   */
  function salvarNoSupabase(questaoPayload, tentativaPayload, hasAttemptSent, hasCommentSent, userJustAnswered) {
    if (isContextInvalidated()) {
      pendingRequests.delete(questaoPayload.questao_tec_id);
      return;
    }
    chrome.storage.local.get(["monitorpro_token", "monitorpro_user_id"], async (stored) => {
      if (isContextInvalidated()) return;
      const token = stored.monitorpro_token;
      const userId = stored.monitorpro_user_id;
      console.log("[MonitorPro] storage.local lido ao salvar:", { token: token ? "SIM" : "nao", userId: userId ?? null, extId: chrome.runtime?.id });

      // Define os headers de rede
      const headers = {
        "Content-Type": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log(`[MonitorPro] Usando sessão autenticada do usuário: ${userId}`);
      } else {
        console.warn("[MonitorPro] Sessão do usuário não encontrada. Tentando salvar como registro público.");
      }

      try {
        if (isContextInvalidated()) return;

        // Passo A: Verifica se a questão já está cadastrada na tabela 'questoes' e busca tentativas existentes
        const searchUrl = `${BACKEND_URL}/rest/v1/questoes?questao_tec_id=eq.${questaoPayload.questao_tec_id}&select=id,enunciado,alternativas,gabarito,resolucao_professor,historico_resolucoes!historico_resolucoes_questao_id_fkey(id,user_id)`;
        const searchRes = await backendFetch(searchUrl, {
          method: "GET",
          headers
        });

        let dbQuestaoId = null;
        let existingResolucao = null;
        let hasExistingAttempt = false;

        if (searchRes.ok) {
          const rows = await searchRes.json();
          if (rows && rows.length > 0) {
            dbQuestaoId = rows[0].id;
            existingResolucao = rows[0].resolucao_professor;
            const history = rows[0].historico_resolucoes || [];
            
            // Verifica se o usuário correspondente já tem alguma tentativa registrada para esta questão
            if (userId) {
              hasExistingAttempt = history.some(h => h.user_id === userId);
            } else {
              hasExistingAttempt = history.some(h => !h.user_id);
            }
            console.log(`[MonitorPro] Questão #${questaoPayload.questao_tec_id} já cadastrada. ID no banco: ${dbQuestaoId}. Tentativa existente: ${hasExistingAttempt}`);
          }
        } else {
          console.warn("[MonitorPro] Falha ao consultar existência da questão. Tentando prosseguir...");
        }

        if (isContextInvalidated()) return;

        // Passo B: Se a questão não existir no banco, faz o cadastro dela
        if (!dbQuestaoId) {
          console.log(`[MonitorPro] Questão #${questaoPayload.questao_tec_id} inédita. Cadastrando na tabela 'questoes'...`);
          const insertRes = await backendFetch(`${BACKEND_URL}/rest/v1/questoes`, {
            method: "POST",
            headers: {
              ...headers,
              "Prefer": "return=representation"
            },
            body: JSON.stringify(questaoPayload)
          });

          if (insertRes.ok) {
            const data = await insertRes.json();
            if (data && data.length > 0) {
              dbQuestaoId = data[0].id;
              console.log(`[MonitorPro] Questão #${questaoPayload.questao_tec_id} cadastrada com sucesso! ID gerado: ${dbQuestaoId}`);
              if (questaoPayload.resolucao_professor) {
                sentComments.add(questaoPayload.questao_tec_id);
                console.log(`[MonitorPro] 📚 Comentário do professor para a Questão #${questaoPayload.questao_tec_id} salvo com sucesso!`);
              }
            }
          } else {
            const errText = await insertRes.text();
            
            // Se for erro de chave duplicada (23505), significa que outra requisição inseriu a questão simultaneamente.
            // Nesse caso, podemos fazer uma nova busca para obter o ID existente e continuar.
            if (errText.includes("23505") || errText.includes("duplicate key")) {
              console.warn(`[MonitorPro] Conflito de chave duplicada detectado para a Questão #${questaoPayload.questao_tec_id}. Recuperando registro existente...`);
              if (isContextInvalidated()) return;
              const recoveryRes = await backendFetch(`${BACKEND_URL}/rest/v1/questoes?questao_tec_id=eq.${questaoPayload.questao_tec_id}&select=id,resolucao_professor,historico_resolucoes!historico_resolucoes_questao_id_fkey(id,user_id)`, {
                method: "GET",
                headers
              });
              if (recoveryRes.ok) {
                const rows = await recoveryRes.json();
                if (rows && rows.length > 0) {
                  dbQuestaoId = rows[0].id;
                  existingResolucao = rows[0].resolucao_professor;
                  const history = rows[0].historico_resolucoes || [];
                  if (userId) {
                    hasExistingAttempt = history.some(h => h.user_id === userId);
                  } else {
                    hasExistingAttempt = history.some(h => !h.user_id);
                  }
                  console.log(`[MonitorPro] Registro recuperado com sucesso. ID no banco: ${dbQuestaoId}. Tentativa existente: ${hasExistingAttempt}`);
                  
                  // Atualiza metadados (ano, banca, órgão etc.), enunciado e resolução do professor
                   const updatePayload = Object.fromEntries(
                    Object.entries({
                      ano: questaoPayload.ano,
                      banca_texto: questaoPayload.banca_texto,
                      orgao: questaoPayload.orgao,
                      concurso: questaoPayload.concurso,
                      prova: questaoPayload.prova,
                      materia: questaoPayload.materia,
                      assunto: questaoPayload.assunto,
                      enunciado: questaoPayload.enunciado,
                      alternativas: questaoPayload.alternativas,
                      gabarito: questaoPayload.gabarito,
                    }).filter(([, v]) => v != null)
                  );
                  if (questaoPayload.resolucao_professor && questaoPayload.resolucao_professor !== existingResolucao) {
                    updatePayload.resolucao_professor = questaoPayload.resolucao_professor;
                  }
                  if (Object.keys(updatePayload).length > 0) {
                    console.log(`[MonitorPro] Atualizando metadados pós-recuperação da Questão #${questaoPayload.questao_tec_id}...`, updatePayload, `ano=${questaoPayload.ano}`);
                    if (isContextInvalidated()) return;
                    const updateRes = await backendFetch(`${BACKEND_URL}/rest/v1/questoes?id=eq.${dbQuestaoId}`, {
                      method: "PATCH",
                      headers,
                      body: JSON.stringify(updatePayload)
                    });
                    if (updateRes.ok) {
                      console.log(`[MonitorPro] ✅ Metadados da Questão #${questaoPayload.questao_tec_id} atualizados com sucesso!`);
                      if (questaoPayload.resolucao_professor && updatePayload.resolucao_professor) {
                        sentComments.add(questaoPayload.questao_tec_id);
                      }
                    } else {
                      console.warn(`[MonitorPro] Falha ao atualizar metadados:`, await updateRes.text());
                    }
                  }
                }
              }
            }
            
            // Se ainda não temos o dbQuestaoId, lança o erro de fato.
            if (!dbQuestaoId) {
              throw new Error(`Erro ao cadastrar questão na tabela 'questoes': ${errText}`);
            }
          }
        } else {
          // Se a questão já existia, atualiza metadados (ano, banca, órgão etc.), enunciado e resolução do professor
          const updatePayload = Object.fromEntries(
            Object.entries({
              ano: questaoPayload.ano,
              banca_texto: questaoPayload.banca_texto,
              orgao: questaoPayload.orgao,
              concurso: questaoPayload.concurso,
              prova: questaoPayload.prova,
              materia: questaoPayload.materia,
              assunto: questaoPayload.assunto,
              enunciado: questaoPayload.enunciado,
              alternativas: questaoPayload.alternativas,
              gabarito: questaoPayload.gabarito,
            }).filter(([, v]) => v != null)
          );
          if (questaoPayload.resolucao_professor && questaoPayload.resolucao_professor !== existingResolucao) {
            updatePayload.resolucao_professor = questaoPayload.resolucao_professor;
          }
          if (Object.keys(updatePayload).length > 0) {
            console.log(`[MonitorPro] Atualizando metadados da Questão #${questaoPayload.questao_tec_id}...`, updatePayload, `ano=${questaoPayload.ano}`);
            const updateRes = await backendFetch(`${BACKEND_URL}/rest/v1/questoes?id=eq.${dbQuestaoId}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify(updatePayload)
            });

            if (updateRes.ok) {
              console.log(`[MonitorPro] ✅ Metadados da Questão #${questaoPayload.questao_tec_id} atualizados com sucesso!`);
              if (questaoPayload.resolucao_professor && updatePayload.resolucao_professor) {
                sentComments.add(questaoPayload.questao_tec_id);
              }
            } else {
              console.warn(`[MonitorPro] Falha ao atualizar metadados:`, await updateRes.text());
            }
          }
        }

        if (isContextInvalidated()) return;

        // Passo C: Insere a tentativa de resolução na tabela 'historico_resolucoes'
        // Condições para inserir a tentativa:
        // 1. Ainda não foi marcada como enviada nesta sessão (hasAttemptSent é falso).
        // 2. E (o usuário acabou de responder no fluxo da sessão OU não há tentativa cadastrada no banco de dados para evitar duplicadas de recarga de página).
        if (dbQuestaoId && !hasAttemptSent && (userJustAnswered || !hasExistingAttempt)) {
          const finalTentativa = {
            ...tentativaPayload,
            questao_id: dbQuestaoId,
            user_id: userId || null,
            data_resolucao: new Date().toISOString()
          };

          console.log(`[MonitorPro] Gravando tentativa na tabela 'historico_resolucoes'...`, finalTentativa);
          const historyRes = await backendFetch(`${BACKEND_URL}/rest/v1/historico_resolucoes`, {
            method: "POST",
            headers: {
              ...headers,
              "Prefer": "return=representation"
            },
            body: JSON.stringify(finalTentativa)
          });

          if (historyRes.ok) {
            console.log(`[MonitorPro] 🚀 Tentativa do usuário para a Questão #${questaoPayload.questao_tec_id} gravada com SUCESSO no Supabase!`);
            sentAttempts.add(questaoPayload.questao_tec_id);
          } else {
            const errMsg = await historyRes.text();
            throw new Error(`Erro ao cadastrar histórico de resolução: ${errMsg}`);
          }
        } else if (dbQuestaoId && !hasAttemptSent) {
          // Se já havia uma tentativa no banco de dados e não é resposta recente, marca como enviado para evitar loops
          sentAttempts.add(questaoPayload.questao_tec_id);
          console.log(`[MonitorPro] Tentativa para a Questão #${questaoPayload.questao_tec_id} ignorada (já existe no histórico do banco).`);
        }
      } catch (err) {
        if (isContextInvalidated()) {
          console.warn("[MonitorPro] Sincronização interrompida (extensão recarregada/desativada).");
          return;
        }
        console.error("[MonitorPro] Falha crítica de sincronização com o banco de dados:", err);
        // Em caso de erro, limpa os conjuntos correspondentes para tentar novamente na próxima alteração do DOM
        if (!hasAttemptSent) sentAttempts.delete(questaoPayload.questao_tec_id);
        if (questaoPayload.resolucao_professor) sentComments.delete(questaoPayload.questao_tec_id);
      } finally {
        if (!isContextInvalidated()) {
          pendingRequests.delete(questaoPayload.questao_tec_id);
          // Re-avalia o container após um breve delay (150ms) caso o comentário tenha sido carregado 
          // ou o DOM tenha mudado enquanto a requisição assíncrona estava em voo.
          setTimeout(() => {
            if (isContextInvalidated()) return;
            const targetContainer = document.querySelector(`input[id-questao][value="${questaoPayload.questao_tec_id}"]`)?.closest(".questao");
            if (targetContainer && verificarSeResolvida(targetContainer)) {
              processarResolucao(targetContainer, questaoPayload.questao_tec_id);
            }
          }, 150);
        }
      }
    });
  }
}
