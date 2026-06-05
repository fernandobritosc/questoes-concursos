/**
 * Lista todas as policies RLS existentes nas tabelas do schema public
 */
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";

// We can use the Supabase REST API to inspect via rpc if available
// Let's just try to list policies using pg_policies view via rpc
async function run() {
  // Try to query pg_policies via the PostgREST API - this typically requires service_role key
  // Instead, let's just test each operation on each table

  const tables = ['questoes', 'historico_resolucoes', 'profiles'];
  const operations = ['GET', 'POST', 'PATCH', 'DELETE'];

  for (const table of tables) {
    console.log(`\n=== Tabela: ${table} ===`);
    for (const method of operations) {
      let url = `${SUPABASE_URL}/rest/v1/${table}`;
      let opts = {
        method,
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      };

      if (method === 'GET') {
        url += '?select=id&limit=1';
      } else if (method === 'POST') {
        url += '';
        opts.headers["Prefer"] = "return=minimal";
        opts.body = JSON.stringify({ _test: true }); // Will fail but shows permission
      } else if (method === 'PATCH') {
        url += '?id=eq.0';
        opts.body = JSON.stringify({ id: 0 });
      } else if (method === 'DELETE') {
        url += '?id=eq.0';
      }

      try {
        const res = await fetch(url, opts);
        const body = await res.text();
        const short = body.substring(0, 120);
        const isRLS = body.includes('row-level security') || res.status === 401;
        const icon = res.ok ? '✅' : (isRLS ? '🔒 RLS' : '⚠️');
        console.log(`  ${method}: ${res.status} ${icon} ${short}`);
      } catch (e) {
        console.log(`  ${method}: ERROR ${e.message}`);
      }
    }
  }
}

run();
