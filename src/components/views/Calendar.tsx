import { useState } from 'react';
import { deleteSession, setRestDay, useAppState } from '../../lib/store';
import { addDays, formatDay, formatMonth, formatTime, fromISO, isValidISO, planPosition, toISO } from '../../lib/dates';
import { dayState, currentStreak, type DayState } from '../../lib/stats';
import { navigate } from '../../lib/router';
import { SegmentedControl } from '../interior/segmented-control';
import { Modal } from '../interior/modal';
import { Badge, Button, Card, PageHeader } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { useToday } from '../useToday';
import { StartDatePrompt } from './Dashboard';
import { COMPREHENSION_LABELS } from './Session';

export const DAY_STYLE: Record<DayState, { label: string; cell: string; dot: string }> = {
  completada: { label: 'Sesión completada', cell: 'bg-progress text-white border-progress', dot: 'bg-progress' },
  iniciada: { label: 'Sesión iniciada', cell: 'bg-learn-soft text-[#1d4ed8] border-learn/40', dot: 'bg-learn' },
  descanso: { label: 'Día de descanso', cell: 'bg-rest-soft text-[#6d28d9] border-rest/40', dot: 'bg-rest' },
  'sin-empezar': { label: 'Sin empezar', cell: 'bg-surface text-ink border-line', dot: 'bg-slate-300' },
  futuro: { label: 'Próximo', cell: 'bg-surface text-slate-400 border-dashed border-line', dot: 'border border-dashed border-slate-300' },
};

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function CalendarView() {
  const s = useAppState();
  const today = useToday();
  const [mode, setMode] = useState<'mes' | 'semanas'>('mes');
  const [selected, setSelected] = useState<string | null>(null);
  const start = s.settings.startDate;
  const initialMonth = (() => {
    const d = fromISO(isValidISO(start) && planPosition(start, today).kind === 'antes' ? start : today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  })();
  const [month, setMonth] = useState(initialMonth);

  if (!isValidISO(start)) {
    return (
      <>
        <PageHeader title="Calendario" />
        <StartDatePrompt />
      </>
    );
  }

  const end = addDays(start, 83);
  const inPlan = (d: string) => d >= start && d <= end;

  const Cell = ({ d, showMonthDay = true }: { d: string; showMonthDay?: boolean }) => {
    const st = dayState(s, d, today);
    const style = DAY_STYLE[st];
    const outside = !inPlan(d);
    return (
      <button
        type="button"
        onClick={() => setSelected(d)}
        aria-label={`${formatDay(d)}: ${style.label}${outside ? ' (fuera del plan)' : ''}`}
        className={`relative aspect-square w-full rounded-lg border text-[13px] font-medium transition hover:ring-2 hover:ring-learn/30 ${style.cell} ${outside && st !== 'completada' ? 'opacity-40' : ''} ${d === today ? 'ring-2 ring-ink/70' : ''}`}
      >
        {showMonthDay ? fromISO(d).getDate() : ''}
      </button>
    );
  };

  // Vista mensual (lunes primero)
  const first = toISO(month);
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthCells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];

  return (
    <div>
      <PageHeader
        title="Calendario"
        sub={`Plan del ${formatDay(start).toLowerCase()} al ${formatDay(end).toLowerCase()}. Racha actual: ${currentStreak(s, today)} días.`}
        action={
          <SegmentedControl
            label="Vista del calendario"
            value={mode}
            onValueChange={(v) => setMode(v as 'mes' | 'semanas')}
            options={[{ value: 'mes', label: 'Mes' }, { value: 'semanas', label: '12 semanas' }]}
          />
        }
      />

      <Card>
        {mode === 'mes' ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <Button size="sm" variant="ghost" icon="chevronLeft" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mes anterior">Anterior</Button>
              <h2 className="text-[15px] font-semibold">{formatMonth(month)}</h2>
              <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mes siguiente">Siguiente <Icon name="chevronRight" size={15} /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-[11.5px] font-medium text-muted">{w}</div>)}
              {monthCells.map((d, i) => (d ? <Cell key={d} d={d} /> : <div key={`e${i}`} />))}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-1.5 text-center text-[11.5px] text-muted">
              <span />
              {Array.from({ length: 7 }, (_, i) => <span key={i}>Día {i + 1}</span>)}
            </div>
            {Array.from({ length: 12 }, (_, w) => (
              <div key={w} className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
                <span className="text-[12px] font-medium text-muted">Sem. {w + 1}</span>
                {Array.from({ length: 7 }, (_, d) => {
                  const iso = addDays(start, w * 7 + d);
                  return <div key={iso} className="max-w-12 justify-self-center w-full"><Cell d={iso} /></div>;
                })}
              </div>
            ))}
          </div>
        )}

        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-[12.5px] text-muted">
          {(Object.keys(DAY_STYLE) as DayState[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${DAY_STYLE[k].dot}`} /> {DAY_STYLE[k].label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">Los días futuros nunca cuentan como perdidos. Si un día no estudias, no se reinicia nada: retomas cuando quieras.</p>
      </Card>

      <DayModal date={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DayModal({ date, onClose }: { date: string | null; onClose: () => void }) {
  const s = useAppState();
  const today = useToday();
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!date) return <Modal open={false} onClose={onClose} title="" />;
  const r = s.sessions[date];
  const st = dayState(s, date, today);
  const pos = planPosition(s.settings.startDate, date);
  const future = date > today;
  const rest = !!s.restDays[date];

  return (
    <Modal
      open={!!date}
      onClose={() => { setConfirmDelete(false); onClose(); }}
      title={formatDay(date)}
      description={pos.kind === 'en-curso' ? `Semana ${pos.week} · día ${pos.planDay} del plan` : 'Fuera del plan de 12 semanas'}
      maxWidth={480}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {!r?.completedAt && (
            <Button
              icon="coffee"
              onClick={() => {
                setRestDay(date, !rest);
                toast(rest ? 'Descanso quitado.' : 'Día marcado como descanso.', 'info');
              }}
            >
              {rest ? 'Quitar descanso' : 'Marcar descanso'}
            </Button>
          )}
          {!future && (
            <Button variant="primary" icon="play" onClick={() => navigate('sesion', date)}>
              {r?.status === 'completada' ? 'Ver sesión' : r ? 'Continuar sesión' : 'Registrar sesión'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-[13.5px]">
        <Badge tone={st === 'completada' ? 'green' : st === 'iniciada' ? 'blue' : st === 'descanso' ? 'violet' : 'slate'}>{DAY_STYLE[st].label}</Badge>
        {future && <p className="text-muted">Día futuro: solo puedes marcarlo como descanso previsto.</p>}
        {r ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Inicio</dt><dd>{formatTime(r.startedAt)}</dd>
            <dt className="text-muted">Minutos</dt><dd>{r.status === 'completada' ? `${r.minutes} min` : 'Sin completar'}</dd>
            <dt className="text-muted">Listening</dt><dd>{r.listening.videoTitle || '—'}{r.listening.comprehension ? ` · ${COMPREHENSION_LABELS[r.listening.comprehension - 1]}` : ''}</dd>
            <dt className="text-muted">Expresiones</dt><dd>{r.vocabulary.learned.length} aprendidas · {r.vocabulary.toReview.length} para repasar</dd>
            <dt className="text-muted">Repasos</dt><dd>{r.review.reviewed.length}</dd>
            <dt className="text-muted">Speaking</dt><dd>{r.speaking.spoke ? 'Practicado' : 'No registrado'}{r.speaking.confidence ? ` · confianza ${r.speaking.confidence}/5` : ''}</dd>
            {r.personalNotes && (<><dt className="text-muted">Notas</dt><dd className="whitespace-pre-wrap">{r.personalNotes}</dd></>)}
          </dl>
        ) : (
          !future && <p className="text-muted">No hay sesión registrada este día.</p>
        )}
        {r && (
          <div className="border-t border-line pt-3">
            {!confirmDelete ? (
              <button type="button" className="text-[12.5px] text-red-700 hover:underline" onClick={() => setConfirmDelete(true)}>Eliminar el registro de este día</button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-red-700">¿Seguro? Se borra el registro de la sesión (el progreso del vocabulario se mantiene).</span>
                <Button size="sm" variant="danger" onClick={() => { deleteSession(date); setConfirmDelete(false); toast('Registro eliminado.', 'info'); }}>Sí, eliminar</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
