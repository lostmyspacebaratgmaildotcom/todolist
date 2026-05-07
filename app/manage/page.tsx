"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getTasksForBlock } from "@/lib/progress";
import type { RoutineBlockId } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function ManagePage() {
  const {
    zones,
    currentZone,
    routineBlocks,
    routineTasks,
    addZone,
    deleteZone,
    addTask,
    deleteTask,
  } = useCleaningApp();
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskBlock, setTaskBlock] = useState<RoutineBlockId>("morning");
  const [taskMinutes, setTaskMinutes] = useState(5);
  const [taskZoneId, setTaskZoneId] = useState("");

  const zoneNamesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  );

  function handleZoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newZoneId = addZone({ name: zoneName, description: zoneDescription });

    if (newZoneId) {
      setTaskZoneId(newZoneId);
    }

    setZoneName("");
    setZoneDescription("");
  }

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTask({
      title: taskTitle,
      block: taskBlock,
      estimatedMinutes: taskMinutes,
      zoneId: taskZoneId || undefined,
    });
    setTaskTitle("");
    setTaskMinutes(5);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Manage"
        title="Edit zones and tasks"
        description="Customize your local routine. Changes are saved only in this browser and do not edit the public templates."
      />

      <div className="space-y-4">
        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-black text-stone-950">Add a zone</h2>
          <form className="mt-4 space-y-3" onSubmit={handleZoneSubmit}>
            <div>
              <label
                htmlFor="zone-name"
                className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Zone name
              </label>
              <input
                id="zone-name"
                value={zoneName}
                onChange={(event) => setZoneName(event.target.value)}
                placeholder="Balcony, pantry, pet area"
                className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label
                htmlFor="zone-description"
                className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Description
              </label>
              <textarea
                id="zone-description"
                value={zoneDescription}
                onChange={(event) => setZoneDescription(event.target.value)}
                placeholder="What belongs in this area?"
                rows={3}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-base font-semibold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 w-full rounded-2xl bg-emerald-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900"
            >
              Add zone
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-black text-stone-950">Your zones</h2>
          <div className="mt-4 space-y-3">
            {zones.map((zone) => {
              const isCurrent = zone.id === currentZone.id;
              const canDelete = zones.length > 1;
              const assignedTasks = routineTasks.filter(
                (task) => task.zoneId === zone.id,
              );

              return (
                <article key={zone.id} className="rounded-2xl bg-stone-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-stone-900">
                          {zone.name}
                        </h3>
                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {zone.description}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-stone-500">
                        {assignedTasks.length} assigned task
                        {assignedTasks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canDelete}
                      onClick={() => {
                        if (window.confirm(`Delete ${zone.name}?`)) {
                          deleteZone(zone.id);
                        }
                      }}
                      className="min-h-10 rounded-xl bg-red-50 px-3 text-xs font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:ring-stone-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-black text-stone-950">Add a task</h2>
          <form className="mt-4 space-y-3" onSubmit={handleTaskSubmit}>
            <div>
              <label
                htmlFor="task-title"
                className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Task
              </label>
              <input
                id="task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Wipe balcony rail"
                className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="task-block"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
                >
                  Block
                </label>
                <select
                  id="task-block"
                  value={taskBlock}
                  onChange={(event) =>
                    setTaskBlock(event.target.value as RoutineBlockId)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {routineBlocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="task-minutes"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
                >
                  Minutes
                </label>
                <input
                  id="task-minutes"
                  type="number"
                  min={1}
                  max={120}
                  value={taskMinutes}
                  onChange={(event) => setTaskMinutes(Number(event.target.value))}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="task-zone"
                className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Zone
              </label>
              <select
                id="task-zone"
                value={taskZoneId}
                onChange={(event) => setTaskZoneId(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">No zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="min-h-12 w-full rounded-2xl bg-emerald-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900"
            >
              Add task
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-black text-stone-950">Your tasks</h2>
          <div className="mt-4 space-y-4">
            {routineBlocks.map((block) => {
              const blockTasks = getTasksForBlock(routineTasks, block.id);

              return (
                <div key={block.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-stone-700">
                      {block.name}
                    </h3>
                    <span className="text-xs font-bold text-stone-500">
                      {blockTasks.length} tasks
                    </span>
                  </div>
                  {blockTasks.length === 0 ? (
                    <div className="rounded-2xl bg-stone-50 p-3 text-sm font-semibold text-stone-500">
                      No tasks yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {blockTasks.map((task) => (
                        <li
                          key={task.id}
                          className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-black text-stone-900">
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-stone-500">
                              {task.estimatedMinutes} min
                              {task.zoneId
                                ? ` - ${zoneNamesById.get(task.zoneId) ?? "No zone"}`
                                : " - No zone"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="min-h-10 rounded-xl bg-red-50 px-3 text-xs font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
