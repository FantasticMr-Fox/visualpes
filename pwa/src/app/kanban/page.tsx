"use client";

import React, { useEffect, useState, useRef } from "react";

interface Order {
  "@id": string;
  id: number;
  status: "pending" | "processing" | "quality_check" | "completed";
  createdAt: string;
}

const COLUMNS = [
  { id: "pending", title: "En attente", color: "border-amber-500/40 bg-amber-500/5 text-amber-400" },
  { id: "processing", title: "En fabrication", color: "border-sky-500/40 bg-sky-500/5 text-sky-400" },
  { id: "quality_check", title: "Contrôle & Encodage", color: "border-purple-500/40 bg-purple-500/5 text-purple-400" },
  { id: "completed", title: "Terminé", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" },
] as const;

export default function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scanBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // 1. Récupération initiale des commandes
  useEffect(() => {
    fetch("http://localhost/api/orders", {
      headers: {
        Accept: "application/ld+json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const items = data?.member ?? data?.["hydra:member"] ?? (Array.isArray(data) ? data : []);
        setOrders(items);
      })
      .catch((err) => console.error("Erreur API:", err));
  }, []);

  // 2. Abonnement temps réel Mercure SSE
  useEffect(() => {
    const hubUrl = new URL("http://localhost/.well-known/mercure");
    hubUrl.searchParams.append("topic", "http://localhost/api/orders/{id}");

    const eventSource = new EventSource(hubUrl.toString());

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const updatedOrder: Order = JSON.parse(event.data);
        setOrders((prev) => {
          const index = prev.findIndex((o) => o["@id"] === updatedOrder["@id"]);
          if (index > -1) {
            const next = [...prev];
            next[index] = updatedOrder;
            return next;
          }
          return [updatedOrder, ...prev];
        });
      } catch (err) {
        console.error("Format de message SSE invalide :", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // 3. Mutation de statut API
  const updateStatus = async (orderIri: string, newStatus: Order["status"]) => {
    try {
      await fetch(`http://localhost${orderIri}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Échec de mise à jour du statut :", err);
    }
  };

  // 4. Capture matériel USB
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atelier VisuAlpes - Production</h1>
          <p className="text-sm text-neutral-400">Écouteur USB actif • Approchez un tag ou scannez une commande</p>
        </div>
        <div className="flex items-center gap-4">
          {lastScanned && (
            <span className="font-mono text-xs text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-1 rounded">
              Dernier scan : {lastScanned}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {connected ? "Mercure Connecté" : "Hors ligne"}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div key={col.id} className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${col.color}`}>
                  {col.title}
                </span>
                <span className="text-xs text-neutral-500">{colOrders.length}</span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {colOrders.map((order) => (
                  <div
                    key={order["@id"]}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-sm hover:border-neutral-700"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-neutral-300">CMD #{order.id}</span>
                      <span className="text-neutral-500">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <div className="mt-2 flex gap-1 pt-2 border-t border-neutral-800/80">
                      {col.id !== "pending" && (
                        <button
                          onClick={() => {
                            const prevStatus = COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) - 1].id;
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
                            const nextStatus = COLUMNS[COLUMNS.findIndex((c) => c.id === col.id) + 1].id;
                            updateStatus(order["@id"], nextStatus);
                          }}
                          className="flex-1 rounded bg-neutral-100 py-1 text-[11px] font-medium text-neutral-900 hover:bg-white"
                        >
                          Avancer →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}