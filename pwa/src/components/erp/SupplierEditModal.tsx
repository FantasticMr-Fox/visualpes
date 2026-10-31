"use client";

import React, { useState } from "react";
import type { Supplier } from "@/types/erp";
import { Building2, X } from "lucide-react";

interface SupplierEditModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: number;
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    leadTimeDays: number;
    notes?: string | null;
  }) => Promise<void>;
}

export function SupplierEditModal({
  supplier,
  isOpen,
  onClose,
  onSave,
}: SupplierEditModalProps) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(supplier?.leadTimeDays ?? 5);
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if supplier changes
  React.useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setContactName(supplier.contactName ?? "");
      setEmail(supplier.email ?? "");
      setPhone(supplier.phone ?? "");
      setAddress(supplier.address ?? "");
      setLeadTimeDays(supplier.leadTimeDays ?? 5);
      setNotes(supplier.notes ?? "");
    } else {
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setLeadTimeDays(5);
      setNotes("");
    }
    setError(null);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de l'entreprise fournisseur est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: supplier?.id,
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        leadTimeDays: Math.max(1, Number(leadTimeDays)),
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde du fournisseur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#151517] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A96B]/15 text-[#DFCA9F]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F7F5EF]">
                {supplier ? "Modifier le Fournisseur" : "Nouveau Fournisseur Partenaire"}
              </h2>
              <p className="text-xs text-[#8C8379]">
                Gestion des approvisionnements matières premières
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF] transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
              Nom de la société / Fournisseur *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Scierie Artisanale du Mont-Blanc"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2.5 text-sm text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Contact principal
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex : Jean-Marc D."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Délai moyen (Jours)
              </label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Email commandes
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commandes@fournisseur.fr"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Téléphone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="04 50 XX XX XX"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
              Adresse postale / Ville
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex : 124 Route des Alpages, 74400 Chamonix"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
              Notes &amp; Spécifications matières
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Label PEFC exigé, livraison exclusivement le matin avant 11h..."
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] p-3 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary-gold rounded-xl px-5 py-2 text-xs uppercase tracking-wider font-semibold shadow-md disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : supplier ? "Mettre à jour" : "Créer le Fournisseur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

