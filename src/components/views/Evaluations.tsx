import { useState } from 'react';
import type { EvaluationRecord } from '../../lib/types';
import { deleteEvaluation, updateEvaluation, useAppState } from '../../lib/store';
import { WEEKS, weekPlan } from '../../lib/plan';
import { evaluationScores, weekStats } from '../../lib/stats';
import { formatShort, todayISO } from '../../lib/dates';
import { href, navigate } from '../../lib/router';
import { Tabs } from '../interior/tabs';
import { Modal } from '../interior/modal';
import { Badge, Button, Card, CardTitle, Field, Notice, PageHeader, Rating } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { useToday } from '../useToday';

const DISCLAIMER = 'Esta evaluación es de autoevaluación, no una certificación de nivel.';

export function EvaluationsView({ week }: { week: number | null }) {
  if (week && weekPlan(week)) return <WeekEvaluation week={week} />;
  return <EvaluationList />;
}

function EvaluationList() {
  const s = useAppState();
  const today = useToday();
  return (
    <div>
      <PageHeader title="Evaluaciones semanales" sub="Al final de cada semana: vocabulario, listening, speaking, writing y gramática." />
      <div className="mb-5"><Notice tone="amber" icon="info">{DISCLAIMER} Completar sesiones no significa haber alcanzado el B2; para eso necesitarías un examen oficial.</Notice></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {WEEKS.map((w) => {
          const ev = s.evaluations[w.week];
          const st = weekStats(s, w.week, today);
          const sc = evaluationScores(s, w.week);
          return (
            <a key={w.week} href={href('evaluaciones', w.week)} className={`rounded-2xl border border-line bg-surface p-4 transition hover:shadow-md ${st.isFuture ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-muted">SEMANA {w.week}</span>
                {ev?.completedAt ? <Badge tone="green">Completada</Badge> : ev ? <Badge tone="blue">Borrador</Badge> : st.isFuture ? <Badge>Próxima</Badge> : <Badge>Sin empezar</Badge>}
              </div>
              <p className="mt-1 text-[14px] leading-snug font-medium text-ink">{w.theme}</p>
              {sc && (
                <p className="mt-2 text-[12.5px] text-muted">
                  Vocabulario {sc.vocabRecall ?? '—'}{sc.vocabRecall !== null && '%'} · Gramática {sc.grammar ?? '—'}{sc.grammar !== null && '%'} · Speaking {sc.speaking ? sc.speaking.toFixed(1) : '—'}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();

function WeekEvaluation({ week }: { week: number }) {
  const s = useAppState();
  const w = weekPlan(week)!;
  const ev = s.evaluations[week];
  const [tab, setTab] = useState('vocabulario');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (fn: (e: EvaluationRecord) => EvaluationRecord) => updateEvaluation(week, (e) => ({ ...fn(e), date: todayISO() }));

  return (
    <div>
      <a href={href('evaluaciones')} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <Icon name="chevronLeft" size={15} /> Todas las evaluaciones
      </a>
      <PageHeader
        title={`Evaluación · Semana ${week}`}
        sub={w.theme}
        action={ev?.completedAt ? <Badge tone="green">Completada el {formatShort(ev.completedAt)}</Badge> : ev ? <Badge tone="blue">Borrador guardado automáticamente</Badge> : undefined}
      />
      <div className="mb-4"><Notice tone="amber">{DISCLAIMER}</Notice></div>
      <Tabs
        label="Secciones de la evaluación"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'vocabulario', label: 'Vocabulario' },
          { value: 'listening', label: 'Listening' },
          { value: 'speaking', label: 'Speaking' },
          { value: 'writing', label: 'Writing' },
          { value: 'gramatica', label: 'Gramática' },
          { value: 'resultados', label: 'Resultados' },
        ]}
        className="[&_[role=tablist]]:overflow-x-auto"
        panelClassName="p-4 sm:p-5"
        renderPanel={(v) => {
          const e = ev ?? null;
          switch (v) {
            case 'vocabulario': return <VocabSection week={week} ev={e} set={set} />;
            case 'listening': return <ListeningSection ev={e} set={set} />;
            case 'speaking': return <SpeakingSection week={week} ev={e} set={set} />;
            case 'writing': return <WritingSection week={week} ev={e} set={set} />;
            case 'gramatica': return <GrammarSection week={week} ev={e} set={set} />;
            default: return <ResultsSection week={week} ev={e} set={set} onDelete={() => setConfirmDelete(true)} />;
          }
        }}
      />
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta evaluación?"
        description="Se eliminarán todas las respuestas de esta semana."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { deleteEvaluation(week); setConfirmDelete(false); toast('Evaluación borrada.', 'info'); }}>Borrar</Button>
          </div>
        }
      />
    </div>
  );
}

type SectionProps = { ev: EvaluationRecord | null; set: (fn: (e: EvaluationRecord) => EvaluationRecord) => void };

function VocabSection({ week, ev, set }: SectionProps & { week: number }) {
  const s = useAppState();
  const exprs = weekPlan(week)!.expressionIds.map((id) => s.vocab[id]).filter(Boolean);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const item = (id: string) => ev?.vocabulary.find((x) => x.expressionId === id) ?? { expressionId: id, recalled: false, usedCorrectly: false, note: '' };
  const patch = (id: string, p: Partial<EvaluationRecord['vocabulary'][number]>) =>
    set((e) => {
      const rest = e.vocabulary.filter((x) => x.expressionId !== id);
      return { ...e, vocabulary: [...rest, { ...item(id), ...p }] };
    });

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-muted">Para cada expresión: intenta recordar el significado antes de mirarlo y escribe una oración. Sé honesto: esto es para ti.</p>
      {exprs.map((v) => {
        const it = item(v.id);
        return (
          <div key={v.id} className="rounded-xl border border-line p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">{v.en}</p>
              {shown[v.id] ? <span className="text-[13.5px] text-slate-700">{v.es}</span> : <button type="button" className="text-[13px] font-medium text-learn hover:underline" onClick={() => setShown({ ...shown, [v.id]: true })}>Ver significado</button>}
            </div>
            <input className="field mt-2" value={it.note} onChange={(e) => patch(v.id, { note: e.target.value })} placeholder="Escribe una oración con esta expresión" aria-label={`Oración con ${v.en}`} />
            <div className="mt-2 flex flex-wrap gap-4 text-[13px]">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#2563eb]" checked={it.recalled} onChange={(e) => patch(v.id, { recalled: e.target.checked })} /> Recordé el significado</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#16a34a]" checked={it.usedCorrectly} onChange={(e) => patch(v.id, { usedCorrectly: e.target.checked })} /> Sé usarla en una oración</label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListeningSection({ ev, set }: SectionProps) {
  const l = ev?.listening ?? { audioTitle: '', audioUrl: '', topic: '', comprehension: 0, summary: '', unknownWords: '' };
  const p = (patch: Partial<EvaluationRecord['listening']>) => set((e) => ({ ...e, listening: { ...e.listening, ...patch } }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Título del audio o vídeo"><input className="field" value={l.audioTitle} onChange={(e) => p({ audioTitle: e.target.value })} /></Field>
      <Field label="Enlace (opcional)"><input className="field" type="url" value={l.audioUrl} onChange={(e) => p({ audioUrl: e.target.value })} placeholder="https://…" /></Field>
      <Field label="Tema"><input className="field" value={l.topic} onChange={(e) => p({ topic: e.target.value })} /></Field>
      <Field label={`Comprensión aproximada: ${l.comprehension ? `${l.comprehension}%` : 'sin indicar'}`} hint="Tu estimación personal, no una medida objetiva.">
        <input type="range" min={0} max={100} step={5} value={l.comprehension} onChange={(e) => p({ comprehension: Number(e.target.value) })} className="w-full accent-[#2563eb]" />
      </Field>
      <Field label="Resumen de lo que entendí" className="sm:col-span-2"><textarea className="field" value={l.summary} onChange={(e) => p({ summary: e.target.value })} /></Field>
      <Field label="Palabras que no comprendí" className="sm:col-span-2"><textarea className="field" value={l.unknownWords} onChange={(e) => p({ unknownWords: e.target.value })} /></Field>
    </div>
  );
}

const SPEAK_KEYS = [
  ['fluency', 'Fluidez'],
  ['vocabulary', 'Vocabulario'],
  ['grammar', 'Gramática'],
  ['pronunciation', 'Pronunciación'],
  ['confidence', 'Confianza'],
] as const;

function SpeakingSection({ week, ev, set }: SectionProps & { week: number }) {
  const w = weekPlan(week)!;
  const sp = ev?.speaking ?? { topic: '', minutes: 0, fluency: 0, vocabulary: 0, grammar: 0, pronunciation: 0, confidence: 0 };
  const suggested = w.speakingQuestions[w.speakingQuestions.length - 1] ?? '';
  const p = (patch: Partial<EvaluationRecord['speaking']>) => set((e) => ({ ...e, speaking: { ...e.speaking, ...patch } }));
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-learn-soft/50 p-4">
        <p className="text-[12px] font-medium text-learn uppercase">Habla 2–3 minutos sobre</p>
        <p className="mt-1 text-[16px] font-medium">{sp.topic || suggested}</p>
        {!sp.topic && <button type="button" className="mt-1 text-[13px] font-medium text-learn hover:underline" onClick={() => p({ topic: suggested })}>Usar este tema</button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tema (puedes cambiarlo)"><input className="field" value={sp.topic} onChange={(e) => p({ topic: e.target.value })} placeholder={suggested} /></Field>
        <Field label="Minutos que hablaste"><input className="field" type="number" min={0} max={30} value={sp.minutes || ''} onChange={(e) => p({ minutes: Math.max(0, Number(e.target.value) || 0) })} /></Field>
      </div>
      <p className="text-[13px] text-muted">Autoevaluación de 1 (muy bajo) a 5 (muy alto):</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SPEAK_KEYS.map(([k, label]) => (
          <Field key={k} label={label}><Rating label={label} value={sp[k]} onChange={(v) => p({ [k]: v })} /></Field>
        ))}
      </div>
    </div>
  );
}

function WritingSection({ week, ev, set }: SectionProps & { week: number }) {
  const task = weekPlan(week)!.writingTask;
  const wr = ev?.writing ?? { task, answer: '', errorsFound: '' };
  const words = wr.answer.trim() ? wr.answer.trim().split(/\s+/).length : 0;
  const p = (patch: Partial<EvaluationRecord['writing']>) => set((e) => ({ ...e, writing: { ...e.writing, task, ...patch } }));
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-4 text-[14px]"><span className="font-medium">Tarea:</span> {task}</div>
      <Field label="Mi texto" hint={`${words} palabras`}><textarea className="field min-h-40" value={wr.answer} onChange={(e) => p({ answer: e.target.value })} /></Field>
      <Field label="Errores que he identificado al releerlo" hint="Ej.: «I am agree» → «I agree»."><textarea className="field" value={wr.errorsFound} onChange={(e) => p({ errorsFound: e.target.value })} /></Field>
    </div>
  );
}

function GrammarSection({ week, ev, set }: SectionProps & { week: number }) {
  const exercises = weekPlan(week)!.grammar;
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const item = (i: number) => ev?.grammar.find((g) => g.exerciseIndex === i);
  const patch = (i: number, p: Partial<EvaluationRecord['grammar'][number]>) =>
    set((e) => {
      const cur = e.grammar.find((g) => g.exerciseIndex === i) ?? { exerciseIndex: i, answer: '', correct: false };
      return { ...e, grammar: [...e.grammar.filter((g) => g.exerciseIndex !== i), { ...cur, ...p }].sort((a, b) => a.exerciseIndex - b.exerciseIndex) };
    });

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-muted">Escribe tu respuesta y pulsa «Comprobar». Si coincide con la clave se corrige automáticamente; si no, compárala tú con la clave (muchas respuestas admiten varias formas).</p>
      {exercises.map((ex, i) => {
        const it = item(i);
        const isChecked = checked[i] || !!it?.checkedBy;
        return (
          <div key={i} className="rounded-xl border border-line p-4">
            <p className="text-[14px] font-medium text-ink">{i + 1}. {ex.q}</p>
            <input className="field mt-2" value={it?.answer ?? ''} onChange={(e) => patch(i, { answer: e.target.value, correct: false, checkedBy: undefined })} onInput={() => setChecked({ ...checked, [i]: false })} aria-label={`Respuesta al ejercicio ${i + 1}`} />
            {!isChecked ? (
              <Button
                size="sm"
                variant="learn"
                className="mt-2"
                disabled={!it?.answer.trim()}
                onClick={() => {
                  setChecked({ ...checked, [i]: true });
                  if (it && norm(it.answer) === norm(ex.a)) patch(i, { correct: true, checkedBy: 'clave' });
                }}
              >
                Comprobar
              </Button>
            ) : (
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-[13.5px]">
                <p><span className="font-medium">Clave:</span> {ex.a}</p>
                <p className="text-muted"><span className="font-medium text-slate-600">Por qué:</span> {ex.why}</p>
                {it?.checkedBy === 'clave' ? (
                  <Badge tone="green"><Icon name="check" size={12} /> Correcta (coincide con la clave)</Badge>
                ) : it?.checkedBy === 'autoevaluacion' ? (
                  <Badge tone={it.correct ? 'green' : 'red'}>{it.correct ? 'Marcada como correcta por ti' : 'Marcada como incorrecta por ti'}</Badge>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">No coincide literalmente. ¿Tu respuesta es equivalente?</span>
                    <Button size="sm" onClick={() => patch(i, { correct: true, checkedBy: 'autoevaluacion' })}>Sí, es equivalente</Button>
                    <Button size="sm" onClick={() => patch(i, { correct: false, checkedBy: 'autoevaluacion' })}>No, era incorrecta</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function suggestions(sc: NonNullable<ReturnType<typeof evaluationScores>>) {
  const strengths: string[] = [];
  const improve: string[] = [];
  const recs: string[] = [];
  if (sc.vocabRecall !== null) (sc.vocabRecall >= 70 ? strengths : improve).push(`Recuerdas el ${sc.vocabRecall}% de las expresiones de la semana.`);
  if (sc.vocabUse !== null && sc.vocabUse < 60) recs.push('Escribe una oración propia con cada expresión que todavía no sabes usar.');
  if (sc.grammar !== null) (sc.grammar >= 67 ? strengths : improve).push(`Gramática: ${sc.grammarOk} de ${sc.grammarAnswered} ejercicios correctos.`);
  if (sc.listening !== null) (sc.listening >= 60 ? strengths : improve).push(`Comprensión auditiva estimada: ${sc.listening}%.`);
  if (sc.listening !== null && sc.listening < 60) recs.push('Elige vídeos algo más cortos y vuelve a escucharlos con subtítulos en inglés.');
  if (sc.speaking !== null) (sc.speaking >= 3.5 ? strengths : improve).push(`Speaking: media de ${sc.speaking.toFixed(1)} sobre 5 en tu autoevaluación.`);
  if (sc.speaking !== null && sc.speaking < 3.5) recs.push('Habla 2 minutos más al día sobre la pregunta de speaking, aunque sea en voz baja.');
  if (!sc.writingDone) recs.push('Completa la tarea de writing: escribir te ayuda a fijar las estructuras.');
  if (!recs.length) recs.push('Mantén el ritmo de la semana y sigue repasando las expresiones pendientes.');
  return { strengths: strengths.join('\n'), improvements: improve.join('\n'), recommendations: recs.join('\n') };
}

function ResultsSection({ week, ev, set, onDelete }: SectionProps & { week: number; onDelete: () => void }) {
  const s = useAppState();
  const sc = evaluationScores(s, week);
  if (!ev || !sc) {
    return <p className="text-[13.5px] text-muted">Rellena al menos una sección para ver los resultados.</p>;
  }
  const sug = suggestions(sc);
  const pct = (v: number | null) => (v === null ? 'Sin datos' : `${v}%`);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4!">
          <CardTitle icon="check" sub="Comparada con la clave de respuestas.">Corrección con clave</CardTitle>
          <p className="text-[13.5px]">Gramática corregida automáticamente: <b>{sc.grammarByKey}</b> de {weekPlan(week)!.grammar.length} ejercicios coincidieron con la clave.</p>
          <p className="mt-1 text-[12.5px] text-muted">Las respuestas que tú marcaste como equivalentes cuentan como autoevaluación.</p>
        </Card>
        <Card className="p-4!">
          <CardTitle icon="pen" sub="Tus propias valoraciones. No son una medida objetiva.">Autoevaluación</CardTitle>
          <ul className="space-y-1 text-[13.5px]">
            <li>Vocabulario recordado: <b>{pct(sc.vocabRecall)}</b> · sé usarlas: <b>{pct(sc.vocabUse)}</b></li>
            <li>Gramática (incluye tus correcciones): <b>{pct(sc.grammar)}</b></li>
            <li>Listening estimado: <b>{pct(sc.listening)}</b></li>
            <li>Speaking: <b>{sc.speaking ? `${sc.speaking.toFixed(1)} / 5` : 'Sin datos'}</b></li>
            <li>Writing: <b>{sc.writingDone ? 'Texto entregado' : 'Sin texto'}</b></li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Qué tal tu reading esta semana? (1–5)"><Rating label="Reading" value={ev.selfRatings?.reading ?? 0} onChange={(v) => set((e) => ({ ...e, selfRatings: { reading: v, writing: e.selfRatings?.writing ?? 0 } }))} /></Field>
        <Field label="¿Y tu writing? (1–5)"><Rating label="Writing" value={ev.selfRatings?.writing ?? 0} onChange={(v) => set((e) => ({ ...e, selfRatings: { writing: v, reading: e.selfRatings?.reading ?? 0 } }))} /></Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon="sparkle" onClick={() => set((e) => ({ ...e, ...sug }))}>Rellenar con sugerencias según mis datos</Button>
        <span className="text-[12.5px] text-muted">Generadas con reglas simples a partir de tus respuestas; edítalas libremente.</span>
      </div>
      <Field label="Fortalezas"><textarea className="field" value={ev.strengths} onChange={(e) => set((x) => ({ ...x, strengths: e.target.value }))} placeholder={sug.strengths} /></Field>
      <Field label="Aspectos a mejorar"><textarea className="field" value={ev.improvements} onChange={(e) => set((x) => ({ ...x, improvements: e.target.value }))} placeholder={sug.improvements} /></Field>
      <Field label="Recomendaciones para la semana siguiente"><textarea className="field" value={ev.recommendations} onChange={(e) => set((x) => ({ ...x, recommendations: e.target.value }))} placeholder={sug.recommendations} /></Field>

      <Notice tone="amber">{DISCLAIMER}</Notice>
      <div className="flex flex-wrap gap-2">
        {ev.completedAt ? (
          <Button onClick={() => set((e) => ({ ...e, completedAt: null }))}>Volver a borrador</Button>
        ) : (
          <Button variant="primary" icon="check" onClick={() => { set((e) => ({ ...e, completedAt: todayISO() })); toast('Evaluación guardada como completada.'); }}>Marcar evaluación como completada</Button>
        )}
        {week < 12 && <Button onClick={() => navigate('progreso', week + 1)}>Ver semana {week + 1}</Button>}
        <Button variant="danger" icon="trash" onClick={onDelete}>Borrar evaluación</Button>
      </div>
    </div>
  );
}
