import { useRef, useState } from 'react';
import type { AppState } from '../../lib/types';
import { getState, replaceState, update } from '../../lib/store';
import { backupJSON, download, parseJSONImport, previewCSV, vocabToCSV, type ImportPreview } from '../../lib/csv';
import { todayISO, formatLong } from '../../lib/dates';
import { Modal } from '../interior/modal';
import { Button, Notice } from '../ui/primitives';
import { toast } from '../ui/Toast';

export function exportBackup() {
  download(`b1b2-english-copia-${todayISO()}.json`, backupJSON(getState()), 'application/json');
  toast('Copia de seguridad descargada.');
}

export function exportVocabCSV() {
  const list = Object.values(getState().vocab).sort((a, b) => a.id.localeCompare(b.id));
  download(`b1b2-english-vocabulario-${todayISO()}.csv`, vocabToCSV(list), 'text/csv;charset=utf-8');
  toast(`CSV descargado con ${list.length} expresiones.`);
}

type Pending =
  | { kind: 'vocab'; preview: ImportPreview; file: string }
  | { kind: 'backup'; state: AppState; file: string };

/** Botón + flujo de importación (CSV o JSON) con vista previa, avisos de duplicados y confirmación. */
export function ImportButton({ label = 'Importar CSV o JSON', accept = '.csv,.json,application/json,text/csv' }: { label?: string; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setOverwrite(false);
    try {
      if (f.size > 10 * 1024 * 1024) throw new Error('El archivo es demasiado grande (máximo 10 MB).');
      const text = await f.text();
      const bank = getState().vocab;
      const isJSON = f.name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[');
      if (isJSON) {
        const res = parseJSONImport(text, bank);
        setPending(res.kind === 'backup' ? { kind: 'backup', state: res.state, file: f.name } : { kind: 'vocab', preview: res.preview, file: f.name });
      } else {
        setPending({ kind: 'vocab', preview: previewCSV(text, bank), file: f.name });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const applyVocab = (p: ImportPreview) => {
    const dup = new Set(p.duplicatesInBank);
    const toApply = p.records.filter((r) => overwrite || !dup.has(r.id));
    update((s) => {
      const vocab = { ...s.vocab };
      for (const r of toApply) {
        const cur = vocab[r.id];
        // Si sobrescribimos una expresión existente, conservamos su historial real de repasos.
        vocab[r.id] = cur ? { ...cur, ...r, reviewHistory: cur.reviewHistory, timesReviewed: cur.timesReviewed, reviewStage: cur.reviewStage, lastReviewed: cur.lastReviewed, source: cur.source } : r;
      }
      return { ...s, vocab };
    });
    toast(`${toApply.length} expresiones importadas${!overwrite && dup.size ? `, ${dup.size} duplicadas omitidas` : ''}.`);
    setPending(null);
  };

  return (
    <>
      <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <Button icon="upload" onClick={() => input.current?.click()}>{label}</Button>
      {error && (
        <Modal open onClose={() => setError(null)} title="No se pudo importar" footer={<Button onClick={() => setError(null)}>Entendido</Button>}>
          <Notice tone="red" icon="alert">{error}</Notice>
          <p className="mt-3 text-[13px] text-muted">Formato CSV esperado: una cabecera con al menos las columnas <code>en</code> y <code>es</code>. Opcionales: id, category, level, example, exampleEs, context, status, activeUse, addedAt, nextReview.</p>
        </Modal>
      )}
      {pending?.kind === 'vocab' && (
        <Modal
          open
          onClose={() => setPending(null)}
          title="Revisar importación"
          description={pending.file}
          maxWidth={520}
          footer={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>Cancelar</Button>
              <Button variant="primary" disabled={pending.preview.records.length === 0} onClick={() => applyVocab(pending.preview)}>Importar</Button>
            </div>
          }
        >
          <div className="space-y-3 text-[13.5px]">
            <p><b>{pending.preview.records.length}</b> expresiones válidas encontradas.</p>
            {pending.preview.duplicatesInBank.length > 0 && (
              <Notice tone="amber">
                {pending.preview.duplicatesInBank.length} IDs ya existen en tu banco ({pending.preview.duplicatesInBank.slice(0, 6).join(', ')}{pending.preview.duplicatesInBank.length > 6 ? '…' : ''}).
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="accent-[#2563eb]" />
                  Sobrescribir los textos de esas expresiones (se conserva su historial de repasos)
                </label>
              </Notice>
            )}
            {pending.preview.duplicatesInFile.length > 0 && <Notice tone="amber">IDs repetidos dentro del archivo (se usa la primera aparición): {pending.preview.duplicatesInFile.slice(0, 8).join(', ')}</Notice>}
            {pending.preview.errors.length > 0 && (
              <Notice tone="red" icon="alert">
                {pending.preview.errors.length} filas con errores se omitirán:
                <ul className="mt-1 list-disc pl-4">{pending.preview.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
              </Notice>
            )}
            {pending.preview.warnings.length > 0 && (
              <ul className="list-disc pl-4 text-[12.5px] text-muted">{pending.preview.warnings.slice(0, 5).map((w) => <li key={w}>{w}</li>)}</ul>
            )}
          </div>
        </Modal>
      )}
      {pending?.kind === 'backup' && (
        <Modal
          open
          onClose={() => setPending(null)}
          title="Restaurar copia de seguridad"
          description={pending.file}
          footer={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>Cancelar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  replaceState(pending.state);
                  toast('Copia de seguridad restaurada.');
                  setPending(null);
                }}
              >
                Sustituir todos mis datos
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-[13.5px]">
            <p>Esta copia contiene {Object.keys(pending.state.sessions).length} sesiones, {Object.keys(pending.state.vocab).length} expresiones y {Object.keys(pending.state.evaluations).length} evaluaciones{pending.state.settings.startDate ? `, con inicio el ${formatLong(pending.state.settings.startDate)}` : ''}.</p>
            <Notice tone="amber" icon="alert">Restaurarla <b>sustituye</b> todos los datos actuales de este navegador. Si quieres conservarlos, exporta antes una copia.</Notice>
            <Button size="sm" icon="download" onClick={exportBackup}>Exportar copia actual primero</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
