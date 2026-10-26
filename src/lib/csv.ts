import type { AppState, LearningStatus, VocabRecord } from './types';
import { CATEGORIES } from './plan';
import { addDays, formatHour, isValidISO, todayISO } from './dates';
import { normalizeState } from './store';

// ───────────────────────── CSV genérico ─────────────────────────

function escapeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(','), ...rows.map((r) => columns.map((c) => escapeCell(r[c])).join(','))].join('\r\n');
}

/** Parser CSV (RFC 4180): comillas, comillas escapadas, saltos de línea dentro de celdas. Detecta "," o ";". */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('El CSV tiene comillas sin cerrar.');
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ───────────────────────── Vocabulario ─────────────────────────

export const VOCAB_COLUMNS = [
  'id', 'en', 'es', 'category', 'level', 'example', 'exampleEs', 'context',
  'status', 'activeUse', 'addedAt', 'nextReview', 'timesReviewed', 'ownSentence', 'source',
];

export function vocabToCSV(vocab: VocabRecord[]): string {
  return '﻿' + toCSV(vocab.map((v) => ({ ...v, activeUse: v.activeUse ? 'si' : 'no' })), VOCAB_COLUMNS);
}

const STATUSES: LearningStatus[] = ['nueva', 'aprendiendo', 'necesita-repaso', 'aprendida', 'dominada'];

export type ImportPreview = {
  records: VocabRecord[];
  duplicatesInBank: string[];
  duplicatesInFile: string[];
  errors: string[];
  warnings: string[];
};

function resolveCategory(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (CATEGORIES[v]) return v;
  const byName = Object.entries(CATEGORIES).find(([, name]) => name.toLowerCase() === v.toLowerCase());
  return byName ? byName[0] : null;
}

function rowToRecord(row: Record<string, string>, line: number, errors: string[], warnings: string[], idx: number): VocabRecord | null {
  const en = (row.en ?? '').trim();
  const es = (row.es ?? '').trim();
  if (!en || !es) {
    errors.push(`Fila ${line}: faltan "en" o "es".`);
    return null;
  }
  let category = resolveCategory(row.category ?? '');
  if (!category) {
    if ((row.category ?? '').trim()) warnings.push(`Fila ${line}: categoría "${row.category}" desconocida; se asigna "Conversación cotidiana".`);
    category = 'conversacion-cotidiana';
  }
  const statusRaw = (row.status ?? '').trim() as LearningStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : 'nueva';
  if (row.status && !STATUSES.includes(statusRaw)) warnings.push(`Fila ${line}: estado "${row.status}" no válido; se usa "nueva".`);
  const today = todayISO();
  const nextReview = row.nextReview && isValidISO(row.nextReview.trim()) ? row.nextReview.trim() : status === 'nueva' ? null : addDays(today, 1);
  return {
    id: (row.id ?? '').trim() || `u-${Date.now().toString(36)}-${idx}`,
    en,
    es,
    category,
    level: (row.level ?? '').trim() || 'B1+',
    week: 0,
    day: 0,
    example: (row.example ?? '').trim(),
    exampleEs: (row.exampleEs ?? '').trim(),
    context: (row.context ?? '').trim(),
    status,
    addedAt: row.addedAt && isValidISO(row.addedAt.trim()) ? row.addedAt.trim() : today,
    nextReview,
    reviewStage: 0,
    reviewHistory: [],
    ownSentence: (row.ownSentence ?? '').trim(),
    timesReviewed: Number.parseInt(row.timesReviewed ?? '0', 10) || 0,
    lastReviewed: null,
    source: 'usuario',
    activeUse: /^(si|sí|true|1|yes)$/i.test((row.activeUse ?? '').trim()),
  };
}

function preview(rows: Record<string, string>[], firstLine: number, bank: Record<string, VocabRecord>): ImportPreview {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const duplicatesInFile: string[] = [];
  const duplicatesInBank: string[] = [];
  const records: VocabRecord[] = [];
  rows.forEach((row, i) => {
    const rec = rowToRecord(row, i + firstLine, errors, warnings, i);
    if (!rec) return;
    if (seen.has(rec.id)) {
      duplicatesInFile.push(rec.id);
      return;
    }
    seen.add(rec.id);
    if (bank[rec.id]) duplicatesInBank.push(rec.id);
    // Mantiene el progreso real si el registro existente pertenece al plan.
    if (bank[rec.id]?.source === 'plan') rec.source = 'plan';
    records.push(rec);
  });
  return { records, duplicatesInBank, duplicatesInFile, errors, warnings };
}

export function previewCSV(text: string, bank: Record<string, VocabRecord>): ImportPreview {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('El CSV está vacío o solo tiene la cabecera.');
  const header = rows[0].map((h) => h.trim());
  const missing = ['en', 'es'].filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}. La cabecera debe incluir al menos "en" y "es".`);
  const objects = rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  return preview(objects, 2, bank);
}

export type JsonImport =
  | { kind: 'backup'; state: AppState }
  | { kind: 'vocab'; preview: ImportPreview };

export function parseJSONImport(text: string, bank: Record<string, VocabRecord>): JsonImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && 'settings' in data && 'vocab' in data) {
    return { kind: 'backup', state: normalizeState(data) };
  }
  const list = Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as { expressions?: unknown }).expressions) ? (data as { expressions: unknown[] }).expressions : null;
  if (!list) throw new Error('El JSON no es una copia de seguridad de la app ni una lista de expresiones.');
  const rows = list.map((item) => {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '']));
  });
  return { kind: 'vocab', preview: preview(rows, 1, bank) };
}

// ───────────────────────── Descargas ─────────────────────────

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupJSON(state: AppState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString(), app: 'b1b2-english' }, null, 2);
}

/** Calendario .ics con las 84 sesiones del plan a la hora programada (sin notificaciones push). */
export function sessionsICS(state: AppState): string {
  const { startDate, scheduledHour, dailyMinutes } = state.settings;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hh = String(scheduledHour).padStart(2, '0');
  const endMin = scheduledHour * 60 + dailyMinutes;
  const eh = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
  const em = String(endMin % 60).padStart(2, '0');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//b1b2-english//Mi camino de B1+ a B2//ES', 'CALSCALE:GREGORIAN'];
  for (let i = 0; i < 84; i++) {
    const day = addDays(startDate, i).replace(/-/g, '');
    const week = Math.floor(i / 7) + 1;
    lines.push(
      'BEGIN:VEVENT',
      `UID:b1b2-${day}@b1b2-english`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${hh}0000`,
      `DTEND:${day}T${eh}${em}00`,
      `SUMMARY:Inglés B1+→B2 · Día ${i + 1} (semana ${week})`,
      `DESCRIPTION:Sesión de ${dailyMinutes} min a las ${formatHour(scheduledHour)}: listening\\, vocabulario\\, repaso y speaking.`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Tu sesión de inglés empieza ahora',
      'TRIGGER:-PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
