import { useAppState } from '../../lib/store';
import { WEEKS } from '../../lib/plan';
import { dayState, evaluationScores, reviewsByDate, skillSeries, totals, weekStats, bestStreak, currentStreak } from '../../lib/stats';
import { addDays, formatShort, isValidISO } from '../../lib/dates';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { formatLong } from '../../lib/dates';
import { href } from '../../lib/router';
import { BarChart, Heatmap, LineChart, Ring, SERIES_COLORS, StackedBar, type HeatCell } from '../ui/charts';
import { Badge, Card, CardTitle, EmptyState, PageHeader, Stat } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { useToday } from '../useToday';

function NeedData({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13.5px] text-muted">{children}</p>;
}

export function StatsView() {
  const s = useAppState();
  const today = useToday();
  const t = totals(s);
  const hasStart = isValidISO(s.settings.startDate);
  const weeks = WEEKS.map((w) => weekStats(s, w.week, today));
  const started = weeks.filter((w) => !w.isFuture && hasStart);
  const skills = skillSeries(s);
  const hasSkills = skills.some((p) => p.listening || p.speaking || p.reading || p.writing);
  const evals = WEEKS.map((w) => ({ week: w.week, sc: evaluationScores(s, w.week) })).filter((e) => e.sc);
  const months = [1, 2, 3].map((m) => ({ m, minutes: weeks.filter((w) => Math.ceil(w.week / 4) === m).reduce((a, w) => a + w.minutes, 0) }));
  const reviews = reviewsByDate(s);
  const totalReviews = Object.values(reviews).reduce((a, b) => a + b, 0);

  const heatRows = hasStart
    ? WEEKS.map((w) => ({
        label: `Sem. ${w.week}`,
        cells: Array.from({ length: 7 }, (_, d): HeatCell => {
          const date = addDays(s.settings.startDate, (w.week - 1) * 7 + d);
          const st = dayState(s, date, today);
          const min = s.sessions[date]?.status === 'completada' ? s.sessions[date].minutes : 0;
          const level = (min === 0 ? 0 : min < 15 ? 1 : min < 30 ? 2 : min < 45 ? 3 : 4) as HeatCell['level'];
          const tip = `${formatShort(date)}: ${st === 'completada' ? `${min} min` : st === 'descanso' ? 'descanso' : st === 'futuro' ? 'próximo' : st === 'iniciada' ? 'iniciada sin completar' : 'sin sesión'}`;
          return { key: date, level, kind: st === 'descanso' ? 'rest' : st === 'futuro' ? 'future' : 'normal', tip };
        }),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Estadísticas" sub="Todo se calcula con lo que has registrado. Donde aún no hay datos, te explicamos qué registrar." />

      {t.sessions === 0 && t.studied === 0 && (
        <EmptyState icon="stats" title="Aún no hay datos para mostrar" action={<a className="text-[13.5px] font-medium text-learn hover:underline" href={href('sesion')}>Empezar la sesión de hoy</a>}>
          Completa tu primera sesión y estudia algunas expresiones: aquí aparecerán tus gráficos reales. No mostramos ejemplos inventados.
        </EmptyState>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle icon="trophy" sub="Sesiones completadas del plan de 84 días.">Objetivo de 12 semanas</CardTitle>
          {t.planSessions === 0 ? (
            <NeedData>{hasStart ? 'Completa una sesión dentro del plan para ver tu avance.' : 'Elige una fecha de inicio en Configuración y completa tu primera sesión.'}</NeedData>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Ring value={t.planSessions} max={84} label="Plan cumplido" sub={`${t.planSessions} de 84`} />
              <div className="grid w-full grid-cols-2 gap-2 text-center text-[13px]">
                <div className="rounded-lg bg-slate-50 py-2"><b className="block text-lg">{currentStreak(s, today)}</b>racha actual</div>
                <div className="rounded-lg bg-slate-50 py-2"><b className="block text-lg">{bestStreak(s, today)}</b>mejor racha</div>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle icon="chart" sub="% de sesiones completadas sobre las 7 planificadas de cada semana ya empezada.">Progreso semanal</CardTitle>
          {t.planSessions === 0 || started.length === 0 ? (
            <NeedData>Completa sesiones dentro del plan para comparar semanas.</NeedData>
          ) : (
            <BarChart
              ariaLabel="Porcentaje de sesiones completadas por semana"
              max={100}
              unit="%"
              data={started.map((w) => ({ label: `S${w.week}`, value: w.percent, tip: `Semana ${w.week}: ${w.completed}/7 sesiones (${w.percent}%)` }))}
            />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon="clock" sub="Minutos registrados al completar cada sesión.">Tiempo de estudio por semana</CardTitle>
          {t.minutes === 0 ? (
            <NeedData>Al completar una sesión indicas los minutos estudiados; aparecerán aquí.</NeedData>
          ) : (
            <BarChart
              ariaLabel="Minutos de estudio por semana"
              color={SERIES_COLORS[0]}
              data={weeks.map((w) => ({ label: `S${w.week}`, value: w.minutes, muted: w.isFuture, tip: `Semana ${w.week}: ${w.minutes} min` }))}
              unit=""
            />
          )}
        </Card>
        <Card>
          <CardTitle icon="calendar">Por mes</CardTitle>
          {t.minutes === 0 ? (
            <NeedData>Sin minutos registrados todavía.</NeedData>
          ) : (
            <ul className="space-y-3">
              {months.map(({ m, minutes }) => (
                <li key={m}>
                  <div className="flex justify-between text-[13.5px]"><span>Mes {m}</span><span className="tabular-nums">{minutes} min</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-learn" style={{ width: `${(minutes / Math.max(1, ...months.map((x) => x.minutes))) * 100}%` }} /></div>
                </li>
              ))}
              <li className="border-t border-line pt-2 text-[13px] text-muted">Total: {t.minutes} min · media {Math.round(t.minutes / Math.max(1, t.sessions))} min por sesión</li>
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle icon="book" sub="Estado actual de cada expresión del banco según tus repasos.">Vocabulario</CardTitle>
        {t.studied === 0 ? (
          <NeedData>Marca expresiones en el bloque de vocabulario de tu sesión para empezar a medir tu progreso.</NeedData>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Estudiadas" value={t.studied} hint={`de ${t.vocabTotal} en el banco`} />
              <Stat label="Repasadas al menos 1 vez" value={t.reviewed} hint={`${totalReviews} repasos en total`} />
              <Stat label="Dominadas" value={t.byStatus.dominada} hint="Superaron la etapa de 30 días" />
              <Stat label="Uso activo" value={t.activeUse} hint="Marcadas por ti" />
            </div>
            <StackedBar
              ariaLabel="Distribución de expresiones por estado"
              parts={[
                { name: 'Nuevas', value: t.byStatus.nueva, color: '#CBD5E1' },
                { name: 'Aprendiendo', value: t.byStatus.aprendiendo, color: '#93C5FD' },
                { name: 'Necesitan repaso', value: t.byStatus['necesita-repaso'], color: '#FCD34D' },
                { name: 'Aprendidas', value: t.byStatus.aprendida, color: '#4ADE80' },
                { name: 'Dominadas', value: t.byStatus.dominada, color: '#15803D' },
              ]}
            />
          </>
        )}
      </Card>

      <Card>
        <CardTitle icon="calendar" sub="Cada casilla es un día del plan; el color indica los minutos estudiados.">Consistencia</CardTitle>
        {!hasStart ? <NeedData>Elige la fecha de inicio para ver el calendario de actividad.</NeedData> : <Heatmap rows={heatRows} ariaLabel="Mapa de calor de actividad diaria durante las 12 semanas" />}
      </Card>

      <Card>
        <CardTitle icon="stats" sub="Escala 1–5. Listening: comprensión en sesiones y evaluaciones. Speaking: confianza y autoevaluación. Reading y writing: autoevaluación semanal.">Evolución de habilidades</CardTitle>
        {!hasSkills ? (
          <NeedData>Registra tu comprensión en el bloque de listening, tu confianza en speaking o completa una evaluación semanal.</NeedData>
        ) : (
          <>
            <LineChart
              ariaLabel="Evolución semanal de listening, speaking, reading y writing"
              labels={skills.map((p) => `S${p.week}`)}
              series={[
                { name: 'Listening', color: SERIES_COLORS[0], marker: 'circle', values: skills.map((p) => p.listening) },
                { name: 'Speaking', color: SERIES_COLORS[1], marker: 'square', values: skills.map((p) => p.speaking) },
                { name: 'Reading', color: SERIES_COLORS[2], marker: 'diamond', values: skills.map((p) => p.reading) },
                { name: 'Writing', color: SERIES_COLORS[3], marker: 'triangle', values: skills.map((p) => p.writing) },
              ]}
            />
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-learn">Ver como tabla</summary>
              <table className="mt-2 w-full text-left tabular-nums">
                <thead className="text-muted"><tr><th className="py-1">Semana</th><th>Listening</th><th>Speaking</th><th>Reading</th><th>Writing</th></tr></thead>
                <tbody>
                  {skills.filter((p) => p.listening || p.speaking || p.reading || p.writing).map((p) => (
                    <tr key={p.week} className="border-t border-line">
                      <td className="py-1">S{p.week}</td>
                      {[p.listening, p.speaking, p.reading, p.writing].map((v, i) => <td key={i}>{v ? v.toFixed(1) : '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </Card>

      <Card>
        <CardTitle icon="clipboard" sub="Comparación entre semanas de tus evaluaciones. Son autoevaluaciones, no certificaciones.">Autoevaluación semanal</CardTitle>
        {evals.length === 0 ? (
          <NeedData>Completa al menos una evaluación semanal para comparar puntuaciones.</NeedData>
        ) : (
          <LineChart
            ariaLabel="Puntuaciones de las evaluaciones semanales en porcentaje"
            min={0}
            max={100}
            format={(v) => `${Math.round(v)}%`}
            labels={WEEKS.map((w) => `S${w.week}`)}
            series={[
              { name: 'Vocabulario recordado', color: SERIES_COLORS[0], marker: 'circle', values: WEEKS.map((w) => evaluationScores(s, w.week)?.vocabRecall ?? null) },
              { name: 'Gramática', color: SERIES_COLORS[1], marker: 'square', values: WEEKS.map((w) => evaluationScores(s, w.week)?.grammar ?? null) },
              { name: 'Listening', color: SERIES_COLORS[2], marker: 'diamond', values: WEEKS.map((w) => evaluationScores(s, w.week)?.listening ?? null) },
              { name: 'Speaking (×20)', color: SERIES_COLORS[3], marker: 'triangle', values: WEEKS.map((w) => { const v = evaluationScores(s, w.week)?.speaking; return v ? v * 20 : null; }) },
            ]}
          />
        )}
      </Card>

      <Card>
        <CardTitle icon="trophy" sub="Se desbloquean con tus registros reales y guardan la fecha en que lo conseguiste.">Logros e insignias</CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.filter((a) => a.kind === 'logro').map((a) => {
            const date = s.achievements[a.id];
            return (
              <li key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${date ? 'border-progress/30 bg-progress-soft/30' : 'border-line opacity-70'}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${date ? 'bg-progress text-white' : 'bg-slate-100 text-muted'}`}><Icon name="trophy" size={17} /></span>
                <span>
                  <span className="block text-[13.5px] font-medium">{a.title}</span>
                  <span className="block text-[12px] text-muted">{a.description}</span>
                  {date && <span className="mt-0.5 block text-[11.5px] text-[#15803d]">Conseguido el {formatLong(date)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-5 mb-2 text-[13px] font-semibold text-muted">Insignias semanales</h3>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.filter((a) => a.kind === 'insignia').map((a) => (
            <Badge key={a.id} tone={s.achievements[a.id] ? 'green' : 'slate'} className={s.achievements[a.id] ? '' : 'opacity-60'}>
              {s.achievements[a.id] && <Icon name="check" size={12} />} {a.title}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
