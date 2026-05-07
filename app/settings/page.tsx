"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function SettingsPage() {
  const {
    settings,
    template,
    currentZone,
    updateSettings,
    resetToday,
    clearAllLocalData,
  } = useCleaningApp();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Local app setup"
        description="Control the data saved in this browser. No account or cloud backup is required for this MVP."
      />

      <div className="space-y-4">
        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-black text-stone-950">Daily reset</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            A checklist belongs to the cleaning day. The default 3:00 AM reset keeps
            late-night evening routines on the previous day.
          </p>
          <label
            htmlFor="reset-time"
            className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-emerald-700"
          >
            Reset time
          </label>
          <input
            id="reset-time"
            type="time"
            value={settings.resetTime}
            onChange={(event) => updateSettings({ resetTime: event.target.value })}
            className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-black text-stone-950">Current setup</h2>
          <dl className="mt-4 space-y-3">
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                Template
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">{template.name}</dd>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                Current zone
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">
                {currentZone.name}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-black text-stone-950">Local data</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Your checked tasks and settings are stored only in this browser. Clearing
            data removes saved progress for this app on this device.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={resetToday}
              className="min-h-12 rounded-2xl bg-stone-100 px-4 text-sm font-black text-stone-800 transition hover:bg-stone-200"
            >
              Reset today&apos;s checklist
            </button>
            <button
              type="button"
              onClick={clearAllLocalData}
              className="min-h-12 rounded-2xl bg-red-50 px-4 text-sm font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100"
            >
              Clear local data
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] bg-emerald-950 p-4 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            Later
          </p>
          <h2 className="mt-1 text-lg font-black">Google backup placeholder</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            Optional Google backup is planned for version 0.2. It should request
            only Drive app data access and remain fully optional.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 min-h-12 w-full cursor-not-allowed rounded-2xl bg-white/20 px-4 text-sm font-black text-white/70"
          >
            Back up with Google - coming later
          </button>
        </section>
      </div>
    </AppShell>
  );
}
