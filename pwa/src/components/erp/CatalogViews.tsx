"use client";

import React, { useState } from "react";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";
import type {
  AccountSummary,
  NfcTagItem,
  Order,
  PropertyItem,
  SupportIssueType,
  SupportTicketItem,
  UserItem,
  ZoneItem,
} from "@/types/erp";

interface ClientsViewProps {
  isAdmin: boolean;
  accounts: AccountSummary[];
  users: UserItem[];
  properties: PropertyItem[];
  zones: ZoneItem[];
  nfcTags: NfcTagItem[];
  onCreateAccount: (payload: { name: string; type: string }) => Promise<void>;
  onUpdateAccount: (
    accountIri: string,
    payload: { name: string; type: string },
  ) => Promise<void>;
  onDeleteAccount: (accountIri: string) => Promise<void>;
  onCreateUser: (payload: {
    email: string;
    plainPassword: string;
    account: string;
    roles?: string[];
  }) => Promise<void>;
  onUpdateUserPassword: (userIri: string, plainPassword: string) => Promise<void>;
  onDeleteUser: (userIri: string) => Promise<void>;
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
  users,
  properties,
  zones,
  nfcTags,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onCreateUser,
  onUpdateUserPassword,
  onDeleteUser,
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

  // Modale gestion des accès utilisateurs (logins clients)
  const [userModal, setUserModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userAccountIri, setUserAccountIri] = useState(
    accounts[0]?.["@id"] ?? "/api/accounts/1",
  );
  const [userIsAdminRole, setUserIsAdminRole] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState<number | null>(null);
  const [resetPassValue, setResetPassValue] = useState("");

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

