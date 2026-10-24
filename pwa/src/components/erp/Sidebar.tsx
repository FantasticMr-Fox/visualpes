"use client";

import React from "react";
import type { ErpTab } from "@/types/erp";

interface SidebarProps {
  activeTab: ErpTab;
  onSelectTab: (tab: ErpTab) => void;
  isAdmin: boolean;
  connected: boolean;
  lastScanned: string | null;
  activeOrdersCount: number;
  lowStockCount: number;
  totalStockItemsCount: number;
  accountsCount: number;
  nfcCount: number;
  openTicketsCount: number;
  onLogout: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isAdmin,
  connected,
  lastScanned,
  activeOrdersCount,
  lowStockCount,
  totalStockItemsCount,
  accountsCount,
  nfcCount,
  openTicketsCount,
  onLogout,
}: SidebarProps) {
  const navItems: Array<{
    id: ErpTab;
    label: string;
    subtitle: string;
    adminOnly?: boolean;
    badge?: string | number;
    badgeTone?: "neutral" | "orange" | "emerald" | "sky";
    icon: React.ReactNode;
  }> = [
    {
      id: "orders",
      label: "Commandes",
      subtitle: "Kanban de production",
      badge: activeOrdersCount,
      badgeTone: "sky",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      id: "stocks",
      label: "Stocks Atelier",
      subtitle: "TPU, ciment, bois & seuils",
      adminOnly: true,
      badge: lowStockCount > 0 ? `${lowStockCount} alerte${lowStockCount > 1 ? "s" : ""}` : totalStockItemsCount,
      badgeTone: lowStockCount > 0 ? "orange" : "emerald",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "clients",
      label: "Clients & Propriétés",
      subtitle: "Comptes, Wi-Fi & guides",
      badge: accountsCount,
      badgeTone: "neutral",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "nfc",
      label: "Tags NFC",
      subtitle: "Encodage & UID courts",
      adminOnly: true,
      badge: nfcCount,
      badgeTone: "neutral",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
    },
    {
      id: "support",
      label: "Support & IA",
      subtitle: "Tickets & brouillons IA",
      badge: openTicketsCount,
      badgeTone: openTicketsCount > 0 ? "orange" : "neutral",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  const badgeStyles: Record<string, string> = {
    neutral: "border-neutral-700 bg-neutral-800/80 text-neutral-300",
    sky: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    orange: "border-orange-500/50 bg-orange-500/20 text-orange-300 animate-pulse",
  };

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between border-b border-neutral-800 bg-neutral-900/70 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex flex-col gap-6">
        {/* Identité VisuAlpes */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-sm font-black text-neutral-950 shadow-sm">
            VA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-neutral-100">VisuAlpes</span>
              <span className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.2 font-mono text-[10px] text-neutral-300">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              {isAdmin ? "Atelier & Administration" : "Espace Client"}
            </p>
          </div>
        </div>

        {/* Navigation principale */}
        <nav className="flex flex-col gap-1.5">
          <span className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Navigation
          </span>
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-neutral-700 bg-neutral-800/90 text-white shadow-sm"
                      : "border-transparent text-neutral-400 hover:border-neutral-800/80 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                        active
                          ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                          : "border-neutral-800 bg-neutral-950 text-neutral-400 group-hover:text-neutral-200"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">{item.label}</div>
                      <div className="text-[11px] text-neutral-500">{item.subtitle}</div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        badgeStyles[item.badgeTone ?? "neutral"]
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Pied de barre latérale : Statut temps réel, Douchette USB & Déconnexion */}
      <div className="mt-6 flex flex-col gap-3 border-t border-neutral-800 pt-4">
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-800/90 bg-neutral-950/70 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Hub Mercure SSE</span>
            <span className="flex items-center gap-1.5 font-medium text-neutral-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "animate-pulse bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {connected ? "Connecté" : "Hors ligne"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-800/70 pt-2">
            <span className="text-neutral-400">Douchette USB</span>
            <span className="font-mono text-[11px] text-sky-400">
              {lastScanned ? `Scan: ${lastScanned}` : "Prête"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:border-rose-800/60 hover:bg-rose-950/30 hover:text-rose-300"
        >
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

