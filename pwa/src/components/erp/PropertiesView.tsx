"use client";

import React, { useState, useMemo } from "react";
import {
  Home,
  Plus,
  Search,
  Building,
  MapPin,
  Users,
  Wifi,
  Key,
  Shield,
  Edit,
  Trash2,
  QrCode,
  ExternalLink,
  Check,
  Copy,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AccountSummary,
  NfcTagItem,
  PropertyItem,
  UserItem,
  ZoneItem,
} from "@/types/erp";

interface PropertiesViewProps {
  isAdmin: boolean;
  properties: PropertyItem[];
  accounts: AccountSummary[];
  zones: ZoneItem[];
  nfcTags: NfcTagItem[];
  users: UserItem[];
  onCreateProperty: (payload: {
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
  }) => Promise<void>;
  onUpdateProperty: (
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
      wifiSSID?: string;
      wifiPassword?: string;
      wifiAccessCode?: string;
      externalGuideUrl?: string;
      instructions?: string;
    }
  ) => Promise<void>;
  onDeleteProperty: (propertyIri: string) => Promise<void>;
  onRevealPropertyWifi: (propertyId: number) => Promise<{
    wifiSSID: string | null;
    wifiPassword: string | null;
    wifiQrPayload: string | null;
  } | null>;
  onUpdateAssignedUsers?: (
    propertyId: number,
    userIris: string[]
  ) => Promise<boolean>;
  onCreateZone: (name: string, propertyIri: string, mountType?: string) => Promise<void>;
  onDeleteZone: (zoneIri: string) => Promise<void>;
}

const ALPINE_RESORTS = [
  "Les 2 Alpes",
  "Chamonix Mont-Blanc",
  "Megève",
  "Courchevel",
  "Méribel",
  "Val d'Isère",
  "Tignes",
  "Alpe d'Huez",
  "Val Thorens",
  "La Clusaz",
  "Morzine - Avoriaz",
];

const TYPOLOGIES = [
  "Chalet",
  "Chalet d'exception",
  "Appartement",
  "Penthouse",
  "Refuge",
  "Manoir",
  "Résidence",
];

