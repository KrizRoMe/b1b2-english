import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReviewResult, VocabRecord } from '../../lib/types';
import { reviewExpression } from '../../lib/store';
import { INTERVALS, RESULT_LABEL, STATUS_LABEL } from '../../lib/spacedRepetition';
import { categoryName } from '../../lib/plan';
import { addDays, formatShort } from '../../lib/dates';
import { Badge, Button } from '../ui/primitives';

const RESULTS: { r: ReviewResult; cls: string }[] = [
  { r: 'no-recuerdo', cls: 'border-red-200 text-red-700 hover:bg-red-50' },
  { r: 'dificil', cls: 'border-amber-200 text-[#b45309] hover:bg-amber-50' },
  { r: 'normal', cls: 'border-learn/30 text-learn hover:bg-learn-soft/50' },
  { r: 'facil', cls: 'border-progress/30 text-[#15803d] hover:bg-progress-soft/60' },
];

function previewNext(rec: VocabRecord, r: ReviewResult, date: string) {
  const max = INTERVALS.length - 1;
  const stage = r === 'facil' ? Math.min(max, rec.reviewStage + 2) : r === 'normal' ? Math.min(max, rec.reviewStage + 1) : r === 'dificil' ? Math.max(0, rec.reviewStage - 1) : 0;
  return formatShort(addDays(date, INTERVALS[stage]));
}

/** Tarjetas de repaso una a una: primero intentas recordar, luego ves la respuesta y te autoevalúas. */
export function ReviewDeck({ queue, date, onReviewed }: { queue: VocabRecord[]; date: string; onReviewed?: (id: string, r: ReviewResult) => void }) {
  const [revealed, setRevealed] = useState(false);
  const current = queue[0];
  if (!current) return null;

  const answer = (r: ReviewResult) => {
    reviewExpression(current.id, r, date);
    onReviewed?.(current.id, r);
    setRevealed(false);
  };

  return (
    <div>
      <p className="mb-2 text-[12.5px] text-muted">
        {queue.length} {queue.length === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge tone="blue">{categoryName(current.category)}</Badge>
            <Badge>{STATUS_LABEL[current.status]}</Badge>
            <Badge>{current.timesReviewed} {current.timesReviewed === 1 ? 'repaso' : 'repasos'}</Badge>
          </div>
          <p className="text-xl font-semibold text-ink">{current.en}</p>
          {!revealed ? (
            <div className="mt-4">
              <p className="text-[13.5px] text-muted">Intenta recordar el significado y piensa una frase antes de mirar.</p>
              <Button className="mt-3" variant="learn" onClick={() => setRevealed(true)}>Mostrar significado</Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-[15px] text-ink">{current.es}</p>
              {current.example && (
                <p className="text-[13.5px] text-slate-700">
                  <span className="italic">“{current.example}”</span>
                  {current.exampleEs && <span className="block text-muted">{current.exampleEs}</span>}
                </p>
              )}
              {current.ownSentence && <p className="text-[13px] text-muted">Tu frase: “{current.ownSentence}”</p>}
              <p className="pt-2 text-[13px] font-medium text-ink">¿Qué tal la recordaste?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RESULTS.map(({ r, cls }) => (
                  <button key={r} type="button" onClick={() => answer(r)} className={`rounded-xl border bg-surface px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${cls}`}>
                    {RESULT_LABEL[r]}
                    <span className="block text-[11.5px] font-normal text-muted">Vuelve el {previewNext(current, r, date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
