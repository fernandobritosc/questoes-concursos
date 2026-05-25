// content.js - MonitorPro Extrator v2.1
(() => {
    console.log("MonitorPro v2.1: Olho invisível ativado!");

    // ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";
const TABELA = "resolucoes";
const FILA_STORAGE_KEY = "monitorpro_fila_pendente";

// ─── ESTADO ──────────────────────────────────────────────────────────────────
let lastCapturedQuestion = null;
let lastDisplayedQuestionId = null;
let tempoInicio = Date.now();
let debounceTimer = null;
let lastUrl = location.href;
let hasBeenUnresolved = false;

// ─── FILA DE RETRY (chrome.storage.local) ───────────────────────────────────
async function obterFila() {
    return new Promise((resolve) => {
        chrome.storage.local.get([FILA_STORAGE_KEY], (result) => {
            resolve(result[FILA_STORAGE_KEY] || []);
        });
    });
}

async function salvarFila(fila) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [FILA_STORAGE_KEY]: fila }, resolve);
    });
}

async function adicionarNaFila(payload) {
    const fila = await obterFila();
    fila.push(payload);
    await salvarFila(fila);
    console.warn(`⚠️ MonitorPro: Q${payload.questao_tec_id} adicionada à fila (${fila.length} pendentes).`);
}

async function processarFilaPendente() {
    const fila = await obterFila();
    if (fila.length === 0) return;
    console.log(`🔄 MonitorPro: Reenviando ${fila.length} questão(ões) pendente(s)...`);
    const filaNova = [];
    for (const payload of fila) {
        const sucesso = await enviarParaSupabase(payload, false);
        if (!sucesso) filaNova.push(payload);
    }
    await salvarFila(filaNova);
    if (filaNova.length < fila.length) {
        console.log(`✅ MonitorPro: ${fila.length - filaNova.length} questão(ões) pendente(s) reenviada(s).`);
    }
}

