"use client";

import React, { useState } from "react";
import type { ErpTab } from "@/types/erp";
import { TwoFactorSettingsModal } from "@/components/common/TwoFactorSettingsModal";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

interface NavItem {
  id: ErpTab;
  label: string;
  adminOnly?: boolean;
  badge?: string | number;
  alert?: boolean;
  icon: React.ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

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
  propertiesCount?: number;
  usersCount?: number;
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
  propertiesCount = 0,
  usersCount = 0,
  nfcCount,
  openTicketsCount,
  onLogout,
}: SidebarProps) {
  const [securityOpen, setSecurityOpen] = useState(false);

  // Groupes de navigation organisés par domaine métier
  const navGroups: NavGroup[] = [
    {
      id: "pilotage",
      label: "Pilotage",
      items: [
        {
          id: "overview",
          label: "Vue d'ensemble",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "atelier",
      label: "Atelier & Fabrication",
      items: [
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
          label: "Stocks & Matières",
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
          id: "nfc",
          label: "Tags & Puces NFC",
          adminOnly: true,
          badge: nfcCount,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "parc",
      label: "Clients & Hébergements",
      items: [
        {
          id: "clients",
          label: "Comptes Clients",
          badge: accountsCount,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          id: "properties",
          label: "Propriétés",
          badge: propertiesCount,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          id: "users",
          label: "Gestion Utilisateurs",
          adminOnly: true,
          badge: usersCount,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "relation",
      label: "Assistance & SAV",
      items: [
        {
          id: "support",
          label: "Support SAV & IA",
          badge: openTicketsCount > 0 ? openTicketsCount : undefined,
          alert: openTicketsCount > 0,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between border-b border-white/[0.08] bg-[#111113] px-3.5 py-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex flex-col gap-5">
        {/* Identité VisuAlpes (Logo vectoriel pur, sans PNG, sans baseline) */}
        <div className="flex flex-col gap-2 px-1 pb-3.5 border-b border-white/[0.08]">
          <VisuAlpesLogo variant="dark" className="h-6 w-auto" />
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#DFCA9F]">
              ERP Atelier
            </span>
          </div>
        </div>

        {/* Navigation organisée en groupes avec séparateurs */}
        <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-3.5">
          {navGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            if (visibleItems.length === 0) return null;

            return (
              <div
                key={group.id}
                className={`flex flex-col gap-1 ${
                  groupIdx > 0 ? "md:border-t md:border-white/[0.06] md:pt-3" : ""
                }`}
              >
                {/* Séparateur et Titre du groupe */}
                <div className="hidden md:flex items-center justify-between px-2.5 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8379]/70">
                    {group.label}
                  </span>
                </div>

                {/* Boutons de navigation du groupe */}
                <div className="flex flex-row gap-1 md:flex-col">
                  {visibleItems.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectTab(item.id)}
                        className={`flex shrink-0 items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          active
                            ? "bg-[#222226] text-[#F7F5EF] font-semibold shadow-sm"
                            : "text-[#8C8379] hover:bg-white/[0.04] hover:text-[#F7F5EF]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={
                              active ? "text-[#C9A96B]" : "text-[#8C8379]"
                            }
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                              active
                                ? "bg-[#141416] text-[#F7F5EF] border border-white/10"
                                : item.alert
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-white/[0.05] text-[#8C8379]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Pied de barre latérale : Statut temps réel compact & Déconnexion */}
      <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3.5 md:flex-col md:items-stretch">
        <div className="flex items-center justify-between px-2 text-[11px] text-[#8C8379]">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-[#C9A96B]" : "bg-rose-500"
              }`}
            />
            <span>{connected ? "Temps réel" : "Hors ligne"}</span>
          </span>
          <span className="font-mono text-[10px] text-[#8C8379]/80">
            {lastScanned ? `Scan ${lastScanned}` : "USB prête"}
          </span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-[#8C8379]">Langue / Language</span>
          <LanguageSwitcher variant="pill" />
        </div>

        {isAdmin && (
          <a
            href="/"
            className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-center text-xs font-medium text-[#C9A96B] transition-colors hover:border-[#C9A96B]/40 hover:bg-[#C9A96B]/10"
          >
            Portail Client ↗
          </a>
        )}

        <button
          type="button"
          onClick={() => setSecurityOpen(true)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-center text-xs font-medium text-[#F7F5EF] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
          Sécurité &amp; 2FA
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg px-2.5 py-1.5 text-left text-xs text-[#8C8379] transition-colors hover:bg-white/[0.04] hover:text-rose-300"
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
