"use client";

import React, { useState, useEffect } from "react";
import type { Supplier, SupplierOrder, SupplierOrderStatusType, StockItem } from "@/types/erp";
import { FileText, Plus, Trash2, X, Building2 } from "lucide-react";

interface OrderLineInput {
  stockItemIri?: string | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
}

interface SupplierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SupplierOrder | null;
  suppliers: Supplier[];
  stockItems: StockItem[];
  preselectedStockItem?: StockItem | null;
  onSave: (payload: {
    id?: number;
    reference: string;
    supplierIri: string;
    status: SupplierOrderStatusType;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    items: OrderLineInput[];
  }) => Promise<void>;
  onOpenCreateSupplier?: () => void;
}

export function SupplierOrderModal({
  isOpen,
  onClose,
  order,
  suppliers,
  stockItems,
  preselectedStockItem,
  onSave,
  onOpenCreateSupplier,
}: SupplierOrderModalProps) {
  const rawMaterials = stockItems.filter((it) => it.type === "raw_material");

  const [reference, setReference] = useState("");
  const [selectedSupplierIri, setSelectedSupplierIri] = useState("");
  const [status, setStatus] = useState<SupplierOrderStatusType>("draft");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLineInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (order) {
      setReference(order.reference);
      const sIri = typeof order.supplier === "object" ? order.supplier["@id"] : order.supplier;
      setSelectedSupplierIri(sIri || (suppliers[0]?.["@id"] ?? ""));
      setStatus(order.status);
      setDeliveryDate(
        order.expectedDeliveryDate ? order.expectedDeliveryDate.substring(0, 10) : "",
      );
      setNotes(order.notes ?? "");
      setLines(
        order.items && order.items.length > 0
          ? order.items.map((it) => ({
              stockItemIri: typeof it.stockItem === "object" ? it.stockItem?.["@id"] : it.stockItem,
              productName: it.productName,
              quantity: it.quantity,
              unit: it.unit || "pcs",
              unitPrice: it.unitPrice,
            }))
          : [
              {
                productName: "",
                quantity: 10,
                unit: "pcs",
                unitPrice: null,
              },
            ],
      );
    } else {
      // New Order
      const randRef = `BC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setReference(randRef);
      setStatus("draft");

      // Check if a preselectedStockItem was passed
      if (preselectedStockItem) {
        // Try to match supplier by name
        const matchedSupplier = suppliers.find(
          (s) => preselectedStockItem.supplier && s.name.toLowerCase().includes(preselectedStockItem.supplier.toLowerCase()),
        );
        setSelectedSupplierIri(matchedSupplier ? matchedSupplier["@id"] : (suppliers[0]?.["@id"] ?? ""));
        setNotes(`Réapprovisionnement automatisé pour : ${preselectedStockItem.name}`);
        setLines([
          {
            stockItemIri: preselectedStockItem["@id"],
            productName: preselectedStockItem.name,
            quantity: preselectedStockItem.reorderQuantity || 20,
            unit: preselectedStockItem.unit || "pcs",
            unitPrice: null,
          },
        ]);
      } else {
        setSelectedSupplierIri(suppliers[0]?.["@id"] ?? "");
        setNotes("");
        setLines([
          {
            productName: rawMaterials[0]?.name || "",
            stockItemIri: rawMaterials[0]?.["@id"] || null,
            quantity: rawMaterials[0]?.reorderQuantity || 10,
            unit: rawMaterials[0]?.unit || "pcs",
            unitPrice: null,
          },
        ]);
      }

      // Default expected delivery date: in 7 days
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDeliveryDate(d.toISOString().substring(0, 10));
    }
    setError(null);
  }, [isOpen, order, preselectedStockItem, suppliers]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productName: "",
        quantity: 10,
        unit: "pcs",
        unitPrice: null,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof OrderLineInput, value: unknown) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      // If stockItemIri is changed, autofill productName and unit
      if (field === "stockItemIri") {
        const item = rawMaterials.find((m) => m["@id"] === value);
        if (item) {
          updated[idx].productName = item.name;
          updated[idx].unit = item.unit;
          if (!updated[idx].quantity || updated[idx].quantity <= 1) {
            updated[idx].quantity = item.reorderQuantity || 10;
          }
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierIri) {
      setError("Veuillez sélectionner un fournisseur.");
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.productName.trim() || l.quantity <= 0)) {
      setError("Veuillez vérifier les articles commandés (désignation et quantité > 0).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: order?.id,
        reference: reference.trim(),
        supplierIri: selectedSupplierIri,
        status,
        expectedDeliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          ...l,
          productName: l.productName.trim(),
          quantity: Number(l.quantity),
          unit: l.unit.trim() || "pcs",
          unitPrice: l.unitPrice !== null && l.unitPrice !== undefined ? Number(l.unitPrice) : null,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du bon de commande.");
    } finally {
      setSaving(false);
    }
  };

  const totalHT = lines.reduce((acc, l) => acc + (l.unitPrice ?? 0) * (l.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#151517] p-6 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A96B]/15 text-[#DFCA9F]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F7F5EF]">
                {order ? `Modifier le Bon de Commande ${order.reference}` : "Nouveau Bon de Commande Fournisseur"}
              </h2>
              <p className="text-xs text-[#8C8379]">
                Approvisionnement matières premières &amp; composants externes
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          {/* LIGNE 1 : RÉFÉRENCE, FOURNISSEUR, STATUT */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                N° Référence Bon de Commande
              </label>
              <input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-2 font-mono text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                  Fournisseur *
                </label>
                {onOpenCreateSupplier && (
                  <button
                    type="button"
                    onClick={onOpenCreateSupplier}
                    className="text-[10px] text-[#C9A96B] hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Nouveau
                  </button>
                )}
              </div>
              <select
                value={selectedSupplierIri}
                onChange={(e) => setSelectedSupplierIri(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-2 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              >
                {suppliers.length === 0 && <option value="">Aucun fournisseur configuré</option>}
                {suppliers.map((s) => (
                  <option key={s["@id"]} value={s["@id"]}>
                    {s.name} ({s.leadTimeDays || 5}j)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Statut du bon
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupplierOrderStatusType)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-2 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              >
                <option value="draft">Brouillon (Non envoyé)</option>
                <option value="sent">Envoyé au fournisseur (En cours)</option>
                <option value="received">Réceptionné (Stock incrémenté)</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>

          {/* LIGNE 2 : DATE LIVRAISON & NOTES */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Date de livraison souhaitée
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-2 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Instructions / Remarques atelier
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex : Référence devis n°4489, livraison quai nord..."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-2 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </div>
          </div>

          {/* LIGNES D'ARTICLES COMMANDÉS */}
          <div className="rounded-xl border border-white/[0.08] bg-[#101012] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F7F5EF]">
                  Matières Premières Commandées
                </span>
                <p className="text-[11px] text-[#8C8379]">
                  Sélectionnez un composant existant pour lier le stock ou saisissez une désignation libre
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-3 py-1.5 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2.5 items-end rounded-xl border border-white/[0.05] bg-[#18181B] p-2.5"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] font-semibold uppercase text-[#8C8379]">
                      Lier à un stock (Optionnel)
                    </label>
                    <select
                      value={line.stockItemIri || ""}
                      onChange={(e) => handleLineChange(idx, "stockItemIri", e.target.value || null)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#222226] px-2.5 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                    >
                      <option value="">(Saisie manuelle)</option>
                      {rawMaterials.map((rm) => (
                        <option key={rm["@id"]} value={rm["@id"]}>
                          {rm.name} (Stock: {rm.quantity} {rm.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-[10px] font-semibold uppercase text-[#8C8379]">
                      Désignation article *
                    </label>
                    <input
                      type="text"
                      required
                      value={line.productName}
                      onChange={(e) => handleLineChange(idx, "productName", e.target.value)}
                      placeholder="Nom de la matière"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#222226] px-2.5 py-1.5 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-[#8C8379]">
                      Quantité *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#222226] px-2 py-1.5 font-mono text-xs text-center text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] font-semibold uppercase text-[#8C8379]">
                      Unité
                    </label>
                    <input
                      type="text"
                      value={line.unit}
                      onChange={(e) => handleLineChange(idx, "unit", e.target.value)}
                      placeholder="pcs"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#222226] px-2 py-1.5 text-xs text-center text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-1">
                    <label className="block text-[10px] font-semibold uppercase text-[#8C8379]">
                      P.U. HT (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice ?? ""}
                      onChange={(e) =>
                        handleLineChange(idx, "unitPrice", e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#222226] px-2 py-1.5 font-mono text-xs text-right text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-1 flex items-center justify-center pb-1">
                    <button
                      type="button"
                      disabled={lines.length <= 1}
                      onClick={() => handleRemoveLine(idx)}
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all disabled:opacity-20"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalHT > 0 && (
              <div className="mt-3 flex justify-end gap-3 text-xs text-[#8C8379] font-mono">
                <span>Estimation Total HT :</span>
                <span className="font-bold text-[#DFCA9F]">{totalHT.toFixed(2)} € HT</span>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <div className="text-[11px] text-[#8C8379]">
              {status === "sent" && "✓ Marque automatiquement les composants liés comme « En commande »"}
              {status === "received" && "✓ Incrémente automatiquement les stocks dès validation"}
            </div>
            <div className="flex items-center gap-3">
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
                {saving ? "Enregistrement..." : order ? "Mettre à jour" : "Créer le Bon de Commande"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

