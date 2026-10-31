"use client";

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  API_ORIGIN,
  API_URL,
  MERCURE_URL,
  UnauthorizedError,
  apiFetch,
  clearToken,
  getToken,
  getTokenRoles,
} from "@/lib/api";
import type {
  AccountSummary,
  ErpTab,
  NfcTagItem,
  Order,
  OrderItem,
  PropertyItem,
  StockCategory,
  StockItem,
  SupportIssueType,
  SupportTicketItem,
  UserItem,
  ZoneItem,
  Supplier,
  SupplierOrder,
  SupplierOrderStatusType,
  StockMovement,
  StockMovementType,
} from "@/types/erp";
import { Sidebar } from "@/components/erp/Sidebar";
import { StocksView } from "@/components/erp/StocksView";
import { ClientsView, NfcTagsView, SupportTicketsView } from "@/components/erp/CatalogViews";
import { AccountsView } from "@/components/erp/AccountsView";
import { UsersView } from "@/components/erp/UsersView";
import { PropertiesView } from "@/components/erp/PropertiesView";
import {
  WorkOrderPrintModal,
  formatOrderBarcode,
  parseScannedOrderId,
} from "@/components/erp/WorkOrderPrintModal";
import { SupplierOrderPrintModal } from "@/components/erp/SupplierOrderPrintModal";
import { StockQrPrintModal, type StockQrPrintTarget } from "@/components/erp/StockQrPrintModal";
import { StockQrScannerModal } from "@/components/erp/StockQrScannerModal";
import { NfcEncodingModal } from "@/components/erp/NfcEncodingModal";
import { AtelierStatsOverview } from "@/components/erp/AtelierStatsOverview";
import { AtelierDashboardHome } from "@/components/erp/AtelierDashboardHome";

const COLUMNS = [
  { id: "pending", title: "En attente", color: "border-amber-500/40 bg-amber-500/5 text-amber-400" },
  { id: "processing", title: "En fabrication", color: "border-sky-500/40 bg-sky-500/5 text-sky-400" },
  { id: "quality_check", title: "Contrôle & Encodage", color: "border-purple-500/40 bg-purple-500/5 text-purple-400" },
  { id: "completed", title: "Terminé", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" },
] as const;

type OrderFilter = "all" | "client" | "stock";

// Jeton lu depuis localStorage. `undefined` = rendu serveur / hydratation (encore inconnu).
const subscribeToken = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const getServerToken = (): string | null | undefined => undefined;

function extractMembers<T>(data: unknown): T[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.member)) return obj.member as T[];
  if (Array.isArray(obj["hydra:member"])) return obj["hydra:member"] as T[];
  return Array.isArray(data) ? (data as T[]) : [];
}

