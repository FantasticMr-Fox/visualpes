"use client";

import React, { useState } from "react";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";
import type {
  AccountSummary,
  NfcTagItem,
  Order,
  PropertyItem,
  SupportTicketItem,
  ZoneItem,
} from "@/types/erp";

interface ClientsViewProps {
  isAdmin: boolean;
  accounts: AccountSummary[];
  properties: PropertyItem[];
  zones: ZoneItem[];
  nfcTags: NfcTagItem[];
  onCreateAccount: (payload: { name: string; type: string }) => Promise<void>;
  onUpdateAccount: (
    accountIri: string,
    payload: { name: string; type: string },
  ) => Promise<void>;
  onDeleteAccount: (accountIri: string) => Promise<void>;
  onCreateProperty: (payload: {
    name: string;
    account: string;
    wifiSSID?: string;
    wifiPassword?: string;
    wifiAccessCode?: string;
    externalGuideUrl?: string;
    instructions?: string;
  }) => Promise<void>;
  onUpdateProperty: (
    propertyIri: string,
    payload: {
      name: string;
      account: string;
      wifiSSID?: string | null;
      wifiPassword?: string | null;
      wifiAccessCode?: string | null;
      externalGuideUrl?: string | null;
      instructions?: string | null;
    },
  ) => Promise<void>;
  onDeleteProperty: (propertyIri: string) => Promise<void>;
  onRevealPropertyWifi: (
    propertyId: number,
  ) => Promise<{
    wifiSSID?: string | null;
    wifiPassword?: string | null;
    wifiAccessCode?: string | null;
    wifiQrPayload?: string | null;
  } | null>;
  onCreateZone: (payload: {
    name: string;
    mountType: string;
    property: string;
  }) => Promise<void>;
  onUpdateZone: (
    zoneIri: string,
    payload: { name: string; mountType: string },
  ) => Promise<void>;
  onDeleteZone: (zoneIri: string) => Promise<void>;
  onAssignTagToZone: (tagIri: string, zoneIri: string | null) => Promise<void>;
}

const MOUNT_TYPES = ["Comptoir", "Mural", "Table", "Chevet", "Entrée", "Extérieur"];

