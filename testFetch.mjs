import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pygpeoqisaivxotxlpku.supabase.co',
  'sb_publishable_lA1BQv1M-59YOeWfFIqcUw_CE77WSkh'
);

async function run() {
  const { data, error } = await supabase
    .from('partidos')
    .select(`id, fase_bracket, bracket_index, fecha_hora, sede_id, estado, participante_1_id, participante_2_id,
      p1:participantes!participante_1_id(nombre_mostrado),
      p2:participantes!participante_2_id(nombre_mostrado),
      sedes(nombre)
    `)
    .not('fase_bracket', 'is', null)
    .neq('fase_bracket', 'Fase de Grupos');
    
  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
