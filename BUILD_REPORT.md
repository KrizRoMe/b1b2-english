# BUILD_REPORT — Mi camino de B1+ a B2

Fecha: 2026-10-25

## Qué se ha construido

SPA en Astro 7 (estática) + React 19 + Tailwind v4, con las 9 secciones del SPEC:

| Sección | Contenido |
|---|---|
| Inicio | Semana actual calculada desde `startDate` (si no hay fecha: estado vacío que la pide), contadores (días completados, por completar, racha, mejor racha), progreso general, mensaje motivador según actividad real (incluido «Puedes retomar hoy…» tras ≥3 días sin visita), CTA «EMPEZAR MI SESIÓN DE HOY», bloque «Mi compromiso de las 6:00» con hora editable e indicador de si empezaste a tu hora, logros recientes. |
| Mi sesión de hoy | 4 bloques (Listening 12 · Vocabulario 8 · Repaso 5 · Speaking 5) con navegación libre (`useWizard`). Listening: título, enlace manual validado, minutos, notas y escala de 5 niveles. Vocabulario: las expresiones del día del plan (`day` 1–84) con ejemplo, traducción, contexto, oración propia, «Marcar como aprendida» / «Necesita repasarla», y opción de recuperar expresiones atrasadas. Repaso: tarjetas con Fácil/Normal/Difícil/No la recuerdo (máx. 12 por sesión). Speaking: pregunta de la semana, «Otra pregunta», respuesta escrita, «he hablado 5 min», dificultades, confianza 1–5 y grabación opcional con MediaRecorder. Completar exige modal + mantener pulsado (`HoldToConfirm`). Se pueden registrar días pasados con su fecha real. |
| Progreso semanal | 12 tarjetas por mes; semanas futuras atenuadas con badge «Próxima» pero accesibles. Detalle con acordeón: objetivos, actividades, expresiones recomendadas con estado, tareas completadas, pendientes y resultado de la evaluación. |
| Calendario | Vista mensual y vista de 12 semanas; estados sin empezar / iniciada / completada / descanso / futuro. Modal por día: registrar/continuar sesión, marcar o quitar descanso, ver el registro, eliminar el registro. Días futuros nunca cuentan como perdidos; descansos no rompen la racha. |
| Banco de expresiones | 332 del plan + 5 marcadas «Demostración». Búsqueda, filtro por categoría, filtro por estado (`SegmentedControl`), 5 órdenes, paginación de 20. Añadir/editar en `Drawer` con validación, eliminar con confirmación. Distinción «estudiada» vs «la uso activamente». Exportar CSV / JSON; importar CSV o JSON con vista previa, aviso de columnas faltantes, filas inválidas, IDs duplicados (en el archivo y en el banco) y opción de sobrescribir conservando el historial. |
| Repasos pendientes | Cola del día (incluidas atrasadas, sin culpabilizar), previsión de 7 días, lista de «necesitan repaso». |
| Evaluaciones | Por semana, en `Tabs`: Vocabulario (autoevaluación por expresión), Listening, Speaking (5 criterios 1–5), Writing (texto + errores), Gramática (3 ejercicios del plan con corrección por clave y, si no coincide literalmente, autoevaluación explícita), Resultados (separa «corrección con clave» de «autoevaluación», sugerencias generadas por reglas, editables). Aviso «Esta evaluación es de autoevaluación, no una certificación de nivel». Borrador autoguardado. |
| Estadísticas | Gráficos SVG propios: anillo del objetivo de 12 semanas, barras de % semanal y minutos por semana, minutos por mes, barra apilada de estados del vocabulario, heatmap de 84 días, líneas de evolución de las 4 habilidades (con vista en tabla) y de autoevaluaciones. Cada gráfico muestra un estado vacío explicando qué registrar si no hay datos. Logros (7) e insignias por semana (12) con fecha real de desbloqueo. |
| Configuración | Fecha de inicio (al cambiarla, recoloca las sesiones en su semana), hora, minutos/día, expresiones/día, recurso de vídeo. Explicación clara de almacenamiento local sin sincronización, estado del autoguardado, exportar/importar, descarga `.ics` de 84 sesiones como alternativa a notificaciones, quitar datos de demostración, restaurar expresiones del plan borradas, borrar todo con `HoldToConfirm` (1,5 s). |

Contenido: las 332 expresiones de `data.json` tienen ahora `example`, `exampleEs` y `context` escritos a mano (332 ejemplos distintos, 0 vacíos).

## Decisiones de arquitectura

