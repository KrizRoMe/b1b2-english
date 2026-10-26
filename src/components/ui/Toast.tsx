import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './Icon';

type ToastItem = { id: number; message: string; tone: 'ok' | 'error' | 'info' };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, tone: ToastItem['tone'] = 'ok') {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  emit();
  setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3500);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function ToastViewport() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => items,
    () => items,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4 lg:top-5 lg:pl-64">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm shadow-lg ${
              t.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : t.tone === 'info' ? 'border-line bg-surface text-ink' : 'border-progress/20 bg-surface text-ink'
            }`}
          >
            <Icon name={t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'info' : 'check'} className={t.tone === 'ok' ? 'text-progress' : ''} />
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="ml-1 rounded p-0.5 text-muted hover:text-ink">
              <Icon name="x" size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
