import {
  PERIODICIDADE_JUROS_LABELS,
  type PeriodicidadeJuros,
} from '@assets-db/shared';

const BADGE: Record<PeriodicidadeJuros, { letra: string; classes: string }> = {
  MENSAL: { letra: 'M', classes: 'border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400' },
  TRIMESTRAL: { letra: 'T', classes: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400' },
  SEMESTRAL: { letra: 'S', classes: 'border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400' },
  BULLET: { letra: 'B', classes: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
};

export function PeriodicidadeBadge({
  periodicidade,
}: {
  periodicidade?: PeriodicidadeJuros | null;
}) {
  if (!periodicidade) return null;
  const { letra, classes } = BADGE[periodicidade];
  return (
    <span
      title={PERIODICIDADE_JUROS_LABELS[periodicidade]}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-xs font-bold leading-none ${classes}`}
    >
      {letra}
    </span>
  );
}
