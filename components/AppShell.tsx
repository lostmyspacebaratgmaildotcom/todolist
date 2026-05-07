import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1f8ee,transparent_34rem),linear-gradient(180deg,#fffdf8,#f7f3ea)] text-stone-950">
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5 sm:px-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
