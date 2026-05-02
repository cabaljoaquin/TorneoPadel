-- =========================================================================
-- TORNEO PADEL - SCRIPT COMPLETO DE CREACIÓN DE BASE DE DATOS
-- Ejecutá esto en el "SQL Editor" de tu nuevo proyecto de Supabase.
-- =========================================================================

-- 1. Tablas Base
CREATE TABLE IF NOT EXISTS public.sedes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL DEFAULT '',
    apellido TEXT NOT NULL DEFAULT '',
    nombre_mostrado TEXT NOT NULL, -- Ej: "J. Perez"
    categoria_fija_id UUID REFERENCES public.categorias(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Torneos
CREATE TABLE IF NOT EXISTS public.torneos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE,
    modalidad TEXT DEFAULT 'doble',
    formato TEXT DEFAULT 'grupos',
    visible BOOLEAN DEFAULT true,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    sede_id UUID REFERENCES public.sedes(id),
    admin_id UUID NOT NULL, -- UUID de auth.users (el creador)
    estado TEXT DEFAULT 'En curso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Zonas (Grupos)
CREATE TABLE IF NOT EXISTS public.zonas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id),
    nombre TEXT NOT NULL, -- ej: "Zona A"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Partidos
CREATE TABLE IF NOT EXISTS public.partidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID REFERENCES public.torneos(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias(id),
    zona_id UUID REFERENCES public.zonas(id) ON DELETE CASCADE,
    fase_bracket TEXT, -- ej: 'Cuartos de Final', 'Semifinal', 'Final'
    bracket_index INT,
    fecha_hora TIMESTAMP WITH TIME ZONE,
    estado TEXT DEFAULT 'pendiente',
    resultado JSONB,
    ganador_id UUID REFERENCES public.participantes(id),
    participante_1_id UUID REFERENCES public.participantes(id),
    participante_2_id UUID REFERENCES public.participantes(id),
    siguiente_partido_id UUID REFERENCES public.partidos(id),
    posicion_siguiente_partido INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Relaciones y Tablas Intermedias

-- Participantes <-> Zonas
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

-- Inscripciones
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id),
    pago_confirmado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(torneo_id, participante_id)
);

-- Configuración Llave (Playoffs)
CREATE TABLE IF NOT EXISTS public.configuracion_llave (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    torneo_id UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id),
    fase TEXT NOT NULL,
    match_index INT NOT NULL,
    origen_p1 TEXT NOT NULL,
    origen_p2 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(torneo_id, categoria_id, fase, match_index)
);

-- =========================================================================
-- CONFIGURACIÓN DE SEGURIDAD BÁSICA (RLS)
-- Opcional, pero recomendado: Permitir lectura pública de torneos y partidos.
-- Las escrituras se limitan al admin (o se manejan desde el servidor/API).
-- =========================================================================
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de torneos" ON public.torneos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de partidos" ON public.partidos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de zonas" ON public.zonas FOR SELECT USING (true);
CREATE POLICY "Lectura pública de participantes" ON public.participantes FOR SELECT USING (true);
CREATE POLICY "Lectura pública de categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Lectura pública de sedes" ON public.sedes FOR SELECT USING (true);

-- =========================================================================
-- DATOS INICIALES POR DEFECTO (OPCIONAL)
-- =========================================================================
-- INSERT INTO public.categorias (nombre) VALUES ('1ra Libre'), ('2da Libre'), ('3ra Libre'), ('4ta Libre'), ('5ta Libre'), ('6ta Libre'), ('7ma Libre');
-- INSERT INTO public.sedes (nombre) VALUES ('Club Padel Central');
