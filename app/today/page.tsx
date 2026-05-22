"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProgressPill } from "@/components/ProgressPill";
import { RoutineBlockCard } from "@/components/RoutineBlockCard";
import { ZoneTimer } from "@/components/ZoneTimer";
import { formatDisplayDate, getCleaningDate } from "@/lib/date";
import {
  getCurrentBlockId,
  getTasksForBlock,
  getZoneDailyResetTasks,
} from "@/lib/progress";
import type { RoutineBlockId, Zone } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function TodayPage() {
  const {
    isReady,
    dailyLog,
    todayTabCalendarDate,
    template,
    zones,
    routineTasks,
    routineBlocks,
    todayTasks,
    setTaskCompleted,
    settings,
    startTemplate,
  } = useCleaningApp();

  const [currentBlockId, setCurrentBlockId] = useState<RoutineBlockId>("morning");

  useEffect(() => {
    setCurrentBlockId(getCurrentBlockId());
  }, []);

  const zonesWithDailyReset = useMemo(
    () =>
      zones.filter(
        (zone) => getZoneDailyResetTasks(routineTasks, zone.id).length > 0,
      ),
    [routineTasks, zones],
  );

  const cleaningDate = getCleaningDate(settings.resetTime);

  const zoneIdsScheduledToday = useMemo(() => {
    const scheduled = settings.scheduledZoneDates ?? {};
    const ids = new Set<string>();
    for (const zone of zones) {
      const dates = scheduled[zone.id];
      if (!dates?.length) {
        continue;
      }
      if (
        dates.some(
          (date) => date === todayTabCalendarDate || date === cleaningDate,
        )
      ) {
        ids.add(zone.id);
      }
    }
    return ids;
  }, [
    cleaningDate,
    settings.scheduledZoneDates,
    todayTabCalendarDate,
    zones,
  ]);

  const zonesForTodayDisplay = useMemo(() => {
    const seen = new Set<string>();
    const ordered: Zone[] = [];

    const pushZone = (zone: Zone) => {
      if (seen.has(zone.id)) {
        return;
      }
      seen.add(zone.id);
      ordered.push(zone);
    };

    for (const zone of zonesWithDailyReset) {
      pushZone(zone);
    }

    const sortedByRoutine = [...zones].sort(
      (first, second) => first.sortOrder - second.sortOrder,
    );
    for (const zone of sortedByRoutine) {
      if (zoneIdsScheduledToday.has(zone.id)) {
        pushZone(zone);
      }
    }

    return ordered;
  }, [zoneIdsScheduledToday, zones, zonesWithDailyReset]);

  const orderedBlocks = [
    ...routineBlocks.filter((block) => block.id === currentBlockId),
    ...routineBlocks.filter((block) => block.id !== currentBlockId),
  ];
  const completedTaskIds = dailyLog?.completedTaskIds ?? [];
  const zoneNamesById = new Map(zones.map((zone) => [zone.id, zone.name]));
  const nextTask =
    orderedBlocks
      .flatMap((block) => getTasksForBlock(todayTasks, block.id))
      .find((task) => !completedTaskIds.includes(task.id)) ?? null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Today"
        title="Your apartment reset"
        description={
          dailyLog
            ? `${formatDisplayDate(todayTabCalendarDate)}. Dailies, monthly and seasonal items when due, and as-needed tasks you add from Zones or Manage. Progress stays on this browser.`
            : "Loading your local checklist."
        }
      />

      {!settings.firstRunComplete && isReady ? (
        <section className="mb-4 rounded-[2rem] bg-lime-100 p-4 ring-1 ring-lime-200">
          <p className="text-sm font-bold text-lime-950">
            You are ready to try the default one-bedroom routine.
          </p>
          <button
            type="button"
            onClick={() => startTemplate(template.id)}
            className="mt-3 min-h-12 w-full rounded-2xl bg-emerald-950 px-4 text-sm font-black text-white"
          >
            Start today
          </button>
        </section>
      ) : null}

      <section className="mb-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Zones for today
            </p>
            {zones.length === 0 ? (
              <h2 className="mt-1 text-2xl font-black text-stone-950">
                No zones in this routine
              </h2>
            ) : zonesForTodayDisplay.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {zonesForTodayDisplay.map((zone) => (
                  <span
                    key={zone.id}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900"
                  >
                    {zone.name}
                  </span>
                ))}
              </div>
            ) : (
              <h2 className="mt-1 text-2xl font-black text-stone-950">
                No daily reset or calendar-scheduled zones for today yet
              </h2>
            )}
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Pills list zones with daily reset work, plus any zone you picked on
              the calendar for today (same dates as the Zones schedule). Weekly,
              monthly, and seasonal tasks still follow the schedule and on-today
              rules from the Zones page.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-3 py-2 text-center text-xs font-black text-stone-700">
            {zonesForTodayDisplay.length} zones
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-[2rem] bg-amber-100 p-4 ring-1 ring-amber-200">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
          Next tiny task
        </p>
        <p className="mt-2 text-xl font-black text-stone-950">
          {nextTask ? nextTask.title : "Today's cleaning is done."}
        </p>
        {nextTask ? (
          <p className="mt-1 text-sm font-semibold text-stone-600">
            About {nextTask.estimatedMinutes} minutes.
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-stone-600">
            Complete the next visible task, or adjust cadence schedules on Zones.
          </p>
        )}
      </section>

      <section aria-label="Daily progress" className="mb-4 grid grid-cols-3 gap-2">
        {routineBlocks.map((block) => (
          <ProgressPill
            key={block.id}
            label={block.name}
            value={dailyLog?.blockCompletion[block.id] ?? 0}
          />
        ))}
      </section>

      <div className="mb-4">
        <ZoneTimer />
      </div>

      {!isReady || !dailyLog ? (
        <div className="rounded-[2rem] bg-white p-6 text-center text-sm font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200">
          Loading checklist...
        </div>
      ) : (
        <div className="space-y-4">
          {orderedBlocks.map((block) => (
            <RoutineBlockCard
              key={block.id}
              id={block.id}
              name={block.name}
              tasks={getTasksForBlock(todayTasks, block.id)}
              completedTaskIds={completedTaskIds}
              zoneNamesById={zoneNamesById}
              current={block.id === currentBlockId}
              onTaskChange={setTaskCompleted}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
