"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type { RoutineBlockId, Task, TaskCadence, ZoneFrequency } from "@/lib/types";
import { sortTasks } from "@/lib/progress";
import { useCleaningApp } from "@/lib/useCleaningApp";

const zoneFrequencyOptions: { value: ZoneFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "Once" },
];

const cadenceOptions: { value: TaskCadence; label: string }[] = [
  { value: "daily", label: "Daily reset" },
  { value: "weekly", label: "Weekly care" },
  { value: "monthly", label: "Monthly care" },
  { value: "seasonal", label: "Seasonal projects" },
  { value: "as_needed", label: "As needed" },
];

export default function ManagePage() {
  const {
    zones,
    routineBlocks,
    routineTasks,
    dailyLog,
    addZone,
    deleteZone,
    addTask,
    deleteTask,
    updateTask,
    addAsNeededToToday,
  } = useCleaningApp();

  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);
  const [addingZone, setAddingZone] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [zoneFrequency, setZoneFrequency] = useState<ZoneFrequency>("daily");

  const [addingTaskForZone, setAddingTaskForZone] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskBlock, setTaskBlock] = useState<RoutineBlockId>("morning");
  const [taskMinutes, setTaskMinutes] = useState(5);
  const [taskCadence, setTaskCadence] = useState<TaskCadence>("daily");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskBlock, setEditTaskBlock] = useState<RoutineBlockId>("morning");
  const [editTaskMinutes, setEditTaskMinutes] = useState(5);
  const [editTaskCadence, setEditTaskCadence] = useState<TaskCadence>("daily");

  function handleZoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addZone({ name: zoneName, description: zoneDescription, frequency: zoneFrequency });
    setZoneName("");
    setZoneDescription("");
    setZoneFrequency("daily");
    setAddingZone(false);
  }

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addingTaskForZone) return;
    addTask({
      title: taskTitle,
      block: taskBlock,
      estimatedMinutes: taskMinutes,
      zoneId: addingTaskForZone,
      cadence: taskCadence,
    });
    setTaskTitle("");
    setTaskMinutes(5);
  }

  function startTaskEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskBlock(task.block);
    setEditTaskMinutes(task.estimatedMinutes);
    setEditTaskCadence(task.cadence ?? "daily");
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
  }

  function handleTaskEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTaskId) return;
    updateTask(editingTaskId, {
      title: editTaskTitle,
      block: editTaskBlock,
      estimatedMinutes: editTaskMinutes,
      zoneId: routineTasks.find((t) => t.id === editingTaskId)?.zoneId,
      cadence: editTaskCadence,
    });
    cancelTaskEdit();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Manage"
        title="Edit zones and tasks"
        description="Customise your local routine. Tap a zone to see all cadences."
      />

      <div className="space-y-4">
        {zones.map((zone) => {
          const isExpanded = expandedZoneId === zone.id;
          const zoneTasks = routineTasks.filter((t) => t.zoneId === zone.id);
          const spotlightTasks = sortTasks(
            zoneTasks.filter((t) => Boolean(t.spotlightToday)),
          );
          const dailyTasks = zoneTasks.filter((t) => !t.cadence || t.cadence === "daily");
          const dailyResetTasks = sortTasks(
            dailyTasks.filter((t) => !t.dailyPreviewOnly),
          );
          const weeklyTasks = zoneTasks.filter((t) => t.cadence === "weekly");
          const monthlyTasks = zoneTasks.filter((t) => t.cadence === "monthly");
          const seasonalTasks = zoneTasks.filter((t) => t.cadence === "seasonal");
          const adHocTasks = zoneTasks.filter((t) => t.cadence === "as_needed");

          return (
            <article
              key={zone.id}
              className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedZoneId(isExpanded ? null : zone.id)
                }
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <h2 className="text-lg font-black text-stone-950">
                    {zone.name}
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-stone-500">
                    {zoneTasks.length} tasks across {countCadences(zoneTasks)}{" "}
                    cadence{countCadences(zoneTasks) === 1 ? "" : "s"}
                  </p>
                </div>
                <svg
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 text-stone-400 transition ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isExpanded ? (
                <div className="mt-4 space-y-5">
                  {spotlightTasks.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide text-stone-600">
                        Today in this zone
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {spotlightTasks.map((task) => {
                          const isEditing = editingTaskId === task.id;
                          return (
                            <li key={task.id} className="rounded-2xl bg-emerald-50/80 p-3 ring-1 ring-emerald-100">
                              {isEditing ? (
                                <form className="space-y-2" onSubmit={handleTaskEditSubmit}>
                                  <input
                                    value={editTaskTitle}
                                    onChange={(e) => setEditTaskTitle(e.target.value)}
                                    className="min-h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                                  />
                                  <div className="grid grid-cols-3 gap-2">
                                    <select
                                      value={editTaskCadence}
                                      onChange={(e) =>
                                        setEditTaskCadence(e.target.value as TaskCadence)
                                      }
                                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                                    >
                                      {cadenceOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={editTaskBlock}
                                      onChange={(e) =>
                                        setEditTaskBlock(e.target.value as RoutineBlockId)
                                      }
                                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                                    >
                                      {routineBlocks.map((b) => (
                                        <option key={b.id} value={b.id}>
                                          {b.name}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min={1}
                                      max={120}
                                      value={editTaskMinutes}
                                      onChange={(e) =>
                                        setEditTaskMinutes(Number(e.target.value))
                                      }
                                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                                      placeholder="min"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelTaskEdit}
                                      className="min-h-9 rounded-xl bg-white px-3 text-xs font-black text-stone-700 ring-1 ring-stone-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="min-h-9 rounded-xl bg-emerald-950 px-3 text-xs font-black text-white"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-stone-800">
                                      {task.title}
                                    </p>
                                    <p className="mt-0.5 text-xs font-semibold text-stone-500">
                                      {task.estimatedMinutes} min
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => startTaskEdit(task)}
                                      aria-label={`Edit ${task.title}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-100"
                                    >
                                      <svg
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteTask(task.id)}
                                      aria-label={`Delete ${task.title}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100"
                                    >
                                      x
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  {dailyResetTasks.length > 0 ? (
                    <CadenceSection
                      label="Daily reset"
                      tasks={dailyResetTasks}
                      editingTaskId={editingTaskId}
                      editTaskTitle={editTaskTitle}
                      editTaskBlock={editTaskBlock}
                      editTaskMinutes={editTaskMinutes}
                      editTaskCadence={editTaskCadence}
                      setEditTaskTitle={setEditTaskTitle}
                      setEditTaskBlock={setEditTaskBlock}
                      setEditTaskMinutes={setEditTaskMinutes}
                      setEditTaskCadence={setEditTaskCadence}
                      routineBlocks={routineBlocks}
                      onStartEdit={startTaskEdit}
                      onCancelEdit={cancelTaskEdit}
                      onSaveEdit={handleTaskEditSubmit}
                      onDelete={deleteTask}
                    />
                  ) : null}
                  {weeklyTasks.length > 0 ? (
                    <CadenceSection
                      label="Weekly care"
                      tasks={weeklyTasks}
                      editingTaskId={editingTaskId}
                      editTaskTitle={editTaskTitle}
                      editTaskBlock={editTaskBlock}
                      editTaskMinutes={editTaskMinutes}
                      editTaskCadence={editTaskCadence}
                      setEditTaskTitle={setEditTaskTitle}
                      setEditTaskBlock={setEditTaskBlock}
                      setEditTaskMinutes={setEditTaskMinutes}
                      setEditTaskCadence={setEditTaskCadence}
                      routineBlocks={routineBlocks}
                      onStartEdit={startTaskEdit}
                      onCancelEdit={cancelTaskEdit}
                      onSaveEdit={handleTaskEditSubmit}
                      onDelete={deleteTask}
                    />
                  ) : null}
                  {monthlyTasks.length > 0 ? (
                    <CadenceSection
                      label="Monthly care"
                      tasks={monthlyTasks}
                      editingTaskId={editingTaskId}
                      editTaskTitle={editTaskTitle}
                      editTaskBlock={editTaskBlock}
                      editTaskMinutes={editTaskMinutes}
                      editTaskCadence={editTaskCadence}
                      setEditTaskTitle={setEditTaskTitle}
                      setEditTaskBlock={setEditTaskBlock}
                      setEditTaskMinutes={setEditTaskMinutes}
                      setEditTaskCadence={setEditTaskCadence}
                      routineBlocks={routineBlocks}
                      onStartEdit={startTaskEdit}
                      onCancelEdit={cancelTaskEdit}
                      onSaveEdit={handleTaskEditSubmit}
                      onDelete={deleteTask}
                    />
                  ) : null}
                  {seasonalTasks.length > 0 ? (
                    <CadenceSection
                      label="Seasonal projects"
                      tasks={seasonalTasks}
                      editingTaskId={editingTaskId}
                      editTaskTitle={editTaskTitle}
                      editTaskBlock={editTaskBlock}
                      editTaskMinutes={editTaskMinutes}
                      editTaskCadence={editTaskCadence}
                      setEditTaskTitle={setEditTaskTitle}
                      setEditTaskBlock={setEditTaskBlock}
                      setEditTaskMinutes={setEditTaskMinutes}
                      setEditTaskCadence={setEditTaskCadence}
                      routineBlocks={routineBlocks}
                      onStartEdit={startTaskEdit}
                      onCancelEdit={cancelTaskEdit}
                      onSaveEdit={handleTaskEditSubmit}
                      onDelete={deleteTask}
                    />
                  ) : null}
                  {adHocTasks.length > 0 ? (
                    <CadenceSection
                      label="As needed"
                      tasks={adHocTasks}
                      editingTaskId={editingTaskId}
                      editTaskTitle={editTaskTitle}
                      editTaskBlock={editTaskBlock}
                      editTaskMinutes={editTaskMinutes}
                      editTaskCadence={editTaskCadence}
                      setEditTaskTitle={setEditTaskTitle}
                      setEditTaskBlock={setEditTaskBlock}
                      setEditTaskMinutes={setEditTaskMinutes}
                      setEditTaskCadence={setEditTaskCadence}
                      routineBlocks={routineBlocks}
                      onStartEdit={startTaskEdit}
                      onCancelEdit={cancelTaskEdit}
                      onSaveEdit={handleTaskEditSubmit}
                      onDelete={deleteTask}
                      onAddTaskToToday={addAsNeededToToday}
                      taskIdsOnToday={new Set(dailyLog?.asNeededOnTodayTaskIds ?? [])}
                    />
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingTaskForZone(zone.id);
                        setTaskCadence("daily");
                      }}
                      className="min-h-10 flex-1 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white transition hover:bg-emerald-900"
                    >
                      Add task
                    </button>
                    <button
                      type="button"
                      disabled={zones.length <= 1}
                      onClick={() => {
                        if (window.confirm(`Delete ${zone.name} and all its tasks?`)) {
                          deleteZone(zone.id);
                        }
                      }}
                      className="min-h-10 rounded-2xl bg-red-50 px-4 text-sm font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:text-stone-400 disabled:ring-stone-100 disabled:bg-stone-50"
                    >
                      Delete zone
                    </button>
                  </div>

                  {addingTaskForZone === zone.id ? (
                    <form
                      className="rounded-2xl bg-stone-50 p-3 space-y-3"
                      onSubmit={handleTaskSubmit}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                        New task for {zone.name}
                      </p>
                      <input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Task name"
                        className="min-h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={taskCadence}
                          onChange={(e) =>
                            setTaskCadence(e.target.value as TaskCadence)
                          }
                          className="min-h-11 rounded-2xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                        >
                          {cadenceOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={taskBlock}
                          onChange={(e) =>
                            setTaskBlock(e.target.value as RoutineBlockId)
                          }
                          className="min-h-11 rounded-2xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                        >
                          {routineBlocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={taskMinutes}
                          onChange={(e) =>
                            setTaskMinutes(Number(e.target.value))
                          }
                          className="min-h-11 rounded-2xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                          placeholder="min"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAddingTaskForZone(null)}
                          className="min-h-10 rounded-2xl bg-white px-3 text-sm font-black text-stone-700 ring-1 ring-stone-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="min-h-10 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}

        <button
          type="button"
          onClick={() => setAddingZone(true)}
          className="min-h-12 w-full rounded-2xl bg-emerald-950 px-4 text-sm font-black text-white transition hover:bg-emerald-900"
        >
          Add a new zone
        </button>

        {addingZone ? (
          <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <form className="space-y-3" onSubmit={handleZoneSubmit}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                New zone
              </p>
              <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Zone name"
                className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <textarea
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-base font-semibold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <select
                value={zoneFrequency}
                onChange={(e) =>
                  setZoneFrequency(e.target.value as ZoneFrequency)
                }
                className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900"
              >
                {zoneFrequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAddingZone(false)}
                  className="min-h-11 rounded-2xl bg-stone-100 px-3 text-sm font-black text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white"
                >
                  Add zone
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function CadenceSection({
  label,
  tasks,
  editingTaskId,
  editTaskTitle,
  editTaskBlock,
  editTaskMinutes,
  editTaskCadence,
  setEditTaskTitle,
  setEditTaskBlock,
  setEditTaskMinutes,
  setEditTaskCadence,
  routineBlocks,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddTaskToToday,
  taskIdsOnToday,
}: {
  label: string;
  tasks: Task[];
  editingTaskId: string | null;
  editTaskTitle: string;
  editTaskBlock: RoutineBlockId;
  editTaskMinutes: number;
  editTaskCadence: TaskCadence;
  setEditTaskTitle: (v: string) => void;
  setEditTaskBlock: (v: RoutineBlockId) => void;
  setEditTaskMinutes: (v: number) => void;
  setEditTaskCadence: (v: TaskCadence) => void;
  routineBlocks: { id: RoutineBlockId; name: string }[];
  onStartEdit: (task: Task) => void;
  onCancelEdit: () => void;
  onSaveEdit: (e: FormEvent<HTMLFormElement>) => void;
  onDelete: (taskId: string) => void;
  onAddTaskToToday?: (taskId: string) => void;
  taskIdsOnToday?: Set<string>;
}) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide text-stone-600">
        {label}
      </h3>
      <ul className="mt-2 space-y-2">
        {tasks.map((task) => {
          const isEditing = editingTaskId === task.id;

          return (
            <li key={task.id} className="rounded-2xl bg-stone-50 p-3">
              {isEditing ? (
                <form className="space-y-2" onSubmit={onSaveEdit}>
                  <input
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={editTaskCadence}
                      onChange={(e) =>
                        setEditTaskCadence(e.target.value as TaskCadence)
                      }
                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                    >
                      {cadenceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editTaskBlock}
                      onChange={(e) =>
                        setEditTaskBlock(e.target.value as RoutineBlockId)
                      }
                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                    >
                      {routineBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={editTaskMinutes}
                      onChange={(e) =>
                        setEditTaskMinutes(Number(e.target.value))
                      }
                      className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold text-stone-900"
                      placeholder="min"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="min-h-9 rounded-xl bg-white px-3 text-xs font-black text-stone-700 ring-1 ring-stone-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-9 rounded-xl bg-emerald-950 px-3 text-xs font-black text-white"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-stone-800">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-stone-500">
                      {task.estimatedMinutes} min &middot;{" "}
                      {routineBlocks.find((b) => b.id === task.block)?.name ?? task.block}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {onAddTaskToToday ? (
                      <button
                        type="button"
                        disabled={Boolean(taskIdsOnToday?.has(task.id))}
                        onClick={() => onAddTaskToToday(task.id)}
                        aria-label={
                          taskIdsOnToday?.has(task.id)
                            ? `${task.title} is on today`
                            : `Add ${task.title} to today`
                        }
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition ${
                          taskIdsOnToday?.has(task.id)
                            ? "cursor-default bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        {taskIdsOnToday?.has(task.id) ? (
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 6.5v11l9-5.5z" />
                          </svg>
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onStartEdit(task)}
                      aria-label={`Edit ${task.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-100"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      aria-label={`Delete ${task.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100"
                    >
                      x
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function countCadences(tasks: Task[]): number {
  const cadences = new Set(tasks.map((t) => t.cadence ?? "daily"));
  return cadences.size;
}
