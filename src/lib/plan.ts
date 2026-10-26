import raw from './data.json';
import type { Expression, PlanData, WeekPlan } from './types';

export const plan = raw as PlanData;

export const CATEGORIES = plan.categories;
export const WEEKS: WeekPlan[] = plan.weeks;
export const PLAN_EXPRESSIONS: Expression[] = plan.expressions;
export const PLAN_IDS = new Set(PLAN_EXPRESSIONS.map((e) => e.id));

export function weekPlan(week: number): WeekPlan | undefined {
  return WEEKS.find((w) => w.week === week);
}

export function categoryName(key: string) {
  return CATEGORIES[key] ?? key;
}

/** Pregunta de speaking del día: alterna entre las preguntas de la semana. */
export function speakingQuestionFor(week: number, dayInWeek: number): string {
  const w = weekPlan(week);
  const qs = w?.speakingQuestions.length ? w.speakingQuestions : plan.speakingBank;
  return qs[(dayInWeek - 1) % qs.length] ?? plan.speakingBank[0];
}

/** Preguntas disponibles hasta la semana actual (la complejidad sube con las semanas). */
export function speakingPoolUntil(week: number): string[] {
  const pool = WEEKS.filter((w) => w.week <= Math.max(1, week)).flatMap((w) => w.speakingQuestions);
  return pool.length ? pool : plan.speakingBank;
}
