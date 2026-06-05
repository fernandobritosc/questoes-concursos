/**
 * Teste REAL de inserção no Supabase com dados válidos
 */
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";

async function run() {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };

  // 1. Inserir questão com payload REAL (igual ao content.js)
  console.log("--- 1. INSERT em 'questoes' com payload real ---");
  const questaoPayload = {
    questao_tec_id: 888888888,
    materia: "__TESTE_RLS_REAL__",
    assunto: "Teste de diagnóstico",
    banca_texto: "TESTE",
    orgao: "TESTE",
    concurso: "TESTE",
    prova: "TESTE",
    ano: 2024,
    caderno_nome: null,
    enunciado: "Questão de teste para verificar RLS",
    gabarito: "A",
    alternativas: { A: "Opção A", B: "Opção B" }
  };

  const insertQRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes`, {
    method: "POST",
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(questaoPayload)
  });
  const insertQBody = await insertQRes.text();
  console.log(`  Status: ${insertQRes.status}`);
  console.log(`  Resposta: ${insertQBody.substring(0, 500)}`);
  
  let questaoId = null;
  if (insertQRes.ok) {
    try { questaoId = JSON.parse(insertQBody)?.[0]?.id; } catch(e) {}
    console.log(`  ✅ Inserção anônima OK! questao_id=${questaoId}`);
  } else {
    console.log(`  ❌ Inserção falhou!`);
    
    // Tentar buscar alguma questão existente
    const findRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes?select=id&limit=1`, { headers });
    if (findRes.ok) {
      const d = await findRes.json();
      if (d.length > 0) {
        questaoId = d[0].id;
        console.log(`  Usando questão existente: ${questaoId}`);
      } else {
        console.log("  ⚠️ Nenhuma questão encontrada no banco!");
      }
    }
  }

  if (questaoId) {
    // 2. Inserir histórico
    console.log("\n--- 2. INSERT em 'historico_resolucoes' com payload real ---");
    const histPayload = {
      questao_id: questaoId,
      questao_tec_id: 888888888,
      alternativa: "B",
      acertou: false,
      tempo_segundos: 42,
      data_resolucao: new Date().toISOString()
    };
    
    const insertHRes = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify(histPayload)
    });
    const insertHBody = await insertHRes.text();
    console.log(`  Status: ${insertHRes.status}`);
    console.log(`  Resposta: ${insertHBody.substring(0, 500)}`);
    console.log(`  ${insertHRes.ok ? '✅ Inserção anônima OK!' : '❌ Inserção falhou!'}`);
    
    // 2b. Inserir histórico COM user_id (como a extensão faz quando tem sessão)
    console.log("\n--- 2b. INSERT em 'historico_resolucoes' COM user_id ---");
    const histPayload2 = {
      ...histPayload,
      user_id: "35e75e58-1d85-4149-b738-233cec14ab38",
      data_resolucao: new Date().toISOString()
    };
    
    const insertH2Res = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify(histPayload2)
    });
    const insertH2Body = await insertH2Res.text();
    console.log(`  Status: ${insertH2Res.status}`);
    console.log(`  Resposta: ${insertH2Body.substring(0, 500)}`);
    console.log(`  ${insertH2Res.ok ? '✅ OK!' : '❌ Falhou!'}`);
  }

  // 3. Limpar
  console.log("\n--- 3. Limpeza ---");
  await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes?questao_tec_id=eq.888888888`, {
    method: "DELETE", headers
  });
  await fetch(`${SUPABASE_URL}/rest/v1/questoes?questao_tec_id=eq.888888888`, {
    method: "DELETE", headers
  });
  console.log("  Dados de teste removidos.\n");
  
  // 4. Verificar quantas questões existem no banco
  console.log("--- 4. Estado atual do banco ---");
  const countQ = await fetch(`${SUPABASE_URL}/rest/v1/questoes?select=id`, { 
    headers: { ...headers, "Prefer": "count=exact" }
  });
  const countQHeader = countQ.headers.get('content-range');
  const countQData = await countQ.json();
  console.log(`  Questões: ${countQData.length} (content-range: ${countQHeader})`);
  
  const countH = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes?select=id`, { 
    headers: { ...headers, "Prefer": "count=exact" }
  });
  const countHData = await countH.json();
  const countHHeader = countH.headers.get('content-range');
  console.log(`  Histórico: ${countHData.length} (content-range: ${countHHeader})`);
}

run().catch(console.error);
