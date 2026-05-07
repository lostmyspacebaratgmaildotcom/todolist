"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProgressPill } from "@/components/ProgressPill";
import { RoutineBlockCard } from "@/components/RoutineBlockCard";
import { ZoneTimer } from "@/components/ZoneTimer";
import { formatDisplayDate } from "@/lib/date";
import { getCurrentBlockId, getTasksForBlock } from "@/lib/progress";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function TodayPage() {
  const {
    isReady,
    dailyLog,
    template,
    currentZone,
    routineBlocks,
    routineTasks,
    setTaskCompleted,
    settings,
    startTemplate,
  } = useCleaningApp();

  const currentBlockId = getCurrentBlockId();
  const orderedBlocks = [
    ...routineBlocks.filter((block) => block.id === currentBlockId),
    ...routineBlocks.filter((block) => block.id !== currentBlockId),
  ];
  const completedTaskIds = dailyLog?.completedTaskIds ?? [];
  const nextTask =
    orderedBlocks
      .flatMap((block) => getTasksForBlock(routineTasks, block.id))
      .find((task) => !completedTaskIds.includes(task.id)) ?? null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Today"
        title="Your apartment reset"
        description={
          dailyLog
            ? `${formatDisplayDate(dailyLog.date)}. Progress stays private on this browser.`
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
              Current zone
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">
              {currentZone.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {currentZone.description}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-3 py-2 text-center text-xs font-black text-stone-700">
            Zone {currentZone.sortOrder}
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
            All available routine tasks are complete.
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
              tasks={getTasksForBlock(routineTasks, block.id)}
              completedTaskIds={completedTaskIds}
              current={block.id === currentBlockId}
              onTaskChange={setTaskCompleted}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
