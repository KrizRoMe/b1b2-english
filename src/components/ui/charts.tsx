import { useId, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

// Gráficos SVG propios, sin dependencias. Marcas finas, rejilla discreta, tooltip al pasar el ratón/tocar.
export const SERIES_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#D97706'] as const;
const GRID = '#E2E8F0';
const AXIS_TEXT = '#64748B';

function Tip({ x, y, children, width, height }: { x: number; y: number; children: ReactNode; width: number; height: number }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] whitespace-nowrap text-ink shadow-md"
      style={{ left: `${(left / width) * 100}%`, top: `calc(${(y / height) * 100}% - 6px)` }}
    >
      {children}
    </div>
  );
}

export type BarDatum = { label: string; value: number; tip: ReactNode; muted?: boolean };

/** Barras verticales con extremo redondeado (4px) anclado a la línea base. */
export function BarChart({ data, max, unit = '', height = 180, ariaLabel, color = SERIES_COLORS[1] }: { data: BarDatum[]; max?: number; unit?: string; height?: number; ariaLabel: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const pad = { l: 34, r: 8, t: 12, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const top = Math.max(1, max ?? Math.max(...data.map((d) => d.value), 1));
  const ticks = [0, 0.5, 1].map((f) => Math.round(top * f));
  const slot = innerW / data.length;
  const bw = Math.min(28, slot * 0.6);
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;

  return (
    <div className="relative w-full" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS_TEXT}>{t}{unit}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const h = Math.max(0, (Math.min(d.value, top) / top) * innerH);
          const r = Math.min(4, h / 2, bw / 2);
          const x0 = cx - bw / 2;
          const yb = pad.t + innerH;
          const path = h > 0 ? `M${x0},${yb} V${yb - h + r} Q${x0},${yb - h} ${x0 + r},${yb - h} H${x0 + bw - r} Q${x0 + bw},${yb - h} ${x0 + bw},${yb - h + r} V${yb} Z` : '';
          return (
            <g key={d.label}>
              {path && (
                <motion.path
                  d={path}
                  fill={color}
                  opacity={d.muted ? 0.35 : hover === null || hover === i ? 1 : 0.55}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ originY: 1, transformBox: 'fill-box' }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                />
              )}
              <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{d.label}</text>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={innerH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <Tip x={pad.l + slot * hover + slot / 2} y={y(Math.min(data[hover].value, top))} width={W} height={height}>
          {data[hover].tip}
        </Tip>
      )}
    </div>
  );
}

export type LineSeries = { name: string; color: string; values: (number | null)[]; marker: 'circle' | 'square' | 'diamond' | 'triangle' };

function Marker({ kind, x, y, color }: { kind: LineSeries['marker']; x: number; y: number; color: string }) {
  const s = 4.5;
  const common = { fill: color, stroke: '#fff', strokeWidth: 2 };
  if (kind === 'square') return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={1.5} {...common} />;
  if (kind === 'diamond') return <path d={`M${x},${y - s - 1} L${x + s + 1},${y} L${x},${y + s + 1} L${x - s - 1},${y} Z`} {...common} />;
  if (kind === 'triangle') return <path d={`M${x},${y - s - 1} L${x + s + 1},${y + s} L${x - s - 1},${y + s} Z`} {...common} />;
  return <circle cx={x} cy={y} r={s} {...common} />;
}

