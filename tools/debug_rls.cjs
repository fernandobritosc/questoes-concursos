/**
 * Script de diagnóstico para testar inserção no Supabase
 * Testa inserção anônima e com credenciais na tabela questoes e historico_resolucoes
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";

async function run() {
  console.log("=== DIAGNÓSTICO DE RLS E INSERÇÃO ===\n");

  // 1. Testa leitura anônima
  console.log("--- 1. Testando LEITURA anônima de 'questoes' ---");
  const readQRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes?select=id,questao_tec_id&limit=3`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  console.log(`  Status: ${readQRes.status} ${readQRes.statusText}`);
  const readQData = await readQRes.json();
  console.log(`  Dados: ${JSON.stringify(readQData).substring(0, 200)}`);
  console.log(`  Resultado: ${readQRes.ok ? '✅ OK' : '❌ BLOQUEADO'}\n`);

  // 2. Testa leitura anônima de historico_resolucoes
  console.log("--- 2. Testando LEITURA anônima de 'historico_resolucoes' ---");
  const readHRes = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes?select=id,questao_tec_id&limit=3`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  console.log(`  Status: ${readHRes.status} ${readHRes.statusText}`);
  const readHData = await readHRes.json();
  console.log(`  Dados: ${JSON.stringify(readHData).substring(0, 200)}`);
  console.log(`  Resultado: ${readHRes.ok ? '✅ OK' : '❌ BLOQUEADO'}\n`);

  // 3. Testa INSERT anônimo em 'questoes' (com questao_tec_id de teste)
  console.log("--- 3. Testando INSERT anônimo em 'questoes' ---");
  const testQuestao = {
    questao_tec_id: 999999999,
    materia: "__TESTE_DIAGNOSTICO__",
    assunto: "Teste de RLS"
  };
  const insertQRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(testQuestao)
  });
  console.log(`  Status: ${insertQRes.status} ${insertQRes.statusText}`);
  const insertQBody = await insertQRes.text();
  console.log(`  Resposta: ${insertQBody.substring(0, 300)}`);
  console.log(`  Resultado: ${insertQRes.ok ? '✅ OK - INSERT ANÔNIMO FUNCIONA' : '❌ BLOQUEADO - RLS está ativo!'}\n`);

  // 4. Se a questão foi inserida, tenta INSERT anônimo em 'historico_resolucoes'
  let questaoId = null;
  if (insertQRes.ok) {
    try {
      const d = JSON.parse(insertQBody);
      questaoId = d?.[0]?.id || d?.id;
    } catch (e) {}
  }

  // Se não conseguiu inserir, tenta buscar uma questão existente para testar o historico
  if (!questaoId) {
    const findRes = await fetch(`${SUPABASE_URL}/rest/v1/questoes?select=id&limit=1`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (findRes.ok) {
      const findData = await findRes.json();
      if (findData?.length > 0) questaoId = findData[0].id;
    }
  }

  if (questaoId) {
    console.log(`--- 4. Testando INSERT anônimo em 'historico_resolucoes' (questao_id=${questaoId}) ---`);
    const testHistorico = {
      questao_id: questaoId,
      questao_tec_id: 999999999,
      alternativa: "X",
      acertou: false,
      tempo_segundos: 1,
      data_resolucao: new Date().toISOString()
    };
    const insertHRes = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(testHistorico)
    });
    console.log(`  Status: ${insertHRes.status} ${insertHRes.statusText}`);
    const insertHBody = await insertHRes.text();
    console.log(`  Resposta: ${insertHBody.substring(0, 300)}`);
    console.log(`  Resultado: ${insertHRes.ok ? '✅ OK - INSERT ANÔNIMO FUNCIONA' : '❌ BLOQUEADO - RLS está ativo!'}\n`);
  } else {
    console.log("--- 4. SKIP: Não foi possível obter um questao_id para testar 'historico_resolucoes' ---\n");
  }

  // 5. Verifica se RLS está habilitado usando a API de info
  console.log("--- 5. Resumo do Diagnóstico ---");
  console.log(`  Insert em 'questoes' com anon key: ${insertQRes.ok ? '✅ Funciona' : '❌ Bloqueado (status ' + insertQRes.status + ')'}`);
  
  if (!insertQRes.ok && (insertQRes.status === 403 || insertQRes.status === 401)) {
    console.log("\n  ⚠️ DIAGNÓSTICO: RLS está habilitado e bloqueando inserções anônimas.");
    console.log("  SOLUÇÃO: Você precisa criar políticas RLS que permitam INSERT ou desabilitar RLS nas tabelas.");
    console.log("  Execute no Supabase SQL Editor:\n");
    console.log(`  -- Opção A: Desabilitar RLS (mais simples, para projetos pessoais)`);
    console.log(`  ALTER TABLE questoes DISABLE ROW LEVEL SECURITY;`);
    console.log(`  ALTER TABLE historico_resolucoes DISABLE ROW LEVEL SECURITY;\n`);
    console.log(`  -- Opção B: Criar policies permissivas (para acesso anônimo + autenticado)`);
    console.log(`  CREATE POLICY "Permitir insert anon/auth em questoes" ON questoes FOR INSERT TO anon, authenticated WITH CHECK (true);`);
    console.log(`  CREATE POLICY "Permitir select anon/auth em questoes" ON questoes FOR SELECT TO anon, authenticated USING (true);`);
    console.log(`  CREATE POLICY "Permitir insert anon/auth em historico" ON historico_resolucoes FOR INSERT TO anon, authenticated WITH CHECK (true);`);
    console.log(`  CREATE POLICY "Permitir select anon/auth em historico" ON historico_resolucoes FOR SELECT TO anon, authenticated USING (true);`);
  }

  // 6. Limpa dados de teste
  console.log("\n--- 6. Limpando dados de teste ---");
  const delH = await fetch(`${SUPABASE_URL}/rest/v1/historico_resolucoes?questao_tec_id=eq.999999999`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  console.log(`  Delete historico teste: ${delH.status}`);
  
  const delQ = await fetch(`${SUPABASE_URL}/rest/v1/questoes?questao_tec_id=eq.999999999`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  console.log(`  Delete questao teste: ${delQ.status}`);
}

run().catch(err => console.error("Erro fatal:", err));
