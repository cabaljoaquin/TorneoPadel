-- =========================================================================
-- TORNEO TENIS - ACTUALIZACIÓN SQL: INSCRIPCIONES Y PARTICIPANTES
-- Ejecutá esto en el "SQL Editor" de Supabase.
-- =========================================================================

-- 1. Asegurar que la tabla Participantes exista y tenga la estructura correcta
CREATE TABLE IF NOT EXISTS public.participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    nombre_mostrado TEXT NOT NULL, -- Ej: "J. Perez" (generado en el front)
    categoria_fija_id UUID REFERENCES public.categorias(id), -- Opcional, categoría base habitual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existía, nos aseguramos de que tenga 'nombre' y 'apellido' separados.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participantes' AND column_name='nombre') THEN
        ALTER TABLE public.participantes ADD COLUMN nombre TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participantes' AND column_name='apellido') THEN
        ALTER TABLE public.participantes ADD COLUMN apellido TEXT DEFAULT '';
    END IF;
END $$;

-- 2. Tabla de Inscripciones (Para saber quién juega ESTE torneo, antes de armar Zonas)
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id),
    pago_confirmado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(torneo_id, participante_id)
);
