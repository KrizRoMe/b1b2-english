import { useAppState } from '../../lib/store';
import { WEEKS, categoryName, weekPlan } from '../../lib/plan';
import { weekStats, evaluationScores, dayState, type WeekStatus } from '../../lib/stats';
import { formatDay, formatShort, isValidISO } from '../../lib/dates';
import { STATUS_LABEL } from '../../lib/spacedRepetition';
import { href, navigate } from '../../lib/router';
import { Accordion } from '../interior/accordion';
import { Badge, Bar, Button, Card, EmptyState, Notice, PageHeader } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { useToday } from '../useToday';

const STATUS: Record<WeekStatus, { label: string; tone: 'slate' | 'blue' | 'green' }> = {
  pendiente: { label: 'Pendiente', tone: 'slate' },
  'en-progreso': { label: 'En progreso', tone: 'blue' },
  completada: { label: 'Completada', tone: 'green' },
};

const MONTHS = ['Construir la base', 'Ganar fluidez', 'Consolidar'];

export function WeeksView({ week }: { week: number | null }) {
  if (week && weekPlan(week)) return <WeekDetail week={week} />;
  return <WeeksGrid />;
}

function WeeksGrid() {
  const s = useAppState();
  const today = useToday();
  const hasStart = isValidISO(s.settings.startDate);
  return (
    <div>
      <PageHeader title="Progreso semanal" sub="Plan de 12 semanas en 3 meses. Todas las semanas se pueden consultar; las futuras se muestran atenuadas." />
      {!hasStart && (
        <div className="mb-5">
          <Notice tone="amber">Aún no has elegido fecha de inicio, así que las semanas no tienen fechas. <a className="font-medium underline" href={href('configuracion')}>Elegir fecha</a></Notice>
        </div>
      )}
      {[1, 2, 3].map((month) => (
        <section key={month} className="mb-8">
          <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-muted uppercase">Mes {month} · {MONTHS[month - 1]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {WEEKS.filter((w) => w.month === month).map((w) => {
              const st = weekStats(s, w.week, today);
              return (
                <a
                  key={w.week}
                  href={href('progreso', w.week)}
                  className={`group flex flex-col rounded-2xl border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md ${st.isCurrent ? 'border-progress ring-2 ring-progress/15' : 'border-line'} ${st.isFuture ? 'opacity-65 saturate-50 hover:opacity-100 hover:saturate-100' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-muted">SEMANA {w.week}</span>
                    {st.isFuture ? <Badge>Próxima</Badge> : st.isCurrent ? <Badge tone="green">Esta semana</Badge> : <Badge tone={STATUS[st.status].tone}>{STATUS[st.status].label}</Badge>}
                  </div>
                  <h3 className="text-[15px] leading-snug font-semibold text-ink">{w.theme}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-muted">{w.objective}</p>
                  <div className="mt-auto pt-4">
                    <Bar label={`${st.completed} de 7 sesiones`} value={st.completed} max={7} />
                    <p className="mt-2 text-[12px] text-muted">{st.studied} de {st.totalExpressions} expresiones estudiadas{st.rest ? ` · ${st.rest} descanso${st.rest > 1 ? 's' : ''}` : ''}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function WeekDetail({ week }: { week: number }) {
  const s = useAppState();
  const today = useToday();
  const w = weekPlan(week)!;
  const st = weekStats(s, week, today);
  const exprs = w.expressionIds.map((id) => s.vocab[id]).filter(Boolean);
  const studied = exprs.filter((v) => v.status !== 'nueva');
  const notStudied = exprs.filter((v) => v.status === 'nueva');
  const sessions = Object.values(s.sessions).filter((r) => r.week === week).sort((a, b) => a.date.localeCompare(b.date));
  const pendingDays = st.dates.filter((d) => d <= today && ['sin-empezar', 'iniciada'].includes(dayState(s, d, today)));
  const ev = s.evaluations[week];
  const score = evaluationScores(s, week);

  const items = [
    {
      id: 'objetivos',
      title: 'Objetivos',
      content: (
        <div className="space-y-2 text-[14px] text-slate-700">
          <p>{w.objective}</p>
          <p className="text-[13px] text-muted">Nivel orientativo: {w.level} · Writing de la semana: {w.writingTask}</p>
        </div>
      ),
    },
    {
      id: 'actividades',
      title: 'Actividades previstas',
      content: (
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-slate-700">
          {w.activities.map((a) => <li key={a}>{a}</li>)}
          {w.speakingQuestions.map((q) => <li key={q}>Speaking: <span className="italic">{q}</span></li>)}
        </ul>
      ),
    },
    {
      id: 'expresiones',
      title: 'Expresiones recomendadas',
      meta: <span className="text-[12px] text-muted">{studied.length}/{exprs.length}</span>,
      content: (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {exprs.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[13px]">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{v.en}</span>
                <span className="block truncate text-muted">{v.es} · día {((v.day - 1) % 7) + 1}</span>
              </span>
              <Badge tone={v.status === 'nueva' ? 'slate' : v.status === 'necesita-repaso' ? 'amber' : 'green'}>{STATUS_LABEL[v.status]}</Badge>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'hechas',
      title: 'Tareas completadas',
      meta: <span className="text-[12px] text-muted">{st.completed} sesiones</span>,
      content: sessions.filter((r) => r.status === 'completada').length === 0 ? (
        <p className="text-[13.5px] text-muted">Todavía no hay sesiones completadas en esta semana.</p>
      ) : (
        <ul className="space-y-1.5 text-[13.5px]">
          {sessions.filter((r) => r.status === 'completada').map((r) => (
            <li key={r.date}>
              <a href={href('sesion', r.date)} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
                <Icon name="check" size={15} className="text-progress" />
                <span className="font-medium">{formatDay(r.date)}</span>
                <span className="text-muted">· {r.minutes} min · {r.vocabulary.learned.length + r.vocabulary.toReview.length} expresiones · {r.review.reviewed.length} repasos{r.speaking.spoke ? ' · speaking' : ''}</span>
              </a>
            </li>
          ))}
          {studied.length > 0 && <li className="px-2 text-muted">{studied.length} expresiones de la semana estudiadas.</li>}
        </ul>
      ),
    },
    {
      id: 'pendientes',
      title: 'Tareas pendientes',
      content: (
        <div className="space-y-2 text-[13.5px] text-slate-700">
          {!isValidISO(s.settings.startDate) ? (
            <p className="text-muted">Elige una fecha de inicio para ver qué días corresponden a esta semana.</p>
          ) : st.isFuture ? (
            <p className="text-muted">Esta semana empieza el {formatShort(st.dates[0])}. Nada pendiente todavía.</p>
          ) : pendingDays.length ? (
            <ul className="space-y-1">
              {pendingDays.map((d) => (
                <li key={d}>
                  <a href={href('sesion', d)} className="text-learn hover:underline">{formatDay(d)}</a>
                  <span className="text-muted"> · {dayState(s, d, today) === 'iniciada' ? 'sesión iniciada sin terminar' : 'sin sesión (puedes registrarla o marcar descanso)'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No hay días pendientes hasta hoy.</p>
          )}
          {notStudied.length > 0 && <p>{notStudied.length} expresiones de esta semana aún sin estudiar.</p>}
          {!ev?.completedAt && <p>Evaluación semanal sin completar.</p>}
        </div>
      ),
    },
    {
      id: 'evaluacion',
      title: 'Resultado de la evaluación semanal',
      content: !ev ? (
        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-muted">
          Aún no has empezado la evaluación de esta semana.
          <Button size="sm" variant="learn" onClick={() => navigate('evaluaciones', week)}>Hacer la evaluación</Button>
        </div>
      ) : (
        <div className="space-y-2 text-[13.5px]">
          <p className="text-muted">Autoevaluación {ev.completedAt ? `completada el ${formatShort(ev.completedAt)}` : 'en curso (borrador guardado)'}.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            <li>Vocabulario recordado: <b>{score?.vocabRecall ?? '—'}{score?.vocabRecall !== null ? '%' : ''}</b></li>
            <li>Gramática correcta: <b>{score?.grammar ?? '—'}{score?.grammar !== null ? '%' : ''}</b></li>
            <li>Listening (comprensión estimada): <b>{score?.listening ?? '—'}{score?.listening ? '%' : ''}</b></li>
            <li>Speaking (media 1–5): <b>{score?.speaking ? score.speaking.toFixed(1) : '—'}</b></li>
          </ul>
          <Button size="sm" onClick={() => navigate('evaluaciones', week)}>Abrir evaluación</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <a href={href('progreso')} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <Icon name="chevronLeft" size={15} /> Todas las semanas
      </a>
      <PageHeader
        title={`Semana ${week}: ${w.theme}`}
        sub={st.dates.length ? `${formatShort(st.dates[0])} – ${formatShort(st.dates[6])} · Mes ${w.month}` : `Mes ${w.month}`}
        action={
          <div className="flex gap-2">
            <Button size="sm" icon="chevronLeft" disabled={week <= 1} onClick={() => navigate('progreso', week - 1)} aria-label="Semana anterior">Anterior</Button>
            <Button size="sm" disabled={week >= 12} onClick={() => navigate('progreso', week + 1)} aria-label="Semana siguiente">Siguiente <Icon name="chevronRight" size={15} /></Button>
          </div>
        }
      />
      {st.isFuture && <div className="mb-4"><Notice>Esta semana aún no ha empezado. Puedes consultarla y adelantar lo que quieras.</Notice></div>}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4!"><Bar label={`Sesiones: ${st.completed} de 7`} value={st.completed} max={7} /></Card>
        <Card className="p-4!"><Bar label={`Expresiones estudiadas: ${st.studied} de ${st.totalExpressions}`} value={st.studied} max={st.totalExpressions || 1} tone="blue" /></Card>
        <Card className="p-4!">
          <p className="text-[13px] font-medium text-ink">Estado</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS[st.status].tone}>{STATUS[st.status].label}</Badge>
            <span className="text-[12.5px] text-muted">{st.minutes} min · {categoryName(exprs[0]?.category ?? '')}</span>
          </div>
        </Card>
      </div>
      {exprs.length === 0 && <EmptyState title="Sin expresiones">Has eliminado todas las expresiones de esta semana del banco.</EmptyState>}
      <Accordion items={items} type="multiple" defaultOpen={['objetivos', 'pendientes']} maxPanelHeight={640} />
    </div>
  );
}
