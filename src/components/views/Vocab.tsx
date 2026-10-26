import { useMemo, useState } from 'react';
import type { LearningStatus, VocabRecord } from '../../lib/types';
import { deleteVocab, patchVocab, upsertVocab, useAppState } from '../../lib/store';
import { CATEGORIES, categoryName } from '../../lib/plan';
import { STATUS_LABEL } from '../../lib/spacedRepetition';
import { addDays, formatShort, todayISO } from '../../lib/dates';
import { SegmentedControl } from '../interior/segmented-control';
import { Pagination } from '../interior/pagination';
import { Drawer } from '../interior/drawer';
import { Modal } from '../interior/modal';
import { CopyButton } from '../interior/copy-button';
import { Badge, Button, Card, EmptyState, Field, InfoTip, PageHeader } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ImportButton, exportBackup, exportVocabCSV } from './ImportExport';

const PAGE_SIZE = 20;
type StatusFilter = 'todas' | LearningStatus | 'activa';
type Sort = 'plan' | 'az' | 'za' | 'reciente' | 'repaso';

const STATUS_TONE: Record<LearningStatus, 'slate' | 'blue' | 'amber' | 'green'> = {
  nueva: 'slate',
  aprendiendo: 'blue',
  'necesita-repaso': 'amber',
  aprendida: 'green',
  dominada: 'green',
};

const SOURCE_LABEL = { plan: 'Banco del plan', demo: 'Demostración', usuario: 'Añadida por mí' } as const;

