"use client";

import React from "react";
import type { SupplierOrder } from "@/types/erp";
import { Printer, X } from "lucide-react";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";

interface SupplierOrderPrintModalProps {
  order: SupplierOrder | null;
  onClose: () => void;
}

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
  parts.push(CODE128_PATTERNS[106]);
  return parts.join("");
}

function Barcode({ value, height = 48 }: { value: string; height?: number }) {
  const bits = encodeCode128B(value);
  const quietZone = 10;
  const totalModules = bits.length + quietZone * 2;

  return (
    <div className="inline-flex flex-col items-center bg-white px-2 py-1 text-black">
      <svg
        viewBox={`0 0 ${totalModules} ${height}`}
        className="h-12 w-48"
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
      <span className="mt-1 font-mono text-[11px] font-bold tracking-widest text-neutral-800">
        *{value}*
      </span>
    </div>
  );
}

export function SupplierOrderPrintModal({
  order,
  onClose,
}: SupplierOrderPrintModalProps) {
  if (!order) return null;

  const supplier =
    typeof order.supplier === "object" && order.supplier !== null
      ? order.supplier
      : { name: String(order.supplier || "Fournisseur Externe"), contactName: null, email: null, phone: null, address: null };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedDelivery = order.expectedDeliveryDate
    ? new Date(order.expectedDeliveryDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Dès que possible";

  const totalHT = order.totalAmount ?? 0;
  const tva = +(totalHT * 0.2).toFixed(2);
  const totalTTC = +(totalHT + tva).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      {/* BARRE D'ACTIONS DU MODAL (MASQUÉE À L'IMPRESSION) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-[#C9A96B] px-4 py-2.5 text-xs font-bold text-[#0E0E0E] shadow-lg hover:bg-[#DFCA9F] transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimer le Bon de Commande (PDF)</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 bg-neutral-900/90 p-2.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* FEUILLE FORMAT A4 BLANCHE */}
      <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white p-8 text-neutral-900 shadow-2xl print:my-0 print:max-w-none print:rounded-none print:p-6 print:shadow-none">
        {/* EN-TÊTE OFFICIEL */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
          <div className="flex flex-col gap-2">
            <VisuAlpesLogo variant="light" className="h-8 w-auto" />
            <div className="text-xs text-neutral-600">
              150 Chemin des Taillées, 74400 Chamonix Mont-Blanc
              <br />
              SIRET: 912 345 678 00014 • TVA: FR 82 912345678
              <br />
              Email: appro@visualpes.fr • Tél: +33 (0)4 50 12 88 99
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Bon de Commande Fournisseur
            </span>
            <div className="mt-2 text-right">
              <span className="font-mono text-lg font-black tracking-tight text-neutral-950">
                {order.reference}
              </span>
              <div className="text-[11px] text-neutral-500">
                Date : <span className="font-semibold text-neutral-800">{formattedDate}</span>
              </div>
            </div>
            <div className="mt-2">
              <Barcode value={order.reference} />
            </div>
          </div>
        </div>

        {/* CADRES COORDONNÉES FOURNISSEUR & LIVRAISON */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* FOURNISSEUR */}
          <div className="rounded-xl border border-neutral-300 bg-neutral-50/80 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Fournisseur Destinataire
            </div>
            <div className="mt-1 text-base font-extrabold text-neutral-900">
              {supplier.name}
            </div>
            {supplier.contactName && (
              <div className="text-xs font-medium text-neutral-700">
                Attn : {supplier.contactName}
              </div>
            )}
            {supplier.address && (
              <div className="mt-1 text-xs text-neutral-600 whitespace-pre-line">
                {supplier.address}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600 font-mono">
              {supplier.email && <span>✉ {supplier.email}</span>}
              {supplier.phone && <span>☎ {supplier.phone}</span>}
            </div>
          </div>

          {/* LIVRAISON */}
          <div className="rounded-xl border border-neutral-300 bg-neutral-50/80 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Lieu de Livraison &amp; Réception
            </div>
            <div className="mt-1 text-base font-extrabold text-neutral-900">
              Atelier VisuAlpes (Réception Matières)
            </div>
            <div className="text-xs text-neutral-600">
              150 Chemin des Taillées, 74400 Chamonix Mont-Blanc
              <br />
              Horaires : Lundi - Vendredi, 08h30 - 12h00 / 14h00 - 17h30
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-neutral-200 pt-2 text-xs">
              <span className="text-neutral-500">Date livraison souhaitée :</span>
              <span className="font-bold text-neutral-950 font-mono">{formattedDelivery}</span>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS OU NOTES */}
        {order.notes && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
            <span className="font-bold">Instructions de commande / Référence devis :</span>{" "}
            {order.notes}
          </div>
        )}

        {/* TABLEAU DES MATIÈRES ET ARTICLES */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Matières Premières &amp; Composants Commandés
            </h3>
            <span className="text-[11px] text-neutral-500 font-mono">
              {order.items?.length || 0} ligne(s)
            </span>
          </div>

          <table className="w-full border-collapse border border-neutral-300 text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-100 text-[11px] font-bold uppercase text-neutral-700">
                <th className="px-3 py-2 w-12 text-center">Ligne</th>
                <th className="px-3 py-2">Désignation de la matière / composant</th>
                <th className="px-3 py-2 text-center w-24">Quantité</th>
                <th className="px-3 py-2 text-center w-20">Unité</th>
                <th className="px-3 py-2 text-right w-28">P.U. HT</th>
                <th className="px-3 py-2 text-right w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((it, idx) => {
                  const lineTotal = ((it.unitPrice ?? 0) * it.quantity).toFixed(2);
                  return (
                    <tr key={it.id ?? idx} className="border-b border-neutral-200 hover:bg-neutral-50/50">
                      <td className="px-3 py-2.5 text-center font-mono text-neutral-500">
                        L{idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-neutral-900">
                        {it.productName}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-neutral-900">
                        {it.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-neutral-600">
                        {it.unit || "pcs"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-neutral-700">
                        {it.unitPrice !== null && it.unitPrice !== undefined
                          ? `${Number(it.unitPrice).toFixed(2)} €`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-neutral-950">
                        {it.unitPrice !== null && it.unitPrice !== undefined
                          ? `${lineTotal} €`
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-neutral-500 italic">
                    Aucun article spécifié.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOTAUX & SIGNATURES */}
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* CLAUSES ET CONSIGNES DE RÉCEPTION */}
          <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[11px] text-neutral-600">
            <div className="font-bold uppercase tracking-wider text-neutral-800">
              Conditions de livraison &amp; Conformité Atelier
            </div>
            <ul className="mt-1.5 list-inside list-disc space-y-1">
              <li>Mention obligatoire du n° de bon de commande <b>{order.reference}</b> sur le bon de livraison et la facture.</li>
              <li>Certificats matière / fiches techniques à joindre obligatoirement à la livraison.</li>
              <li>Tout colis endommagé ou non conforme aux spécifications fera l&apos;objet de réserves immédiates.</li>
            </ul>
          </div>

          {/* RÉCAPITULATIF FINANCIER */}
          <div className="w-full sm:w-72 rounded-xl border border-neutral-300 bg-neutral-50 p-4">
            <div className="flex justify-between py-1 text-xs text-neutral-600">
              <span>Sous-total Net HT :</span>
              <span className="font-mono font-semibold text-neutral-900">
                {totalHT.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between py-1 text-xs text-neutral-600">
              <span>TVA (20,0 %) :</span>
              <span className="font-mono font-semibold text-neutral-900">
                {tva.toFixed(2)} €
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t-2 border-neutral-900 pt-2 text-sm font-bold text-neutral-950">
              <span>Total TTC :</span>
              <span className="font-mono text-base font-black">
                {totalTTC.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* SIGNATURES OFFICIELLES */}
        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-6 text-xs text-neutral-700">
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center">
            <div className="font-bold uppercase tracking-wider text-neutral-800">
              Pour VisuAlpes SAS
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">Service Approvisionnements &amp; Atelier</div>
            <div className="mt-12 text-[10px] text-neutral-400 italic">Signature &amp; Cachet</div>
          </div>
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center">
            <div className="font-bold uppercase tracking-wider text-neutral-800">
              Accusé de réception Fournisseur
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">Bon pour accord &amp; Date confirmée</div>
            <div className="mt-12 text-[10px] text-neutral-400 italic">Date et Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

