"use client";

import React from "react";
import { Building2, LayoutGrid, Wifi, UserPlus, X } from "lucide-react";

interface ConciergeQuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProperty: () => void;
  onAddZone: () => void;
  onAddTag: () => void;
  onInviteUser: () => void;
}

export function ConciergeQuickActions({
  isOpen,
  onClose,
  onAddProperty,
  onAddZone,
  onAddTag,
  onInviteUser,
}: ConciergeQuickActionsProps) {
  if (!isOpen) return null;

  const actions = [
    {
      title: "Nouvelle propriété",
      subtitle: "Chalet, villa ou appartement de prestige",
      icon: Building2,
      onClick: () => {
        onClose();
        onAddProperty();
      },
    },
    {
      title: "Nouvelle pièce / zone",
      subtitle: "Salon, cuisine, suite parentale, spa",
      icon: LayoutGrid,
      onClick: () => {
        onClose();
        onAddZone();
      },
    },
    {
      title: "Associer un tag NFC / QR",
      subtitle: "Wi-Fi, guide, conciergerie ou services",
      icon: Wifi,
      onClick: () => {
        onClose();
        onAddTag();
      },
    },
    {
      title: "Inviter un utilisateur",
      subtitle: "Propriétaire, co-hôte, ménage, maintenance",
      icon: UserPlus,
      onClick: () => {
        onClose();
        onInviteUser();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg sm:max-w-xl mx-auto bg-[#141418] border-t border-white/[0.12] rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-4">
        {/* Grab bar */}
        <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto -mt-1 mb-2" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Action rapide</h3>
            <p className="text-xs text-neutral-400">Ajouter ou configurer un élément</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                type="button"
                onClick={act.onClick}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#1A1A20] hover:bg-[#22222A] border border-white/[0.06] hover:border-[#C9A96B]/40 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#262630] border border-white/[0.08] flex items-center justify-center text-[#DFCA9F] group-hover:bg-[#C9A96B]/20 group-hover:text-white transition-colors shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white group-hover:text-[#DFCA9F] transition-colors">
                    {act.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {act.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

