"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { StockItem, SupplierOrder } from "@/types/erp";
import { Printer, X, Sliders, Tag, LayoutGrid, FileText } from "lucide-react";
import { VisuAlpesMark } from "@/components/common/VisuAlpesLogo";

export interface StockQrPrintTarget {
  stockItem?: StockItem;
  supplierOrder?: SupplierOrder;
  defaultQuantity?: number;
}

interface StockQrPrintModalProps {
  target: StockQrPrintTarget | null;
  stockItems: StockItem[];
  onClose: () => void;
}

interface LabelData {
  itemCode: string;
  itemName: string;
  itemType: "raw_material" | "pre_produced";
  unit: string;
  batchRef: string;
  serialNumber: number;
  totalInBatch: number;
  dateStr: string;
  qrPayload: string;
  qrDataUrl: string;
}

export function StockQrPrintModal({
  target,
  stockItems,
  onClose,
}: StockQrPrintModalProps) {
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<"thermal" | "sheet">("thermal");
  const [printCount, setPrintCount] = useState<number>(1);

  useEffect(() => {
    if (!target) return;

    let isMounted = true;
    setLoading(true);

    const generateLabels = async () => {
      const generated: LabelData[] = [];
      const today = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      if (target.supplierOrder) {
        // Mode A : impression depuis un Bon de Commande Fournisseur reçu
        const order = target.supplierOrder;
        const batchRef = order.reference;

        for (const item of order.items || []) {
          // Retrouver le stockItem correspondant si lié
          const linkedStock = stockItems.find(
            (si) =>
              (typeof item.stockItem === "object" && item.stockItem?.["@id"] === si["@id"]) ||
              (typeof item.stockItem === "string" && item.stockItem === si["@id"]) ||
              si.name.toLowerCase() === item.productName.toLowerCase(),
          );

          const itemCode = linkedStock ? linkedStock.code : item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const itemType = linkedStock?.type || "raw_material";
          const qty = Math.min(Math.max(1, item.quantity), 100); // Plafond raisonnable pour le rendu initial

          for (let i = 1; i <= qty; i++) {
            const qrPayload = `VA-STOCK:${itemCode}:${batchRef}:${i}`;
            const qrDataUrl = await QRCode.toDataURL(qrPayload, {
              width: 250,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#ffffff",
              },
              errorCorrectionLevel: "M",
            });

            generated.push({
              itemCode,
              itemName: item.productName,
              itemType,
              unit: item.unit || "pcs",
              batchRef,
              serialNumber: i,
              totalInBatch: qty,
              dateStr: today,
              qrPayload,
              qrDataUrl,
            });
          }
        }
      } else if (target.stockItem) {
        // Mode B : impression depuis un composant de stock individuel
        const item = target.stockItem;
        const count = target.defaultQuantity || printCount || 1;
        const batchRef = `LOT-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}`;

        for (let i = 1; i <= count; i++) {
          const qrPayload = `VA-STOCK:${item.code}:${batchRef}:${i}`;
          const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            width: 250,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
            errorCorrectionLevel: "M",
          });

          generated.push({
            itemCode: item.code,
            itemName: item.name,
            itemType: item.type || "pre_produced",
            unit: item.unit,
            batchRef,
            serialNumber: i,
            totalInBatch: count,
            dateStr: today,
            qrPayload,
            qrDataUrl,
          });
        }
      }

      if (isMounted) {
        setLabels(generated);
        setLoading(false);
      }
    };

    void generateLabels();

    return () => {
      isMounted = false;
    };
  }, [target, stockItems, printCount]);

  if (!target) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleQtyChange = (newQty: number) => {
    const val = Math.max(1, Math.min(newQty, 50));
    setPrintCount(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      {/* BARRE D'ACTIONS MODALE (MASQUÉE À L'IMPRESSION) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex flex-wrap items-center gap-2.5">
        {/* SÉLECTEUR DE FORMAT D'IMPRESSION */}
        <div className="flex items-center rounded-xl border border-white/20 bg-neutral-900/90 p-1 text-xs text-neutral-300">
          <button
            type="button"
            onClick={() => setLayoutMode("thermal")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              layoutMode === "thermal"
                ? "bg-[#C9A96B] text-[#0E0E0E] font-bold"
                : "hover:text-white"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Rouleau Thermique</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("sheet")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              layoutMode === "sheet"
                ? "bg-[#C9A96B] text-[#0E0E0E] font-bold"
                : "hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Planche A4 (Grille)</span>
          </button>
        </div>

        {/* AJUSTEMENT NOMBRE D'ÉTIQUETTES (SI STOCK ITEM UNIQUE) */}
        {target.stockItem && (
          <div className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-300">
            <span>Nombre :</span>
            <input
              type="number"
              min="1"
              max="50"
              value={printCount}
              onChange={(e) => handleQtyChange(parseInt(e.target.value, 10) || 1)}
              className="w-12 rounded border border-white/20 bg-neutral-800 px-1.5 py-0.5 text-center font-mono font-bold text-white focus:outline-hidden"
            />
          </div>
        )}

        {/* BOUTON LANCER L'IMPRESSION */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-[#C9A96B] px-4 py-2.5 text-xs font-bold text-[#0E0E0E] shadow-xl hover:bg-[#DFCA9F] transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimer {labels.length} étiquette{labels.length > 1 ? "s" : ""}</span>
        </button>

        {/* FERMER */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 bg-neutral-900/90 p-2.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ZONE D'APERÇU & IMPRESSION */}
      <div className="my-12 w-full max-w-5xl rounded-2xl bg-neutral-900 p-6 text-white shadow-2xl border border-white/10 print:my-0 print:max-w-none print:rounded-none print:border-none print:bg-white print:p-0">
        <div className="print:hidden border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-[#C9A96B] font-semibold uppercase tracking-wider">
            <Tag className="h-4 w-4" />
            <span>Traçabilité Physique du Stock • Impression Étiquettes Adhésives</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-[#F7F5EF]">
            {target.supplierOrder
              ? `Étiquettes pour la commande ${target.supplierOrder.reference}`
              : `Étiquettes pour : ${target.stockItem?.name}`}
          </h2>
          <p className="text-xs text-[#8C8379]">
            Collez une étiquette sur chaque unité physique reçue. Flashez à la mise en stock physique et au prélèvement atelier.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#8C8379]">
            Génération des {labels.length || "…"} codes QR en cours…
          </div>
        ) : labels.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#8C8379]">
            Aucun article à étiqueter.
          </div>
        ) : (
          /* GRILLE D'ÉTIQUETTES CONFORME POUR FORMAT THERMIQUE OU PLANCHE A4 */
          <div
            className={
              layoutMode === "thermal"
                ? "flex flex-col gap-4 items-center print:block print:space-y-4"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3"
            }
          >
            {labels.map((lbl, idx) => (
              <div
                key={idx}
                className="relative flex items-center justify-between overflow-hidden rounded-xl border border-neutral-300 bg-white p-3 text-black shadow-md print:shadow-none print:border-black print:rounded-lg print:break-inside-avoid"
                style={{
                  width: layoutMode === "thermal" ? "320px" : "100%",
                  minHeight: "135px",
                }}
              >
                {/* PARTIE GAUCHE : CODE QR HAUTE RÉSOLUTION */}
                <div className="flex flex-col items-center shrink-0 pr-2 border-r border-neutral-200">
                  <img
                    src={lbl.qrDataUrl}
                    alt={`QR Code ${lbl.itemCode}`}
                    className="h-24 w-24 object-contain"
                  />
                  <span className="mt-0.5 font-mono text-[9px] font-bold text-neutral-800">
                    {lbl.itemCode}
                  </span>
                </div>

                {/* PARTIE DROITE : INFORMATIONS PRODUIT & LOT */}
                <div className="flex flex-col justify-between pl-3 flex-1 min-w-0 h-full py-0.5">
                  <div>
                    {/* MONOGRAMME VISUALPES */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <VisuAlpesMark className="h-3.5 w-3.5" fill="#191617" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-neutral-900">
                          VISUALPES
                        </span>
                      </div>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-neutral-700 border border-neutral-200">
                        #{lbl.serialNumber}/{lbl.totalInBatch}
                      </span>
                    </div>

                    {/* NOM DU PRODUIT */}
                    <h3 className="mt-1 font-extrabold text-xs text-neutral-950 leading-tight line-clamp-2">
                      {lbl.itemName}
                    </h3>
                  </div>

                  <div className="mt-2 space-y-0.5 pt-1 border-t border-neutral-200 text-[10px]">
                    <div className="flex justify-between font-mono text-neutral-600">
                      <span>Lot/BC :</span>
                      <strong className="text-neutral-900">{lbl.batchRef}</strong>
                    </div>
                    <div className="flex justify-between text-neutral-500 text-[9px]">
                      <span>Reçu le : {lbl.dateStr}</span>
                      <span className="uppercase font-semibold text-neutral-700">
                        {lbl.itemType === "raw_material" ? "Matière 1ère" : "Préproduit"}
                      </span>
                    </div>
                  </div>

                  {/* INSTRUCTION DE FLASH */}
                  <div className="mt-1 rounded bg-neutral-50 px-1 py-0.5 text-center text-[8px] font-semibold text-neutral-600 border border-neutral-200">
                    Flash Entrée (Stock) • Flash Sortie (Atelier)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