export function VocabView() {
  const s = useAppState();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [sort, setSort] = useState<Sort>('plan');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<VocabRecord | 'new' | null>(null);
  const [deleting, setDeleting] = useState<VocabRecord | null>(null);

  const all = useMemo(() => Object.values(s.vocab), [s.vocab]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((v) => {
      if (cat !== 'todas' && v.category !== cat) return false;
      if (status === 'activa' ? !v.activeUse : status !== 'todas' && v.status !== status) return false;
      if (needle && !`${v.en} ${v.es} ${v.example} ${v.ownSentence}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const cmp: Record<Sort, (a: VocabRecord, b: VocabRecord) => number> = {
      plan: (a, b) => (a.day || 999) - (b.day || 999) || a.id.localeCompare(b.id),
      az: (a, b) => a.en.localeCompare(b.en, 'en'),
      za: (a, b) => b.en.localeCompare(a.en, 'en'),
      reciente: (a, b) => b.addedAt.localeCompare(a.addedAt) || b.id.localeCompare(a.id),
      repaso: (a, b) => (a.nextReview ?? '9999').localeCompare(b.nextReview ?? '9999'),
    };
    return list.sort(cmp[sort]);
  }, [all, q, cat, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const studied = all.filter((v) => v.status !== 'nueva').length;
  const active = all.filter((v) => v.activeUse).length;
  const demo = all.filter((v) => v.source === 'demo').length;
  const resetPage = () => setPage(1);

  return (
    <div>
      <PageHeader
        title="Banco de expresiones"
        sub={`${all.length} expresiones · ${studied} estudiadas · ${active} de uso activo. Incluye el banco del plan (12 semanas)${demo ? ` y ${demo} expresiones de demostración` : ''}.`}
        action={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Añadir expresión</Button>}
      />

      <Card className="mb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem_12rem]">
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" size={16} />
            <input className="field pl-9!" placeholder="Buscar en inglés o español…" value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
          </label>
          <label>
            <span className="sr-only">Categoría</span>
            <select className="field" value={cat} onChange={(e) => { setCat(e.target.value); resetPage(); }}>
              <option value="todas">Todas las categorías</option>
              {Object.entries(CATEGORIES).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Orden</span>
            <select className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="plan">Orden del plan</option>
              <option value="az">Alfabético (A–Z)</option>
              <option value="za">Alfabético (Z–A)</option>
              <option value="reciente">Fecha de incorporación</option>
              <option value="repaso">Próximo repaso</option>
            </select>
          </label>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <SegmentedControl
            label="Filtrar por estado"
            value={status}
            onValueChange={(v) => { setStatus(v as StatusFilter); resetPage(); }}
            className="min-w-[640px]"
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'nueva', label: 'Nuevas' },
              { value: 'aprendiendo', label: 'Aprendiendo' },
              { value: 'necesita-repaso', label: 'Repasar' },
              { value: 'aprendida', label: 'Aprendidas' },
              { value: 'dominada', label: 'Dominadas' },
              { value: 'activa', label: 'Uso activo' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button size="sm" icon="download" onClick={exportVocabCSV}>Exportar CSV</Button>
          <Button size="sm" icon="download" onClick={exportBackup}>Exportar JSON completo</Button>
          <ImportButton />
          <span className="ml-auto text-[12.5px] text-muted">{filtered.length} resultados</span>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState icon="search" title="No hay expresiones con estos filtros" action={<Button onClick={() => { setQ(''); setCat('todas'); setStatus('todas'); }}>Quitar filtros</Button>}>
          Prueba con otra búsqueda o categoría.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {visible.map((v) => (
            <li key={v.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-ink">{v.en}</p>
                    <CopyButton value={v.en} label="Copiar" copiedLabel="Copiado" errorLabel="Error" className="scale-90" />
                  </div>
                  <p className="text-[13.5px] text-slate-700">{v.es}</p>
                  {v.example && <p className="mt-1 text-[12.5px] text-muted italic">“{v.example}”</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(v)} aria-label={`Editar ${v.en}`}>Editar</Button>
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => setDeleting(v)} aria-label={`Eliminar ${v.en}`} className="text-red-700! hover:bg-red-50!" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                <Badge tone="blue">{categoryName(v.category)}</Badge>
                <Badge>{v.level}</Badge>
                <Badge tone={v.source === 'demo' ? 'amber' : v.source === 'usuario' ? 'violet' : 'slate'}>{SOURCE_LABEL[v.source ?? 'usuario']}</Badge>
                <span className="text-muted">· Incorporada {formatShort(v.addedAt)}</span>
                <span className="text-muted">· {v.nextReview ? `Próximo repaso ${formatShort(v.nextReview)}` : 'Sin repaso programado'}</span>
                <label className="ml-auto flex items-center gap-1.5 text-[12.5px] text-slate-700">
                  <input type="checkbox" className="accent-[#16a34a]" checked={!!v.activeUse} onChange={(e) => patchVocab(v.id, { activeUse: e.target.checked })} disabled={v.status === 'nueva'} />
                  La uso activamente
                  <InfoTip text="«Estudiada» significa que la has visto y repasado. Marca «uso activo» solo cuando ya la usas al hablar o escribir sin mirar." />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-5 flex justify-center">
          <Pagination count={pages} page={current} onPageChange={setPage} label="Páginas del banco de expresiones" />
        </div>
      )}

      <ExpressionDrawer editing={editing} onClose={() => setEditing(null)} />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="¿Eliminar esta expresión?"
        description={deleting ? `“${deleting.en}” — ${deleting.es}` : ''}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (deleting) {
                  deleteVocab(deleting.id);
                  toast('Expresión eliminada.', 'info');
                }
                setDeleting(null);
              }}
            >
              Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-[13.5px] text-muted">
          Se borrará también su historial de repasos.{deleting?.source === 'plan' && ' Es del banco del plan: podrás restaurar las expresiones del plan eliminadas desde Configuración.'}
        </p>
      </Modal>
    </div>
  );
}

type Draft = Pick<VocabRecord, 'en' | 'es' | 'category' | 'level' | 'example' | 'exampleEs' | 'context' | 'ownSentence'>;
const EMPTY: Draft = { en: '', es: '', category: 'conversacion-cotidiana', level: 'B1+', example: '', exampleEs: '', context: '', ownSentence: '' };

function ExpressionDrawer({ editing, onClose }: { editing: VocabRecord | 'new' | null; onClose: () => void }) {
  const s = useAppState();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = editing === 'new' ? 'new' : editing?.id ?? null;
  if (key !== lastKey) {
    setLastKey(key);
    setTouched(false);
    setDraft(editing && editing !== 'new' ? { en: editing.en, es: editing.es, category: editing.category, level: editing.level, example: editing.example, exampleEs: editing.exampleEs, context: editing.context, ownSentence: editing.ownSentence } : EMPTY);
  }

  const enError = !draft.en.trim() ? 'La expresión en inglés es obligatoria.' : null;
  const esError = !draft.es.trim() ? 'La traducción es obligatoria.' : null;
  const duplicate = editing === 'new' && Object.values(s.vocab).some((v) => v.en.trim().toLowerCase() === draft.en.trim().toLowerCase());
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });

  const save = () => {
    setTouched(true);
    if (enError || esError) return;
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()])) as Draft;
    if (editing === 'new') {
      const today = todayISO();
      upsertVocab({
        ...clean,
        id: `u-${Date.now().toString(36)}`,
        week: 0,
        day: 0,
        status: 'aprendiendo',
        addedAt: today,
        nextReview: addDays(today, 1),
        reviewStage: 0,
        reviewHistory: [],
        timesReviewed: 0,
        lastReviewed: null,
        source: 'usuario',
        activeUse: false,
      });
      toast('Expresión añadida. Aparecerá mañana en tus repasos.');
    } else if (editing) {
      upsertVocab({ ...editing, ...clean });
      toast('Cambios guardados.');
    }
    onClose();
  };

  return (
    <Drawer
      open={editing !== null}
      onOpenChange={(o) => !o && onClose()}
      title={editing === 'new' ? 'Nueva expresión' : 'Editar expresión'}
      description={editing === 'new' ? 'Se añadirá como «aprendiendo» con el primer repaso mañana.' : editing ? `ID ${editing.id}` : ''}
      width={420}
      closeLabel="Cerrar"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Guardar</Button>
        </div>
      }
    >
      <form className="space-y-3.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Expresión en inglés *" hint={touched && enError ? <span className="text-red-700">{enError}</span> : duplicate ? <span className="text-[#b45309]">Ya existe una expresión igual en tu banco.</span> : undefined}>
          <input className="field" value={draft.en} onChange={set('en')} aria-invalid={touched && !!enError} autoFocus />
        </Field>
        <Field label="Traducción al español *" hint={touched && esError ? <span className="text-red-700">{esError}</span> : undefined}>
          <input className="field" value={draft.es} onChange={set('es')} aria-invalid={touched && !!esError} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <select className="field" value={draft.category} onChange={set('category')}>
              {Object.entries(CATEGORIES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </Field>
          <Field label="Nivel">
            <select className="field" value={draft.level} onChange={set('level')}>
              {['B1', 'B1+', 'B2', 'B2+', 'C1'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Ejemplo en inglés"><textarea className="field" value={draft.example} onChange={set('example')} /></Field>
        <Field label="Traducción del ejemplo"><textarea className="field" value={draft.exampleEs} onChange={set('exampleEs')} /></Field>
        <Field label="Contexto de uso"><textarea className="field" value={draft.context} onChange={set('context')} /></Field>
        <Field label="Mi propia oración"><textarea className="field" value={draft.ownSentence} onChange={set('ownSentence')} /></Field>
      </form>
    </Drawer>
  );
}
