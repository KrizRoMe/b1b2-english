import { useEffect, useState } from 'react';
import { useRoute, href, type Section } from '../lib/router';
import { dismissStorageWarning, markVisit, onAchievements, useSnapshot } from '../lib/store';
import { ACHIEVEMENT_BY_ID } from '../lib/achievements';
import { Icon, type IconName } from './ui/Icon';
import { ToastViewport, toast } from './ui/Toast';
import { Drawer } from './interior/drawer';
import { Dashboard } from './views/Dashboard';
import { SessionView } from './views/Session';
import { WeeksView } from './views/Weeks';
import { CalendarView } from './views/Calendar';
import { VocabView } from './views/Vocab';
import { ReviewsView } from './views/Reviews';
import { EvaluationsView } from './views/Evaluations';
import { StatsView } from './views/Stats';
import { SettingsView } from './views/Settings';
import { useToday } from './useToday';
import { isDue } from '../lib/spacedRepetition';

const NAV: { section: Section; label: string; short: string; icon: IconName }[] = [
  { section: 'inicio', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { section: 'sesion', label: 'Mi sesión de hoy', short: 'Sesión', icon: 'play' },
  { section: 'progreso', label: 'Progreso semanal', short: 'Semanas', icon: 'chart' },
  { section: 'calendario', label: 'Calendario', short: 'Calendario', icon: 'calendar' },
  { section: 'vocabulario', label: 'Banco de expresiones', short: 'Banco', icon: 'book' },
  { section: 'repasos', label: 'Repasos pendientes', short: 'Repasos', icon: 'repeat' },
  { section: 'evaluaciones', label: 'Evaluaciones', short: 'Evaluar', icon: 'clipboard' },
  { section: 'estadisticas', label: 'Estadísticas', short: 'Datos', icon: 'stats' },
  { section: 'configuracion', label: 'Configuración y copias', short: 'Ajustes', icon: 'settings' },
];

const MOBILE_MAIN: Section[] = ['inicio', 'sesion', 'vocabulario', 'repasos'];

export default function App() {
  const route = useRoute();
  const { state, storage } = useSnapshot();
  const today = useToday();
  const [moreOpen, setMoreOpen] = useState(false);
  const due = Object.values(state.vocab).filter((v) => isDue(v, today)).length;

  useEffect(() => {
    markVisit();
    return onAchievements((ids) => {
      for (const id of ids) toast(`Logro desbloqueado: ${ACHIEVEMENT_BY_ID[id]?.title ?? id}`);
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMoreOpen(false);
  }, [route.section, route.param]);

  const view = (() => {
    switch (route.section) {
      case 'sesion': return <SessionView date={route.param} />;
      case 'progreso': return <WeeksView week={route.param ? Number(route.param) : null} />;
      case 'calendario': return <CalendarView />;
      case 'vocabulario': return <VocabView />;
      case 'repasos': return <ReviewsView />;
      case 'evaluaciones': return <EvaluationsView week={route.param ? Number(route.param) : null} />;
      case 'estadisticas': return <StatsView />;
      case 'configuracion': return <SettingsView />;
      default: return <Dashboard />;
    }
  })();

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <a href={href('inicio')} className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-progress text-sm font-bold text-white">B2</span>
          <span className="leading-tight">
            <span className="block text-[14px] font-semibold text-ink">Mi camino de B1+ a B2</span>
            <span className="block text-[12px] text-muted">12 semanas · 30 min/día</span>
          </span>
        </a>
        <nav aria-label="Secciones" className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map((n) => {
            const active = route.section === n.section;
            return (
              <a
                key={n.section}
                href={href(n.section)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors ${active ? 'bg-progress-soft font-medium text-[#15803d]' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}
              >
                <Icon name={n.icon} />
                <span className="flex-1">{n.label}</span>
                {n.section === 'repasos' && due > 0 && <span className="rounded-full bg-learn px-1.5 text-[11px] font-semibold text-white">{due}</span>}
              </a>
            );
          })}
        </nav>
        <p className="px-5 py-4 text-[11.5px] leading-snug text-muted">Tus datos se guardan solo en este navegador y este dispositivo.</p>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <a href={href('inicio')} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-progress text-[12px] font-bold text-white">B2</span>
          <span className="text-[14px] font-semibold">Mi camino de B1+ a B2</span>
        </a>
        <button type="button" onClick={() => setMoreOpen(true)} aria-label="Abrir menú de secciones" className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink">
          <Icon name="menu" size={20} />
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        {storage.kind !== 'ok' && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-warm-soft/70 px-4 py-3 text-[13.5px] text-[#78350f]">
            <Icon name="alert" className="mt-0.5" />
            <div className="flex-1">
              {storage.message}{' '}
              <a href={href('configuracion')} className="font-medium underline">Ir a copias de seguridad</a>
            </div>
            {storage.kind !== 'sin-acceso' && (
              <button type="button" onClick={dismissStorageWarning} aria-label="Ocultar aviso" className="rounded p-0.5 hover:bg-amber-100">
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        )}
        {view}
      </main>

      {/* Navegación inferior móvil */}
      <nav aria-label="Secciones principales" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => MOBILE_MAIN.includes(n.section)).map((n) => {
          const active = route.section === n.section;
          return (
            <a key={n.section} href={href(n.section)} aria-current={active ? 'page' : undefined} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? 'font-medium text-progress' : 'text-muted'}`}>
              <Icon name={n.icon} size={20} />
              {n.short}
              {n.section === 'repasos' && due > 0 && <span className="absolute top-1.5 right-[calc(50%-18px)] rounded-full bg-learn px-1 text-[10px] font-semibold text-white">{due}</span>}
            </a>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${MOBILE_MAIN.includes(route.section) ? 'text-muted' : 'font-medium text-progress'}`}>
          <Icon name="menu" size={20} />
          Más
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen} title="Secciones" description="Todas las partes de tu plan" width={300} closeLabel="Cerrar menú">
        <nav aria-label="Todas las secciones" className="space-y-1">
          {NAV.map((n) => (
            <a
              key={n.section}
              href={href(n.section)}
              onClick={() => setMoreOpen(false)}
              aria-current={route.section === n.section ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] ${route.section === n.section ? 'bg-progress-soft font-medium text-[#15803d]' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon name={n.icon} />
              {n.label}
            </a>
          ))}
        </nav>
      </Drawer>

      <ToastViewport />
    </div>
  );
}
