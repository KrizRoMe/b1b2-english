# ═══════════════════════════════════════════════════════════════════════════
# PROMPT PARA CLAUDE CODE — App "Mi camino de B1+ a B2"
# ═══════════════════════════════════════════════════════════════════════════

Actúa como un desarrollador senior especializado en aplicaciones web, UX/UI, gamificación educativa y seguimiento de hábitos.

Construye una aplicación web COMPLETA, FUNCIONAL, MODERNA y RESPONSIVE para ayudar a un estudiante a pasar de B1+ a B2 de inglés en 12 semanas.

## CONTEXTO DEL PROYECTO (ya existe, no lo recrees)

- Proyecto Astro 7 + React 19 + Tailwind CSS 4 + TypeScript strict, en `/home/krizrome_desktop/projects/b1b2-english`.
- `astro.config.mjs` ya tiene `base: '/b1b2-english/'`, `site: 'https://krizrome.github.io'`, `output: 'static'`, integración `react()` y plugin `tailwindcss()`.
- Dependencias YA instaladas: `astro`, `react`, `react-dom`, `motion`, `tailwindcss`, `@tailwindcss/vite`, `@astrojs/react`, `@types/react`, `@types/react-dom`.
- `src/lib/types.ts` YA existe con todos los tipos (léelo y respétalos).
- `src/lib/data.json` YA existe con:
  - `categories`: mapa `{ clave: "Nombre visible en español" }` (13 categorías).
  - `expressions`: array de 332 objetos `{ id, en, es, category, level, week, day, example, exampleEs, context }`. `example`/`exampleEs`/`context` vienen VACÍOS a propósito: **rellénalos tú** con un ejemplo en inglés + su traducción al español + un contexto de uso, para las 332 expresiones. Usa un enfoque programático si te ayuda, pero el resultado debe ser texto real y natural, no plantillas repetidas del tipo "Example for X".
  - `weeks`: array de 12 objetos `{ week, month, theme, objective, level, activities[], speaking[], writingTask, grammar[{q,a,why}], expressionIds[], dayRange[] }`.
  - `speakingBank`: array de preguntas de speaking.
- `src/components/interior/` YA contiene los 54 componentes React copiados de https://github.com/ddoemonn/interior (librería interior.dev). Úsalos. Son "copy & paste": cada archivo exporta un hook headless `useX` y un componente `X`. Única dependencia externa: `motion` (importan de `motion/react`).
- Tailwind v4: configura `@import "tailwindcss";` en un `src/styles/global.css` e impórtalo desde `src/layouts/Layout.astro`. No uses `@tailwind base/components/utilities` (es v3).
- Para que el proyecto compile, `tsconfig.json` debe extender `astro/tsconfigs/strict`. Revísalo.

## BIBLIOTECA DE COMPONENTES (interior.dev)

Usa componentes de `src/components/interior/`. Examples de exports disponibles (verifica los nombres reales exportados en cada archivo antes de usarlos):

`accordion`, `blur-up-image`, `collapsible-banner`, `command-palette`, `context-menu`, `copy-button`, `drawer`, `dropdown`, `expanding-search`, `filter-grid`, `floating-label`, `hide-on-scroll`, `hold-to-confirm`, `icon-morph`, `inline-validation`, `lightbox`, `like-burst`, `live-activity`, `load-more`, `loading-button`, `logo-marquee`, `long-press`, `modal`, `new-items-pill`, `otp-input`, `pagination`, `password-strength`, `poll-results`, `popover`, `presence-avatars`, `press-depth`, `progress-bar`, `reading-progress`, `reorder-list`, `ripple`, `scroll-spy`, `segmented-control`, `show-more`, `skeleton-swap`, `slider-detents`, `snap-carousel`, `sortable-table`, `sticky-header`, `streaming-text`, `swipe-deck`, `tabs`, `tag-input`, `task-steps`, `text-reveal`, `tooltip-group`, `tree-view`, `typing-indicator`, `value-flash`, `wizard-steps`.