- **SPA en una sola página** (`index.astro` + `<App client:only="react" />`) con enrutado por hash (`#/sesion`, `#/progreso/3`…). Evita problemas de hidratación con `localStorage` y funciona en GitHub Pages sin configuración de rutas. Las rutas `/sesion/`, `/calendario/`… existen como páginas que redirigen al hash correspondiente.
- **Store** (`lib/store.ts`): módulo con `useSyncExternalStore`, un único punto de escritura `update()` que recalcula logros y programa el guardado con debounce de 400 ms; se fuerza el guardado en `pagehide`/`visibilitychange`. Lectura/escritura en `try/catch`: sin acceso (modo privado), JSON corrupto (se copia a `b1b2-english:v1:corrupto:<ts>` y se puede descargar) y cuota llena muestran avisos sin perder lo que hay en memoria.
- **Normalización** (`normalizeState`): valida la forma, completa campos y añade expresiones del plan que falten (respetando las que el usuario borró, en `deletedPlanIds`). Se usa también al importar copias.
- **Repetición espaciada**: intervalos 1/3/7/14/30. Fácil +2 etapas, Normal +1, Difícil −1, No la recuerdo → etapa 0 (1 día). «Aprendida» exige ≥2 repasos fácil/normal; «dominada» exige 4 buenos, los 2 últimos buenos y haber llegado a la etapa de 30 días. Leer o marcar en la sesión solo la pone en «aprendiendo».
- **Tipos**: se respetan los de `types.ts`; se añadieron solo campos opcionales (`source`, `activeUse`, `selfRatings`, `completedAt`, `checkedBy`, `deletedPlanIds`, `createdAt`) y los tipos `WeekPlan`/`PlanData` para `data.json`.
- **Componentes interior.dev usados**: `useAsyncAction` (CTA), `ProgressBar` (recoloreado a verde/azul por CSS), `SegmentedControl`, `Tabs`, `Accordion`, `Modal`, `Drawer`, `HoldToConfirm`, `useWizard`, `useInlineValidation`, `Pagination`, `CopyButton`, `Tooltip`, `useValueFlash`, `TypingIndicator`. Como son tema claro/oscuro con `dark:`, el variant `dark` se ató a una clase que nunca se aplica (la app es de tema claro, según el SPEC).
- **Gráficos**: SVG propio (`components/ui/charts.tsx`), paleta validada con el validador de daltonismo; las series se distinguen además por forma del marcador y tienen leyenda y tooltip.

## Cambios en archivos existentes

- `src/components/interior/drawer.tsx`: el efecto que pone `inert` al panel cerrado tenía dependencias `[open]`, pero el panel se monta vía portal un render después, así que el cajón cerrado quedaba sin `inert` (sus enlaces eran enfocables con Tab). Se quitó el array de dependencias.
- `package.json`: añadidas `typescript` y `@astrojs/check` como devDependencies (necesarias para `npx tsc --noEmit` y `npx astro check`; no estaban instaladas).
- `README.md` reescrito; añadido `.github/workflows/deploy.yml`.

## Verificación realizada (resultados reales)

- `npm run build`: OK, 9 páginas.
- `npx tsc --noEmit`: 0 errores. `npx astro check`: 0 errores, 0 warnings.
- `npm run preview` + `curl`: las 9 rutas responden 200.
- Revisión estática: sin `TODO`/`FIXME`/`onClick={() => {}}`; todos los `<Button>`/`<button>` propios tienen `onClick` o son `submit`.
- Prueba E2E con Playwright (Chromium headless, script fuera del repo) recorriendo: estado vacío → fijar fecha → sesión completa de 4 bloques → completar con mantener pulsado → recarga y persistencia → descanso en calendario → alta/edición/borrado/búsqueda/filtros del banco → importación de CSV inválido (error de columnas) y con duplicados/filas malas (avisos correctos) → exportar CSV → evaluación con gramática corregida por clave y por autoevaluación → estadísticas → `.ics` (84 eventos) → exportar JSON → JSON corrupto (aviso + copia aparte) → restaurar copia → borrar todo (soltar antes no borra; mantener sí borra) → 6 vistas en 375 px sin scroll horizontal. **0 errores/warnings de consola.**

## Limitaciones reales

- **Sin sincronización**: los datos viven en un navegador y un dispositivo. Borrar los datos del navegador los elimina; la única protección es exportar copias.
- **Sin notificaciones automáticas**: no hay servidor ni push. Alternativa ofrecida: archivo `.ics` para el calendario del usuario.
- **Grabaciones de audio** solo en IndexedDB del navegador; no se incluyen en la copia JSON ni al restaurarla. No hay evaluación de pronunciación ni de voz.
- **Corrección de gramática**: la comparación automática es literal (normalizando mayúsculas, acentos y puntuación). Las respuestas abiertas («¿Cuál es la diferencia…?») casi nunca coinciden y dependen de la autoevaluación del usuario, que queda marcada como tal.
- **Reading** no tiene actividad propia en el plan: su evolución solo sale de la autoevaluación 1–5 de la evaluación semanal.
- **Sugerencias de la evaluación** («fortalezas», «a mejorar») son reglas simples sobre los datos introducidos, no un análisis de nivel.
- **Cambiar la fecha de inicio** recoloca las sesiones en semanas nuevas, pero no cambia las expresiones que ya se asignaron a cada sesión registrada.
- **Fechas** en hora local del dispositivo; viajar entre zonas horarias puede mover el «día» de una sesión.
- Las semanas se cuentan en bloques de 7 días desde la fecha de inicio, no por semanas de calendario (lunes–domingo).
- Probado en Chromium headless de escritorio y móvil emulado (375 px). No se probó en Safari/iOS ni Firefox reales; MediaRecorder en Safari antiguo puede no estar disponible (la app lo detecta y lo indica).
- El bundle JS de la app pesa ~480 KB sin comprimir (incluye `motion` y los datos del plan); no se hizo división de código.

## Cómo verificarlo

```bash
npm install
npm run build && npx tsc --noEmit && npx astro check
npm run preview   # abre http://localhost:4321/b1b2-english/
```
Flujo manual sugerido: elegir fecha de inicio en Inicio → «EMPEZAR MI SESIÓN DE HOY» → recorrer los 4 bloques → «Completar sesión» (mantener pulsado) → recargar la página y comprobar que todo sigue ahí → Configuración → «Exportar todo (JSON)».
