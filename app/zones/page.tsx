"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ZoneTimer } from "@/components/ZoneTimer";
import { routineBlocks } from "@/lib/data";
import type { Zone, ZoneFrequency } from "@/lib/types";
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
    selectedZones,
    routineTasks,
    addZoneToday,
    removeZoneToday,
    deleteZone,
    updateZone,
  } = useCleaningApp();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFrequency, setEditFrequency] = useState<ZoneFrequency>("daily");

  function startEdit(zone: Zone) {
    setEditingZoneId(zone.id);
    setEditName(zone.name);
    setEditDescription(zone.description);
    setEditFrequency(zone.frequency);
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingZoneId(null);
    setEditName("");
    setEditDescription("");
    setEditFrequency("daily");
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
            No zones selected. Today will stay empty until you select a zone with
            assigned tasks.
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
          const totalMinutes = zoneTasks.reduce(
            (sum, task) => sum + task.estimatedMinutes,
            0,
          );
          const isExpanded = expandedZoneId === zone.id;
          const isMenuOpen = openMenuId === zone.id;
          const isEditing = editingZoneId === zone.id;

          return (
            <article
              key={zone.id}
              className={`rounded-[2rem] bg-white p-4 shadow-sm ring-1 ${
                isSelected ? "ring-emerald-300" : "ring-stone-200"
              }`}
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
                    <div>
                      <h2 className="text-xl font-black text-stone-950">
                        {zone.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-stone-600">
                        {formatZoneFrequency(zone.frequency)}, {zoneTasks.length}{" "}
                        task{zoneTasks.length === 1 ? "" : "s"} today, {totalMinutes}{" "}
                        min
                      </p>
                    </div>
                    <div className="relative">
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
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-100"
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
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-100"
                            >
                              Remove from today
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={zones.length <= 1}
                            onClick={() => handleDelete(zone)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSelected) addZoneToday(zone.id);
                      }}
                      className={`min-h-12 flex-1 rounded-2xl px-4 text-sm font-black transition ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-emerald-950 text-white hover:bg-emerald-900"
                      }`}
                    >
                      {isSelected
                        ? `${zone.name} reset started`
                        : `Start ${zone.name.toLowerCase()} reset`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedZoneId(isExpanded ? null : zone.id)
                      }
                      className="min-h-12 rounded-2xl bg-stone-100 px-4 text-sm font-black text-stone-800 transition hover:bg-stone-200"
                    >
                      {isExpanded ? "Hide tasks" : "View tasks"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4">
                      {zoneTasks.length > 0 ? (
                        <ul className="space-y-2">
                          {zoneTasks.map((task) => {
                            const blockName =
                              routineBlocks.find(
                                (block) => block.id === task.block,
                              )?.name ?? task.block;

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
                      ) : (
                        <p className="rounded-2xl bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">
                          No tasks assigned. Add tasks from Manage.
                        </p>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function formatZoneFrequency(frequency: string): string {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "monthly") return "Monthly";
  if (frequency === "once") return "Once";
  return "Daily";
}
