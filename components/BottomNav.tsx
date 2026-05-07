"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/today", label: "Today", icon: "check" },
  { href: "/zones", label: "Zones", icon: "home" },
  { href: "/templates", label: "Templates", icon: "list" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(68,64,60,0.08)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/today" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-emerald-950 text-white"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <NavIcon icon={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ icon }: { icon: string }) {
  const commonProps = {
    className: "mb-1 h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (icon === "home") {
    return (
      <svg {...commonProps}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
      </svg>
    );
  }

  if (icon === "list") {
    return (
      <svg {...commonProps}>
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (icon === "gear") {
    return (
      <svg {...commonProps}>
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path d="M19 12a7 7 0 0 0-.08-1l2.03-1.57-2-3.46-2.39.96a7 7 0 0 0-1.72-1L14.5 3h-5l-.34 2.93a7 7 0 0 0-1.72 1l-2.39-.96-2 3.46L5.08 11a7 7 0 0 0 0 2l-2.03 1.57 2 3.46 2.39-.96a7 7 0 0 0 1.72 1L9.5 21h5l.34-2.93a7 7 0 0 0 1.72-1l2.39.96 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