// ─── ENVIO AO SUPABASE ───────────────────────────────────────────────────────
async function enviarParaSupabase(payload, comRetry = true) {
    try {
        // 1. Verifica se a questão já existe em 'questoes'
        let questaoId = null;
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes?questao_tec_id=eq.${payload.questao_tec_id}&select=id`, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (checkRes.ok) {
            const data = await checkRes.json();
            if (data && data.length > 0) {
                questaoId = data[0].id;
            }
        }

        // 2. Se não existir, insere em 'questoes'
        if (!questaoId) {
            const questaoPayload = {
                questao_tec_id: payload.questao_tec_id,
                materia: payload.materia,
                assunto: payload.assunto,
                banca_texto: payload.banca_texto,
                orgao: payload.orgao,
                concurso: payload.concurso,
                prova: payload.prova,
                ano: payload.ano,
                caderno_nome: payload.caderno_nome,
                enunciado: payload.enunciado,
                gabarito: payload.gabarito,
                alternativas: payload.alternativas,
                resolucao_professor: payload.resolucao_professor
            };

            const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                body: JSON.stringify(questaoPayload)
            });

            if (insertRes.ok) {
                const data = await insertRes.json();
                if (data && data.length > 0) {
                    questaoId = data[0].id;
                }
            } else {
                const errText = await insertRes.text().catch(() => insertRes.statusText);
                console.error("❌ MonitorPro: Erro ao inserir questão em 'questoes':", errText);
                
                // Fallback caso a coluna 'resolucao_professor' não exista no banco ainda
                if (insertRes.status === 400 && questaoPayload.hasOwnProperty('resolucao_professor')) {
                    delete questaoPayload.resolucao_professor;
                    const retryRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes`, {
                        method: "POST",
                        headers: {
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                            "Content-Type": "application/json",
                            "Prefer": "return=representation"
                        },
                        body: JSON.stringify(questaoPayload)
                    });
                    if (retryRes.ok) {
                        const data = await retryRes.json();
                        if (data && data.length > 0) {
                            questaoId = data[0].id;
                        }
                    }
                }
                
                // Se falhou por conflito (chave duplicada devido a condição de corrida), tenta buscar o ID novamente
                if (!questaoId) {
                    const checkRes2 = await fetch(`${SUPABASE_URL}/rest/v1/questoes?questao_tec_id=eq.${payload.questao_tec_id}&select=id`, {
                        method: "GET",
                        headers: {
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    });
                    if (checkRes2.ok) {
                        const data = await checkRes2.json();
                        if (data && data.length > 0) {
                            questaoId = data[0].id;
                        }
                    }
                }
            }
        }

        if (!questaoId) {
            console.error("❌ MonitorPro: Não foi possível obter ou criar a questão na tabela 'questoes'.");
            if (comRetry) await adicionarNaFila(payload);
            return false;
        }

        // 2.5 Verifica se já existe uma tentativa recente idêntica para evitar duplicações por reload/navegação SPA
        try {
            const checkHistRes = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes?questao_id=eq.${questaoId}&order=data_resolucao.desc&limit=1`, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            if (checkHistRes.ok) {
                const histData = await checkHistRes.json();
                if (histData && histData.length > 0) {
                    const ultimaTentativa = histData[0];
                    const diffMs = Date.now() - new Date(ultimaTentativa.data_resolucao).getTime();
                    
                    // Se a última alternativa e resultado forem iguais e ocorreu nos últimos 5 minutos, bloqueia inserção duplicada
                    if (
                        ultimaTentativa.alternativa === payload.alternativa &&
                        ultimaTentativa.acertou === payload.acertou &&
                        diffMs < 5 * 60 * 1000 // 5 minutos
                    ) {
                        console.log(`🚫 MonitorPro: Tentativa idêntica recente para Q${payload.questao_tec_id} já cadastrada há ${Math.round(diffMs/1000)}s. Ignorando inserção duplicada.`);
                        return true; // Retorna true para evitar colocar na fila de retry
                    }
                }
            }
        } catch (errCheck) {
            console.warn("⚠️ MonitorPro: Falha ao checar duplicatas (prosseguindo mesmo assim):", errCheck);
        }

        // 3. Insere a tentativa em 'historico_resolucoes'
        const historicoPayload = {
            questao_id: questaoId,
            questao_tec_id: payload.questao_tec_id,
            alternativa: payload.alternativa,
            acertou: payload.acertou,
            tempo_segundos: payload.tempo_segundos,
            data_resolucao: payload.data_resolucao || new Date().toISOString()
        };

        const histResponse = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(historicoPayload)
        });

        if (histResponse.ok) {
            console.log(`✅ MonitorPro: Q${payload.questao_tec_id} salva com sucesso no histórico relacional! [${payload.materia}] ${payload.acertou ? '🟢 Acertou' : '🔴 Errou'}`);
            return true;
        } else {
            const errText = await histResponse.text().catch(() => histResponse.statusText);
            console.error("❌ MonitorPro: Erro ao inserir histórico em 'historico_resolucoes':", errText);
            if (comRetry) await adicionarNaFila(payload);
            return false;
        }
    } catch (error) {
        console.error("❌ MonitorPro: Falha de rede:", error.message);
        if (comRetry) await adicionarNaFila(payload);
        return false;
    }
}

// ─── EXTRAÇÃO DE LETRA DA ALTERNATIVA ────────────────────────────────────────
// O TEC usa label com for="alternativa-N" onde N=0→A, 1→B, 2→C, 3→D, 4→E
const MAPA_INDICE_LETRA = { '0': 'A', '1': 'B', '2': 'C', '3': 'D', '4': 'E' };

function extrairLetraDoLabel(label) {
    if (!label) return null;
    const forAttr = label.getAttribute('for') || '';
    const match = forAttr.match(/alternativa-(\d)$/);
    if (match) {
        return MAPA_INDICE_LETRA[match[1]] || null;
    }
    // Fallback: lê o texto do label (ex: "C", "CERTO", "ERRADO")
    const texto = label.textContent.trim().toUpperCase();
    if (texto === 'CERTO') return 'C';
    if (texto === 'ERRADO') return 'E';
    if (/^[A-E]$/.test(texto)) return texto;
    return null;
}

// ─── PROCESSAMENTO PRINCIPAL ─────────────────────────────────────────────────
function processResolution() {
    try {
        // ── ID da questão ─────────────────────────────────────────────────
        let questaoId = null;
        const inputId = document.querySelector("input[type='hidden'][id-questao]");
        if (inputId?.value) {
            questaoId = inputId.value;
        } else {
            const urlMatch = window.location.pathname.match(/\/questoes\/(\d+)/);
            if (urlMatch) questaoId = urlMatch[1];
        }

        if (!questaoId) return; // Questão ainda não carregada no DOM

        const elementErrou = document.querySelector('.questao-enunciado-resolucao-errou');
        const elementAcertou = document.querySelector('[class*="questao-enunciado-resolucao-acert"]');
        const isResolved = !!(elementErrou || elementAcertou);

        // Se a questão NÃO está resolvida, salvamos que vimos o estado pendente
        if (!isResolved) {
            hasBeenUnresolved = true;
            return;
        }

        // Se a questão já está resolvida, mas NÃO vimos o estado pendente nesta aba/sessão, ignoramos (bloqueia duplicados)
        if (!hasBeenUnresolved) {
            return;
        }

        const acertou = !!elementAcertou;

        // ── Alternativa marcada pelo usuário ──────────────────────────────
        // li[aria-checked="true"] = alternativa que o usuário selecionou
        const liMarcado = document.querySelector('li[aria-checked="true"]');
        const labelMarcado = liMarcado?.querySelector('.questao-enunciado-alternativa-opcao label');
        const alternativaMarcada = extrairLetraDoLabel(labelMarcado);

        if (!alternativaMarcada) return;
        if (lastCapturedQuestion === questaoId) return;
        lastCapturedQuestion = questaoId;

        // ── Gabarito correto ──────────────────────────────────────────────
        // O TEC adiciona a classe "acerto" no <li> da alternativa correta após resolução
        const liCorreto = document.querySelector("li.acerto, li.correcao");
        const labelCorreto = liCorreto?.querySelector('.questao-enunciado-alternativa-opcao label');
        const gabaritoCorreto = extrairLetraDoLabel(labelCorreto);

        // ── Matéria ───────────────────────────────────────────────────────
        // Seletor confirmado no DOM: .questao-cabecalho-informacoes-materia
        let materiaTexto = null;
        const materiaEl = document.querySelector('.questao-cabecalho-informacoes-materia');
        if (materiaEl) {
            materiaTexto = materiaEl.innerText.replace(/Matéria:\s*/i, '').trim() || null;
        }

        // ── Assunto ───────────────────────────────────────────────────────
        let assuntoTexto = null;
        const assuntoEl = document.querySelector('.questao-cabecalho-informacoes-assunto');
        if (assuntoEl) {
            assuntoTexto = assuntoEl.innerText
                .replace(/Assunto:\s*/i, '')
                .replace(/\n/g, ' ')
                .trim() || null;
        }

        // ── Metadados da Questão (Banca, Órgão, Concurso, Prova) ──────────
        let bancaTexto = null;
        let orgaoTexto = null;
        let concursoTexto = null;
        let provaTexto = null;

        const headerLinks = document.querySelectorAll('h1.questao-enunciado-concurso a');
        headerLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent.trim();
            if (!text) return;

            if (href.includes('/bancas/')) {
                bancaTexto = text;
            } else if (href.includes('/orgaos/')) {
                orgaoTexto = text;
            } else if (href.includes('/concursos/')) {
                concursoTexto = text;
            } else if (href.includes('/provas/')) {
                provaTexto = text;
            }
        });

        // ── Fallbacks Inteligentes para Órgão e Prova ─────────────────────
        if (concursoTexto) {
            // Se orgaoTexto for null, tentamos extrair do concursoTexto
            if (!orgaoTexto) {
                const partsHyphen = concursoTexto.split(' - ');
                if (partsHyphen.length >= 3) {
                    orgaoTexto = partsHyphen[1].trim();
                } else {
                    const matchParenteses = concursoTexto.match(/\(([^)]+)\)/);
                    if (matchParenteses) {
                        orgaoTexto = matchParenteses[1].trim();
                    }
                }
            }

            // Se provaTexto for null, tentamos extrair do concursoTexto
            if (!provaTexto) {
                const partsHyphen = concursoTexto.split(' - ');
                if (partsHyphen.length >= 3) {
                    provaTexto = partsHyphen.slice(2).join(' - ').trim();
                } else {
                    let cleanText = concursoTexto.replace(/^\d{4}\s*-\s*/, '').trim();
                    cleanText = cleanText.replace(/\s*\([^)]+\)/g, '').trim();
                    provaTexto = cleanText.split('/').map(s => s.trim()).join(' / ');
                }
            }
        }

        // ── Ano ───────────────────────────────────────────────────────────
        let anoValue = null;
        const headerEl = document.querySelector('h1.questao-enunciado-concurso');
        if (headerEl) {
            const headerText = headerEl.textContent || '';
            const anoMatch = headerText.match(/\b(19\d\d|20\d\d)\b/);
            if (anoMatch) {
                anoValue = parseInt(anoMatch[1], 10);
            }
        }

        // ── Nome do Caderno ───────────────────────────────────────────────
        let cadernoNome = null;
        const cadernoEl = document.querySelector('.caderno-subtitulo-secao-nome .titulo');
        if (cadernoEl) {
            cadernoNome = cadernoEl.textContent.trim() || null;
        }

        // ── Enunciado ─────────────────────────────────────────────────────
        // Confirmado no DOM: div.questao-enunciado-texto.embonitar
        // Contém APENAS o texto da pergunta, sem as alternativas
        let enunciadoTexto = null;
        const enunciadoEl = document.querySelector('.questao-enunciado-texto.embonitar');
        if (enunciadoEl) {
            enunciadoTexto = enunciadoEl.innerText.trim().substring(0, 2000) || null;
        }

        // ── Todas as alternativas da questão ──────────────────────────────
        const alternativas = {};
        const lisAlternativas = document.querySelectorAll('.questao-enunciado-alternativas li');
        lisAlternativas.forEach(li => {
            const labelEl = li.querySelector('.questao-enunciado-alternativa-opcao label');
            const letra = extrairLetraDoLabel(labelEl);
            const textoEl = li.querySelector('.questao-enunciado-alternativa-texto');
            if (letra && textoEl) {
                alternativas[letra] = textoEl.innerText.trim();
            }
        });

        // ── Resolução do Professor ────────────────────────────────────────
        let resolucaoProfessor = null;
        const resolucaoProfEl = document.querySelector(
            '.questao-enunciado-resolucao-professor, .questao-resolucao-professor, .resolucao-professor, .questao-comentario-professor, .comentario-professor, [class*="resolucao-professor"], [class*="comentario-professor"], .comentario-professor-texto'
        );
        if (resolucaoProfEl) {
            resolucaoProfessor = resolucaoProfEl.innerText.trim() || null;
        }

        const tempoGasto = Math.floor((Date.now() - tempoInicio) / 1000);
        console.log(`⏱️ MonitorPro: Tempo calculado para Q${questaoId}: ${tempoGasto}s (Timer iniciado em ${new Date(tempoInicio).toLocaleTimeString()})`);

        const payload = {
            questao_tec_id: parseInt(questaoId, 10),
            alternativa: alternativaMarcada,
            gabarito: gabaritoCorreto,
            acertou,
            materia: materiaTexto,
            assunto: assuntoTexto,
            banca_texto: bancaTexto,
            orgao: orgaoTexto,
            concurso: concursoTexto,
            prova: provaTexto,
            ano: anoValue,
            caderno_nome: cadernoNome,
            enunciado: enunciadoTexto,
            tempo_segundos: tempoGasto,
            data_resolucao: new Date().toISOString(),
            alternativas: alternativas,
            resolucao_professor: resolucaoProfessor
        };

        console.log("🧬 DNA Extraído:", payload);
        enviarParaSupabase(payload);

    } catch (err) {
        console.error("❌ MonitorPro: Erro inesperado:", err);
    }
}

// ─── DETECÇÃO DE MUDANÇA DE QUESTÃO ──────────────────────────────────────────
function verificarMudancaDeQuestao() {
    let questaoId = null;
    const inputId = document.querySelector("input[type='hidden'][id-questao]");
    if (inputId?.value) {
        questaoId = inputId.value;
    } else {
        const urlMatch = window.location.pathname.match(/\/questoes\/(\d+)/);
        if (urlMatch) questaoId = urlMatch[1];
    }

    if (questaoId && questaoId !== lastDisplayedQuestionId) {
        console.log(`🔀 MonitorPro: Mudança de questão detectada de Q${lastDisplayedQuestionId} para Q${questaoId}. Reseta tempoInicio.`);
        lastDisplayedQuestionId = questaoId;
        tempoInicio = Date.now();
        hasBeenUnresolved = false;
        
        // Verifica se a nova questão já inicia não-resolvida
        const elementErrou = document.querySelector('.questao-enunciado-resolucao-errou');
        const elementAcertou = document.querySelector('[class*="questao-enunciado-resolucao-acert"]');
        const isResolved = !!(elementErrou || elementAcertou);
        if (!isResolved) {
            hasBeenUnresolved = true;
        }
    }
}

// ─── DETECÇÃO DE NAVEGAÇÃO SPA ───────────────────────────────────────────────
function verificarMudancaDeUrl() {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastCapturedQuestion = null;
        tempoInicio = Date.now();
        hasBeenUnresolved = false;
        console.log("🔀 MonitorPro: Nova URL — estado resetado.");
    }
}

// ─── OBSERVER COM DEBOUNCE ───────────────────────────────────────────────────
const observer = new MutationObserver(() => {
    verificarMudancaDeQuestao();
    verificarMudancaDeUrl();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processResolution, 300);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-checked']
});

    // ─── REENVIO DE PENDENTES E INICIALIZAÇÃO ───────────────────────────────────
    verificarMudancaDeQuestao();
    setTimeout(processarFilaPendente, 3000);
})();
