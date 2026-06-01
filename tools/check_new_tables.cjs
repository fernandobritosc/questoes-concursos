const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

// Mapeador idêntico ao supabase.service.ts
function mapHistoricoToView(h) {
  const q = h.questao ?? {};
  return {
    id: h.id,
    questao_id: h.questao_id,
    questao_tec_id: h.questao_tec_id,
    alternativa: h.alternativa,
    acertou: h.acertou,
    tempo_segundos: h.tempo_segundos ?? 0,
    data_resolucao: h.data_resolucao,
    materia: q.materia ?? null,
    assunto: q.assunto ?? null,
    banca_texto: q.banca_texto ?? null,
    enunciado: q.enunciado ?? null
  };
}

async function run() {
  const { data, error } = await supabase
    .from('historico_resolucoes')
    .select(`
      id,
      questao_id,
      questao_tec_id,
      alternativa,
      acertou,
      tempo_segundos,
      data_resolucao,
      questao:questoes!historico_resolucoes_questao_id_fkey (
        id,
        questao_tec_id,
        materia,
        assunto,
        banca_texto,
        enunciado
      )
    `)
    .eq('acertou', false)
    .not('alternativa', 'is', null)
    .neq('alternativa', '')
    .order('data_resolucao', { ascending: false });

  if (error) {
    console.error("Fetch failed:", error);
    return;
  }

  const erros = (data || []).map(mapHistoricoToView);
  console.log("Total errors fetched:", erros.length);

  // Run the filter logic exactly as in Revisao.tsx
  const materiaFiltro = "Direito Processual do Trabalho";
  const busca = "";

  const errosFiltrados = erros.filter(e => {
    const matchesMateria = !materiaFiltro || e.materia === materiaFiltro;
    
    const textoBusca = busca.toLowerCase().trim();
    const matchesTexto = !textoBusca || 
      (e.enunciado && e.enunciado.toLowerCase().includes(textoBusca)) ||
      (e.questao_tec_id && String(e.questao_tec_id).includes(textoBusca)) ||
      (e.assunto && e.assunto.toLowerCase().includes(textoBusca)) ||
      (e.banca_texto && e.banca_texto.toLowerCase().includes(textoBusca));

    return matchesMateria && matchesTexto;
  });

  console.log(`Filtered errors for '${materiaFiltro}':`, errosFiltrados.length);
  console.log("Filtered errors list questao_tec_ids:", errosFiltrados.map(e => `${e.questao_tec_id} (${e.materia})`));

  console.log("All unique materias in errors:", Array.from(new Set(erros.map(e => e.materia))));
}
run();
