import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pygpeoqisaivxotxlpku.supabase.co',
  'sb_publishable_lA1BQv1M-59YOeWfFIqcUw_CE77WSkh'
);

async function run() {
  const { data, error } = await supabase
    .from('partidos')
    .select(`id, torneo_id, categoria_id, fase_bracket, bracket_index, p1:participantes!participante_1_id(nombre_mostrado)`)
    .not('fase_bracket', 'is', null)
    .neq('fase_bracket', 'Fase de Grupos')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
