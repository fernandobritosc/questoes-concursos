const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

async function run() {
  const { data, error } = await supabase
    .from('resolucoes')
    .select('id, questao_tec_id, materia, assunto, caderno_nome');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Total rows in database:", data.length);
  
  // Find all rows where questao_tec_id contains 'Q'
  const rowsWithQ = data.filter(r => {
    const idStr = String(r.questao_tec_id);
    return idStr.toUpperCase().includes('Q');
  });

  console.log("Rows with 'Q' in questao_tec_id:", rowsWithQ.length);
  if (rowsWithQ.length > 0) {
    console.log("Sample rows with 'Q':", rowsWithQ.slice(0, 10));
  } else {
    console.log("No rows have 'Q' in questao_tec_id.");
  }

  // Print all distinct typeof questao_tec_id
  const types = new Set(data.map(r => typeof r.questao_tec_id));
  console.log("Data types of questao_tec_id:", Array.from(types));

  // Let's print some sample IDs
  console.log("Sample IDs:", data.map(r => r.questao_tec_id).slice(0, 10));
}
run();