export default function VaAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ErpTab>("overview");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("" );

  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [nfcTags, setNfcTags] = useState<NfcTagItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [printingSupplierOrder, setPrintingSupplierOrder] = useState<SupplierOrder | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [qrPrintTarget, setQrPrintTarget] = useState<StockQrPrintTarget | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState<boolean>(false);

  const [connected, setConnected] = useState<boolean>(false);
  const [mercureTopic, setMercureTopic] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modale création / édition de fiche commande
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formIsStockOrder, setFormIsStockOrder] = useState<boolean>(false);
  const [formTargetStockIri, setFormTargetStockIri] = useState<string>("");
  const [formAccountIri, setFormAccountIri] = useState<string>("");
  const [formStatus, setFormStatus] = useState<Order["status"]>("pending");
  const [formWorkshopNotes, setFormWorkshopNotes] = useState<string>("");
  const [formTrackingNumber, setFormTrackingNumber] = useState<string>("");
  const [formItems, setFormItems] = useState<OrderItem[]>([
    { productName: "Support Comptoir NFC Bois", quantity: 1 },
  ]);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);

  // Modale édition seuil & stock d'un composant
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [stockFormQty, setStockFormQty] = useState<number>(0);
  const [stockFormThreshold, setStockFormThreshold] = useState<number>(10);
  const [stockFormReorder, setStockFormReorder] = useState<number>(50);

  // Modale Bon de Fabrication imprimable avec code-barres
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const printingOrder = orders.find((o) => o.id === printingOrderId) ?? null;

  // Modale Poste d'Encodage NFC Atelier
  const [encodingOrderId, setEncodingOrderId] = useState<number | null>(null);
  const encodingOrder = orders.find((o) => o.id === encodingOrderId) ?? null;

  const token = useSyncExternalStore<string | null | undefined>(subscribeToken, getToken, getServerToken);
  const authReady = typeof token === "string";
  const isAdmin = authReady && getTokenRoles().includes("ROLE_ADMIN");

  const scanBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    router.replace("/va-admin/login");
  }, [router]);

  const logout = () => handleUnauthorized();

  // 0. Garde d'authentification : accès strictement réservé aux administrateurs atelier
  useEffect(() => {
    if (token === null) {
      router.replace("/va-admin/login");
    } else if (authReady && !isAdmin) {
      router.replace("/va-admin/login?error=forbidden");
    }
  }, [token, authReady, isAdmin, router]);

  const refreshAllData = useCallback(async () => {
    if (!authReady) return;
    try {
      const [ordRes, accRes, propRes, zoneRes, ticketRes] = await Promise.all([
        apiFetch(`${API_URL}/orders`),
        apiFetch(`${API_URL}/accounts`),
        apiFetch(`${API_URL}/properties`),
        apiFetch(`${API_URL}/zones`),
        apiFetch(`${API_URL}/support_tickets`),
      ]);

      const topic = ordRes.headers.get("X-Mercure-Topic") ?? `${API_ORIGIN}/api/orders/{id}`;
      const [ordData, accData, propData, zoneData, ticketData] = await Promise.all([
        ordRes.json(),
        accRes.json(),
        propRes.json(),
        zoneRes.json(),
        ticketRes.json(),
      ]);

      setOrders(extractMembers<Order>(ordData));
      setAccounts(extractMembers<AccountSummary>(accData));
      setProperties(extractMembers<PropertyItem>(propData));
      setZones(extractMembers<ZoneItem>(zoneData));
      setSupportTickets(extractMembers<SupportTicketItem>(ticketData));
      setMercureTopic((prev) => prev ?? topic);

      if (isAdmin) {
        const [siRes, nfcRes, usrRes, supRes, soRes, smRes] = await Promise.all([
          apiFetch(`${API_URL}/stock_items`),
          apiFetch(`${API_URL}/nfc_tags`),
          apiFetch(`${API_URL}/users`),
          apiFetch(`${API_URL}/suppliers`),
          apiFetch(`${API_URL}/supplier_orders`),
          apiFetch(`${API_URL}/stock_movements`),
        ]);
        const [siData, nfcData, usrData, supData, soData, smData] = await Promise.all([
          siRes.json(),
          nfcRes.json(),
          usrRes.json(),
          supRes.json(),
          soRes.json(),
          smRes.json(),
        ]);
        setStockItems(extractMembers<StockItem>(siData));
        setNfcTags(extractMembers<NfcTagItem>(nfcData));
        setUsers(extractMembers<UserItem>(usrData));
        setSuppliers(extractMembers<Supplier>(supData));
        setSupplierOrders(extractMembers<SupplierOrder>(soData));
        setStockMovements(extractMembers<StockMovement>(smData));
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur chargement ERP :", err);
    }
  }, [authReady, isAdmin, handleUnauthorized]);

  // 1. Récupération initiale des données (+ pose du cookie Mercure)
  useEffect(() => {
    if (!authReady) return;
    void Promise.resolve().then(() => refreshAllData());
  }, [authReady, refreshAllData]);

  // 2. Abonnement temps réel Mercure SSE (commandes clients + fiches stock + stock_items)
  useEffect(() => {
    if (!mercureTopic) return;
    const hubUrl = new URL(MERCURE_URL);
    hubUrl.searchParams.append("topic", mercureTopic);
    if (isAdmin) {
      hubUrl.searchParams.append("topic", `${API_ORIGIN}/api/stock_items/{id}`);
    }

    const eventSource = new EventSource(hubUrl.toString(), { withCredentials: true });

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const iri: string = payload?.["@id"] ?? "";

        if (iri.startsWith("/api/orders/")) {
          if (!payload.status) {
            setOrders((prev) => prev.filter((o) => o["@id"] !== iri));
            return;
          }
          const updatedOrder = payload as Order;
          setOrders((prev) => {
            const index = prev.findIndex((o) => o["@id"] === updatedOrder["@id"]);
            if (index > -1) {
              const next = [...prev];
              next[index] = updatedOrder;
              return next;
            }
            return [updatedOrder, ...prev];
          });
        } else if (iri.startsWith("/api/stock_items/")) {
          if (typeof payload.quantity !== "number") {
            setStockItems((prev) => prev.filter((s) => s["@id"] !== iri));
            return;
          }
          const updatedItem = payload as StockItem;
          setStockItems((prev) => {
            const idx = prev.findIndex((s) => s["@id"] === iri);
            if (idx > -1) {
              const next = [...prev];
              next[idx] = updatedItem;
              return next;
            }
            return [...prev, updatedItem];
          });
        }
      } catch (err) {
        console.error("Format de message SSE invalide :", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [mercureTopic, isAdmin]);

  // 3. Mutation de statut d'une commande (client ou stock)
  const updateStatus = async (orderIri: string, newStatus: Order["status"]) => {
    try {
      setError(null);
      const res = await apiFetch(orderIri, {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 403) {
        setError("Action refusée : seul le staff atelier peut changer le statut d'une commande.");
        return;
      }
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Échec de mise à jour du statut :", err);
    }
  };

  // Suppression d'une fiche commande
  const deleteOrder = async (order: Order) => {
    if (!window.confirm(`Supprimer définitivement la fiche CMD #${order.id} ?`)) return;
    try {
      setError(null);
      const res = await apiFetch(order["@id"], { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setOrders((prev) => prev.filter((o) => o["@id"] !== order["@id"]));
      } else {
        setError("Impossible de supprimer la fiche commande.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur suppression commande :", err);
    }
  };

  // Ouverture modale création / édition de fiche
  const openCreateModal = (defaultStockOrder = false) => {
    setEditingOrder(null);
    setFormIsStockOrder(defaultStockOrder);
    setFormTargetStockIri(stockItems[0]?.["@id"] ?? "");
    setFormAccountIri(accounts[0]?.["@id"] ?? "/api/accounts/1");
    setFormStatus("pending");
    setFormWorkshopNotes("");
    setFormTrackingNumber("");
    setFormItems(
      defaultStockOrder
        ? [
            {
              productName: `Réapprovisionnement stock : ${stockItems[0]?.name ?? "Composant"}`,
              quantity: stockItems[0]?.reorderQuantity ?? 50,
            },
          ]
        : [{ productName: "Support Comptoir NFC Bois", quantity: 1 }],
    );
    setModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormIsStockOrder(Boolean(order.isStockOrder));
    setFormTargetStockIri(order.targetStockItem?.["@id"] ?? stockItems[0]?.["@id"] ?? "");
    const accIri =
      typeof order.account === "object" && order.account !== null
        ? order.account["@id"]
        : typeof order.account === "string"
          ? order.account
          : accounts[0]?.["@id"] ?? "/api/accounts/1";
    setFormAccountIri(accIri);
    setFormStatus(order.status);
    setFormWorkshopNotes(order.workshopNotes ?? "");
    setFormTrackingNumber(order.trackingNumber ?? "");
    setFormItems(
      order.orderItems && order.orderItems.length > 0
        ? order.orderItems.map((it) => ({
            productName: it.productName,
            quantity: it.quantity,
          }))
        : [{ productName: "Support Comptoir NFC Bois", quantity: 1 }],
    );
    setModalOpen(true);
  };

  const prefillFromPropertyZones = (propertyIri: string) => {
    const prop = properties.find((p) => p["@id"] === propertyIri);
    const propZones = zones.filter((z) => z.property === propertyIri);
    if (propZones.length === 0) return;

    setFormItems(
      propZones.map((z) => ({
        productName: `Support ${z.mountType || "Comptoir"} NFC Bois — ${z.name}${prop ? ` (${prop.name})` : ""}`,
        quantity: 1,
      })),
    );
  };

  const saveOrderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrder(true);
    setError(null);
    try {
      const cleanItems = formItems
        .map((it) => ({
          productName: it.productName.trim(),
          quantity: Math.max(1, Number(it.quantity) || 1),
        }))
        .filter((it) => it.productName.length > 0);

      const payload: Record<string, unknown> = {
        isStockOrder: formIsStockOrder,
        targetStockItem: formIsStockOrder ? formTargetStockIri || null : null,
        account: formIsStockOrder ? null : formAccountIri,
        status: formStatus,
        workshopNotes: formWorkshopNotes.trim() || null,
        trackingNumber: formTrackingNumber.trim() || null,
        orderItems: cleanItems,
      };

      const res = editingOrder
        ? await apiFetch(editingOrder["@id"], {
            method: "PATCH",
            headers: { "Content-Type": "application/merge-patch+json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/ld+json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        setError("Échec de l'enregistrement de la fiche commande.");
        return;
      }

      setModalOpen(false);
      await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      setError("Erreur lors de la sauvegarde de la fiche.");
    } finally {
      setSavingOrder(false);
    }
  };

  // Ajustement rapide ou via modale du stock (ne peut jamais être négatif)
  const adjustStockQuantity = async (item: StockItem, delta: number) => {
    try {
      const targetQty = Math.max(0, item.quantity + delta);
      const res = await apiFetch(item["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ quantity: targetQty }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur ajustement stock :", err);
    }
  };

  // Passer commande d'une matière première auprès d'un fournisseur externe
  const handleOrderSupplier = async (item: StockItem) => {
    try {
      const res = await apiFetch(item["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({
          supplierOrderStatus: "ordered",
          supplierOrderQuantity: item.reorderQuantity,
        }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur commande fournisseur :", err);
    }
  };

  // Réceptionner la livraison d'une commande fournisseur
  const handleReceiveSupplier = async (item: StockItem) => {
    try {
      const qtyToAdd = item.supplierOrderQuantity || item.reorderQuantity;
      const targetQty = Math.max(0, item.quantity + qtyToAdd);
      const res = await apiFetch(item["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({
          quantity: targetQty,
          supplierOrderStatus: "none",
          supplierOrderQuantity: null,
        }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur réception fournisseur :", err);
    }
  };

  // Gestion des Fournisseurs
  const createSupplier = async (payload: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    leadTimeDays: number;
    notes?: string | null;
  }) => {
    try {
      const res = await apiFetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/ld+json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur création fournisseur :", err);
    }
  };

  const updateSupplier = async (payload: {
    id?: number;
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    leadTimeDays: number;
    notes?: string | null;
  }) => {
    if (!payload.id) return;
    try {
      const res = await apiFetch(`${API_URL}/suppliers/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur mise à jour fournisseur :", err);
    }
  };

  const deleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`Supprimer définitivement le fournisseur ${supplier.name} ?`)) return;
    try {
      const res = await apiFetch(supplier["@id"], { method: "DELETE" });
      if (res.ok || res.status === 204) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur suppression fournisseur :", err);
    }
  };

  // Gestion des Bons de Commande Fournisseur
  const createSupplierOrder = async (payload: {
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
  }) => {
    try {
      const body = {
        reference: payload.reference,
        supplier: payload.supplierIri,
        status: payload.status,
        expectedDeliveryDate: payload.expectedDeliveryDate,
        notes: payload.notes,
        items: payload.items.map((it) => ({
          stockItem: it.stockItemIri || null,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
        })),
      };
      const res = await apiFetch(`${API_URL}/supplier_orders`, {
        method: "POST",
        headers: { "Content-Type": "application/ld+json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur création bon de commande :", err);
    }
  };

  const updateSupplierOrder = async (payload: {
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
  }) => {
    if (!payload.id) return;
    try {
      const body = {
        reference: payload.reference,
        supplier: payload.supplierIri,
        status: payload.status,
        expectedDeliveryDate: payload.expectedDeliveryDate,
        notes: payload.notes,
        items: payload.items.map((it) => ({
          stockItem: it.stockItemIri || null,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
        })),
      };
      const res = await apiFetch(`${API_URL}/supplier_orders/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur modification bon de commande :", err);
    }
  };

  const sendSupplierOrder = async (order: SupplierOrder) => {
    try {
      const res = await apiFetch(order["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur envoi bon de commande :", err);
    }
  };

  const receiveSupplierOrder = async (order: SupplierOrder) => {
    try {
      const res = await apiFetch(order["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ status: "received" }),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur réception bon de commande :", err);
    }
  };

  const deleteSupplierOrder = async (order: SupplierOrder) => {
    if (!window.confirm(`Supprimer définitivement le bon de commande ${order.reference} ?`)) return;
    try {
      const res = await apiFetch(order["@id"], { method: "DELETE" });
      if (res.ok || res.status === 204) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur suppression bon de commande :", err);
    }
  };

  // Traçabilité physique des Mouvements de Stock (Scan QR Code)
  const processStockMovement = async (payload: {
    stockItem: StockItem;
    type: StockMovementType;
    quantity: number;
    reference?: string | null;
    notes?: string | null;
  }) => {
    try {
      const res = await apiFetch(`${API_URL}/stock_movements`, {
        method: "POST",
        headers: { "Content-Type": "application/ld+json" },
        body: JSON.stringify({
          stockItem: payload.stockItem["@id"],
          type: payload.type,
          quantity: Math.max(1, payload.quantity),
          reference: payload.reference || null,
          notes: payload.notes || null,
        }),
      });
      if (res.ok) await refreshAllData();
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur enregistrement mouvement stock :", err);
    }
  };

  const createStockItem = async (payload: {
    code: string;
    name: string;
    quantity: number;
    alertThreshold: number;
    reorderQuantity: number;
    unit: string;
    type?: StockCategory;
    supplier?: string | null;
  }) => {
    try {
      const res = await apiFetch(`${API_URL}/stock_items`, {
        method: "POST",
        headers: { "Content-Type": "application/ld+json" },
        body: JSON.stringify({
          ...payload,
          quantity: Math.max(0, payload.quantity),
        }),
      });
      if (res.ok) {
        await refreshAllData();
      } else {
        setError("Impossible de créer ce composant de stock.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur création stock :", err);
    }
  };

  const deleteStockItem = async (item: StockItem) => {
    if (!window.confirm(`Supprimer le composant "${item.name}" ?`)) return;
    try {
      const res = await apiFetch(item["@id"], { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setStockItems((prev) => prev.filter((s) => s["@id"] !== item["@id"]));
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur suppression stock :", err);
    }
  };

  const openStockModal = (item: StockItem) => {
    setEditingStock(item);
    setStockFormQty(item.quantity);
    setStockFormThreshold(item.alertThreshold);
    setStockFormReorder(item.reorderQuantity);
  };

  const saveStockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      const res = await apiFetch(editingStock["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({
          quantity: Math.max(0, Number(stockFormQty)),
          alertThreshold: Math.max(0, Number(stockFormThreshold)),
          reorderQuantity: Math.max(1, Number(stockFormReorder)),
        }),
      });
      if (res.ok) {
        setEditingStock(null);
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur mise à jour paramètre stock :", err);
    }
  };

  // Actions pour les onglets Clients, Tags NFC et Support
  const createAccount = async (payload: {
    name: string;
    type: string;
    contactEmail?: string;
    contactPhone?: string;
    billingAddress?: string;
    notes?: string;
  }) => {
    const res = await apiFetch(`${API_URL}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await refreshAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err["hydra:description"] || "Impossible de créer ce compte client.");
    }
  };

  const updateAccount = async (
    accountIri: string,
    payload: {
      name: string;
      type: string;
      contactEmail?: string;
      contactPhone?: string;
      billingAddress?: string;
      notes?: string;
    },
  ) => {
    const res = await apiFetch(accountIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await refreshAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err["hydra:description"] || "Impossible de modifier ce compte client.");
    }
  };

  const deleteAccount = async (accountIri: string) => {
    if (
      !window.confirm(
        "Supprimer ce compte client ainsi que ses propriétés et commandes rattachées ?",
      )
    )
      return;
    const res = await apiFetch(accountIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await refreshAllData();
  };

  const createUser = async (payload: {
    email: string;
    plainPassword: string;
    account: string;
    roles?: string[];
    properties?: string[];
  }): Promise<boolean> => {
    setError(null);
    const res = await apiFetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify({
        email: payload.email,
        plainPassword: payload.plainPassword,
        account: payload.account,
        roles: payload.roles ?? ["ROLE_USER"],
        properties: payload.properties ?? [],
      }),
    });
    if (res.ok) {
      await refreshAllData();
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      setError(
        err["hydra:description"] ||
          "Impossible de créer cet accès utilisateur (email déjà utilisé ou mot de passe < 8 car.)."
      );
      return false;
    }
  };

  const updateUser = async (
    userIri: string,
    payload: {
      email?: string;
      account?: string;
      roles?: string[];
      properties?: string[];
    }
  ): Promise<boolean> => {
    setError(null);
    const res = await apiFetch(userIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await refreshAllData();
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      setError(
        err["hydra:description"] ||
          "Impossible de mettre à jour les informations de cet utilisateur."
      );
      return false;
    }
  };

  const regenerateUserPassword = async (
    userId: number,
    payload?: { customPassword?: string; notifyEmail?: boolean }
  ) => {
    setError(null);
    try {
      const res = await apiFetch(
        `${API_URL}/admin/users/${userId}/regenerate-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload ?? {}),
        }
      );
      if (res.ok) {
        const data = await res.json();
        await refreshAllData();
        return data as {
          success: boolean;
          temporaryPassword: string;
          emailSent: boolean;
          message: string;
        };
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Erreur lors de la régénération du mot de passe.");
        return null;
      }
    } catch {
      setError("Erreur de connexion au serveur.");
      return null;
    }
  };

  const sendUserResetLink = async (userId: number) => {
    setError(null);
    try {
      const res = await apiFetch(
        `${API_URL}/admin/users/${userId}/send-reset-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data as {
          success: boolean;
          resetUrl: string;
          code: string;
          emailSent: boolean;
          message: string;
        };
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Impossible d'envoyer le lien de réinitialisation.");
        return null;
      }
    } catch {
      setError("Erreur de connexion au serveur.");
      return null;
    }
  };

  const updateUserPassword = async (userIri: string, plainPassword: string) => {
    setError(null);
    const res = await apiFetch(userIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify({ plainPassword }),
    });
    if (res.ok) {
      await refreshAllData();
    } else {
      setError("Impossible de mettre à jour le mot de passe (minimum 8 caractères).");
    }
  };

  const deleteUser = async (userIri: string) => {
    if (!window.confirm("Révoquer cet accès utilisateur ?")) return;
    const res = await apiFetch(userIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await refreshAllData();
  };

  const createProperty = async (payload: {
    name: string;
    account: string;
    address?: string;
    resort?: string;
    typology?: string;
    capacity?: number;
    bedrooms?: number;
    keyBoxCode?: string;
    coverImageUrl?: string;
    wifiSSID?: string;
    wifiPassword?: string;
    wifiAccessCode?: string;
    externalGuideUrl?: string;
    instructions?: string;
  }) => {
    const res = await apiFetch(`${API_URL}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await refreshAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err["hydra:description"] || "Impossible de créer ce logement.");
    }
  };

  const updateProperty = async (
    propertyIri: string,
    payload: {
      name?: string;
      account?: string;
      address?: string;
      resort?: string;
      typology?: string;
      capacity?: number;
      bedrooms?: number;
      keyBoxCode?: string;
      coverImageUrl?: string;
      wifiSSID?: string | null;
      wifiPassword?: string | null;
      wifiAccessCode?: string | null;
      externalGuideUrl?: string | null;
      instructions?: string | null;
    },
  ) => {
    const res = await apiFetch(propertyIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await refreshAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err["hydra:description"] || "Impossible de modifier ce logement.");
    }
  };

  const updateAssignedUsers = async (
    propertyId: number,
    userIris: string[]
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(
        `${API_URL}/properties/${propertyId}/assigned-users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIris }),
        }
      );
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const revealPropertyWifi = async (propertyId: number) => {
    try {
      const res = await apiFetch(`${API_URL}/properties/${propertyId}/reveal-wifi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errBody.error ?? "Impossible de révéler les identifiants Wi-Fi.");
        return null;
      }
      return (await res.json()) as {
        wifiSSID: string | null;
        wifiPassword: string | null;
        wifiProtectedByCode: boolean;
        wifiQrPayload: string | null;
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleUnauthorized();
      }
      return null;
    }
  };

  const deleteProperty = async (propertyIri: string) => {
    if (!window.confirm("Supprimer cette propriété et ses zones ?")) return;
    const res = await apiFetch(propertyIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await refreshAllData();
  };

  const createZone = async (payload: {
    name: string;
    mountType: string;
    property: string;
  }) => {
    const res = await apiFetch(`${API_URL}/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
  };

  const updateZone = async (
    zoneIri: string,
    payload: { name: string; mountType: string },
  ) => {
    const res = await apiFetch(zoneIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
  };

  const deleteZone = async (zoneIri: string) => {
    if (!window.confirm("Supprimer cette zone ?")) return;
    const res = await apiFetch(zoneIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await refreshAllData();
  };

  const assignTagToZone = async (tagIri: string, zoneIri: string | null) => {
    await updateNfcTag(tagIri, {
      zone: zoneIri,
      status: zoneIri ? "assigned" : "encoded",
    });
  };

  const createNfcTag = async (payload: { shortUid: string; status: NfcTagItem["status"] }) => {
    const res = await apiFetch(`${API_URL}/nfc_tags`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
    else setError("Échec création Tag NFC (UID déjà utilisé ou invalide).");
  };

  const updateNfcTag = async (
    tagIri: string,
    payload: {
      status?: NfcTagItem["status"];
      zone?: string | null;
      orderItem?: string | null;
    },
  ) => {
    const res = await apiFetch(tagIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
  };

  const encodeTagForOrderItem = async (payload: {
    existingTagIri?: string;
    shortUid: string;
    orderItemIri: string;
    zoneIri?: string | null;
  }) => {
    setError(null);
    const targetStatus: NfcTagItem["status"] = payload.zoneIri ? "assigned" : "encoded";
    const res = payload.existingTagIri
      ? await apiFetch(payload.existingTagIri, {
          method: "PATCH",
          headers: { "Content-Type": "application/merge-patch+json" },
          body: JSON.stringify({
            orderItem: payload.orderItemIri,
            zone: payload.zoneIri ?? null,
            status: targetStatus,
          }),
        })
      : await apiFetch(`${API_URL}/nfc_tags`, {
          method: "POST",
          headers: { "Content-Type": "application/ld+json" },
          body: JSON.stringify({
            shortUid: payload.shortUid,
            orderItem: payload.orderItemIri,
            zone: payload.zoneIri ?? null,
            status: targetStatus,
          }),
        });

    if (res.ok) {
      await refreshAllData();
    } else {
      setError("Impossible d'encoder ce tag NFC (vérifiez que l'UID court est unique).");
    }
  };

  const unlinkTag = async (tagIri: string) => {
    await updateNfcTag(tagIri, {
      orderItem: null,
      zone: null,
      status: "stock",
    });
  };

  const createQuickZone = async (payload: {
    name: string;
    mountType: string;
    property: string;
  }): Promise<ZoneItem | null> => {
    const res = await apiFetch(`${API_URL}/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const created = (await res.json()) as ZoneItem;
    await refreshAllData();
    return created;
  };

  const deleteNfcTag = async (tagIri: string) => {
    if (!window.confirm("Supprimer ce tag NFC ?")) return;
    const res = await apiFetch(tagIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await refreshAllData();
  };

  const replaceDefectiveNfcTag = async (oldTag: NfcTagItem, newShortUid: string) => {
    setError(null);
    const prevZone = oldTag.zone ?? null;
    const prevOrderItem = oldTag.orderItem ?? null;

    // 1. Marquer l'ancienne puce comme défectueuse et libérer sa zone / ligne de commande
    const resOld = await apiFetch(oldTag["@id"], {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify({
        status: "defective",
        zone: null,
        orderItem: null,
      }),
    });

    if (!resOld.ok) {
      setError("Impossible de basculer la puce actuelle en défectueuse.");
      return;
    }

    // 2. Créer la nouvelle puce de remplacement et lui transférer la zone et la commande
    const resNew = await apiFetch(`${API_URL}/nfc_tags`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify({
        shortUid: newShortUid.trim().toUpperCase(),
        status: prevZone ? "assigned" : prevOrderItem ? "encoded" : "stock",
        zone: prevZone,
        orderItem: prevOrderItem,
      }),
    });

    if (!resNew.ok) {
      setError("La puce a été marquée défectueuse, mais l'UID de remplacement existe déjà.");
    }
    await refreshAllData();
  };

  const createTicket = async (payload: {
    subject: string;
    message: string;
    account: string;
    issueType?: SupportIssueType;
    property?: string | null;
    nfcTag?: string | null;
  }) => {
    const res = await apiFetch(`${API_URL}/support_tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
  };

  const updateTicket = async (
    ticketIri: string,
    payload: Partial<
      Pick<SupportTicketItem, "status" | "aiDraft" | "isAiResolved" | "issueType">
    >,
  ) => {
    const res = await apiFetch(ticketIri, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await refreshAllData();
  };

  const processHardwareScan = (code: string) => {
    setLastScanned(code);

    // Si flash d'un QR code de stock (ex: VA-STOCK:bois_meleze_brut:BC-2026-0001:1)
    if (code.startsWith("VA-STOCK:")) {
      setQrScannerOpen(true);
      return;
    }

    const orderId = parseScannedOrderId(code);
    if (orderId === null) return;

    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const currentIndex = COLUMNS.findIndex((c) => c.id === targetOrder.status);
    if (currentIndex < COLUMNS.length - 1) {
      const nextStatus = COLUMNS[currentIndex + 1].id;
      void updateStatus(targetOrder["@id"], nextStatus);
    }
  };

  // 4. Capture matériel USB (ignorée quand un champ de formulaire a le focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime.current > 60) {
        scanBuffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        const scannedCode = scanBuffer.current.trim();
        if (scannedCode.length > 0) {
          processHardwareScan(scannedCode);
        }
        scanBuffer.current = "";
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Métriques pour la barre latérale et les filtres
  const lowStockItems = stockItems.filter((s) => s.quantity <= s.alertThreshold);
  const lowStockCount = lowStockItems.length;
  const activeOrdersCount = orders.filter((o) => o.status !== "completed").length;
  const openTicketsCount = supportTickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  const clientOrdersCount = orders.filter((o) => !o.isStockOrder).length;
  const stockOrdersCount = orders.filter((o) => o.isStockOrder).length;

  const filteredOrders = orders.filter((order) => {
    if (hideCompleted && order.status === "completed") return false;
    if (orderFilter === "client" && order.isStockOrder) return false;
    if (orderFilter === "stock" && !order.isStockOrder) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchId = `cmd #${order.id}`.includes(q) || String(order.id).includes(q);
    const accName =
      typeof order.account === "object" && order.account !== null
        ? order.account.name.toLowerCase()
        : "";
    const stockName = order.targetStockItem?.name?.toLowerCase() ?? "";
    const notesMatch =
      (order.workshopNotes?.toLowerCase().includes(q) ?? false) ||
      (order.trackingNumber?.toLowerCase().includes(q) ?? false) ||
      (order.storeReference?.toLowerCase().includes(q) ?? false);
    const matchItems = (order.orderItems ?? []).some((it) =>
      it.productName.toLowerCase().includes(q),
    );
    return matchId || accName.includes(q) || stockName.includes(q) || notesMatch || matchItems;
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#0E0E0E] text-[#F7F5EF] print:bg-white print:text-black md:flex-row">
      {/* MENU LATÉRAL ERP */}
      <div className="print:hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isAdmin={isAdmin}
          connected={connected}
          lastScanned={lastScanned}
          activeOrdersCount={activeOrdersCount}
          lowStockCount={lowStockCount}
          totalStockItemsCount={stockItems.length}
          accountsCount={accounts.length}
          propertiesCount={properties.length}
          usersCount={users.length}
          nfcCount={nfcTags.length}
          openTicketsCount={openTicketsCount}
          onLogout={logout}
        />
      </div>

      {/* ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 overflow-x-hidden p-6 print:hidden">
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-rose-800/80 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-4 font-bold text-rose-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* VUE 0 : VUE D'ENSEMBLE / DASHBOARD HOME */}
        {activeTab === "overview" && (
          <AtelierDashboardHome
            orders={orders}
            stockItems={stockItems}
            supportTickets={supportTickets}
            totalNfcCount={nfcTags.length}
            accounts={accounts}
            isAdmin={isAdmin}
            onNavigateTab={setActiveTab}
            onOpenCreateOrder={openCreateModal}
          />
        )}

        {/* VUE 1 : COMMANDES & KANBAN DE PRODUCTION */}
        {activeTab === "orders" && (
          <div className="flex flex-col gap-6">
            {/* Tableau de bord & KPIs réels de l'atelier */}
            <AtelierStatsOverview
              orders={orders}
              totalNfcCount={nfcTags.length}
              stockItems={stockItems}
              accountsCount={accounts.length}
            />

            {/* En-tête épuré de la vue Commandes */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#F7F5EF]">
                  Commandes &amp; Ligne de Fabrication
                </h1>
                <p className="text-xs text-[#8C8379]">
                  Pilotage en temps réel des supports connectés NFC et usinage atelier
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openCreateModal(true)}
                    className="rounded-lg border border-[#C9A96B]/40 bg-[#C9A96B]/10 px-4 py-2 text-xs font-semibold text-[#DFCA9F] transition-all hover:bg-[#C9A96B]/20 hover:border-[#C9A96B]/60"
                  >
                    + Réappro stock
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateModal(false)}
                    className="btn-primary-gold rounded-lg px-5 py-2 text-xs tracking-wider uppercase font-semibold shadow-sm"
                  >
                    + Nouvelle commande
                  </button>
                </div>
              )}
            </div>

            {/* Alerte stock contextuelle (affichée uniquement lorsqu'un seuil est franchi) */}
            {isAdmin && lowStockCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-amber-300">
                    Stock sous seuil :
                  </span>
                  {lowStockItems.map((si) => (
                    <span
                      key={si["@id"]}
                      className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[11px]"
                    >
                      {si.name} ({si.quantity} {si.unit})
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("stocks")}
                  className="font-medium text-amber-300 underline hover:text-white"
                >
                  Voir les stocks →
                </button>
              </div>
            )}

            {/* Barre de filtres + Recherche */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.08] bg-[#151517] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderFilter("all")}
                  className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                    orderFilter === "all"
                      ? "bg-[#242426] text-[#F7F5EF] shadow-sm"
                      : "text-[#8C8379] hover:text-[#F7F5EF]"
                  }`}
                >
                  Toutes ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter("client")}
                  className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                    orderFilter === "client"
                      ? "bg-[#242426] text-[#F7F5EF] shadow-sm"
                      : "text-[#8C8379] hover:text-[#F7F5EF]"
                  }`}
                >
                  Clients ({clientOrdersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter("stock")}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all ${
                    orderFilter === "stock"
                      ? "bg-[#242426] text-[#F7F5EF] shadow-sm"
                      : "text-[#8C8379] hover:text-[#DFCA9F]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${orderFilter === "stock" ? "bg-[#DFCA9F]" : "bg-[#C9A96B]"}`} />
                  Stock ({stockOrdersCount})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHideCompleted((v) => !v)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    hideCompleted
                      ? "border-[#C9A96B]/50 bg-[#C9A96B]/15 text-[#DFCA9F]"
                      : "border-white/[0.08] bg-[#151517] text-[#8C8379] hover:text-[#F7F5EF]"
                  }`}
                >
                  {hideCompleted ? "Terminées masquées" : "Masquer terminées"}
                </button>
                <div className="relative w-full sm:w-64">
                  <input
                    type="search"
                    placeholder="Rechercher CMD #, client, support…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3.5 py-1.5 text-xs text-[#F7F5EF] placeholder-[#8C8379] focus:border-[#C9A96B] focus:ring-1 focus:ring-[#C9A96B] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Colonnes Kanban style atelier d'art */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((col) => {
                const colOrders = filteredOrders.filter((o) => o.status === col.id);

                return (
                  <div
                    key={col.id}
                    className="surface-card flex flex-col p-3.5"
                  >
                    <div className="mb-3.5 flex items-center justify-between px-1">
                      <span className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${col.color}`}>
                        {col.title}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#8C8379]">
                        {colOrders.length}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-2.5">
                      {colOrders.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/[0.06] py-10 text-xs text-[#8C8379]">
                          Aucune fiche
                        </div>
                      ) : (
                        colOrders.map((order) => {
                          const isStock = Boolean(order.isStockOrder);
                          const accountObj =
                            typeof order.account === "object" && order.account !== null
                              ? order.account
                              : null;
                          const items = order.orderItems ?? [];
                          const totalSupports = items.reduce(
                            (acc, it) => acc + (it.quantity || 0),
                            0,
                          );

                          return (
                            <div
                              key={order["@id"]}
                              className={`group flex flex-col gap-3 rounded-lg border p-3.5 transition-all duration-150 ${
                                isStock
                                  ? "border-[#C9A96B]/30 bg-[#161512] hover:border-[#C9A96B]/60"
                                  : "border-white/[0.08] bg-[#18181B] hover:border-white/20"
                              }`}
                            >
                              {/* Ligne 1 : Identifiant, Client & Actions rapides */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`font-mono text-xs font-bold ${
                                        isStock ? "text-[#DFCA9F]" : "text-[#F7F5EF]"
                                      }`}
                                    >
                                      #{order.id}
                                    </span>
                                    {order.storeReference && (
                                      <span className="rounded bg-sky-500/15 px-1.5 py-0.2 font-mono text-[10px] font-medium text-sky-300">
                                        {order.storeReference}
                                      </span>
                                    )}
                                    <span className="truncate text-xs font-semibold text-[#F7F5EF]">
                                      {isStock
                                        ? order.targetStockItem?.name ?? "Réappro Stock"
                                        : accountObj?.name ?? "Client"}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8C8379]">
                                    <span>
                                      {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {totalSupports} {isStock ? "pcs" : `support${totalSupports > 1 ? "s" : ""}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  {isAdmin && !isStock && (
                                    <button
                                      type="button"
                                      onClick={() => setEncodingOrderId(order.id)}
                                      title="Poste d'encodage NFC"
                                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                        col.id === "quality_check"
                                          ? "border-purple-400/60 bg-purple-500/20 text-purple-200"
                                          : "border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white"
                                      }`}
                                    >
                                      NFC
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setPrintingOrderId(order.id)}
                                    title={`Bon de fabrication (${formatOrderBarcode(order.id)})`}
                                    className="rounded-md border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[10px] font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                  >
                                    Bon
                                  </button>
                                  {isAdmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(order)}
                                        title="Modifier la fiche"
                                        className="rounded-md border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                      >
                                        Éditer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteOrder(order)}
                                        title="Supprimer la fiche"
                                        className="rounded-md px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                                      >
                                        ×
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Ligne 2 : Détail des articles & puces NFC rattachées */}
                              {items.length > 0 && (
                                <ul className="flex flex-col gap-1.5 rounded-lg border border-neutral-800/70 bg-neutral-950/50 px-2.5 py-2 text-xs">
                                  {items.map((item, idx) => {
                                    const itemTags = nfcTags.filter(
                                      (t) =>
                                        item["@id"] &&
                                        t.orderItem === item["@id"] &&
                                        t.status !== "defective",
                                    );
                                    return (
                                      <li
                                        key={item["@id"] ?? `${order.id}-item-${idx}`}
                                        className="flex flex-col gap-1"
                                      >
                                        <div className="flex items-center justify-between gap-2 text-neutral-300">
                                          <span className="truncate">{item.productName}</span>
                                          <span className="shrink-0 font-mono text-[11px] font-semibold text-neutral-400">
                                            ×{item.quantity}
                                          </span>
                                        </div>
                                        {!isStock && itemTags.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1">
                                            {itemTags.map((tg) => (
                                              <a
                                                key={tg["@id"]}
                                                href={`/g/${tg.shortUid}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded bg-purple-500/15 px-1.5 py-0.2 font-mono text-[10px] font-medium text-purple-300 hover:bg-purple-500/25"
                                              >
                                                #{tg.shortUid} ↗
                                              </a>
                                            ))}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}

                              {(order.workshopNotes || order.trackingNumber) && (
                                <div className="flex flex-col gap-1 text-[11px] text-neutral-400">
                                  {order.workshopNotes && (
                                    <p className="line-clamp-2 rounded-md bg-neutral-950/60 px-2 py-1 text-neutral-300">
                                      Note : {order.workshopNotes}
                                    </p>
                                  )}
                                  {order.trackingNumber && (
                                    <div className="flex items-center justify-between px-1 font-mono text-[10px] text-emerald-300">
                                      <span>Suivi / Remise :</span>
                                      <span>{order.trackingNumber}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Ligne 3 : Avancement d'étape */}
                              <div className="flex gap-1.5 pt-0.5">
                                {col.id !== "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prevStatus =
                                        COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) - 1].id;
                                      void updateStatus(order["@id"], prevStatus);
                                    }}
                                    className="rounded-lg border border-neutral-800 bg-[#151517] px-2.5 py-1 text-[11px] text-[#8C8379] transition-colors hover:bg-[#242426] hover:text-[#F7F5EF]"
                                  >
                                    ←
                                  </button>
                                )}
                                {col.id !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextStatus =
                                        COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) + 1].id;
                                      void updateStatus(order["@id"], nextStatus);
                                    }}
                                    className={`flex-1 rounded-lg py-1 text-[11px] font-semibold transition-colors ${
                                      isStock
                                        ? "bg-[#C9A96B] text-[#0E0E0E] hover:bg-[#DFCA9F]"
                                        : "bg-[#242426] text-[#F7F5EF] hover:bg-[#2C2C30] border border-white/10"
                                    }`}
                                  >
                                    Avancer →
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VUE 2 : STOCKS ATELIER & FOURNISSEURS */}
        {activeTab === "stocks" && isAdmin && (
          <StocksView
            stockItems={stockItems}
            orders={orders}
            suppliers={suppliers}
            supplierOrders={supplierOrders}
            onAdjustStock={adjustStockQuantity}
            onOpenStockModal={openStockModal}
            onCreateStockItem={createStockItem}
            onDeleteStockItem={deleteStockItem}
            onUpdateOrderStatus={updateStatus}
            onNavigateTab={setActiveTab}
            onOrderSupplier={handleOrderSupplier}
            onReceiveSupplier={handleReceiveSupplier}
            onCreateSupplier={createSupplier}
            onUpdateSupplier={updateSupplier}
            onDeleteSupplier={deleteSupplier}
            onCreateSupplierOrder={createSupplierOrder}
            onUpdateSupplierOrder={updateSupplierOrder}
            onSendSupplierOrder={sendSupplierOrder}
            onReceiveSupplierOrder={receiveSupplierOrder}
            onDeleteSupplierOrder={deleteSupplierOrder}
            onPrintSupplierOrder={(so) => setPrintingSupplierOrder(so)}
            stockMovements={stockMovements}
            onOpenQrScanner={() => setQrScannerOpen(true)}
            onOpenQrPrint={(target) => setQrPrintTarget(target)}
          />
        )}

        {/* VUE 3 : COMPTES CLIENTS (DÉDIÉE & ENRICHIE) */}
        {activeTab === "clients" && (
          <AccountsView
            isAdmin={isAdmin}
            accounts={accounts}
            properties={properties}
            orders={orders}
            users={users}
            supportTickets={supportTickets}
            onCreateAccount={createAccount}
            onUpdateAccount={updateAccount}
            onDeleteAccount={deleteAccount}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* VUE 4 : PROPRIÉTÉS */}
        {activeTab === "properties" && (
          <PropertiesView
            isAdmin={isAdmin}
            properties={properties}
            accounts={accounts}
            zones={zones}
            nfcTags={nfcTags}
            users={users}
            onCreateProperty={createProperty}
            onUpdateProperty={updateProperty}
            onDeleteProperty={deleteProperty}
            onRevealPropertyWifi={revealPropertyWifi}
            onUpdateAssignedUsers={updateAssignedUsers}
            onCreateZone={async (name, propertyIri, mountType) => {
              await createZone({
                name,
                property: propertyIri,
                mountType: mountType || "Support Bois Gravé",
              });
            }}
            onDeleteZone={deleteZone}
          />
        )}

        {/* VUE 5 : GESTION DES UTILISATEURS & DROITS D'ACCÈS */}
        {activeTab === "users" && isAdmin && (
          <UsersView
            isAdmin={isAdmin}
            users={users}
            accounts={accounts}
            properties={properties}
            onCreateUser={createUser}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
            onRegeneratePassword={regenerateUserPassword}
            onSendResetLink={sendUserResetLink}
          />
        )}

        {/* VUE 5 : TAGS NFC */}
        {activeTab === "nfc" && isAdmin && (
          <NfcTagsView
            nfcTags={nfcTags}
            orders={orders}
            properties={properties}
            zones={zones}
            onCreateNfcTag={createNfcTag}
            onUpdateNfcTag={updateNfcTag}
            onDeleteNfcTag={deleteNfcTag}
            onReplaceDefectiveNfcTag={replaceDefectiveNfcTag}
          />
        )}

        {/* VUE 5 : SUPPORT & IA */}
        {activeTab === "support" && (
          <SupportTicketsView
            isAdmin={isAdmin}
            accounts={accounts}
            properties={properties}
            nfcTags={nfcTags}
            tickets={supportTickets}
            onCreateTicket={createTicket}
            onUpdateTicket={updateTicket}
          />
        )}
      </main>

      {/* MODALE CRÉATION / MODIFICATION D'UNE FICHE COMMANDE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={saveOrderForm}
            className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-bold">
                {editingOrder
                  ? `Modifier la fiche CMD #${editingOrder.id}`
                  : "Nouvelle fiche commande"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFormIsStockOrder(false)}
                className={`flex-1 rounded-md py-1.5 font-medium ${
                  !formIsStockOrder
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Commande Client
              </button>
              <button
                type="button"
                onClick={() => setFormIsStockOrder(true)}
                className={`flex-1 rounded-md py-1.5 font-medium ${
                  formIsStockOrder
                    ? "border border-orange-500/40 bg-orange-500/25 text-orange-300"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Production Stock Atelier (Orange)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {formIsStockOrder ? (
                <label className="flex flex-col gap-1 text-xs text-orange-300">
                  Composant de stock à réapprovisionner
                  <select
                    value={formTargetStockIri}
                    onChange={(e) => setFormTargetStockIri(e.target.value)}
                    className="rounded border border-orange-500/50 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  >
                    {stockItems
                      .filter((si) => si.type === "pre_produced" || !si.type)
                      .map((si) => (
                        <option key={si["@id"]} value={si["@id"]}>
                          {si.name} (stock actuel : {si.quantity} {si.unit})
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Client (Compte)
                  <select
                    value={formAccountIri}
                    onChange={(e) => setFormAccountIri(e.target.value)}
                    className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  >
                    {accounts.map((acc) => (
                      <option key={acc["@id"]} value={acc["@id"]}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Statut de production
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as Order["status"])}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-300">
                  Lignes de la fiche (détail de la commande)
                </span>
                <div className="flex items-center gap-1.5">
                  {!formIsStockOrder &&
                    properties.filter((p) => p.account === formAccountIri).length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            prefillFromPropertyZones(e.target.value);
                          }
                        }}
                        className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-0.5 text-xs text-sky-300"
                      >
                        <option value="">Pré-remplir depuis les zones d&apos;un logement…</option>
                        {properties
                          .filter((p) => p.account === formAccountIri)
                          .map((p) => {
                            const zCount = zones.filter((z) => z.property === p["@id"]).length;
                            return (
                              <option
                                key={p["@id"]}
                                value={p["@id"]}
                                disabled={zCount === 0}
                              >
                                {p.name} ({zCount} zone{zCount > 1 ? "s" : ""})
                              </option>
                            );
                          })}
                      </select>
                    )}
                  <button
                    type="button"
                    onClick={() =>
                      setFormItems((prev) => [
                        ...prev,
                        { productName: "Support Comptoir NFC Bois", quantity: 1 },
                      ])
                    }
                    className="rounded-lg border border-neutral-700 px-2 py-0.5 text-xs text-emerald-400 hover:bg-neutral-800"
                  >
                    + Ajouter une ligne
                  </button>
                </div>
              </div>

              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Désignation de l'article"
                      value={item.productName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, productName: val } : it)),
                        );
                      }}
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setFormItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it)),
                        );
                      }}
                      className="w-20 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-center font-mono text-sm"
                    />
                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg border border-neutral-800 px-2 py-1.5 text-xs text-rose-400 hover:bg-neutral-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Consignes atelier / gravure (optionnel)
                <input
                  type="text"
                  placeholder="ex: Gravure logo chalet sur bois"
                  value={formWorkshopNotes}
                  onChange={(e) => setFormWorkshopNotes(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Suivi d&apos;expédition / remise (optionnel)
                <input
                  type="text"
                  placeholder="ex: Colissimo 6A12345678 ou Main propre"
                  value={formTrackingNumber}
                  onChange={(e) => setFormTrackingNumber(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-white"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded border border-neutral-700 px-4 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingOrder}
                className="rounded bg-neutral-100 px-4 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white disabled:opacity-50"
              >
                {savingOrder ? "Enregistrement…" : "Enregistrer la fiche"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE PARAMÉTRAGE D'UN STOCK COMPOSANT */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={saveStockModal}
            className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">Stock — {editingStock.name}</h2>
              <button
                type="button"
                onClick={() => setEditingStock(null)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Quantité actuelle en stock ({editingStock.unit})
              <input
                type="number"
                required
                value={stockFormQty}
                onChange={(e) => setStockFormQty(parseInt(e.target.value, 10) || 0)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Seuil d&apos;alerte déclenchant une fiche Kanban auto ({editingStock.unit})
              <input
                type="number"
                min={0}
                required
                value={stockFormThreshold}
                onChange={(e) => setStockFormThreshold(parseInt(e.target.value, 10) || 0)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Quantité à produire automatiquement ({editingStock.unit})
              <input
                type="number"
                min={1}
                required
                value={stockFormReorder}
                onChange={(e) => setStockFormReorder(parseInt(e.target.value, 10) || 1)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm"
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingStock(null)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded bg-neutral-100 px-4 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE BON DE FABRICATION IMPRIMABLE AVEC CODE-BARRES 1D (CODE 128B) */}
      <WorkOrderPrintModal
        order={printingOrder}
        onClose={() => setPrintingOrderId(null)}
        onSimulateScan={(code) => processHardwareScan(code)}
      />

      {/* MODALE BON DE COMMANDE FOURNISSEUR IMPRIMABLE (PDF / PAPIER) */}
      <SupplierOrderPrintModal
        order={printingSupplierOrder}
        onClose={() => setPrintingSupplierOrder(null)}
      />

      {/* MODALE IMPRESSION ÉTIQUETTES ADHÉSIVES QR CODE STOCK */}
      <StockQrPrintModal
        target={qrPrintTarget}
        stockItems={stockItems}
        onClose={() => setQrPrintTarget(null)}
      />

      {/* MODALE POSTE DE SCAN & FLASHAGE QR CODE ATELIER */}
      <StockQrScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        stockItems={stockItems}
        onProcessMovement={processStockMovement}
      />

      {/* MODALE POSTE D'ENCODAGE NFC ATELIER */}
      <NfcEncodingModal
        order={encodingOrder}
        nfcTags={nfcTags}
        properties={properties}
        zones={zones}
        onClose={() => setEncodingOrderId(null)}
        onEncodeTagForOrderItem={encodeTagForOrderItem}
        onUnlinkTag={unlinkTag}
        onCreateQuickZone={createQuickZone}
        onCompleteOrder={(orderIri) => updateStatus(orderIri, "completed")}
      />
    </div>
  );
}
