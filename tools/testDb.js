const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

async function test() {
  const { data, error } = await supabase.from('resolucoes').select('*').limit(1);
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Success! Full row:", data[0]);
  }
}
test();