/** Líneas con huecos donde no hay datos, cruz de lectura y tooltip con todas las series. */
export function LineChart({ series, labels, min = 1, max = 5, height = 220, ariaLabel, format = (v: number) => v.toFixed(1) }: { series: LineSeries[]; labels: string[]; min?: number; max?: number; height?: number; ariaLabel: string; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const pad = { l: 30, r: 12, t: 14, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = labels.length;
  const x = (i: number) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - ((v - min) / (max - min)) * innerH;
  const step = max - min > 10 ? (max - min) / 4 : 1;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);

  const segments = (vals: (number | null)[]) => {
    const out: string[] = [];
    let cur = '';
    vals.forEach((v, i) => {
      if (v === null) {
        if (cur) out.push(cur);
        cur = '';
      } else cur += `${cur ? 'L' : 'M'}${x(i)},${y(v)} `;
    });
    if (cur) out.push(cur);
    return out;
  };

  return (
    <div>
      <div className="relative w-full" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS_TEXT}>{t}</text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{l}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke="#94A3B8" strokeDasharray="3 3" />}
          {series.map((s) => (
            <g key={s.name}>
              {segments(s.values).map((d) => <path key={d} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
              {s.values.map((v, i) => (v === null ? null : <Marker key={i} kind={s.marker} x={x(i)} y={y(v)} color={s.color} />))}
            </g>
          ))}
          {labels.map((l, i) => (
            <rect key={`hit-${l}`} x={x(i) - innerW / n / 2} y={pad.t} width={innerW / n} height={innerH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-md" style={{ left: `${(Math.min(Math.max(x(hover), 80), W - 80) / W) * 100}%` }}>
            <p className="mb-0.5 font-medium text-ink">{labels[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}: {s.values[hover] === null ? 'sin datos' : format(s.values[hover]!)}
              </p>
            ))}
          </div>
        )}
      </div>
      <Legend items={series.map((s) => ({ name: s.name, color: s.color, marker: s.marker }))} />
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; marker?: LineSeries['marker'] }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-700">
      {items.map((it) => (
        <li key={it.name} className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            {it.marker ? <Marker kind={it.marker} x={7} y={7} color={it.color} /> : <rect x={1} y={1} width={12} height={12} rx={3} fill={it.color} />}
          </svg>
          {it.name}
        </li>
      ))}
    </ul>
  );
}

/** Anillo de progreso con el número en el centro. */
export function Ring({ value, max, size = 140, label, sub }: { value: number; max: number; size?: number; label: string; sub?: string }) {
  const id = useId();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <figure className="flex flex-col items-center" aria-labelledby={id}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(f * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#16A34A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - f) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="48%" textAnchor="middle" fontSize={size / 5} fontWeight={600} fill="#0F172A">{Math.round(f * 100)}%</text>
        {sub && <text x="50%" y="63%" textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{sub}</text>}
      </svg>
      <figcaption id={id} className="mt-1 text-[13px] text-muted">{label}</figcaption>
    </figure>
  );
}

export type HeatCell = { key: string; level: 0 | 1 | 2 | 3 | 4; kind: 'normal' | 'rest' | 'future'; tip: string };
const HEAT = ['#F1F5F9', '#BBF7D0', '#4ADE80', '#16A34A', '#166534'];

/** Mapa de calor 12 semanas × 7 días (verde secuencial; descanso en violeta suave; futuro con borde discontinuo). */
export function Heatmap({ rows, ariaLabel }: { rows: { label: string; cells: HeatCell[] }[]; ariaLabel: string }) {
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] items-center gap-1">
            <span className="text-[11px] text-muted">{row.label}</span>
            {row.cells.map((c) => (
              <span
                key={c.key}
                title={c.tip}
                onPointerEnter={() => setTip(c.tip)}
                onPointerDown={() => setTip(c.tip)}
                className={`h-5 rounded-[4px] sm:h-6 ${c.kind === 'future' ? 'border border-dashed border-slate-300' : ''}`}
                style={{ background: c.kind === 'rest' ? '#EDE9FE' : c.kind === 'future' ? 'transparent' : HEAT[c.level] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="flex items-center gap-1">Menos {HEAT.map((h) => <span key={h} className="h-3 w-3 rounded-[3px]" style={{ background: h }} />)} Más minutos</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] bg-rest-soft" /> Descanso</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] border border-dashed border-slate-300" /> Futuro</span>
      </div>
      <p className="mt-1 min-h-[18px] text-[12.5px] text-slate-700" aria-live="polite">{tip ?? ''}</p>
    </div>
  );
}

/** Barra apilada horizontal para una distribución (con separación de 2px entre segmentos). */
export function StackedBar({ parts, ariaLabel }: { parts: { name: string; value: number; color: string }[]; ariaLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          parts.filter((p) => p.value > 0).map((p) => (
            <motion.span key={p.name} title={`${p.name}: ${p.value}`} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ duration: 0.6 }} style={{ background: p.color }} />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: p.color }} />
            <span className="text-slate-700">{p.name}</span>
            <span className="ml-auto tabular-nums text-ink">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
