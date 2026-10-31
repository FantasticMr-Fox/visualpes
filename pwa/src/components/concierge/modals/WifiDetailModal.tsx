"use client";

import React, { useState } from "react";
import { X, Wifi, Copy, Check, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import type { PropertyItem } from "@/types/erp";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";

interface WifiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyItem;
  onUpdateWifi: (data: {
    wifiSSID: string;
    wifiPassword?: string;
    wifiAccessCode?: string;
  }) => Promise<void>;
  revealedPassword?: string | null;
}

export function WifiDetailModal({
  isOpen,
  onClose,
  property,
  onUpdateWifi,
  revealedPassword,
}: WifiDetailModalProps) {
  const [ssid, setSsid] = useState(property.wifiSSID || "Chalet_VisuAlpes_5G");
  const [password, setPassword] = useState(
    revealedPassword || property.wifiPassword || "AlpsLuxury2026!",
  );
  const [accessCode, setAccessCode] = useState(property.wifiAccessCode || "");
  const [showPass, setShowPass] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const activePassword = revealedPassword || password;
  const wifiPayload = `WIFI:T:WPA;S:${ssid};P:${activePassword};;`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateWifi({
        wifiSSID: ssid,
        wifiPassword: password,
        wifiAccessCode: accessCode || undefined,
      });
      setIsEditing(false);
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
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Connexion Wi-Fi</h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">
                {property.name}
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

        {!isEditing ? (
          <div className="space-y-4">
            {/* QR Code generator */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="p-2.5 rounded-2xl bg-white shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                <WifiQrCodeSvg value={wifiPayload} size={150} />
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                Scannez avec un appareil photo pour connexion instantanée
              </p>
            </div>

            {/* Credentials details */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#1C1C22] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase">Nom du réseau (SSID)</p>
                  <p className="font-semibold text-white mt-0.5">{ssid}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(ssid, "ssid")}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
                  title="Copier le nom"
                >
                  {copied === "ssid" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#1C1C22] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase">Clé de sécurité (WPA3)</p>
                  <p className="font-mono text-[#DFCA9F] font-semibold mt-0.5">
                    {showPass ? activePassword : "••••••••••••••••"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
                    title={showPass ? "Masquer" : "Afficher"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activePassword, "pass")}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
                    title="Copier la clé"
                  >
                    {copied === "pass" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl bg-[#22222A] hover:bg-[#2C2C36] text-xs font-semibold text-neutral-200 transition-colors"
              >
                Modifier les identifiants
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Nom du réseau Wi-Fi (SSID) *
              </label>
              <input
                type="text"
                required
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Nouveau mot de passe Wi-Fi
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                Code d'accès voyageur (optionnel)
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="ex: 1234"
                className="w-full bg-[#1C1C22] border border-white/[0.08] focus:border-[#C9A96B]/60 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFCA9F] to-[#C9A96B] text-neutral-950 font-semibold"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

