const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

async function run() {
  console.log("=== QUESTÕES MAIS RECENTES ===");
  const { data: qs, error: qErr } = await supabase
    .from('questoes')
    .select('id, questao_tec_id, materia, assunto, resolucao_professor')
    .order('id', { ascending: false })
    .limit(5);

  if (qErr) {
    console.error("Erro ao buscar questões:", qErr);
  } else {
    console.log(qs.map(q => ({
      db_id: q.id,
      questao_tec_id: q.questao_tec_id,
      materia: q.materia,
      assunto: q.assunto,
      resolucao_professor: q.resolucao_professor ? (q.resolucao_professor.substring(0, 50) + "...") : null
    })));
  }

  console.log("\n=== TENTATIVAS (HISTÓRICO) MAIS RECENTES ===");
  const { data: hs, error: hErr } = await supabase
    .from('historico_resolucoes')
    .select('id, questao_id, questao_tec_id, alternativa, acertou, user_id, data_resolucao')
    .order('data_resolucao', { ascending: false })
    .limit(5);

  if (hErr) {
    console.error("Erro ao buscar histórico:", hErr);
  } else {
    console.log(hs);
  }
}
run();
