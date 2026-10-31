"use client";

import React from "react";
import { Home, Plus, Users, Settings } from "lucide-react";
import type { ConciergeNavState } from "./types";
import { ConciergeBellIcon } from "./ConciergeBellIcon";

interface ConciergeBottomNavProps {
  navState: ConciergeNavState;
  onNavigate: (state: ConciergeNavState) => void;
  onOpenQuickAction: () => void;
}

const u = (n: number) => `calc(var(--u) * ${n})`;

export function ConciergeBottomNav({
  navState,
  onNavigate,
  onOpenQuickAction,
}: ConciergeBottomNavProps) {
  const activeTab: "home" | "properties" | "users" | "settings" =
    navState.type === "home"
      ? "home"
      : navState.type === "users"
      ? "users"
      : navState.type === "settings"
      ? "settings"
      : "properties";

  const tabs = [
    { id: "home", label: "Conciergerie", icon: ConciergeBellIcon, target: { type: "home" } as ConciergeNavState },
    { id: "properties", label: "Propriétés", icon: Home, target: { type: "properties" } as ConciergeNavState },
    { id: "plus" },
    { id: "users", label: "Utilisateurs", icon: Users, target: { type: "users" } as ConciergeNavState },
    { id: "settings", label: "Paramètres", icon: Settings, target: { type: "settings" } as ConciergeNavState },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 select-none border-t border-white/[0.08] bg-[#0A0A0C]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-auto grid grid-cols-5"
        style={{ width: u(312), maxWidth: "100%", height: u(53) }}
      >
        {tabs.map((tab) => {
          if (tab.id === "plus") {
            return (
              <div key="plus" className="flex justify-center">
                <button
                  type="button"
                  onClick={onOpenQuickAction}
                  className="group flex cursor-pointer items-center justify-center rounded-full border-[#F0B35A] bg-[#0A0A0C] text-[#F0B35A] transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                  style={{
                    width: u(42),
                    height: u(42),
                    marginTop: u(-3),
                    borderWidth: u(1.5),
                    boxShadow:
                      "0 0 18px rgba(240,179,90,0.5), inset 0 0 8px rgba(240,179,90,0.2)",
                  }}
                  title="Ajouter un élément"
                  aria-label="Ajouter un élément"
                >
                  <Plus
                    style={{ width: u(22), height: u(22) }}
                    strokeWidth={2}
                    className="transition-transform duration-300 group-hover:rotate-90"
                  />
                </button>
              </div>
            );
          }
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.target)}
              className={`group flex cursor-pointer flex-col items-center justify-between transition-all duration-200 active:scale-90 ${
                active ? "text-[#F0B35A]" : "text-neutral-400 hover:text-white"
              }`}
              style={{ paddingTop: u(8), paddingBottom: u(6) }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: u(20), height: u(20) }}
              >
                <Icon
                  strokeWidth={active ? 2.1 : 1.7}
                  className="w-full h-full transition-transform duration-200 group-hover:-translate-y-0.5 fill-none"
                />
              </div>
              <span
                className={`transition-colors duration-200 ${active ? "font-bold" : "font-medium"}`}
                style={{ fontSize: u(9), lineHeight: u(12) }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
