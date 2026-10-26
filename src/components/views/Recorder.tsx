import { useEffect, useRef, useState } from 'react';
import { deleteRecording, loadRecording, recordingSupported, saveRecording } from '../../lib/audio';
import { Button, Notice } from '../ui/primitives';

/**
 * Grabación de audio opcional. Solo pide el micrófono cuando el usuario pulsa "Grabar".
 * El audio se guarda en IndexedDB de este navegador; no se analiza ni se evalúa.
 */
export function Recorder({ storageKey }: { storageKey: string }) {
  const [supported] = useState(recordingSupported);
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!supported) return;
    let objectUrl: string | null = null;
    loadRecording(storageKey)
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => setError('No se pudo leer la grabación guardada.'));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storageKey, supported]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);

  if (!supported) {
    return (
      <Notice tone="amber" icon="mic">
        La grabación de audio no está disponible en este navegador. Puedes practicar en voz alta igualmente y anotar tus dificultades abajo.
      </Notice>
    );
  }

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        try {
          await saveRecording(storageKey, blob);
        } catch {
          setError('La grabación se puede escuchar ahora, pero no se pudo guardar en el navegador.');
        }
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      };
      rec.current = mr;
      mr.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError('No se concedió permiso para usar el micrófono (o no hay micrófono disponible).');
    }
  };

  const stop = () => {
    rec.current?.stop();
    setRecording(false);
  };

  const remove = async () => {
    try {
      await deleteRecording(storageKey);
    } catch {
      /* si falla, al menos se oculta */
    }
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
  };

  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="mb-2 text-[13px] text-muted">
        Grabación opcional para escucharte después. Se guarda solo en este navegador y nadie la evalúa automáticamente.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button size="sm" icon="mic" onClick={start}>{url ? 'Grabar de nuevo' : 'Grabar (pide permiso)'}</Button>
        ) : (
          <Button size="sm" variant="danger" icon="stop" onClick={stop}>
            Detener · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </Button>
        )}
        {url && !recording && (
          <>
            <audio controls src={url} className="h-9 max-w-full" />
            <Button size="sm" variant="ghost" icon="trash" onClick={remove}>Borrar grabación</Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-[12.5px] text-red-700">{error}</p>}
    </div>
  );
}
