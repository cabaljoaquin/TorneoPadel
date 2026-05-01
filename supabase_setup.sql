-- =========================================================================
-- TORNEO TENIS - SCRIPT DE ACTUALIZACIÓN DE BASE DE DATOS (FASE CORE)
-- Ejecutá esto en el "SQL Editor" de Supabase.
-- =========================================================================

-- 1. Tabla de Torneos
CREATE TABLE IF NOT EXISTS public.torneos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    sede_id UUID REFERENCES public.sedes(id),
    estado TEXT DEFAULT 'En curso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Zonas (Grupos)
CREATE TABLE IF NOT EXISTS public.zonas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID NOT NULL REFERENCES public.torneos(id),
    categoria_id UUID NOT NULL REFERENCES public.categorias(id),
    nombre TEXT NOT NULL, -- ej: "Zona A"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla Relacional Participantes <-> Zonas
CREATE TABLE IF NOT EXISTS public.participantes_zonas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zona_id UUID NOT NULL REFERENCES public.zonas(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
    puntos INT DEFAULT 0,
    partidos_jugados INT DEFAULT 0,
    sets_a_favor INT DEFAULT 0,
    sets_en_contra INT DEFAULT 0,
    UNIQUE(zona_id, participante_id)
);

-- 4. Modificaciones a la tabla `partidos` existente
-- (Asumimos que ya existe. Si falta alguno de estos campos en tu DB, alterarán la tabla).
DO $$
BEGIN
    -- Añadir columna de torneo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='torneo_id') THEN
        ALTER TABLE public.partidos ADD COLUMN torneo_id UUID REFERENCES public.torneos(id);
    END IF;

    -- Añadir columna de zona (si es un partido de fase de grupos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='zona_id') THEN
        ALTER TABLE public.partidos ADD COLUMN zona_id UUID REFERENCES public.zonas(id);
    END IF;

    -- Añadir columna de fase (si es un partido eliminatorio)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='fase_bracket') THEN
        ALTER TABLE public.partidos ADD COLUMN fase_bracket TEXT; -- ej: 'cuartos', 'semis', 'final'
    END IF;

    -- Añadir columna para enlazar al siguiente partido en el Bracket
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidos' AND column_name='siguiente_partido_id') THEN
        ALTER TABLE public.partidos ADD COLUMN siguiente_partido_id UUID REFERENCES public.partidos(id);
    END IF;
END $$;
