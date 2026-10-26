import { useEffect, useMemo, useState } from 'react';
import type { SessionRecord, VocabRecord } from '../../lib/types';
import {
  completeSession, patchVocab, reopenSession, setRestDay, startSession, studyInSession, updateSession, useAppState,
} from '../../lib/store';
import { formatDay, formatHour, formatTime, isValidISO, planPosition } from '../../lib/dates';
import { categoryName, speakingPoolUntil, weekPlan } from '../../lib/plan';
import { isDue, STATUS_LABEL } from '../../lib/spacedRepetition';
import { href, navigate } from '../../lib/router';
import { useWizard } from '../interior/wizard-steps';
import { Modal } from '../interior/modal';
import { HoldToConfirm } from '../interior/hold-to-confirm';
import { useInlineValidation } from '../interior/inline-validation';
import { Badge, Button, Card, CardTitle, EmptyState, Field, Notice, PageHeader, Rating } from '../ui/primitives';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { useToday } from '../useToday';
import { StartDatePrompt } from './Dashboard';
import { ReviewDeck } from './ReviewDeck';
import { Recorder } from './Recorder';

export const COMPREHENSION_LABELS = [
  'No entendí casi nada',
  'Entendí algunas palabras',
  'Entendí la idea general',
  'Entendí casi todo',
  'Entendí prácticamente todo',
];

const BLOCKS: { id: string; label: string; minutes: number; icon: IconName }[] = [
  { id: 'listening', label: 'Listening', minutes: 12, icon: 'headphones' },
  { id: 'vocabulario', label: 'Vocabulario', minutes: 8, icon: 'book' },
  { id: 'repaso', label: 'Repaso', minutes: 5, icon: 'repeat' },
  { id: 'speaking', label: 'Speaking', minutes: 5, icon: 'mic' },
];

const REVIEW_LIMIT = 12;

export function SessionView({ date: param }: { date: string | null }) {
  const s = useAppState();
  const today = useToday();
  const date = param && isValidISO(param) ? param : today;
  const session = s.sessions[date];
  const pos = planPosition(s.settings.startDate, date);
  const isToday = date === today;

  if (date > today) {
    return (
      <>
        <PageHeader title="Sesión" sub={formatDay(date)} />
        <EmptyState icon="calendar" title="Este día todavía no ha llegado" action={<Button onClick={() => navigate('calendario')}>Volver al calendario</Button>}>
          Puedes marcarlo como descanso desde el calendario si ya sabes que no vas a estudiar.
        </EmptyState>
      </>
    );
  }

  if (pos.kind === 'sin-fecha') {
    return (
      <>
        <PageHeader title="Mi sesión de hoy" sub={formatDay(date)} />
        <StartDatePrompt />
      </>
    );
  }

  const title = isToday ? 'Mi sesión de hoy' : 'Sesión de un día anterior';
  const sub = (
    <>
      {formatDay(date)}
      {pos.kind === 'en-curso' && <> · Semana {pos.week}, día {pos.planDay} de 84</>}
      {pos.kind === 'antes' && <> · antes del inicio del plan</>}
      {pos.kind === 'terminado' && <> · después del plan de 12 semanas</>}
    </>
  );

  if (!session) {
    return (
      <>
        <PageHeader title={title} sub={sub} />
        <Card className="border-progress/20">
          <CardTitle icon="play" sub={`${s.settings.dailyMinutes} minutos en 4 bloques: listening 12 · vocabulario 8 · repaso 5 · speaking 5.`}>
            {pos.kind === 'en-curso' ? weekPlan(pos.week)?.theme : 'Sesión libre de repaso'}
          </CardTitle>
          {s.restDays[date] && <div className="mb-4"><Notice tone="blue">Este día está marcado como descanso. Si estudias, la sesión contará igualmente.</Notice></div>}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" icon="play" onClick={() => startSession(date)}>
              {isToday ? 'Empezar mi sesión de hoy' : 'Registrar sesión de este día'}
            </Button>
            {!s.restDays[date] && (
              <Button icon="coffee" onClick={() => { setRestDay(date, true); toast('Día marcado como descanso. No rompe tu racha.'); }}>
                Marcar como día de descanso
              </Button>
            )}
          </div>
          {!isToday && <p className="mt-3 text-[12.5px] text-muted">Registrar un día anterior está bien: se guarda con su fecha real.</p>}
        </Card>
      </>
    );
  }

  return <ActiveSession session={session} title={title} sub={sub} />;
}

