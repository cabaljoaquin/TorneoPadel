-- =========================================================================
-- TORNEO TENIS - FASE ELIMINATORIA: CONFIGURACIÓN DE LLAVE
-- Ejecutá esto en el "SQL Editor" de Supabase.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.configuracion_llave (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  torneo_id     UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
  categoria_id  UUID NOT NULL REFERENCES public.categorias(id),
  fase          TEXT NOT NULL,        -- ej: 'Cuartos de Final', 'Semifinal', 'Final'
  match_index   INT  NOT NULL,        -- orden del partido en la fase (0-based)
  origen_p1     TEXT NOT NULL,        -- ej: '1ro Zona A'
  origen_p2     TEXT NOT NULL,        -- ej: '2do Zona B'
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(torneo_id, categoria_id, fase, match_index)
);
