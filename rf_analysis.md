# Análisis de Requerimientos Funcionales (RF)

A continuación te presento la matriz del estado actual de tu lista y mis notas arquitectónicas.

### 1. Módulo de Autenticación y Seguridad
- 🟢 **RF-1.1 (Login)**:  Completado. Funciona con Supabase Auth (Email/Clave). Vos crearías los usuarios admin desde el panel de Supabase y les das la clave.
- 🟢 **RF-1.2 (Bloqueo /admin)**: Completado. El archivo `middleware.ts` defiende la ruta.
- 🟢 **RF-1.3 (Sesión Activa)**: Completado. Funciona nativamente por *Cookies*.

### 2. Módulo de Configuración (Panel Admin)
- 🟡 **RF-2.1 (Sedes)**: Parcial. Tenemos el formulario de "Alta rápida", pero nos falta armar la tabla debajo (como hicimos en inscripciones) para ver el Listado y agregar botones de "Editar" y "Eliminar".
- 🟡 **RF-2.2 (Categorías)**: Parcial. Misma situación que las Sedes. Faltan los botones de edición.

### 3. Módulo de Inscripciones (Panel Admin)
- 🟢 **RF-3.1 (Alta Participantes / Parejas)**: Casi Completo. Actualmente permite nombres. Si el torneo es de dobles, el profe puede anotar `Nombre: J. Perez / M. Gomez` y funciona, pero quizás podríamos agregar un *checkbox* "Es pareja" a futuro si queremos estadísticas separadas.
- 🟢 **RF-3.2 (Buscador Autocomplete)**: Completado.

### 4. Módulo de Gestión de Partidos (Panel Admin)
- 🟡 **RF-4.1 (Dashboard y Filtros)**: Parcial. Tenemos el panel, lista los partidos pendientes, pero falta agregarle los menús desplegables arriba para "Filtrar por Sede" y "Filtrar por Categoría".
- 🟢 **RF-4.2 (Input de Parser Rápido)**: Completado.
- 🟢 **RF-4.3 (Interpretación en desenfoque)**: Completado.
- 🔴 **RF-4.4 (Modificación Manual General)**: Faltante. Es un requerimiento gigante. Necesitamos un sub-módulo donde el Admin toque una llave ya armada y pueda forzar reemplazar a un jugador, corregir un resultado previo, deshacer un "Walkover", etc.

### 5. Módulo de Visualización Pública
- 🟢 **RF-5.1 (URL Pública)**: Completado (`/torneo/[id]`). Nos faltaría armar la página inicial base (`/`) que te redirija al torneo activo.
- 🟢 **RF-5.2 (Navegación por Pestañas)**: Completado.
- 🔴 **RF-5.3 (Últimos resultados)**: Faltante. No tenemos una lista del estilo "Partidos recién finalizados". Es buena idea agregar un *feed* tipo Twitter arriba del bracket.
- 🟢 **RF-5.4 y RF-5.5 (Brackets visual c/ Scroll)**: Completado.

### 6. Motor de Datos y Automatización
- 🔴 **RF-6.1 (Actualización Automática y Tablas)**: Faltante Urgente/Crítico. Este es el núcleo de cálculo que te comenté ayer. Actualmente el resultado se guarda, pero **todavía no empuja** al ganador a la siguiente cajita de la llave ni suma puntos a la tabla de zonas. 

---
### 💡 Recomendaciones del Arquitecto

Tu lista cubre todo lo necesario para un SaaS deportivo excepcional. Mis recomendaciones tácticas para seguir:
1. **La Edición Manual (RF-4.4)** puede ser una trampa térmica. Te sugiero que primero aseguremos que el sistema base fluye perfectamente desde Fase de Grupos -> Final y luego construyamos la Edición Manual como una especie de "Modo Dios" para intervenir cuando haga falta.
2. Mencionás **"Usuarios y contraseñas otorgados por mí"**. Al usar Supabase, tenés a tu disposición un panel web propio de Supabase (Authentication -> Users) donde vos con dos clicks creás a los administradores y les generás la clave sin escribir código.
