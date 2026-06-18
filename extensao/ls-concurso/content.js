/**
 * LS Concurso - Extrator de Metas
 *
 * Extrai metas semanais da página `aluno.lsensino.com.br/#/app/metaAtual`
 * e salva no Supabase (tabelas metas_concurso + tarefas_meta).
 */

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";

let sentMetas = new Set();

function isContextInvalidated() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return true;
  try { chrome.runtime.getURL(""); return false; }
  catch (e) { return true; }
}

// ─── Sincronização de sessão com App React ──────────────────

const hostname = window.location.hostname;
const isReactApp = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");

if (isReactApp) {
  function sincronizarSessao() {
    if (isContextInvalidated()) return;
    try {
      const storageKey = "sb-dyxtalcvjcprmhuktyfd-auth-token";
      const sessionStr = localStorage.getItem(storageKey);
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const token = session.access_token;
        const userId = session.user?.id;
        if (token && userId) {
          chrome.storage.local.get(["supabase_token", "supabase_user_id"], (stored) => {
            if (isContextInvalidated()) return;
            if (stored.supabase_token !== token || stored.supabase_user_id !== userId) {
              chrome.storage.local.set({ supabase_token: token, supabase_user_id: userId }, () => {
                if (isContextInvalidated()) return;
                console.log("[LS-Metas] Sessão sincronizada:", userId);
              });
            }
          });
        }
      } else {
        chrome.storage.local.get(["supabase_token"], (stored) => {
          if (isContextInvalidated()) return;
          if (stored.supabase_token) {
            chrome.storage.local.remove(["supabase_token", "supabase_user_id"]);
          }
        });
      }
    } catch (e) {
      if (isContextInvalidated()) return;
      console.error("[LS-Metas] Erro ao sincronizar sessão:", e);
    }
  }

  sincronizarSessao();
  setInterval(() => {
    if (isContextInvalidated()) return;
    sincronizarSessao();
  }, 3000);
}

// ─── Extração de Metas (LS Concurso) ────────────────────────

