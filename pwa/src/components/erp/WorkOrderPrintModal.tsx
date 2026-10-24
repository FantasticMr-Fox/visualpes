"use client";

import React from "react";
import type { Order } from "@/types/erp";

interface WorkOrderPrintModalProps {
  order: Order | null;
  onClose: () => void;
  onSimulateScan: (code: string) => void;
}

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "1/4 — En attente",
  processing: "2/4 — En fabrication",
  quality_check: "3/4 — Contrôle & Encodage NFC",
  completed: "4/4 — Terminé",
};

/**
 * Table officielle ISO/IEC 15417 (Code 128) : chaque entrée (0..105) fait 11 modules
 * (1 = barre noire, 0 = espace blanc), et le symbole STOP (106) fait 13 modules.
 */
const CODE128_PATTERNS: readonly string[] = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];

function encodeCode128B(text: string): string {
  const startCodeB = 104;
  let checksum = startCodeB;
  const parts: string[] = [CODE128_PATTERNS[startCodeB]];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const val = code >= 32 && code <= 126 ? code - 32 : 0;
    checksum += val * (i + 1);
    parts.push(CODE128_PATTERNS[val]);
  }

  const checkSymbol = checksum % 103;
  parts.push(CODE128_PATTERNS[checkSymbol]);
  parts.push(CODE128_PATTERNS[106]); // STOP
  return parts.join("");
}

