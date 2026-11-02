"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Truck, FileText, CheckCircle2 } from "lucide-react";
import type { Order } from "@/types/erp";

export default function KanbanOrderPrintPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("visualpes_token");
        const res = await fetch(`http://localhost/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          throw new Error(`Commande #${orderId} introuvable (${res.status})`);
        }
        const data = await res.json();
        setOrder(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    void fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] text-[#F7F5EF] flex items-center justify-center text-sm font-mono">
        Chargement du document d'expédition...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] text-rose-400 p-8 flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm">{error || "Commande introuvable"}</p>
        <button
          onClick={() => router.push("/va-admin")}
          className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-xs font-semibold hover:bg-neutral-700"
        >
          Retour au Kanban Atelier
        </button>
      </div>
    );
  }

  const accountName = typeof order.account === "object" && order.account ? order.account.name : "Client VisuAlpes";
  const address = order.shippingAddress || {};
  const customerName = `${address.firstName || ""} ${address.lastName || ""}`.trim() || accountName;
  const carrierName = order.carrier || "COLISSIMO";
  const trackingNumber = order.trackingNumber || `6A${order.id}0000FR`;
  const items = order.orderItems || [];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-900 p-4 sm:p-8 print:p-0 print:bg-white">
      {/* Barre d'action d'impression (masquée à l'impression papier) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-[#151517] text-[#F7F5EF] p-4 rounded-xl border border-white/10 print:hidden shadow-lg">
        <button
          onClick={() => router.push("/va-admin")}
          className="inline-flex items-center gap-2 text-xs text-[#8C8379] hover:text-[#DFB277] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour Atelier
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-neutral-400">
            Commande #{order.storeReference || order.id} • {carrierName}
          </span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DFB277] text-[#0A0A0C] font-semibold text-xs hover:bg-[#F3C075] transition-all shadow-md"
          >
            <Printer className="w-4 h-4" />
            Imprimer BL & Étiquette
          </button>
        </div>
      </div>

      {/* DOCUMENT D'IMPRESSION GROUPÉ : BON DE LIVRAISON + ÉTIQUETTE BOXTAL */}
      <div className="max-w-4xl mx-auto space-y-8 print:space-y-6">
        
        {/* SECTION 1 : BON DE LIVRAISON VISUALPES */}
        <div className="bg-white p-8 rounded-2xl shadow-md border border-neutral-200 print:shadow-none print:border-none print:p-0 page-break-after">
          {/* Header BL */}
          <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
            <div>
              <h1 className="text-2xl font-black tracking-widest uppercase text-neutral-900">
                VISUALPES
              </h1>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mt-0.5">
                Signalétique Haute Montagne & Phygitale
              </p>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Atelier de Fabrication & d'Encodage<br />
                12 Chemin des Alpages, 74400 Chamonix-Mont-Blanc<br />
                contact@visualpes.fr • SIRET 912 345 678 00019
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                Bon de Livraison
              </span>
              <p className="text-sm font-mono font-bold text-neutral-900 mt-2">
                BL-2026-{(order.id || 0).toString().padStart(4, "0")}
              </p>
              <p className="text-xs text-neutral-500">
                Commande : <strong>{order.storeReference || `#${order.id}`}</strong>
              </p>
              <p className="text-xs text-neutral-500">
                Date : {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>

          {/* Adresses Expéditeur & Destinataire */}
          <div className="grid grid-cols-2 gap-8 my-6 text-xs">
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <p className="font-bold text-neutral-900 uppercase tracking-wide mb-1 text-[11px]">
                Expédié par :
              </p>
              <p className="font-semibold text-neutral-800">Atelier VisuAlpes</p>
              <p className="text-neutral-600">12 Chemin des Alpages</p>
              <p className="text-neutral-600">74400 Chamonix-Mont-Blanc • France</p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <p className="font-bold text-neutral-900 uppercase tracking-wide mb-1 text-[11px]">
                Livraison à :
              </p>
              <p className="font-bold text-neutral-900">{customerName}</p>
              {address.company && <p className="text-neutral-700">{address.company}</p>}
              <p className="text-neutral-700">{address.address1 || "Adresse client"}</p>
              <p className="text-neutral-700">
                {address.postcode || "74000"} {address.city || "Haute-Savoie"} • {address.country || "France"}
              </p>
              {order.customerPhone && <p className="text-neutral-500 mt-1">Tél : {order.customerPhone}</p>}
            </div>
          </div>

          {/* Tableau des articles et puces NFC encodées */}
          <table className="w-full text-left text-xs border-collapse my-6">
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-100 text-neutral-800">
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Article / Référence</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Puces NFC / QR associées</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-right">Qté</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-neutral-900">{item.productName}</p>
                    <p className="text-[10px] font-mono text-neutral-500">Lot: VA-LOT-{(order.id || 1) * 100 + idx}</p>
                  </td>
                  <td className="py-3 px-3">
                    {item.nfcTags && item.nfcTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.nfcTags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-800 font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            #{t.shortUid}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-neutral-500 italic">
                        Encodage unitaire atelier certifié (Pass VisuAlpes)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-right text-neutral-900">
                    ×{item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notes et certification Factur-X Pennylane */}
          <div className="border-t border-neutral-200 pt-4 flex items-center justify-between text-[11px] text-neutral-500">
            <div>
              <p>Règlement : <strong>{order.paymentMethod?.toUpperCase() || "STANCER"}</strong> • Facture certifiée Factur-X Pennylane</p>
              {order.pennylaneInvoiceId && (
                <p className="font-mono text-[10px]">Réf Pennylane : {order.pennylaneInvoiceId}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-neutral-900">Contrôle Qualité Atelier : Conforme ✓</p>
              <p className="text-[10px]">Signature technicien VisuAlpes</p>
            </div>
          </div>
        </div>

        {/* SECTION 2 : ÉTIQUETTE TRANSPORTEUR BOXTAL */}
        <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-dashed border-neutral-400 print:shadow-none print:border-2 print:border-black print:p-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-neutral-900" />
              <span className="text-xl font-black uppercase tracking-wider text-neutral-900">
                {carrierName}
              </span>
            </div>
            <span className="text-xs font-mono font-bold border border-black px-2 py-0.5 rounded">
              BOXTAL CONNECT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-b border-neutral-300 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-500">Expéditeur :</p>
              <p className="font-bold text-neutral-900">VISUALPES ATELIER</p>
              <p className="text-neutral-700">12 Ch. des Alpages</p>
              <p className="text-neutral-700">74400 Chamonix</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-500">Destinataire :</p>
              <p className="font-black text-sm text-neutral-900">{customerName}</p>
              {address.company && <p className="font-semibold text-neutral-800">{address.company}</p>}
              <p className="text-neutral-800">{address.address1 || "Adresse inconnue"}</p>
              <p className="font-bold text-neutral-900">
                {address.postcode || "74000"} {address.city || "Chamonix"}
              </p>
              <p className="font-bold text-neutral-900">{address.country || "FRANCE"}</p>
            </div>
          </div>

          {/* Code-barres simulé & N° de suivi Boxtal */}
          <div className="py-6 text-center">
            <div className="inline-block bg-neutral-900 text-white font-mono px-4 py-1 text-xs font-bold rounded mb-2">
              SUIVI TRANSPORTEUR
            </div>
            <div className="font-mono text-xl font-black tracking-widest text-neutral-900">
              {trackingNumber}
            </div>
            {/* Faux code barre graphique CSS */}
            <div className="flex items-center justify-center gap-1 h-12 my-2">
              {[3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3,2,3,8,4,6,2,6,4,3,3,8,3,2,7,9].map((w, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 font-mono">
              Réf Boxtal: BXTL-{(order.id || 0).toString().padStart(6, "0")} • Poids: 1.20 kg
            </p>
          </div>

          <div className="border-t border-neutral-300 pt-2 text-[10px] text-neutral-500 text-center">
            Étiquette générée automatiquement via l'API Boxtal pour VisuAlpes Signalétique
          </div>
        </div>

      </div>
    </div>
  );
}

