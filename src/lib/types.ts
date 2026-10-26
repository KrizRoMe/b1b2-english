export interface Expression {
  id: string;
  en: string;
  es: string;
  category: string;
  level: string;
  week: number;
  day: number;
  example: string;
  exampleEs: string;
  context: string;
}

export type LearningStatus = 'nueva' | 'aprendiendo' | 'necesita-repaso' | 'aprendida' | 'dominada';

export type VocabRecord = Expression & {
  status: LearningStatus;
  addedAt: string;
  nextReview: string | null;
  reviewStage: number;
  reviewHistory: { date: string; result: 'facil' | 'normal' | 'dificil' | 'no-recuerdo' }[];
  ownSentence: string;
  timesReviewed: number;
  lastReviewed: string | null;
  /** Origen: banco del plan (data.json), demostración o añadida por el usuario. */
  source?: VocabSource;
  /** El usuario indica que ya la usa activamente al hablar o escribir. */
  activeUse?: boolean;
};

export type VocabSource = 'plan' | 'demo' | 'usuario';
export type ReviewResult = VocabRecord['reviewHistory'][number]['result'];

export type SessionRecord = {
  date: string;
  week: number;
  day: number;
  startedAt: string;
  completedAt: string | null;
  minutes: number;
  listening: {
    videoTitle: string;
    videoUrl: string;
    minutesWatched: number;
    notes: string;
    comprehension: 1 | 2 | 3 | 4 | 5 | 0;
  };
  vocabulary: { expressionIds: string[]; learned: string[]; toReview: string[] };
  review: { reviewed: string[]; hard: string[] };
  speaking: {
    question: string;
    answer: string;
    spoke: boolean;
    notes: string;
    confidence: number;
  };
  personalNotes: string;
  status: 'sin-empezar' | 'iniciada' | 'completada' | 'descanso';
};

export type EvaluationRecord = {
  week: number;
  date: string;
  vocabulary: { expressionId: string; recalled: boolean; usedCorrectly: boolean; note: string }[];
  listening: { audioTitle: string; audioUrl: string; topic: string; comprehension: number; summary: string; unknownWords: string };
  speaking: { topic: string; minutes: number; fluency: number; vocabulary: number; grammar: number; pronunciation: number; confidence: number };
  writing: { task: string; answer: string; errorsFound: string };
  grammar: { exerciseIndex: number; answer: string; correct: boolean; checkedBy?: 'clave' | 'autoevaluacion' }[];
  /** Autoevaluación 1–5 de reading y writing (0 = sin valorar). */
  selfRatings?: { reading: number; writing: number };
  completedAt?: string | null;
  strengths: string;
  improvements: string;
  recommendations: string;
};

export type Settings = {
  startDate: string;
  dailyMinutes: number;
  dailyExpressions: number;
  scheduledHour: number;
  videoResource: string;
  levelFrom: string;
  levelTo: string;
  totalWeeks: number;
};

export type AppState = {
  version: number;
  settings: Settings;
  sessions: Record<string, SessionRecord>;
  vocab: Record<string, VocabRecord>;
  evaluations: Record<number, EvaluationRecord>;
  restDays: Record<string, boolean>;
  achievements: Record<string, string>;
  lastVisit: string | null;
  /** IDs del banco del plan que el usuario ha eliminado (para no volver a añadirlos). */
  deletedPlanIds?: string[];
  createdAt?: string;
};

export type GrammarExercise = { q: string; a: string; why: string };

export type WeekPlan = {
  week: number;
  month: number;
  theme: string;
  objective: string;
  level: string;
  activities: string[];
  speakingQuestions: string[];
  writingTask: string;
  grammar: GrammarExercise[];
  expressionIds: string[];
  dayRange: number[];
};

export type PlanData = {
  categories: Record<string, string>;
  expressions: Expression[];
  weeks: WeekPlan[];
  speakingBank: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  startDate: '',
  dailyMinutes: 30,
  dailyExpressions: 4,
  scheduledHour: 6,
  videoResource: 'English with Thiago',
  levelFrom: 'B1+',
  levelTo: 'B2',
  totalWeeks: 12,
};
