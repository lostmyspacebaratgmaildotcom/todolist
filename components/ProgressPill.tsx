export function ProgressPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
          {label}
        </span>
        <span className="text-lg font-black text-emerald-950">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] motion-reduce:transition-none"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
