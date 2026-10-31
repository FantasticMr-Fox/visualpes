"use client";

import React, { useState } from "react";
import {
  Wifi,
  FileText,
  Smartphone,
  BarChart3,
  Settings,
  ChevronRight,
  Radio,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { ConciergeNavState } from "./types";
import type { PropertyItem, ZoneItem } from "@/types/erp";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";

interface ConciergeTagDetailViewProps {
  property: PropertyItem;
  zone: ZoneItem;
  tagId: number;
  onNavigate: (state: ConciergeNavState) => void;
  onRevealWifi: (property: PropertyItem) => void;
}

export function ConciergeTagDetailView({
  property,
  zone,
  tagId,
  onRevealWifi,
}: ConciergeTagDetailViewProps) {
  const [activeModal, setActiveModal] = useState<"content" | "preview" | "stats" | "config" | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const tagTitle = "Tag #01";
  const tagSubtitle = "Wi-Fi";
  const shortUid = `va-${property.id || 101}-01`;
  const readsCount = 124;

  const handleTestTag = () => {
    setTestSuccess(true);
    setTimeout(() => {
      setTestSuccess(false);
    }, 4000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wifiSSID = property.wifiSSID || "LesCimes_Chamonix_5G";
  const wifiPass = property.wifiPassword || "AlpsLuxury2026!";
  const wifiPayload = `WIFI:T:WPA;S:${wifiSSID};P:${wifiPass};;`;

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
          {tagTitle}
        </h1>
        <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
          {tagSubtitle}
        </p>
      </div>

      {/* Central Hero: Large Glowing Wi-Fi Circle with (● Actif) badge matching Screen 5 */}
      <div className="flex items-center justify-center gap-4 py-3">
        <div className="relative flex items-center justify-center group cursor-pointer">
          {/* Glowing teal/cyan halo with gentle pulse */}
          <div className="absolute w-28 h-28 rounded-full bg-[#14B8A6]/25 blur-xl animate-pulse" />

          {/* Outer concentric ring */}
          <div className="w-22 h-22 rounded-full border border-[#115E59]/80 bg-[#042F2E]/60 flex items-center justify-center shadow-[0_0_35px_rgba(20,184,166,0.35)] transition-all duration-300 group-hover:shadow-[0_0_45px_rgba(20,184,166,0.6)] group-hover:scale-105">
            {/* Middle ring */}
            <div className="w-16 h-16 rounded-full border border-[#2DD4BF]/50 bg-[#092224] flex items-center justify-center transition-transform duration-300">
              {/* Inner core Wi-Fi icon */}
              <Wifi className="w-8 h-8 text-[#2DD4BF] drop-shadow-[0_0_10px_rgba(45,212,191,0.7)] stroke-[2.2] transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>
        </div>

        {/* Right Status Pill Badge: ● Actif */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A261C] border border-[#14533C] shadow-sm transition-all duration-200 hover:border-[#10B981]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981] animate-pulse" />
          <span className="text-[11px] font-medium text-[#34D399]">
            Actif
          </span>
        </div>
      </div>

      {/* 4 Action Menu Rows matching Screen 5 */}
      <div className="space-y-2 pt-1">
        {/* 1. Contenu */}
        <button
          type="button"
          onClick={() => setActiveModal("content")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200">
                Contenu
              </p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200">
                Informations Wi-Fi
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200" />
        </button>

        {/* 2. Aperçu */}
        <button
          type="button"
          onClick={() => setActiveModal("preview")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200">
                Aperçu
              </p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200">
                Voir la page client
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200" />
        </button>

        {/* 3. Statistiques */}
        <button
          type="button"
          onClick={() => setActiveModal("stats")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200">
                Statistiques
              </p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200">
                {readsCount} lectures ce mois-ci
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200" />
        </button>

        {/* 4. Paramètres du tag */}
        <button
          type="button"
          onClick={() => setActiveModal("config")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200">
                Paramètres du tag
              </p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200">
                ID, sécurité, redirection...
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200" />
        </button>
      </div>

      {/* Prominent Bottom Button matching Screen 5: ((·)) Tester le tag */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTestTag}
          className="w-full py-3 px-4 rounded-xl border border-[#DFB277] bg-[#1A1814]/70 hover:bg-[#DFB277]/15 hover:border-[#F3C075] hover:shadow-[0_0_20px_rgba(223,178,119,0.3)] text-[#DFB277] hover:text-[#F3C075] font-medium text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-xs"
        >
          <Radio className="w-4 h-4 stroke-[2]" />
          <span>Tester le tag</span>
        </button>
      </div>

      {/* Test Feedback Toast */}
      {testSuccess && (
        <div className="p-3 rounded-xl bg-[#0A261C] border border-[#14533C] flex items-center gap-2.5 text-[11px] text-[#34D399] animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span>Simulation réussie : le tag renvoie vers les identifiants Wi-Fi.</span>
        </div>
      )}

      {/* Modal: Contenu Wi-Fi */}
      {activeModal === "content" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#16161A] border border-white/[0.1] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-xs font-semibold text-white">Identifiants Wi-Fi</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[10px] text-[#8E8E93] hover:text-white"
              >
                Fermer
              </button>
            </div>

            <div className="flex justify-center py-1">
              <WifiQrCodeSvg value={wifiPayload} size={130} />
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-[#202026] flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[#8E8E93] uppercase">SSID</p>
                  <p className="font-semibold text-white">{wifiSSID}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(wifiSSID)}
                  className="p-1 text-[#8E8E93] hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 rounded-lg bg-[#202026] flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[#8E8E93] uppercase">WPA3 Clé</p>
                  <p className="font-mono text-[#DFB277]">{wifiPass}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(wifiPass)}
                  className="p-1 text-[#8E8E93] hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {copied && (
              <p className="text-center text-[10px] text-[#34D399]">
                Copié dans le presse-papier !
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Aperçu client */}
      {activeModal === "preview" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#16161A] border border-white/[0.1] p-4 shadow-2xl space-y-3 text-center">
            <h3 className="text-xs font-semibold text-white">Aperçu Client</h3>
            <p className="text-[11px] text-[#8E8E93]">
              Page d'accueil mobile affichée lors du scan NFC par vos résidents dans le {zone.name}.
            </p>
            <a
              href={`/g/${shortUid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DFB277] text-[#0A0A0C] font-semibold text-xs mx-auto"
            >
              <span>Tester la page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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

      {/* Modal: Statistiques */}
      {activeModal === "stats" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#16161A] border border-white/[0.1] p-4 shadow-2xl space-y-3 text-center">
            <h3 className="text-xs font-semibold text-white">Statistiques du Tag</h3>
            <div className="p-3 rounded-xl bg-[#202026]">
              <p className="text-2xl font-bold text-white">{readsCount}</p>
              <p className="text-[10px] text-[#8E8E93] uppercase mt-0.5">Lectures ce mois-ci</p>
            </div>
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

      {/* Modal: Paramètres */}
      {activeModal === "config" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#16161A] border border-white/[0.1] p-4 shadow-2xl space-y-3">
            <h3 className="text-xs font-semibold text-white">Paramètres Techniques</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-[#202026]">
                <p className="text-[9px] text-[#8E8E93] uppercase">UID Tag</p>
                <p className="font-mono text-white">{shortUid}</p>
              </div>
              <div className="p-2 rounded-lg bg-[#202026]">
                <p className="text-[9px] text-[#8E8E93] uppercase">Puce</p>
                <p className="text-[#34D399]">NXP NTAG424 DNA</p>
              </div>
            </div>
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
