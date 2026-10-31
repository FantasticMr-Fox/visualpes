"use client";

import React, { useState } from "react";
import {
  User,
  Users,
  FileCode,
  LayoutDashboard,
  Plug,
  Shield,
  FileText,
  ChevronRight,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import type { ConciergeNavState } from "./types";
import type { AccountSummary } from "@/types/erp";

interface ConciergeSettingsViewProps {
  account?: AccountSummary | null;
  onNavigate: (state: ConciergeNavState) => void;
  onOpen2FA: () => void;
  onLogout: () => void;
}

export function ConciergeSettingsView({
  account,
  onNavigate,
  onOpen2FA,
  onLogout,
}: ConciergeSettingsViewProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Exact 7 rows matching Storyboard Screen 9
  const settingsRows = [
    {
      id: "profile",
      title: "Profil de la conciergerie",
      subtitle: "Informations et branding",
      icon: User,
      action: () => setActiveModal("profile"),
    },
    {
      id: "team",
      title: "Gestion des équipes",
      subtitle: "Rôles et permissions",
      icon: Users,
      action: () => onNavigate({ type: "users" }),
    },
    {
      id: "templates",
      title: "Modèles de contenu",
      subtitle: "Templates pour les tags",
      icon: FileCode,
      action: () => setActiveModal("templates"),
    },
    {
      id: "default-page",
      title: "Page client par défaut",
      subtitle: "Personnalisation globale",
      icon: LayoutDashboard,
      action: () => setActiveModal("default-page"),
    },
    {
      id: "integrations",
      title: "Intégrations",
      subtitle: "PMS, outils tiers, API",
      icon: Plug,
      action: () => setActiveModal("integrations"),
    },
    {
      id: "security",
      title: "Sécurité",
      subtitle: "Authentification, sauvegardes",
      icon: Shield,
      action: onOpen2FA,
    },
    {
      id: "billing",
      title: "Facturation",
      subtitle: "Abonnement et paiement",
      icon: FileText,
      action: () => setActiveModal("billing"),
    },
  ];

  return (
    <div className="space-y-3 pb-20 select-none">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
          Paramètres
        </h1>
        <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
          Configuration de la conciergerie
        </p>
      </div>

      {/* 7 Menu Rows matching Storyboard Screen 9 */}
      <div className="space-y-1.5 pt-1">
        {settingsRows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.id}
              type="button"
              onClick={row.action}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.06] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 text-[#8E8E93] group-hover:text-white group-hover:scale-110 transition-all duration-200 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200 truncate">
                    {row.title}
                  </p>
                  <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200 truncate">
                    {row.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
            </button>
          );
        })}

        {/* Déconnexion shortcut */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1416]/50 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/50 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(244,63,94,0.15)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group mt-3"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform duration-200" />
            <p className="text-xs font-semibold text-rose-400 group-hover:text-rose-300 transition-colors duration-200">
              Déconnexion
            </p>
          </div>
        </button>
      </div>

      {/* Detail Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#16161A] border border-white/[0.1] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-xs font-semibold text-white">
                {settingsRows.find((s) => s.id === activeModal)?.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[10px] text-[#8E8E93] hover:text-white"
              >
                Fermer
              </button>
            </div>

            {activeModal === "profile" && (
              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[#202026]">
                  <p className="text-[9px] text-[#8E8E93] uppercase">Conciergerie</p>
                  <p className="font-semibold text-white">{account?.name || "Conciergerie Alpine Privilège"}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#202026]">
                  <p className="text-[9px] text-[#8E8E93] uppercase">Contact</p>
                  <p className="text-white">{account?.contactEmail || "contact@visualpes.fr"}</p>
                </div>
              </div>
            )}

            {activeModal === "templates" && (
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-[#202026]">
                  <p className="font-semibold text-white">Template Wi-Fi WPA3</p>
                  <p className="text-[10px] text-[#8E8E93]">Connexion directe 1-tap</p>
                </div>
                <div className="p-2 rounded-lg bg-[#202026]">
                  <p className="font-semibold text-white">Livret d'Accueil</p>
                  <p className="text-[10px] text-[#8E8E93]">Consignes &amp; check-out</p>
                </div>
              </div>
            )}

            {activeModal === "default-page" && (
              <div className="p-2.5 rounded-lg bg-[#202026] text-[11px] space-y-1">
                <p className="font-semibold text-[#DFB277]">Thème Dark Luxe Alpin</p>
                <p className="text-[10px] text-[#8E8E93]">Noir ardoise &amp; or chaud</p>
              </div>
            )}

            {activeModal === "integrations" && (
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-[#202026] flex items-center justify-between">
                  <span className="font-semibold text-white">Airbnb &amp; iCal</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                </div>
                <div className="p-2 rounded-lg bg-[#202026] flex items-center justify-between">
                  <span className="font-semibold text-white">API VisuAlpes</span>
                  <span className="text-[10px] text-[#34D399]">Active</span>
                </div>
              </div>
            )}

            {activeModal === "billing" && (
              <div className="p-2.5 rounded-lg bg-[#202026] text-[11px]">
                <p className="font-semibold text-white">Abonnement Annuel Illimité</p>
                <p className="text-[10px] text-[#DFB277] mt-0.5">Propriétés &amp; tags illimités</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-1.5 rounded-lg bg-[#202026] text-xs text-[#8E8E93]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
