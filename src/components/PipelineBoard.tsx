"use client";

import { useState } from "react";
import type { LeadStatus } from "@prisma/client";
import { initials } from "@/lib/format";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  status: LeadStatus;
  tags: string[];
  conversationId: string | null;
};

const COLUMNS: { status: LeadStatus; label: string; dot: string }[] = [
  { status: "NEW", label: "New", dot: "bg-sky-500" },
  { status: "CONTACTED", label: "Contacted", dot: "bg-amber-500" },
  { status: "QUALIFIED", label: "Qualified", dot: "bg-violet-500" },
  { status: "WON", label: "Won", dot: "bg-emerald-500" },
  { status: "LOST", label: "Lost", dot: "bg-slate-400" },
];

export default function PipelineBoard({ leads: initial }: { leads: BoardLead[] }) {
  const [leads, setLeads] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);

  async function moveTo(status: LeadStatus) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-8">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.status);
            }}
            onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
            onDrop={() => moveTo(col.status)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-white/5 transition ${
              overCol === col.status ? "border-brand-400 bg-brand-500/15/40" : "border-white/10"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-slate-200">{col.label}</span>
              </div>
              <span className="rounded-full bg-surface-panel px-2 py-0.5 text-xs font-medium text-slate-400">
                {colLeads.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab rounded-xl border border-white/10 bg-surface-panel p-3 shadow-sm transition active:cursor-grabbing ${
                    dragId === lead.id ? "opacity-50" : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-semibold text-brand-300">
                      {initials(lead.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{lead.name}</p>
                      {lead.company && <p className="truncate text-xs text-slate-500">{lead.company}</p>}
                    </div>
                  </div>
                  {lead.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lead.tags.map((t) => (
                        <span key={t} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {colLeads.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-600">
                  Drop here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
