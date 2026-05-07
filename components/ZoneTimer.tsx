"use client";

import { useEffect, useMemo, useState } from "react";

const fifteenMinutes = 15 * 60;

export function ZoneTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState(fifteenMinutes);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  const progress = Math.round(((fifteenMinutes - remainingSeconds) / fifteenMinutes) * 100);

  return (
    <section className="rounded-[2rem] bg-emerald-950 p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            15-minute focus
          </p>
          <h2 className="mt-1 text-2xl font-black">{formattedTime}</h2>
          <p className="mt-1 text-sm text-emerald-100">
            Start and stop when the timer ends. A small reset counts.
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
          <p className="text-lg font-black">{progress}%</p>
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-100">
            Timer
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-lime-300 transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setIsRunning(true)}
          disabled={isRunning || remainingSeconds === 0}
          className="min-h-12 rounded-2xl bg-white px-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/70"
        >
          {remainingSeconds === fifteenMinutes ? "Start" : "Resume"}
        </button>
        <button
          type="button"
          onClick={() => setIsRunning(false)}
          disabled={!isRunning}
          className="min-h-12 rounded-2xl bg-white/10 px-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/40"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setRemainingSeconds(fifteenMinutes);
          }}
          className="min-h-12 rounded-2xl bg-white/10 px-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15"
        >
          Reset
        </button>
      </div>

      {remainingSeconds === 0 ? (
        <p className="mt-4 rounded-2xl bg-lime-300 px-3 py-2 text-sm font-black text-emerald-950">
          Timer complete. Take the win and stop here if you need to.
        </p>
      ) : null}
    </section>
  );
}
