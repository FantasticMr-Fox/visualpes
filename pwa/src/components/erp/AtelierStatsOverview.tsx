"use client";

import React from "react";
import type { Order, StockItem } from "@/types/erp";

interface AtelierStatsOverviewProps {
  orders: Order[];
  totalNfcCount: number;
  stockItems: StockItem[];
  accountsCount: number;
}

export function AtelierStatsOverview({
  orders,
  totalNfcCount,
  stockItems,
  accountsCount,
}: AtelierStatsOverviewProps) {
  const activeOrders = orders.filter((o) => o.status !== "completed");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const clientOrders = activeOrders.filter((o) => !o.isStockOrder);
  const stockOrders = activeOrders.filter((o) => o.isStockOrder);

  const lowStockItems = stockItems.filter(
    (item) => item.quantity <= item.alertThreshold,
  );
  const lowStockCount = lowStockItems.length;

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {/* 1. Commandes en cours */}
      <div className="surface-card flex flex-col justify-between p-4 transition-colors hover:border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8C8379]">
            En Fabrication
          </span>
          <span className="rounded-md border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#DFCA9F]">
            Atelier
          </span>
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-[#F7F5EF]">
            {activeOrders.length}
          </span>
          <span className="text-xs text-[#8C8379]">fiches actives</span>
        </div>
        <div className="text-[11px] text-[#8C8379]">
          <span className="text-[#F7F5EF] font-medium">{clientOrders.length}</span> clients •{" "}
          <span className="text-[#F7F5EF] font-medium">{stockOrders.length}</span> réappro ({completedOrders.length} livrées)
        </div>
      </div>

      {/* 2. Supports & Tags NFC */}
      <div className="surface-card flex flex-col justify-between p-4 transition-colors hover:border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8C8379]">
            Supports &amp; Tags NFC
          </span>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#8C8379]">
            Puces NTAG
          </span>
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-[#F7F5EF]">
            {totalNfcCount}
          </span>
          <span className="text-xs text-[#8C8379]">enregistrés</span>
        </div>
        <div className="text-[11px] text-[#8C8379]">
          Format NDEF VisuAlpes &amp; Flash QR synchronisés
        </div>
      </div>

      {/* 3. Alertes stocks matières */}
      <div className="surface-card flex flex-col justify-between p-4 transition-colors hover:border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8C8379]">
            Stocks &amp; Ébauches
          </span>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
              lowStockCount > 0
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {lowStockCount > 0 ? "Alerte seuil" : "Optimal"}
          </span>
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span
            className={`font-mono text-2xl font-bold tracking-tight ${
              lowStockCount > 0 ? "text-amber-400" : "text-[#F7F5EF]"
            }`}
          >
            {stockItems.filter((i) => i.type === "pre_produced" || !i.type).length} prép. • {stockItems.filter((i) => i.type === "raw_material").length} mat.
          </span>
        </div>
        <div className="truncate text-[11px] text-[#8C8379]">
          {lowStockCount > 0
            ? `${lowStockCount} référence(s) sous seuil critique`
            : "Tampon préproduit et matières premières OK"}
        </div>
      </div>

      {/* 4. Portefeuille clients & logements */}
      <div className="surface-card flex flex-col justify-between p-4 transition-colors hover:border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8C8379]">
            Portefeuille Comptes
          </span>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#8C8379]">
            Actifs
          </span>
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-[#F7F5EF]">
            {accountsCount}
          </span>
          <span className="text-xs text-[#8C8379]">clients &amp; domaines</span>
        </div>
        <div className="text-[11px] text-[#8C8379]">
          Espaces propriétaires &amp; conciergeries d&apos;altitude
        </div>
      </div>
    </div>
  );
}
