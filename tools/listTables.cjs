const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

async function run() {
  console.log("Checking common tables directly...");
  const tables = ['questoes', 'historico_resolucoes', 'profiles', 'perfil', 'mentor_plano', 'spaced_repetition', 'configuracoes', 'perfis_usuario'];
  for (const t of tables) {
    try {
      const { data: cols, error: err } = await supabase.from(t).select('*').limit(1);
      if (err) {
        console.log(`Table '${t}' does not exist or error:`, err.message);
      } else {
        console.log(`Table '${t}' exists! Sample row keys:`, cols && cols.length > 0 ? Object.keys(cols[0]) : "empty");
      }
    } catch (e) {
      console.log(`Table '${t}' threw error:`, e.message);
    }
  }
}
run();
