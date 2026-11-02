"use client";

import React from "react";
import type { ErpTab, Order, StockItem, SupportTicketItem, AccountSummary } from "@/types/erp";
import { Package, AlertTriangle, LifeBuoy, Radio, ArrowRight, Plus, CheckCircle2, Clock, Wrench } from "lucide-react";

interface AtelierDashboardHomeProps {
  orders: Order[];
  stockItems: StockItem[];
  supportTickets: SupportTicketItem[];
  totalNfcCount: number;
  accounts: AccountSummary[];
  isAdmin: boolean;
  onNavigateTab: (tab: ErpTab) => void;
  onOpenCreateOrder: (isStock?: boolean) => void;
}

const ORDER_STAGE_COLORS: Record<Order["status"], { label: string; barColor: string; textColor: string; badgeBg: string }> = {
  pending: {
    label: "En attente",
    barColor: "bg-amber-500",
    textColor: "text-amber-400",
    badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  },
  processing: {
    label: "En usinage",
    barColor: "bg-sky-500",
    textColor: "text-sky-400",
    badgeBg: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  },
  quality_check: {
    label: "Contrôle & NFC",
    barColor: "bg-purple-500",
    textColor: "text-purple-400",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  },
  shipped: {
    label: "Expédié",
    barColor: "bg-indigo-500",
    textColor: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  },
  completed: {
    label: "Terminé",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  },
};

const TICKET_LABELS: Record<string, string> = {
  nfc_defect: "Puce NFC Défectueuse",
  wifi_issue: "Connexion Wi-Fi",
  guide_update: "Mise à jour Guide",
  billing: "Facturation",
  other: "Demande Spéciale",
};