export function Code128Barcode({
  value,
  height = 56,
  compact = false,
}: {
  value: string;
  height?: number;
  compact?: boolean;
}) {
  const bits = encodeCode128B(value);
  const quietZone = 10;
  const totalModules = bits.length + quietZone * 2;

  return (
    <div className="inline-flex flex-col items-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black shadow-xs">
      <svg
        viewBox={`0 0 ${totalModules} ${height}`}
        className={compact ? "h-10 w-44" : "h-16 w-64"}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Code-barres ${value}`}
      >
        <rect x="0" y="0" width={totalModules} height={height} fill="#ffffff" />
        {Array.from(bits).map((bit, idx) =>
          bit === "1" ? (
            <rect
              key={idx}
              x={quietZone + idx}
              y={0}
              width={1}
              height={height}
              fill="#000000"
            />
          ) : null,
        )}
      </svg>
      <span className="mt-1 font-mono text-xs font-bold tracking-widest text-neutral-900">
        {value}
      </span>
    </div>
  );
}

export function formatOrderBarcode(orderId: number): string {
  return `CMD${String(orderId).padStart(4, "0")}`;
}

const AZERTY_TOP_ROW_DIGITS: Record<string, string> = {
  "&": "1",
  "é": "2",
  '"': "3",
  "'": "4",
  "(": "5",
  "-": "6",
  "è": "7",
  "_": "8",
  "ç": "9",
  "à": "0",
};

/**
 * Extrait l'ID de commande depuis une chaîne scannée par douchette USB
 * (compatible QWERTY et AZERTY sans Verr. Maj.).
 */
export function parseScannedOrderId(raw: string): number | null {
  const directDigits = raw.replace(/\D/g, "");
  if (directDigits.length > 0) {
    const parsed = parseInt(directDigits, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const azertyConverted = Array.from(raw)
    .map((ch) => AZERTY_TOP_ROW_DIGITS[ch] ?? "")
    .join("");
  if (azertyConverted.length > 0) {
    const parsed = parseInt(azertyConverted, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function WorkOrderPrintModal({
  order,
  onClose,
  onSimulateScan,
}: WorkOrderPrintModalProps) {
  if (!order) return null;

  const isStock = Boolean(order.isStockOrder);
  const barcodeValue = formatOrderBarcode(order.id);
  const accountObj =
    typeof order.account === "object" && order.account !== null ? order.account : null;
  const items = order.orderItems ?? [];
  const totalSupports =
    items.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 print:static print:block print:bg-white print:p-0">
      <div className="my-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border border-neutral-700 bg-white p-6 text-neutral-900 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-4 print:shadow-none">
        {/* Barre d'actions écran (masquée à l'impression) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-neutral-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
              BON D&apos;ATELIER
            </span>
            <span className="text-xs text-neutral-500">
              Scannez le code-barres à la douchette USB (sur écran ou sur papier) pour avancer la fiche
            </span>
          </div>

          <div className="flex items-center gap-2">
            {order.status !== "completed" && (
              <button
                type="button"
                onClick={() => onSimulateScan(barcodeValue)}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
              >
                Simuler scan douchette ({barcodeValue})
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              Imprimer le bon
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Fermer ✕
            </button>
          </div>
        </div>

        {/* EN-TÊTE DU BON DE FABRICATION + CODE-BARRES */}
        <div className="flex flex-col justify-between gap-4 border-b-2 border-neutral-900 pb-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-neutral-900 bg-neutral-900 font-mono text-sm font-black text-white">
                VA
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900">
                  Bon de Fabrication Atelier
                </h1>
                <p className="text-xs text-neutral-600">
                  VisuAlpes — Supports connectés NFC & Impression 3D / Bois / Ciment
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-1 font-mono text-lg font-black text-white">
                CMD #{order.id}
              </span>
              <span
                className={`rounded border px-2.5 py-1 text-xs font-bold uppercase ${
                  isStock
                    ? "border-orange-600 bg-orange-100 text-orange-900"
                    : "border-neutral-400 bg-neutral-100 text-neutral-800"
                }`}
              >
                {isStock ? "Réappro Stock Atelier (Interne)" : "Commande Client"}
              </span>
              <span className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                Étape : {STATUS_LABELS[order.status]}
              </span>
            </div>

            <p className="mt-2 text-xs text-neutral-600">
              Date d&apos;émission :{" "}
              <strong>
                {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
          </div>

          {/* Bloc Code-Barres 1D (Code 128B) */}
          <div className="flex flex-col items-center sm:items-end">
            <Code128Barcode value={barcodeValue} height={64} />
            <span className="mt-1 text-[10px] font-medium text-neutral-500">
              Code 128B • Scan douchette USB = Étape suivante
            </span>
          </div>
        </div>

        {/* BLOC CLIENT / DESTINATION */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {isStock ? "Affectation Interne Atelier" : "Client Destinataire"}
            </div>
            {isStock ? (
              <div className="mt-1">
                <div className="text-base font-bold text-neutral-900">
                  Stock Atelier VisuAlpes
                </div>
                <div className="text-xs text-neutral-700">
                  Composant cible :{" "}
                  <strong className="font-mono">
                    {order.targetStockItem?.name ?? "Composant"} ({order.targetStockItem?.code})
                  </strong>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <div className="text-base font-bold text-neutral-900">
                  {accountObj?.name ?? "Client rattaché"}
                </div>
                <div className="text-xs text-neutral-600">
                  Typologie compte :{" "}
                  <strong className="font-mono">{accountObj?.type ?? "Standard"}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Volume & Mouvement de Stock
            </div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {totalSupports} unité{totalSupports > 1 ? "s" : ""} à fabriquer
            </div>
            <div className="text-xs text-neutral-600">
              {isStock ? (
                order.stockCredited ? (
                  <span>✓ Stock déjà crédité (+{totalSupports} pcs)</span>
                ) : (
                  <span>→ Créditera automatiquement le stock de +{totalSupports} pcs à l&apos;étape « Terminé »</span>
                )
              ) : order.stockDeducted ? (
                <span>✓ Composants de base déjà déduits du stock atelier</span>
              ) : (
                <span>→ Déduira {totalSupports} TPU + {totalSupports} ciment + {totalSupports} bois au passage en fabrication</span>
              )}
            </div>
          </div>
        </div>

        {/* NOTES ATELIER / GRAVURE & SUIVI EXPÉDITION */}
        {(order.workshopNotes || order.trackingNumber) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {order.workshopNotes && (
              <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Consignes Atelier & Gravure
                </div>
                <p className="mt-1 whitespace-pre-line font-medium text-neutral-900">
                  {order.workshopNotes}
                </p>
              </div>
            )}
            {order.trackingNumber && (
              <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Suivi Expédition / Remise
                </div>
                <p className="mt-1 font-mono font-bold text-neutral-900">
                  {order.trackingNumber}
                </p>
              </div>
            )}
          </div>
        )}

        {/* LIGNES DE FABRICATION DÉTAILLÉES */}
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
            Détail des articles à produire
          </h2>
          <table className="w-full border-collapse rounded-lg border border-neutral-300 text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-100 text-[11px] font-bold uppercase text-neutral-700">
                <th className="px-3 py-2">Réf.</th>
                <th className="px-3 py-2">Désignation</th>
                <th className="px-3 py-2 text-center">Quantité</th>
                <th className="px-3 py-2 text-center">Pointage Atelier</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item["@id"] ?? idx} className="border-b border-neutral-200">
                    <td className="px-3 py-2.5 font-mono text-neutral-600">
                      L{idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-neutral-900">
                      {item.productName}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm font-bold text-neutral-900">
                      × {item.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-base">
                      ☐ OK
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-2.5 font-mono text-neutral-600">L1</td>
                  <td className="px-3 py-2.5 font-semibold text-neutral-900">
                    Support Comptoir NFC Bois (Standard)
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-sm font-bold text-neutral-900">
                    × 1
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-base">☐ OK</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* NOMENCLATURE MATIÈRES PREMIÈRES (POUR COMMANDES CLIENTS) */}
        {!isStock && (
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
              Matières premières à prélever en stock (1 kit / support)
            </h2>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-neutral-300 px-3 py-2">
                <div>
                  <div className="font-bold text-neutral-900">Patin TPU</div>
                  <div className="font-mono text-[10px] text-neutral-500">patin_tpu</div>
                </div>
                <span className="font-mono text-sm font-black text-neutral-900">
                  {totalSupports} pcs ☐
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-300 px-3 py-2">
                <div>
                  <div className="font-bold text-neutral-900">Socle ciment</div>
                  <div className="font-mono text-[10px] text-neutral-500">socle_ciment</div>
                </div>
                <span className="font-mono text-sm font-black text-neutral-900">
                  {totalSupports} pcs ☐
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-300 px-3 py-2">
                <div>
                  <div className="font-bold text-neutral-900">Plaque bois</div>
                  <div className="font-mono text-[10px] text-neutral-500">plaque_bois</div>
                </div>
                <span className="font-mono text-sm font-black text-neutral-900">
                  {totalSupports} pcs ☐
                </span>
              </div>
            </div>
          </div>
        )}

        {/* GAMME DE FABRICATION & CONTRÔLE QUALITÉ */}
        <div className="rounded-xl border border-neutral-300 p-3.5">
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
            Suivi des étapes & Validation Douchette USB
          </h2>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded border border-neutral-200 p-2">
              <span className="font-mono text-sm">☐</span>
              <div>
                <div className="font-bold text-neutral-900">1. Lancement Fabrication</div>
                <div className="text-[11px] text-neutral-600">
                  Scan n°1 → passe en « En fabrication » et déduit le stock
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded border border-neutral-200 p-2">
              <span className="font-mono text-sm">☐</span>
              <div>
                <div className="font-bold text-neutral-900">2. Contrôle & Encodage NFC</div>
                <div className="text-[11px] text-neutral-600">
                  Scan n°2 → passe en « Contrôle & Encodage »
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded border border-neutral-200 p-2">
              <span className="font-mono text-sm">☐</span>
              <div>
                <div className="font-bold text-neutral-900">3. Expédition / Mise en stock</div>
                <div className="text-[11px] text-neutral-600">
                  Scan n°3 → passe en « Terminé »
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
