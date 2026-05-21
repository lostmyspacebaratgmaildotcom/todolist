"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type { Task, TaskCadence, Zone, ZoneFrequency } from "@/lib/types";
import { getCleaningDate } from "@/lib/date";
import { getZoneDailyResetTasks, sortTasks } from "@/lib/progress";
import { useCleaningApp } from "@/lib/useCleaningApp";

const zoneFrequencyOptions: { value: ZoneFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "Once" },
];

export default function ZonesPage() {
  const {
    zones,
    selectedZoneIds,
    routineTasks,
    dailyLog,
    settings,
    addZoneToday,
    removeZoneToday,
    scheduleZoneForDate,
    deleteZone,
    updateZone,
  } = useCleaningApp();

  const completedTaskIds = new Set(dailyLog?.completedTaskIds ?? []);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedCadence, setExpandedCadence] = useState<{
    zoneId: string;
    cadence: TaskCadence;
  } | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFrequency, setEditFrequency] = useState<ZoneFrequency>("daily");
  const [scheduleTargetZoneId, setScheduleTargetZoneId] = useState<string | null>(
    null,
  );
  const [scheduleDateValue, setScheduleDateValue] = useState("");

  function openScheduleDialog(zoneId: string) {
    setScheduleTargetZoneId(zoneId);
    setScheduleDateValue(getCleaningDate(settings.resetTime));
  }

  function startEdit(zone: Zone) {
    setEditingZoneId(zone.id);
    setEditName(zone.name);
    setEditDescription(zone.description);
    setEditFrequency(zone.frequency);
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingZoneId(null);
  }

  function saveEdit() {
    if (!editingZoneId || !editName.trim()) return;
    updateZone(editingZoneId, {
      name: editName,
      description: editDescription,
      frequency: editFrequency,
    });
    cancelEdit();
  }

  function handleDelete(zone: Zone) {
    setOpenMenuId(null);
    if (zones.length <= 1) return;
    if (window.confirm(`Delete ${zone.name}?`)) {
      deleteZone(zone.id);
    }
  }

  function toggleCadence(zoneId: string, cadence: TaskCadence) {
    if (
      expandedCadence?.zoneId === zoneId &&
      expandedCadence?.cadence === cadence
    ) {
      setExpandedCadence(null);
    } else {
      setExpandedCadence({ zoneId, cadence });
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Zones"
        title="Your zones"
        description="Spaces you maintain."
        action={
          <Link
            href="/manage"
            className="rounded-2xl bg-emerald-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
          >
            Manage
          </Link>
        }
      />

      <div className="space-y-4">
        {zones.map((zone) => {
          const isSelected = selectedZoneIds.includes(zone.id);
          const zoneTasks = routineTasks.filter(
            (task) => task.zoneId === zone.id,
          );
          const dailyTasks = zoneTasks.filter(
            (t) => !t.cadence || t.cadence === "daily",
          );
          const dailyResetTasks = getZoneDailyResetTasks(routineTasks, zone.id);
          const weeklyTasks = zoneTasks.filter((t) => t.cadence === "weekly");
          const monthlyTasks = zoneTasks.filter((t) => t.cadence === "monthly");
          const seasonalTasks = zoneTasks.filter(
            (t) => t.cadence === "seasonal",
          );
          const adHocTasks = zoneTasks.filter((t) => t.cadence === "as_needed");
          const dailyMinutes = dailyTasks.reduce(
            (s, t) => s + t.estimatedMinutes,
            0,
          );
          const allDailyDone =
            dailyTasks.length > 0 &&
            dailyTasks.every((t) => completedTaskIds.has(t.id));

          const isMenuOpen = openMenuId === zone.id;
          const isEditing = editingZoneId === zone.id;

          return (
            <Fragment key={zone.id}>
            <article
              className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor={`edit-zone-name-${zone.id}`}
                      className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
                    >
                      Zone name
                    </label>
                    <input
                      id={`edit-zone-name-${zone.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-zone-desc-${zone.id}`}
                      className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
                    >
                      Description
                    </label>
                    <textarea
                      id={`edit-zone-desc-${zone.id}`}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-base font-semibold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-zone-freq-${zone.id}`}
                      className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
                    >
                      Frequency
                    </label>
                    <select
                      id={`edit-zone-freq-${zone.id}`}
                      value={editFrequency}
                      onChange={(e) =>
                        setEditFrequency(e.target.value as ZoneFrequency)
                      }
                      className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      {zoneFrequencyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="min-h-11 rounded-2xl bg-stone-100 px-3 text-sm font-black text-stone-700 transition hover:bg-stone-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="min-h-11 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white transition hover:bg-emerald-900"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-black text-stone-950">
                        {zone.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-stone-600">
                        {dailyTasks.length} task
                        {dailyTasks.length === 1 ? "" : "s"} today,{" "}
                        {dailyMinutes} min
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(isMenuOpen ? null : zone.id)
                        }
                        aria-label={`More options for ${zone.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="10" cy="4" r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>
                      {isMenuOpen ? (
                        <div className="absolute right-0 top-10 z-10 w-44 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-stone-200">
                          <button
                            type="button"
                            onClick={() => startEdit(zone)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-100"
                          >
                            Edit
                          </button>
                          {isSelected ? (
                            <button
                              type="button"
                              onClick={() => {
                                removeZoneToday(zone.id);
                                setOpenMenuId(null);
                              }}
                              className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-100"
                            >
                              Remove from today
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={zones.length <= 1}
                            onClick={() => handleDelete(zone)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {dailyResetTasks.length > 0 ? (
                    <CadenceRow
                      label="Daily reset"
                      status={
                        allDailyDone
                          ? "Done today"
                          : isSelected
                            ? "Active"
                            : "Due today"
                      }
                      tasks={dailyResetTasks}
                      isExpanded={
                        expandedCadence?.zoneId === zone.id &&
                        expandedCadence?.cadence === "daily"
                      }
                      showViewTasks={isSelected}
                      onToggle={() => toggleCadence(zone.id, "daily")}
                      completedTaskIds={completedTaskIds}
                    />
                    ) : null}
                    {monthlyTasks.length > 0 ? (
                      <CadenceRow
                        label="Monthly care"
                        status="Due this month"
                        tasks={monthlyTasks}
                        isExpanded={
                          expandedCadence?.zoneId === zone.id &&
                          expandedCadence?.cadence === "monthly"
                        }
                        showViewTasks={isSelected}
                        onToggle={() => toggleCadence(zone.id, "monthly")}
                        completedTaskIds={completedTaskIds}
                      />
                    ) : null}
                    {seasonalTasks.length > 0 ? (
                      <CadenceRow
                        label="Seasonal projects"
                        status="Due this quarter"
                        tasks={seasonalTasks}
                        isExpanded={
                          expandedCadence?.zoneId === zone.id &&
                          expandedCadence?.cadence === "seasonal"
                        }
                        showViewTasks={isSelected}
                        onToggle={() => toggleCadence(zone.id, "seasonal")}
                        completedTaskIds={completedTaskIds}
                      />
                    ) : null}
                    {adHocTasks.length > 0 ? (
                      <CadenceRow
                        label="As needed"
                        status="When you notice"
                        tasks={adHocTasks}
                        isExpanded={
                          expandedCadence?.zoneId === zone.id &&
                          expandedCadence?.cadence === "as_needed"
                        }
                        showViewTasks={isSelected}
                        onToggle={() => toggleCadence(zone.id, "as_needed")}
                        completedTaskIds={completedTaskIds}
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => addZoneToday(zone.id)}
                      className="min-h-11 rounded-2xl bg-emerald-950 px-2 text-xs font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
                    >
                      {isSelected ? "Started" : "Start"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleDialog(zone.id)}
                      className="min-h-11 rounded-2xl bg-stone-100 px-2 text-xs font-black text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-200"
                    >
                      Schedule
                    </button>
                  </div>
                </>
              )}
            </article>
            {weeklyTasks.length > 0 ? (
              <article className="rounded-[2rem] border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-5 shadow-sm ring-1 ring-sky-100">
                <div className="mb-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-800">
                    Weekly care
                  </p>
                  <h3 className="mt-1 text-lg font-black text-stone-950">
                    {zone.name}
                  </h3>
                </div>
                <CadenceRow
                  label="Weekly care"
                  status="Due this week"
                  tasks={weeklyTasks}
                  isExpanded={
                    expandedCadence?.zoneId === zone.id &&
                    expandedCadence?.cadence === "weekly"
                  }
                  showViewTasks={isSelected}
                  onToggle={() => toggleCadence(zone.id, "weekly")}
                  completedTaskIds={completedTaskIds}
                />

              </article>
            ) : null}
            </Fragment>
          );
        })}
      </div>

      {scheduleTargetZoneId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setScheduleTargetZoneId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-dialog-title"
            className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-stone-200"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="schedule-dialog-title"
              className="text-lg font-black text-stone-950"
            >
              Schedule{" "}
              {zones.find((candidate) => candidate.id === scheduleTargetZoneId)
                ?.name ?? "zone"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              Choose day, month, and year for this reset.
            </p>
            <label
              htmlFor="zone-schedule-date"
              className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-emerald-800"
            >
              Date
            </label>
            <input
              id="zone-schedule-date"
              type="date"
              value={scheduleDateValue}
              onChange={(event) => setScheduleDateValue(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleTargetZoneId(null)}
                className="min-h-11 rounded-2xl bg-stone-100 px-3 text-sm font-black text-stone-700 transition hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  scheduleZoneForDate(scheduleTargetZoneId, scheduleDateValue);
                  setScheduleTargetZoneId(null);
                }}
                disabled={!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDateValue)}
                className="min-h-11 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function CadenceRow({
  label,
  status,
  tasks,
  isExpanded,
  showViewTasks,
  onToggle,
  completedTaskIds,
}: {
  label: string;
  status: string;
  tasks: Task[];
  isExpanded: boolean;
  showViewTasks: boolean;
  onToggle: () => void;
  completedTaskIds: Set<string>;
}) {
  return (
    <div className="rounded-2xl bg-stone-50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-stone-800">{label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${cadenceStatusStyle(status)}`}>
            {status}
          </span>
        </div>
        {showViewTasks ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={isExpanded ? "Hide tasks" : "View tasks"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-200"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              )}
            </svg>
          </button>
        ) : null}
      </div>
      {isExpanded ? (
        <ul className="mt-2 space-y-1.5">
          {tasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <li
                key={task.id}
                className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 ${isDone ? "bg-emerald-100" : "bg-white"}`}
              >
                <span
                  className={`text-sm font-semibold ${isDone ? "text-emerald-700 line-through" : "text-stone-700"}`}
                >
                  {task.title}
                </span>
                <span className="text-xs font-semibold text-stone-400">
                  {task.estimatedMinutes} min
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function cadenceStatusStyle(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-100 text-emerald-800";
    case "Done today":
      return "bg-emerald-100 text-emerald-800";
    case "Due today":
      return "bg-amber-100 text-amber-800";
    case "Due this week":
      return "bg-sky-100 text-sky-800";
    case "Due this month":
      return "bg-violet-100 text-violet-800";
    case "Due this quarter":
      return "bg-orange-100 text-orange-800";
    case "When you notice":
      return "bg-stone-100 text-stone-600";
    default:
      return "bg-stone-100 text-stone-600";
  }
}