function ActiveSession({ session, title, sub }: { session: SessionRecord; title: string; sub: React.ReactNode }) {
  const s = useAppState();
  const date = session.date;
  const wizard = useWizard({ total: BLOCKS.length });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const done = session.status === 'completada';

  const dueQueue = useMemo(
    () => Object.values(s.vocab).filter((v) => isDue(v, date)).sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? '')),
    [s.vocab, date],
  );

  const blockDone = [
    session.listening.comprehension > 0 || session.listening.minutesWatched > 0,
    session.vocabulary.expressionIds.length > 0 && session.vocabulary.expressionIds.every((id) => session.vocabulary.learned.includes(id) || session.vocabulary.toReview.includes(id)),
    session.review.reviewed.length >= REVIEW_LIMIT || dueQueue.length === 0,
    session.speaking.spoke || session.speaking.confidence > 0,
  ];

  return (
    <div>
      <PageHeader
        title={title}
        sub={sub}
        action={
          done ? (
            <Badge tone="green"><Icon name="check" size={13} /> Completada · {session.minutes} min</Badge>
          ) : (
            <Badge tone="blue">Iniciada a las {formatTime(session.startedAt)}</Badge>
          )
        }
      />

      {done && (
        <div className="mb-5">
          <Notice tone="green" icon="check">
            Sesión completada{session.completedAt ? ` a las ${formatTime(session.completedAt)}` : ''} con {session.minutes} minutos registrados.{' '}
            <button type="button" className="font-medium underline" onClick={() => { reopenSession(date); toast('Sesión reabierta para editarla.', 'info'); }}>
              Reabrir para editar
            </button>
          </Notice>
        </div>
      )}

      {/* Pasos */}
      <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Bloques de la sesión">
        {BLOCKS.map((b, i) => {
          const active = wizard.index === i;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => wizard.goTo(i)}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? 'border-learn bg-learn-soft/50' : 'border-line bg-surface hover:bg-slate-50'}`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${blockDone[i] ? 'bg-progress text-white' : active ? 'bg-learn text-white' : 'bg-slate-100 text-muted'}`}>
                  {blockDone[i] ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{b.label}</span>
                  <span className="block text-[11.5px] text-muted">{b.minutes} min</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <Card>
        {wizard.index === 0 && <ListeningBlock session={session} />}
        {wizard.index === 1 && <VocabularyBlock session={session} />}
        {wizard.index === 2 && <ReviewBlock session={session} queue={dueQueue} />}
        {wizard.index === 3 && <SpeakingBlock session={session} />}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Button variant="ghost" icon="chevronLeft" disabled={wizard.isFirst} onClick={wizard.back}>Anterior</Button>
          {!wizard.isLast ? (
            <Button variant="learn" onClick={wizard.next}>
              Siguiente: {BLOCKS[wizard.index + 1].label} <Icon name="chevronRight" size={16} />
            </Button>
          ) : done ? (
            <Button onClick={() => navigate('inicio')}>Volver al inicio</Button>
          ) : (
            <Button variant="primary" icon="check" onClick={() => setConfirmOpen(true)}>Completar sesión</Button>
          )}
        </div>
      </Card>

      {!done && (
        <div className="mt-4 text-right">
          <Button variant="ghost" size="sm" icon="check" onClick={() => setConfirmOpen(true)}>Completar sesión ahora</Button>
        </div>
      )}

      <CompleteModal open={confirmOpen} onClose={() => setConfirmOpen(false)} session={session} blockDone={blockDone} />
    </div>
  );
}

