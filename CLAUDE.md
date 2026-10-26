# Mi camino de B1+ a B2 — App de aprendizaje de inglés

## Stack

- Astro 7 (static) + React 19 + Tailwind CSS v4 + TypeScript strict
- `motion` (v14) para animaciones — import siempre de `motion/react`
- Sin backend, sin autenticación. Persistencia en `localStorage`.

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build estático para GitHub Pages
npm run preview  # sirve el build
npx astro check  # verificación de tipos
```

## Estructura clave

- `src/lib/types.ts` — todos los tipos de dominio (léelo primero)
- `src/lib/data.json` — banco de 332 expresiones + plan de 12 semanas + ejercicios de gramática
- `src/lib/store.ts` — estado global con `useSyncExternalStore` + persistencia en localStorage
- `src/components/interior/` — 54 componentes de https://github.com/ddoemonn/interior (copy & paste, no es paquete npm)
- `src/styles/global.css` — tokens de diseño con `@theme` de Tailwind v4

## Reglas del proyecto

- **Tailwind v4**: usa `@import "tailwindcss";` + `@theme { --color-*: ... }`. NO uses `@tailwind base/components/utilities`.
- **Base path**: `/b1b2-english/` — ya configurado en `astro.config.mjs`. Usa `import.meta.env.BASE_URL` para rutas internas.
- La interfaz va en **español**; el inglés aparece con su explicación en español.
- **No inventes datos**: ni estadísticas, ni fechas de inicio, ni enlaces de vídeo. Estados vacíos honestos.
- **Todo botón debe funcionar.** Cero botones decorativos.
- Componentes de `interior/`: cada archivo exporta un hook headless `useX` + componente `X`. Verifica los exports reales antes de usarlos.
- Persistencia: clave `b1b2-english:v1` en localStorage, autoguardado con debounce, try/catch en lectura/escritura.
