"use client";

import React from "react";
import { X, Bell, Wifi, AlertCircle, CheckCircle2 } from "lucide-react";

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tickets?: any[];
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  tickets = [],
}: NotificationsDrawerProps) {
  if (!isOpen) return null;

  const demoNotifications = [
    {
      id: 1,
      title: "Tag NFC Salon scanné",
      desc: "Chalet Les Cimes • Connexion Wi-Fi par un voyageur",
      time: "Il y a 12 min",
      type: "scan",
    },
    {
      id: 2,
      title: "Nouveau membre ajouté",
      desc: "Lucas Martin a rejoint l'équipe en tant que Co-hôte",
      time: "Il y a 2h",
      type: "team",
    },
    {
      id: 3,
      title: "Sécurité WPA3 active",
      desc: "Clé de chiffrement renouvelée avec succès",
      time: "Hier",
      type: "security",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg sm:max-w-xl mx-auto bg-[#141418] border-t border-white/[0.12] rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-4">
        <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto -mt-1 mb-2" />

        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#22222C] flex items-center justify-center text-[#DFCA9F]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <p className="text-[11px] text-neutral-400">Activité récente du service conciergerie</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto">
          {demoNotifications.map((notif) => (
            <div
              key={notif.id}
              className="p-3.5 rounded-2xl bg-[#1A1A20] border border-white/[0.06] flex items-start gap-3 text-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/[0.06] flex items-center justify-center text-[#DFCA9F] shrink-0 mt-0.5">
                {notif.type === "scan" ? (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                ) : notif.type === "team" ? (
                  <CheckCircle2 className="w-4 h-4 text-[#DFCA9F]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-white truncate">{notif.title}</p>
                  <span className="text-[10px] text-neutral-500 shrink-0">{notif.time}</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">{notif.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
