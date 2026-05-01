-- Script para agregar columnas necesarias para la auto-progresión del bracket

DO $$
BEGIN
    -- Indica el ID del partido al cual el ganador avanzará
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='siguiente_partido_id') THEN
        ALTER TABLE public.partidos ADD COLUMN siguiente_partido_id UUID REFERENCES public.partidos(id);
    END IF;

    -- Indica si este ganador será el participante_1 (1) o participante_2 (2) en el siguiente partido
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='posicion_siguiente_partido') THEN
        ALTER TABLE public.partidos ADD COLUMN posicion_siguiente_partido INT;
    END IF;

    -- Índice para ordenar los partidos en el layout del bracket (0, 1, 2, 3...)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='bracket_index') THEN
        ALTER TABLE public.partidos ADD COLUMN bracket_index INT;
    END IF;
END $$;