export function ClientsView({
  isAdmin,
  accounts,
  properties,
  zones,
  nfcTags,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onCreateProperty,
  onUpdateProperty,
  onDeleteProperty,
  onRevealPropertyWifi,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  onAssignTagToZone,
}: ClientsViewProps) {
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all");

  // Modale création / édition Compte Client
  const [accountModal, setAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountSummary | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("B2B");
  const [savingAcc, setSavingAcc] = useState(false);

  // Modale création / édition Propriété
  const [propModal, setPropModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [propName, setPropName] = useState("");
  const [propAccount, setPropAccount] = useState(accounts[0]?.["@id"] ?? "/api/accounts/1");
  const [propWifiSsid, setPropWifiSsid] = useState("");
  const [propWifiPass, setPropWifiPass] = useState("");
  const [propWifiAccessCode, setPropWifiAccessCode] = useState("");
  const [clearAccessCode, setClearAccessCode] = useState(false);
  const [showPassInput, setShowPassInput] = useState(false);
  const [propGuideUrl, setPropGuideUrl] = useState("");
  const [propInstructions, setPropInstructions] = useState("");
  const [savingProp, setSavingProp] = useState(false);

  // État de révélation temporaire du Wi-Fi déchiffré par propriété
  const [revealedWifi, setRevealedWifi] = useState<
    Record<
      number,
      {
        wifiSSID?: string | null;
        wifiPassword?: string | null;
        wifiQrPayload?: string | null;
      }
    >
  >({});
  const [qrOpenPropIds, setQrOpenPropIds] = useState<Record<number, boolean>>({});
  const [copiedPropId, setCopiedPropId] = useState<number | null>(null);

  // Modale création / édition Zone d'une propriété
  const [zoneModal, setZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [zonePropertyIri, setZonePropertyIri] = useState<string>("");
  const [zoneName, setZoneName] = useState("");
  const [zoneMountType, setZoneMountType] = useState("Comptoir");
  const [savingZone, setSavingZone] = useState(false);

  const openCreateAccountModal = () => {
    setEditingAccount(null);
    setAccName("");
    setAccType("B2B");
    setAccountModal(true);
  };

  const openEditAccountModal = (acc: AccountSummary) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type || "B2B");
    setAccountModal(true);
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAcc(true);
    try {
      if (editingAccount) {
        await onUpdateAccount(editingAccount["@id"], {
          name: accName.trim(),
          type: accType,
        });
      } else {
        await onCreateAccount({ name: accName.trim(), type: accType });
      }
      setAccName("");
      setEditingAccount(null);
      setAccountModal(false);
    } finally {
      setSavingAcc(false);
    }
  };

  const openCreatePropertyModal = (defaultAccountIri?: string) => {
    setEditingProperty(null);
    setPropName("");
    setPropAccount(
      defaultAccountIri ??
        (selectedAccountFilter !== "all"
          ? selectedAccountFilter
          : accounts[0]?.["@id"] ?? "/api/accounts/1"),
    );
    setPropWifiSsid("");
    setPropWifiPass("");
    setPropWifiAccessCode("");
    setClearAccessCode(false);
    setShowPassInput(false);
    setPropGuideUrl("");
    setPropInstructions("");
    setPropModal(true);
  };

  const openEditPropertyModal = (prop: PropertyItem) => {
    setEditingProperty(prop);
    setPropName(prop.name);
    setPropAccount(prop.account);
    setPropWifiSsid(prop.wifiSSID ?? "");
    // Le mot de passe Wi-Fi existant n'est jamais pré-rempli en clair : laissé vide = conservé intact
    setPropWifiPass("");
    setPropWifiAccessCode("");
    setClearAccessCode(false);
    setShowPassInput(false);
    setPropGuideUrl(prop.externalGuideUrl ?? "");
    setPropInstructions(prop.instructions ?? "");
    setPropModal(true);
  };

  const handleToggleRevealWifi = async (propId: number) => {
    if (revealedWifi[propId]) {
      setRevealedWifi((prev) => {
        const next = { ...prev };
        delete next[propId];
        return next;
      });
      return;
    }

    const res = await onRevealPropertyWifi(propId);
    if (res) {
      setRevealedWifi((prev) => ({ ...prev, [propId]: res }));
    }
  };

  const handleCopyWifiPassword = async (propId: number) => {
    const current = revealedWifi[propId] ?? (await onRevealPropertyWifi(propId));
    if (!current?.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(current.wifiPassword);
      setCopiedPropId(propId);
      setTimeout(() => setCopiedPropId((prev) => (prev === propId ? null : prev)), 2500);
    } catch {
      // Fallback silencieux
    }
  };

  const handleToggleWifiQr = async (propId: number) => {
    if (qrOpenPropIds[propId]) {
      setQrOpenPropIds((prev) => ({ ...prev, [propId]: false }));
      return;
    }

    if (!revealedWifi[propId]?.wifiQrPayload) {
      const res = await onRevealPropertyWifi(propId);
      if (res) {
        setRevealedWifi((prev) => ({ ...prev, [propId]: res }));
      } else {
        return;
      }
    }

    setQrOpenPropIds((prev) => ({ ...prev, [propId]: true }));
  };

  const submitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProp(true);
    try {
      const targetAccount = propAccount || accounts[0]?.["@id"] || "/api/accounts/1";
      if (editingProperty) {
        await onUpdateProperty(editingProperty["@id"], {
          name: propName.trim(),
          account: targetAccount,
          wifiSSID: propWifiSsid.trim() || null,
          wifiPassword: propWifiPass.trim() ? propWifiPass : null,
          wifiAccessCode: clearAccessCode
            ? "CLEAR"
            : propWifiAccessCode.trim()
              ? propWifiAccessCode.trim()
              : null,
          externalGuideUrl: propGuideUrl.trim() || null,
          instructions: propInstructions.trim() || null,
        });
      } else {
        await onCreateProperty({
          name: propName.trim(),
          account: targetAccount,
          wifiSSID: propWifiSsid.trim() || undefined,
          wifiPassword: propWifiPass.trim() || undefined,
          wifiAccessCode: propWifiAccessCode.trim() || undefined,
          externalGuideUrl: propGuideUrl.trim() || undefined,
          instructions: propInstructions.trim() || undefined,
        });
      }
      setEditingProperty(null);
      setPropModal(false);
    } finally {
      setSavingProp(false);
    }
  };

  const openCreateZoneModal = (propertyIri: string) => {
    setEditingZone(null);
    setZonePropertyIri(propertyIri);
    setZoneName("");
    setZoneMountType("Comptoir");
    setZoneModal(true);
  };

  const openEditZoneModal = (z: ZoneItem) => {
    setEditingZone(z);
    setZonePropertyIri(z.property);
    setZoneName(z.name);
    setZoneMountType(z.mountType || "Comptoir");
    setZoneModal(true);
  };

  const submitZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;
    setSavingZone(true);
    try {
      if (editingZone) {
        await onUpdateZone(editingZone["@id"], {
          name: zoneName.trim(),
          mountType: zoneMountType,
        });
      } else {
        await onCreateZone({
          name: zoneName.trim(),
          mountType: zoneMountType,
          property: zonePropertyIri,
        });
      }
      setEditingZone(null);
      setZoneModal(false);
    } finally {
      setSavingZone(false);
    }
  };

  const visibleProperties =
    selectedAccountFilter === "all"
      ? properties
      : properties.filter((p) => p.account === selectedAccountFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Clients, Propriétés & Zones NFC
          </h1>
          <p className="text-sm text-neutral-400">
            Gérez les comptes clients, les logements (Wi-Fi, livrets d&apos;accueil) et leurs zones de pose NFC
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateAccountModal}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            >
              + Nouveau compte client
            </button>
          )}
          <button
            type="button"
            onClick={() => openCreatePropertyModal()}
            className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            + Nouvelle propriété
          </button>
        </div>
      </div>

      {/* Comptes clients avec édition / suppression et filtre par compte */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Comptes enregistrés ({accounts.length})
          </h2>
          {selectedAccountFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedAccountFilter("all")}
              className="text-xs text-sky-400 hover:underline"
            >
              Afficher toutes les propriétés ({properties.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const propCount = properties.filter((p) => p.account === acc["@id"]).length;
            const isSelected = selectedAccountFilter === acc["@id"];

            return (
              <div
                key={acc["@id"]}
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? "border-sky-500/60 bg-sky-950/20"
                    : "border-neutral-800 bg-neutral-900/70 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAccountFilter((prev) =>
                        prev === acc["@id"] ? "all" : acc["@id"],
                      )
                    }
                    className="text-left"
                  >
                    <div className="font-semibold text-neutral-100 hover:text-sky-300">
                      {acc.name}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {propCount} propriété{propCount > 1 ? "s" : ""} rattachée
                      {propCount > 1 ? "s" : ""}
                    </div>
                  </button>
                  <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-sky-300">
                    {acc.type}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => openCreatePropertyModal(acc["@id"])}
                    className="font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    + Ajouter propriété
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditAccountModal(acc)}
                        className="rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAccount(acc["@id"])}
                        className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-900/50"
                      >
                        Suppr.
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Propriétés, Paramètres Wi-Fi / Guide & Gestion complète des Zones */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Propriétés & Zones de pose ({visibleProperties.length})
          </h2>
          <span className="text-xs text-neutral-500">
            {zones.length} zone{zones.length > 1 ? "s" : ""} configurée{zones.length > 1 ? "s" : ""} au total
          </span>
        </div>

        {visibleProperties.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
            Aucune propriété configurée pour cette sélection.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleProperties.map((prop) => {
              const acc = accounts.find((a) => a["@id"] === prop.account);
              const propZones = zones.filter((z) => z.property === prop["@id"]);
              const availableTags = nfcTags.filter(
                (t) => t.status !== "defective" && !t.zone,
              );

              return (
                <div
                  key={prop["@id"]}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-5"
                >
                  <div className="flex flex-col gap-3">
                    {/* En-tête de la propriété */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-neutral-100">{prop.name}</h3>
                        <span className="text-xs text-neutral-400">
                          Compte :{" "}
                          <strong className="text-neutral-200">
                            {acc?.name ?? prop.account}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditPropertyModal(prop)}
                          className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProperty(prop["@id"])}
                          className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-900/50"
                        >
                          Suppr.
                        </button>
                      </div>
                    </div>

                    {/* Wi-Fi sécurisé (chiffré AES-256-GCM en base & masqué par défaut) */}
                    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-neutral-800/70 pb-2">
                        <span className="font-semibold text-neutral-300">
                          Accès Wi-Fi du logement
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] text-emerald-300">
                            AES-256-GCM
                          </span>
                          {prop.wifiProtectedByCode && (
                            <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.2 font-mono text-[10px] text-amber-300">
                              PIN Voyageur actif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-neutral-500">Wi-Fi SSID :</span>
                          <div className="font-mono font-medium text-neutral-200">
                            {revealedWifi[prop.id]?.wifiSSID ??
                              prop.wifiSSID ??
                              "Non renseigné"}
                          </div>
                        </div>

                        <div>
                          <span className="text-neutral-500">Clé Wi-Fi :</span>
                          {!prop.wifiConfigured ? (
                            <div className="font-mono text-neutral-500">Non configurée</div>
                          ) : prop.canManageWifi === false ? (
                            <div
                              title="Seul le client propriétaire du compte peut déchiffrer son mot de passe Wi-Fi"
                              className="font-mono text-[11px] text-amber-300/90"
                            >
                              Confidentiel Client (masqué atelier)
                            </div>
                          ) : (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-emerald-300">
                                {revealedWifi[prop.id]?.wifiPassword ?? "••••••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleRevealWifi(prop.id)}
                                className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-800"
                              >
                                {revealedWifi[prop.id] ? "Masquer" : "Afficher"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyWifiPassword(prop.id)}
                                className="rounded border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 hover:bg-sky-500/25"
                              >
                                {copiedPropId === prop.id ? "✓ Copié" : "Copier"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleWifiQr(prop.id)}
                                className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/25"
                              >
                                {qrOpenPropIds[prop.id] ? "Fermer QR" : "QR Code"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {qrOpenPropIds[prop.id] && revealedWifi[prop.id]?.wifiQrPayload && (
                        <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-emerald-500/30 bg-neutral-900/90 p-3">
                          <WifiQrCodeSvg
                            value={revealedWifi[prop.id]!.wifiQrPayload!}
                            size={156}
                          />
                          <div className="text-center text-[11px] text-neutral-300">
                            Scannez avec l&apos;appareil photo pour rejoindre{" "}
                            <strong className="font-mono text-white">
                              {revealedWifi[prop.id]?.wifiSSID ?? prop.wifiSSID}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {prop.instructions && (
                      <p className="rounded-lg border border-neutral-800/50 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-300">
                        {prop.instructions}
                      </p>
                    )}

                    {prop.externalGuideUrl && (
                      <a
                        href={prop.externalGuideUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-400 underline hover:text-sky-300"
                      >
                        <span>Livret d&apos;accueil : {prop.externalGuideUrl}</span>
                        <span>↗</span>
                      </a>
                    )}

                    {/* Section Zones de la propriété */}
                    <div className="mt-1 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                          Zones & Supports NFC ({propZones.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => openCreateZoneModal(prop["@id"])}
                          className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                        >
                          + Ajouter une zone
                        </button>
                      </div>

                      {propZones.length === 0 ? (
                        <p className="py-2 text-xs text-neutral-500">
                          Aucune zone créée (ex: Îlot Cuisine, Salon, Entrée…).
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {propZones.map((zone) => {
                            const zoneTags = nfcTags.filter(
                              (t) => t.zone === zone["@id"],
                            );
                            return (
                              <div
                                key={zone["@id"]}
                                className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/90 p-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-neutral-100">
                                      {zone.name}
                                    </span>
                                    {zone.mountType && (
                                      <span className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.2 font-mono text-[10px] text-neutral-300">
                                        {zone.mountType}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openEditZoneModal(zone)}
                                      className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteZone(zone["@id"])}
                                      className="rounded border border-rose-900/50 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-900/50"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                {/* Puces NFC affectées à cette zone */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/70 pt-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {zoneTags.length === 0 ? (
                                      <span className="text-[11px] text-neutral-500">
                                        Aucune puce NFC associée
                                      </span>
                                    ) : (
                                      zoneTags.map((tg) => (
                                        <span
                                          key={tg["@id"]}
                                          className="inline-flex items-center gap-1 rounded border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-200"
                                        >
                                          <a
                                            href={`/g/${tg.shortUid}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="hover:underline"
                                          >
                                            #{tg.shortUid} ↗
                                          </a>
                                          {isAdmin && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                onAssignTagToZone(tg["@id"], null)
                                              }
                                              title="Détacher de cette zone"
                                              className="ml-1 text-purple-300 hover:text-white"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </span>
                                      ))
                                    )}
                                  </div>

                                  {isAdmin && availableTags.length > 0 && (
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          void onAssignTagToZone(
                                            e.target.value,
                                            zone["@id"],
                                          );
                                        }
                                      }}
                                      className="rounded border border-neutral-700 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-300"
                                    >
                                      <option value="">+ Affecter un tag NFC…</option>
                                      {availableTags.map((t) => (
                                        <option key={t["@id"]} value={t["@id"]}>
                                          #{t.shortUid} ({t.status})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modale Création / Édition Compte Client */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitAccount}
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingAccount
                  ? `Modifier le compte « ${editingAccount.name} »`
                  : "Nouveau compte client"}
              </h2>
              <button
                type="button"
                onClick={() => setAccountModal(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom du client / conciergerie
              <input
                type="text"
                required
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="ex: Chalets Prestige Courchevel"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Typologie
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value="B2B">B2B (Conciergerie / Agence / Hôtel)</option>
                <option value="B2C">B2C (Propriétaire particulier)</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountModal(false)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingAcc}
                className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {savingAcc
                  ? "Enregistrement…"
                  : editingAccount
                    ? "Enregistrer"
                    : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale Création / Édition Propriété */}
      {propModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitProperty}
            className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingProperty
                  ? `Modifier « ${editingProperty.name} »`
                  : "Nouvelle propriété"}
              </h2>
              <button
                type="button"
                onClick={() => setPropModal(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {isAdmin && accounts.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Compte client
                <select
                  value={propAccount}
                  onChange={(e) => setPropAccount(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a["@id"]} value={a["@id"]}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom du logement / chalet
              <input
                type="text"
                required
                value={propName}
                onChange={(e) => setPropName(e.target.value)}
                placeholder="ex: Chalet Le Flocon d'Or"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            {editingProperty && editingProperty.canManageWifi === false ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                Les identifiants Wi-Fi de ce logement sont chiffrés et gérés exclusivement par le client propriétaire du compte.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-200">
                    Identifiants Wi-Fi (chiffrés AES-256-GCM en base)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassInput((v) => !v)}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    {showPassInput ? "Masquer la saisie" : "Afficher la saisie"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-300">
                    Wi-Fi SSID
                    <input
                      type="text"
                      value={propWifiSsid}
                      onChange={(e) => setPropWifiSsid(e.target.value)}
                      placeholder="ex: Chalet_Flocon_5G"
                      className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-300">
                    Mot de passe Wi-Fi
                    <input
                      type={showPassInput ? "text" : "password"}
                      value={propWifiPass}
                      onChange={(e) => setPropWifiPass(e.target.value)}
                      placeholder={
                        editingProperty?.wifiConfigured
                          ? "•••••••• (vide = conserver)"
                          : "Clé WPA2/WPA3"
                      }
                      className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-sm"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-2 text-xs text-neutral-300">
                  <div className="flex items-center justify-between">
                    <span>
                      Code PIN Voyageur optionnel (demandé sur `/g/[shortUid]` avant de révéler le Wi-Fi)
                    </span>
                    {editingProperty?.wifiProtectedByCode && (
                      <label className="flex items-center gap-1 text-[11px] text-rose-300">
                        <input
                          type="checkbox"
                          checked={clearAccessCode}
                          onChange={(e) => setClearAccessCode(e.target.checked)}
                        />
                        Désactiver le PIN
                      </label>
                    )}
                  </div>
                  {!clearAccessCode && (
                    <input
                      type={showPassInput ? "text" : "password"}
                      value={propWifiAccessCode}
                      onChange={(e) => setPropWifiAccessCode(e.target.value)}
                      placeholder={
                        editingProperty?.wifiProtectedByCode
                          ? "PIN actif (laisser vide pour conserver, ou saisir un nouveau PIN)"
                          : "Optionnel — ex: 2048 (4 derniers chiffres boîte à clés)"
                      }
                      className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-xs"
                    />
                  )}
                </div>
              </div>
            )}
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              URL du livret d&apos;accueil externe
              <input
                type="url"
                value={propGuideUrl}
                onChange={(e) => setPropGuideUrl(e.target.value)}
                placeholder="https://..."
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Instructions d&apos;arrivée / départ
              <textarea
                rows={3}
                value={propInstructions}
                onChange={(e) => setPropInstructions(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPropModal(false)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingProp}
                className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {savingProp
                  ? "Enregistrement…"
                  : editingProperty
                    ? "Enregistrer"
                    : "Ajouter"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale Création / Édition Zone */}
      {zoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitZone}
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingZone
                  ? `Modifier la zone « ${editingZone.name} »`
                  : "Nouvelle zone / emplacement NFC"}
              </h2>
              <button
                type="button"
                onClick={() => setZoneModal(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom de la zone dans le logement
              <input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="ex: Îlot Cuisine, Table Salon, Entrée Skis…"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Type de pose du support
              <select
                value={zoneMountType}
                onChange={(e) => setZoneMountType(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              >
                {MOUNT_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mt}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setZoneModal(false)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingZone}
                className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {savingZone
                  ? "Enregistrement…"
                  : editingZone
                    ? "Enregistrer"
                    : "Ajouter la zone"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface NfcTagsViewProps {
  nfcTags: NfcTagItem[];
  orders: Order[];
  properties: PropertyItem[];
  zones: ZoneItem[];
  onCreateNfcTag: (payload: { shortUid: string; status: NfcTagItem["status"] }) => Promise<void>;
  onUpdateNfcTag: (
    tagIri: string,
    payload: { status?: NfcTagItem["status"]; zone?: string | null },
  ) => Promise<void>;
  onDeleteNfcTag: (tagIri: string) => Promise<void>;
}

const NFC_STATUS_BADGES: Record<NfcTagItem["status"], { label: string; cls: string }> = {
  stock: { label: "En stock", cls: "border-neutral-700 bg-neutral-800 text-neutral-300" },
  encoded: { label: "Encodé", cls: "border-sky-500/40 bg-sky-500/15 text-sky-300" },
  assigned: { label: "Assigné", cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  defective: { label: "Défectueux", cls: "border-rose-500/40 bg-rose-500/15 text-rose-300" },
};

export function NfcTagsView({
  nfcTags,
  orders,
  properties,
  zones,
  onCreateNfcTag,
  onUpdateNfcTag,
  onDeleteNfcTag,
}: NfcTagsViewProps) {
  const [shortUid, setShortUid] = useState("");
  const [status, setStatus] = useState<NfcTagItem["status"]>("stock");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortUid.trim()) return;
    setSaving(true);
    try {
      await onCreateNfcTag({ shortUid: shortUid.trim().toUpperCase(), status });
      setShortUid("");
    } finally {
      setSaving(false);
    }
  };

  const copyTagUrl = async (uid: string) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/g/${uid}`
        : `http://localhost:3000/g/${uid}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(uid);
      setTimeout(() => setCopiedId((prev) => (prev === uid ? null : prev)), 2000);
    } catch {
      // Fallback silencieux
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags NFC Atelier</h1>
          <p className="text-sm text-neutral-400">
            Inventaire des puces NFC, UID courts (`/g/[shortUid]`), affectation commande/zone et test du portail voyageur
          </p>
        </div>
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            maxLength={10}
            required
            placeholder="UID court (ex: VA2048)"
            value={shortUid}
            onChange={(e) => setShortUid(e.target.value)}
            className="w-40 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-100"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NfcTagItem["status"])}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-200"
          >
            <option value="stock">En stock</option>
            <option value="encoded">Encodé</option>
            <option value="assigned">Assigné</option>
            <option value="defective">Défectueux</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            + Enregistrer Tag
          </button>
        </form>
      </div>

      {nfcTags.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
          Aucun tag NFC enregistré. Ajoutez un UID court ci-dessus ou encodez une puce depuis une fiche commande.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nfcTags.map((tag) => {
            const badge = NFC_STATUS_BADGES[tag.status] ?? NFC_STATUS_BADGES.stock;
            const parentOrder = orders.find((o) =>
              (o.orderItems ?? []).some((it) => it["@id"] === tag.orderItem),
            );
            const orderItemObj = parentOrder?.orderItems?.find(
              (it) => it["@id"] === tag.orderItem,
            );

            return (
              <div
                key={tag["@id"]}
                className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-base font-bold text-neutral-100">
                        #{tag.shortUid}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        URL NDEF : <span className="font-mono text-neutral-300">/g/{tag.shortUid}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {tag.encodeAt && (
                    <div className="text-[11px] text-neutral-400">
                      Encodé le {new Date(tag.encodeAt).toLocaleDateString("fr-FR")}
                    </div>
                  )}

                  {parentOrder && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 px-2.5 py-1.5 text-xs text-purple-200">
                      <span className="font-mono font-bold">CMD #{parentOrder.id}</span> —{" "}
                      {orderItemObj?.productName ?? "Support"}
                    </div>
                  )}

                  <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
                    Zone / Emplacement assigné
                    <select
                      value={tag.zone ?? ""}
                      onChange={(e) =>
                        onUpdateNfcTag(tag["@id"], {
                          zone: e.target.value || null,
                          status: e.target.value ? "assigned" : tag.status,
                        })
                      }
                      className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value="">— Aucune zone assignée —</option>
                      {zones.map((z) => {
                        const p = properties.find((pr) => pr["@id"] === z.property);
                        return (
                          <option key={z["@id"]} value={z["@id"]}>
                            {p ? `${p.name} — ` : ""}
                            {z.name}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-neutral-800 pt-2.5 text-xs">
                  <select
                    value={tag.status}
                    onChange={(e) =>
                      onUpdateNfcTag(tag["@id"], {
                        status: e.target.value as NfcTagItem["status"],
                      })
                    }
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
                  >
                    <option value="stock">En stock</option>
                    <option value="encoded">Encodé</option>
                    <option value="assigned">Assigné</option>
                    <option value="defective">Défectueux</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyTagUrl(tag.shortUid)}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] text-neutral-200 hover:bg-neutral-700"
                    >
                      {copiedId === tag.shortUid ? "✓ Copié" : "Copier URL"}
                    </button>
                    <a
                      href={`/g/${tag.shortUid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/25"
                    >
                      Tester ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteNfcTag(tag["@id"])}
                      className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-900/50"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SupportTicketsViewProps {
  isAdmin: boolean;
  accounts: AccountSummary[];
  tickets: SupportTicketItem[];
  onCreateTicket: (payload: { subject: string; message: string; account: string }) => Promise<void>;
  onUpdateTicketStatus: (ticketIri: string, status: SupportTicketItem["status"]) => Promise<void>;
}

export function SupportTicketsView({
  isAdmin,
  accounts,
  tickets,
  onCreateTicket,
  onUpdateTicketStatus,
}: SupportTicketsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [accountIri, setAccountIri] = useState(accounts[0]?.["@id"] ?? "/api/accounts/1");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateTicket({
        subject: subject.trim(),
        message: message.trim(),
        account: accountIri || accounts[0]?.["@id"] || "/api/accounts/1",
      });
      setSubject("");
      setMessage("");
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Client & Brouillons IA</h1>
          <p className="text-sm text-neutral-400">
            Tickets SAV clients et pré-réponses assistées par IA pour le staff VisuAlpes
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAccountIri(accounts[0]?.["@id"] ?? "/api/accounts/1");
            setModalOpen(true);
          }}
          className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
        >
          + Nouveau ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
          Aucun ticket de support ouvert.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const acc = accounts.find((a) => a["@id"] === t.account);
            return (
              <div
                key={t["@id"]}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">#{t.id}</span>
                      <h3 className="text-base font-bold text-neutral-100">{t.subject}</h3>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Client : <strong className="text-neutral-200">{acc?.name ?? t.account}</strong>
                    </span>
                  </div>

                  {isAdmin ? (
                    <select
                      value={t.status}
                      onChange={(e) =>
                        onUpdateTicketStatus(t["@id"], e.target.value as SupportTicketItem["status"])
                      }
                      className="rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-200"
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                  ) : (
                    <span className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">
                      {t.status}
                    </span>
                  )}
                </div>

                <p className="rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs text-neutral-200">
                  {t.message}
                </p>

                {isAdmin && t.aiDraft && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-200">
                    <div className="mb-1 flex items-center justify-between font-semibold">
                      <span>Suggestion de réponse IA</span>
                      {typeof t.aiConfidence === "number" && (
                        <span className="font-mono text-[11px]">
                          Confiance : {Math.round(t.aiConfidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p>{t.aiDraft}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreate}
            className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <h2 className="text-base font-bold">Ouvrir un ticket support</h2>
            {isAdmin && accounts.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Compte client
                <select
                  value={accountIri}
                  onChange={(e) => setAccountIri(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a["@id"]} value={a["@id"]}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Sujet
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ex: Reprogrammation d'un support NFC"
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Message
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {saving ? "Envoi…" : "Créer le ticket"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

