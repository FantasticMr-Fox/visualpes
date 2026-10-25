"use client";

import React, { useState } from "react";
import type { ErpTab } from "@/types/erp";
import { TwoFactorSettingsModal } from "@/components/common/TwoFactorSettingsModal";

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
  const [securityOpen, setSecurityOpen] = useState(false);

  const navItems: Array<{
    id: ErpTab;
    label: string;
    adminOnly?: boolean;
    badge?: string | number;
    alert?: boolean;
    icon: React.ReactNode;
  }> = [
    {
      id: "orders",
      label: "Commandes",
      badge: activeOrdersCount,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      id: "stocks",
      label: "Stocks",
      adminOnly: true,
      badge: lowStockCount > 0 ? `${lowStockCount} alerte` : totalStockItemsCount,
      alert: lowStockCount > 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "clients",
      label: "Clients & Logements",
      badge: accountsCount,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "nfc",
      label: "Tags NFC",
      adminOnly: true,
      badge: nfcCount,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
    },
    {
      id: "support",
      label: "Support",
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
      alert: openTicketsCount > 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between border-b border-neutral-800/80 bg-neutral-950 px-3 py-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="flex flex-col gap-6">
        {/* Identité VisuAlpes */}
        <div className="flex items-center gap-2.5 px-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-xs font-black text-neutral-950">
            VA
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white">VisuAlpes</span>
            <span className="text-[11px] text-neutral-500">
              {isAdmin ? "Atelier" : "Client"}
            </span>
          </div>
        </div>

        {/* Navigation épurée */}
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-neutral-800/90 text-white"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={active ? "text-emerald-400" : "text-neutral-500"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                        item.alert
                          ? "bg-orange-500/20 font-semibold text-orange-300"
                          : active
                            ? "bg-neutral-700/80 text-neutral-200"
                            : "text-neutral-500"
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

      {/* Pied de barre latérale : Statut temps réel compact & Déconnexion */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-900 pt-3 md:flex-col md:items-stretch">
        <div className="flex items-center justify-between px-2 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {connected ? "Temps réel" : "Hors ligne"}
          </span>
          <span className="font-mono text-[10px] text-neutral-400">
            {lastScanned ? `Scan ${lastScanned}` : "USB prête"}
          </span>
        </div>

        {isAdmin && (
          <a
            href="/client"
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-center text-xs font-medium text-sky-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Portail Client ↗
          </a>
        )}

        <button
          type="button"
          onClick={() => setSecurityOpen(true)}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-2.5 py-1.5 text-center text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          Sécurité &amp; 2FA
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-rose-300"
        >
          Déconnexion
        </button>
      </div>

      <TwoFactorSettingsModal
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        isAdmin={isAdmin}
      />
    </aside>
  );
}
