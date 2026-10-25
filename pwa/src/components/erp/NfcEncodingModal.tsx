"use client";

import React, { useState } from "react";
import type {
  NfcTagItem,
  Order,
  OrderItem,
  PropertyItem,
  ZoneItem,
} from "@/types/erp";

interface NfcEncodingModalProps {
  order: Order | null;
  nfcTags: NfcTagItem[];
  properties: PropertyItem[];
  zones: ZoneItem[];
  onClose: () => void;
  onEncodeTagForOrderItem: (payload: {
    existingTagIri?: string;
    shortUid: string;
    orderItemIri: string;
    zoneIri?: string | null;
  }) => Promise<void>;
  onUnlinkTag: (tagIri: string) => Promise<void>;
  onCreateQuickZone: (payload: {
    name: string;
    mountType: string;
    property: string;
  }) => Promise<ZoneItem | null>;
  onCompleteOrder: (orderIri: string) => Promise<void>;
}

function generateShortUid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VA${suffix}`;
}

export function getPublicGuideUrl(shortUid: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/g/${shortUid}`;
  }
  return `http://localhost:3000/g/${shortUid}`;
}

export function NfcEncodingModal({
  order,
  nfcTags,
  properties,
  zones,
  onClose,
  onEncodeTagForOrderItem,
  onUnlinkTag,
  onCreateQuickZone,
  onCompleteOrder,
}: NfcEncodingModalProps) {
  const [selectedItemIri, setSelectedItemIri] = useState<string>("");
  const [mode, setMode] = useState<"new" | "stock">("new");
  const [shortUid, setShortUid] = useState<string>("");
  const [stockTagIri, setStockTagIri] = useState<string>("");
  const [selectedZoneIri, setSelectedZoneIri] = useState<string>("");

  // Création rapide d'une Zone pour la propriété du client
  const [quickZoneOpen, setQuickZoneOpen] = useState<boolean>(false);
  const [quickZonePropertyIri, setQuickZonePropertyIri] = useState<string>("");
  const [quickZoneName, setQuickZoneName] = useState<string>("");
  const [quickZoneMount, setQuickZoneMount] = useState<string>("Comptoir");

  const [busy, setBusy] = useState<boolean>(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [webNfcStatus, setWebNfcStatus] = useState<string | null>(null);

  if (!order) return null;

  const accountIri =
    typeof order.account === "object" && order.account !== null
      ? order.account["@id"]
      : typeof order.account === "string"
        ? order.account
        : null;
  const accountName =
    typeof order.account === "object" && order.account !== null
      ? order.account.name
      : "Client";

  const clientProperties = accountIri
    ? properties.filter((p) => p.account === accountIri)
    : properties;
  const clientPropertyIris = new Set(clientProperties.map((p) => p["@id"]));
  const clientZones = zones.filter((z) => clientPropertyIris.has(z.property));

  const stockTags = nfcTags.filter((t) => t.status === "stock" && !t.orderItem);

  const items: OrderItem[] = order.orderItems ?? [];
  const activeItemIri = selectedItemIri || items[0]?.["@id"] || "";

  // Calcul de la progression d'encodage de la commande
  const totalSupports = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalEncoded = items.reduce((sum, it) => {
    const itemIri = it["@id"];
    const linked = nfcTags.filter(
      (t) => itemIri && t.orderItem === itemIri && t.status !== "defective",
    );
    return sum + linked.length;
  }, 0);

  const allEncoded = totalSupports > 0 && totalEncoded >= totalSupports;

  const copyUrl = async (uid: string) => {
    const url = getPublicGuideUrl(uid);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid((prev) => (prev === uid ? null : prev)), 2000);
    } catch {
      // Fallback silencieux
    }
  };

  const writeViaWebNfc = async (uid: string) => {
    const url = getPublicGuideUrl(uid);
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      await copyUrl(uid);
      setWebNfcStatus(
        `URL ${url} copiée dans le presse-papiers (Web NFC disponible sur Chrome Android ; utilisez NFC Tools sur PC).`,
      );
      return;
    }

    try {
      setWebNfcStatus(`Approchez la puce NFC du lecteur pour écrire ${url}…`);
      const NDEFReaderCtor = (
        window as unknown as {
          NDEFReader: new () => {
            write: (message: { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
          };
        }
      ).NDEFReader;
      const ndef = new NDEFReaderCtor();
      await ndef.write({
        records: [{ recordType: "url", data: url }],
      });
      setWebNfcStatus(`✓ Puce #${uid} encodée avec succès en NDEF (${url}) !`);
    } catch (err) {
      setWebNfcStatus(
        `Échec écriture Web NFC : ${err instanceof Error ? err.message : "erreur inconnue"}`,
      );
    }
  };

  const handleEncodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemIri) return;
    setBusy(true);
    setWebNfcStatus(null);
    try {
      if (mode === "stock") {
        const chosen = stockTags.find((t) => t["@id"] === stockTagIri) ?? stockTags[0];
        if (!chosen) return;
        await onEncodeTagForOrderItem({
          existingTagIri: chosen["@id"],
          shortUid: chosen.shortUid,
          orderItemIri: activeItemIri,
          zoneIri: selectedZoneIri || null,
        });
        setStockTagIri("");
      } else {
        const uidToUse = (shortUid.trim() || generateShortUid()).toUpperCase();
        await onEncodeTagForOrderItem({
          shortUid: uidToUse,
          orderItemIri: activeItemIri,
          zoneIri: selectedZoneIri || null,
        });
        setShortUid(generateShortUid());
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateQuickZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProp = quickZonePropertyIri || clientProperties[0]?.["@id"];
    if (!targetProp || !quickZoneName.trim()) return;
    setBusy(true);
    try {
      const created = await onCreateQuickZone({
        name: quickZoneName.trim(),
        mountType: quickZoneMount,
        property: targetProp,
      });
      if (created) {
        setSelectedZoneIri(created["@id"]);
      }
      setQuickZoneName("");
      setQuickZoneOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <div className="my-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border border-purple-500/40 bg-neutral-900 p-6 text-neutral-100 shadow-2xl">
        {/* En-tête du poste d'encodage NFC */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-purple-500/50 bg-purple-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-purple-300">
                POSTE ENCODAGE NFC
              </span>
              <span className="font-mono text-base font-bold text-white">
                CMD #{order.id}
              </span>
              <span className="text-sm text-neutral-400">— {accountName}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Encodez les puces NTAG213/215 avec l&apos;URL courte VisuAlpes (`/g/[shortUid]`) et associez-les aux supports et zones du client.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Fermer ✕
          </button>
        </div>

        {/* Barre de progression globale de la commande */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300">
              Progression d&apos;encodage des supports de la commande
            </span>
            <span
              className={`font-mono font-bold ${
                allEncoded ? "text-emerald-400" : "text-purple-300"
              }`}
            >
              {totalEncoded} / {totalSupports} puce{totalSupports > 1 ? "s" : ""} encodée
              {totalEncoded > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full transition-all ${
                allEncoded ? "bg-emerald-500" : "bg-purple-500"
              }`}
              style={{
                width: `${
                  totalSupports > 0
                    ? Math.min(100, Math.round((totalEncoded / totalSupports) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {webNfcStatus && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-950/40 px-4 py-2.5 text-xs text-sky-200">
            {webNfcStatus}
          </div>
        )}

        {/* Liste des lignes d'articles et de leurs tags NFC */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Supports de la commande & Puces associées
          </h3>

          {items.map((item, idx) => {
            const itemIri = item["@id"] ?? "";
            const itemTags = nfcTags.filter(
              (t) => itemIri && t.orderItem === itemIri && t.status !== "defective",
            );
            const isComplete = itemTags.length >= item.quantity;
            const isSelected = activeItemIri === itemIri;

            return (
              <div
                key={itemIri || idx}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? "border-purple-500/60 bg-purple-950/15"
                    : "border-neutral-800 bg-neutral-950/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedItemIri(itemIri)}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${
                        isSelected
                          ? "border-purple-400 bg-purple-500/30 text-purple-200"
                          : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Ligne #{idx + 1}
                    </button>
                    <div>
                      <div className="text-sm font-bold text-neutral-100">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Quantité commandée : <strong>{item.quantity} support(s)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                        isComplete
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {itemTags.length} / {item.quantity} encodé(s)
                    </span>
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => setSelectedItemIri(itemIri)}
                        className="rounded border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/25"
                      >
                        Sélectionner
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags déjà associés à cette ligne */}
                {itemTags.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-neutral-800/80 pt-3">
                    {itemTags.map((tag) => {
                      const z = zones.find((zn) => zn["@id"] === tag.zone);
                      const p = z
                        ? properties.find((pr) => pr["@id"] === z.property)
                        : null;
                      const url = getPublicGuideUrl(tag.shortUid);

                      return (
                        <div
                          key={tag["@id"]}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono font-bold text-purple-300">
                              #{tag.shortUid}
                            </span>
                            <span className="font-mono text-[11px] text-neutral-400">
                              {url}
                            </span>
                            {z && (
                              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                                {p ? `${p.name} • ` : ""}
                                {z.name}
                                {z.mountType ? ` (${z.mountType})` : ""}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyUrl(tag.shortUid)}
                              className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] text-neutral-200 hover:bg-neutral-700"
                            >
                              {copiedUid === tag.shortUid ? "✓ Copié" : "Copier URL"}
                            </button>
                            <button
                              type="button"
                              onClick={() => writeViaWebNfc(tag.shortUid)}
                              className="rounded border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-[11px] font-medium text-purple-300 hover:bg-purple-500/25"
                            >
                              Écrire NFC
                            </button>
                            <a
                              href={`/g/${tag.shortUid}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/25"
                            >
                              Tester page ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => onUnlinkTag(tag["@id"])}
                              title="Détacher cette puce"
                              className="rounded border border-rose-900/50 bg-rose-950/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-900/50"
                            >
                              Détacher
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formulaire d'encodage d'une nouvelle puce ou d'une puce en stock */}
        {activeItemIri && (
          <form
            onSubmit={handleEncodeSubmit}
            className="flex flex-col gap-4 rounded-xl border border-purple-500/40 bg-neutral-950/90 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Encoder une puce pour la ligne sélectionnée
              </span>
              <div className="flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    mode === "new"
                      ? "bg-purple-500/30 text-purple-200"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Nouvel UID court
                </button>
                <button
                  type="button"
                  onClick={() => setMode("stock")}
                  disabled={stockTags.length === 0}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    mode === "stock"
                      ? "bg-purple-500/30 text-purple-200"
                      : "text-neutral-400 hover:text-white disabled:opacity-40"
                  }`}
                >
                  Piocher en stock ({stockTags.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mode === "new" ? (
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  UID court du Tag NFC (max 10 car.)
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Ex: VA4568 (ou Générer)"
                      value={shortUid}
                      onFocus={() => {
                        if (!shortUid) setShortUid(generateShortUid());
                      }}
                      onChange={(e) => setShortUid(e.target.value.toUpperCase())}
                      className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm font-bold text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShortUid(generateShortUid())}
                      className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-xs text-neutral-300 hover:bg-neutral-700"
                    >
                      Générer
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500">
                    URL NDEF : {getPublicGuideUrl(shortUid || "VA0000")}
                  </span>
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-xs text-neutral-300">
                  Sélectionner une puce en stock
                  <select
                    value={stockTagIri || stockTags[0]?.["@id"] || ""}
                    onChange={(e) => setStockTagIri(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm text-white"
                  >
                    {stockTags.map((t) => (
                      <option key={t["@id"]} value={t["@id"]}>
                        #{t.shortUid} (en stock)
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex flex-col gap-1 text-xs text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>Zone / Emplacement dans la propriété (optionnel)</span>
                  {clientProperties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickZonePropertyIri(clientProperties[0]?.["@id"] ?? "");
                        setQuickZoneOpen((v) => !v);
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      {quickZoneOpen ? "Annuler" : "+ Créer une zone"}
                    </button>
                  )}
                </div>
                <select
                  value={selectedZoneIri}
                  onChange={(e) => setSelectedZoneIri(e.target.value)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                >
                  <option value="">
                    — Propriété par défaut du client ({clientProperties[0]?.name ?? accountName}) —
                  </option>
                  {clientZones.map((z) => {
                    const prop = properties.find((p) => p["@id"] === z.property);
                    return (
                      <option key={z["@id"]} value={z["@id"]}>
                        {prop ? `${prop.name} — ` : ""}
                        {z.name} {z.mountType ? `(${z.mountType})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Sous-formulaire de création rapide de Zone */}
            {quickZoneOpen && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                <label className="flex flex-1 flex-col gap-1 text-neutral-300">
                  Propriété
                  <select
                    value={quickZonePropertyIri}
                    onChange={(e) => setQuickZonePropertyIri(e.target.value)}
                    className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs"
                  >
                    {clientProperties.map((p) => (
                      <option key={p["@id"]} value={p["@id"]}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1 text-neutral-300">
                  Nom de la zone
                  <input
                    type="text"
                    placeholder="ex: Comptoir Cuisine"
                    value={quickZoneName}
                    onChange={(e) => setQuickZoneName(e.target.value)}
                    className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-neutral-300">
                  Pose
                  <select
                    value={quickZoneMount}
                    onChange={(e) => setQuickZoneMount(e.target.value)}
                    className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs"
                  >
                    <option value="Comptoir">Comptoir</option>
                    <option value="Mural">Mural</option>
                    <option value="Table">Table</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleCreateQuickZone}
                  disabled={busy}
                  className="rounded bg-emerald-500 px-3 py-1.5 font-semibold text-neutral-950 hover:bg-emerald-400"
                >
                  Ajouter zone
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-400 disabled:opacity-50"
              >
                {busy ? "Encodage en cours…" : "Encoder & Associer cette puce NFC"}
              </button>
            </div>
          </form>
        )}

        {/* Pied de modale : Clôture directe de l'étape Contrôle & Encodage */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
          <span className="text-xs text-neutral-400">
            {allEncoded
              ? "✓ Tous les supports de la commande ont leur puce NFC encodée."
              : `Il reste ${Math.max(0, totalSupports - totalEncoded)} support(s) à encoder.`}
          </span>

          <div className="flex items-center gap-2">
            {order.status !== "completed" && (
              <button
                type="button"
                onClick={async () => {
                  await onCompleteOrder(order["@id"]);
                  onClose();
                }}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                  allEncoded
                    ? "bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
                    : "border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                Valider l&apos;encodage & Passer en « Terminé » →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

