// Lightweight, dependency-free charts (server-renderable, no client JS).

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-1">
        {data.map((d, i) => (
          <div key={i} className="group relative flex flex-1 items-end justify-center" style={{ height: "100%" }}>
            <div
              className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-300 transition group-hover:from-brand-500 group-hover:to-brand-200"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-slate-100 opacity-0 transition group-hover:opacity-100">
              {d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-500">
            {i % 2 === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs capitalize text-slate-400">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${d.color ?? "bg-brand-500"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-slate-300">{d.value}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
    </div>
  );
}
