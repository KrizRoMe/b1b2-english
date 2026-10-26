import type { AppState } from './types';
import { WEEKS } from './plan';
import { completedSessions, totals, weekStats } from './stats';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  kind: 'logro' | 'insignia';
  check: (s: AppState) => boolean;
};

const distinctWeeksWithSession = (s: AppState) => new Set(completedSessions(s).filter((r) => r.week > 0).map((r) => r.week)).size;
const completedWeeks = (s: AppState) => WEEKS.filter((w) => weekStats(s, w.week).status === 'completada').length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera-sesion', title: 'Primera sesión', description: 'Completaste tu primera sesión de 30 minutos.', kind: 'logro', check: (s) => totals(s).sessions >= 1 },
  { id: 'primera-semana', title: 'Primera semana completada', description: 'Cubriste los 7 días de una semana del plan (sesiones o descansos marcados).', kind: 'logro', check: (s) => completedWeeks(s) >= 1 },
  { id: 'siete-dias', title: '7 días acumulados', description: 'Sumas 7 sesiones completadas, no hace falta que sean seguidas.', kind: 'logro', check: (s) => totals(s).sessions >= 7 },
  { id: 'cincuenta-expresiones', title: '50 expresiones estudiadas', description: 'Has estudiado 50 expresiones del banco.', kind: 'logro', check: (s) => totals(s).studied >= 50 },
  { id: 'cien-expresiones', title: '100 expresiones estudiadas', description: 'Has estudiado 100 expresiones del banco.', kind: 'logro', check: (s) => totals(s).studied >= 100 },
  { id: 'treinta-sesiones', title: '30 sesiones completadas', description: 'Treinta mañanas de práctica registradas.', kind: 'logro', check: (s) => totals(s).sessions >= 30 },
  { id: 'doce-semanas', title: '12 semanas de seguimiento', description: 'Registraste al menos una sesión completada en cada una de las 12 semanas.', kind: 'logro', check: (s) => distinctWeeksWithSession(s) >= 12 },
  ...WEEKS.map<Achievement>((w) => ({
    id: `semana-${w.week}`,
    title: `Semana ${w.week}`,
    description: `Insignia por completar la semana ${w.week}: ${w.theme}.`,
    kind: 'insignia',
    check: (s) => weekStats(s, w.week).status === 'completada',
  })),
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** IDs de logros cuyas condiciones se cumplen con los datos actuales. */
export function evaluateAchievements(s: AppState): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id);
}
