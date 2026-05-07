"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ZoneTimer } from "@/components/ZoneTimer";
import { routineBlocks } from "@/lib/data";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function ZonesPage() {
  const {
    zones,
    selectedZoneIds,
    selectedZones,
    routineTasks,
    addZoneToday,
    removeZoneToday,
  } = useCleaningApp();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Zones"
        title="Choose a focus area"
        description="Pick one or more apartment zones for today's checklist. Tasks from unselected zones stay out of Today."
        action={
          <Link
            href="/manage"
            className="rounded-2xl bg-emerald-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
          >
            Manage
          </Link>
        }
      />

      <section className="mb-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Zones for today
        </p>
        {selectedZones.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedZones.map((zone) => (
              <span
                key={zone.id}
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900"
              >
                {zone.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-stone-600">
            No zones selected. Today will show general tasks only.
          </p>
        )}
      </section>

      <div className="mb-4">
        <ZoneTimer />
      </div>

      <div className="space-y-4">
        {zones.map((zone) => {
          const isSelected = selectedZoneIds.includes(zone.id);
          const zoneTasks = routineTasks.filter((task) => task.zoneId === zone.id);

          return (
            <article
              key={zone.id}
              className={`rounded-[2rem] bg-white p-4 shadow-sm ring-1 ${
                isSelected ? "ring-emerald-300" : "ring-stone-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Zone {zone.sortOrder}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    {zone.name}
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {formatZoneFrequency(zone.frequency)}
                  </p>
                </div>
                {isSelected ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    In Today
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {zone.description}
              </p>
              {zoneTasks.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Tasks in this zone
                  </p>
                  <ul className="mt-2 space-y-2">
                    {zoneTasks.map((task) => {
                      const blockName =
                        routineBlocks.find((block) => block.id === task.block)?.name ??
                        task.block;

                      return (
                        <li
                          key={task.id}
                          className="rounded-2xl bg-stone-50 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-black text-stone-800">
                              {task.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-stone-500 ring-1 ring-stone-200">
                              {blockName}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {task.estimatedMinutes} min
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">
                  Add tasks for this zone from Manage.
                </p>
              )}

              {zone.suggestedTasks.length > 0 ? (
                <details className="mt-3 rounded-2xl bg-stone-50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-bold text-stone-700">
                    Suggested 15-minute ideas
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {zone.suggestedTasks.map((task) => (
                      <li key={task} className="text-sm font-semibold text-stone-600">
                        {task}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => addZoneToday(zone.id)}
                  aria-pressed={isSelected}
                  className={`min-h-12 flex-1 rounded-2xl px-4 text-sm font-black transition ${
                    isSelected
                      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                      : "bg-emerald-950 text-white hover:bg-emerald-900"
                  }`}
                >
                  {isSelected ? "Using this zone today" : "Use this zone today"}
                </button>
                {isSelected ? (
                  <button
                    type="button"
                    onClick={() => removeZoneToday(zone.id)}
                    aria-label={`Remove ${zone.name} from today's zones`}
                    className="flex min-h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-lg font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100"
                  >
                    x
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function formatZoneFrequency(frequency: string): string {
  if (frequency === "weekly") {
    return "Weekly";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  if (frequency === "once") {
    return "Once";
  }

  return "Daily";
}
