export default function StepHeader({
  n,
  title,
  hint,
}: {
  n: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-on-brand">
        {n}
      </span>
      <div>
        <h2 className="font-bold text-brand-soft">
          Алхам {n} · {title}
        </h2>
        {hint && <p className="text-sm text-ink-dim">{hint}</p>}
      </div>
    </div>
  );
}
