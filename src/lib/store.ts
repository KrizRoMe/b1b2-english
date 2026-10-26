import { useSyncExternalStore } from 'react';
import type { AppState, EvaluationRecord, ReviewResult, SessionRecord, Settings, VocabRecord } from './types';
import { DEFAULT_SETTINGS } from './types';
import { PLAN_EXPRESSIONS, PLAN_IDS, speakingQuestionFor } from './plan';
import { planPosition, todayISO } from './dates';
import { applyReview, markStudied } from './spacedRepetition';
import { evaluateAchievements } from './achievements';

export const STORAGE_KEY = 'b1b2-english:v1';
export const STATE_VERSION = 1;
const SAVE_DEBOUNCE_MS = 400;

// ───────────────────────── Estado inicial ─────────────────────────

function planRecord(e: (typeof PLAN_EXPRESSIONS)[number], addedAt: string): VocabRecord {
  return {
    ...e,
    status: 'nueva',
    addedAt,
    nextReview: null,
    reviewStage: 0,
    reviewHistory: [],
    ownSentence: '',
    timesReviewed: 0,
    lastReviewed: null,
    source: 'plan',
    activeUse: false,
  };
}

/** Expresiones claramente marcadas como datos de demostración (se pueden borrar en Configuración). */
const DEMO: Omit<VocabRecord, 'addedAt'>[] = [
  ['demo-01', 'Hit the nail on the head', 'Dar en el clavo', 'conversacion-cotidiana', 'B2', 'You hit the nail on the head: the problem is the timetable.', 'Has dado en el clavo: el problema es el horario.', 'Cuando alguien describe algo con total exactitud.'],
  ['demo-02', 'Once in a blue moon', 'Muy de vez en cuando', 'conversacion-cotidiana', 'B2', 'I only eat fast food once in a blue moon.', 'Solo como comida rápida muy de vez en cuando.', 'Algo que ocurre muy raramente; informal.'],
  ['demo-03', 'Get the hang of', 'Pillarle el truco a', 'habitos-aprendizaje', 'B1+', 'After a week, I got the hang of the new app.', 'Después de una semana, le pillé el truco a la nueva aplicación.', 'Aprender a hacer algo tras practicar un poco.'],
  ['demo-04', 'Call it a day', 'Dejarlo por hoy', 'trabajo-estudios', 'B1+', "We've done enough. Let's call it a day.", 'Ya hemos hecho suficiente. Dejémoslo por hoy.', 'Terminar de trabajar o de hacer algo por hoy.'],
  ['demo-05', 'Under the weather', 'Pachucho / algo enfermo', 'emociones-relaciones', 'B1+', "I'm feeling a bit under the weather today.", 'Hoy me siento un poco pachucho.', 'Encontrarse ligeramente mal; informal.'],
].map(([id, en, es, category, level, example, exampleEs, context]) => ({
  id, en, es, category, level, example, exampleEs, context,
  week: 0, day: 0,
  status: 'nueva' as const,
  nextReview: null, reviewStage: 0, reviewHistory: [], ownSentence: '',
  timesReviewed: 0, lastReviewed: null, source: 'demo' as const, activeUse: false,
}));

export function createInitialState(): AppState {
  const today = todayISO();
  const vocab: Record<string, VocabRecord> = {};
  for (const e of PLAN_EXPRESSIONS) vocab[e.id] = planRecord(e, today);
  for (const d of DEMO) vocab[d.id] = { ...d, addedAt: today };
  return {
    version: STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    sessions: {},
    vocab,
    evaluations: {},
    restDays: {},
    achievements: {},
    lastVisit: null,
    deletedPlanIds: [],
    createdAt: today,
  };
}

// ───────────────────────── Validación / normalización ─────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export class StateShapeError extends Error {}

