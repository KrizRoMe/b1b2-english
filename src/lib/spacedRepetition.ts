import type { LearningStatus, ReviewResult, VocabRecord } from './types';
import { addDays } from './dates';

/** Intervalos de repaso en días: la expresión reaparece tras 1, 3, 7, 14 y 30 días. */
export const INTERVALS = [1, 3, 7, 14, 30] as const;
const MAX_STAGE = INTERVALS.length - 1;

export const RESULT_LABEL: Record<ReviewResult, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  'no-recuerdo': 'No la recuerdo',
};

export const STATUS_LABEL: Record<LearningStatus, string> = {
  nueva: 'Nueva',
  aprendiendo: 'Aprendiendo',
  'necesita-repaso': 'Necesita repaso',
  aprendida: 'Aprendida',
  dominada: 'Dominada',
};

const isGood = (r: ReviewResult) => r === 'facil' || r === 'normal';

/**
 * Estado derivado del historial real de repasos.
 * - "aprendida" exige al menos 2 repasos con resultado fácil/normal (y el último bueno).
 * - "dominada" exige haber superado la etapa de 30 días: 4+ repasos buenos y los 2 últimos buenos.
 * Leer una expresión nunca la marca como dominada.
 */
export function deriveStatus(history: VocabRecord['reviewHistory'], stage: number): LearningStatus {
  if (history.length === 0) return 'aprendiendo';
  const last = history[history.length - 1].result;
  if (!isGood(last)) return 'necesita-repaso';
  const good = history.filter((h) => isGood(h.result)).length;
  const lastTwoGood = history.length >= 2 && isGood(history[history.length - 2].result);
  if (good >= 4 && lastTwoGood && stage >= MAX_STAGE) return 'dominada';
  if (good >= 2) return 'aprendida';
  return 'aprendiendo';
}

/** Aplica un repaso y programa el siguiente. */
export function applyReview(rec: VocabRecord, result: ReviewResult, today: string): VocabRecord {
  let stage = rec.reviewStage;
  if (result === 'facil') stage = Math.min(MAX_STAGE, stage + 2);
  else if (result === 'normal') stage = Math.min(MAX_STAGE, stage + 1);
  else if (result === 'dificil') stage = Math.max(0, stage - 1);
  else stage = 0;

  const reviewHistory = [...rec.reviewHistory, { date: today, result }];
  return {
    ...rec,
    reviewStage: stage,
    reviewHistory,
    timesReviewed: rec.timesReviewed + 1,
    lastReviewed: today,
    nextReview: addDays(today, INTERVALS[stage]),
    status: deriveStatus(reviewHistory, stage),
  };
}

/** Estudiada por primera vez en la sesión: entra en el ciclo de repaso (mañana). */
export function markStudied(rec: VocabRecord, today: string, needsReview: boolean): VocabRecord {
  const firstTime = rec.status === 'nueva';
  return {
    ...rec,
    status: needsReview ? 'necesita-repaso' : rec.reviewHistory.length ? deriveStatus(rec.reviewHistory, rec.reviewStage) : 'aprendiendo',
    reviewStage: firstTime ? 0 : rec.reviewStage,
    nextReview: needsReview || firstTime || !rec.nextReview ? addDays(today, INTERVALS[0]) : rec.nextReview,
  };
}

export function isDue(rec: VocabRecord, date: string): boolean {
  return rec.status !== 'nueva' && rec.nextReview !== null && rec.nextReview <= date;
}

export const isStudied = (rec: VocabRecord) => rec.status !== 'nueva';
