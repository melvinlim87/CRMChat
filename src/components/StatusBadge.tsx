import clsx from "clsx";
import type { LeadStatus } from "@prisma/client";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-sky-500/10 text-sky-300 ring-sky-600/20",
  CONTACTED: "bg-amber-500/10 text-amber-300 ring-amber-600/20",
  QUALIFIED: "bg-violet-500/10 text-violet-300 ring-violet-600/20",
  WON: "bg-emerald-500/10 text-emerald-300 ring-emerald-600/20",
  LOST: "bg-white/10 text-slate-400 ring-slate-500/20",
};

const LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  WON: "Won",
  LOST: "Lost",
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
