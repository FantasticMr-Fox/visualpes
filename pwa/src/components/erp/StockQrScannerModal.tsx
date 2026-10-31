"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { StockItem, StockMovementType } from "@/types/erp";
import {
  Camera,
  QrCode,
  X,
  Volume2,
  VolumeX,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Zap,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface StockQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  onProcessMovement: (payload: {
    stockItem: StockItem;
    type: StockMovementType;
    quantity: number;
    reference?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}

interface ScanLogEntry {
  id: string;
  timestamp: string;
  itemCode: string;
  itemName: string;
  type: StockMovementType;
  delta: number;
  newQuantity: number;
  batchRef?: string;
  status: "success" | "warning" | "error";
  message: string;
}

// Audio synthesizer via Web Audio API (aucun fichier externe requis)
function playBeep(type: "in" | "out" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "in") {
      // Double bip aigu montant (succès entrée stock)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "out") {
      // Bip descendant (sortie stock / prélèvement atelier)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(440, now + 0.09); // A4
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      // Bip grave d'avertissement / erreur
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.debug("Web Audio non initialisé :", err);
  }
}

export function StockQrScannerModal({
  isOpen,
  onClose,
  stockItems,
  onProcessMovement,
}: StockQrScannerModalProps) {
  const [mode, setMode] = useState<StockMovementType>("in"); // "in" = mise en stock, "out" = sortie atelier
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [sessionLogs, setSessionLogs] = useState<ScanLogEntry[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{
    status: "success" | "warning" | "error";
    text: string;
    subtext: string;
  } | null>(null);

  const [manualCode, setManualCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>("");
  const scanBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Analyse et exécution d'un code flashé (depuis caméra, douchette USB ou saisie)
  const handleScannedCode = useCallback(
    async (rawCode: string) => {
      const trimmed = rawCode.trim();
      if (!trimmed || isProcessing) return;

      const now = Date.now();
      // Anti-rebond : éviter de rescanner le même code 2 fois en moins de 1.5s
      if (
        trimmed === lastScannedCodeRef.current &&
        now - lastScanTimeRef.current < 1500
      ) {
        return;
      }
      lastScanTimeRef.current = now;
      lastScannedCodeRef.current = trimmed;

      setIsProcessing(true);

      try {
        let itemCode = trimmed;
        let batchRef = "";

        // Format standard VisuAlpes : VA-STOCK:{code}:{batchRef}:{index}
        if (trimmed.startsWith("VA-STOCK:")) {
          const parts = trimmed.split(":");
          itemCode = parts[1] || "";
          batchRef = parts[2] || "";
        }

        // Trouver le StockItem correspondant (par code ou nom)
        const found = stockItems.find(
          (si) =>
            si.code.toLowerCase() === itemCode.toLowerCase() ||
            si.name.toLowerCase() === itemCode.toLowerCase(),
        );

        if (!found) {
          if (soundEnabled) playBeep("error");
          setLastFeedback({
            status: "error",
            text: "Article non reconnu",
            subtext: `Code flashé : « ${trimmed} » introuvable dans l'inventaire.`,
          });
          return;
        }

        // Vérification de stock négatif pour le mode sortie
        if (mode === "out" && found.quantity <= 0) {
          if (soundEnabled) playBeep("error");
          setLastFeedback({
            status: "warning",
            text: "Stock déjà à zéro !",
            subtext: `Impossible de prélever « ${found.name} » car le stock physique est déjà à 0 ${found.unit}.`,
          });
          return;
        }

        // Exécuter le mouvement de stock
        await onProcessMovement({
          stockItem: found,
          type: mode,
          quantity: 1,
          reference: batchRef ? `Scan QR (${batchRef})` : "Scan QR Physique",
          notes:
            mode === "in"
              ? "Mise en stock physique en atelier"
              : "Prélèvement physique atelier pour fabrication / gravure",
        });

        // Calcul nouvelle quantité estimée
        const delta = mode === "in" ? 1 : -1;
        const newQty = Math.max(0, found.quantity + delta);

        if (soundEnabled) playBeep(mode === "in" ? "in" : "out");

        const feedbackText =
          mode === "in"
            ? `+1 ${found.name} mis en stock`
            : `-1 ${found.name} sorti du stock`;

        const subtext =
          mode === "in"
            ? `Nouveau stock physique : ${newQty} ${found.unit}`
            : newQty <= found.alertThreshold
            ? `Stock restant : ${newQty} ${found.unit} ⚠️ (Sous seuil d'alerte !)`
            : `Stock restant : ${newQty} ${found.unit}`;

        setLastFeedback({
          status: newQty <= found.alertThreshold && mode === "out" ? "warning" : "success",
          text: feedbackText,
          subtext,
        });

        // Journaliser dans l'historique de la session
        setSessionLogs((prev) => [
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString("fr-FR"),
            itemCode: found.code,
            itemName: found.name,
            type: mode,
            delta,
            newQuantity: newQty,
            batchRef: batchRef || undefined,
            status: "success",
            message: feedbackText,
          },
          ...prev.slice(0, 24), // Conserver les 25 derniers scans
        ]);
      } catch (err) {
        console.error("Erreur traitement scan stock :", err);
        if (soundEnabled) playBeep("error");
        setLastFeedback({
          status: "error",
          text: "Erreur de mise à jour",
          subtext: "Impossible d'enregistrer le mouvement de stock.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, mode, onProcessMovement, soundEnabled, stockItems],
  );

  // ÉCOUTEUR CLAVIER POUR DOUCHETTE USB (Lecteur Code-barres / QR Code physique)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est en train de taper dans un champ de formulaire spécifique
      const target = e.target as HTMLElement;
      if (target && target.tagName === "INPUT" && target.id !== "quick-manual-input") {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 60) {
        scanBufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const code = scanBufferRef.current.trim();
        if (code.length > 0) {
          void handleScannedCode(code);
        }
        scanBufferRef.current = "";
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleScannedCode]);

  // INITIALISATION DU FLUX VIDÉO CAMÉRA (HTML5-QRCODE)
  useEffect(() => {
    if (!isOpen || !cameraActive) {
      if (html5QrCodeRef.current) {
        void html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          })
          .catch(() => {});
      }
      return;
    }

    const qrElementId = "stock-qr-video-reader";
    const html5QrCode = new Html5Qrcode(qrElementId);
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          void handleScannedCode(decodedText);
        },
        () => {},
      )
      .catch((err) => {
        console.warn("Erreur démarrage caméra QR :", err);
        setCameraActive(false);
      });

    return () => {
      if (html5QrCodeRef.current) {
        void html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          })
          .catch(() => {});
      }
    };
  }, [isOpen, cameraActive, handleScannedCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151517] p-6 shadow-2xl">
        {/* EN-TÊTE DU POSTE DE SCAN */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all ${
                mode === "in"
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
              }`}
            >
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F7F5EF]">
                  Poste de Scan Stock Atelier
                </h2>
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-[#8C8379]">
                  Douchette USB &amp; Caméra
                </span>
              </div>
              <p className="text-xs text-[#8C8379]">
                Flashez les étiquettes QR Code pour la mise en stock physique et les sorties atelier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="rounded-lg p-2 text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF] transition-all"
              title={soundEnabled ? "Couper le son" : "Activer le bip sonore"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#C9A96B]" />
              ) : (
                <VolumeX className="h-4 w-4 text-neutral-500" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 1. SÉLECTEUR DE MODE OPÉRATOIRE : ENTRÉE VS SORTIE */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("in")}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
              mode === "in"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg"
                : "border-white/10 bg-[#111113] text-[#8C8379] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
              <span>Mise en Stock Physique</span>
            </div>
            <span className="text-[11px] text-emerald-300/80">
              Réception fournisseur ou fin d&apos;ébauche → Incrémente le stock (+1)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("out")}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
              mode === "out"
                ? "border-rose-500 bg-rose-500/15 text-rose-200 ring-2 ring-rose-500/40 shadow-lg"
                : "border-white/10 bg-[#111113] text-[#8C8379] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <ArrowUpCircle className="h-5 w-5 text-rose-400" />
              <span>Sortie de Stock Atelier</span>
            </div>
            <span className="text-[11px] text-rose-300/80">
              Prélèvement pour gravure / personnalisation → Décrémente le stock (-1)
            </span>
          </button>
        </div>

        {/* 2. ZONE DE FEEDBACK INSTANTANÉ SUITE AU DERNIER SCAN */}
        {lastFeedback && (
          <div
            className={`mt-4 rounded-xl border p-4 transition-all duration-300 animate-fadeIn ${
              lastFeedback.status === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : lastFeedback.status === "warning"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                : "border-rose-500/50 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {lastFeedback.status === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-extrabold text-sm leading-tight">
                  {lastFeedback.text}
                </h4>
                <p className="mt-0.5 text-xs opacity-90">{lastFeedback.subtext}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. CAMÉRA SCANNER & INSTRUCTIONS */}
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#101012] p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#DFCA9F]">
              <Zap className="h-4 w-4 text-[#C9A96B]" />
              <span>Scanner en direct</span>
            </div>
            <button
              type="button"
              onClick={() => setCameraActive((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                cameraActive
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{cameraActive ? "Désactiver la caméra" : "Activer la caméra"}</span>
            </button>
          </div>

          {/* VISEUR CAMÉRA SI ACTIVÉE */}
          {cameraActive ? (
            <div className="mt-3 flex flex-col items-center">
              <div
                id="stock-qr-video-reader"
                className="w-full max-w-xs overflow-hidden rounded-xl border-2 border-[#C9A96B]/50 bg-black shadow-lg"
              />
              <span className="mt-2 text-[11px] text-[#8C8379]">
                Placez l&apos;étiquette QR Code devant la lentille
              </span>
            </div>
          ) : (
            <div className="mt-3 py-4 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-[#C9A96B]">
                <QrCode className="h-6 w-6" />
              </div>
              <p className="mt-2 text-xs text-[#F7F5EF] font-medium">
                La douchette USB atelier est active en continu
              </p>
              <p className="text-[11px] text-[#8C8379]">
                Flachez directement l&apos;étiquette adhésive avec votre lecteur portable.
              </p>
            </div>
          )}

          {/* SIMULATEUR / SAISIE RAPIDE POUR TEST */}
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  void handleScannedCode(manualCode);
                  setManualCode("");
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                id="quick-manual-input"
                type="text"
                placeholder="Tester en tapant ou collant un code (ex: bois_meleze_brut)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#1A1A1E] px-3 py-2 font-mono text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || isProcessing}
                className="btn-primary-gold rounded-xl px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Flasher
              </button>
            </form>

            {/* RACCOURCIS DE TEST RAPIDE */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[#8C8379]">Exemples rapides :</span>
              {stockItems.slice(0, 4).map((si) => (
                <button
                  key={si.id}
                  type="button"
                  onClick={() => void handleScannedCode(`VA-STOCK:${si.code}:TEST:1`)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-[#DFCA9F] hover:bg-white/[0.08]"
                >
                  {si.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. HISTORIQUE DES FLASHAGES DE LA SESSION */}
        {sessionLogs.length > 0 && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#101012] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8C8379] pb-2 border-b border-white/[0.06]">
              <History className="h-3.5 w-3.5" />
              <span>Historique de la session ({sessionLogs.length})</span>
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 text-xs pr-1">
              {sessionLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-[#18181C] px-3 py-2 text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        log.type === "in"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {log.type === "in" ? "+1 ENTRÉE" : "-1 SORTIE"}
                    </span>
                    <span className="font-semibold text-[#F7F5EF] truncate">
                      {log.itemName}
                    </span>
                    {log.batchRef && (
                      <span className="font-mono text-[#8C8379] text-[10px]">
                        [{log.batchRef}]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[#8C8379]">
                    <span className="text-[#DFCA9F] font-bold">
                      Stock: {log.newQuantity}
                    </span>
                    <span>• {log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-5 flex justify-end border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary-gold rounded-xl px-5 py-2 text-xs font-semibold uppercase tracking-wider shadow-md"
          >
            Fermer le scanner
          </button>
        </div>
      </div>
    </div>
  );
}

