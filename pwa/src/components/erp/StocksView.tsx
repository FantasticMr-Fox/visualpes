"use client";

import React, { useState } from "react";
import type { ErpTab, Order, StockItem } from "@/types/erp";

interface StocksViewProps {
  stockItems: StockItem[];
  orders: Order[];
  onAdjustStock: (item: StockItem, delta: number) => Promise<void>;
  onOpenStockModal: (item: StockItem) => void;
  onCreateStockItem: (payload: {
    code: string;
    name: string;
    quantity: number;
    alertThreshold: number;
    reorderQuantity: number;
    unit: string;
  }) => Promise<void>;
  onDeleteStockItem: (item: StockItem) => Promise<void>;
  onUpdateOrderStatus: (orderIri: string, status: Order["status"]) => Promise<void>;
  onNavigateTab: (tab: ErpTab) => void;
}

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente",
  processing: "En fabrication",
  quality_check: "Contrôle & Encodage",
  completed: "Terminé",
};

export function StocksView({
  stockItems,
  orders,
  onAdjustStock,
  onOpenStockModal,
  onCreateStockItem,
  onDeleteStockItem,
  onUpdateOrderStatus,
  onNavigateTab,
}: StocksViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState(25);
  const [newThreshold, setNewThreshold] = useState(10);
  const [newReorder, setNewReorder] = useState(50);
  const [newUnit, setNewUnit] = useState("pcs");
  const [saving, setSaving] = useState(false);

  const openStockOrders = orders.filter(
    (o) => o.isStockOrder && o.status !== "completed",
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateStockItem({
        code: newCode.trim().toLowerCase().replace(/\s+/g, "_"),
        name: newName.trim(),
        quantity: Number(newQty),
        alertThreshold: Math.max(0, Number(newThreshold)),
        reorderQuantity: Math.max(1, Number(newReorder)),
        unit: newUnit.trim() || "pcs",
      });
      setCreateOpen(false);
      setNewCode("");
      setNewName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête épuré */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Stocks Atelier
          </h1>
          <p className="text-xs text-neutral-400">
            Matières premières • Une fiche de production est créée automatiquement sous le seuil d&apos;alerte
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openStockOrders.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab("orders")}
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20"
            >
              {openStockOrders.length} réappro en cours →
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
          >
            + Nouveau composant
          </button>
        </div>
      </div>

      {/* Grille des composants */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stockItems.map((item) => {
          const isAlert = item.quantity <= item.alertThreshold;
          const activeOrder = openStockOrders.find(
            (o) =>
              o.targetStockItem?.code === item.code ||
              o.targetStockItem?.id === item.id,
          );
          const gaugeMax = Math.max(
            item.reorderQuantity + item.alertThreshold,
            item.quantity,
            1,
          );
          const pct = Math.max(
            0,
            Math.min(100, Math.round((item.quantity / gaugeMax) * 100)),
          );

          return (
            <div
              key={item["@id"]}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 transition-colors ${
                isAlert
                  ? "border-orange-500/50 bg-orange-950/15"
                  : "border-neutral-800/80 bg-neutral-900/50"
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <span className="font-mono text-[11px] text-neutral-500">
                      {item.code}
                    </span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      isAlert
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isAlert ? "Sous seuil" : "OK"}
                  </span>
                </div>

                {/* Quantité & paramètres de seuil */}
                <div className="flex items-baseline justify-between">
                  <div
                    className={`font-mono text-3xl font-bold ${
                      isAlert ? "text-orange-400" : "text-white"
                    }`}
                  >
                    {item.quantity}{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      {item.unit}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-neutral-400">
                    <span>Seuil : {item.alertThreshold}</span>
                    <span className="mx-1.5 text-neutral-600">•</span>
                    <span>Lot : +{item.reorderQuantity}</span>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full transition-all ${
                      isAlert ? "bg-orange-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Fiche de réappro active s'il y en a une */}
              {activeOrder && (
                <div className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-950/30 px-3 py-2 text-xs text-orange-200">
                  <span>
                    Réappro <strong>#{activeOrder.id}</strong> ({STATUS_LABELS[activeOrder.status]})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateOrderStatus(activeOrder["@id"], "completed")
                    }
                    className="rounded-md bg-orange-400 px-2 py-0.5 text-[11px] font-semibold text-neutral-950 hover:bg-orange-300"
                  >
                    Valider réception
                  </button>
                </div>
              )}

              {/* Actions rapides */}
              <div className="flex items-center justify-between gap-2 border-t border-neutral-800/70 pt-3">
                <div className="flex items-center gap-1">
                  {[-10, -1, 1, 10].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => void onAdjustStock(item, delta)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenStockModal(item)}
                    className="rounded-lg border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    Réglages
                  </button>
                  {!["patin_tpu", "socle_ciment", "plaque_bois"].includes(
                    item.code,
                  ) && (
                    <button
                      type="button"
                      onClick={() => void onDeleteStockItem(item)}
                      className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale d'ajout d'un nouveau composant de stock */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreate}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">Nouveau composant</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Désignation
              <input
                type="text"
                required
                placeholder="ex: Bobine Filament TPU Noir"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newCode) {
                    setNewCode(
                      e.target.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_|_$/g, ""),
                    );
                  }
                }}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Code
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Unité
                <input
                  type="text"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Quantité
                <input
                  type="number"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 0)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Seuil alerte
                <input
                  type="number"
                  min={0}
                  required
                  value={newThreshold}
                  onChange={(e) =>
                    setNewThreshold(parseInt(e.target.value, 10) || 0)
                  }
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Lot réappro
                <input
                  type="number"
                  min={1}
                  required
                  value={newReorder}
                  onChange={(e) =>
                    setNewReorder(parseInt(e.target.value, 10) || 1)
                  }
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
              >
                {saving ? "Création…" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
