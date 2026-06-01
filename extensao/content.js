/**
 * MonitorPro Extrator - Content Script
 * 
 * Este script possui duas funções principais:
 * 1. Módulo de Sincronização: Roda nos domínios do App React para capturar credenciais de sessão do Supabase.
 * 2. Módulo de Extração: Roda no site do TEC Concursos para capturar reativamente a resolução de questões.
 */

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";

// ============================================================================
// 1. MÓDULO DE SINCRONIZAÇÃO DE CREDENCIAIS (Para o App React)
// ============================================================================

const hostname = window.location.hostname;
const isReactApp = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");

if (isReactApp) {
  console.log("content.js:3 MonitorPro v3.0: Olho invisível ativado!");
  console.log("content.js:10 ⚡ MonitorPro: Receptor DOM de sessão iniciado...");

  function sincronizarSessao() {
    try {
      const storageKey = "sb-dyxtalcvjcprmhuktyfd-auth-token";
      const sessionStr = localStorage.getItem(storageKey);

      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const token = session.access_token;
        const userId = session.user?.id;

        if (token && userId) {
          chrome.storage.local.get(["supabase_token", "supabase_user_id"], (stored) => {
            if (stored.supabase_token !== token || stored.supabase_user_id !== userId) {
              chrome.storage.local.set({
                supabase_token: token,
                supabase_user_id: userId
              }, () => {
                console.log(`content.js:38 ⚡ MonitorPro: Sessão sincronizada com sucesso via DOM! UserID: ${userId}`);
              });
            }
          });
        }
      } else {
        // Sem token no localStorage -> Usuário deslogou do App
        chrome.storage.local.get(["supabase_token"], (stored) => {
          if (stored.supabase_token) {
            chrome.storage.local.remove(["supabase_token", "supabase_user_id"], () => {
              console.log("content.js:48 ⚡ MonitorPro: Sessão limpa (usuário deslogado do aplicativo).");
            });
          }
        });
      }
    } catch (e) {
      console.error("⚡ MonitorPro: Erro ao sincronizar sessão:", e);
    }
  }

  // Verifica na carga e a cada 3 segundos (captura logins/logouts em tempo real)
  sincronizarSessao();
  setInterval(sincronizarSessao, 3000);
}

// ============================================================================
// 2. MÓDULO DE EXTRAÇÃO E SCRAPING (Para o TEC Concursos)
// ============================================================================

