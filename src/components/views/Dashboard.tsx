import { useState } from 'react';
import { useSnapshot, setSettings, startSession, changeStartDate } from '../../lib/store';
import { addDays, diffDays, formatDay, formatHour, formatLong, isValidISO, planPosition, todayISO } from '../../lib/dates';
import { bestStreak, currentStreak, elapsedPlanDays, totals, weekStats } from '../../lib/stats';
import { weekPlan } from '../../lib/plan';
import { href, navigate } from '../../lib/router';
import { isDue } from '../../lib/spacedRepetition';
import { ACHIEVEMENT_BY_ID } from '../../lib/achievements';
import { useAsyncAction } from '../interior/loading-button';
import { useValueFlash } from '../interior/value-flash';
import { Badge, Bar, Button, Card, CardTitle, Field, InfoTip, Stat } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { useToday } from '../useToday';
import type { AppState } from '../../lib/types';

/** Número que se resalta en verde un instante cuando sube (hook headless de interior/value-flash). */
function FlashNumber({ value }: { value: number }) {
  const { flashing, direction } = useValueFlash(value);
  return <span className={`transition-colors duration-300 ${flashing && direction === 'up' ? 'text-progress' : ''}`}>{value}</span>;
}

export function StartDatePrompt({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState(todayISO());
  const valid = isValidISO(value);
  return (
    <Card className={compact ? '' : 'border-learn/25 bg-gradient-to-br from-learn-soft/50 to-surface'}>
      <CardTitle icon="calendar" sub="La app no inventa una fecha de inicio: elige tú cuándo empieza (o empezó) tu plan de 12 semanas.">
        ¿Cuándo empiezas?
      </CardTitle>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Fecha de inicio del plan" className="w-full sm:w-56">
          <input type="date" className="field" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Button
          variant="learn"
          disabled={!valid}
          onClick={() => changeStartDate(value)}
          icon="check"
        >
          Guardar fecha de inicio
        </Button>
      </div>
      {!valid && <p className="mt-2 text-[12.5px] text-red-700">Introduce una fecha válida.</p>}
    </Card>
  );
}

function motivation(s: AppState, today: string, previousVisit: string | null) {
  const streak = currentStreak(s, today);
  const t = totals(s);
  const todayDone = s.sessions[today]?.status === 'completada';
  if (previousVisit && diffDays(previousVisit, today) >= 3 && !todayDone) return 'Puedes retomar hoy. Tu progreso anterior sigue aquí.';
  if (todayDone) return streak >= 2 ? `Sesión de hoy completada. Llevas ${streak} días consecutivos. ¡Sigue así!` : 'Sesión de hoy completada. Así se construye el hábito.';
  if (streak >= 2) return `Llevas ${streak} días consecutivos. ¡Sigue así!`;
  if (t.sessions === 0) return 'Tu próxima sesión puede empezar hoy.';
  return Number(today.slice(-1)) % 2 ? 'No necesitas ser perfecto, necesitas ser constante.' : `Hoy solo necesitas cumplir tus ${s.settings.dailyMinutes} minutos.`;
}

/** ¿La sesión de hoy empezó cerca de la hora programada? (desde 15 min antes hasta 30 min después) */
export function startedOnSchedule(startedAt: string, hour: number) {
  const d = new Date(startedAt);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= hour * 60 - 15 && mins <= hour * 60 + 30;
}

export function Dashboard() {
  const { state: s, previousVisit } = useSnapshot();
  const today = useToday();
  const pos = planPosition(s.settings.startDate, today);
  const t = totals(s);
  const streak = currentStreak(s, today);
  const best = bestStreak(s, today);
  const session = s.sessions[today];
  const due = Object.values(s.vocab).filter((v) => isDue(v, today)).length;
  const week = pos.kind === 'en-curso' ? pos.week : pos.kind === 'terminado' ? 12 : 1;
  const ws = weekStats(s, week, today);
  const planCompleted = t.planSessions;
  const planEnd = isValidISO(s.settings.startDate) ? addDays(s.settings.startDate, 83) : '';
  const restInPlan = planEnd ? Object.keys(s.restDays).filter((d) => d >= s.settings.startDate && d <= planEnd && s.sessions[d]?.status !== 'completada').length : 0;
  const pending = Math.max(0, 84 - planCompleted - restInPlan);

  const { status, run } = useAsyncAction({
    action: () => {
      startSession(today);
      navigate('sesion');
    },
    resetAfter: 600,
  });

  const cta = session?.status === 'completada' ? 'VER MI SESIÓN DE HOY' : session?.status === 'iniciada' ? 'CONTINUAR MI SESIÓN DE HOY' : 'EMPEZAR MI SESIÓN DE HOY';
  const recentAchievements = Object.entries(s.achievements).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 4);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[13px] font-medium text-muted">{formatDay(today)}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">Mi camino de B1+ a B2</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {pos.kind === 'en-curso' && <Badge tone="green">Semana {pos.week} de 12 · día {pos.planDay} de 84</Badge>}
          {pos.kind === 'antes' && <Badge tone="blue">Tu plan empieza en {pos.daysUntil} {pos.daysUntil === 1 ? 'día' : 'días'} ({formatLong(s.settings.startDate)})</Badge>}
          {pos.kind === 'terminado' && <Badge tone="green">Plan de 12 semanas terminado · puedes seguir repasando</Badge>}
          {pos.kind === 'sin-fecha' && <Badge tone="amber">Falta elegir la fecha de inicio</Badge>}
          <Badge>{s.settings.levelFrom} → {s.settings.levelTo}</Badge>
        </div>
      </header>

      {pos.kind === 'sin-fecha' && <StartDatePrompt />}

      {/* Acción principal */}
      <Card className="overflow-hidden border-progress/20 bg-gradient-to-br from-progress-soft/70 via-surface to-surface">
        <p className="text-[15px] font-medium text-[#14532d]">{motivation(s, today, previousVisit)}</p>
        {pos.kind === 'en-curso' && (
          <p className="mt-1 text-[13.5px] text-muted">
            Tema de la semana: <span className="text-ink">{weekPlan(pos.week)?.theme}</span>
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={status === 'pending'}
            className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-progress px-7 text-[15px] font-semibold tracking-wide text-white shadow-[0_6px_16px_-6px_rgba(22,163,74,0.6)] transition hover:bg-[#15803d] active:translate-y-px disabled:opacity-70"
          >
            <Icon name={session?.status === 'completada' ? 'check' : 'play'} size={20} />
            {status === 'pending' ? 'Abriendo…' : cta}
          </button>
          {due > 0 && (
            <a href={href('repasos')} className="text-[13.5px] font-medium text-learn hover:underline">
              {due} {due === 1 ? 'expresión pendiente' : 'expresiones pendientes'} de repaso →
            </a>
          )}
        </div>
      </Card>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="check" label="Días completados" value={<FlashNumber value={t.sessions} />} hint={`${planCompleted} dentro del plan`} />
        <Stat icon="calendar" label="Días por completar" value={pending} hint="Del plan de 84 días; los futuros no cuentan como perdidos" />
        <Stat icon="flame" label="Racha actual" value={<FlashNumber value={streak} />} hint="Los descansos marcados no la rompen" />
        <Stat icon="trophy" label="Mejor racha" value={best} hint={best ? `${best} ${best === 1 ? 'día' : 'días'} seguidos` : 'Aún sin racha'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle icon="chart" sub="Calculado a partir de las sesiones que has completado y confirmado.">
            Progreso general
          </CardTitle>
          <div className="space-y-5">
            <Bar label={`Cumplimiento del plan · ${planCompleted} de 84 sesiones`} value={planCompleted} max={84} />
            {pos.kind !== 'sin-fecha' && <Bar label={`Semana ${week} · ${ws.completed} de 7 sesiones`} value={ws.completed} max={7} tone="blue" />}
            {pos.kind === 'en-curso' && (
              <p className="text-[12.5px] text-muted">
                Han transcurrido {elapsedPlanDays(s, today)} de 84 días del plan.
              </p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <div className="text-xl font-semibold tabular-nums">{t.minutes}</div>
              <div className="text-[12px] text-muted">minutos acumulados</div>
            </div>
            <div>
              <div className="text-xl font-semibold tabular-nums">{t.studied}</div>
              <div className="flex items-center justify-center gap-1 text-[12px] text-muted">
                expresiones estudiadas
                <InfoTip text="Estudiada = la viste en una sesión. Pasa a «aprendida» solo tras 2 repasos correctos." />
              </div>
            </div>
            <div>
              <div className="text-xl font-semibold tabular-nums">{t.byStatus.aprendida + t.byStatus.dominada}</div>
              <div className="text-[12px] text-muted">aprendidas o dominadas</div>
            </div>
          </div>
        </Card>

        <CommitmentCard />
      </div>

      <Card>
        <CardTitle icon="trophy" action={<a href={href('estadisticas')} className="text-[13px] font-medium text-learn hover:underline">Ver todos</a>}>
          Logros recientes
        </CardTitle>
        {recentAchievements.length === 0 ? (
          <p className="text-[13.5px] text-muted">Todavía no hay logros. El primero llega al completar tu primera sesión.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {recentAchievements.map(([id, date]) => (
              <li key={id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-progress-soft text-progress">
                  <Icon name="trophy" size={15} />
                </span>
                <span>
                  <span className="block font-medium">{ACHIEVEMENT_BY_ID[id]?.title ?? id}</span>
                  <span className="block text-[11.5px] text-muted">{formatLong(date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CommitmentCard() {
  const { state: s } = useSnapshot();
  const today = useToday();
  const hour = s.settings.scheduledHour;
  const session = s.sessions[today];
  const onTime = session ? startedOnSchedule(session.startedAt, hour) : null;

  return (
    <Card className="lg:col-span-2">
      <CardTitle icon="sun" sub={`Horario habitual: ${formatHour(hour)} – ${formatHour(hour).replace(':00', ':30')}`}>
        Mi compromiso de las {formatHour(hour)}
      </CardTitle>
      <Field label="Hora programada">
        <select className="field" value={hour} onChange={(e) => setSettings({ scheduledHour: Number(e.target.value) })}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </select>
      </Field>
      <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-[13.5px]">
        {!session && <span className="text-muted">Hoy aún no has empezado. Cuando inicies la sesión se registrará la hora.</span>}
        {session && onTime && (
          <span className="flex items-center gap-2 text-[#15803d]">
            <Icon name="check" /> Hoy empezaste a tu hora ({new Date(session.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}).
          </span>
        )}
        {session && onTime === false && (
          <span className="text-slate-700">
            Hoy empezaste a las {new Date(session.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Fuera del horario, pero cuenta igual.
          </span>
        )}
      </div>
      <Button
        className="mt-4 w-full"
        variant="secondary"
        icon="play"
        onClick={() => {
          startSession(today);
          navigate('sesion');
        }}
      >
        {session ? 'Ir a la sesión de hoy' : 'Iniciar sesión ahora'}
      </Button>
      <p className="mt-3 text-[12px] text-muted">
        La app no envía notificaciones automáticas. Para recordatorios, exporta un calendario .ics desde{' '}
        <a href={href('configuracion')} className="text-learn hover:underline">Configuración</a>.
      </p>
    </Card>
  );
}
