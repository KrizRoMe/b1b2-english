import { useState } from 'react';
import { changeStartDate, removeDemoData, resetAll, restoreDeletedPlan, setSettings, useSnapshot, STORAGE_KEY } from '../../lib/store';
import { formatHour, formatLong, isValidISO } from '../../lib/dates';
import { download, sessionsICS } from '../../lib/csv';
import { clearRecordings } from '../../lib/audio';
import { HoldToConfirm } from '../interior/hold-to-confirm';
import { Modal } from '../interior/modal';
import { TypingIndicator } from '../interior/typing-indicator';
import { Button, Card, CardTitle, Field, Notice, PageHeader } from '../ui/primitives';
import { toast } from '../ui/Toast';
import { ImportButton, exportBackup, exportVocabCSV } from './ImportExport';

export function SettingsView() {
  const { state: s, storage, lastSavedAt } = useSnapshot();
  const st = s.settings;
  const [start, setStart] = useState(st.startDate);
  const [confirmStart, setConfirmStart] = useState(false);
  const demo = Object.values(s.vocab).filter((v) => v.source === 'demo').length;
  const deletedPlan = s.deletedPlanIds?.length ?? 0;
  const hasData = Object.keys(s.sessions).length > 0;
  const startValid = isValidISO(start);
  const saving = lastSavedAt === null && storage.kind === 'ok' && hasData;

  const saveStart = () => {
    changeStartDate(start);
    setConfirmStart(false);
    toast('Fecha de inicio guardada.');
  };

  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración y copias de seguridad" />

      <Card>
        <CardTitle icon="settings" sub={`Nivel de partida ${st.levelFrom} · objetivo ${st.levelTo} · ${st.totalWeeks} semanas.`}>Mi plan</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de inicio del plan" hint={st.startDate ? `Actual: ${formatLong(st.startDate)}` : 'Aún no has elegido fecha. La app no la inventa.'}>
            <div className="flex gap-2">
              <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
              <Button variant="learn" disabled={!startValid || start === st.startDate} onClick={() => (hasData && st.startDate ? setConfirmStart(true) : saveStart())}>Guardar</Button>
            </div>
          </Field>
          <Field label="Hora programada de la sesión">
            <select className="field" value={st.scheduledHour} onChange={(e) => setSettings({ scheduledHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </Field>
          <Field label="Minutos al día">
            <input type="number" className="field" min={10} max={120} value={st.dailyMinutes} onChange={(e) => setSettings({ dailyMinutes: num(e.target.value, 10, 120) })} />
          </Field>
          <Field label="Expresiones nuevas al día" hint="El plan tiene 4 por día; con menos, el resto queda para recuperar.">
            <input type="number" className="field" min={1} max={8} value={st.dailyExpressions} onChange={(e) => setSettings({ dailyExpressions: num(e.target.value, 1, 8) })} />
          </Field>
          <Field label="Recurso de vídeo habitual" className="sm:col-span-2">
            <input className="field" value={st.videoResource} onChange={(e) => setSettings({ videoResource: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle icon="info">Dónde se guardan tus datos</CardTitle>
        <div className="space-y-3 text-[14px] text-slate-700">
          <p>
            Todo se guarda <b>solo en este navegador y en este dispositivo</b> (almacenamiento local, clave <code className="rounded bg-slate-100 px-1 text-[12.5px]">{STORAGE_KEY}</code>). No hay cuentas, ni servidor, ni sincronización entre dispositivos.
          </p>
          <p>Si borras los datos del navegador, usas el modo privado o cambias de dispositivo, no verás tu progreso. Exporta una copia de seguridad con regularidad y, para pasar a otro dispositivo, impórtala allí.</p>
          <p>Las grabaciones de speaking se guardan aparte en este navegador y no se incluyen en la copia JSON.</p>
          <div className="flex items-center gap-2 text-[13px] text-muted">
            {storage.kind === 'ok' ? (
              saving ? <><TypingIndicator typists={['Guardando']} showLabel={false} /> Guardando…</> : <>Autoguardado activo{lastSavedAt ? ` · último guardado a las ${new Date(lastSavedAt).toLocaleTimeString('es-ES')}` : ''}.</>
            ) : (
              <span className="text-[#b45309]">{storage.message}</span>
            )}
          </div>
          {storage.kind === 'recuperado' && (
            <Button size="sm" icon="download" onClick={() => download('b1b2-english-datos-danados.txt', storage.raw, 'text/plain')}>Descargar los datos que no se pudieron leer</Button>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle icon="download" sub="Exporta antes de cambiar de navegador o borrar datos.">Copias de seguridad</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon="download" onClick={exportBackup}>Exportar todo (JSON)</Button>
          <Button icon="download" onClick={exportVocabCSV}>Exportar vocabulario (CSV)</Button>
          <ImportButton label="Importar copia o vocabulario" />
        </div>
        <p className="mt-3 text-[12.5px] text-muted">Importar una copia JSON completa sustituye tus datos (se pide confirmación). Importar un CSV o una lista JSON de expresiones las añade al banco y avisa de los IDs duplicados.</p>
      </Card>

      <Card>
        <CardTitle icon="calendar" sub="La app no puede enviarte notificaciones automáticas: no tiene servidor ni permisos push.">Recordatorios</CardTitle>
        <p className="mb-3 text-[14px] text-slate-700">Alternativa: descarga un archivo .ics con las 84 sesiones a las {formatHour(st.scheduledHour)} e impórtalo en tu calendario (Google Calendar, Apple Calendar, Outlook). Tu calendario se encargará de avisarte.</p>
        <Button
          icon="download"
          disabled={!isValidISO(st.startDate)}
          onClick={() => {
            download('b1b2-english-sesiones.ics', sessionsICS(s), 'text/calendar;charset=utf-8');
            toast('Calendario .ics descargado.');
          }}
        >
          Descargar calendario .ics
        </Button>
        {!isValidISO(st.startDate) && <p className="mt-2 text-[12.5px] text-muted">Primero elige la fecha de inicio.</p>}
      </Card>

      <Card>
        <CardTitle icon="book">Banco de expresiones</CardTitle>
        <div className="space-y-3 text-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-700">{demo ? `${demo} expresiones de demostración (marcadas como tales en el banco).` : 'No hay expresiones de demostración.'}</span>
            <Button size="sm" disabled={!demo} onClick={() => { removeDemoData(); toast('Datos de demostración eliminados.', 'info'); }}>Quitar datos de demostración</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-700">{deletedPlan ? `Has eliminado ${deletedPlan} expresiones del banco del plan.` : 'Tienes todas las expresiones del banco del plan.'}</span>
            <Button size="sm" disabled={!deletedPlan} onClick={() => { restoreDeletedPlan(); toast('Expresiones del plan restauradas.'); }}>Restaurar expresiones del plan</Button>
          </div>
        </div>
      </Card>

      <Card className="border-red-200">
        <CardTitle icon="trash" sub="Borra sesiones, vocabulario, evaluaciones, logros y grabaciones de este navegador. No se puede deshacer.">Borrar todos los datos</CardTitle>
        <Notice tone="red" icon="alert">Antes de borrar, exporta una copia si quieres conservar algo.</Notice>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button icon="download" onClick={exportBackup}>Exportar copia primero</Button>
          <HoldToConfirm
            duration={1500}
            confirmLabel="Datos borrados"
            onConfirm={() => {
              resetAll();
              setStart('');
              clearRecordings().catch(() => undefined);
              toast('Todos los datos se han borrado. Empiezas de cero.', 'info');
            }}
            className="border-red-300! text-red-700!"
          >
            Mantén pulsado para borrar todo
          </HoldToConfirm>
        </div>
      </Card>

      <Modal
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        title="¿Cambiar la fecha de inicio?"
        description="Tus sesiones se conservan con su fecha real, pero se recolocarán en la semana del plan que les corresponda con la nueva fecha."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmStart(false)}>Cancelar</Button>
            <Button variant="learn" onClick={saveStart}>Cambiar fecha</Button>
          </div>
        }
      />
    </div>
  );
}
