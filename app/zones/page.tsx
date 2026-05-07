"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ZoneTimer } from "@/components/ZoneTimer";
import { routineBlocks } from "@/lib/data";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function ZonesPage() {
  const { zones, currentZone, routineTasks, updateSettings } = useCleaningApp();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Zones"
        title="Choose a focus area"
        description="Pick the apartment zone that needs today's 15-minute reset. Automatic rotation can come later."
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
        <label
          htmlFor="zone-selector"
          className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
        >
          Current zone
        </label>
        <select
          id="zone-selector"
          value={currentZone.id}
          onChange={(event) => updateSettings({ currentZoneId: event.target.value })}
          className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </section>

      <div className="mb-4">
        <ZoneTimer />
      </div>

      <div className="space-y-4">
        {zones.map((zone) => {
          const isCurrent = zone.id === currentZone.id;
          const zoneTasks = routineTasks.filter((task) => task.zoneId === zone.id);

          return (
            <article
              key={zone.id}
              className={`rounded-[2rem] bg-white p-4 shadow-sm ring-1 ${
                isCurrent ? "ring-emerald-300" : "ring-stone-200"
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
                </div>
                {isCurrent ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Current
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
              <button
                type="button"
                onClick={() => updateSettings({ currentZoneId: zone.id })}
                aria-label={
                  isCurrent
                    ? `${zone.name} is already selected. Use this zone today.`
                    : `Use ${zone.name} as today's zone.`
                }
                className={`mt-4 min-h-12 w-full rounded-2xl px-4 text-sm font-black transition ${
                  isCurrent
                    ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    : "bg-emerald-950 text-white hover:bg-emerald-900"
                }`}
              >
                Use this zone today
              </button>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
