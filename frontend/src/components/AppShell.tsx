import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/inventory", icon: "inventory_2", label: "Inventory" },
  { to: "/enrollment", icon: "person_add", label: "Enrollment" },
  { to: "/audit", icon: "history_edu", label: "Audit Ledger" },
] as const;

const extraNav = [
  // { icon: "settings", label: "Settings" },
];

const footerNav = [
  // { icon: "analytics", label: "System Health" },
  // { icon: "help", label: "Help" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant z-40 flex flex-col py-lg">
        <div className="px-lg mb-xl flex items-center gap-md">
          <div className="w-10 h-10 bg-primary-fixed-dim rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">warehouse</span>
          </div>
          <div>
            <h2 className="font-bold text-primary leading-tight">Node Alpha</h2>
            <p className="text-[10px] text-secondary tracking-widest uppercase font-semibold">Active Session</p>
          </div>
        </div>
        <nav className="flex-1 space-y-xs">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  active
                    ? "text-primary border-r-2 border-primary bg-surface-container-highest font-bold flex items-center gap-md px-lg py-md transition-all"
                    : "text-secondary flex items-center gap-md px-lg py-md hover:bg-surface-container hover:text-on-surface transition-all"
                }
              >
                <span className="material-symbols-outlined">{n.icon}</span>
                <span className="text-[12px] font-semibold uppercase tracking-wider">{n.label}</span>
              </Link>
            );
          })}
          {extraNav.map((n) => (
            <a key={n.label} href="#" className="text-secondary flex items-center gap-md px-lg py-md hover:bg-surface-container hover:text-on-surface transition-all">
              <span className="material-symbols-outlined">{n.icon}</span>
              <span className="text-[12px] font-semibold uppercase tracking-wider">{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-lg border-t border-outline-variant">
          {footerNav.map((n) => (
            <a key={n.label} href="#" className="text-secondary flex items-center gap-md px-lg py-md hover:bg-surface-container hover:text-on-surface transition-all">
              <span className="material-symbols-outlined">{n.icon}</span>
              <span className="text-[12px] font-semibold uppercase tracking-wider">{n.label}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Main column */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="w-full h-16 sticky top-0 bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-margin-desktop z-30">
          <div className="flex items-center gap-lg">
            <span className="text-xl font-bold text-primary tracking-tight">LOGISTIX OPERATIONAL SUITE</span>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">search</span>
              <input
                type="text"
                placeholder="Global search..."
                className="bg-surface-container border-none h-10 pl-10 pr-4 text-sm w-80 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="w-10 h-10 flex items-center justify-center text-on-secondary-fixed-variant hover:bg-surface-container transition-colors rounded">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-sm px-md py-1 border-x border-outline-variant">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">account_circle</span>
              </div>
              <span className="text-[12px] font-bold text-primary tracking-wider">OPERATOR_042</span>
            </div>
            <Link
              to="/auth"
              className="w-10 h-10 flex items-center justify-center text-on-secondary-fixed-variant hover:bg-surface-container transition-colors rounded"
            >
              <span className="material-symbols-outlined">logout</span>
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
