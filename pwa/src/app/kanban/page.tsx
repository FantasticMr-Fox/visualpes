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

interface AccountSummary {
  "@id": string;
  id: number;
  name: string;
  type: string;
}

interface OrderItem {
  "@id"?: string;
  id?: number;
  productName: string;
  quantity: number;
}

interface StockItemSummary {
  "@id": string;
  id: number;
  code: string;
  name: string;
  unit: string;
}

interface StockItem extends StockItemSummary {
  quantity: number;
  alertThreshold: number;
  reorderQuantity: number;
  updatedAt: string;
}

interface Order {
  "@id": string;
  id: number;
  status: "pending" | "processing" | "quality_check" | "completed";
  createdAt: string;
  stockDeducted?: boolean;
  isStockOrder?: boolean;
  stockCredited?: boolean;
  targetStockItem?: StockItemSummary | null;
  account?: AccountSummary | string | null;
  orderItems?: OrderItem[];
}

const COLUMNS = [
  { id: "pending", title: "En attente", color: "border-amber-500/40 bg-amber-500/5 text-amber-400" },
  { id: "processing", title: "En fabrication", color: "border-sky-500/40 bg-sky-500/5 text-sky-400" },
  { id: "quality_check", title: "Contrôle & Encodage", color: "border-purple-500/40 bg-purple-500/5 text-purple-400" },
  { id: "completed", title: "Terminé", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" },
] as const;

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

export default function KanbanPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
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
  const [formItems, setFormItems] = useState<OrderItem[]>([
    { productName: "Support Comptoir NFC Bois", quantity: 1 },
  ]);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);

  // Modale édition seuil & stock d'un composant
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [stockFormQty, setStockFormQty] = useState<number>(0);
  const [stockFormThreshold, setStockFormThreshold] = useState<number>(10);
  const [stockFormReorder, setStockFormReorder] = useState<number>(50);

  const token = useSyncExternalStore<string | null | undefined>(subscribeToken, getToken, getServerToken);
  const authReady = typeof token === "string";
  const isAdmin = authReady && getTokenRoles().includes("ROLE_ADMIN");
  const roleWarning =
    authReady && !isAdmin
      ? "Accès réservé au staff atelier : vous pouvez consulter les commandes mais pas modifier la production ni les stocks."
      : null;

  const scanBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    router.replace("/login");
  }, [router]);

  const logout = () => handleUnauthorized();

  // 0. Garde d'authentification
  useEffect(() => {
    if (token === null) router.replace("/login");
  }, [token, router]);

  const refreshAllData = useCallback(async () => {
    if (!authReady) return;
    try {
      const ordRes = await apiFetch(`${API_URL}/orders`);
      const topic = ordRes.headers.get("X-Mercure-Topic") ?? `${API_ORIGIN}/api/orders/{id}`;
      const ordData = await ordRes.json();
      setOrders(extractMembers<Order>(ordData));
      setMercureTopic((prev) => prev ?? topic);

      if (isAdmin) {
        const [accRes, siRes] = await Promise.all([
          apiFetch(`${API_URL}/accounts`),
          apiFetch(`${API_URL}/stock_items`),
        ]);
        const [accData, siData] = await Promise.all([accRes.json(), siRes.json()]);
        setAccounts(extractMembers<AccountSummary>(accData));
        setStockItems(extractMembers<StockItem>(siData));
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur chargement ERP :", err);
    }
  }, [authReady, isAdmin, handleUnauthorized]);

  // 1. Récupération initiale des commandes (+ pose du cookie Mercure) et du stock
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
          const updatedItem = payload as StockItem;
          if (typeof updatedItem.quantity === "number") {
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
        // Rafraîchit les commandes et les stocks (ex: passage en fabrication qui génère une fiche stock,
        // ou passage d'une fiche stock en "Terminé" qui crédite le stock)
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
  const openCreateModal = () => {
    setEditingOrder(null);
    setFormIsStockOrder(false);
    setFormTargetStockIri(stockItems[0]?.["@id"] ?? "");
    setFormAccountIri(accounts[0]?.["@id"] ?? "/api/accounts/1");
    setFormStatus("pending");
    setFormItems([{ productName: "Support Comptoir NFC Bois", quantity: 1 }]);
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

  // Ajustement rapide ou via modale du stock
  const adjustStockQuantity = async (item: StockItem, delta: number) => {
    try {
      const res = await apiFetch(item["@id"], {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ quantity: item.quantity + delta }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return handleUnauthorized();
      console.error("Erreur ajustement stock :", err);
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
          quantity: Number(stockFormQty),
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

  const processHardwareScan = (code: string) => {
    setLastScanned(code);
    const orderId = parseInt(code.replace(/\D/g, ""), 10);
    const targetOrder = orders.find((o) => o.id === orderId);

    if (!targetOrder) return;

    const currentIndex = COLUMNS.findIndex((c) => c.id === targetOrder.status);
    if (currentIndex < COLUMNS.length - 1) {
      const nextStatus = COLUMNS[currentIndex + 1].id;
      updateStatus(targetOrder["@id"], nextStatus);
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

  const lowStockCount = stockItems.filter((s) => s.quantity <= s.alertThreshold).length;
  const openStockOrders = orders.filter((o) => o.isStockOrder && o.status !== "completed");

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERP Atelier VisuAlpes — Production & Stocks</h1>
          <p className="text-sm text-neutral-400">
            Fiches clients (gris) & fiches de réapprovisionnement stock atelier (orange) dans le même flux Kanban
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastScanned && (
            <span className="rounded border border-sky-800 bg-sky-950/60 px-2 py-1 font-mono text-xs text-sky-400">
              Dernier scan : {lastScanned}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-rose-500"}`}
            />
            {connected ? "Mercure Connecté" : "Hors ligne"}
          </div>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
            >
              + Nouvelle fiche commande
            </button>
          )}
          <button
            onClick={logout}
            className="rounded border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {(error ?? roleWarning) && (
        <div className="mb-6 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-2 text-sm text-rose-300">
          {error ?? roleWarning}
        </div>
      )}

      {/* PANNEAU GESTION DE STOCK COMPOSANTS ATELIER */}
      {isAdmin && (
        <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                Stocks Composants Atelier (Patin TPU • Socle ciment • Plaque bois)
              </h2>
              {lowStockCount > 0 ? (
                <span className="rounded-full border border-orange-500/50 bg-orange-500/15 px-2.5 py-0.5 text-xs font-medium text-orange-300">
                  {lowStockCount} composant(s) sous seuil → fiche de production stock dans le Kanban
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Stocks nominaux
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-500">
              Sous le seuil d&apos;alerte, une fiche orange « STOCK ATELIER » tombe automatiquement dans « En attente »
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {stockItems.map((item) => {
              const isAlert = item.quantity <= item.alertThreshold;
              const activeKanbanOrder = openStockOrders.find(
                (o) => o.targetStockItem?.code === item.code || o.targetStockItem?.id === item.id,
              );

              return (
                <div
                  key={item["@id"]}
                  className={`flex flex-col justify-between rounded-lg border p-3.5 ${
                    isAlert
                      ? "border-orange-500/60 bg-orange-950/20"
                      : "border-neutral-800 bg-neutral-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-100">{item.name}</span>
                        <span className="font-mono text-[11px] text-neutral-500">({item.code})</span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        Seuil d&apos;alerte :{" "}
                        <strong className="text-neutral-200">
                          {item.alertThreshold} {item.unit}
                        </strong>{" "}
                        • Lot production auto : {item.reorderQuantity} {item.unit}
                      </p>
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                        isAlert
                          ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {isAlert ? "ALERTE SEUIL" : "En stock"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between border-t border-neutral-800/80 pt-3">
                    <div>
                      <span className="text-xs text-neutral-400">Disponible</span>
                      <div
                        className={`font-mono text-2xl font-bold ${
                          isAlert ? "text-orange-400" : "text-neutral-100"
                        }`}
                      >
                        {item.quantity}{" "}
                        <span className="text-xs font-normal text-neutral-400">{item.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustStockQuantity(item, -1)}
                        title="Retirer 1 du stock"
                        className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 font-mono text-xs hover:bg-neutral-700"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjustStockQuantity(item, 1)}
                        title="Ajouter 1 au stock"
                        className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 font-mono text-xs hover:bg-neutral-700"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => openStockModal(item)}
                        className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                      >
                        Paramétrer
                      </button>
                    </div>
                  </div>

                  {activeKanbanOrder && (
                    <div className="mt-2.5 flex items-center justify-between rounded border border-orange-500/40 bg-orange-500/15 px-2.5 py-1.5 text-xs text-orange-200">
                      <span>
                        Fiche Kanban <strong>CMD #{activeKanbanOrder.id}</strong> en cours (
                        {COLUMNS.find((c) => c.id === activeKanbanOrder.status)?.title})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TABLEAU KANBAN : FICHES CLIENTS + FICHES DE STOCK ATELIER (COULEUR DIFFÉRENCIÉE) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${col.color}`}>
                  {col.title}
                </span>
                <span className="text-xs text-neutral-500">{colOrders.length}</span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {colOrders.map((order) => {
                  const isStock = Boolean(order.isStockOrder);
                  const accountObj =
                    typeof order.account === "object" && order.account !== null
                      ? order.account
                      : null;
                  const items = order.orderItems ?? [];
                  const totalSupports = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

                  return (
                    <div
                      key={order["@id"]}
                      className={`flex flex-col gap-2.5 rounded-lg border p-3.5 shadow-sm transition-colors ${
                        isStock
                          ? "border-orange-500/70 bg-gradient-to-b from-orange-950/45 via-orange-950/20 to-neutral-900 hover:border-orange-400"
                          : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                      }`}
                    >
                      {/* En-tête de la fiche */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`font-mono text-sm font-bold ${
                                isStock ? "text-orange-300" : "text-neutral-100"
                              }`}
                            >
                              CMD #{order.id}
                            </span>
                            {isStock ? (
                              <span className="rounded border border-orange-400/60 bg-orange-500/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-200">
                                Réappro Stock Atelier
                              </span>
                            ) : (
                              order.stockDeducted && (
                                <span
                                  title="Les composants (patin TPU, socle ciment, plaque bois) ont été déduits du stock"
                                  className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.2 text-[10px] text-sky-300"
                                >
                                  Stock déduit
                                </span>
                              )
                            )}
                            {isStock && order.stockCredited && (
                              <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.2 text-[10px] text-emerald-300">
                                Stock crédité
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            Créée le {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(order)}
                              className="rounded border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => deleteOrder(order)}
                              title="Supprimer la fiche"
                              className="rounded border border-rose-900/60 bg-rose-950/40 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-900/50"
                            >
                              Suppr.
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Origine : Client OU Production Stock Interne */}
                      <div
                        className={`rounded-md border px-2.5 py-1.5 text-xs ${
                          isStock
                            ? "border-orange-500/40 bg-orange-950/40 text-orange-200"
                            : "border-neutral-800/90 bg-neutral-950/60 text-neutral-200"
                        }`}
                      >
                        {isStock ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              Atelier VisuAlpes — {order.targetStockItem?.name ?? "Composant stock"}
                            </span>
                            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange-300">
                              INTERNE
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {accountObj ? accountObj.name : "Client rattaché"}
                            </span>
                            {accountObj?.type && (
                              <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                                {accountObj.type}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Détail complet de la commande */}
                      <div
                        className={`flex flex-col gap-1 rounded-md border p-2 text-xs ${
                          isStock
                            ? "border-orange-500/30 bg-neutral-950/60"
                            : "border-neutral-800/70 bg-neutral-950/40"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center justify-between text-[11px] font-medium text-neutral-400">
                          <span>{isStock ? "Lot à fabriquer" : "Détail des supports"}</span>
                          <span>Total : {totalSupports} pcs</span>
                        </div>
                        {items.length > 0 ? (
                          <ul className="flex flex-col gap-1">
                            {items.map((item, idx) => (
                              <li
                                key={item["@id"] ?? `${order.id}-item-${idx}`}
                                className="flex items-center justify-between gap-2 text-neutral-200"
                              >
                                <span className="truncate">{item.productName}</span>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.2 font-mono text-[11px] font-semibold ${
                                    isStock
                                      ? "bg-orange-500/25 text-orange-200"
                                      : "bg-neutral-800 text-neutral-200"
                                  }`}
                                >
                                  × {item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="italic text-[11px] text-neutral-500">
                            Aucune ligne d&apos;article détaillée (1 kit par défaut)
                          </p>
                        )}
                      </div>

                      {/* Navigation statuts */}
                      <div className="mt-1 flex gap-1 border-t border-neutral-800/80 pt-2">
                        {col.id !== "pending" && (
                          <button
                            onClick={() => {
                              const prevStatus =
                                COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) - 1].id;
                              updateStatus(order["@id"], prevStatus);
                            }}
                            className="flex-1 rounded bg-neutral-800 py-1 text-[11px] text-neutral-400 hover:bg-neutral-700"
                          >
                            ← Reculer
                          </button>
                        )}
                        {col.id !== "completed" && (
                          <button
                            onClick={() => {
                              const nextStatus =
                                COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) + 1].id;
                              updateStatus(order["@id"], nextStatus);
                            }}
                            className={`flex-1 rounded py-1 text-[11px] font-semibold ${
                              isStock
                                ? "bg-orange-400 text-neutral-950 hover:bg-orange-300"
                                : "bg-neutral-100 text-neutral-900 hover:bg-white"
                            }`}
                          >
                            Avancer →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE CRÉATION / MODIFICATION D'UNE FICHE COMMANDE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={saveOrderForm}
            className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
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
                    ? "bg-orange-500/25 text-orange-300 border border-orange-500/40"
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
                    {stockItems.map((si) => (
                      <option key={si["@id"]} value={si["@id"]}>
                        {si.name} (stock: {si.quantity})
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300">
                  Lignes de la fiche (détail de la commande)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormItems((prev) => [
                      ...prev,
                      { productName: "Support Comptoir NFC Bois", quantity: 1 },
                    ])
                  }
                  className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-emerald-400 hover:bg-neutral-800"
                >
                  + Ajouter une ligne
                </button>
              </div>

              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
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
                      className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
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
                      className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-center font-mono text-sm"
                    />
                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded border border-neutral-800 px-2 py-1.5 text-xs text-rose-400 hover:bg-neutral-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
            className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
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
    </main>
  );
}
