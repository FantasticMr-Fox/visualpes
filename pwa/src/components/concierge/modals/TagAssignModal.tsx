"use client";

import React, { useState } from "react";
import { X, Wifi, LayoutGrid, Check } from "lucide-react";
import type { ZoneItem, PropertyItem } from "@/types/erp";

interface TagAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: {
    zoneId: number;
    title: string;
    tagType: "wifi" | "guide" | "services" | "contact";
  }) => Promise<void>;
  zones: ZoneItem[];
  defaultZoneId?: number;
}

export function TagAssignModal({
  isOpen,
  onClose,
  onAssign,
  zones,
  defaultZoneId,
}: TagAssignModalProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<number>(
    defaultZoneId || (zones[0]?.id ?? 1),
  );
  const [title, setTitle] = useState("Tag #01");
  const [tagType, setTagType] = useState<"wifi" | "guide" | "services" | "contact">("wifi");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAssign({
        zoneId: selectedZoneId,
        title,
        tagType,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm bg-[#16161A] border border-white/[0.12] rounded-3xl p-5 shadow-2xl z-10 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Nouveau Tag NFC / QR</h3>
              <p className="text-[11px] text-neutral-400">Associer à une zone</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              Libellé du tag *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Tag #01 Wi-Fi, Tag #02 Guide..."
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              Zone / Pièce d'affectation
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(Number(e.target.value))}
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none cursor-pointer"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              Fonction principale
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTagType("wifi")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tagType === "wifi"
                    ? "bg-[#C9A96B]/15 border-[#C9A96B] text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400"
                }`}
              >
                <span className="font-semibold block">Wi-Fi Rapide</span>
                <span className="text-[10px] text-neutral-400">Connexion 1-tap</span>
              </button>

              <button
                type="button"
                onClick={() => setTagType("guide")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tagType === "guide"
                    ? "bg-[#C9A96B]/15 border-[#C9A96B] text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400"
                }`}
              >
                <span className="font-semibold block">Guide Chalet</span>
                <span className="text-[10px] text-neutral-400">Livret d'accueil</span>
              </button>

              <button
                type="button"
                onClick={() => setTagType("services")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tagType === "services"
                    ? "bg-[#C9A96B]/15 border-[#C9A96B] text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400"
                }`}
              >
                <span className="font-semibold block">Services</span>
                <span className="text-[10px] text-neutral-400">Spa, Chef, Taxi</span>
              </button>

              <button
                type="button"
                onClick={() => setTagType("contact")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tagType === "contact"
                    ? "bg-[#C9A96B]/15 border-[#C9A96B] text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400"
                }`}
              >
                <span className="font-semibold block">Concierge</span>
                <span className="text-[10px] text-neutral-400">Astreinte 24/7</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFCA9F] to-[#C9A96B] text-neutral-950 font-semibold"
            >
              {saving ? "Association..." : "Associer le tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