  const openUserAccessModal = (defaultAccountIri?: string) => {
    setUserEmail("");
    setUserPassword("");
    setUserIsAdminRole(false);
    setResetPassUserId(null);
    setResetPassValue("");
    setUserAccountIri(
      defaultAccountIri ??
        (selectedAccountFilter !== "all"
          ? selectedAccountFilter
          : accounts[0]?.["@id"] ?? "/api/accounts/1"),
    );
    setUserModal(true);
  };

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim() || userPassword.length < 8) return;
    setSavingUser(true);
    try {
      await onCreateUser({
        email: userEmail.trim(),
        plainPassword: userPassword,
        account: userAccountIri || accounts[0]?.["@id"] || "/api/accounts/1",
        roles: userIsAdminRole ? ["ROLE_ADMIN", "ROLE_USER"] : ["ROLE_USER"],
      });
      setUserEmail("");
      setUserPassword("");
      setUserIsAdminRole(false);
    } finally {
      setSavingUser(false);
    }
  };

  const submitResetPassword = async (userIri: string) => {
    if (resetPassValue.length < 8) return;
    setSavingUser(true);
    try {
      await onUpdateUserPassword(userIri, resetPassValue);
      setResetPassUserId(null);
      setResetPassValue("");
    } finally {
      setSavingUser(false);
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
    setPropWifiPass("");
    setPropWifiAccessCode("");
    setClearAccessCode(false);
    setShowPassInput(false);
    setPropGuideUrl(prop.externalGuideUrl ?? "");
    setPropInstructions(prop.instructions ?? "");
    setPropModal(true);
  };

  const handleToggleRevealWifi = async (propId: number) => {
    if (revealedWifi[propId]?.wifiPassword) {
      setRevealedWifi((prev) => {
        const next = { ...prev };
        delete next[propId];
        return next;
      });
      setQrOpenPropIds((prev) => ({ ...prev, [propId]: false }));
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
      setZoneName("");
      setZoneModal(false);
    } finally {
      setSavingZone(false);
    }
  };

  const visibleProperties =
    selectedAccountFilter === "all"
      ? properties
      : properties.filter((p) => p.account === selectedAccountFilter);

  const selectedAccountObj =
    selectedAccountFilter !== "all"
      ? accounts.find((a) => a["@id"] === selectedAccountFilter) ?? null
      : null;

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête épuré */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Clients & Logements
          </h1>
          <p className="text-xs text-neutral-400">
            Comptes clients, identifiants Wi-Fi chiffrés et zones d&apos;emplacement NFC
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => openUserAccessModal()}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                Accès & Logins ({users.length})
              </button>
              <button
                type="button"
                onClick={openCreateAccountModal}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
              >
                + Compte client
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => openCreatePropertyModal()}
            className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
          >
            + Nouveau logement
          </button>
        </div>
      </div>

      {/* Barre unifiée de sélection de compte client */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedAccountFilter("all")}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedAccountFilter === "all"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Tous les comptes ({properties.length})
            </button>
            {accounts.map((acc) => {
              const count = properties.filter((p) => p.account === acc["@id"]).length;
              const isSelected = selectedAccountFilter === acc["@id"];
              return (
                <button
                  key={acc["@id"]}
                  type="button"
                  onClick={() => setSelectedAccountFilter(acc["@id"])}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    isSelected
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span>{acc.name}</span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isAdmin && selectedAccountObj && (
            <div className="flex items-center gap-1.5 pr-1 text-xs">
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                {selectedAccountObj.type}
              </span>
              <button
                type="button"
                onClick={() => openEditAccountModal(selectedAccountObj)}
                className="rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
              >
                Renommer compte
              </button>
              <button
                type="button"
                onClick={() => void onDeleteAccount(selectedAccountObj["@id"])}
                className="rounded-md px-2 py-1 text-[11px] text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grille des logements / propriétés */}
      {visibleProperties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
          Aucun logement configuré pour cette sélection.
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
                className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-5"
              >
                <div className="flex flex-col gap-3.5">
                  {/* En-tête du logement */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">{prop.name}</h3>
                      <span className="text-xs text-neutral-400">
                        {acc?.name ?? prop.account}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditPropertyModal(prop)}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteProperty(prop["@id"])}
                        title="Supprimer ce logement"
                        className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Bloc Wi-Fi compact & sécurisé */}
                  <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">Wi-Fi :</span>
                        <span className="font-mono font-semibold text-white">
                          {revealedWifi[prop.id]?.wifiSSID ??
                            prop.wifiSSID ??
                            "Non configuré"}
                        </span>
                        {prop.wifiProtectedByCode && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                            PIN actif
                          </span>
                        )}
                      </div>

                      {!prop.wifiConfigured ? (
                        <span className="text-[11px] text-neutral-500">Aucun mot de passe</span>
                      ) : prop.canManageWifi === false ? (
                        <span className="font-mono text-[11px] text-neutral-500">
                          Protégé client
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-emerald-300">
                            {revealedWifi[prop.id]?.wifiPassword ?? "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleToggleRevealWifi(prop.id)}
                            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
                          >
                            {revealedWifi[prop.id]?.wifiPassword ? "Masquer" : "Afficher"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyWifiPassword(prop.id)}
                            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
                          >
                            {copiedPropId === prop.id ? "✓ Copié" : "Copier"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleWifiQr(prop.id)}
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                              qrOpenPropIds[prop.id]
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            }`}
                          >
                            QR Code
                          </button>
                        </div>
                      )}
                    </div>

                    {qrOpenPropIds[prop.id] && revealedWifi[prop.id]?.wifiQrPayload && (
                      <div className="flex flex-col items-center gap-2 border-t border-neutral-800/80 pt-3">
                        <WifiQrCodeSvg
                          value={revealedWifi[prop.id]!.wifiQrPayload!}
                          size={148}
                        />
                        <span className="text-[11px] text-neutral-400">
                          Connexion directe au réseau{" "}
                          <strong className="font-mono text-neutral-200">
                            {revealedWifi[prop.id]?.wifiSSID ?? prop.wifiSSID}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Instructions & lien livret sur une ligne discrète */}
                  {(prop.instructions || prop.externalGuideUrl) && (
                    <div className="flex flex-col gap-1.5 text-xs text-neutral-400">
                      {prop.instructions && (
                        <p className="line-clamp-2 text-neutral-300">{prop.instructions}</p>
                      )}
                      {prop.externalGuideUrl && (
                        <a
                          href={prop.externalGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                        >
                          <span>Livret d&apos;accueil externe</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Section Zones épurée */}
                  <div className="flex flex-col gap-2 border-t border-neutral-800/70 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-400">
                        Zones de pose ({propZones.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => openCreateZoneModal(prop["@id"])}
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        + Ajouter une zone
                      </button>
                    </div>

                    {propZones.length === 0 ? (
                      <p className="text-xs text-neutral-600">
                        Aucune zone définie pour ce logement.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {propZones.map((zone) => {
                          const zoneTags = nfcTags.filter(
                            (t) => t.zone === zone["@id"],
                          );
                          return (
                            <div
                              key={zone["@id"]}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-3 py-2 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-neutral-200">
                                  {zone.name}
                                </span>
                                {zone.mountType && (
                                  <span className="text-[11px] text-neutral-500">
                                    • {zone.mountType}
                                  </span>
                                )}
                                {zoneTags.map((tg) => (
                                  <span
                                    key={tg["@id"]}
                                    className="inline-flex items-center gap-1 rounded bg-purple-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-purple-300"
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
                                          void onAssignTagToZone(tg["@id"], null)
                                        }
                                        title="Détacher cette puce"
                                        className="ml-0.5 text-purple-300 hover:text-white"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>

                              <div className="flex items-center gap-1.5">
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
                                    className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300"
                                  >
                                    <option value="">+ Tag NFC…</option>
                                    {availableTags.map((t) => (
                                      <option key={t["@id"]} value={t["@id"]}>
                                        #{t.shortUid}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditZoneModal(zone)}
                                  className="rounded-md px-1.5 py-0.5 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                >
                                  Éditer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void onDeleteZone(zone["@id"])}
                                  className="rounded-md px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                                >
                                  ×
                                </button>
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

      {/* Modale Création / Édition Compte Client */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitAccount}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingAccount
                  ? `Modifier « ${editingAccount.name} »`
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
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Typologie
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value="B2B">B2B (Conciergerie / Agence / Hôtel)</option>
                <option value="B2C">B2C (Propriétaire particulier)</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountModal(false)}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingAcc}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950"
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
            className="flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingProperty
                  ? `Modifier « ${editingProperty.name} »`
                  : "Nouveau logement"}
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
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
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
              Nom du logement
              <input
                type="text"
                required
                value={propName}
                onChange={(e) => setPropName(e.target.value)}
                placeholder="ex: Chalet Le Flocon d'Or"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            {editingProperty && editingProperty.canManageWifi === false ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
                Les identifiants Wi-Fi sont gérés exclusivement par le client propriétaire du compte.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-200">
                    Connexion Wi-Fi (chiffrée AES-256-GCM)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassInput((v) => !v)}
                    className="text-[11px] text-neutral-400 hover:text-white"
                  >
                    {showPassInput ? "Masquer" : "Afficher"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-400">
                    Nom du réseau (SSID)
                    <input
                      type="text"
                      value={propWifiSsid}
                      onChange={(e) => setPropWifiSsid(e.target.value)}
                      placeholder="ex: Chalet_Flocon_5G"
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-400">
                    Mot de passe
                    <input
                      type={showPassInput ? "text" : "password"}
                      value={propWifiPass}
                      onChange={(e) => setPropWifiPass(e.target.value)}
                      placeholder={
                        editingProperty?.wifiConfigured
                          ? " Vide = conserver"
                          : "Clé WPA2/WPA3"
                      }
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-sm text-white"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-2 text-xs text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Code PIN voyageur (optionnel)</span>
                    {editingProperty?.wifiProtectedByCode && (
                      <label className="flex items-center gap-1 text-[11px] text-rose-300">
                        <input
                          type="checkbox"
                          checked={clearAccessCode}
                          onChange={(e) => setClearAccessCode(e.target.checked)}
                        />
                        Retirer le PIN
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
                          ? "PIN actif (laisser vide pour conserver)"
                          : "Ex: 2516 (demandé avant d'afficher le Wi-Fi)"
                      }
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-white"
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
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Instructions d&apos;arrivée / départ
              <textarea
                rows={3}
                value={propInstructions}
                onChange={(e) => setPropInstructions(e.target.value)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPropModal(false)}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingProp}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950"
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
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingZone ? `Modifier « ${editingZone.name} »` : "Nouvelle zone"}
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
              Nom de la zone
              <input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="ex: Îlot Cuisine, Table Salon…"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Type de pose
              <select
                value={zoneMountType}
                onChange={(e) => setZoneMountType(e.target.value)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
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
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingZone}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {savingZone
                  ? "Enregistrement…"
                  : editingZone
                    ? "Enregistrer"
                    : "Ajouter"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale Gestion des Accès Utilisateurs (Logins Clients & Atelier) */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-bold">Accès & Identifiants de connexion</h2>
                <p className="text-xs text-neutral-400">
                  Créez un login client rattaché à son compte pour qu&apos;il gère son Wi-Fi et ses logements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserModal(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Formulaire d'ajout d'un utilisateur */}
            <form
              onSubmit={submitNewUser}
              className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 text-xs"
            >
              <span className="font-semibold text-neutral-200">
                Créer un nouvel accès utilisateur
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-neutral-400">
                  Email de connexion
                  <input
                    type="email"
                    required
                    placeholder="client@domaine.fr"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-neutral-400">
                  Mot de passe (min. 8 car.)
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 caractères"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-white"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={userAccountIri}
                    onChange={(e) => setUserAccountIri(e.target.value)}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200"
                  >
                    {accounts.map((a) => (
                      <option key={a["@id"]} value={a["@id"]}>
                        Compte : {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-neutral-300">
                    <input
                      type="checkbox"
                      checked={userIsAdminRole}
                      onChange={(e) => setUserIsAdminRole(e.target.checked)}
                    />
                    Rôle Admin Atelier
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="rounded-lg bg-white px-3.5 py-1.5 font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
                >
                  {savingUser ? "Création…" : "+ Créer l'accès"}
                </button>
              </div>
            </form>

            {/* Liste des utilisateurs existants */}
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
              {users.map((u) => {
                const acc = accounts.find((a) => a["@id"] === u.account);
                const isUserAdmin = (u.roles ?? []).includes("ROLE_ADMIN");
                return (
                  <div
                    key={u["@id"]}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-800/80 bg-neutral-950/50 px-3 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-white">
                            {u.email}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                              isUserAdmin
                                ? "bg-sky-500/15 text-sky-300"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {isUserAdmin ? "Admin" : "Client"}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          Compte : {acc?.name ?? u.account}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResetPassUserId((prev) =>
                              prev === u.id ? null : u.id,
                            );
                            setResetPassValue("");
                          }}
                          className="rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
                        >
                          Mot de passe
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteUser(u["@id"])}
                          className="rounded-md px-1.5 py-1 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {resetPassUserId === u.id && (
                      <div className="flex items-center gap-2 border-t border-neutral-800/70 pt-2">
                        <input
                          type="password"
                          minLength={8}
                          placeholder="Nouveau mot de passe (min. 8 car.)"
                          value={resetPassValue}
                          onChange={(e) => setResetPassValue(e.target.value)}
                          className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-white"
                        />
                        <button
                          type="button"
                          disabled={savingUser || resetPassValue.length < 8}
                          onClick={() => void submitResetPassword(u["@id"])}
                          className="rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-neutral-950 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
  onReplaceDefectiveNfcTag: (oldTag: NfcTagItem, newShortUid: string) => Promise<void>;
}

const NFC_STATUS_BADGES: Record<NfcTagItem["status"], { label: string; cls: string }> = {
  stock: { label: "En stock", cls: "bg-neutral-800 text-neutral-300" },
  encoded: { label: "Encodé", cls: "bg-sky-500/15 text-sky-300" },
  assigned: { label: "Assigné", cls: "bg-emerald-500/15 text-emerald-300" },
  defective: { label: "Défectueux", cls: "bg-rose-500/15 text-rose-300" },
};

function generateQuickShortUid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VA${suffix}`;
}

export function NfcTagsView({
  nfcTags,
  orders,
  properties,
  zones,
  onCreateNfcTag,
  onUpdateNfcTag,
  onDeleteNfcTag,
  onReplaceDefectiveNfcTag,
}: NfcTagsViewProps) {
  const [shortUid, setShortUid] = useState<string>("");
  const [status, setStatus] = useState<NfcTagItem["status"]>("stock");
  const [statusFilter, setStatusFilter] = useState<"all" | NfcTagItem["status"]>("all");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replacingTagId, setReplacingTagId] = useState<number | null>(null);
  const [replacementUid, setReplacementUid] = useState<string>("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const uidToCreate = (shortUid.trim() || generateQuickShortUid()).toUpperCase();
    setSaving(true);
    try {
      await onCreateNfcTag({ shortUid: uidToCreate, status });
      setShortUid(generateQuickShortUid());
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

  const filteredTags =
    statusFilter === "all"
      ? nfcTags
      : nfcTags.filter((t) => t.status === statusFilter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Tags NFC</h1>
          <p className="text-xs text-neutral-400">
            Inventaire des puces NFC, affectation aux zones et test du portail voyageur
          </p>
        </div>
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 pr-1">
            <input
              type="text"
              maxLength={10}
              placeholder="VA2048"
              value={shortUid}
              onFocus={() => {
                if (!shortUid) setShortUid(generateQuickShortUid());
              }}
              onChange={(e) => setShortUid(e.target.value.toUpperCase())}
              className="w-28 bg-transparent px-2.5 py-1.5 font-mono text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={() => setShortUid(generateQuickShortUid())}
              className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              Générer
            </button>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NfcTagItem["status"])}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-200"
          >
            <option value="stock">En stock</option>
            <option value="encoded">Encodé</option>
            <option value="assigned">Assigné</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
          >
            + Ajouter
          </button>
        </form>
      </div>

      {/* Filtres rapides par statut */}
      <div className="flex flex-wrap items-center gap-1 self-start rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-1 text-xs">
        {(
          [
            { id: "all", label: `Tous (${nfcTags.length})` },
            {
              id: "stock",
              label: `En stock (${nfcTags.filter((t) => t.status === "stock").length})`,
            },
            {
              id: "assigned",
              label: `Assignés (${nfcTags.filter((t) => t.status === "assigned").length})`,
            },
            {
              id: "defective",
              label: `Défectueux (${nfcTags.filter((t) => t.status === "defective").length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === tab.id
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredTags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
          Aucun tag NFC dans cette catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map((tag) => {
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
                className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        #{tag.shortUid}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-500">
                        /g/{tag.shortUid}
                      </span>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {parentOrder && (
                    <div className="text-xs text-neutral-400">
                      Commande <strong className="font-mono text-neutral-200">#{parentOrder.id}</strong> •{" "}
                      {orderItemObj?.productName ?? "Support"}
                    </div>
                  )}

                  <select
                    value={tag.zone ?? ""}
                    onChange={(e) =>
                      void onUpdateNfcTag(tag["@id"], {
                        zone: e.target.value || null,
                        status: e.target.value ? "assigned" : tag.status,
                      })
                    }
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200"
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
                </div>

                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-800/70 pt-2.5 text-xs">
                  <select
                    value={tag.status}
                    onChange={(e) =>
                      void onUpdateNfcTag(tag["@id"], {
                        status: e.target.value as NfcTagItem["status"],
                      })
                    }
                    className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-300"
                  >
                    <option value="stock">En stock</option>
                    <option value="encoded">Encodé</option>
                    <option value="assigned">Assigné</option>
                    <option value="defective">Défectueux</option>
                  </select>

                  <div className="flex items-center gap-1">
                    {tag.status !== "defective" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (replacingTagId === tag.id) {
                            setReplacingTagId(null);
                          } else {
                            setReplacingTagId(tag.id);
                            setReplacementUid(generateQuickShortUid());
                          }
                        }}
                        title="Déclarer cette puce défectueuse et transférer sa zone/commande sur un nouvel UID"
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-amber-300 hover:bg-neutral-800"
                      >
                        SAV
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyTagUrl(tag.shortUid)}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    >
                      {copiedId === tag.shortUid ? "✓ Copié" : "Copier lien"}
                    </button>
                    <a
                      href={`/g/${tag.shortUid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-sky-300 hover:bg-neutral-800"
                    >
                      Ouvrir ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => void onDeleteNfcTag(tag["@id"])}
                      className="rounded-md px-1.5 py-1 text-xs text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {replacingTagId === tag.id && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs">
                    <input
                      type="text"
                      maxLength={10}
                      value={replacementUid}
                      onChange={(e) => setReplacementUid(e.target.value.toUpperCase())}
                      placeholder="Nouvel UID"
                      className="w-28 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 font-mono text-xs text-white"
                    />
                    <span className="flex-1 text-[11px] text-amber-200/90">
                      Transfère zone & commande
                    </span>
                    <button
                      type="button"
                      disabled={saving || !replacementUid.trim()}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await onReplaceDefectiveNfcTag(tag, replacementUid);
                          setReplacingTagId(null);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-neutral-950 hover:bg-amber-300 disabled:opacity-50"
                    >
                      Remplacer
                    </button>
                  </div>
                )}
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
  properties: PropertyItem[];
  nfcTags: NfcTagItem[];
  tickets: SupportTicketItem[];
  onCreateTicket: (payload: {
    subject: string;
    message: string;
    account: string;
    issueType?: SupportIssueType;
    property?: string | null;
    nfcTag?: string | null;
  }) => Promise<void>;
  onUpdateTicket: (
    ticketIri: string,
    payload: Partial<
      Pick<SupportTicketItem, "status" | "aiDraft" | "isAiResolved" | "issueType">
    >,
  ) => Promise<void>;
}

const TICKET_STATUS_LABELS: Record<SupportTicketItem["status"], { label: string; cls: string }> = {
  open: { label: "Ouvert", cls: "bg-amber-500/15 text-amber-300" },
  in_progress: { label: "En cours", cls: "bg-sky-500/15 text-sky-300" },
  resolved: { label: "Résolu", cls: "bg-emerald-500/15 text-emerald-300" },
  closed: { label: "Fermé", cls: "bg-neutral-800 text-neutral-400" },
};

const ISSUE_TYPE_LABELS: Record<SupportIssueType, { label: string; cls: string }> = {
  nfc_defect: { label: "Puce NFC / Matériel", cls: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  wifi_issue: { label: "Wi-Fi & Accès", cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  guide_update: { label: "Livret / Consignes", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  billing: { label: "Commande / Facturation", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  other: { label: "Autre demande", cls: "border-neutral-700 bg-neutral-800/80 text-neutral-300" },
};

export function SupportTicketsView({
  isAdmin,
  accounts,
  properties,
  nfcTags,
  tickets,
  onCreateTicket,
  onUpdateTicket,
}: SupportTicketsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [issueType, setIssueType] = useState<SupportIssueType>("other");
  const [accountIri, setAccountIri] = useState(accounts[0]?.["@id"] ?? "/api/accounts/1");
  const [propertyIri, setPropertyIri] = useState<string>("");
  const [nfcTagIri, setNfcTagIri] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [busyTicketIri, setBusyTicketIri] = useState<string | null>(null);

  const accountProperties = properties.filter((p) => p.account === accountIri);

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const aiReadyCount = tickets.filter((t) => Boolean(t.aiDraft) && t.status !== "resolved" && t.status !== "closed").length;
  const aiResolvedCount = tickets.filter((t) => Boolean(t.isAiResolved)).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateTicket({
        subject: subject.trim(),
        message: message.trim(),
        account: accountIri || accounts[0]?.["@id"] || "/api/accounts/1",
        issueType,
        property: propertyIri || null,
        nfcTag: nfcTagIri || null,
      });
      setSubject("");
      setMessage("");
      setIssueType("other");
      setPropertyIri("");
      setNfcTagIri("");
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAiDraft = async (t: SupportTicketItem) => {
    const finalDraft = editedDrafts[t["@id"]] ?? t.aiDraft ?? "";
    setBusyTicketIri(t["@id"]);
    try {
      await onUpdateTicket(t["@id"], {
        aiDraft: finalDraft,
        isAiResolved: true,
        status: "resolved",
      });
    } finally {
      setBusyTicketIri(null);
    }
  };

  const handleRegenerateAi = async (t: SupportTicketItem) => {
    setBusyTicketIri(t["@id"]);
    try {
      await onUpdateTicket(t["@id"], { aiDraft: "" });
      setEditedDrafts((prev) => {
        const copy = { ...prev };
        delete copy[t["@id"]];
        return copy;
      });
    } finally {
      setBusyTicketIri(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Support & Triage IA</h1>
          <p className="text-xs text-neutral-400">
            Qualification automatique RAG et résolution assistée des demandes SAV
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const defaultAcc = accounts[0]?.["@id"] ?? "/api/accounts/1";
            setAccountIri(defaultAcc);
            setPropertyIri("");
            setNfcTagIri("");
            setIssueType("other");
            setModalOpen(true);
          }}
          className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
        >
          + Nouveau ticket
        </button>
      </div>

      {/* Synthèse rapide SAV & IA */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3">
          <span className="text-[11px] text-neutral-400">À traiter</span>
          <p className="mt-0.5 font-mono text-lg font-bold text-white">{openCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3">
          <span className="text-[11px] text-neutral-400">Brouillons IA prêts</span>
          <p className="mt-0.5 font-mono text-lg font-bold text-sky-300">{aiReadyCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3">
          <span className="text-[11px] text-neutral-400">Résolus via IA</span>
          <p className="mt-0.5 font-mono text-lg font-bold text-emerald-300">{aiResolvedCount}</p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
          Aucun ticket de support ouvert.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const acc = accounts.find((a) => a["@id"] === t.account);
            const prop = t.property ? properties.find((p) => p["@id"] === t.property) : null;
            const tag = t.nfcTag ? nfcTags.find((tg) => tg["@id"] === t.nfcTag) : null;
            const badge = TICKET_STATUS_LABELS[t.status] ?? TICKET_STATUS_LABELS.open;
            const issueBadge = ISSUE_TYPE_LABELS[t.issueType ?? "other"] ?? ISSUE_TYPE_LABELS.other;
            const currentDraft = editedDrafts[t["@id"]] ?? t.aiDraft ?? "";
            const confidencePct =
              typeof t.aiConfidence === "number" ? Math.round(t.aiConfidence * 100) : null;

            return (
              <div
                key={t["@id"]}
                className="flex flex-col gap-3 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-neutral-500">#{t.id}</span>
                    <h3 className="text-sm font-bold text-white">{t.subject}</h3>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${issueBadge.cls}`}>
                      {issueBadge.label}
                    </span>
                    <span className="text-xs text-neutral-400">
                      • {acc?.name ?? t.account}
                    </span>
                    {prop && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                        {prop.name}
                      </span>
                    )}
                    {tag && (
                      <span className="rounded bg-purple-500/15 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">
                        #{tag.shortUid}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {t.isAiResolved && (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        ✓ Résolu IA
                      </span>
                    )}
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {isAdmin && (
                      <select
                        value={t.status}
                        onChange={(e) =>
                          void onUpdateTicket(t["@id"], {
                            status: e.target.value as SupportTicketItem["status"],
                          })
                        }
                        className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-200"
                      >
                        <option value="open">Ouvert</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolu</option>
                        <option value="closed">Fermé</option>
                      </select>
                    )}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-neutral-300">{t.message}</p>

                {isAdmin && (t.aiDraft || busyTicketIri === t["@id"]) && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-sky-500/25 bg-sky-950/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-sky-300">
                          Brouillon IA (Contexte RAG)
                        </span>
                        {confidencePct !== null && (
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-200">
                            Confiance {confidencePct}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyTicketIri === t["@id"]}
                          onClick={() => void handleRegenerateAi(t)}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                        >
                          Régénérer IA
                        </button>
                        {t.status !== "resolved" && (
                          <button
                            type="button"
                            disabled={busyTicketIri === t["@id"]}
                            onClick={() => void handleApproveAiDraft(t)}
                            className="rounded-lg bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
                          >
                            ✓ Valider & Résoudre via IA
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={currentDraft}
                      onChange={(e) =>
                        setEditedDrafts((prev) => ({
                          ...prev,
                          [t["@id"]]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950/80 p-2.5 text-xs leading-relaxed text-neutral-200 outline-none focus:border-sky-500/50"
                    />
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
            className="flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">Nouveau ticket SAV</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {isAdmin && accounts.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Client
                <select
                  value={accountIri}
                  onChange={(e) => {
                    setAccountIri(e.target.value);
                    setPropertyIri("");
                  }}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a["@id"]} value={a["@id"]}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Catégorie (ou auto-détection IA)
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as SupportIssueType)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs"
                >
                  <option value="other">Détection automatique IA</option>
                  <option value="nfc_defect">Puce NFC / Matériel</option>
                  <option value="wifi_issue">Wi-Fi & Accès</option>
                  <option value="guide_update">Livret / Consignes</option>
                  <option value="billing">Commande / Facturation</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Logement concerné (optionnel)
                <select
                  value={propertyIri}
                  onChange={(e) => setPropertyIri(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs"
                >
                  <option value="">— Aucun —</option>
                  {accountProperties.map((p) => (
                    <option key={p["@id"]} value={p["@id"]}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {nfcTags.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Puce NFC concernée (optionnel)
                <select
                  value={nfcTagIri}
                  onChange={(e) => setNfcTagIri(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs"
                >
                  <option value="">— Aucune puce spécifique —</option>
                  {nfcTags.map((tg) => (
                    <option key={tg["@id"]} value={tg["@id"]}>
                      #{tg.shortUid} ({tg.status})
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
                placeholder="ex: Puce NFC #VA4568 ne répond plus au scan"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Description
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre demande, l'IA préparera un diagnostic instantané…"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {saving ? "Analyse IA & Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
