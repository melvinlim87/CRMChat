import ConnectGoogle from "@/components/ConnectGoogle";
import { getGoogleStatus, getValidGoogleToken, googleConfigured, listUpcomingEvents, type CalendarEvent } from "@/lib/google";

export const dynamic = "force-dynamic";

function formatDay(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeRange(e: CalendarEvent): string {
  if (e.allDay) return "All day";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const start = e.start ? new Date(e.start).toLocaleTimeString([], opts) : "";
  const end = e.end ? new Date(e.end).toLocaleTimeString([], opts) : "";
  return [start, end].filter(Boolean).join(" – ");
}

export default async function CalendarPage() {
  const status = await getGoogleStatus();
  if (!status.connected) return <ConnectGoogle service="Calendar" configured={googleConfigured()} />;

  const token = await getValidGoogleToken();
  const events = token ? await listUpcomingEvents(token) : [];

  // Group by day for an agenda-style view.
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const day = formatDay(e.start);
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500">Upcoming events{status.email ? ` · ${status.email}` : ""}</p>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {events.length === 0 && <p className="text-center text-slate-400">No upcoming events.</p>}

        <div className="max-w-2xl space-y-6">
          {Array.from(groups.entries()).map(([day, dayEvents]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{day}</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {dayEvents.map((e) => (
                  <a
                    key={e.id}
                    href={e.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 border-b border-slate-50 px-5 py-3 transition last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="w-28 shrink-0 text-sm text-slate-500">{formatTimeRange(e)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{e.summary}</p>
                      {e.location && <p className="truncate text-xs text-slate-400">{e.location}</p>}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
