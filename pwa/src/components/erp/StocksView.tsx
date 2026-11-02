"use client";

import React, { useState } from "react";
import type {
  ErpTab,
  Order,
  StockItem,
  StockCategory,
  Supplier,
  SupplierOrder,
  SupplierOrderStatusType,
  StockMovement,
} from "@/types/erp";
import type { StockQrPrintTarget } from "./StockQrPrintModal";
import {
  Layers,
  Truck,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Factory,
  Building2,
  FileText,
  Printer,
  Calendar,
  ExternalLink,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  QrCode,
  Tag,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { SupplierOrderModal } from "./SupplierOrderModal";
import { SupplierEditModal } from "./SupplierEditModal";

interface StocksViewProps {
  stockItems: StockItem[];
  orders: Order[];
  suppliers?: Supplier[];
  supplierOrders?: SupplierOrder[];
  onAdjustStock: (item: StockItem, delta: number) => Promise<void>;
  onOpenStockModal: (item: StockItem) => void;
  onCreateStockItem: (payload: {
    code: string;
    name: string;
    quantity: number;
    alertThreshold: number;
    reorderQuantity: number;
    unit: string;
    type?: StockCategory;
    supplier?: string | null;
  }) => Promise<void>;
  onDeleteStockItem: (item: StockItem) => Promise<void>;
  onUpdateOrderStatus: (orderIri: string, status: Order["status"]) => Promise<void>;
  onNavigateTab: (tab: ErpTab) => void;
  onOrderSupplier?: (item: StockItem) => Promise<void>;
  onReceiveSupplier?: (item: StockItem) => Promise<void>;
  onCreateSupplier?: (payload: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    leadTimeDays: number;
    notes?: string | null;
  }) => Promise<void>;
  onUpdateSupplier?: (payload: {
    id?: number;
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    leadTimeDays: number;
    notes?: string | null;
  }) => Promise<void>;
  onDeleteSupplier?: (supplier: Supplier) => Promise<void>;
  onCreateSupplierOrder?: (payload: {
    reference: string;
    supplierIri: string;
    status: SupplierOrderStatusType;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    items: Array<{
      stockItemIri?: string | null;
      productName: string;
      quantity: number;
      unit: string;
      unitPrice?: number | null;
    }>;
  }) => Promise<void>;
  onUpdateSupplierOrder?: (payload: {
    id?: number;
    reference: string;
    supplierIri: string;
    status: SupplierOrderStatusType;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    items: Array<{
      stockItemIri?: string | null;
      productName: string;
      quantity: number;
      unit: string;
      unitPrice?: number | null;
    }>;
  }) => Promise<void>;
  onSendSupplierOrder?: (order: SupplierOrder) => Promise<void>;
  onReceiveSupplierOrder?: (order: SupplierOrder) => Promise<void>;
  onDeleteSupplierOrder?: (order: SupplierOrder) => Promise<void>;
  onPrintSupplierOrder?: (order: SupplierOrder) => void;
  stockMovements?: StockMovement[];
  onOpenQrScanner?: () => void;
  onOpenQrPrint?: (target: StockQrPrintTarget) => void;
}

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente",
  processing: "En fabrication",
  quality_check: "Contrôle & Encodage",
  shipped: "Expédié (Boxtal)",
  completed: "Terminé",
};

const SUPPLIER_ORDER_BADGES: Record<
  SupplierOrderStatusType,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: "Brouillon",
    bg: "bg-neutral-800/80",
    text: "text-neutral-300",
    border: "border-neutral-700",
  },
  sent: {
    label: "Envoyé / En cours",
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/30",
  },
  received: {
    label: "Réceptionné",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
  },
  cancelled: {
    label: "Annulé",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
  },
};

