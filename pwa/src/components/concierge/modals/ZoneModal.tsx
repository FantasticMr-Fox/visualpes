"use client";

import React, { useState, useEffect } from "react";
import { X, LayoutGrid } from "lucide-react";
import type { ZoneItem } from "@/types/erp";

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; mountType?: string }) => Promise<void>;
  zone?: ZoneItem | null;
  propertyName?: string;
}

const COMMON_ZONE_SUGGESTIONS = [
  "Salon",
  "Cuisine",
  "Chambres",
  "Extérieur",
  "Suite Parentale",
  "Espace Spa / Sauna",
  "Ski Room",
  "Entrée",
];

export function ZoneModal({
  isOpen,
  onClose,
  onSave,
  zone,
  propertyName = "la propriété",
}: ZoneModalProps) {
  const [name, setName] = useState("");
  const [mountType, setMountType] = useState("wood_plaque");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (zone) {
      setName(zone.name || "");
      setMountType(zone.mountType || "wood_plaque");
    } else {
      setName("");
      setMountType("wood_plaque");
    }
  }, [zone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        mountType,
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
            <div className="w-8 h-8 rounded-xl bg-[#22222C] flex items-center justify-center text-[#DFCA9F]">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {zone ? "Modifier la pièce" : "Nouvelle zone / pièce"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Dans {propertyName}
              </p>
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
              Nom de la zone ou pièce *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Salon, Cuisine, Suite 1..."
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="text-[10px] text-neutral-400 uppercase font-medium mb-1.5">
              Suggestions rapides
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ZONE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className="px-2.5 py-1 rounded-lg bg-[#202028] hover:bg-[#2A2A36] border border-white/[0.06] text-neutral-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              Support d'intégration NFC
            </label>
            <select
              value={mountType}
              onChange={(e) => setMountType(e.target.value)}
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none cursor-pointer"
            >
              <option value="wood_plaque">Plaque bois noble gravée laser</option>
              <option value="wall_mount">Support mural discret</option>
              <option value="stand">Chevalet de table massif</option>
              <option value="sticker">Sticker résine discret</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFCA9F] to-[#C9A96B] hover:from-[#EBDAB5] hover:to-[#B89354] text-neutral-950 font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : zone ? "Mettre à jour" : "Ajouter la pièce"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

