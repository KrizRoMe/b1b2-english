# Mi camino de B1+ a B2

Aplicación web para seguir un plan de 12 semanas de inglés (de B1+ a B2) con sesiones diarias de 30 minutos: listening, vocabulario, repaso espaciado y speaking. Incluye banco de 332 expresiones con ejemplos, calendario de hábitos, evaluaciones semanales de autoevaluación y estadísticas calculadas solo con tus registros.

Interfaz en español. Sin backend ni cuentas.

## Ejecutar en local

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev       # servidor de desarrollo → http://localhost:4321/b1b2-english/
npm run build     # build estático en dist/
npm run preview   # sirve el build
npx tsc --noEmit  # verificación de tipos
npx astro check   # verificación de tipos de Astro
```

## Desplegar en GitHub Pages

El sitio está configurado para `https://krizrome.github.io/b1b2-english/` (`site` y `base` en `astro.config.mjs`).

**Opción A: workflow incluido (recomendada).**
1. Sube el repositorio a GitHub con el nombre `b1b2-english`.
2. En *Settings → Pages*, elige **Source: GitHub Actions**.
3. Haz push a `main`: `.github/workflows/deploy.yml` construye y publica `dist/`.

**Opción B: rama `gh-pages`.**
```bash
npm run build
npx gh-pages -d dist   # publica dist/ en la rama gh-pages
```
y en *Settings → Pages* elige la rama `gh-pages`.

Si cambias el nombre del repositorio, actualiza `base` en `astro.config.mjs`.

## Dónde se guardan los datos

- Todo se guarda en el **almacenamiento local (`localStorage`) de ese navegador y ese dispositivo**, con la clave `b1b2-english:v1`. Se guarda automáticamente con cada cambio.
- **No hay sincronización entre dispositivos.** Para cambiar de dispositivo, exporta una copia JSON en *Configuración* e impórtala en el otro.
- Las grabaciones de speaking (opcionales) se guardan en IndexedDB de ese navegador y **no** van incluidas en la copia JSON.
- Si los datos guardados están dañados, la app arranca con un estado vacío, guarda el contenido original en otra clave (`b1b2-english:v1:corrupto:<fecha>`) y deja descargarlo.

## Estructura

```
src/
  pages/index.astro          SPA: monta <App /> (client:only) con enrutado por hash
  pages/<sección>.astro       accesos directos que redirigen a /#/<sección>
  components/App.tsx          layout: sidebar (escritorio), barra inferior + menú (móvil)
  components/views/           las 9 secciones + sesión, repaso, importación, grabadora
  components/ui/              primitivas propias, iconos SVG, toasts, gráficos SVG
  components/interior/        54 componentes de interior.dev (copy & paste)
  lib/store.ts                estado global (useSyncExternalStore) + persistencia
  lib/spacedRepetition.ts     intervalos 1-3-7-14-30 días y estados de aprendizaje
  lib/stats.ts, achievements.ts, dates.ts, csv.ts, audio.ts, plan.ts, router.ts
  lib/data.json               332 expresiones + plan de 12 semanas + gramática
```
