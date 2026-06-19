import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data: metas, count: metaCount } = await supabase
  .from('metas_concurso')
  .select('id, titulo, semana_numero', { count: 'exact', head: false })

console.log('Metas:', metaCount)
if (metas) console.log(metas)

const { data: tarefas, count: tarefaCount } = await supabase
  .from('tarefas_meta')
  .select('id, disciplina, assunto', { count: 'exact', head: false })
  .limit(10)

console.log('\nTarefas:', tarefaCount)
if (tarefas) console.log(tarefas)
