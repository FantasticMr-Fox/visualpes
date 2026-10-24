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

  const stockOrders = orders.filter((o) => o.isStockOrder);
  const openStockOrders = stockOrders.filter((o) => o.status !== "completed");
  const lowStockItems = stockItems.filter((s) => s.quantity <= s.alertThreshold);

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
      {/* En-tête de la vue Stocks */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stocks Composants Atelier</h1>
          <p className="text-sm text-neutral-400">
            Suivi des matières premières • Dès que Quantité ≤ Seuil d&apos;alerte, une fiche orange de production tombe dans le Kanban
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("orders")}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
          >
            Voir le Kanban ({openStockOrders.length} réappro en cours)
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            + Nouveau composant
          </button>
        </div>
      </div>

      {/* KPIs Stock */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <span className="text-xs text-neutral-400">Composants suivis</span>
          <div className="mt-1 font-mono text-2xl font-bold text-neutral-100">{stockItems.length}</div>
          <p className="mt-1 text-[11px] text-neutral-500">1 support = 1 TPU + 1 ciment + 1 bois</p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            lowStockItems.length > 0
              ? "border-orange-500/50 bg-orange-950/20"
              : "border-neutral-800 bg-neutral-900/60"
          }`}
        >
          <span className="text-xs text-neutral-400">Alertes de seuil actif</span>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              lowStockItems.length > 0 ? "text-orange-400" : "text-emerald-400"
            }`}
          >
            {lowStockItems.length}
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            {lowStockItems.length > 0
              ? lowStockItems.map((i) => i.name).join(", ")
              : "Tous les stocks sont au-dessus du seuil"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <span className="text-xs text-neutral-400">Fiches de production stock actives</span>
          <div className="mt-1 font-mono text-2xl font-bold text-orange-300">
            {openStockOrders.length}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Créditent automatiquement le stock une fois passées à « Terminé »
          </p>
        </div>
      </div>

      {/* Cartes détaillées des composants */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stockItems.map((item) => {
          const isAlert = item.quantity <= item.alertThreshold;
          const activeOrder = openStockOrders.find(
            (o) => o.targetStockItem?.code === item.code || o.targetStockItem?.id === item.id,
          );
          const gaugeMax = Math.max(item.reorderQuantity + item.alertThreshold, item.quantity, 1);
          const pct = Math.max(0, Math.min(100, Math.round((item.quantity / gaugeMax) * 100)));

          return (
            <div
              key={item["@id"]}
              className={`flex flex-col justify-between gap-4 rounded-xl border p-5 transition-colors ${
                isAlert
                  ? "border-orange-500/70 bg-gradient-to-b from-orange-950/35 to-neutral-900"
                  : "border-neutral-800 bg-neutral-900/80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">{item.name}</h3>
                    <span className="font-mono text-xs text-neutral-500">Code : {item.code}</span>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      isAlert
                        ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {isAlert ? "SOUS SEUIL" : "NOMINAL"}
                  </span>
                </div>

                {/* Quantité & jauge visuelle */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-neutral-400">Quantité disponible</span>
                    <div
                      className={`font-mono text-3xl font-black ${
                        isAlert ? "text-orange-400" : "text-neutral-100"
                      }`}
                    >
                      {item.quantity}{" "}
                      <span className="text-sm font-normal text-neutral-400">{item.unit}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-400">
                    <div>
                      Seuil alerte :{" "}
                      <strong className="font-mono text-neutral-200">
                        {item.alertThreshold} {item.unit}
                      </strong>
                    </div>
                    <div>
                      Lot auto :{" "}
                      <strong className="font-mono text-neutral-200">
                        +{item.reorderQuantity} {item.unit}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full transition-all ${
                      isAlert ? "bg-orange-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Fiche Kanban liée si active */}
              {activeOrder && (
                <div className="flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-950/40 px-3 py-2 text-xs text-orange-200">
                  <div>
                    <span className="font-mono font-bold">CMD #{activeOrder.id}</span> en cours •{" "}
                    <span className="underline">{STATUS_LABELS[activeOrder.status]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("orders")}
                    className="rounded bg-orange-500/25 px-2 py-0.5 font-medium text-orange-200 hover:bg-orange-500/40"
                  >
                    Ouvrir Kanban →
                  </button>
                </div>
              )}

              {/* Actions rapides */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item, -10)}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-xs hover:bg-neutral-700"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item, -1)}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 font-mono text-xs hover:bg-neutral-700"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item, 1)}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 font-mono text-xs hover:bg-neutral-700"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item, 10)}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-xs hover:bg-neutral-700"
                  >
                    +10
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenStockModal(item)}
                    className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
                  >
                    Seuils & Lot
                  </button>
                  {!["patin_tpu", "socle_ciment", "plaque_bois"].includes(item.code) && (
                    <button
                      type="button"
                      onClick={() => onDeleteStockItem(item)}
                      className="rounded border border-rose-900/50 bg-rose-950/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-900/50"
                    >
                      Suppr.
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historique & Suivi des fiches de production stock (oranges) */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
            Fiches de production stock (Kanban)
          </h2>
          <span className="text-xs text-neutral-500">
            {stockOrders.length} fiche{stockOrders.length > 1 ? "s" : ""} au total
          </span>
        </div>

        {stockOrders.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-500">
            Aucune fiche de réapprovisionnement stock pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {stockOrders.map((so) => {
              const qty = (so.orderItems ?? []).reduce((a, b) => a + (b.quantity || 0), 0);
              return (
                <div
                  key={so["@id"]}
                  className="flex items-center justify-between gap-3 rounded-lg border border-orange-500/40 bg-orange-950/20 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-300">CMD #{so.id}</span>
                      <span className="font-semibold text-neutral-100">
                        {so.targetStockItem?.name ?? "Composant"}
                      </span>
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.2 font-mono font-bold text-orange-200">
                        +{qty} {so.targetStockItem?.unit ?? "pcs"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>Statut : <strong>{STATUS_LABELS[so.status]}</strong></span>
                      {so.stockCredited && (
                        <span className="text-emerald-400">• Stock crédité</span>
                      )}
                    </div>
                  </div>

                  {so.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(so["@id"], "completed")}
                      className="shrink-0 rounded bg-orange-400 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-950 hover:bg-orange-300"
                    >
                      Terminer (+{qty})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale d'ajout d'un nouveau composant de stock */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreate}
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">Nouveau composant de stock</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom du composant
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
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Code unique
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Unité
                <input
                  type="text"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Stock initial
                <input
                  type="number"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 0)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Seuil alerte
                <input
                  type="number"
                  min={0}
                  required
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value, 10) || 0)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Lot auto
                <input
                  type="number"
                  min={1}
                  required
                  value={newReorder}
                  onChange={(e) => setNewReorder(parseInt(e.target.value, 10) || 1)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Création…" : "Créer le composant"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