Mapeo recomendado:
- `loading-button` → botón principal "EMPEZAR MI SESIÓN DE HOY" y botón de completar sesión.
- `progress-bar` → barras de avance del dashboard y de cada semana.
- `segmented-control` → filtros de estado/categoría en el banco de expresiones.
- `tooltip-group` → tooltips informativos.
- `hold-to-confirm` → confirmar borrado de datos (mantener al menos 600ms).
- `tabs` → pestañas de la evaluación semanal (Vocabulario / Listening / Speaking / Writing / Gramática).
- `accordion` → contenido plegable de detalle de semana.
- `inline-validation` → validación de formularios.
- `value-flash` → resaltar números que cambian al guardar.
- `modal` / `drawer` → confirmaraciones y formularios de edición de expresión.
- `filter-grid` → filtros del banco de expresiones.
- `pagination` → paginación del banco de expresiones.
- `copy-button` → copiar texto/exportar.
- `popover` → ayudas contextuales.
- `wizard-steps` → los 4 bloques de la sesión diaria (Listening → Vocabulario → Repaso → Speaking).
- `task-steps` → pasos de la sesión.
- `icon-morph` → icono del botón de racha/logros.
- `presence-avatars` → avatares de logros.
- `skeleton-swap` → estados de carga.
- `typing-indicator` → indicador de "pensando" al guardar.
- `long-press` → acciones secundarias en móvil.
- `toast` NO existe: crea un `Toast` propio simple si lo necesitas.

Cada componente de interior.dev exporta (revisa el archivo): un hook headless (`useX`) y un componente estilizado (`X`). Si el hook te da control total del estilo, úsalo y aplica tus propias clases para respetar el design system.

## DISEÑO VISUAL

Elegante, minimalista, moderno, motivador. Inspiración: Notion + Duolingo sin elementos infantiles + dashboard de productividad.