export function AtelierDashboardHome({
  orders,
  stockItems,
  supportTickets,
  totalNfcCount,
  accounts,
  isAdmin,
  onNavigateTab,
  onOpenCreateOrder,
}: AtelierDashboardHomeProps) {
  // Commandes
  const activeOrders = orders.filter((o) => o.status !== "completed");
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const qualityCheckCount = orders.filter((o) => o.status === "quality_check").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const totalOrdersCount = orders.length || 1;

  // Calcul des pourcentages pour la barre de flux
  const pctPending = Math.round((pendingCount / totalOrdersCount) * 100);
  const pctProcessing = Math.round((processingCount / totalOrdersCount) * 100);
  const pctQuality = Math.round((qualityCheckCount / totalOrdersCount) * 100);
  const pctCompleted = Math.max(0, 100 - pctPending - pctProcessing - pctQuality);

  // Stocks distingués (Produits préproduits vs Matières premières)
  const preProducedItems = stockItems.filter((it) => it.type === "pre_produced" || !it.type);
  const rawMaterialItems = stockItems.filter((it) => it.type === "raw_material");
  const lowStockItems = stockItems.filter((it) => it.quantity <= it.alertThreshold);
  const preProducedAlerts = preProducedItems.filter((it) => it.quantity <= it.alertThreshold).length;
  const rawMaterialAlerts = rawMaterialItems.filter((it) => it.quantity <= it.alertThreshold).length;

  // SAV
  const openTickets = supportTickets.filter((t) => t.status === "open");
  const inProgressTickets = supportTickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = supportTickets.filter((t) => t.status === "resolved" || t.status === "closed");

  // Récents
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentTickets = [...supportTickets].slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. EN-TÊTE D'ACCUEIL */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C9A96B]">
              Atelier Opérationnel • Supervision Centrale
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F7F5EF]">
            Tableau de Bord VisuAlpes
          </h1>
          <p className="text-xs text-[#8C8379]">
            Aperçu instantané de la chaîne de fabrication, des réserves de matières et de l&apos;assistance conciergerie
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenCreateOrder(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-3.5 py-2 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Réappro stock</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateOrder(false)}
              className="btn-primary-gold flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouvelle commande</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. CARTES RÉCAPITULATIVES HAUT DE PAGE */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Card 1 : Commandes */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="surface-card group cursor-pointer p-4 transition-all hover:border-[#C9A96B]/40"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#8C8379] flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-[#C9A96B]" />
              Commandes Actives
            </span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#8C8379]">
              {orders.length} total
            </span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#F7F5EF]">
              {activeOrders.length}
            </span>
            <span className="text-xs text-[#8C8379]">en atelier</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C8379]">
            <span>{completedCount} terminées</span>
            <span className="text-[#C9A96B] group-hover:translate-x-0.5 transition-transform">
              Kanban →
            </span>
          </div>
        </div>

        {/* Card 2 : Stocks */}
        <div
          onClick={() => onNavigateTab("stocks")}
          className={`surface-card group cursor-pointer p-4 transition-all ${
            lowStockItems.length > 0
              ? "border-amber-500/40 bg-amber-950/10 hover:border-amber-500/70"
              : "hover:border-[#C9A96B]/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#8C8379] flex items-center gap-1.5">
              <AlertTriangle className={`h-3.5 w-3.5 ${lowStockItems.length > 0 ? "text-amber-400" : "text-[#C9A96B]"}`} />
              Réserves Atelier
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                lowStockItems.length > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {lowStockItems.length > 0 ? `${lowStockItems.length} alerte` : "Optimal"}
            </span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-extrabold text-[#DFCA9F]">
              {preProducedItems.reduce((acc, it) => acc + it.quantity, 0)}
            </span>
            <span className="text-xs text-[#8C8379]">préproduits •</span>
            <span className="text-xl font-bold text-sky-400">
              {rawMaterialItems.length}
            </span>
            <span className="text-xs text-[#8C8379]">mat. 1ères</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C8379]">
            <span className={lowStockItems.length > 0 ? "text-amber-300 font-medium" : ""}>
              {preProducedAlerts > 0
                ? `${preProducedAlerts} ébauche(s) à usiner`
                : rawMaterialAlerts > 0
                ? `${rawMaterialAlerts} matière(s) à commander`
                : "Stocks atelier & appros conformes"}
            </span>
            <span className="text-[#C9A96B] group-hover:translate-x-0.5 transition-transform">
              Stocks →
            </span>
          </div>
        </div>

        {/* Card 3 : SAV & Assistance */}
        <div
          onClick={() => onNavigateTab("support")}
          className={`surface-card group cursor-pointer p-4 transition-all ${
            openTickets.length > 0
              ? "border-amber-500/40 bg-amber-950/10 hover:border-amber-500/70"
              : "hover:border-[#C9A96B]/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#8C8379] flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5 text-[#C9A96B]" />
              Assistance SAV
            </span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#8C8379]">
              {supportTickets.length} tickets
            </span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#F7F5EF]">
              {openTickets.length}
            </span>
            <span className="text-xs text-[#8C8379]">à traiter</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C8379]">
            <span>{inProgressTickets.length} en cours • {resolvedTickets.length} résolus</span>
            <span className="text-[#C9A96B] group-hover:translate-x-0.5 transition-transform">
              SAV →
            </span>
          </div>
        </div>

        {/* Card 4 : Puces NFC & Partenaires */}
        <div
          onClick={() => onNavigateTab("clients")}
          className="surface-card group cursor-pointer p-4 transition-all hover:border-[#C9A96B]/40"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#8C8379] flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-[#C9A96B]" />
              Parc Connecté
            </span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#8C8379]">
              {accounts.length} comptes
            </span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#DFCA9F]">
              {totalNfcCount}
            </span>
            <span className="text-xs text-[#8C8379]">supports NFC</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C8379]">
            <span>Hébergements alpins</span>
            <span className="text-[#C9A96B] group-hover:translate-x-0.5 transition-transform">
              Clients →
            </span>
          </div>
        </div>
      </div>

      {/* 3. LES 3 GRANDS PILIERS VISUELS : COMMANDES, STOCKS, SAV */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* PILIER 1 : COMMANDES & LIGNE DE FABRICATION */}
        <div className="surface-card flex flex-col justify-between p-5 lg:col-span-1">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#C9A96B]">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F7F5EF]">Ligne de Fabrication</h2>
                  <p className="text-[11px] text-[#8C8379]">Flux d&apos;usinage et contrôle atelier</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("orders")}
                className="text-[11px] font-medium text-[#C9A96B] hover:text-[#DFCA9F] flex items-center gap-1"
              >
                Kanban <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Barre de progression segmentée visuelle */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-[#8C8379]">
                <span>Répartition des fiches</span>
                <span className="font-mono font-medium text-[#F7F5EF]">{orders.length} commandes</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05] p-0.5">
                {pctPending > 0 && (
                  <div
                    style={{ width: `${pctPending}%` }}
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    title={`En attente: ${pendingCount}`}
                  />
                )}
                {pctProcessing > 0 && (
                  <div
                    style={{ width: `${pctProcessing}%` }}
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    title={`En usinage: ${processingCount}`}
                  />
                )}
                {pctQuality > 0 && (
                  <div
                    style={{ width: `${pctQuality}%` }}
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    title={`Contrôle & NFC: ${qualityCheckCount}`}
                  />
                )}
                {pctCompleted > 0 && (
                  <div
                    style={{ width: `${pctCompleted}%` }}
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    title={`Terminé: ${completedCount}`}
                  />
                )}
              </div>

              {/* Badges d'étapes */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-4">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1.5 text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[#8C8379]">Attente :</span>
                  <span className="font-mono font-bold text-[#F7F5EF]">{pendingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1.5 text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="text-[#8C8379]">Usinage :</span>
                  <span className="font-mono font-bold text-[#F7F5EF]">{processingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1.5 text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[#8C8379]">NFC :</span>
                  <span className="font-mono font-bold text-[#F7F5EF]">{qualityCheckCount}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1.5 text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[#8C8379]">Livrées :</span>
                  <span className="font-mono font-bold text-[#F7F5EF]">{completedCount}</span>
                </div>
              </div>
            </div>

            {/* Liste des commandes récentes */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                Dernières fiches atelier
              </span>
              <div className="flex flex-col gap-2">
                {recentOrders.map((ord) => {
                  const stage = ORDER_STAGE_COLORS[ord.status] || ORDER_STAGE_COLORS.pending;
                  const totalSupports = (ord.orderItems ?? []).reduce(
                    (acc, it) => acc + (it.quantity || 0),
                    0,
                  );
                  const isStock = Boolean(ord.isStockOrder);

                  return (
                    <div
                      key={ord["@id"]}
                      onClick={() => onNavigateTab("orders")}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.06] bg-[#111113] p-2.5 transition-colors hover:border-white/15"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-bold ${isStock ? "text-[#DFCA9F]" : "text-[#F7F5EF]"}`}>
                            #{ord.id}
                          </span>
                          <span className="truncate text-xs font-medium text-[#F7F5EF]">
                            {isStock
                              ? ord.targetStockItem?.name ?? "Réappro Stock"
                              : typeof ord.account === "object" && ord.account !== null
                              ? ord.account.name
                              : "Client"}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8C8379]">
                          {totalSupports} pièces • {new Date(ord.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>

                      <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${stage.badgeBg}`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("orders")}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#151517] py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#242426] transition-colors"
          >
            <span>Afficher tout le Kanban de fabrication</span>
            <ArrowRight className="h-3 w-3 text-[#C9A96B]" />
          </button>
        </div>

        {/* PILIER 2 : ÉTAT DES STOCKS & MATIÈRES PREMIÈRES */}
        <div className="surface-card flex flex-col justify-between p-5 lg:col-span-1">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#C9A96B]">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F7F5EF]">Stocks &amp; Matières</h2>
                  <p className="text-[11px] text-[#8C8379]">Bois alpins, puces NFC, métaux &amp; béton</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("stocks")}
                className="text-[11px] font-medium text-[#C9A96B] hover:text-[#DFCA9F] flex items-center gap-1"
              >
                Gérer <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* État des alertes stock */}
            {lowStockItems.length > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>{lowStockItems.length} composant(s)</strong> sous le seuil d&apos;alerte
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCreateOrder(true)}
                  className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30"
                >
                  + Réappro
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/15 px-3.5 py-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Tous les stocks sont à un niveau optimal pour l&apos;usinage.</span>
              </div>
            )}

            {/* Jauges visuelles par composant */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                Réserves &amp; Ébauches clés
              </span>
              <div className="flex flex-col gap-2.5">
                {stockItems.slice(0, 6).map((item) => {
                  const isAlert = item.quantity <= item.alertThreshold;
                  const isRaw = item.type === "raw_material";
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
                      className="flex flex-col gap-1.5 rounded-lg border border-white/[0.05] bg-[#111113] p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase ${
                              isRaw
                                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                : "bg-[#C9A96B]/15 text-[#DFCA9F] border border-[#C9A96B]/30"
                            }`}
                          >
                            {isRaw ? "Matière 1ère" : "Préproduit"}
                          </span>
                          <span className="font-medium text-[#F7F5EF] truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                          <span className={isAlert ? "font-bold text-amber-400" : isRaw ? "text-sky-300" : "text-[#DFCA9F]"}>
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-[#8C8379]">/ s. {item.alertThreshold}</span>
                        </div>
                      </div>

                      {/* Jauge */}
                      <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isAlert ? "bg-amber-500" : isRaw ? "bg-sky-400" : "bg-[#C9A96B]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("stocks")}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#151517] py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#242426] transition-colors"
          >
            <span>Voir l&apos;inventaire complet et ajuster</span>
            <ArrowRight className="h-3 w-3 text-[#C9A96B]" />
          </button>
        </div>

        {/* PILIER 3 : ASSISTANCE SAV & CONCIERGERIES */}
        <div className="surface-card flex flex-col justify-between p-5 lg:col-span-1">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#C9A96B]">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F7F5EF]">Assistance SAV</h2>
                  <p className="text-[11px] text-[#8C8379]">Demandes partenaires &amp; puces endommagées</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("support")}
                className="text-[11px] font-medium text-[#C9A96B] hover:text-[#DFCA9F] flex items-center gap-1"
              >
                Traiter <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Synthèse SAV */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#111113] p-2.5 text-center">
                <span className="font-mono text-xl font-bold text-amber-400">{openTickets.length}</span>
                <span className="text-[10px] text-[#8C8379]">Ouverts</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#111113] p-2.5 text-center">
                <span className="font-mono text-xl font-bold text-sky-400">{inProgressTickets.length}</span>
                <span className="text-[10px] text-[#8C8379]">En cours</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#111113] p-2.5 text-center">
                <span className="font-mono text-xl font-bold text-emerald-400">{resolvedTickets.length}</span>
                <span className="text-[10px] text-[#8C8379]">Résolus</span>
              </div>
            </div>

            {/* Dernières demandes */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                Demandes d&apos;assistance récentes
              </span>
              {recentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] py-8 text-center text-xs text-[#8C8379]">
                  <CheckCircle2 className="mb-1.5 h-5 w-5 text-emerald-400/80" />
                  <span>Aucun ticket en attente</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentTickets.map((t) => (
                    <div
                      key={t["@id"]}
                      onClick={() => onNavigateTab("support")}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-white/[0.06] bg-[#111113] p-3 transition-colors hover:border-white/15"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#F7F5EF] truncate">
                          {t.subject}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            t.status === "open"
                              ? "bg-amber-500/15 text-amber-300"
                              : t.status === "in_progress"
                              ? "bg-sky-500/15 text-sky-300"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {t.status === "open" ? "Ouvert" : t.status === "in_progress" ? "En cours" : "Résolu"}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-[#8C8379]">
                        {t.message}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-[#DFCA9F]">
                          {TICKET_LABELS[t.issueType ?? "other"] ?? "Assistance"}
                        </span>
                        {t.aiDraft && (
                          <span className="rounded bg-[#C9A96B]/15 px-1.5 py-0.2 text-[#DFCA9F] border border-[#C9A96B]/30">
                            ✨ Réponse IA prête
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("support")}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#151517] py-2 text-xs font-medium text-[#F7F5EF] hover:bg-[#242426] transition-colors"
          >
            <span>Accéder au centre de support SAV</span>
            <ArrowRight className="h-3 w-3 text-[#C9A96B]" />
          </button>
        </div>
      </div>

      {/* 4. RANGÉE INFORMATIVE & RACCOURCIS RAPIDES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => onNavigateTab("nfc")}
          className="surface-card group cursor-pointer flex items-center justify-between p-4 transition-all hover:border-[#C9A96B]/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#C9A96B]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F7F5EF]">Gestion des Puces NFC</div>
              <div className="text-[11px] text-[#8C8379]">Encodage atelier &amp; paires actives</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8C8379] group-hover:text-[#C9A96B] group-hover:translate-x-0.5 transition-all" />
        </div>

        <div
          onClick={() => onNavigateTab("clients")}
          className="surface-card group cursor-pointer flex items-center justify-between p-4 transition-all hover:border-[#C9A96B]/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F7F5EF]">Logements &amp; Partenaires</div>
              <div className="text-[11px] text-[#8C8379]">{accounts.length} conciergeries &amp; chalets</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8C8379] group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        <a
          href="/login"
          target="_blank"
          rel="noreferrer"
          className="surface-card group flex items-center justify-between p-4 transition-all hover:border-[#C9A96B]/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F7F5EF]">Aperçu Espace Client</div>
              <div className="text-[11px] text-[#8C8379]">Vue voyageur &amp; QR Code Wi-Fi ↗</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8C8379] group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
        </a>
      </div>
    </div>
  );
}