/** Valida y completa un estado leído de localStorage o de una copia importada. Lanza si la forma no es válida. */
export function normalizeState(input: unknown): AppState {
  if (!isObj(input)) throw new StateShapeError('El contenido no es un objeto JSON.');
  if (!isObj(input.settings) || !isObj(input.sessions) || !isObj(input.vocab)) {
    throw new StateShapeError('Faltan secciones obligatorias (settings, sessions, vocab).');
  }
  const s = input as unknown as AppState;
  const today = todayISO();
  const deleted = new Set(Array.isArray(s.deletedPlanIds) ? s.deletedPlanIds : []);
  const vocab: Record<string, VocabRecord> = {};
  for (const [id, rec] of Object.entries(s.vocab)) {
    if (!isObj(rec) || typeof rec.en !== 'string') continue;
    const r = rec as unknown as VocabRecord;
    vocab[id] = {
      ...r,
      id,
      reviewHistory: Array.isArray(r.reviewHistory) ? r.reviewHistory : [],
      ownSentence: r.ownSentence ?? '',
      timesReviewed: r.timesReviewed ?? 0,
      reviewStage: r.reviewStage ?? 0,
      nextReview: r.nextReview ?? null,
      lastReviewed: r.lastReviewed ?? null,
      source: r.source ?? (PLAN_IDS.has(id) ? 'plan' : 'usuario'),
    };
  }
  // Completa expresiones del plan que falten (y rellena ejemplos vacíos con los del plan).
  for (const e of PLAN_EXPRESSIONS) {
    if (deleted.has(e.id)) continue;
    const cur = vocab[e.id];
    if (!cur) vocab[e.id] = planRecord(e, s.createdAt ?? today);
    else if (cur.source === 'plan') {
      vocab[e.id] = {
        ...cur,
        example: cur.example || e.example,
        exampleEs: cur.exampleEs || e.exampleEs,
        context: cur.context || e.context,
      };
    }
  }
  return {
    version: STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(s.settings as Partial<Settings>) },
    sessions: s.sessions,
    vocab,
    evaluations: isObj(s.evaluations) ? s.evaluations : {},
    restDays: isObj(s.restDays) ? s.restDays : {},
    achievements: isObj(s.achievements) ? s.achievements : {},
    lastVisit: typeof s.lastVisit === 'string' ? s.lastVisit : null,
    deletedPlanIds: [...deleted],
    createdAt: s.createdAt ?? today,
  };
}

// ───────────────────────── Persistencia ─────────────────────────

export type StorageStatus =
  | { kind: 'ok' }
  | { kind: 'sin-acceso'; message: string }
  | { kind: 'recuperado'; message: string; backupKey: string | null; raw: string }
  | { kind: 'error-escritura'; message: string };

type Snapshot = { state: AppState; storage: StorageStatus; lastSavedAt: number | null; previousVisit: string | null };

function readInitial(): Snapshot {
  if (typeof window === 'undefined') {
    return { state: createInitialState(), storage: { kind: 'ok' }, lastSavedAt: null, previousVisit: null };
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      state: createInitialState(),
      storage: {
        kind: 'sin-acceso',
        message: 'El navegador no permite usar el almacenamiento local (¿modo privado o cookies bloqueadas?). Puedes usar la app, pero los cambios se perderán al cerrar la pestaña. Exporta una copia de seguridad antes de salir.',
      },
      lastSavedAt: null,
      previousVisit: null,
    };
  }
  if (raw === null) return { state: createInitialState(), storage: { kind: 'ok' }, lastSavedAt: null, previousVisit: null };
  try {
    const state = normalizeState(JSON.parse(raw));
    return { state, storage: { kind: 'ok' }, lastSavedAt: null, previousVisit: state.lastVisit };
  } catch (err) {
    // No borramos nada: guardamos el contenido dañado en otra clave antes de continuar.
    let backupKey: string | null = `${STORAGE_KEY}:corrupto:${Date.now()}`;
    try {
      window.localStorage.setItem(backupKey, raw);
    } catch {
      backupKey = null;
    }
    return {
      state: createInitialState(),
      storage: {
        kind: 'recuperado',
        message: `Los datos guardados no se pudieron leer (${err instanceof Error ? err.message : 'JSON inválido'}). Se ha empezado con un estado vacío. ${backupKey ? 'Una copia del contenido original se guardó aparte en este navegador.' : 'No se pudo guardar una copia aparte.'} Puedes descargarla desde Configuración.`,
        backupKey,
        raw,
      },
      lastSavedAt: null,
      previousVisit: null,
    };
  }
}

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function getSnapshot(): Snapshot {
  if (!snapshot) {
    snapshot = readInitial();
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', flushSave);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushSave();
      });
    }
  }
  return snapshot;
}

function emit() {
  for (const l of listeners) l();
}

function writeNow() {
  saveTimer = null;
  const snap = getSnapshot();
  if (snap.storage.kind === 'sin-acceso') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap.state));
    snapshot = {
      ...snap,
      lastSavedAt: Date.now(),
      storage: snap.storage.kind === 'error-escritura' ? { kind: 'ok' } : snap.storage,
    };
  } catch (err) {
    const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
    snapshot = {
      ...snap,
      storage: {
        kind: 'error-escritura',
        message: quota
          ? 'El almacenamiento del navegador está lleno. Tus cambios siguen en esta pestaña: exporta una copia de seguridad para no perderlos.'
          : 'No se pudieron guardar los cambios en este navegador. Exporta una copia de seguridad para no perderlos.',
      },
    };
  }
  emit();
}

