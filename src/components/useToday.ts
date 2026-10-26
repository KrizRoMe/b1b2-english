import { useEffect, useState } from 'react';
import { todayISO } from '../lib/dates';

/** Fecha local de hoy; se actualiza si la app sigue abierta al pasar la medianoche. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const id = setInterval(() => setToday((t) => (t === todayISO() ? t : todayISO())), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
