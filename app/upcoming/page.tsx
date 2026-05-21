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

/** `YYYY-MM-DD` → `mm.dd.yy` for Upcoming queue pills. */
function formatQueuedPillDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;

  return `${month}.${day}.${year.slice(-2)}`;
}

export default function UpcomingPage() {
  const {
    isReady,
    zones,
    routineTasks,
    settings,
    updateUpcomingTaskDate,
  } = useCleaningApp();

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
            onChangeDue={updateUpcomingTaskDate}
          />
          <CadenceQueue
            title="Seasonal projects"
            tasks={seasonalTasks}
            cleaningDate={cleaningDate}
            upcomingTaskDates={settings.upcomingTaskDates ?? {}}
            zoneNameById={zoneNameById}
            onChangeDue={updateUpcomingTaskDate}
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
  onChangeDue,
}: {
  title: string;
  tasks: Task[];
  cleaningDate: string;
  upcomingTaskDates: Record<string, string>;
  zoneNameById: Map<string, string>;
  onChangeDue: (taskId: string, isoDate: string) => void;
}) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-black text-stone-950">{title}</h2>
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-900">{task.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-stone-500">
                    {task.zoneId ? zoneNameById.get(task.zoneId) ?? "Zone" : ""} ·{" "}
                    {task.estimatedMinutes} min
                  </p>
                </div>
                <label
                  htmlFor={`due-${task.id}`}
                  className={`relative inline-flex shrink-0 cursor-pointer select-none overflow-hidden rounded-full ring-1 transition hover:opacity-95 ${
                    onToday
                      ? "bg-emerald-100 text-emerald-950 ring-emerald-200"
                      : "bg-violet-100 text-violet-950 ring-violet-200"
                  }`}
                  aria-label={`Change next date for ${task.title}, currently ${due}`}
                >
                  <span className="pointer-events-none px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wide">
                    QUEUED ({pillDate})
                  </span>
                  <input
                    id={`due-${task.id}`}
                    type="date"
                    value={due}
                    onChange={(event) => onChangeDue(task.id, event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