- Fondo claro: blanco o gris muy suave (#FAFAFA / #F7F8FA).
- **Verde** = color principal de progreso (#16A34A / #22C55E).
- **Azul** = aprendizaje (#2563EB).
- Tarjetas con bordes redondeados (rounded-2xl / rounded-xl), bordes sutiles, sombras muy suaves.
- Tipografía moderna y legible (Inter o similar vía system font stack).
- Barras de avance animadas sutilmente.
- Iconos sencillos (usa SVG inline; NO añadas @phosphor-icons).
- Excelente en ordenador y móvil.
- Evita saturación, demasiadas animaciones y elementos innecesarios.

**Paleta y tokens**: define en `src/styles/global.css` con `@theme` de Tailwind v4:
```
--color-progress: #16A34A;   /* verde */
--color-learn: #2563EB;      /* azul */
--color-ink: #0F172A;
--color-muted: #64748B;
--color-surface: #FFFFFF;
--color-canvas: #FAFAFA;
--color-line: #E2E8F0;
```
Más tonos suaves: `--color-progress-soft: #DCFCE7`, `--color-learn-soft: #DBEAFE`.

## IDIOMA

La interfaz va en **español**. Las expresiones, ejemplos y ejercicios de inglés van **en inglés con explicación/traducción al español**.

## NAVEGACIÓN (9 secciones)

1. **Inicio** (dashboard)
2. **Mi sesión de hoy**
3. **Progreso semanal**
4. **Calendario**
5. **Banco de expresiones**
6. **Repasos pendientes**
7. **Evaluaciones**
8. **Estadísticas**
9. **Configuración y copias de seguridad**

Desktop: sidebar izquierdo fijo. Móvil: **bottom navigation** o menú hamburguesa cómodo + claro. La pantalla principal debe priorizar la siguiente acción, no mostrar demasiada información.

## DASHBOARD PRINCIPAL ("Inicio")

- Título: **"Mi camino de B1+ a B2"**.
- Indicador de semana actual: "Semana 3 de 12" (calculado desde `settings.startDate`, que el usuario elige; si no hay fecha elegida, pedirla con un estado vacío elegante — **no inventes fecha de inicio**).
- Contadores: días completados, días pendientes, racha actual, mejor racha.
- Progreso general: % cumplimiento del plan, minutos acumulados, expresiones aprendidas, sesiones completadas, progreso semanal.
- Mensaje motivacional personalizado según la actividad real (ej.: "Hoy solo necesitas cumplir tus 30 minutos", "Llevas 4 días consecutivos. ¡Sigue así!", "No necesitas ser perfecto, necesitas ser constante", "Tu próxima sesión puede empezar hoy"). **Nunca culpabilizador.** Si vuelve tras varios días: "Puedes retomar hoy. Tu progreso anterior sigue aquí".
- Botón principal destacado: **"EMPEZAR MI SESIÓN DE HOY"** → abre directamente la sesión diaria.
- Sección "Mi compromiso de las 6:00 a. m.": horario habitual, hora programada (editable), botón para iniciar sesión, indicador de si cumplió el horario hoy.

## PLAN DE 12 SEMANAS ("Progreso semanal")

12 tarjetas (una por semana) en grid responsive. Cada tarjeta: número, tema principal, objetivo de aprendizaje, sesiones completadas de 7, % cumplimiento, expresiones estudiadas, estado (pendiente / en progreso / completada).

Al pulsar una semana → vista de detalle con: objetivos, actividades previstas, expresiones recomendadas, tareas completadas, tareas pendientes, resultado de la evaluación semanal.

**Las semanas futuras deben poder consultarse pero diferenciarse visualmente** (opacidad / badge "Próxima" / desaturado). **No bloquees el acceso a semanas futuras.**

Distribución de temas (ya está en `data.json`, respétala):
- Mes 1 — Construir la base: S1 opiniones · S2 conectar ideas · S3 causas/consecuencias · S4 conversación cotidiana.
- Mes 2 — Ganar fluidez: S5 posibilidades/condiciones · S6 phrasal verbs · S7 collocations · S8 hábitos/productividad.
- Mes 3 — Consolidar: S9 trabajo/estudios · S10 sociedad/tecnología/medioambiente · S11 emociones/relaciones · S12 consolidación B2.

## PLANIFICADOR DIARIO DE 30 MINUTOS ("Mi sesión de hoy")

Horario habitual 6:00–6:30 a. m. Cuatro bloques:

**BLOQUE 1 — LISTENING (12 min)**
- Título del vídeo, enlace, minutos vistos, notas, nivel de comprensión (escala de 5: "No entendí casi nada", "Entendí algunas palabras", "Entendí la idea general", "Entendí casi todo", "Entendí prácticamente todo").
- **NO inventes enlaces a vídeos.** Solo campo de entrada manual.

**BLOQUE 2 — VOCABULARIO (8 min)**
- Objetivo: 4 expresiones nuevas al día (las del día actual según `week`/`day` en `data.json`).
- Cada expresión muestra: expresión en inglés, traducción, significado/contexto, ejemplo en inglés, traducción del ejemplo, campo para mi propia oración, botón "marcar como aprendida", botón "necesita repasarla".

**BLOQUE 3 — REPASO (5 min)**
- Repetición espaciada: reaparecen tras **1, 3, 7, 14, 30 días**.
- Al responder: "Fácil", "Normal", "Difícil", "No la recuerdo".
- Si "No la recuerdo" → programa un repaso cercano (stage 0 → 1 día).
- **No marques una expresión como dominada solo porque la leíste.** Estados: nueva → aprendiendo → necesita-repaso → aprendida → dominada. "Aprendida" requiere al menos 2 repasos con resultado fácil/normal.

**BLOQUE 4 — SPEAKING (5 min)**
- Una pregunta oral en inglés (del banco, preguntas que suben en complejidad a lo largo de las 12 semanas).
- Leer la pregunta, escribir respuesta opcional, registrar si habló 5 min, notas de dificultades, confianza 1–5.
- **NO simules grabación ni evaluación de voz.** Si el navegador soporta MediaRecorder, ofrece grabación de audio con permiso explícito del usuario y la guardas localmente; si no, muestra una nota clara de que la función no está disponible.

"Completar sesión" pide confirmación (usa `hold-to-confirm` o `modal`) y guarda el registro.

## CALENDARIO Y SEGUIMIENTO DE HÁBITOS ("Calendario")

- Calendario de 12 semanas (vista mes/semana). Estados por día: **sin empezar · sesión iniciada · sesión completada · día de descanso opcional**.
- Marcar sesión como completada. El día cuenta como completado solo cuando el usuario termina y confirma.
- **No cuentes días futuros como días perdidos.**
- **Si fallo un día, no me castigues ni reinicies el plan.** Se puede retomar sin perder datos.
- **Los descansos marcados previamente no penalizan.**
- Cada día guarda: fecha, hora de inicio, minutos estudiados, actividades realizadas, expresiones aprendidas, comprensión auditiva, práctica oral, notas personales.
- Racha de días consecutivos (ignora descansos marcados).

## SISTEMA DE VOCABULARIO ("Banco de expresiones")

- Organizado por las 13 categorías de `data.json`.
- Cada expresión: ID único, inglés, traducción, categoría, nivel aproximado, ejemplo, estado de aprendizaje, fecha de incorporación, próxima fecha de repaso.
- **Distingue entre "estudiada" y "utilizable activamente".**
- Buscador, filtro por categoría, filtro por estado, orden alfabético / por fecha.
- Botón añadir, botón editar, botón eliminar **con confirmación**.
- Exportar datos (JSON completo y CSV solo de vocabulario).
- Importar desde CSV o JSON, con **manejo de errores** (archivo inválido, columnas faltantes, IDs duplicados → avisar).
- **No inventes estadísticas de aprendizaje.**

## EVALUACIÓN SEMANAL ("Evaluaciones")

Al finalizar cada semana, evaluación breve con 5 secciones:

**A. VOCABULARIO** — preguntas para comprobar si recuerdo el significado y puedo usarlas en oraciones (para las expresiones de esa semana). Autoevaluación honesta por expresión.

**B. LISTENING** — enlace o título del audio, tema, % aproximado de comprensión, resumen de lo que entendí, palabras que no comprendí.

**C. SPEAKING** — tema para hablar 2–3 minutos. Autoevaluación 1–5 de: fluidez, vocabulario, gramática, pronunciación, confianza.

**D. WRITING** — tarea breve apropiada al nivel. Guardar respuesta + registrar errores identificados.

**E. GRAMÁTICA** — ejercicios del banco (`weeks[].grammar`, 3 por semana, dificultad progresiva). Auto-corrección con la clave + explicación.

Al terminar: resultados, fortalezas, aspectos a mejorar, recomendaciones para la semana siguiente.

**Distingue claramente entre autoevaluación y evaluación objetiva.** No afirmes que se alcanzó B2 solo por completar sesiones. Añade un aviso explícito: "Esta evaluación es de autoevaluación, no una certificación de nivel."

## GRÁFICOS Y ESTADÍSTICAS ("Estadísticas")

- Progreso semanal: % sesiones completadas vs planificadas.
- Tiempo de estudio: minutos acumulados por semana y por mes.
- Vocabulario: nuevas / repasadas / dominadas.
- Consistencia: calendario visual de actividad.
- Habilidades: evolución de listening, speaking, reading y writing.
- Autoevaluación: comparación de puntuaciones semanales.
- Objetivo de 12 semanas: vista general.
- **Los porcentajes se calculan de datos REALES registrados.** Si no hay datos suficientes → estado vacío explicando qué necesita registrar. **No generes resultados ficticios.** Nada de números inventados, placeholders tipo "0" disfrazados de dato real ni gráficas de ejemplo.
- Gráficos: implementa gráficos SVG propios (sin dependencias extra). Barras, líneas, anillo de progreso, heatmap de calendario.

## MOTIVACIÓN Y GAMIFICACIÓN

- Logros por completar sesiones: primera sesión completada, primera semana completada, 7 días acumulados, 50 expresiones estudiadas, 100 expresiones estudiadas, 30 sesiones completadas, 12 semanas de seguimiento.
- Insignias por semanas completadas.
- Indicadores de consistencia.
- Mensajes motivacionales breves + resumen positivo de avances.
- Objetivo diario sencillo.
- Recordatorio amable al volver tras varios días: "Puedes retomar hoy. Tu progreso anterior sigue aquí".
- **Sin mensajes culpabilizadores.**

## PERSISTENCIA DE DATOS (fundamental)

- **localStorage** (o IndexedDB). Clave versionada, p. ej. `b1b2-english:v1`.
- Carga al abrir. **Autoguardado** en cada cambio (con debounce).
- **Manejo de errores** de lectura/escritura (JSON corrupto, cuota llena, modo privado): try/catch, fallback a un estado vacío seguro, aviso al usuario sin perder nada.
- Exportar todos los datos a JSON; exportar vocabulario a CSV; importar copia de seguridad; **confirmación antes de borrar todos los datos**; manejo de errores en importación.
- En la sección de configuración explica **claramente que los datos permanecen en ese navegador y ese dispositivo**, y que no hay sincronización entre dispositivos.
- **No afirmes sincronización entre dispositivos** si no la implementas.

## DATOS INICIALES

- Nivel de partida B1+, objetivo B2, 12 semanas, 30 min/día, 6:00 a. m., 4 expresiones/día, "English with Thiago".
- **No marques ninguna sesión como completada automáticamente.**
- **No inventes fecha de inicio** — se elige en Configuración; hasta entonces, la app pide la fecha con un estado vacío claro.
- Las 332 expresiones del banco vienen precargadas como **"datos precargados del plan de 12 semanas"** (no son datos inventados por la app: vienen del `data.json`).
- Incluye **algunas expresiones de ejemplo marcadas claramente como "datos de demostración"** para probar el sistema (puedes usar las 332 precargadas como banco real y añadir 4-6 marked demo). Si usas las 332 como banco real, marca el conjunto como "banco del plan (12 semanas)".

## REQUISITOS TÉCNICOS

- React 19 con `client:load` / `client:only="react"` donde haga falta interactividad.
- Astro **static** (GitHub Pages). Sin backend, sin autenticación.
- **Todos los botones deben funcionar.** Cero botones decorativos.
- Si una función avanzada no es posible en este entorno (p. ej. notificaciones push automáticas), **indícalo claramente en la UI** y ofrece alternativa funcional. Por ejemplo: en lugar de prometer notificaciones automáticas, ofrece exportar un archivo `.ics` de las sesiones de 6:00 a. m. o simplemente el recordatorio amable al volver. **No prometas notificaciones automáticas** si no hay permisos/infraestructura.
- Responsive real. Sin errores en consola. TypeScript sin errores de tipo (`npx astro check` o `tsc --noEmit`).
- Añade un `README.md` con: qué es, cómo ejecutar (`npm install`, `npm run dev`, `npm run build`), cómo desplegar en GitHub Pages (rama `gh-pages` o workflow), y la nota de almacenamiento local.

## ESTRUCTURA DE ARCHIVOS SUGERIDA

```
src/
  layouts/Layout.astro
  pages/index.astro
  pages/sesion.astro
  pages/progreso.astro
  pages/calendario.astro
  pages/vocabulario.astro
  pages/repasos.astro
  pages/evaluaciones.astro
  pages/estadisticas.astro
  pages/configuracion.astro
  styles/global.css
  lib/types.ts          (ya existe)
  lib/data.json         (ya existe)
  lib/store.ts          (estado global + persistencia + hooks)
  lib/dates.ts          (cálculo de semanas/días desde startDate)
  lib/spacedRepetition.ts
  lib/achievements.ts
  lib/stats.ts
  lib/csv.ts
  components/ui/*.tsx   (wrappers propios)
  components/interior/*.tsx  (ya existen, 54)
```

Como Astro es MPA por defecto, la navegación entre páginas es un SPA. **Para conservar el estado entre páginas sin recargar**, implementa un store con `useSyncExternalStore` + persistencia en localStorage que se hidrata en `client:load`. Alternativa válida: hacer la app una sola página con enrutado por hash o estado (SPA interna) — elige la opción más robusta y asegúrate de que la navegación NO pierde datos.

**RECOMENDACIÓN**: implementa la app como una SPA dentro de Astro (una sola página `index.astro` que monta un `<App />` React con router interno por estado/hash). Esto evita problemas de hidratación y persistencia, y simplifica el layout responsive. Alternativamente, si prefieres MPA, haz que cada página sea una isla React que lee/escribe el mismo store de localStorage — pero entonces el sidebar debe funcionar en cada página.

## VERIFICACIÓN FINAL (OBLIGATORIA antes de terminar)

Ejecuta y comprueba:
1. `npm run build` termina sin errores.
2. `npx tsc --noEmit` (o `npx astro check`) sin errores de tipo.
3. Levanta `npm run preview` y verifica con `curl` que las rutas responden 200.
4. Revisa que no haya botones sin `onClick`/`href` (busca `TODO`, `FIXME`, `onClick={() => {}}`).
5. Confirma que las 332 expresiones tienen `example` y `exampleEs` rellenados (no vacías).

Al final, escribe un informe breve en `BUILD_REPORT.md` con: qué se construyó, decisiones de arquitectura, lista de limitaciones reales, y cómo verificarlo.

NO inventes resultados. Si algo no funciona, dilo claramente.
