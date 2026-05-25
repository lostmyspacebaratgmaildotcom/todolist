"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProgressPill } from "@/components/ProgressPill";
import { RoutineBlockCard } from "@/components/RoutineBlockCard";
import { ZoneTimer } from "@/components/ZoneTimer";
import { formatDisplayDate, getCleaningDate } from "@/lib/date";
import { getCurrentBlockId, getTasksForBlock } from "@/lib/progress";
import type { RoutineBlockId } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function TodayPage() {
  const {
    isReady,
    dailyLog,
    template,
    zones,
    routineBlocks,
    todayTasks,
    setTaskCompleted,
    settings,
    startTemplate,
  } = useCleaningApp();

  const [currentBlockId, setCurrentBlockId] =
    useState<RoutineBlockId>("morning");

  useEffect(() => {
    setCurrentBlockId(getCurrentBlockId());
  }, []);

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

  const descriptionText = dailyLog
    ? `${formatDisplayDate(getCleaningDate(settings.resetTime))} (routine day). Dailies, monthly and seasonal items when due, and as-needed tasks you add from Zones or Manage. Progress stays on this browser.`
    : "Loading your local checklist.";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Today"
        title="Your apartment reset"
        description={descriptionText}
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
