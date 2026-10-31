"use client";

import React, { useState } from "react";
import { ChevronLeft, MoreHorizontal, User as UserIcon, LogOut } from "lucide-react";
import type { ConciergeNavState } from "./types";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import type { PropertyItem, ZoneItem } from "@/types/erp";

interface ConciergeHeaderProps {
  navState: ConciergeNavState;
  onNavigate: (state: ConciergeNavState) => void;
  properties: PropertyItem[];
  zones: ZoneItem[];
  currentUserEmail?: string;
  onLogout: () => void;
  onOpenNotifications?: () => void;
  onOpenTagOptions?: () => void;
}

export function ConciergeHeader({
  navState,
  onNavigate,
  properties,
  zones,
  currentUserEmail = "renard@renard.fr",
  onLogout,
  onOpenNotifications,
  onOpenTagOptions,
}: ConciergeHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive back breadcrumb label and target
  let backLabel: string | null = null;
  let onBack: (() => void) | null = null;

  if (navState.type === "properties" || navState.type === "users" || navState.type === "settings") {
    backLabel = "Conciergerie";
    onBack = () => onNavigate({ type: "home" });
  } else if (navState.type === "property-detail") {
    backLabel = "Propriétés";
    onBack = () => onNavigate({ type: "properties" });
  } else if (navState.type === "zone-detail") {
    const currentProp = properties.find((p) => p.id === navState.propertyId);
    backLabel = currentProp ? currentProp.name : "Les Cimes";
    onBack = () =>
      onNavigate({
        type: "property-detail",
        propertyId: navState.propertyId,
        subTab: "zones",
      });
  } else if (navState.type === "tag-detail") {
    const currentZone = zones.find((z) => z.id === navState.zoneId);
    backLabel = currentZone ? currentZone.name : "Salon";
    onBack = () =>
      onNavigate({
        type: "zone-detail",
        propertyId: navState.propertyId,
        zoneId: navState.zoneId,
      });
  }

  const initials = "JG";
  const logoButton = (
    <button
      type="button"
      onClick={() => onNavigate({ type: "home" })}
      className="cursor-pointer text-center group shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      title="Accueil Conciergerie"
    >
      <VisuAlpesLogo
        variant="dark"
        className="w-auto transition-opacity duration-200 group-hover:opacity-90"
        style={{ height: "calc(var(--u) * 24)" }}
      />
    </button>
  );
  const isHome = navState.type === "home";

  return (
    <header
      className={`top-0 z-40 w-full select-none transition-colors duration-300 ${
        isHome
          ? "absolute inset-x-0 bg-transparent"
          : "sticky bg-[#0A0A0C]/90 backdrop-blur-md border-b border-white/[0.06]"
      }`}
    >
      <div
        className="mx-auto flex items-start justify-between relative"
        style={{
          width: "calc(var(--u) * 312)",
          maxWidth: "100%",
          minHeight: isHome ? "calc(var(--u) * 58)" : "calc(var(--u) * 58)",
          padding: isHome
            ? "calc(var(--u) * 14) calc(var(--u) * 20) 0 calc(var(--u) * 20)"
            : "calc(var(--u) * 14) calc(var(--u) * 20) calc(var(--u) * 10) calc(var(--u) * 20)",
        }}
      >
        {/* Left side: Logo + Contextual Back Breadcrumb stacked directly underneath */}
        <div className="flex-1 flex flex-col items-start min-w-0">
          {logoButton}
          {!isHome && backLabel && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-0.5 mt-1.5 font-medium text-[#8E8E93] hover:text-[#DFB277] transition-all duration-200 group cursor-pointer"
              style={{ fontSize: "calc(var(--u) * 11)" }}
              title={`Retour vers ${backLabel}`}
            >
              <ChevronLeft
                className="shrink-0 -ml-1 text-[#8E8E93] group-hover:text-[#DFB277] group-hover:-translate-x-0.5 transition-transform duration-200"
                style={{ width: "calc(var(--u) * 14)", height: "calc(var(--u) * 14)" }}
              />
              <span className="truncate">{backLabel}</span>
            </button>
          )}
        </div>

        {/* Right side: Bell icon on Screen 1, "..." on Screen 5, JG avatar elsewhere */}
        <div className="flex items-center justify-end gap-3 min-w-0 relative shrink-0">
          {navState.type === "tag-detail" ? (
            <button
              type="button"
              onClick={onOpenTagOptions}
              className="w-8 h-8 rounded-full bg-[#16161A] hover:bg-[#22222A] text-[#8E8E93] hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer border border-white/[0.08]"
              title="Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="rounded-full bg-[#0A0A0C]/60 border-[1.5px] border-[#E8C27A] flex items-center justify-center font-semibold text-[#E8C27A] hover:ring-4 hover:ring-[#DFB277]/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-inner"
              title={currentUserEmail}
              style={{ width: "calc(var(--u) * 24)", height: "calc(var(--u) * 24)", fontSize: "calc(var(--u) * 9)" }}
            >
              {initials}
            </button>
          )}

          {/* Mini Profile Popover */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-50"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl bg-[#16161A] border border-white/[0.1] shadow-2xl p-3 text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-2.5 mb-2 border-b border-white/[0.08]">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                    Conciergerie Partenaire
                  </p>
                  <p className="font-semibold text-white truncate mt-0.5">{currentUserEmail}</p>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate({ type: "settings" });
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.05] text-neutral-300 hover:text-white transition-colors text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#DFB277]" />
                    <span>Paramètres</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
