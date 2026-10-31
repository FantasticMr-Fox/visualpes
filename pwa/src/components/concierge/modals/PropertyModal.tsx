"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, MapPin, Users, BedDouble, KeyRound, Image as ImageIcon } from "lucide-react";
import type { PropertyItem } from "@/types/erp";

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PropertyItem>) => Promise<void>;
  property?: PropertyItem | null;
}

export function PropertyModal({
  isOpen,
  onClose,
  onSave,
  property,
}: PropertyModalProps) {
  const [name, setName] = useState("");
  const [resort, setResort] = useState("");
  const [address, setAddress] = useState("");
  const [typology, setTypology] = useState("Chalet de prestige");
  const [capacity, setCapacity] = useState<number | string>(10);
  const [bedrooms, setBedrooms] = useState<number | string>(5);
  const [keyBoxCode, setKeyBoxCode] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (property) {
      setName(property.name || "");
      setResort(property.resort || "");
      setAddress(property.address || "");
      setTypology(property.typology || "Chalet de prestige");
      setCapacity(property.capacity ?? 10);
      setBedrooms(property.bedrooms ?? 5);
      setKeyBoxCode(property.keyBoxCode || "");
      setCoverImageUrl(property.coverImageUrl || "");
      setInstructions(property.instructions || "");
    } else {
      setName("");
      setResort("Chamonix");
      setAddress("");
      setTypology("Chalet de prestige");
      setCapacity(10);
      setBedrooms(5);
      setKeyBoxCode("");
      setCoverImageUrl("");
      setInstructions("");
    }
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        resort: resort.trim() || undefined,
        address: address.trim() || undefined,
        typology: typology.trim() || undefined,
        capacity: Number(capacity) || undefined,
        bedrooms: Number(bedrooms) || undefined,
        keyBoxCode: keyBoxCode.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        instructions: instructions.trim() || undefined,
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
      <div className="relative w-full max-w-md bg-[#16161A] border border-white/[0.12] rounded-3xl p-5 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#22222C] flex items-center justify-center text-[#DFCA9F]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {property ? "Modifier la propriété" : "Nouvelle propriété"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Chalet ou résidence d'exception
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
              Nom de la propriété *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Les Cimes, Villa Horizon"
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Station alpine
              </label>
              <input
                type="text"
                value={resort}
                onChange={(e) => setResort(e.target.value)}
                placeholder="ex: Chamonix, Megève"
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Typologie
              </label>
              <input
                type="text"
                value={typology}
                onChange={(e) => setTypology(e.target.value)}
                placeholder="Chalet, Villa, Penthouse"
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Capacité (personnes)
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Chambres
              </label>
              <input
                type="number"
                min="1"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              Code boîte à clés
            </label>
            <input
              type="text"
              value={keyBoxCode}
              onChange={(e) => setKeyBoxCode(e.target.value)}
              placeholder="ex: 4589"
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1">
              URL photo de couverture
            </label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
            />
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
              {saving ? "Enregistrement..." : property ? "Mettre à jour" : "Créer la propriété"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

