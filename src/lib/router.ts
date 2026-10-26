import { useSyncExternalStore } from 'react';

export type Section =
  | 'inicio'
  | 'sesion'
  | 'progreso'
  | 'calendario'
  | 'vocabulario'
  | 'repasos'
  | 'evaluaciones'
  | 'estadisticas'
  | 'configuracion';

export type Route = { section: Section; param: string | null };

const SECTIONS: Section[] = ['inicio', 'sesion', 'progreso', 'calendario', 'vocabulario', 'repasos', 'evaluaciones', 'estadisticas', 'configuracion'];

export function parseHash(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/');
  const section = (SECTIONS as string[]).includes(first) ? (first as Section) : 'inicio';
  return { section, param: second ? decodeURIComponent(second) : null };
}

export function href(section: Section, param?: string | number | null) {
  return `#/${section}${param !== undefined && param !== null ? `/${encodeURIComponent(String(param))}` : ''}`;
}

export function navigate(section: Section, param?: string | number | null) {
  window.location.hash = href(section, param);
}

let cached: { hash: string; route: Route } | null = null;

function snapshot(): Route {
  const h = window.location.hash;
  if (!cached || cached.hash !== h) cached = { hash: h, route: parseHash(h) };
  return cached.route;
}

const SERVER: Route = { section: 'inicio', param: null };

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('hashchange', l);
      return () => window.removeEventListener('hashchange', l);
    },
    snapshot,
    () => SERVER,
  );
}
