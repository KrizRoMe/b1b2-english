import type { AppState, LearningStatus, SessionRecord } from './types';
import { addDays, isValidISO, planPosition, todayISO, weekDates } from './dates';
import { WEEKS } from './plan';

export const completedSessions = (s: AppState): SessionRecord[] =>
  Object.values(s.sessions).filter((r) => r.status === 'completada');

const isDone = (s: AppState, d: string) => s.sessions[d]?.status === 'completada';
const isRest = (s: AppState, d: string) => !!s.restDays[d] && !isDone(s, d);

/**
 * Racha actual: días consecutivos con sesión completada hasta hoy.
 * Los descansos marcados no rompen la racha (ni suman). Hoy sin terminar todavía no rompe nada.
 */
export function currentStreak(s: AppState, today = todayISO()): number {
  const done = completedSessions(s).map((r) => r.date).sort();
  if (!done.length) return 0;
  const earliest = done[0];
  let d = isDone(s, today) || isRest(s, today) ? today : addDays(today, -1);
  let count = 0;
  while (d >= earliest) {
    if (isDone(s, d)) count++;
    else if (!isRest(s, d)) break;
    d = addDays(d, -1);
  }
  return count;
}

export function bestStreak(s: AppState, today = todayISO()): number {
  const done = completedSessions(s).map((r) => r.date).sort();
  if (!done.length) return 0;
  let best = 0;
  let run = 0;
  for (let d = done[0]; d <= today; d = addDays(d, 1)) {
    if (isDone(s, d)) {
      run++;
      best = Math.max(best, run);
    } else if (!isRest(s, d) && d !== today) run = 0;
  }
  return best;
}

export type WeekStatus = 'pendiente' | 'en-progreso' | 'completada';

export type WeekStats = {
  week: number;
  dates: string[];
  completed: number;
  rest: number;
  minutes: number;
  studied: number;
  totalExpressions: number;
  percent: number;
  status: WeekStatus;
  isFuture: boolean;
  isCurrent: boolean;
};

export function weekStats(s: AppState, week: number, today = todayISO()): WeekStats {
  const plan = WEEKS.find((w) => w.week === week);
  const ids = plan?.expressionIds ?? [];
  const studied = ids.filter((id) => s.vocab[id] && s.vocab[id].status !== 'nueva').length;
  const hasStart = isValidISO(s.settings.startDate);
  const dates = hasStart ? weekDates(s.settings.startDate, week) : [];
  const sessions = completedSessions(s).filter((r) => r.week === week);
  const completed = sessions.length;
  const rest = dates.filter((d) => isRest(s, d)).length;
  const minutes = sessions.reduce((a, r) => a + (r.minutes || 0), 0);
  const isFuture = hasStart ? dates[0] > today : false;
  const isCurrent = hasStart ? dates[0] <= today && today <= dates[6] : false;
  const allCovered = hasStart && dates.every((d) => isDone(s, d) || isRest(s, d));
  const anyActivity = Object.values(s.sessions).some((r) => r.week === week);
  const status: WeekStatus = allCovered && completed > 0 ? 'completada' : anyActivity || isCurrent ? 'en-progreso' : 'pendiente';
  return {
    week,
    dates,
    completed,
    rest,
    minutes,
    studied,
    totalExpressions: ids.length,
    percent: Math.round((Math.min(7, completed) / 7) * 100),
    status,
    isFuture,
    isCurrent,
  };
}

export function totals(s: AppState) {
  const done = completedSessions(s);
  const vocab = Object.values(s.vocab);
  const byStatus: Record<LearningStatus, number> = { nueva: 0, aprendiendo: 0, 'necesita-repaso': 0, aprendida: 0, dominada: 0 };
  for (const v of vocab) byStatus[v.status]++;
  return {
    sessions: done.length,
    minutes: done.reduce((a, r) => a + (r.minutes || 0), 0),
    planSessions: done.filter((r) => r.week > 0).length,
    studied: vocab.filter((v) => v.status !== 'nueva').length,
    reviewed: vocab.filter((v) => v.timesReviewed > 0).length,
    activeUse: vocab.filter((v) => v.activeUse).length,
    totalReviews: vocab.reduce((a, v) => a + v.timesReviewed, 0),
    byStatus,
    vocabTotal: vocab.length,
  };
}