export function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    writeNow();
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, SAVE_DEBOUNCE_MS);
}

type AchievementListener = (ids: string[]) => void;
const achievementListeners = new Set<AchievementListener>();
export function onAchievements(fn: AchievementListener) {
  achievementListeners.add(fn);
  return () => {
    achievementListeners.delete(fn);
  };
}

/** Único punto de escritura: aplica el cambio, recalcula logros y programa el autoguardado. */
export function update(fn: (s: AppState) => AppState) {
  const snap = getSnapshot();
  let next = fn(snap.state);
  if (next === snap.state) return;
  const unlocked = evaluateAchievements(next);
  const fresh = unlocked.filter((id) => !next.achievements[id]);
  if (fresh.length) {
    const today = todayISO();
    next = { ...next, achievements: { ...next.achievements, ...Object.fromEntries(fresh.map((id) => [id, today])) } };
  }
  snapshot = { ...snap, state: next };
  scheduleSave();
  emit();
  if (fresh.length) for (const l of achievementListeners) l(fresh);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const serverSnapshot: Snapshot = { state: createInitialState(), storage: { kind: 'ok' }, lastSavedAt: null, previousVisit: null };

export function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function useAppState(): AppState {
  return useSnapshot().state;
}

export function getState(): AppState {
  return getSnapshot().state;
}

export function dismissStorageWarning() {
  const snap = getSnapshot();
  snapshot = { ...snap, storage: { kind: 'ok' } };
  emit();
}

// ───────────────────────── Acciones ─────────────────────────

export function markVisit() {
  const today = todayISO();
  update((s) => (s.lastVisit === today ? s : { ...s, lastVisit: today }));
}

export function setSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

/** Cambia la fecha de inicio y recoloca cada sesión registrada en su semana/día del plan. */
export function changeStartDate(startDate: string) {
  update((s) => {
    const sessions: Record<string, SessionRecord> = {};
    for (const [d, r] of Object.entries(s.sessions)) {
      const pos = planPosition(startDate, d);
      sessions[d] = { ...r, week: pos.kind === 'en-curso' ? pos.week : 0, day: pos.kind === 'en-curso' ? pos.planDay : 0 };
    }
    return { ...s, settings: { ...s.settings, startDate }, sessions };
  });
}

export function planExpressionIdsForDay(s: AppState, planDay: number): string[] {
  return Object.values(s.vocab)
    .filter((v) => v.source === 'plan' && v.day === planDay)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => v.id);
}

export function newSession(s: AppState, date: string): SessionRecord {
  const pos = planPosition(s.settings.startDate, date);
  const week = pos.kind === 'en-curso' ? pos.week : 0;
  const day = pos.kind === 'en-curso' ? pos.planDay : 0;
  const dayInWeek = pos.kind === 'en-curso' ? pos.dayInWeek : 1;
  return {
    date,
    week,
    day,
    startedAt: new Date().toISOString(),
    completedAt: null,
    minutes: 0,
    listening: { videoTitle: '', videoUrl: '', minutesWatched: 0, notes: '', comprehension: 0 },
    vocabulary: {
      expressionIds: day ? planExpressionIdsForDay(s, day).slice(0, Math.max(1, s.settings.dailyExpressions)) : [],
      learned: [],
      toReview: [],
    },
    review: { reviewed: [], hard: [] },
    speaking: { question: speakingQuestionFor(week || 12, dayInWeek), answer: '', spoke: false, notes: '', confidence: 0 },
    personalNotes: '',
    status: 'iniciada',
  };
}

export function startSession(date: string) {
  update((s) => {
    const existing = s.sessions[date];
    if (existing && existing.status !== 'sin-empezar') return s;
    return { ...s, sessions: { ...s.sessions, [date]: newSession(s, date) } };
  });
}

export function updateSession(date: string, fn: (r: SessionRecord) => SessionRecord) {
  update((s) => {
    const cur = s.sessions[date];
    if (!cur) return s;
    return { ...s, sessions: { ...s.sessions, [date]: fn(cur) } };
  });
}

export function completeSession(date: string, minutes: number) {
  updateSession(date, (r) => ({ ...r, status: 'completada', completedAt: new Date().toISOString(), minutes }));
}