export function PropertiesView({
  isAdmin,
  properties,
  accounts,
  zones,
  nfcTags,
  users,
  onCreateProperty,
  onUpdateProperty,
  onDeleteProperty,
  onRevealPropertyWifi,
  onUpdateAssignedUsers,
  onCreateZone,
  onDeleteZone,
}: PropertiesViewProps) {
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [resortFilter, setResortFilter] = useState("all");
  const [typologyFilter, setTypologyFilter] = useState("all");

  // Dépliage de la liste des propriétés
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedPropertyIds(filteredProperties.map((p) => p.id));
  };

  const collapseAll = () => {
    setExpandedPropertyIds([]);
  };

  // Modale Propriété (Création / Édition)
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<PropertyItem | null>(null);
  const [propName, setPropName] = useState("");
  const [propAccount, setPropAccount] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propResort, setPropResort] = useState("Les 2 Alpes");
  const [propTypology, setPropTypology] = useState("Chalet");
  const [propCapacity, setPropCapacity] = useState<number | "">("");
  const [propBedrooms, setPropBedrooms] = useState<number | "">("");
  const [propKeyBoxCode, setPropKeyBoxCode] = useState("");
  const [propCoverImageUrl, setPropCoverImageUrl] = useState("");
  const [propWifiSsid, setPropWifiSsid] = useState("");
  const [propWifiPass, setPropWifiPass] = useState("");
  const [propWifiAccessCode, setPropWifiAccessCode] = useState("");
  const [propGuideUrl, setPropGuideUrl] = useState("");
  const [propInstructions, setPropInstructions] = useState("");
  const [selectedUserIris, setSelectedUserIris] = useState<string[]>([]);
  const [savingProp, setSavingProp] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modale Révélation Wi-Fi / QR
  const [revealedWifiMap, setRevealedWifiMap] = useState<
    Record<number, { wifiSSID: string | null; wifiPassword: string | null; wifiQrPayload: string | null }>
  >({});
  const [loadingWifiId, setLoadingWifiId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modale Collaborateurs & Droits Logement
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [targetProperty, setTargetProperty] = useState<PropertyItem | null>(null);
  const [tempAssignedUserIris, setTempAssignedUserIris] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSavedNotice, setAccessSavedNotice] = useState(false);

  // Modale Ajout de zone
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zonePropIri, setZonePropIri] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneMount, setNewZoneMount] = useState("Support Bois Gravé");
  const [savingZone, setSavingZone] = useState(false);

  // Distinct resorts from existing properties
  const availableResorts = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.resort) set.add(p.resort);
    });
    return Array.from(set);
  }, [properties]);

  // Propriétés filtrées
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const acc = accounts.find((a) => a["@id"] === p.account);
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.resort && p.resort.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (acc?.name && acc.name.toLowerCase().includes(q));

      const matchAccount = accountFilter === "all" || p.account === accountFilter;
      const matchResort = resortFilter === "all" || p.resort === resortFilter;
      const matchTypology = typologyFilter === "all" || p.typology === typologyFilter;

      return matchSearch && matchAccount && matchResort && matchTypology;
    });
  }, [properties, accounts, searchQuery, accountFilter, resortFilter, typologyFilter]);

  // Utilisateurs du compte rattaché à la propriété en cours d'édition
  const currentAccountUsers = useMemo(() => {
    const accIri = targetProperty?.account || propAccount;
    if (!accIri) return users;
    return users.filter((u) => u.account === accIri);
  }, [users, targetProperty, propAccount]);

  // Ouvrir en création
  const handleOpenCreate = () => {
    setEditingProp(null);
    setPropName("");
    setPropAccount(accounts[0]?.["@id"] || "/api/accounts/1");
    setPropAddress("");
    setPropResort("Les 2 Alpes");
    setPropTypology("Chalet");
    setPropCapacity("");
    setPropBedrooms("");
    setPropKeyBoxCode("");
    setPropCoverImageUrl("");
    setPropWifiSsid("");
    setPropWifiPass("");
    setPropWifiAccessCode("");
    setPropGuideUrl("");
    setPropInstructions("");
    setSelectedUserIris([]);
    setErrorNotice(null);
    setPropModalOpen(true);
  };

  // Ouvrir en édition
  const handleOpenEdit = (p: PropertyItem) => {
    setEditingProp(p);
    setPropName(p.name);
    setPropAccount(p.account);
    setPropAddress(p.address || "");
    setPropResort(p.resort || "Les 2 Alpes");
    setPropTypology(p.typology || "Chalet");
    setPropCapacity(p.capacity ?? "");
    setPropBedrooms(p.bedrooms ?? "");
    setPropKeyBoxCode(p.keyBoxCode || "");
    setPropCoverImageUrl(p.coverImageUrl || "");
    setPropWifiSsid(p.wifiSSID || p.wifiSsidMasked || "");
    setPropWifiPass("");
    setPropWifiAccessCode("");
    setPropGuideUrl(p.externalGuideUrl || "");
    setPropInstructions(p.instructions || "");

    // Trouver les utilisateurs ayant cette propriété dans leurs propriétés
    const assigned = users
      .filter((u) => (u.properties || []).includes(p["@id"]))
      .map((u) => u["@id"]);
    setSelectedUserIris(assigned);

    setErrorNotice(null);
    setPropModalOpen(true);
  };

  // Ouvrir modale gestion des droits logement
  const handleOpenUsersModal = (p: PropertyItem) => {
    setTargetProperty(p);
    const assigned = users
      .filter((u) => (u.properties || []).includes(p["@id"]))
      .map((u) => u["@id"]);
    setTempAssignedUserIris(assigned);
    setAccessSavedNotice(false);
    setUsersModalOpen(true);
  };

  // Sauvegarder les droits d'accès
  const handleSaveAssignedUsers = async () => {
    if (!targetProperty) return;
    setSavingAccess(true);
    try {
      if (onUpdateAssignedUsers) {
        await onUpdateAssignedUsers(targetProperty.id, tempAssignedUserIris);
      } else {
        // Fallback direct
        await fetch(`/api/properties/${targetProperty.id}/assigned-users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIris: tempAssignedUserIris }),
        });
      }
      setAccessSavedNotice(true);
      setTimeout(() => setAccessSavedNotice(false), 3000);
    } finally {
      setSavingAccess(false);
    }
  };

  // Soumission modale Propriété
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProp(true);
    setErrorNotice(null);

    const payload = {
      name: propName.trim(),
      account: propAccount,
      address: propAddress.trim() || undefined,
      resort: propResort.trim() || undefined,
      typology: propTypology || undefined,
      capacity: typeof propCapacity === "number" ? propCapacity : undefined,
      bedrooms: typeof propBedrooms === "number" ? propBedrooms : undefined,
      keyBoxCode: propKeyBoxCode.trim() || undefined,
      coverImageUrl: propCoverImageUrl.trim() || undefined,
      wifiSSID: propWifiSsid.trim() || undefined,
      wifiPassword: propWifiPass.trim() || undefined,
      wifiAccessCode: propWifiAccessCode.trim() || undefined,
      externalGuideUrl: propGuideUrl.trim() || undefined,
      instructions: propInstructions.trim() || undefined,
    };

    try {
      if (editingProp) {
        await onUpdateProperty(editingProp["@id"], payload);
        if (onUpdateAssignedUsers) {
          await onUpdateAssignedUsers(editingProp.id, selectedUserIris);
        }
      } else {
        await onCreateProperty(payload);
      }
      setPropModalOpen(false);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSavingProp(false);
    }
  };

  // Révéler le Wi-Fi
  const handleToggleWifi = async (p: PropertyItem) => {
    if (revealedWifiMap[p.id]) {
      setRevealedWifiMap((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      return;
    }

    setLoadingWifiId(p.id);
    try {
      const data = await onRevealPropertyWifi(p.id);
      if (data) {
        setRevealedWifiMap((prev) => ({ ...prev, [p.id]: data }));
      }
    } finally {
      setLoadingWifiId(null);
    }
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-[#F7F5EF]">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#DFCA9F]">
              <Home className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Propriétés
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8C8379]">
            Fiches hébergements enrichies, coffre-fort Wi-Fi &amp; habilitations d&apos;accès par collaborateur.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-4 py-2 text-xs font-semibold text-[#111113] transition-all hover:bg-[#DFCA9F] hover:shadow-lg hover:shadow-[#C9A96B]/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle Propriété</span>
        </button>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#161619] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8379]" />
          <input
            type="text"
            placeholder="Rechercher par chalet, station, adresse, propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#111113] pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre Compte */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-none"
          >
            <option value="all">Tous les comptes</option>
            {accounts.map((a) => (
              <option key={a["@id"]} value={a["@id"]}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>

          {/* Filtre Station */}
          <select
            value={resortFilter}
            onChange={(e) => setResortFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-none"
          >
            <option value="all">Toutes les stations</option>
            {availableResorts.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Filtre Typologie */}
          <select
            value={typologyFilter}
            onChange={(e) => setTypologyFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-none"
          >
            <option value="all">Toutes typologies</option>
            {TYPOLOGIES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BARRE D'ÉTAT & EXPAND ALL / COLLAPSE ALL */}
      <div className="flex items-center justify-between text-xs text-[#8C8379] px-1">
        <span>
          {filteredProperties.length} propriété{filteredProperties.length > 1 ? "s" : ""} trouvée{filteredProperties.length > 1 ? "s" : ""}
        </span>

        {filteredProperties.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[#DFCA9F] hover:underline"
            >
              Tout déplier
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-neutral-400 hover:text-white"
            >
              Tout replier
            </button>
          </div>
        )}
      </div>

      {/* LISTE DÉPLIABLE DES PROPRIÉTÉS */}
      {filteredProperties.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-12 text-center text-[#8C8379]">
          <Home className="mx-auto h-8 w-8 text-[#8C8379]/40 mb-3" />
          <p className="text-sm font-medium text-white">Aucune propriété trouvée</p>
          <p className="text-xs text-[#8C8379] mt-1">
            Modifiez vos filtres ou créez votre première propriété connectée.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProperties.map((p) => {
            const isExpanded = expandedPropertyIds.includes(p.id);
            const acc = accounts.find((a) => a["@id"] === p.account);
            const propZones = zones.filter((z) => z.property === p["@id"]);
            const revealed = revealedWifiMap[p.id];

            // Utilisateurs avec accès à ce logement
            const assignedUsers = users.filter((u) =>
              (u.properties || []).includes(p["@id"])
            );
            const hasRestrictedUsers = assignedUsers.length > 0;
            const nfcCount = propZones.filter((z) =>
              nfcTags.some((t) => t.zone === z["@id"])
            ).length;

            return (
              <div
                key={p["@id"]}
                className={`rounded-xl border transition-all duration-200 bg-[#161619] overflow-hidden ${
                  isExpanded
                    ? "border-[#C9A96B]/50 shadow-xl shadow-black/40"
                    : "border-white/[0.08] hover:border-white/[0.18]"
                }`}
              >
                {/* LIGNE D'EN-TÊTE DÉPLIABLE (CLIQUEZ POUR DÉPLIER) */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
                >
                  {/* CHEVRON + TITRE & BADGES */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[#C9A96B] transition-transform duration-200 ${
                        isExpanded ? "rotate-180 bg-[#C9A96B]/20" : ""
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center rounded-md border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#DFCA9F]">
                          {p.typology || "Chalet"}
                        </span>
                        {p.resort && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300">
                            <MapPin className="h-2.5 w-2.5 text-[#C9A96B]" />
                            {p.resort}
                          </span>
                        )}
                        <span className="text-[10px] text-[#8C8379] font-mono">
                          ID #{p.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-white hover:text-[#DFCA9F] transition-colors truncate">
                          {p.name}
                        </h2>
                        {p.address && (
                          <span className="hidden sm:inline text-xs text-[#8C8379] truncate">
                            • {p.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PILLS D'INFORMATIONS RAPIDES & BOUTONS D'ACTION */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t border-white/[0.05] lg:border-t-0">
                    {/* Compte client */}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-xs font-semibold text-white">
                      <Building className="h-3.5 w-3.5 text-[#C9A96B]" />
                      <span>{acc?.name || "VisuAlpes"}</span>
                    </span>

                    {/* Capacité */}
                    {p.capacity ? (
                      <span className="hidden sm:inline-flex items-center rounded-lg border border-white/[0.08] bg-[#111113] px-2 py-1 text-[11px] text-neutral-300">
                        {p.capacity} pers.
                      </span>
                    ) : null}

                    {/* Statut Wi-Fi */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-mono ${
                        p.wifiSSID || p.wifiSsidMasked
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.02] text-[#8C8379] border border-white/[0.06]"
                      }`}
                    >
                      <Wifi className="h-3 w-3" />
                      <span>{p.wifiSSID || p.wifiSsidMasked ? "Wi-Fi OK" : "Sans Wi-Fi"}</span>
                    </span>

                    {/* Zones / Signalétique */}
                    <span className="inline-flex items-center rounded-lg border border-white/[0.08] bg-[#111113] px-2 py-1 text-[11px] text-[#DFCA9F]">
                      {propZones.length} zone{propZones.length > 1 ? "s" : ""}{" "}
                      {nfcCount > 0 ? `(${nfcCount} NFC)` : ""}
                    </span>

                    {/* Collaborateurs */}
                    <span className="hidden md:inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#111113] px-2 py-1 text-[11px] text-neutral-300">
                      <Users className="h-3 w-3 text-[#C9A96B]" />
                      <span>
                        {hasRestrictedUsers ? `${assignedUsers.length} accès` : "Tous"}
                      </span>
                    </span>

                    {/* Actions rapides */}
                    <div
                      className="flex items-center gap-1.5 pl-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenUsersModal(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-2 py-1 text-[11px] font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20"
                        title="Gérer les droits d'accès des collaborateurs"
                      >
                        <Users className="h-3 w-3" />
                        <span className="hidden sm:inline">Droits</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-white/20 hover:text-white"
                        title="Modifier la fiche enrichie"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer définitivement la propriété ${p.name} ? Cette action révoquera les accès et zones associées.`
                            )
                          ) {
                            void onDeleteProperty(p["@id"]);
                          }
                        }}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                        title="Supprimer la propriété"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PANNEAU DÉPLIÉ AVEC TOUTES LES INFORMATIONS DE LA CARTE */}
                {isExpanded && (
                  <div className="border-t border-white/[0.08] bg-[#111113]/80 p-5 space-y-5 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* COLONNE 1 : LOGISTIQUE D'ACCUEIL & ARRIVÉE AUTONOME */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <Home className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>Accueil &amp; Logistique</span>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-[#161619] p-3 text-xs space-y-2.5">
                          {p.address && (
                            <div>
                              <span className="text-[10px] text-[#8C8379] block">Adresse</span>
                              <span className="text-white flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-[#C9A96B] shrink-0" />
                                {p.address}
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.05]">
                            <div>
                              <span className="text-[10px] text-[#8C8379] block">Capacité</span>
                              <span className="font-semibold text-white">
                                {p.capacity ? `${p.capacity} personnes` : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8C8379] block">Chambres</span>
                              <span className="font-semibold text-white">
                                {p.bedrooms ? `${p.bedrooms} ch.` : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-white/[0.05]">
                            <span className="text-[10px] text-[#8C8379] block">Boîte à clés / Digicode</span>
                            <div className="flex items-center justify-between font-mono font-bold text-[#DFCA9F] mt-0.5">
                              <span>{p.keyBoxCode ? p.keyBoxCode : "Non définie"}</span>
                              {p.keyBoxCode && (
                                <button
                                  type="button"
                                  onClick={() => copyText(p.keyBoxCode!, `key-${p.id}`)}
                                  className="text-[#8C8379] hover:text-[#DFCA9F]"
                                  title="Copier le code"
                                >
                                  {copiedField === `key-${p.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {p.instructions && (
                            <div className="pt-1 border-t border-white/[0.05]">
                              <span className="text-[10px] text-[#8C8379] block mb-1">
                                Consignes d&apos;accueil (Base IA)
                              </span>
                              <p className="text-[11px] text-neutral-300 leading-relaxed bg-[#111113] p-2 rounded border border-white/5 line-clamp-3">
                                {p.instructions}
                              </p>
                            </div>
                          )}

                          {p.externalGuideUrl && (
                            <div className="pt-1 border-t border-white/[0.05]">
                              <a
                                href={p.externalGuideUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#DFCA9F] hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Ouvrir le livret d&apos;accueil externe</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLONNE 2 : COFFRE-FORT WI-FI */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <span className="flex items-center gap-1.5">
                            <Wifi className="h-3.5 w-3.5 text-[#C9A96B]" />
                            <span>Coffre-fort Wi-Fi (AES-256)</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleWifi(p)}
                            disabled={loadingWifiId === p.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#DFCA9F] hover:underline normal-case"
                          >
                            {loadingWifiId === p.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : revealed ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                Masquer
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                Révéler
                              </>
                            )}
                          </button>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-[#161619] p-3 text-xs space-y-3">
                          <div>
                            <span className="text-[10px] text-[#8C8379] block">Nom du réseau (SSID)</span>
                            <span className="font-mono text-white text-xs mt-0.5 block">
                              {p.wifiSSID || p.wifiSsidMasked || "Non configuré"}
                            </span>
                          </div>

                          {p.wifiProtectedByCode && (
                            <div className="rounded bg-amber-500/10 p-2 text-[10px] text-amber-300 border border-amber-500/20">
                              Code d&apos;accès PIN actif pour protéger la clé Wi-Fi.
                            </div>
                          )}

                          {revealed ? (
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <span className="text-[10px] text-[#8C8379] block">
                                Mot de passe déchiffré :
                              </span>
                              <div className="flex items-center justify-between gap-1.5 rounded bg-[#111113] px-2.5 py-1.5 border border-[#C9A96B]/30">
                                <span className="font-mono font-bold text-white select-all">
                                  {revealed.wifiPassword || "(aucun)"}
                                </span>
                                {revealed.wifiPassword && (
                                  <button
                                    type="button"
                                    onClick={() => copyText(revealed.wifiPassword!, `wifi-${p.id}`)}
                                    className="text-[#C9A96B] hover:text-[#DFCA9F]"
                                    title="Copier le mot de passe"
                                  >
                                    {copiedField === `wifi-${p.id}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {revealed.wifiQrPayload && (
                                <p className="text-[10px] text-[#8C8379] italic pt-1">
                                  QR Code Wi-Fi disponible pour usinage des plaques atelier.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="rounded border border-dashed border-white/10 p-2.5 text-center text-[11px] text-[#8C8379]">
                              Cliquez sur « Révéler » pour déchiffrer la clé de sécurité.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLONNE 3 : COLLABORATEURS & ZONES NFC */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[#C9A96B]" />
                            <span>Accès &amp; Signalétique</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenUsersModal(p)}
                            className="text-[11px] text-[#DFCA9F] hover:underline normal-case"
                          >
                            Gérer droits
                          </button>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-[#161619] p-3 text-xs space-y-3">
                          {/* COLLABORATEURS */}
                          <div>
                            <span className="text-[10px] text-[#8C8379] block mb-1">
                              Collaborateurs Habilités ({assignedUsers.length})
                            </span>
                            {!hasRestrictedUsers ? (
                              <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-sky-400 shrink-0" />
                                <span>Tous les membres du compte {acc?.name} ont accès.</span>
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {assignedUsers.map((u) => (
                                  <span
                                    key={u["@id"]}
                                    className="inline-flex items-center gap-1 rounded bg-[#C9A96B]/15 px-1.5 py-0.5 text-[10px] font-mono text-[#DFCA9F] border border-[#C9A96B]/30"
                                  >
                                    <UserCheck className="h-2.5 w-2.5" />
                                    {u.email}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ZONES & PLAQUES NFC */}
                          <div className="pt-2 border-t border-white/[0.05]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-[#8C8379]">
                                Zones &amp; Puces NFC ({propZones.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setZonePropIri(p["@id"]);
                                  setNewZoneName("");
                                  setZoneModalOpen(true);
                                }}
                                className="text-[10px] text-[#DFCA9F] hover:underline"
                              >
                                + Zone
                              </button>
                            </div>

                            {propZones.length === 0 ? (
                              <p className="text-[11px] text-[#8C8379] italic">
                                Aucune zone configurée.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                {propZones.map((z) => {
                                  const tag = nfcTags.find((t) => t.zone === z["@id"]);
                                  return (
                                    <span
                                      key={z["@id"]}
                                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#111113] px-2 py-0.5 text-[10px] text-neutral-200"
                                    >
                                      <span>{z.name}</span>
                                      {tag ? (
                                        <span className="rounded bg-emerald-500/15 px-1 font-mono text-[9px] text-emerald-300">
                                          NFC {tag.shortUid}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-[#8C8379]">Sans tag</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm(`Supprimer la zone ${z.name} ?`)) {
                                            void onDeleteZone(z["@id"]);
                                          }
                                        }}
                                        className="text-neutral-500 hover:text-rose-400 ml-0.5"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PIED DU PANNEAU DÉPLIÉ */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => handleOpenUsersModal(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-3 py-1.5 text-xs font-semibold text-[#DFCA9F] hover:bg-[#C9A96B]/20"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Gérer les Collaborateurs Habilités</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.05]"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Modifier la Fiche</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer définitivement la propriété ${p.name} ? Cette action révoquera les accès et zones associées.`
                            )
                          ) {
                            void onDeleteProperty(p["@id"]);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE CRÉATION / ÉDITION FICHE LOGEMENT ENRICHIE       */}
      {/* ======================================================== */}
      {propModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#161619] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-[#C9A96B]" />
                <h2 className="text-lg font-bold text-white">
                  {editingProp ? "Modifier la Fiche Logement" : "Créer un Nouvel Hébergement"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPropModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveProperty} className="space-y-4">
              {/* Nom & Compte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Nom du Logement / Chalet *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Chalet Le Flocon d'Or"
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Compte Propriétaire / Conciergerie *
                  </label>
                  <select
                    value={propAccount}
                    onChange={(e) => setPropAccount(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a["@id"]} value={a["@id"]}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Station, Typologie & Adresse */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Station Alpine
                  </label>
                  <input
                    type="text"
                    list="resort-suggestions"
                    placeholder="Les 2 Alpes"
                    value={propResort}
                    onChange={(e) => setPropResort(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                  <datalist id="resort-suggestions">
                    {ALPINE_RESORTS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Typologie
                  </label>
                  <select
                    value={propTypology}
                    onChange={(e) => setPropTypology(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  >
                    {TYPOLOGIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Adresse physique
                  </label>
                  <input
                    type="text"
                    placeholder="120 Route des Pistes"
                    value={propAddress}
                    onChange={(e) => setPropAddress(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Capacité, Chambres & Boîte à clés */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Capacité (pers.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="10"
                    value={propCapacity}
                    onChange={(e) =>
                      setPropCapacity(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Nb Chambres
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="4"
                    value={propBedrooms}
                    onChange={(e) =>
                      setPropBedrooms(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                    <Key className="h-3 w-3 text-[#C9A96B]" />
                    <span>Boîte à clés / Digicode</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Code ex: 4892A"
                    value={propKeyBoxCode}
                    onChange={(e) => setPropKeyBoxCode(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 font-mono text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Coffre-fort Wi-Fi */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-[#C9A96B]" />
                  <span className="text-xs font-bold text-white">
                    Coffre-fort Wi-Fi (Chiffré AES-256)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8C8379]">Nom du réseau (SSID)</label>
                    <input
                      type="text"
                      placeholder="Chalet-Wifi-5G"
                      value={propWifiSsid}
                      onChange={(e) => setPropWifiSsid(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 font-mono text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8C8379]">
                      Mot de passe {editingProp ? "(vide = inchangé)" : ""}
                    </label>
                    <input
                      type="password"
                      placeholder={editingProp ? "••••••••" : "Clé Wi-Fi WPA2"}
                      value={propWifiPass}
                      onChange={(e) => setPropWifiPass(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 font-mono text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8C8379]">Code PIN Voyageur (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Code PIN à 4 chiffres"
                      value={propWifiAccessCode}
                      onChange={(e) => setPropWifiAccessCode(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 font-mono text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Guide externe & Consignes IA */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    URL Livret d&apos;accueil externe (optionnel)
                  </label>
                  <input
                    type="url"
                    placeholder="https://notion.so/... ou https://airbnb.com/..."
                    value={propGuideUrl}
                    onChange={(e) => setPropGuideUrl(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Consignes d&apos;arrivée, départ &amp; règles intérieures (Base IA Concierge)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Check-in à 16h via boîte à clés. Casier à skis code 1984. Tri sélectif dans le local poubelle -1."
                    value={propInstructions}
                    onChange={(e) => setPropInstructions(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Habilitation collaborateurs */}
              <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#C9A96B]" />
                    <span>Collaborateurs Habilités sur ce Logement</span>
                  </label>
                  <span className="text-[11px] text-[#8C8379]">
                    Compte : {accounts.find((a) => a["@id"] === propAccount)?.name}
                  </span>
                </div>

                {currentAccountUsers.length === 0 ? (
                  <p className="text-[11px] text-[#8C8379] italic">
                    Aucun collaborateur enregistré sur ce compte.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111113] p-2 space-y-1">
                    {currentAccountUsers.map((u) => {
                      const checked = selectedUserIris.includes(u["@id"]);
                      return (
                        <label
                          key={u["@id"]}
                          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                            checked
                              ? "bg-[#C9A96B]/15 border border-[#C9A96B]/30 text-white"
                              : "hover:bg-white/[0.03] text-neutral-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedUserIris((prev) =>
                                  prev.includes(u["@id"])
                                    ? prev.filter((x) => x !== u["@id"])
                                    : [...prev, u["@id"]]
                                );
                              }}
                              className="rounded border-white/20 text-[#C9A96B]"
                            />
                            <span className="font-mono text-white">{u.email}</span>
                          </div>
                          <span className="text-[10px] text-[#8C8379]">
                            {(u.roles || []).includes("ROLE_ADMIN") ? "Admin" : "Membre"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Boutons validation */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setPropModalOpen(false)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingProp}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-5 py-2 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
                >
                  {savingProp ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {editingProp ? "Mettre à jour" : "Créer le logement"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE DÉDIÉE : COLLABORATEURS ET DROITS PAR LOGEMENT   */}
      {/* ======================================================== */}
      {usersModalOpen && targetProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-white/[0.12] bg-[#161619] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F]">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Droits d&apos;Accès &amp; Collaborateurs
                  </h2>
                  <p className="text-[11px] text-[#8C8379]">
                    Logement : <span className="text-white font-semibold">{targetProperty.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsersModalOpen(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Sélectionnez les collaborateurs autorisés à gérer ce logement (Wi-Fi, zones, guides voyageurs). Les administrateurs atelier ont un accès permanent garanti.
            </p>

            {currentAccountUsers.length === 0 ? (
              <div className="rounded-lg border border-white/[0.08] bg-[#111113] p-4 text-center text-xs text-[#8C8379]">
                Aucun collaborateur trouvé sur ce compte client.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111113] p-2 space-y-1.5">
                {currentAccountUsers.map((u) => {
                  const checked = tempAssignedUserIris.includes(u["@id"]);
                  const isAdminRole = (u.roles || []).includes("ROLE_ADMIN");

                  return (
                    <label
                      key={u["@id"]}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        checked
                          ? "bg-[#C9A96B]/15 border border-[#C9A96B]/30 text-white"
                          : "hover:bg-white/[0.03] text-neutral-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setTempAssignedUserIris((prev) =>
                              prev.includes(u["@id"])
                                ? prev.filter((x) => x !== u["@id"])
                                : [...prev, u["@id"]]
                            );
                          }}
                          className="rounded border-white/20 text-[#C9A96B] focus:ring-[#C9A96B]"
                        />
                        <div>
                          <div className="font-mono text-xs font-semibold text-white">
                            {u.email}
                          </div>
                          <div className="text-[10px] text-[#8C8379]">
                            {isAdminRole ? "Administrateur" : "Collaborateur Compte"}
                          </div>
                        </div>
                      </div>

                      {checked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Check className="h-3 w-3" />
                          Habilité
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Non affecté</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {accessSavedNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Habilitations mises à jour avec succès pour ce logement.</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTempAssignedUserIris(currentAccountUsers.map((u) => u["@id"]))}
                  className="text-[#DFCA9F] hover:underline"
                >
                  Tous habiliter
                </button>
                <span className="text-neutral-600">•</span>
                <button
                  type="button"
                  onClick={() => setTempAssignedUserIris([])}
                  className="text-neutral-400 hover:text-white"
                >
                  Tout retirer
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUsersModalOpen(false)}
                  className="rounded-lg border border-white/[0.08] px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={savingAccess}
                  onClick={handleSaveAssignedUsers}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-4 py-1.5 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
                >
                  {savingAccess ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Appliquer les droits
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE CRÉATION DE ZONE                                */}
      {/* ======================================================== */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#161619] p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Ajouter une Zone d&apos;Accueil</h3>
            <div className="space-y-1">
              <label className="text-xs text-[#8C8379]">Nom de la zone (ex: Salon, Entrée, Ski-Room)</label>
              <input
                type="text"
                required
                placeholder="Ski-Room"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#8C8379]">Support / Fixation</label>
              <select
                value={newZoneMount}
                onChange={(e) => setNewZoneMount(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
              >
                <option value="Support Bois Gravé">Support Bois Gravé</option>
                <option value="Plaque Murale Laiton">Plaque Murale Laiton</option>
                <option value="Chevalet Comptoir">Chevalet Comptoir</option>
                <option value="Porte-clés NFC">Porte-clés NFC</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setZoneModalOpen(false)}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingZone || !newZoneName.trim()}
                onClick={async () => {
                  setSavingZone(true);
                  try {
                    await onCreateZone(newZoneName.trim(), zonePropIri, newZoneMount);
                    setZoneModalOpen(false);
                  } finally {
                    setSavingZone(false);
                  }
                }}
                className="rounded-lg bg-[#C9A96B] px-4 py-1.5 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
              >
                {savingZone ? "Création..." : "Ajouter la zone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