export function StocksView({
  stockItems,
  orders,
  suppliers = [],
  supplierOrders = [],
  onAdjustStock,
  onOpenStockModal,
  onCreateStockItem,
  onDeleteStockItem,
  onUpdateOrderStatus,
  onNavigateTab,
  onOrderSupplier,
  onReceiveSupplier,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onCreateSupplierOrder,
  onUpdateSupplierOrder,
  onSendSupplierOrder,
  onReceiveSupplierOrder,
  onDeleteSupplierOrder,
  onPrintSupplierOrder,
  stockMovements = [],
  onOpenQrScanner,
  onOpenQrPrint,
}: StocksViewProps) {
  // Navigation principale de la vue Stocks
  const [subView, setSubView] = useState<"stocks" | "suppliers">("stocks");
  const [filterType, setFilterType] = useState<"all" | StockCategory>("all");
  const [orderFilter, setOrderFilter] = useState<"all" | SupplierOrderStatusType>("all");

  // Modale nouveau composant de stock
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<StockCategory>("pre_produced");
  const [newSupplier, setNewSupplier] = useState("");
  const [newQty, setNewQty] = useState(25);
  const [newThreshold, setNewThreshold] = useState(10);
  const [newReorder, setNewReorder] = useState(50);
  const [newUnit, setNewUnit] = useState("pcs");
  const [saving, setSaving] = useState(false);

  // Modales Fournisseurs & Bons de Commande
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingSupplierOrder, setEditingSupplierOrder] = useState<SupplierOrder | null>(null);
  const [preselectedStockForOrder, setPreselectedStockForOrder] = useState<StockItem | null>(null);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const openStockOrders = orders.filter(
    (o) => o.isStockOrder && o.status !== "completed",
  );

  const preProducedItems = stockItems.filter(
    (it) => it.type === "pre_produced" || !it.type,
  );
  const rawMaterialItems = stockItems.filter(
    (it) => it.type === "raw_material",
  );

  const displayedItems = stockItems.filter((it) => {
    if (filterType === "all") return true;
    if (filterType === "pre_produced") return it.type === "pre_produced" || !it.type;
    if (filterType === "raw_material") return it.type === "raw_material";
    return true;
  });

  const lowStockCount = stockItems.filter((i) => i.quantity <= i.alertThreshold).length;
  const preProducedAlerts = preProducedItems.filter((i) => i.quantity <= i.alertThreshold).length;
  const rawMaterialAlerts = rawMaterialItems.filter((i) => i.quantity <= i.alertThreshold).length;

  const openSupplierOrdersCount = supplierOrders.filter((o) => o.status === "sent" || o.status === "draft").length;
  const totalCommittedPurchases = supplierOrders
    .filter((o) => o.status === "sent" || o.status === "draft")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const displayedSupplierOrders = supplierOrders.filter((o) => {
    if (orderFilter === "all") return true;
    return o.status === orderFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateStockItem({
        code: newCode.trim().toLowerCase().replace(/\s+/g, "_"),
        name: newName.trim(),
        type: newType,
        supplier: newType === "raw_material" && newSupplier.trim() ? newSupplier.trim() : null,
        quantity: Math.max(0, Number(newQty)),
        alertThreshold: Math.max(0, Number(newThreshold)),
        reorderQuantity: Math.max(1, Number(newReorder)),
        unit: newUnit.trim() || "pcs",
      });
      setCreateOpen(false);
      setNewCode("");
      setNewName("");
      setNewSupplier("");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOrderForStock = (item: StockItem) => {
    setEditingSupplierOrder(null);
    setPreselectedStockForOrder(item);
    setOrderModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. EN-TÊTE ÉPURÉ & ONGLETS PRINCIPAUX */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C9A96B]">
              Logistique Atelier &amp; Chaîne d&apos;Approvisionnement
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F7F5EF]">
            {subView === "stocks"
              ? "Gestion des Stocks & Réserves"
              : "Fournisseurs & Bons de Commande"}
          </h1>
          <p className="text-xs text-[#8C8379]">
            {subView === "stocks"
              ? "Distinction stricte entre produits préproduits atelier et matières premières achetées chez les fournisseurs"
              : "Pilotage des partenaires fournisseurs et édition des bons de commande d'approvisionnement"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SÉLECTEUR DE SOUS-VUE */}
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#151517] p-1 text-xs">
            <button
              type="button"
              onClick={() => setSubView("stocks")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
                subView === "stocks"
                  ? "bg-[#242426] text-[#DFCA9F] shadow-sm"
                  : "text-[#8C8379] hover:text-[#F7F5EF]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Inventaire Stocks</span>
              {lowStockCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                  {lowStockCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubView("suppliers")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
                subView === "suppliers"
                  ? "bg-[#242426] text-sky-300 shadow-sm"
                  : "text-[#8C8379] hover:text-[#F7F5EF]"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Fournisseurs &amp; Bons de Commande</span>
              {openSupplierOrdersCount > 0 && (
                <span className="ml-1 rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-300">
                  {openSupplierOrdersCount}
                </span>
              )}
            </button>
          </div>

          {subView === "stocks" ? (
            <>
              {openStockOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab("orders")}
                  className="rounded-xl border border-[#C9A96B]/40 bg-[#C9A96B]/10 px-3.5 py-2 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20 transition-all flex items-center gap-1.5"
                >
                  <Factory className="h-3.5 w-3.5" />
                  <span>{openStockOrders.length} fabrication(s) atelier en cours →</span>
                </button>
              )}
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="rounded-xl border border-[#C9A96B]/50 bg-[#C9A96B]/15 px-3.5 py-2 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/25 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <QrCode className="h-4 w-4 text-[#C9A96B]" />
                  <span>Scanner / Flasher QR</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="btn-primary-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs uppercase tracking-wider font-semibold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau composant</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="rounded-xl border border-[#C9A96B]/50 bg-[#C9A96B]/15 px-3 py-2 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/25 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <QrCode className="h-4 w-4 text-[#C9A96B]" />
                  <span>Scanner QR</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierModalOpen(true);
                }}
                className="rounded-xl border border-white/10 bg-[#1E1E22] px-3.5 py-2 text-xs font-semibold text-[#F7F5EF] hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-[#C9A96B]" />
                <span>+ Fournisseur</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingSupplierOrder(null);
                  setPreselectedStockForOrder(null);
                  setOrderModalOpen(true);
                }}
                className="btn-primary-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs uppercase tracking-wider font-semibold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau Bon de Commande</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-VUE 1 : INVENTAIRE ET RÉSERVES (ATELIER & FOURNISSEURS) */}
      {/* ========================================================================= */}
      {subView === "stocks" && (
        <>
          {/* CARTES SYNTHÈSE DES 2 CATÉGORIES DE STOCK */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Synthèse globale */}
            <div className="surface-card flex flex-col justify-between p-4">
              <div className="flex items-center justify-between text-xs text-[#8C8379]">
                <span className="font-semibold uppercase tracking-wider">Inventaire Global</span>
                <span className="font-mono text-[10px]">{stockItems.length} références</span>
              </div>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-[#F7F5EF]">
                  {stockItems.reduce((acc, it) => acc + Math.max(0, it.quantity), 0)}
                </span>
                <span className="text-xs text-[#8C8379]">unités en stock</span>
              </div>
              <div className="text-[11px] text-[#8C8379]">
                {lowStockCount > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {lowStockCount} référence(s) sous seuil critique
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tous les seuils sont nominaux
                  </span>
                )}
              </div>
            </div>

            {/* Catégorie 1 : Produits Préproduits */}
            <div
              onClick={() => setFilterType("pre_produced")}
              className={`surface-card cursor-pointer flex flex-col justify-between p-4 transition-all hover:border-[#C9A96B]/60 ${
                filterType === "pre_produced" ? "border-[#C9A96B] ring-1 ring-[#C9A96B]/50" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#C9A96B] flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Produits Préproduits
                </span>
                <span className="rounded-md bg-[#C9A96B]/15 px-1.5 py-0.5 font-mono text-[10px] text-[#DFCA9F] font-semibold">
                  Atelier
                </span>
              </div>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-[#DFCA9F]">
                  {preProducedItems.reduce((acc, it) => acc + Math.max(0, it.quantity), 0)}
                </span>
                <span className="text-xs text-[#8C8379]">ébauches prêtes</span>
              </div>
              <div className="text-[11px] text-[#8C8379]">
                <span>En attente de personnalisation (gravure &amp; puce)</span>
                {preProducedAlerts > 0 && (
                  <span className="ml-1 text-amber-400 font-medium">• {preProducedAlerts} alerte</span>
                )}
              </div>
            </div>

            {/* Catégorie 2 : Matières Premières */}
            <div
              onClick={() => setFilterType("raw_material")}
              className={`surface-card cursor-pointer flex flex-col justify-between p-4 transition-all hover:border-sky-500/60 ${
                filterType === "raw_material" ? "border-sky-500 ring-1 ring-sky-500/50" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Matières Premières
                </span>
                <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] text-sky-300 font-semibold">
                  Fournisseurs
                </span>
              </div>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-sky-300">
                  {rawMaterialItems.length}
                </span>
                <span className="text-xs text-[#8C8379]">matières référencées</span>
              </div>
              <div className="text-[11px] text-[#8C8379]">
                <span>Commandées chez des fournisseurs externes certifiés</span>
                {rawMaterialAlerts > 0 && (
                  <span className="ml-1 text-amber-400 font-medium">• {rawMaterialAlerts} alerte</span>
                )}
              </div>
            </div>
          </div>

          {/* BARRE DE SEGMENTATION / FILTRE */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-[#151517] p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  filterType === "all"
                    ? "bg-[#242426] text-[#F7F5EF] shadow-sm"
                    : "text-[#8C8379] hover:text-[#F7F5EF]"
                }`}
              >
                Tous les stocks ({stockItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("pre_produced")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  filterType === "pre_produced"
                    ? "bg-[#242426] text-[#DFCA9F] shadow-sm"
                    : "text-[#8C8379] hover:text-[#DFCA9F]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#C9A96B]" />
                Produits Préproduits ({preProducedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("raw_material")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  filterType === "raw_material"
                    ? "bg-[#242426] text-sky-300 shadow-sm"
                    : "text-[#8C8379] hover:text-sky-300"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Matières Premières Fournisseurs ({rawMaterialItems.length})
              </button>
            </div>

            <div className="text-xs text-[#8C8379]">
              Affichage : <strong className="text-[#F7F5EF]">{displayedItems.length}</strong> composant(s)
            </div>
          </div>

          {/* GRILLE DES COMPOSANTS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedItems.map((item) => {
              const isAlert = item.quantity <= item.alertThreshold;
              const isRaw = item.type === "raw_material";
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
                  className={`surface-card flex flex-col justify-between gap-4 p-5 transition-all duration-150 ${
                    isAlert
                      ? "border-amber-500/50 bg-[#161410]"
                      : "hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              isRaw
                                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                : "bg-[#C9A96B]/15 text-[#DFCA9F] border border-[#C9A96B]/30"
                            }`}
                          >
                            {isRaw ? "Matière Première" : "Préproduit Atelier"}
                          </span>
                          <span className="font-mono text-[10px] text-[#8C8379]">
                            {item.code}
                          </span>
                        </div>
                        <h3 className="mt-1 font-bold text-sm text-[#F7F5EF] truncate">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#8C8379] line-clamp-1">
                          {isRaw
                            ? `Fournisseur : ${item.supplier || "Fournisseur externe référencé"}`
                            : "Stock préproduit tampon pour réactivité commandes"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          isAlert
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-white/[0.06] text-[#8C8379] border border-white/[0.08]"
                        }`}
                      >
                        {isAlert ? "Sous seuil" : "OK"}
                      </span>
                    </div>

                    {/* Quantité & paramètres de seuil */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div
                        className={`font-mono text-3xl font-extrabold ${
                          isAlert ? "text-amber-300" : isRaw ? "text-sky-300" : "text-[#DFCA9F]"
                        }`}
                      >
                        {Math.max(0, item.quantity)}{" "}
                        <span className="text-xs font-normal text-[#8C8379]">
                          {item.unit}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-[#8C8379]">
                        <span>Seuil alerte : {item.alertThreshold}</span>
                        <span className="mx-1.5 text-[#8C8379]/40">•</span>
                        <span>Lot : +{item.reorderQuantity}</span>
                      </div>
                    </div>

                    {/* Jauge horizontale */}
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAlert
                            ? "bg-amber-500"
                            : isRaw
                            ? "bg-sky-400"
                            : "bg-[#C9A96B]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Fiche de fabrication atelier active s'il s'agit d'un produit préproduit */}
                  {!isRaw && activeOrder && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                      <span className="flex items-center gap-1.5">
                        <Factory className="h-3.5 w-3.5 text-amber-400" />
                        <span>
                          Usinage <strong>#{activeOrder.id}</strong> ({STATUS_LABELS[activeOrder.status]})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void onUpdateOrderStatus(activeOrder["@id"], "completed")
                        }
                        className="rounded-md bg-[#C9A96B] px-2.5 py-1 text-[11px] font-semibold text-[#0E0E0E] hover:bg-[#DFCA9F]"
                      >
                        Valider réception
                      </button>
                    </div>
                  )}

                  {/* Si matière première en cours de commande chez le fournisseur */}
                  {isRaw && item.supplierOrderStatus === "ordered" && (
                    <div className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 py-2 text-xs text-sky-200">
                      <span className="flex items-center gap-1.5 truncate mr-2">
                        <Truck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">
                          En commande fournisseur : <strong>+{item.supplierOrderQuantity || item.reorderQuantity} {item.unit}</strong>
                        </span>
                      </span>
                      {onReceiveSupplier && (
                        <button
                          type="button"
                          onClick={() => void onReceiveSupplier(item)}
                          className="shrink-0 rounded-md bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-[#0E0E0E] hover:bg-sky-400 transition-all shadow-xs"
                        >
                          Valider réception
                        </button>
                      )}
                    </div>
                  )}

                  {/* Si matière première sous seuil : bouton d'édition de bon de commande fournisseur */}
                  {isRaw && isAlert && item.supplierOrderStatus !== "ordered" && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <Truck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="truncate font-medium">
                          Seuil bas → Passer commande
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenOrderForStock(item)}
                        className="shrink-0 flex items-center gap-1 rounded-md bg-sky-500/20 border border-sky-500/50 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/30 transition-all"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Bon de commande (+{item.reorderQuantity})</span>
                      </button>
                    </div>
                  )}

                  {/* Actions rapides d'ajustement */}
                  <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                    <div className="flex items-center gap-1">
                      {[-10, -1, 1, 10].map((delta) => {
                        const isDisabled = delta < 0 && item.quantity <= 0;
                        return (
                          <button
                            key={delta}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => void onAdjustStock(item, delta)}
                            className="rounded-lg border border-white/10 bg-[#151517] px-2 py-1 font-mono text-xs text-[#8C8379] hover:bg-[#242426] hover:text-[#F7F5EF] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1">
                      {isRaw && (
                        <button
                          type="button"
                          onClick={() => handleOpenOrderForStock(item)}
                          title="Éditer un bon de commande pour ce composant"
                          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/20 transition-all flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          <span>BC</span>
                        </button>
                      )}
                      {onOpenQrPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenQrPrint({ stockItem: item, defaultQuantity: 1 })}
                          title="Imprimer étiquette(s) QR Code pour ce composant"
                          className="rounded-lg border border-white/10 bg-[#1E1E22] px-2 py-1 text-xs text-[#DFCA9F] hover:bg-[#242426] hover:text-white transition-all flex items-center gap-1"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>QR</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenStockModal(item)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-[#8C8379] hover:bg-[#242426] hover:text-[#F7F5EF] transition-colors"
                      >
                        Réglages
                      </button>
                      {!["patin_tpu", "socle_ciment", "plaque_bois"].includes(
                        item.code,
                      ) && (
                        <button
                          type="button"
                          onClick={() => void onDeleteStockItem(item)}
                          className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
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

          {/* 5. JOURNAL DES MOUVEMENTS PHYSIQUES RÉCENTS (FLASHS QR) */}
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#C9A96B]" />
                  <span>Journal des Mouvements Physiques (Traçabilité QR Code)</span>
                </h3>
                <p className="text-xs text-[#8C8379]">
                  Historique en temps réel des entrées en rayon et sorties d&apos;atelier enregistrées via douchette ou caméra
                </p>
              </div>
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="flex items-center gap-1.5 rounded-xl border border-[#C9A96B]/40 bg-[#C9A96B]/10 px-3 py-1.5 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20 transition-all"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Poste de Scan</span>
                </button>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              {stockMovements.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8C8379]">
                  <QrCode className="mx-auto h-8 w-8 text-neutral-600 mb-2 opacity-60" />
                  Aucun scan physique enregistré pour le moment. Flashez une étiquette pour démarrer la traçabilité.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                      <th className="py-2.5 px-3">Date &amp; Heure</th>
                      <th className="py-2.5 px-3">Mouvement</th>
                      <th className="py-2.5 px-3">Composant</th>
                      <th className="py-2.5 px-3 text-center">Quantité</th>
                      <th className="py-2.5 px-3">Référence / Lot</th>
                      <th className="py-2.5 px-3">Consigne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {stockMovements.slice(0, 15).map((mov) => {
                      const itemName =
                        typeof mov.stockItem === "object"
                          ? mov.stockItem.name
                          : mov.stockItem;
                      const isIn = mov.type === "in";

                      return (
                        <tr key={mov["@id"] || mov.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-[#8C8379] font-mono text-[11px]">
                            {new Date(mov.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                isIn
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              }`}
                            >
                              {isIn ? (
                                <>
                                  <ArrowDownCircle className="h-3 w-3" />
                                  <span>+ ENTRÉE RAYON</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="h-3 w-3" />
                                  <span>- SORTIE ATELIER</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#F7F5EF]">
                            {itemName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#F7F5EF]">
                            {isIn ? `+${mov.quantity}` : `-${mov.quantity}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#DFCA9F]">
                            {mov.reference || "Scan Manuel"}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400 text-[11px]">
                            {mov.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SOUS-VUE 2 : FOURNISSEURS & BONS DE COMMANDE D'APPROVISIONNEMENT */}
      {/* ========================================================================= */}
      {subView === "suppliers" && (
        <div className="flex flex-col gap-6">
          {/* STATS SYNTHÈSE FOURNISSEURS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="surface-card flex flex-col justify-between p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                Fournisseurs Référencés
              </span>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-[#F7F5EF]">
                  {suppliers.length}
                </span>
                <span className="text-xs text-[#8C8379]">partenaires actifs</span>
              </div>
              <span className="text-[11px] text-[#8C8379]">
                Bois alpins, polymères TPU, ciments, inserts &amp; puces NFC
              </span>
            </div>

            <div className="surface-card flex flex-col justify-between p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                Bons de Commande en Cours
              </span>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-sky-300">
                  {openSupplierOrdersCount}
                </span>
                <span className="text-xs text-[#8C8379]">bons actifs</span>
              </div>
              <span className="text-[11px] text-sky-200/80">
                {supplierOrders.filter((o) => o.status === "sent").length} commande(s) en transit fournisseur
              </span>
            </div>

            <div className="surface-card flex flex-col justify-between p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                Montant Engagé (HT)
              </span>
              <div className="my-2 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-extrabold text-[#DFCA9F]">
                  {totalCommittedPurchases.toFixed(2)} €
                </span>
                <span className="text-xs text-[#8C8379]">HT</span>
              </div>
              <span className="text-[11px] text-[#8C8379]">
                Total des commandes en cours de livraison
              </span>
            </div>
          </div>

          {/* SECTION A : BONS DE COMMANDE FOURNISSEURS */}
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#C9A96B]" />
                  <span>Historique des Bons de Commande Fournisseur</span>
                </h2>
                <p className="text-xs text-[#8C8379]">
                  Édition, impression conforme et suivi de réception des matières premières
                </p>
              </div>

              {/* FILTRES PAR STATUT DE COMMANDE */}
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#111113] p-1 text-xs">
                {(["all", "draft", "sent", "received", "cancelled"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      orderFilter === st
                        ? "bg-[#242426] text-[#F7F5EF] shadow-sm font-semibold"
                        : "text-[#8C8379] hover:text-[#F7F5EF]"
                    }`}
                  >
                    {st === "all"
                      ? `Tous (${supplierOrders.length})`
                      : st === "draft"
                      ? "Brouillons"
                      : st === "sent"
                      ? "Envoyés"
                      : st === "received"
                      ? "Réceptionnés"
                      : "Annulés"}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTE OU TABLE DES BONS DE COMMANDE */}
            <div className="mt-4 overflow-x-auto">
              {displayedSupplierOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8C8379]">
                  <FileText className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                  Aucun bon de commande trouvé pour ce filtre.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                      <th className="py-3 px-3">Réf. Bon</th>
                      <th className="py-3 px-3">Fournisseur</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Articles &amp; Qté</th>
                      <th className="py-3 px-3 text-right">Montant HT</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {displayedSupplierOrders.map((order) => {
                      const supplierName =
                        typeof order.supplier === "object" && order.supplier !== null
                          ? order.supplier.name
                          : String(order.supplier || "Fournisseur");

                      const badge = SUPPLIER_ORDER_BADGES[order.status] || SUPPLIER_ORDER_BADGES.draft;

                      return (
                        <tr
                          key={order["@id"]}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-3">
                            <span className="font-mono font-bold text-[#F7F5EF]">
                              {order.reference}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-[#DFCA9F]">{supplierName}</div>
                            {order.expectedDeliveryDate && (
                              <div className="text-[11px] text-[#8C8379] flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>Livraison : {new Date(order.expectedDeliveryDate).toLocaleDateString("fr-FR")}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-[#8C8379] font-mono">
                            {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-medium text-[#F7F5EF]">
                              {order.items?.map((it) => `${it.productName} (×${it.quantity} ${it.unit})`).join(", ") || "—"}
                            </div>
                            <div className="text-[10px] text-[#8C8379] font-mono mt-0.5">
                              {order.totalQuantity} unités au total
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-[#F7F5EF]">
                            {order.totalAmount ? `${Number(order.totalAmount).toFixed(2)} €` : "—"}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* IMPRIMER LE BON */}
                              {onPrintSupplierOrder && (
                                <button
                                  type="button"
                                  onClick={() => onPrintSupplierOrder(order)}
                                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1E1E22] px-2.5 py-1 text-xs text-[#F7F5EF] hover:bg-[#242426] hover:text-[#C9A96B] transition-all"
                                  title="Imprimer / Exporter le Bon de Commande"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>Imprimer</span>
                                </button>
                              )}

                              {/* ÉTIQUETTES QR CODE DU BON */}
                              {onOpenQrPrint && (
                                <button
                                  type="button"
                                  onClick={() => onOpenQrPrint({ supplierOrder: order })}
                                  className="flex items-center gap-1 rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-2.5 py-1 text-xs text-[#DFCA9F] hover:bg-[#C9A96B]/20 transition-all"
                                  title="Générer les étiquettes QR Code adhésives pour les articles de ce bon"
                                >
                                  <QrCode className="h-3.5 w-3.5" />
                                  <span>Étiquettes QR</span>
                                </button>
                              )}

                              {/* MARQUER ENVOYÉ */}
                              {order.status === "draft" && onSendSupplierOrder && (
                                <button
                                  type="button"
                                  onClick={() => void onSendSupplierOrder(order)}
                                  className="rounded-lg bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 transition-all"
                                  title="Marquer le bon comme envoyé au fournisseur"
                                >
                                  Envoyer
                                </button>
                              )}

                              {/* VALIDER RÉCEPTION DU STOCK */}
                              {order.status === "sent" && onReceiveSupplierOrder && (
                                <button
                                  type="button"
                                  onClick={() => void onReceiveSupplierOrder(order)}
                                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                                  title="Valider la livraison et incrémenter le stock"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Réceptionner</span>
                                </button>
                              )}

                              {/* MODIFIER */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSupplierOrder(order);
                                  setPreselectedStockForOrder(null);
                                  setOrderModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF] transition-all"
                                title="Modifier"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* SUPPRIMER */}
                              {onDeleteSupplierOrder && (
                                <button
                                  type="button"
                                  onClick={() => void onDeleteSupplierOrder(order)}
                                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SECTION B : RÉPERTOIRE DES FOURNISSEURS PARTENAIRES */}
          <div className="surface-card p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#C9A96B]" />
                  <span>Répertoire des Fournisseurs Partenaires</span>
                </h2>
                <p className="text-xs text-[#8C8379]">
                  Coordonnées directes, contacts atelier et délais moyens de livraison
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1E1E22] px-3 py-1.5 text-xs font-semibold text-[#DFCA9F] hover:bg-[#242426] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter un Fournisseur</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((sup) => (
                <div
                  key={sup["@id"]}
                  className="rounded-2xl border border-white/[0.06] bg-[#101012] p-4 flex flex-col justify-between gap-3 hover:border-white/15 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#F7F5EF]">{sup.name}</h3>
                        {sup.contactName && (
                          <div className="text-xs text-[#C9A96B] font-medium mt-0.5">
                            Contact : {sup.contactName}
                          </div>
                        )}
                      </div>
                      <span className="rounded-md bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-[#8C8379]">
                        ~{sup.leadTimeDays || 5} jours
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-[#8C8379]">
                      {sup.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-[#8C8379]/70" />
                          <span className="truncate">{sup.email}</span>
                        </div>
                      )}
                      {sup.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-[#8C8379]/70" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                      {sup.address && (
                        <p className="text-[11px] text-[#8C8379]/80 line-clamp-2 mt-1">
                          📍 {sup.address}
                        </p>
                      )}
                      {sup.notes && (
                        <div className="mt-2 rounded-lg bg-white/[0.03] p-2 text-[11px] text-[#DFCA9F]/80">
                          {sup.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplierOrder(null);
                        setPreselectedStockForOrder(null);
                        setOrderModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Bon de commande</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSupplier(sup);
                          setSupplierModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-[#8C8379] hover:bg-white/[0.06] hover:text-[#F7F5EF] transition-all"
                        title="Modifier le fournisseur"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {onDeleteSupplier && (
                        <button
                          type="button"
                          onClick={() => void onDeleteSupplier(sup)}
                          className="rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 1 : NOUVEAU COMPOSANT DE STOCK */}
      {/* ========================================================================= */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="surface-card flex w-full max-w-lg flex-col gap-4 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#F7F5EF]">
                  Nouveau Composant de Stock
                </h2>
                <p className="text-xs text-[#8C8379]">
                  Sélectionnez le type de stock pour gérer son réapprovisionnement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-sm text-[#8C8379] hover:text-[#F7F5EF]"
              >
                ✕
              </button>
            </div>

            {/* Sélecteur de type de stock */}
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-[#8C8379] uppercase tracking-wider">
                Catégorie de Stock
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("pre_produced")}
                  className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                    newType === "pre_produced"
                      ? "border-[#C9A96B] bg-[#C9A96B]/15 text-[#DFCA9F]"
                      : "border-white/10 bg-[#111113] text-[#8C8379] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="h-3.5 w-3.5 text-[#C9A96B]" />
                    <span>Produit Préproduit</span>
                  </div>
                  <span className="text-[11px] leading-snug">
                    Usiné en atelier en avance, en attente de personnalisation &amp; expédition client.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewType("raw_material")}
                  className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                    newType === "raw_material"
                      ? "border-sky-500 bg-sky-500/15 text-sky-300"
                      : "border-white/10 bg-[#111113] text-[#8C8379] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Truck className="h-3.5 w-3.5 text-sky-400" />
                    <span>Matière Première</span>
                  </div>
                  <span className="text-[11px] leading-snug">
                    Commandée auprès d&apos;un fournisseur externe (puces, plots de bois, laiton, sacs ciment).
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
                Désignation de la pièce
                <input
                  type="text"
                  required
                  placeholder={
                    newType === "pre_produced"
                      ? "ex: Support Bois Ébauche 15x10cm"
                      : "ex: Puces NFC NTAG213 Rouleau"
                  }
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
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
                Code référence interne
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 font-mono text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                />
              </label>
            </div>

            {newType === "raw_material" && (
              <label className="flex flex-col gap-1 text-xs text-sky-300">
                Fournisseur externe attitré
                <input
                  type="text"
                  placeholder="ex: Scierie Mont-Blanc, Alpes RFID, Extrud3D..."
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="rounded-xl border border-sky-500/30 bg-[#111113] px-3 py-2 text-sm text-[#F7F5EF] focus:border-sky-400 focus:outline-hidden"
                />
              </label>
            )}

            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
                Quantité initiale
                <input
                  type="number"
                  min="0"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 font-mono text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
                Seuil alerte
                <input
                  type="number"
                  min={0}
                  required
                  value={newThreshold}
                  onChange={(e) =>
                    setNewThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 font-mono text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
                Lot réappro
                <input
                  type="number"
                  min={1}
                  required
                  value={newReorder}
                  onChange={(e) =>
                    setNewReorder(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 font-mono text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs text-[#8C8379]">
              Unité de comptage
              <input
                type="text"
                required
                placeholder="pcs, m², sac, kg, plots..."
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 text-sm text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-hidden"
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-white/10 px-3.5 py-1.5 text-xs text-[#8C8379] hover:bg-[#242426] hover:text-[#F7F5EF] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary-gold rounded-xl px-4 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {saving ? "Création…" : "Créer le composant"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 2 : ÉDITION / CRÉATION D'UN BON DE COMMANDE FOURNISSEUR */}
      {/* ========================================================================= */}
      {orderModalOpen && onCreateSupplierOrder && (
        <SupplierOrderModal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          order={editingSupplierOrder}
          suppliers={suppliers}
          stockItems={stockItems}
          preselectedStockItem={preselectedStockForOrder}
          onSave={async (payload) => {
            if (payload.id && onUpdateSupplierOrder) {
              await onUpdateSupplierOrder(payload);
            } else {
              await onCreateSupplierOrder(payload);
            }
          }}
          onOpenCreateSupplier={() => {
            setOrderModalOpen(false);
            setEditingSupplier(null);
            setSupplierModalOpen(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODALE 3 : ÉDITION / CRÉATION D'UN FOURNISSEUR */}
      {/* ========================================================================= */}
      {supplierModalOpen && (
        <SupplierEditModal
          isOpen={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          supplier={editingSupplier}
          onSave={async (payload) => {
            if (payload.id && onUpdateSupplier) {
              await onUpdateSupplier(payload);
            } else if (onCreateSupplier) {
              await onCreateSupplier(payload);
            }
          }}
        />
      )}
    </div>
  );
}