export type DayState = 'completada' | 'iniciada' | 'descanso' | 'sin-empezar' | 'futuro';

export function dayState(s: AppState, date: string, today = todayISO()): DayState {
  const r = s.sessions[date];
  if (r?.status === 'completada') return 'completada';
  if (s.restDays[date]) return 'descanso';
  if (r?.status === 'iniciada') return 'iniciada';
  return date > today ? 'futuro' : 'sin-empezar';
}

/** Días del plan transcurridos hasta hoy (incluido). Nunca cuenta días futuros. */
export function elapsedPlanDays(s: AppState, today = todayISO()): number {
  const pos = planPosition(s.settings.startDate, today);
  if (pos.kind === 'en-curso') return pos.planDay;
  if (pos.kind === 'terminado') return 84;
  return 0;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type SkillPoint = { week: number; listening: number | null; speaking: number | null; reading: number | null; writing: number | null };

/**
 * Evolución de habilidades por semana, en escala 1–5, solo con datos registrados:
 * listening = media de comprensión de las sesiones (y % de la evaluación convertido a 1–5),
 * speaking = media de confianza de las sesiones y autoevaluación de speaking,
 * reading / writing = autoevaluación de la evaluación semanal.
 */
export function skillSeries(s: AppState): SkillPoint[] {
  return WEEKS.map(({ week }) => {
    const sess = Object.values(s.sessions).filter((r) => r.week === week);
    const ev = s.evaluations[week];
    const listen: number[] = sess.map((r) => r.listening.comprehension).filter((x) => x > 0);
    if (ev?.listening.comprehension) listen.push(Math.max(1, Math.round((ev.listening.comprehension / 100) * 5)));
    const speak = sess.map((r) => r.speaking.confidence).filter((x) => x > 0);
    const sp = ev?.speaking;
    const evSpeak = sp ? [sp.fluency, sp.vocabulary, sp.grammar, sp.pronunciation, sp.confidence].filter((x) => x > 0) : [];
    const evSpeakAvg = avg(evSpeak);
    if (evSpeakAvg !== null) speak.push(evSpeakAvg);
    return {
      week,
      listening: avg(listen),
      speaking: avg(speak),
      reading: ev?.selfRatings?.reading || null,
      writing: ev?.selfRatings?.writing || null,
    };
  });
}

export function evaluationScores(s: AppState, week: number) {
  const ev = s.evaluations[week];
  if (!ev) return null;
  const vocabN = ev.vocabulary.length;
  const recalled = ev.vocabulary.filter((v) => v.recalled).length;
  const used = ev.vocabulary.filter((v) => v.usedCorrectly).length;
  const gram = ev.grammar.filter((g) => g.answer.trim() !== '');
  const gramOk = gram.filter((g) => g.correct).length;
  const sp = ev.speaking;
  const spVals = [sp.fluency, sp.vocabulary, sp.grammar, sp.pronunciation, sp.confidence].filter((x) => x > 0);
  return {
    vocabRecall: vocabN ? Math.round((recalled / vocabN) * 100) : null,
    vocabUse: vocabN ? Math.round((used / vocabN) * 100) : null,
    vocabN,
    grammar: gram.length ? Math.round((gramOk / gram.length) * 100) : null,
    grammarAnswered: gram.length,
    grammarOk: gramOk,
    grammarByKey: gram.filter((g) => g.checkedBy === 'clave').length,
    listening: ev.listening.comprehension || null,
    speaking: avg(spVals),
    writingDone: ev.writing.answer.trim().length > 0,
  };
}

/** Repasos realizados por fecha (de los historiales reales). */
export function reviewsByDate(s: AppState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of Object.values(s.vocab)) for (const h of v.reviewHistory) out[h.date] = (out[h.date] ?? 0) + 1;
  return out;
}
