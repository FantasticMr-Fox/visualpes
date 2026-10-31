"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Shield, Crown, Building2, Check } from "lucide-react";
import type { UserItem, PropertyItem } from "@/types/erp";

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    email: string;
    password?: string;
    roles: string[];
    properties?: string[];
  }) => Promise<void>;
  editingUser?: UserItem | null;
  properties: PropertyItem[];
}

export function UserInviteModal({
  isOpen,
  onClose,
  onSave,
  editingUser,
  properties,
}: UserInviteModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ROLE_ACCOUNT_ADMIN" | "ROLE_PROPERTY_ADMIN" | "ROLE_USER">("ROLE_USER");
  const [selectedPropertyIris, setSelectedPropertyIris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setEmail(editingUser.email);
      setPassword("");
      if (editingUser.roles.includes("ROLE_ACCOUNT_ADMIN")) {
        setSelectedRole("ROLE_ACCOUNT_ADMIN");
      } else if (editingUser.roles.includes("ROLE_PROPERTY_ADMIN")) {
        setSelectedRole("ROLE_PROPERTY_ADMIN");
      } else {
        setSelectedRole("ROLE_USER");
      }
      setSelectedPropertyIris(editingUser.properties || []);
    } else {
      setEmail("");
      setPassword("");
      setSelectedRole("ROLE_USER");
      setSelectedPropertyIris([]);
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const toggleProperty = (pIri: string) => {
    setSelectedPropertyIris((prev) =>
      prev.includes(pIri) ? prev.filter((id) => id !== pIri) : [...prev, pIri],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await onSave({
        email: email.trim(),
        password: password.trim() || undefined,
        roles: [selectedRole],
        properties: selectedRole === "ROLE_ACCOUNT_ADMIN" ? [] : selectedPropertyIris,
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
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {editingUser ? "Modifier l'utilisateur" : "Inviter un utilisateur"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Droits d'accès et propriétés attribuées
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
              Adresse email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborateur@conciergerie.fr"
              className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Mot de passe temporaire *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
          )}

          {/* Role selection radio group */}
          <div>
            <label className="block text-[11px] text-neutral-300 font-medium mb-1.5">
              Rôle et niveau de privilège
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  selectedRole === "ROLE_ACCOUNT_ADMIN"
                    ? "bg-[#C9A96B]/10 border-[#C9A96B]/60 text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="ROLE_ACCOUNT_ADMIN"
                  checked={selectedRole === "ROLE_ACCOUNT_ADMIN"}
                  onChange={() => setSelectedRole("ROLE_ACCOUNT_ADMIN")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Admin du compte / Propriétaire</span>
                    <Crown className="w-3.5 h-3.5 text-[#DFCA9F] fill-[#DFCA9F]" />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Accès illimité à toutes les propriétés, gestion des tags et des membres.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  selectedRole === "ROLE_PROPERTY_ADMIN"
                    ? "bg-[#C9A96B]/10 border-[#C9A96B]/60 text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="ROLE_PROPERTY_ADMIN"
                  checked={selectedRole === "ROLE_PROPERTY_ADMIN"}
                  onChange={() => setSelectedRole("ROLE_PROPERTY_ADMIN")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-semibold text-white">Admin de propriété / Co-hôte</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Gère les zones, le Wi-Fi et les tags sur les chalets assignés.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  selectedRole === "ROLE_USER"
                    ? "bg-[#C9A96B]/10 border-[#C9A96B]/60 text-white"
                    : "bg-[#1C1C22] border-white/[0.06] text-neutral-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="ROLE_USER"
                  checked={selectedRole === "ROLE_USER"}
                  onChange={() => setSelectedRole("ROLE_USER")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-semibold text-white">Simple utilisateur / Prestataire</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Consultation des guides, contact et signalement d'incidents (Ménage, Maintenance).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Property assignment (only if not full account admin) */}
          {selectedRole !== "ROLE_ACCOUNT_ADMIN" && (
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1.5">
                Propriétés assignées
              </label>
              {properties.length === 0 ? (
                <p className="text-[11px] text-neutral-500 italic">
                  Aucune propriété disponible.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {properties.map((p) => {
                    const isChecked =
                      selectedPropertyIris.includes(p["@id"]) ||
                      selectedPropertyIris.includes(String(p.id));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProperty(p["@id"])}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isChecked
                            ? "bg-[#252530] border-[#C9A96B]/50 text-white"
                            : "bg-[#1C1C22] border-white/[0.06] text-neutral-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-[#DFCA9F] shrink-0" />
                          <span className="text-xs truncate">{p.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? "bg-[#C9A96B] border-[#C9A96B] text-neutral-950"
                              : "border-neutral-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !email.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFCA9F] to-[#C9A96B] text-neutral-950 font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : editingUser ? "Mettre à jour" : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

