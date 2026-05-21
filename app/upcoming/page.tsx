"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { formatDisplayDate, getCleaningDate } from "@/lib/date";
import { sortTasks } from "@/lib/progress";
import type { Task } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

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
          const due = upcomingTaskDates[task.id] ?? "";
          const onToday = due && cleaningDate >= due;

          return (
            <li
              key={task.id}
              className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-100"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-stone-900">{task.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-stone-500">
                    {task.zoneId ? zoneNameById.get(task.zoneId) ?? "Zone" : ""} ·{" "}
                    {task.estimatedMinutes} min
                  </p>
                </div>
                {onToday ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-emerald-900">
                    On Today
                  </span>
                ) : (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-violet-900">
                    Queued
                  </span>
                )}
              </div>
              <label
                className="mt-3 block text-xs font-bold uppercase tracking-[0.18em] text-emerald-800"
                htmlFor={`due-${task.id}`}
              >
                Next on Today (date)
              </label>
              <input
                id={`due-${task.id}`}
                type="date"
                value={due}
                onChange={(event) => onChangeDue(task.id, event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
