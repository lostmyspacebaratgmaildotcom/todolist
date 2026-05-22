"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  firstDayOfNextCalendarMonthFrom,
  firstDayOfNextQuarterFrom,
  formatDisplayDate,
  getCleaningDate,
} from "@/lib/date";
import { sortTasks } from "@/lib/progress";
import type { Task } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

/** `YYYY-MM-DD` → `dd.mm.yy` for Upcoming queue pills. */
function formatQueuedPillDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;

  return `${day}.${month}.${year.slice(-2)}`;
}

export default function UpcomingPage() {
  const { isReady, zones, routineTasks, settings } = useCleaningApp();

  const cleaningDate = useMemo(
    () => getCleaningDate(settings.resetTime),
    [settings.resetTime],
  );

  const zoneNameById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  );

  const monthlyTasks = useMemo(
    () =>
      sortTasks(
        routineTasks.filter((task) => task.cadence === "monthly" && task.zoneId),
      ),
    [routineTasks],
  );

  const seasonalTasks = useMemo(
    () =>
      sortTasks(
        routineTasks.filter((task) => task.cadence === "seasonal" && task.zoneId),
      ),
    [routineTasks],
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Upcoming"
        title="Monthly & seasonal queue"
        description={`Tasks here roll onto Today on their next date (cleaning day ${formatDisplayDate(cleaningDate)}).`}
      />

      {!isReady ? (
        <p className="text-sm font-semibold text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <CadenceQueue
            title="Monthly care"
            tasks={monthlyTasks}
            cleaningDate={cleaningDate}
            upcomingTaskDates={settings.upcomingTaskDates ?? {}}
            zoneNameById={zoneNameById}
          />
          <CadenceQueue
            title="Seasonal projects"
            tasks={seasonalTasks}
            cleaningDate={cleaningDate}
            upcomingTaskDates={settings.upcomingTaskDates ?? {}}
            zoneNameById={zoneNameById}
          />
        </div>
      )}
    </AppShell>
  );
}

function CadenceQueue({
  title,
  tasks,
  cleaningDate,
  upcomingTaskDates,
  zoneNameById,
}: {
  title: string;
  tasks: Task[];
  cleaningDate: string;
  upcomingTaskDates: Record<string, string>;
  zoneNameById: Map<string, string>;
}) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-sm font-black leading-snug text-stone-950">{title}</h2>
      <ul className="mt-3 space-y-3">
        {tasks.map((task) => {
          const storedDue = upcomingTaskDates[task.id];
          const hasValidStored =
            typeof storedDue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(storedDue);
          const due = hasValidStored
            ? storedDue
            : task.cadence === "monthly"
              ? firstDayOfNextCalendarMonthFrom(cleaningDate)
              : firstDayOfNextQuarterFrom(cleaningDate);
          const onToday = Boolean(due && cleaningDate >= due);
          const pillDate = formatQueuedPillDate(due);

          return (
            <li
              key={task.id}
              className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-100"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-black leading-snug text-stone-900">
                  {task.title}
                </p>
                <span
                  className={`inline-flex shrink-0 select-none rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ring-1 ${
                    onToday
                      ? "bg-emerald-100 text-emerald-950 ring-emerald-200"
                      : "bg-violet-100 text-violet-950 ring-violet-200"
                  }`}
                  aria-label={`Queued for ${due}`}
                >
                  QUEUED ({pillDate})
                </span>
              </div>
              <p className="mt-1 text-[0.65rem] font-semibold leading-snug text-stone-500">
                {task.zoneId ? zoneNameById.get(task.zoneId) ?? "Zone" : ""} ·{" "}
                {task.estimatedMinutes} min
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
