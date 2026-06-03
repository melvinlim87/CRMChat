import clsx from "clsx";
import type { LeadStatus } from "@prisma/client";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CONTACTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  QUALIFIED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  LOST: "bg-slate-100 text-slate-500 ring-slate-500/20",
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