export function reopenSession(date: string) {
  updateSession(date, (r) => ({ ...r, status: 'iniciada', completedAt: null }));
}

export function deleteSession(date: string) {
  update((s) => {
    if (!s.sessions[date]) return s;
    const sessions = { ...s.sessions };
    delete sessions[date];
    return { ...s, sessions };
  });
}

export function setRestDay(date: string, rest: boolean) {
  update((s) => {
    const restDays = { ...s.restDays };
    if (rest) restDays[date] = true;
    else delete restDays[date];
    return { ...s, restDays };
  });
}

export function upsertVocab(rec: VocabRecord) {
  update((s) => ({ ...s, vocab: { ...s.vocab, [rec.id]: rec } }));
}

export function patchVocab(id: string, patch: Partial<VocabRecord>) {
  update((s) => {
    const cur = s.vocab[id];
    if (!cur) return s;
    return { ...s, vocab: { ...s.vocab, [id]: { ...cur, ...patch } } };
  });
}

export function deleteVocab(id: string) {
  update((s) => {
    if (!s.vocab[id]) return s;
    const vocab = { ...s.vocab };
    const wasPlan = vocab[id].source === 'plan';
    delete vocab[id];
    return {
      ...s,
      vocab,
      deletedPlanIds: wasPlan ? [...new Set([...(s.deletedPlanIds ?? []), id])] : s.deletedPlanIds,
    };
  });
}

export function removeDemoData() {
  update((s) => ({
    ...s,
    vocab: Object.fromEntries(Object.entries(s.vocab).filter(([, v]) => v.source !== 'demo')),
  }));
}

export function restoreDeletedPlan() {
  update((s) => normalizeState({ ...s, deletedPlanIds: [] }));
}

/** "Marcar como aprendida" / "Necesita repasarla" en el bloque de vocabulario de la sesión. */
export function studyInSession(date: string, id: string, needsReview: boolean) {
  update((s) => {
    const rec = s.vocab[id];
    if (!rec) return s;
    const session = s.sessions[date];
    const vocab = { ...s.vocab, [id]: markStudied(rec, date, needsReview) };
    if (!session) return { ...s, vocab };
    const v = session.vocabulary;
    const learned = needsReview ? v.learned.filter((x) => x !== id) : [...new Set([...v.learned, id])];
    const toReview = needsReview ? [...new Set([...v.toReview, id])] : v.toReview.filter((x) => x !== id);
    return {
      ...s,
      vocab,
      sessions: { ...s.sessions, [date]: { ...session, vocabulary: { ...v, learned, toReview } } },
    };
  });
}

export function reviewExpression(id: string, result: ReviewResult, date: string) {
  update((s) => {
    const rec = s.vocab[id];
    if (!rec) return s;
    const vocab = { ...s.vocab, [id]: applyReview(rec, result, date) };
    const session = s.sessions[date];
    if (!session || session.status === 'descanso') return { ...s, vocab };
    const reviewed = [...new Set([...session.review.reviewed, id])];
    const hard = result === 'dificil' || result === 'no-recuerdo'
      ? [...new Set([...session.review.hard, id])]
      : session.review.hard.filter((x) => x !== id);
    return { ...s, vocab, sessions: { ...s.sessions, [date]: { ...session, review: { reviewed, hard } } } };
  });
}

export function emptyEvaluation(week: number): EvaluationRecord {
  return {
    week,
    date: todayISO(),
    vocabulary: [],
    listening: { audioTitle: '', audioUrl: '', topic: '', comprehension: 0, summary: '', unknownWords: '' },
    speaking: { topic: '', minutes: 0, fluency: 0, vocabulary: 0, grammar: 0, pronunciation: 0, confidence: 0 },
    writing: { task: '', answer: '', errorsFound: '' },
    grammar: [],
    strengths: '',
    improvements: '',
    recommendations: '',
    selfRatings: { reading: 0, writing: 0 },
    completedAt: null,
  };
}

export function updateEvaluation(week: number, fn: (e: EvaluationRecord) => EvaluationRecord) {
  update((s) => {
    const cur = s.evaluations[week] ?? emptyEvaluation(week);
    return { ...s, evaluations: { ...s.evaluations, [week]: fn(cur) } };
  });
}

export function deleteEvaluation(week: number) {
  update((s) => {
    const evaluations = { ...s.evaluations };
    delete evaluations[week];
    return { ...s, evaluations };
  });
}

/** Sustituye todo el estado (importación de copia de seguridad). */
export function replaceState(next: AppState) {
  update(() => next);
}

export function resetAll() {
  update(() => createInitialState());
}