function CompleteModal({ open, onClose, session, blockDone }: { open: boolean; onClose: () => void; session: SessionRecord; blockDone: boolean[] }) {
  const s = useAppState();
  const elapsed = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);
  const [minutes, setMinutes] = useState('');
  useEffect(() => {
    if (open) setMinutes(elapsed > 0 && elapsed <= 180 ? String(elapsed) : session.minutes ? String(session.minutes) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const n = Number(minutes);
  const valid = Number.isFinite(n) && n >= 1 && n <= 600;
  const missing = BLOCKS.filter((_, i) => !blockDone[i]).map((b) => b.label);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Completar la sesión"
      description="El día solo cuenta como completado cuando confirmas aquí."
      closeLabel="Cerrar"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <HoldToConfirm
            duration={700}
            disabled={!valid}
            confirmLabel="¡Sesión guardada!"
            onConfirm={() => {
              completeSession(session.date, Math.round(n));
              toast('Sesión completada y guardada. ¡Buen trabajo!');
              setTimeout(onClose, 500);
            }}
            className="bg-progress! text-white! border-progress!"
          >
            Mantén pulsado para confirmar
          </HoldToConfirm>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Minutos estudiados" hint={elapsed > 0 && elapsed <= 180 ? `Desde que empezaste han pasado ${elapsed} min. Ajústalo si hiciste pausas.` : `Tu objetivo diario es de ${s.settings.dailyMinutes} minutos.`}>
          <input type="number" inputMode="numeric" min={1} max={600} className="field" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        {!valid && <p className="text-[12.5px] text-red-700">Indica entre 1 y 600 minutos.</p>}
        <Field label="Notas personales (opcional)">
          <textarea className="field" value={session.personalNotes} onChange={(e) => updateSession(session.date, (r) => ({ ...r, personalNotes: e.target.value }))} placeholder="¿Cómo te has sentido hoy? ¿Qué te ha costado?" />
        </Field>
        {missing.length > 0 && (
          <Notice tone="amber">Bloques sin registrar: {missing.join(', ')}. Puedes completar igualmente; un día corto también cuenta.</Notice>
        )}
      </div>
    </Modal>
  );
}

function ListeningBlock({ session }: { session: SessionRecord }) {
  const s = useAppState();
  const l = session.listening;
  const set = (patch: Partial<SessionRecord['listening']>) => updateSession(session.date, (r) => ({ ...r, listening: { ...r.listening, ...patch } }));
  const url = useInlineValidation({
    value: l.videoUrl,
    validate: (v) => (!v.trim() || /^https?:\/\/\S+\.\S+/.test(v.trim()) ? null : 'Escribe un enlace completo que empiece por http:// o https://'),
  });

  return (
    <div className="space-y-4">
      <CardTitle icon="headphones" sub={`12 minutos. Recurso habitual: ${s.settings.videoResource}. Elige tú el vídeo: la app no sugiere ni inventa enlaces.`}>
        Bloque 1 · Listening
      </CardTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título del vídeo">
          <input className="field" value={l.videoTitle} onChange={(e) => set({ videoTitle: e.target.value })} placeholder="Escribe el título del vídeo que has visto" />
        </Field>
        <Field label="Enlace (opcional)" hint={url.status === 'invalid' ? <span className="text-red-700">{url.error}</span> : 'Pega el enlace del vídeo si quieres volver a él.'}>
          <input className="field" type="url" inputMode="url" value={l.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} {...url.fieldProps} placeholder="https://…" />
        </Field>
        <Field label="Minutos vistos">
          <input className="field" type="number" min={0} max={240} inputMode="numeric" value={l.minutesWatched || ''} onChange={(e) => set({ minutesWatched: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })} />
        </Field>
        {l.videoUrl && url.status !== 'invalid' && /^https?:\/\//.test(l.videoUrl) && (
          <div className="flex items-end">
            <a href={l.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-learn hover:underline">
              Abrir mi enlace <Icon name="external" size={14} />
            </a>
          </div>
        )}
      </div>
      <Field label="Nivel de comprensión">
        <Rating label="Nivel de comprensión" value={l.comprehension} onChange={(v) => set({ comprehension: v as SessionRecord['listening']['comprehension'] })} labels={COMPREHENSION_LABELS} />
      </Field>
      <Field label="Notas">
        <textarea className="field" value={l.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Palabras nuevas, ideas principales, frases que te llamaron la atención…" />
      </Field>
    </div>
  );
}

function VocabularyBlock({ session }: { session: SessionRecord }) {
  const s = useAppState();
  const ids = session.vocabulary.expressionIds;
  const items = ids.map((id) => s.vocab[id]).filter(Boolean);
  const missingCount = ids.length - items.length;
  const backlog = Object.values(s.vocab)
    .filter((v) => v.source === 'plan' && v.status === 'nueva' && v.day > 0 && (session.day === 0 || v.day < session.day) && !ids.includes(v.id))
    .sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
  const addBacklog = () => {
    const extra = backlog.slice(0, s.settings.dailyExpressions).map((v) => v.id);
    updateSession(session.date, (r) => ({ ...r, vocabulary: { ...r.vocabulary, expressionIds: [...r.vocabulary.expressionIds, ...extra] } }));
    toast(`${extra.length} expresiones añadidas a esta sesión.`, 'info');
  };

  return (
    <div className="space-y-4">
      <CardTitle icon="book" sub={`8 minutos. Objetivo: ${s.settings.dailyExpressions} expresiones nuevas. "Aprendida" llega después, con 2 repasos correctos.`}>
        Bloque 2 · Vocabulario
      </CardTitle>

      {items.length === 0 && (
        <Notice>
          {session.day === 0 ? 'Este día está fuera del plan de 12 semanas, así que no tiene expresiones asignadas.' : 'No quedan expresiones del plan asignadas a este día (quizá las eliminaste del banco).'}
        </Notice>
      )}
      {missingCount > 0 && <p className="text-[12.5px] text-muted">{missingCount} expresiones de esta sesión ya no están en tu banco.</p>}

      <div className="space-y-3">
        {items.map((v) => {
          const learned = session.vocabulary.learned.includes(v.id);
          const toReview = session.vocabulary.toReview.includes(v.id);
          return (
            <article key={v.id} className={`rounded-2xl border p-4 ${learned ? 'border-progress/30 bg-progress-soft/30' : toReview ? 'border-amber-200 bg-warm-soft/30' : 'border-line'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[17px] font-semibold text-ink">{v.en}</p>
                  <p className="text-[14px] text-slate-700">{v.es}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="blue">{categoryName(v.category)}</Badge>
                  <Badge>{STATUS_LABEL[v.status]}</Badge>
                </div>
              </div>
              {v.context && <p className="mt-2 text-[13px] text-muted"><span className="font-medium text-slate-600">Uso: </span>{v.context}</p>}
              {v.example && (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[13.5px]">
                  <p className="italic text-ink">“{v.example}”</p>
                  {v.exampleEs && <p className="text-muted">{v.exampleEs}</p>}
                </div>
              )}
              <Field label="Mi propia oración" className="mt-3">
                <textarea className="field min-h-[3rem]" value={v.ownSentence} onChange={(e) => patchVocab(v.id, { ownSentence: e.target.value })} placeholder={`Escribe una frase tuya con "${v.en}"`} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={learned ? 'primary' : 'secondary'} icon="check" onClick={() => studyInSession(session.date, v.id, false)} aria-pressed={learned}>
                  {learned ? 'Marcada como aprendida' : 'Marcar como aprendida'}
                </Button>
                <Button size="sm" variant={toReview ? 'learn' : 'secondary'} icon="repeat" onClick={() => studyInSession(session.date, v.id, true)} aria-pressed={toReview}>
                  {toReview ? 'Marcada para repasar' : 'Necesita repasarla'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {backlog.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line px-4 py-3">
          <p className="text-[13.5px] text-muted">
            Tienes {backlog.length} expresiones de días anteriores sin estudiar. No pasa nada: puedes recuperarlas a tu ritmo.
          </p>
          <Button size="sm" icon="plus" onClick={addBacklog}>Añadir {Math.min(backlog.length, s.settings.dailyExpressions)} a hoy</Button>
        </div>
      )}
    </div>
  );
}

function ReviewBlock({ session, queue }: { session: SessionRecord; queue: VocabRecord[] }) {
  const reviewedToday = session.review.reviewed.length;
  const remainingInSession = Math.max(0, REVIEW_LIMIT - reviewedToday);
  const visible = queue.slice(0, remainingInSession);
  return (
    <div className="space-y-4">
      <CardTitle icon="repeat" sub="5 minutos. Las expresiones vuelven tras 1, 3, 7, 14 y 30 días según cómo las recuerdes.">
        Bloque 3 · Repaso
      </CardTitle>
      <p className="text-[13px] text-muted">
        Repasadas en esta sesión: <span className="font-medium text-ink">{reviewedToday}</span>
        {session.review.hard.length > 0 && <> · difíciles u olvidadas: {session.review.hard.length} (volverán pronto)</>}
      </p>
      {visible.length > 0 ? (
        <ReviewDeck queue={visible} date={session.date} />
      ) : queue.length > 0 ? (
        <EmptyState icon="check" title="Suficiente repaso por hoy" action={<a className="text-[13.5px] font-medium text-learn hover:underline" href={href('repasos')}>Repasar el resto ({queue.length})</a>}>
          Has repasado {reviewedToday} expresiones. El resto puede esperar a mañana.
        </EmptyState>
      ) : (
        <EmptyState icon="check" title="No hay repasos pendientes">
          {reviewedToday > 0
            ? 'Has repasado todo lo que tocaba hoy.'
            : 'Las expresiones que estudies hoy aparecerán aquí mañana para su primer repaso.'}
        </EmptyState>
      )}
    </div>
  );
}

function SpeakingBlock({ session }: { session: SessionRecord }) {
  const hour = useAppState().settings.scheduledHour;
  const sp = session.speaking;
  const set = (patch: Partial<SessionRecord['speaking']>) => updateSession(session.date, (r) => ({ ...r, speaking: { ...r.speaking, ...patch } }));
  const pool = speakingPoolUntil(session.week || 12);
  const other = () => {
    const i = pool.indexOf(sp.question);
    set({ question: pool[(i + 1) % pool.length] });
  };
  return (
    <div className="space-y-4">
      <CardTitle icon="mic" sub="5 minutos. Lee la pregunta y responde en voz alta. Nadie evalúa tu voz: tú registras cómo te fue.">
        Bloque 4 · Speaking
      </CardTitle>
      <div className="rounded-2xl bg-learn-soft/50 px-4 py-4">
        <p className="text-[12px] font-medium tracking-wide text-learn uppercase">Pregunta</p>
        <p className="mt-1 text-[17px] font-medium text-ink">{sp.question}</p>
        <button type="button" onClick={other} className="mt-2 text-[13px] font-medium text-learn hover:underline">Otra pregunta</button>
      </div>
      <Recorder storageKey={`speaking-${session.date}`} />
      <Field label="Tu respuesta por escrito (opcional)">
        <textarea className="field" value={sp.answer} onChange={(e) => set({ answer: e.target.value })} placeholder="Escribe las ideas clave o tu respuesta completa" />
      </Field>
      <label className="flex items-center gap-2.5 text-[14px]">
        <input type="checkbox" className="h-4.5 w-4.5 accent-[#16a34a]" checked={sp.spoke} onChange={(e) => set({ spoke: e.target.checked })} />
        He hablado en voz alta durante unos 5 minutos
      </label>
      <Field label="Dificultades (opcional)">
        <textarea className="field" value={sp.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Palabras que te faltaron, bloqueos, pronunciación…" />
      </Field>
      <Field label="Confianza al hablar">
        <Rating label="Confianza al hablar" value={sp.confidence} onChange={(v) => set({ confidence: v })} labels={['Muy poca', 'Poca', 'Normal', 'Bastante', 'Mucha']} tone="green" />
      </Field>
      <p className="text-[12px] text-muted">Hora programada habitual: {formatHour(hour)}.</p>
    </div>
  );
}