if (window.location.hostname.includes("tecconcursos.com.br")) {
  console.log("⚡ MonitorPro: Extrator iniciado na página do TEC Concursos.");

  // Conjunto de IDs de questões que já enviamos nesta aba para evitar loops/duplicações
  const sentResolutions = new Set();
  
  // Dicionário de tempos de carregamento para medir o tempo gasto por questão
  const questionLoadTimes = {};

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
   * Processa e salva a resolução de uma questão de forma segura e deduplicada
   */
  function processarResolucao(container, questaoTecId) {
    if (sentResolutions.has(questaoTecId)) return;
    sentResolutions.add(questaoTecId);

    console.log(`[MonitorPro] ⚡ Capturando dados da Questão #${questaoTecId}...`);
    try {
      extrairESalvarQuestao(container, questaoTecId);
    } catch (err) {
      console.error(`[MonitorPro] ❌ Falha interna ao extrair dados da Questão #${questaoTecId}:`, err);
      // Remove do Set para permitir que re-tentativas aconteçam se o DOM mudar novamente
      sentResolutions.delete(questaoTecId);
    }
  }

  // Loop leve (500ms) para varrer containers e configurar observadores reativos individuais (MutationObserver)
  setInterval(() => {
    const questionContainers = document.querySelectorAll(".questao");
    
    questionContainers.forEach((container) => {
      const idInput = container.querySelector("input[id-questao]");
      if (!idInput || !idInput.value) return;

      const questaoTecId = parseInt(idInput.value);
      if (isNaN(questaoTecId)) return;

      // 1. Inicia o cronômetro para questões novas não resolvidas
      const isResolved = verificarSeResolvida(container);
      if (!isResolved && !questionLoadTimes[questaoTecId]) {
        questionLoadTimes[questaoTecId] = Date.now();
        console.log(`[MonitorPro] Cronômetro iniciado para a Questão #${questaoTecId}`);
      }

      // 2. Configura MutationObserver se o container ainda não possuir um configurado
      if (!container.hasAttribute("data-observed")) {
        container.setAttribute("data-observed", "true");
        
        console.log(`[MonitorPro] MutationObserver ativado no container da Questão #${questaoTecId}`);
        
        const observer = new MutationObserver(() => {
          // Relê o ID caso o AngularJS recicle o container
          const currentIdInput = container.querySelector("input[id-questao]");
          if (!currentIdInput || !currentIdInput.value) return;
          const currentId = parseInt(currentIdInput.value);
          if (isNaN(currentId)) return;

          if (verificarSeResolvida(container)) {
            processarResolucao(container, currentId);
          }
        });

        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "aria-checked"]
        });
      }

      // 3. Failsafe: se já estiver resolvida no loop periódico tradicional, processa imediatamente
      if (isResolved) {
        processarResolucao(container, questaoTecId);
      }
    });
  }, 500);

  /**
   * Extrai todos os campos da questão a partir do seu container e envia para o Supabase
   */
  function extrairESalvarQuestao(container, questaoTecId) {
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
    if (linksResumo.length > 1) {
      const textBloco = linksResumo[1].textContent.trim(); // Ex: "2025 - Concurso/Prova"
      
      const regexAno = /^(\d{4})\s*-\s*(.*)$/;
      const matchAno = textBloco.match(regexAno);
      
      if (matchAno) {
        ano = parseInt(matchAno[1]);
        const resto = matchAno[2];
        const partes = resto.split("/");
        concurso = partes[0] ? partes[0].trim() : null;
        prova = partes[1] ? partes[1].trim() : null;
      } else {
        const partes = textBloco.split("/");
        concurso = partes[0] ? partes[0].trim() : null;
        prova = partes[1] ? partes[1].trim() : null;
      }
    }

    // 5. Enunciado
    let enunciado = null;
    const enunciadoEl = container.querySelector(".questao-enunciado-texto");
    if (enunciadoEl) {
      enunciado = enunciadoEl.innerText ? enunciadoEl.innerText.trim() : enunciadoEl.textContent.trim();
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
      gabarito
    };

    const tentativaPayload = {
      questao_tec_id: questaoTecId,
      alternativa: alternativaUsuario,
      acertou,
      tempo_segundos: tempoSegundos
    };

    console.log(`[MonitorPro] Extração completa da Questão #${questaoTecId}:`, { questaoPayload, tentativaPayload });

    // Salva no Supabase!
    salvarNoSupabase(questaoPayload, tentativaPayload);
  }

  /**
   * Salva os payloads de forma relacional no Supabase
   */
  function salvarNoSupabase(questaoPayload, tentativaPayload) {
    chrome.storage.local.get(["supabase_token", "supabase_user_id"], async (stored) => {
      const token = stored.supabase_token;
      const userId = stored.supabase_user_id;

      // Define os headers de rede
      const headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log(`[MonitorPro] Usando sessão autenticada do usuário: ${userId}`);
      } else {
        headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
        console.warn("[MonitorPro] Sessão do usuário não encontrada. Usando chave pública (anon).");
      }

      try {
        // Passo A: Verifica se a questão já está cadastrada na tabela 'questoes'
        const searchUrl = `${SUPABASE_URL}/rest/v1/questoes?questao_tec_id=eq.${questaoPayload.questao_tec_id}&select=id`;
        const searchRes = await fetch(searchUrl, {
          method: "GET",
          headers
        });

        let dbQuestaoId = null;

        if (searchRes.ok) {
          const rows = await searchRes.json();
          if (rows && rows.length > 0) {
            dbQuestaoId = rows[0].id;
            console.log(`[MonitorPro] Questão #${questaoPayload.questao_tec_id} já cadastrada. ID no banco: ${dbQuestaoId}`);
          }
        } else {
          console.warn("[MonitorPro] Falha ao consultar existência da questão. Tentando prosseguir...");
        }

        // Passo B: Se a questão não existir no banco, faz o cadastro dela
        if (!dbQuestaoId) {
          console.log(`[MonitorPro] Questão #${questaoPayload.questao_tec_id} inédita. Cadastrando na tabela 'questoes'...`);
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes`, {
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
            }
          } else {
            const errMsg = await insertRes.text();
            throw new Error(`Erro ao cadastrar questão na tabela 'questoes': ${errMsg}`);
          }
        }

        // Passo C: Insere a tentativa de resolução na tabela 'historico_resolucoes'
        if (dbQuestaoId) {
          const finalTentativa = {
            ...tentativaPayload,
            questao_id: dbQuestaoId,
            user_id: userId || null,
            data_resolucao: new Date().toISOString()
          };

          console.log(`[MonitorPro] Gravando tentativa na tabela 'historico_resolucoes'...`, finalTentativa);
          const historyRes = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes`, {
            method: "POST",
            headers: {
              ...headers,
              "Prefer": "return=representation"
            },
            body: JSON.stringify(finalTentativa)
          });

          if (historyRes.ok) {
            console.log(`[MonitorPro] 🚀 Resolução da Questão #${questaoPayload.questao_tec_id} gravada com SUCESSO no Supabase!`);
          } else {
            const errMsg = await historyRes.text();
            throw new Error(`Erro ao cadastrar histórico de resolução: ${errMsg}`);
          }
        }
      } catch (err) {
        console.error("[MonitorPro] Falha crítica de sincronização com o banco de dados:", err);
        // Remove dos enviados para permitir re-tentativa na próxima alteração do DOM
        sentResolutions.delete(questaoPayload.questao_tec_id);
      }
    });
  }
}
