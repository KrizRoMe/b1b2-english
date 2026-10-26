import { useMemo } from 'react';
import { useAppState } from '../../lib/store';
import { isDue, INTERVALS, STATUS_LABEL } from '../../lib/spacedRepetition';
import { addDays, formatDay, formatShort } from '../../lib/dates';
import { href } from '../../lib/router';
import { Badge, Card, CardTitle, EmptyState, PageHeader } from '../ui/primitives';
import { useToday } from '../useToday';
import { ReviewDeck } from './ReviewDeck';

export function ReviewsView() {
  const s = useAppState();
  const today = useToday();
  const all = useMemo(() => Object.values(s.vocab), [s.vocab]);
  const queue = useMemo(() => all.filter((v) => isDue(v, today)).sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? '')), [all, today]);
  const overdue = queue.filter((v) => (v.nextReview ?? '') < today).length;
  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i + 1);
    return { d, n: all.filter((v) => v.status !== 'nueva' && v.nextReview === d).length };
  });
  const needs = all.filter((v) => v.status === 'necesita-repaso');
  const inCycle = all.filter((v) => v.status !== 'nueva').length;

  return (
    <div>
      <PageHeader
        title="Repasos pendientes"
        sub={`Repetición espaciada: cada expresión vuelve tras ${INTERVALS.join(', ')} días según cómo la recuerdes. Nada pasa a «dominada» solo por leerla.`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle icon="repeat" sub={overdue ? `${overdue} venían de días anteriores; no pasa nada, repásalas a tu ritmo.` : formatDay(today)}>
              Para repasar hoy ({queue.length})
            </CardTitle>
            {queue.length ? (
              <ReviewDeck queue={queue} date={today} />
            ) : inCycle === 0 ? (
              <EmptyState icon="book" title="Aún no hay expresiones en repaso" action={<a className="text-[13.5px] font-medium text-learn hover:underline" href={href('sesion')}>Ir a la sesión de hoy</a>}>
                Cuando estudies expresiones en el bloque de vocabulario, aparecerán aquí al día siguiente.
              </EmptyState>
            ) : (
              <EmptyState icon="check" title="Todo al día">No tienes repasos pendientes hoy. Las siguientes vuelven según el calendario de la derecha.</EmptyState>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardTitle icon="calendar">Próximos 7 días</CardTitle>
            {inCycle === 0 ? (
              <p className="text-[13.5px] text-muted">Sin datos todavía.</p>
            ) : (
              <ul className="space-y-1.5 text-[13.5px]">
                {upcoming.map(({ d, n }) => (
                  <li key={d} className="flex items-center justify-between">
                    <span className="text-slate-700">{formatShort(d)}</span>
                    <span className="tabular-nums text-muted">{n} {n === 1 ? 'expresión' : 'expresiones'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle icon="alert" sub="Las marcaste como difíciles o no las recordaste en el último repaso.">Necesitan repaso ({needs.length})</CardTitle>
            {needs.length === 0 ? (
              <p className="text-[13.5px] text-muted">Ninguna por ahora.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto text-[13px]">
                {needs.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate"><b className="font-medium">{v.en}</b> <span className="text-muted">· {v.es}</span></span>
                    <Badge tone="amber">{v.nextReview ? formatShort(v.nextReview) : STATUS_LABEL[v.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
