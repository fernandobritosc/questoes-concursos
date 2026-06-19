import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase
  .from('tarefas_meta')
  .select('id, disciplina, assunto, meta_id', { count: 'exact' })
  .is('assunto', null)

if (error) {
  console.error('Erro:', error.message)
  process.exit(1)
}

console.log(`Total de tarefas SEM assunto: ${data.length}`)
if (data.length > 0) {
  const discSet = new Set(data.map(t => t.disciplina))
  console.log(`Disciplinas envolvidas: ${[...discSet].join(', ')}`)
  console.log('Amostra (primeiras 5):', data.slice(0, 5))
}

const { count: total } = await supabase
  .from('tarefas_meta')
  .select('*', { count: 'exact', head: true })

console.log(`\nTotal de tarefas no banco: ${total}`)
