// Fechas locales en formato ISO "YYYY-MM-DD". Nunca usamos UTC para el día,
// así una sesión a las 6:00 a. m. cae siempre en el día correcto.

export const PLAN_DAYS = 84;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fromISO(iso);
  return !Number.isNaN(d.getTime()) && toISO(d) === iso;
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Días entre a y b (b - a), ignorando horas y cambios de horario. */
export function diffDays(a: string, b: string): number {
  const da = fromISO(a);
  const db = fromISO(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export type PlanPosition =
  | { kind: 'sin-fecha' }
  | { kind: 'antes'; daysUntil: number }
  | { kind: 'en-curso'; planDay: number; week: number; dayInWeek: number }
  | { kind: 'terminado'; daysAfter: number };

/** Posición de una fecha dentro del plan de 12 semanas (día 1..84). */
export function planPosition(startDate: string, date: string): PlanPosition {
  if (!startDate || !isValidISO(startDate)) return { kind: 'sin-fecha' };
  const offset = diffDays(startDate, date);
  if (offset < 0) return { kind: 'antes', daysUntil: -offset };
  if (offset >= PLAN_DAYS) return { kind: 'terminado', daysAfter: offset - PLAN_DAYS + 1 };
  const planDay = offset + 1;
  return { kind: 'en-curso', planDay, week: Math.ceil(planDay / 7), dayInWeek: ((planDay - 1) % 7) + 1 };
}

export function dateForPlanDay(startDate: string, planDay: number): string {
  return addDays(startDate, planDay - 1);
}

export function weekDates(startDate: string, week: number): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, (week - 1) * 7 + i));
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function formatDay(iso: string) {
  const s = dateFmt.format(fromISO(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const formatShort = (iso: string) => shortFmt.format(fromISO(iso));
export const formatLong = (iso: string) => longFmt.format(fromISO(iso));
export function formatMonth(d: Date) {
  const s = monthFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const formatTime = (isoDateTime: string) => timeFmt.format(new Date(isoDateTime));

/** 6 → "6:00 a. m.", 18 → "6:00 p. m." */
export function formatHour(h: number) {
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${suffix}`;
}