if (window.location.hostname.includes("lsensino.com.br")) {
  console.log("[LS-Metas] Extrator iniciado em aluno.lsensino.com.br");

  let metaJaProcessada = false;

  function processarMeta() {
    if (isContextInvalidated()) return;

    // Só extrai quando a tabela estiver renderizada
    const linhas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
    if (linhas.length === 0) return;

    // Título: "Meta atual | Meta 9 (#24)"
    const pageText = document.body.textContent || "";
    const tituloMatch = pageText.match(/Meta\s+(\d+)\s*\(#(\d+)\)/i);
    if (!tituloMatch) return;
    const semanaNumero = parseInt(tituloMatch[2], 10);
    const tituloTexto = tituloMatch[0].trim();

    // Evita re-envio da mesma meta
    if (sentMetas.has(semanaNumero)) return;

    // Datas: "16/06 – 23/06"
    let dataInicio = null;
    let dataFim = null;
    // Regex: captura DD/MM opcionalmente seguido de /YYYY ou /YY
    const datasMatch = pageText.match(/(\d{2}\/\d{2}(?:\/\d{2,4})?)\s*[–-]\s*(\d{2}\/\d{2}(?:\/\d{2,4})?)/i);
    console.log(`[LS-Metas] Debug datas: match=${datasMatch ? datasMatch[0] : 'null'}, titulo=${tituloTexto}`);
    if (datasMatch) {
      const partesInicio = datasMatch[1].split("/");
      const partesFim = datasMatch[2].split("/");
      let ano;
      if (partesInicio.length === 3 && partesInicio[2].length >= 2) {
        ano = partesInicio[2].length === 2 ? 2000 + parseInt(partesInicio[2], 10) : parseInt(partesInicio[2], 10);
      } else {
        ano = new Date().getFullYear();
      }
      dataInicio = `${ano}-${partesInicio[1].padStart(2, "0")}-${partesInicio[0].padStart(2, "0")}`;
      dataFim = `${ano}-${partesFim[1].padStart(2, "0")}-${partesFim[0].padStart(2, "0")}`;
    }

    // Total de tarefas: "10 tarefa(s)" ou "10/10"
    let totalTarefas = 0;
    const tarefasMatch = pageText.match(/(\d+)\s*tarefa/i);
    if (tarefasMatch) totalTarefas = parseInt(tarefasMatch[1], 10);

    // Linhas da tabela
    const tarefas = [];

    linhas.forEach((tr, index) => {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 7) return;

      const visibleText = (td) => {
        if (!td) return "";
        // Procura o primeiro filho direto visível (sem ng-hide do Angular)
        for (const child of td.children) {
          if (!child.classList.contains('ng-hide') && child.textContent.trim()) {
            return child.textContent.trim();
          }
        }
        return "";
      };

      const disciplina = cells[1]?.textContent?.trim() || "";
      const formato = cells[2]?.textContent?.trim() || "";
      const descricao = cells[3]?.textContent?.trim() || "";
      const tempo = cells[4]?.textContent?.trim() || null;
      const desempenhoRaw = cells[5]?.textContent?.trim() || "0%";
      const statusRaw = visibleText(cells[6]).toLowerCase();
      const avaliacaoRaw = visibleText(cells[7]);
      const relevanciaRaw = visibleText(cells[8]);

      let status = "pendente";
      if (statusRaw.includes("conclu") || statusRaw.includes("ok")) status = "concluída";
      else if (statusRaw.includes("inici") || statusRaw.includes("andamento")) status = "iniciada";
      else if (statusRaw.includes("ignor") || statusRaw.includes("pular")) status = "ignorada";

      let desempenho = null;
      const desempenhoNum = parseInt(desempenhoRaw.replace(/\D/g, ""), 10);
      if (!isNaN(desempenhoNum)) desempenho = desempenhoNum;

      if (!disciplina) return;

      tarefas.push({
        ordem: index + 1,
        disciplina,
        formato: normalizarFormato(formato),
        descricao,
        tempo_estimado: tempo,
        status,
        desempenho,
        avaliacao: avaliacaoRaw && avaliacaoRaw !== "-" ? avaliacaoRaw : null,
        relevancia: relevanciaRaw && relevanciaRaw !== "-" ? relevanciaRaw : null
      });
    });

    if (tarefas.length === 0) return;

    console.log(`[LS-Metas] Meta #${semanaNumero} extraída: ${tarefas.length} tarefas`);
    salvarMeta(semanaNumero, tituloTexto, dataInicio, dataFim, totalTarefas, tarefas);
  }

  function extrairMeta() {
    if (isContextInvalidated()) return;
    if (metaJaProcessada) return;
    metaJaProcessada = true;
    processarMeta();
  }

  function normalizarFormato(fmt) {
    const f = fmt.toLowerCase().trim().replace(/\.$/, "");
    if (f.includes("teórico") && (f.includes("exerc") || f.includes("+"))) return "Teórico e Exercícios";
    if (f.includes("teórico") || f.includes("teoria")) return "Teórico";
    if (f.includes("exerc") || f.includes("questão")) return "Exercícios";
    if (f.includes("revisão") || f.includes("revisao")) return "Revisão";
    if (f.includes("simulado")) return "Simulado";
    return fmt;
  }

  function montarHeaders(token) {
    const headers = {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    return headers;
  }

  function ehJwtExpirou(err) {
    return typeof err === 'string' && (err.includes('PGRST303') || err.includes('JWT expired'));
  }

  function limparTokenExpirado() {
    chrome.storage.local.remove(["supabase_token", "supabase_user_id"], () => {
      console.warn("[LS-Metas] Token removido. Abra o app questoes-concursos (localhost:5173 ou vercel) para renovar a sessão.");
    });
  }

  async function reqJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.ok) return res;
    const body = await res.text();
    if (ehJwtExpirou(body)) {
      limparTokenExpirado();
      throw new Error("TOKEN_EXPIRADO");
    }
    throw new Error(body);
  }

  function salvarMeta(semanaNumero, tituloTexto, dataInicio, dataFim, totalTarefas, tarefas) {
    if (isContextInvalidated()) return;
    chrome.storage.local.get(["supabase_token", "supabase_user_id"], async (stored) => {
      if (isContextInvalidated()) return;
      const token = stored.supabase_token;
      const userId = stored.supabase_user_id;
      const headers = montarHeaders(token);

      try {
        if (isContextInvalidated()) return;

        // Verifica se a meta já existe
        const searchUrl = `${SUPABASE_URL}/rest/v1/metas_concurso?semana_numero=eq.${semanaNumero}&select=id`;
        const searchRes = await reqJson(searchUrl, { method: "GET", headers });
        const rows = await searchRes.json();
        let metaId = null;

        if (rows && rows.length > 0) {
          metaId = rows[0].id;
          // Atualiza datas se faltarem
          if (dataInicio || dataFim) {
            const patch = {};
            if (dataInicio) patch.data_inicio = dataInicio;
            if (dataFim) patch.data_fim = dataFim;
            await reqJson(
              `${SUPABASE_URL}/rest/v1/metas_concurso?id=eq.${metaId}`,
              { method: "PATCH", headers, body: JSON.stringify(patch) }
            );
          }
          // Atualiza tarefas existentes com dados do histórico
          for (const tarefa of tarefas) {
            const patchFields = {};
            if (tarefa.status) patchFields.status = tarefa.status;
            if (tarefa.desempenho !== null && tarefa.desempenho !== undefined) patchFields.desempenho = tarefa.desempenho;
            if (tarefa.avaliacao) patchFields.avaliacao = tarefa.avaliacao;
            if (tarefa.relevancia) patchFields.relevancia = tarefa.relevancia;
            if (tarefa.tempo_estimado) patchFields.tempo_estimado = tarefa.tempo_estimado;
            if (Object.keys(patchFields).length === 0) continue;
            await reqJson(
              `${SUPABASE_URL}/rest/v1/tarefas_meta?meta_id=eq.${metaId}&ordem=eq.${tarefa.ordem}`,
              { method: "PATCH", headers, body: JSON.stringify(patchFields) }
            );
          }
          console.log(`[LS-Metas] Meta #${semanaNumero} (id=${metaId}) — ${tarefas.length} tarefas atualizadas`);
          sentMetas.add(semanaNumero);
          return;
        }

        if (isContextInvalidated()) return;

        // Cria a meta
        const metaPayload = {
          user_id: userId || null,
          titulo: tituloTexto,
          semana_numero: semanaNumero,
          data_inicio: dataInicio,
          data_fim: dataFim,
          total_tarefas: totalTarefas || tarefas.length
        };

        const insertRes = await reqJson(
          `${SUPABASE_URL}/rest/v1/metas_concurso`,
          {
            method: "POST",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(metaPayload)
          }
        );

        const metaData = await insertRes.json();
        if (!metaData || metaData.length === 0) return;
        metaId = metaData[0].id;
        console.log(`[LS-Metas] Meta #${semanaNumero} criada (id=${metaId})`);

        if (isContextInvalidated()) return;

        // Insere tarefas em lote
        const tarefasPayload = tarefas.map(t => ({
          meta_id: metaId,
          ...t
        }));

        await reqJson(
          `${SUPABASE_URL}/rest/v1/tarefas_meta`,
          {
            method: "POST",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(tarefasPayload)
          }
        );

        console.log(`[LS-Metas] ${tarefas.length} tarefas salvas para Meta #${semanaNumero}`);
        sentMetas.add(semanaNumero);
      } catch (err) {
        if (isContextInvalidated()) return;
        if (err?.message === "TOKEN_EXPIRADO") {
          console.warn("[LS-Metas] Token expirado. Abra o app questoes-concursos (localhost:5173 ou vercel.app), faça login e depois recarregue esta página.");
        } else {
          console.error("[LS-Metas] Erro ao salvar meta:", err);
        }
      }
    });
  }

  // ─── Extração do Modal "Ver" (detalhes da tarefa) ───────────

  let tarefaDetalheAtual = null;

  // Intercepta clique na lupa (Ver) — 10ª coluna com <td ng-click>
  document.addEventListener("click", (e) => {
    const td = e.target.closest("td:last-child");
    if (!td) return;
    const tr = td.closest("tr[ng-repeat]");
    if (!tr) return;
    const cells = tr.querySelectorAll("td");
    if (cells.length < 10) return;
    const descricao = cells[3]?.textContent?.trim() || "";
    const disciplina = cells[1]?.textContent?.trim() || "";
    const tarefas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
    let index = -1;
    tarefas.forEach((t, i) => { if (t === tr) index = i; });
    tarefaDetalheAtual = { index, descricao, disciplina };
    console.log(`[LS-Metas] Clique em Ver: tarefa #${index} — ${disciplina}: ${descricao}`);
  }, true);

  // Observa abertura/fechamento do modal
  const modalEl = document.getElementById("myModal");
  if (modalEl) {
    const modalObserver = new MutationObserver(() => {
      if (isContextInvalidated()) return;
      const visivel = modalEl.classList.contains("in") || modalEl.style.display === "block";
      if (visivel && tarefaDetalheAtual) {
        console.log("[LS-Metas] Modal aberto, extraindo detalhes...");
        setTimeout(() => extrairDetalhesDoModal(), 800);
      }
    });
    modalObserver.observe(modalEl, { attributes: true, attributeFilter: ["class", "style"] });
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (isContextInvalidated()) return;
      const m = document.getElementById("myModal");
      if (m && !m.dataset.modalObserverAttached) {
        m.dataset.modalObserverAttached = "1";
        const obs = new MutationObserver(() => {
          if (isContextInvalidated()) return;
          const visivel = m.classList.contains("in") || m.style.display === "block";
          if (visivel && tarefaDetalheAtual) {
            console.log("[LS-Metas] Modal aberto (fallback), extraindo detalhes...");
            setTimeout(() => extrairDetalhesDoModal(), 800);
          }
        });
        obs.observe(m, { attributes: true, attributeFilter: ["class", "style"] });
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function extrairDetalhesDoModal() {
    if (isContextInvalidated()) return;
    const modal = document.getElementById("myModal");
    if (!modal) return;

    const detalhes = {};

    // Assunto: <h4><strong>ASSUNTO:</strong> ...</h4>
    const assuntoH4 = Array.from(modal.querySelectorAll("h4")).find(h =>
      h.querySelector("strong") && h.textContent.includes("ASSUNTO")
    );
    if (assuntoH4) {
      const strong = assuntoH4.querySelector("strong");
      if (strong) {
        const val = assuntoH4.textContent.replace(strong.textContent, "").trim();
        if (val) detalhes.assunto = val;
      }
    }

    // Material Indicado: <h4 ng-show><strong>MATERIAL INDICADO:</strong> ...</h4>
    const matH4 = Array.from(modal.querySelectorAll("h4")).find(h =>
      h.querySelector("strong") && h.textContent.includes("MATERIAL INDICADO") &&
      !h.classList.contains("ng-hide")
    );
    if (matH4) {
      const strong = matH4.querySelector("strong");
      if (strong) {
        const val = matH4.textContent.replace(strong.textContent, "").trim();
        if (val) detalhes.material_indicado = val;
      }
    }

    // Relevância: <h4 ng-show><strong>RELEVÂNCIA:</strong> ...</h4>
    const revH4 = Array.from(modal.querySelectorAll("h4")).find(h =>
      h.querySelector("strong") && h.textContent.includes("RELEVÂNCIA") &&
      !h.classList.contains("ng-hide")
    );
    if (revH4) {
      const strong = revH4.querySelector("strong");
      if (strong) {
        const val = revH4.textContent.replace(strong.textContent, "").trim();
        if (val) detalhes.relevancia = val;
      }
    }

    // Conteúdo: div com class começando com "conteudo_tarefas-" e data-ng-bind-html
    const conteudoDiv = modal.querySelector('[class*="conteudo_tarefas-"]');
    if (conteudoDiv) {
      // O conteúdo está em HTML (ng-bind-html), preserva como HTML
      const html = conteudoDiv.innerHTML.trim();
      if (html && html.length > 0) detalhes.conteudo = html;
    }

    // Dicas: div com class começando com "conteudo_dica-" e data-ng-bind-html
    const dicasDiv = modal.querySelector('[class*="conteudo_dica-"]');
    if (dicasDiv) {
      const html = dicasDiv.innerHTML.trim();
      if (html && html.length > 0) detalhes.conteudo_dicas = html;
    }

    // Link TEC: procura links dentro do conteúdo extraído
    if (conteudoDiv) {
      const tecLink = conteudoDiv.querySelector("a[href*='tecconcursos']");
      if (tecLink) detalhes.link_tec = tecLink.href;
    }
    if (!detalhes.link_tec && dicasDiv) {
      const tecLink = dicasDiv.querySelector("a[href*='tecconcursos']");
      if (tecLink) detalhes.link_tec = tecLink.href;
    }
    if (!detalhes.link_tec) {
      const allLinks = modal.querySelectorAll("a[href*='tecconcursos']");
      if (allLinks.length > 0) detalhes.link_tec = allLinks[0].href;
    }

    // Extrai TAREFA do modal para identificar a ordem correta
    const tarefaH4 = Array.from(modal.querySelectorAll("h4")).find(h =>
      h.querySelector("strong") && h.textContent.includes("TAREFA")
    );
    if (tarefaH4) {
      const strong = tarefaH4.querySelector("strong");
      if (strong) {
        const tarefaNumStr = tarefaH4.textContent.replace(strong.textContent, "").trim();
        const tarefaNum = parseInt(tarefaNumStr, 10);
        if (!isNaN(tarefaNum) && tarefaNum > 0) {
          tarefaDetalheAtual.numeroTarefa = tarefaNum;
        }
      }
    }

    const temDadosUteis = detalhes.assunto || detalhes.material_indicado || detalhes.relevancia ||
                          detalhes.conteudo || detalhes.conteudo_dicas || detalhes.link_tec;

    if (!temDadosUteis) {
      console.log("[LS-Metas] Nenhum detalhe extraído do modal");
      return;
    }

    console.log("[LS-Metas] Detalhes extraídos:", detalhes);
    atualizarTarefaComDetalhes(detalhes);
  }

  function atualizarTarefaComDetalhes(detalhes) {
    if (isContextInvalidated()) return;
    if (!tarefaDetalheAtual) return;

    chrome.storage.local.get(["supabase_token", "supabase_user_id"], async (stored) => {
      if (isContextInvalidated()) return;
      const token = stored.supabase_token;
      const headers = montarHeaders(token);

      // Usa .v3-meta-titulo-pagina (histórico) OU fallback no body text (metaAtual)
      const tituloEl = document.querySelector(".v3-meta-titulo-pagina");
      const tituloTexto = tituloEl ? tituloEl.textContent.trim() : (document.body.textContent || "");
      const tituloMatch = tituloTexto.match(/#(\d+)/);
      if (!tituloMatch) return;
      const semanaNumero = parseInt(tituloMatch[1], 10);

      try {
        const searchUrl = `${SUPABASE_URL}/rest/v1/metas_concurso?semana_numero=eq.${semanaNumero}&select=id`;
        const searchRes = await reqJson(searchUrl, { method: "GET", headers });
        const metas = await searchRes.json();
        if (!metas || metas.length === 0) return;
        const metaId = metas[0].id;

        const tarefaOrdem = tarefaDetalheAtual.numeroTarefa || (tarefaDetalheAtual.index + 1);

        const patchPayload = {};
        for (const [chave, valor] of Object.entries(detalhes)) {
          if (valor) patchPayload[chave] = valor;
        }
        if (Object.keys(patchPayload).length === 0) return;

        // PATCH todas as tarefas com este meta_id+ordem (evita duplicatas)
        await reqJson(
          `${SUPABASE_URL}/rest/v1/tarefas_meta?meta_id=eq.${metaId}&ordem=eq.${tarefaOrdem}`,
          { method: "PATCH", headers, body: JSON.stringify(patchPayload) }
        );
        console.log(`[LS-Metas] Detalhes salvos para tarefa #${tarefaOrdem} da meta #${semanaNumero}`);
        tarefaDetalheAtual = null;
      } catch (err) {
        if (isContextInvalidated()) return;
        if (err?.message === "TOKEN_EXPIRADO") {
          console.warn("[LS-Metas] Token expirado ao salvar detalhes. Abra o app questoes-concursos (localhost:5173 ou vercel.app), faça login e recarregue esta página.");
        } else {
          console.error("[LS-Metas] Erro ao atualizar tarefa com detalhes:", err);
        }
      }
    });
  }

  // ─── Histórico de Metas ────────────────────────────────────

  let historicoJaProcessado = false;

  function extrairHistorico() {
    if (isContextInvalidated()) return;
    if (historicoJaProcessado) return;

    const linhas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
    if (linhas.length === 0) return;
    historicoJaProcessado = true;

    const pageText = document.body.textContent || "";

    // Nome da meta: "Meta 8 (#23)"
    const tituloEl = document.querySelector(".v3-meta-titulo-pagina");
    const tituloTexto = tituloEl ? tituloEl.textContent.trim() : "";

    // Número da semana do (#23)
    const hashMatch = tituloTexto.match(/#(\d+)/);
    if (!hashMatch) { historicoJaProcessado = false; return; }
    const semanaNumero = parseInt(hashMatch[1], 10);

    // Evita re-envio
    if (sentMetas.has(semanaNumero)) { historicoJaProcessado = false; return; }

    // Datas: "16/06 – 23/06"
    let dataInicio = null;
    let dataFim = null;
    // Regex: captura DD/MM opcionalmente seguido de /YYYY ou /YY
    const datasMatch = pageText.match(/(\d{2}\/\d{2}(?:\/\d{2,4})?)\s*[–-]\s*(\d{2}\/\d{2}(?:\/\d{2,4})?)/i);
    console.log(`[LS-Metas] Debug datas: match=${datasMatch ? datasMatch[0] : 'null'}, titulo=${tituloTexto}`);
    if (datasMatch) {
      const partesInicio = datasMatch[1].split("/");
      const partesFim = datasMatch[2].split("/");
      let ano;
      if (partesInicio.length === 3 && partesInicio[2].length >= 2) {
        ano = partesInicio[2].length === 2 ? 2000 + parseInt(partesInicio[2], 10) : parseInt(partesInicio[2], 10);
      } else {
        ano = new Date().getFullYear();
      }
      dataInicio = `${ano}-${partesInicio[1].padStart(2, "0")}-${partesInicio[0].padStart(2, "0")}`;
      dataFim = `${ano}-${partesFim[1].padStart(2, "0")}-${partesFim[0].padStart(2, "0")}`;
    }

    // Resumo
    const resumoEl = document.querySelector(".v3-meta-box-resumo");
    let desempenho = null;
    let horasEstudadas = null;
    let questoesResolvidas = null;
    if (resumoEl) {
      const dados = resumoEl.querySelectorAll(".v3-meta-box-resumo-dados");
      if (dados.length >= 1) desempenho = dados[0]?.textContent?.trim() || null;
      if (dados.length >= 2) horasEstudadas = dados[1]?.textContent?.trim() || null;
      if (dados.length >= 4) questoesResolvidas = dados[3]?.textContent?.trim() || null;
    }

    // Tarefas
    const tarefas = [];
    linhas.forEach((tr, index) => {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 7) return;

      const visibleText = (td) => {
        if (!td) return "";
        for (const child of td.children) {
          if (!child.classList.contains('ng-hide') && child.textContent.trim()) {
            return child.textContent.trim();
          }
        }
        return "";
      };

      const disciplina = cells[1]?.textContent?.trim() || "";
      const formato = cells[2]?.textContent?.trim() || "";
      const descricao = cells[3]?.textContent?.trim() || "";
      const tempo = cells[4]?.textContent?.trim() || null;
      const desempenhoRaw = cells[5]?.textContent?.trim() || "0%";
      const statusRaw = visibleText(cells[6]).toLowerCase();
      const avaliacaoRaw = visibleText(cells[7]);
      const relevanciaRaw = visibleText(cells[8]);

      let status = "pendente";
      if (statusRaw.includes("conclu") || statusRaw.includes("ok")) status = "concluída";
      else if (statusRaw.includes("inici") || statusRaw.includes("andamento")) status = "iniciada";
      else if (statusRaw.includes("ignor") || statusRaw.includes("pular")) status = "ignorada";

      let desempenhoNum = null;
      const num = parseInt(desempenhoRaw.replace(/\D/g, ""), 10);
      if (!isNaN(num)) desempenhoNum = num;

      if (!disciplina) return;

      tarefas.push({
        ordem: index + 1,
        disciplina,
        formato: normalizarFormato(formato),
        descricao,
        tempo_estimado: tempo,
        status,
        desempenho: desempenhoNum,
        avaliacao: avaliacaoRaw && avaliacaoRaw !== "-" ? avaliacaoRaw : null,
        relevancia: relevanciaRaw && relevanciaRaw !== "-" ? relevanciaRaw : null
      });
    });

    if (tarefas.length === 0) { historicoJaProcessado = false; return; }

    console.log(`[LS-Metas] Histórico #${semanaNumero} extraído: ${tarefas.length} tarefas`);
    salvarMeta(semanaNumero, tituloTexto, dataInicio, dataFim, tarefas.length, tarefas);
  }

  // Observa hash para detectar navegação
  let lastHash = window.location.hash;
  const hashObserver = new MutationObserver(() => {
    if (isContextInvalidated()) return;
    const h = window.location.hash;
    if (h !== lastHash) {
      lastHash = h;
      historicoJaProcessado = false;
      metaJaProcessada = false;
      if (h.includes("/app/metaAtual")) {
        setTimeout(() => {
          if (document.querySelectorAll("table.v3-table tr[ng-repeat]").length > 0) {
            extrairMeta();
          }
        }, 3000);
      }
      if (h.includes("/app/historicoMetas") || h.includes("/app/historico")) {
        setTimeout(() => {
          const linhas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
          if (linhas.length > 0) {
            extrairHistorico();
          }
        }, 3000);
      }
    }
  });
  hashObserver.observe(document.body, { childList: true, subtree: true });

  // Observa o botão "Filtrar" do histórico
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.textContent.trim() === "Filtrar" || btn.getAttribute("ng-click")?.includes("obterMetaSelecionada")) {
      console.log("[LS-Metas] Histórico: clique em Filtrar");
      historicoJaProcessado = false;
      // Aguarda o Angular carregar os dados
      setTimeout(() => {
        // Observa o resumo aparecer
        const check = setInterval(() => {
          if (isContextInvalidated()) { clearInterval(check); return; }
          const resumo = document.querySelector(".v3-meta-box-resumo");
          const linhas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
          if (resumo || linhas.length > 0) {
            clearInterval(check);
            extrairHistorico();
          }
        }, 500);
        setTimeout(() => clearInterval(check), 15000);
      }, 1500);
    }
  }, true);

  // Tenta após a página carregar (com retry se Angular ainda estiver montando)
  console.log("[LS-Metas] Hash atual:", window.location.hash);
  if (window.location.hash.includes("/app/metaAtual")) {
    let tentativas = 0;
    const tentar = () => {
      if (isContextInvalidated()) return;
      if (metaJaProcessada) return;
      const linhas = document.querySelectorAll("table.v3-table tr[ng-repeat]");
      console.log(`[LS-Metas] Tentativa ${tentativas + 1}: ${linhas.length} linhas encontradas`);
      if (linhas.length > 0) {
        extrairMeta();
      } else if (tentativas < 30) {
        tentativas++;
        setTimeout(tentar, 1500);
      }
    };
    setTimeout(() => {
      const allTables = document.querySelectorAll("table");
      console.log(`[LS-Metas] Total de tabelas na página: ${allTables.length}`);
      allTables.forEach((t, i) => {
        console.log(`[LS-Metas] Tabela ${i}: class="${t.className}", rows=${t.rows?.length || 0}`);
      });
    }, 3000);
    setTimeout(tentar, 2000);
  }

  // Tenta extrair histórico se já estiver visível
  setTimeout(() => {
    if (document.querySelector(".v3-meta-box-resumo")) {
      extrairHistorico();
    }
  }, 3000);
}
