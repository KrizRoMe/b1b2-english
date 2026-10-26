import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { ProgressBar } from '../interior/progress-bar';
import { Tooltip } from '../interior/tooltip-group';

export function Card({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>{children}</Tag>;
}

export function CardTitle({ children, icon, action, sub }: { children: ReactNode; icon?: IconName; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {icon && <Icon name={icon} className="text-muted" />}
          {children}
        </h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'learn' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-progress text-white hover:bg-[#15803d] shadow-[0_1px_2px_rgba(22,163,74,0.3)]',
  learn: 'bg-learn text-white hover:bg-[#1d4ed8] shadow-[0_1px_2px_rgba(37,99,235,0.3)]',
  secondary: 'border border-line bg-surface text-ink hover:bg-slate-50',
  ghost: 'text-muted hover:bg-slate-100 hover:text-ink',
  danger: 'border border-red-200 bg-surface text-red-700 hover:bg-red-50',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: IconName } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2' };
  return (
    <button
      type={type}
      className={`inline-flex select-none items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-learn disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}

type Tone = 'green' | 'blue' | 'slate' | 'amber' | 'violet' | 'red';
const TONES: Record<Tone, string> = {
  green: 'bg-progress-soft text-[#15803d]',
  blue: 'bg-learn-soft text-[#1d4ed8]',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-warm-soft text-[#b45309]',
  violet: 'bg-rest-soft text-[#6d28d9]',
  red: 'bg-red-50 text-red-700',
};

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${TONES[tone]} ${className}`}>{children}</span>;
}

export function Bar({ value, max = 100, label, tone = 'green', className = '' }: { value: number; max?: number; label: string; tone?: 'green' | 'blue'; className?: string }) {
  return (
    <div className={`${tone === 'green' ? 'bar-progress' : 'bar-learn'} ${className}`}>
      <ProgressBar value={value} max={max} label={label} completeLabel="Completado" />
    </div>
  );
}

export function Field({ label, hint, children, className = '' }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

/** Escala 1–5 accesible (radiogroup). 0 = sin valorar. */
export function Rating({
  value,
  onChange,
  label,
  labels,
  tone = 'blue',
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  labels?: string[];
  tone?: 'blue' | 'green';
}) {
  const on = tone === 'blue' ? 'border-learn bg-learn text-white' : 'border-progress bg-progress text-white';
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={labels ? `${n}: ${labels[n - 1]}` : String(n)}
            onClick={() => onChange(value === n ? 0 : n)}
            className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition-colors ${value === n ? on : 'border-line bg-surface text-ink hover:bg-slate-50'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {labels && <p className="mt-1.5 min-h-[18px] text-[12.5px] text-muted">{value ? labels[value - 1] : 'Sin valorar'}</p>}
    </div>
  );
}

export function EmptyState({ icon = 'info', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-muted">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-[13.5px] text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: IconName }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
        {icon && <Icon name={icon} size={15} />}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip label={text} contentClassName="max-w-[260px] whitespace-normal text-left">
      <span tabIndex={0} role="img" aria-label={text} className="inline-grid h-5 w-5 cursor-help place-items-center rounded-full text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-learn">
        <Icon name="info" size={15} />
      </span>
    </Tooltip>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Notice({ tone = 'blue', children, icon = 'info' }: { tone?: 'blue' | 'amber' | 'green' | 'red'; children: ReactNode; icon?: IconName }) {
  const t = {
    blue: 'border-learn/20 bg-learn-soft/50 text-[#1e3a8a]',
    amber: 'border-amber-200 bg-warm-soft/60 text-[#78350f]',
    green: 'border-progress/20 bg-progress-soft/60 text-[#14532d]',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] ${t}`}>
      <Icon name={icon} size={17} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
