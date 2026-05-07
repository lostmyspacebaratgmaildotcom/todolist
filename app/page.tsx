import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7df,transparent_34rem),linear-gradient(180deg,#fffdf8,#f7f3ea)] px-4 py-6 text-stone-950">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between rounded-[2.25rem] bg-white/80 p-5 shadow-sm ring-1 ring-stone-200 backdrop-blur">
        <div>
          <div className="mb-8 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-800">
            Apartment Reset
          </div>
          <h1 className="text-5xl font-black tracking-tight text-stone-950">
            Clean one small part of home today.
          </h1>
          <p className="mt-5 text-base leading-7 text-stone-600">
            A no-login daily routine for apartment cleaning. Open the app, see the
            next tiny task, check it off, and keep moving without a giant chore list.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "Morning, afternoon, and evening blocks",
              "Independent 100% scores for each block",
              "Private progress saved on this browser",
              "Apartment zones and a 15-minute timer",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950 text-white">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </span>
                <span className="text-sm font-bold text-stone-800">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-3">
          <Link
            href="/today"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-950 px-5 text-base font-black text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            Start with default routine
          </Link>
          <Link
            href="/templates"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-white px-5 text-base font-black text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
          >
            Browse templates
          </Link>
          <p className="text-center text-xs leading-5 text-stone-500">
            No account, no public cleaning logs, no points or streaks.
          </p>
        </div>
      </section>
    </main>
  );
}
