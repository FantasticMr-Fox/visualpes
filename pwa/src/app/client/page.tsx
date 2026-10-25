"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  UnauthorizedError,
  apiFetch,
  clearToken,
  getToken,
  getTokenRoles,
} from "@/lib/api";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";
import { TwoFactorSettingsModal } from "@/components/common/TwoFactorSettingsModal";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from "@/components/ui";
import { Building2, LifeBuoy, LogOut, Package, ShieldCheck, Users } from "lucide-react";
import type {
  AccountSummary,
  Order,
  PropertyItem,
  SupportIssueType,
  UserItem,
  ZoneItem,
} from "@/types/erp";

type ClientTab = "properties" | "orders" | "team" | "support";

interface ClientNfcTag {
  id: number;
  shortUid: string;
  status: "stock" | "encoded" | "assigned" | "defective";
  encodeAt?: string | null;
  zoneId?: number | null;
  zoneIri?: string | null;
  zoneName?: string | null;
  propertyId?: number | null;
  propertyName?: string | null;
  productName?: string | null;
  orderId?: number | null;
}

interface ClientSupportTicket {
  id: number;
  "@id": string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  issueType: SupportIssueType;
  isAiResolved: boolean;
  resolutionMessage?: string | null;
  propertyId?: number | null;
  propertyName?: string | null;
  nfcTagShortUid?: string | null;
}

interface ClientOverviewPayload {
  account: AccountSummary;
  currentUser: {
    id: number;
    email: string;
    roles: string[];
  };
  nfcTags: ClientNfcTag[];
  tickets: ClientSupportTicket[];
}

const emptySubscribe = () => () => {};
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function extractCollection<T>(payload: unknown): T[] {
  if (typeof payload !== "object" || payload === null) return [];
  const obj = payload as Record<string, unknown>;
  const list = obj["member"] ?? obj["hydra:member"];
  return Array.isArray(list) ? (list as T[]) : [];
}

const ORDER_STEPS: { id: Order["status"]; label: string }[] = [
  { id: "pending", label: "Commande reçue" },
  { id: "processing", label: "Fabrication atelier" },
  { id: "quality_check", label: "Contrôle & Encodage NFC" },
  { id: "completed", label: "Expédiée / Terminée" },
];

const QUICK_ZONE_PRESETS = ["Entrée", "Salon", "Cuisine", "Chambre", "Ski Room"];

const ISSUE_LABELS: Record<SupportIssueType, string> = {
  nfc_defect: "Puce NFC / Matériel",
  wifi_issue: "Wi-Fi & Accès",
  guide_update: "Livret / Consignes",
  billing: "Commande / Facturation",
  other: "Autre demande",
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const token = hydrated ? getToken() : null;
  const roles = hydrated ? getTokenRoles() : [];
  const isAdmin = roles.includes("ROLE_ADMIN");

  const [activeTab, setActiveTab] = useState<ClientTab>("properties");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);

  const [overview, setOverview] = useState<ClientOverviewPayload | null>(null);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserItem[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Modale Logement (Création / Édition)
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<PropertyItem | null>(null);
  const [propName, setPropName] = useState("");
  const [propWifiSsid, setPropWifiSsid] = useState("");
  const [propWifiPass, setPropWifiPass] = useState("");
  const [propWifiPin, setPropWifiPin] = useState("");
  const [clearPin, setClearPin] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [propGuideUrl, setPropGuideUrl] = useState("");
  const [propInstructions, setPropInstructions] = useState("");
  const [savingProp, setSavingProp] = useState(false);

  // Révélation Wi-Fi + QR Code
  const [revealedWifi, setRevealedWifi] = useState<
    Record<
      number,
      {
        wifiSSID: string | null;
        wifiPassword: string | null;
        wifiQrPayload: string | null;
      }
    >
  >({});

  // Modale Zone
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [zonePropIri, setZonePropIri] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneMount, setZoneMount] = useState("Support Bois Gravé");
  const [savingZone, setSavingZone] = useState(false);

  // Modale Collaborateur (Équipe)
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserItem | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Modale Ticket SAV
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketIssueType, setTicketIssueType] = useState<SupportIssueType>("other");
  const [ticketPropIri, setTicketPropIri] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [savingTicket, setSavingTicket] = useState(false);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    router.replace("/login");
  }, [router]);

  const loadClientPortal = useCallback(
    async (targetAccId?: number) => {
      const accQuery =
        isAdmin && (targetAccId ?? selectedAccountId) > 0
          ? `?accountId=${targetAccId ?? selectedAccountId}`
          : "";

      try {
        const [ovRes, propsRes, zonesRes, ordersRes, usersRes, accsRes] =
          await Promise.all([
            apiFetch(`${API_URL}/client/overview${accQuery}`),
            apiFetch(`${API_URL}/properties`),
            apiFetch(`${API_URL}/zones`),
            apiFetch(`${API_URL}/orders`),
            apiFetch(`${API_URL}/users`),
            isAdmin ? apiFetch(`${API_URL}/accounts`) : Promise.resolve(null),
          ]);

        if (accsRes && accsRes.ok) {
          const allAccs = extractCollection<AccountSummary>(await accsRes.json());
          setAccounts(allAccs);
        }

        if (ovRes.ok) {
          const ovData = (await ovRes.json()) as ClientOverviewPayload;
          setOverview(ovData);
          const activeAccIri = ovData.account["@id"];

          if (propsRes.ok) {
            const allProps = extractCollection<PropertyItem>(await propsRes.json());
            setProperties(allProps.filter((p) => p.account === activeAccIri));
          }
          if (zonesRes.ok) {
            setZones(extractCollection<ZoneItem>(await zonesRes.json()));
          }
          if (ordersRes.ok) {
            const allOrders = extractCollection<Order>(await ordersRes.json());
            setOrders(
              allOrders.filter((o) => {
                if (o.isStockOrder) return false;
                const oAccIri =
                  typeof o.account === "object" && o.account !== null
                    ? o.account["@id"]
                    : o.account;
                return oAccIri === activeAccIri;
              }),
            );
          }
          if (usersRes.ok) {
            const allUsers = extractCollection<UserItem>(await usersRes.json());
            setTeamMembers(allUsers.filter((u) => u.account === activeAccIri));
          }
        }
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          handleUnauthorized();
        }
      }
    },
    [isAdmin, selectedAccountId, handleUnauthorized],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    const timer = window.setTimeout(() => {
      void loadClientPortal();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, token, router, loadClientPortal]);

  if (!hydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-xs text-neutral-500">
        Chargement de votre espace client…
      </div>
    );
  }

  const activeAccount = overview?.account;
  const nfcTags = overview?.nfcTags ?? [];
  const tickets = overview?.tickets ?? [];

  const openCreatePropModal = () => {
    setEditingProp(null);
    setPropName("");
    setPropWifiSsid("");
    setPropWifiPass("");
    setPropWifiPin("");
    setClearPin(false);
    setShowPass(false);
    setPropGuideUrl("");
    setPropInstructions("");
    setPropModalOpen(true);
  };

  const openEditPropModal = async (p: PropertyItem) => {
    setEditingProp(p);
    setPropName(p.name);
    setPropWifiSsid(p.wifiSsidMasked ?? "");
    setPropWifiPass("");
    setPropWifiPin("");
    setClearPin(false);
    setShowPass(false);
    setPropGuideUrl(p.externalGuideUrl ?? "");
    setPropInstructions(p.instructions ?? "");
    setPropModalOpen(true);

    if (p.canManageWifi !== false && p.wifiConfigured) {
      const res = await apiFetch(`${API_URL}/properties/${p.id}/reveal-wifi`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          wifiSSID: string | null;
          wifiPassword: string | null;
          wifiQrPayload: string | null;
        };
        if (data.wifiSSID) setPropWifiSsid(data.wifiSSID);
        if (data.wifiPassword) setPropWifiPass(data.wifiPassword);
      }
    }
  };

  const submitPropForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    setSavingProp(true);
    setError(null);
    try {
      if (editingProp) {
        const res = await apiFetch(editingProp["@id"], {
          method: "PATCH",
          headers: { "Content-Type": "application/merge-patch+json" },
          body: JSON.stringify({
            name: propName.trim(),
            wifiSSID: propWifiSsid.trim() || null,
            wifiPassword: propWifiPass.trim() || null,
            wifiAccessCode: clearPin
              ? "CLEAR"
              : propWifiPin.trim()
                ? propWifiPin.trim()
                : null,
            externalGuideUrl: propGuideUrl.trim() || null,
            instructions: propInstructions.trim() || null,
          }),
        });
        if (!res.ok) {
          setError("Impossible d'enregistrer les modifications du logement.");
        }
      } else {
        const res = await apiFetch(`${API_URL}/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/ld+json" },
          body: JSON.stringify({
            name: propName.trim(),
            account: activeAccount["@id"],
            wifiSSID: propWifiSsid.trim() || null,
            wifiPassword: propWifiPass.trim() || null,
            wifiAccessCode: propWifiPin.trim() || null,
            externalGuideUrl: propGuideUrl.trim() || null,
            instructions: propInstructions.trim() || null,
          }),
        });
        if (!res.ok) {
          setError("Impossible de créer ce logement.");
        }
      }
      setPropModalOpen(false);
      await loadClientPortal();
    } finally {
      setSavingProp(false);
    }
  };

  const toggleRevealWifi = async (p: PropertyItem) => {
    if (revealedWifi[p.id]) {
      setRevealedWifi((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      return;
    }
    const res = await apiFetch(`${API_URL}/properties/${p.id}/reveal-wifi`, {
      method: "POST",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        wifiSSID: string | null;
        wifiPassword: string | null;
        wifiQrPayload: string | null;
      };
      setRevealedWifi((prev) => ({ ...prev, [p.id]: data }));
    } else {
      setError(
        "Seul le titulaire direct du compte client peut afficher le mot de passe et le QR Code Wi-Fi.",
      );
    }
  };

  const quickCreateZone = async (propertyIri: string, presetName: string) => {
    const res = await apiFetch(`${API_URL}/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/ld+json" },
      body: JSON.stringify({
        name: presetName,
        mountType: "Support NFC VisuAlpes",
        property: propertyIri,
      }),
    });
    if (res.ok) await loadClientPortal();
  };

  const submitZoneForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZone(true);
    try {
      if (editingZone) {
        await apiFetch(editingZone["@id"], {
          method: "PATCH",
          headers: { "Content-Type": "application/merge-patch+json" },
          body: JSON.stringify({
            name: zoneName.trim(),
            mountType: zoneMount.trim(),
          }),
        });
      } else {
        await apiFetch(`${API_URL}/zones`, {
          method: "POST",
          headers: { "Content-Type": "application/ld+json" },
          body: JSON.stringify({
            name: zoneName.trim(),
            mountType: zoneMount.trim(),
            property: zonePropIri,
          }),
        });
      }
      setZoneModalOpen(false);
      await loadClientPortal();
    } finally {
      setSavingZone(false);
    }
  };

  const deleteZone = async (zoneIri: string) => {
    if (!window.confirm("Supprimer cette zone ?")) return;
    const res = await apiFetch(zoneIri, { method: "DELETE" });
    if (res.ok || res.status === 204) await loadClientPortal();
  };

  const assignTagZone = async (tagId: number, zoneId: number | null) => {
    const accQuery =
      isAdmin && selectedAccountId > 0 ? `?accountId=${selectedAccountId}` : "";
    const res = await apiFetch(
      `${API_URL}/client/nfc-tags/${tagId}/assign-zone${accQuery}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId }),
      },
    );
    if (res.ok) await loadClientPortal();
  };

  const submitTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMember(true);
    setError(null);
    const accQuery =
      isAdmin && selectedAccountId > 0 ? `?accountId=${selectedAccountId}` : "";
    try {
      const res = editingMember
        ? await apiFetch(
            `${API_URL}/client/team/${editingMember.id}/password${accQuery}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plainPassword: memberPassword }),
            },
          )
        : await apiFetch(`${API_URL}/client/team${accQuery}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: memberEmail.trim(),
              plainPassword: memberPassword,
            }),
          });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errBody.error ?? "Impossible d'enregistrer ce collaborateur.");
      } else {
        setTeamModalOpen(false);
        await loadClientPortal();
      }
    } finally {
      setSavingMember(false);
    }
  };

  const deleteTeamMember = async (member: UserItem) => {
    if (!window.confirm(`Retirer l'accès de ${member.email} ?`)) return;
    const accQuery =
      isAdmin && selectedAccountId > 0 ? `?accountId=${selectedAccountId}` : "";
    const res = await apiFetch(`${API_URL}/client/team/${member.id}${accQuery}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      setError(errBody.error ?? "Impossible de supprimer ce collaborateur.");
    } else {
      await loadClientPortal();
    }
  };

  const submitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    setSavingTicket(true);
    try {
      const res = await apiFetch(`${API_URL}/support_tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/ld+json" },
        body: JSON.stringify({
          account: activeAccount["@id"],
          issueType: ticketIssueType,
          property: ticketPropIri || null,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
        }),
      });
      if (res.ok) {
        setTicketSubject("");
        setTicketMessage("");
        setTicketPropIri("");
        setTicketIssueType("other");
        setTicketModalOpen(false);
        await loadClientPortal();
      }
    } finally {
      setSavingTicket(false);
    }
  };

  const copyGuideLink = async (shortUid: string) => {
    const url = `${window.location.origin}/g/${shortUid}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUid(shortUid);
      setTimeout(() => setCopiedUid(null), 2000);
    } catch {
      // Fallback silencieux
    }
  };

  const clientPropertyIris = new Set(properties.map((p) => p["@id"]));
  const clientZones = zones.filter((z) => clientPropertyIris.has(z.property));
  const openTicketsCount = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100 md:flex-row">
      {/* BARRE LATÉRALE ESPACE CLIENT */}
      <aside className="flex w-full flex-col justify-between border-b border-neutral-800/80 bg-neutral-950 p-5 md:min-h-screen md:w-64 md: shrink-0 md:border-b-0 md:border-r">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-xs font-black text-neutral-950">
                VA
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white">
                  VisuAlpes
                </div>
                <div className="text-[11px] text-neutral-400">
                  {activeAccount
                    ? `${activeAccount.name} (${activeAccount.type})`
                    : "Espace Client"}
                </div>
              </div>
            </div>
          </div>

          {/* Sélecteur de compte pour les administrateurs en mode aperçu */}
          {isAdmin && accounts.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Aperçu compte client
              </span>
              <select
                value={selectedAccountId || activeAccount?.id || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedAccountId(id);
                  void loadClientPortal(id);
                }}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => router.push("/kanban")}
                className="mt-1 rounded-lg border border-neutral-800 bg-neutral-950 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-neutral-800"
              >
                ← Retour Atelier ERP
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {(
              [
                {
                  id: "properties" as const,
                  label: "Logements & NFC",
                  badge: properties.length,
                  icon: <Building2 className="h-4 w-4" />,
                },
                {
                  id: "orders" as const,
                  label: "Mes Commandes",
                  badge: orders.length,
                  icon: <Package className="h-4 w-4" />,
                },
                {
                  id: "team" as const,
                  label: "Équipe & Accès",
                  badge: teamMembers.length,
                  icon: <Users className="h-4 w-4" />,
                },
                {
                  id: "support" as const,
                  label: "Assistance SAV",
                  badge: openTicketsCount > 0 ? openTicketsCount : tickets.length,
                  icon: <LifeBuoy className="h-4 w-4" />,
                },
              ]
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-neutral-800/90 text-white"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={active ? "text-emerald-400" : "text-neutral-500"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <Badge variant={active ? "default" : "secondary"}>
                    {item.badge}
                  </Badge>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-neutral-800/80 pt-4">
          {overview?.currentUser && (
            <div className="truncate font-mono text-[11px] text-neutral-500">
              {overview.currentUser.email}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSecurityModalOpen(true)}
            className="w-full"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sécurité &amp; 2FA</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
            className="w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </Button>
        </div>
      </aside>

      <TwoFactorSettingsModal
        open={securityModalOpen}
        onOpenChange={setSecurityModalOpen}
        isAdmin={isAdmin}
      />

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6">
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-800/80 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-200">
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

        {/* ONGLET 1 : LOGEMENTS, ZONES, WI-FI & SUPPORTS NFC */}
        {activeTab === "properties" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Mon Parc Logements & Supports NFC
                </h1>
                <p className="text-xs text-neutral-400">
                  Configurez vos hébergements, votre Wi-Fi (QR Code) et vos consignes d&apos;accueil
                </p>
              </div>
              <button
                type="button"
                onClick={openCreatePropModal}
                className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
              >
                + Ajouter un logement
              </button>
            </div>

            {/* Cartes de synthèse */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="bg-neutral-900/40 px-4 py-3">
                <span className="text-[11px] text-neutral-400">Logements</span>
                <p className="mt-0.5 font-mono text-lg font-bold text-white">
                  {properties.length}
                </p>
              </Card>
              <Card className="bg-neutral-900/40 px-4 py-3">
                <span className="text-[11px] text-neutral-400">Zones configurées</span>
                <p className="mt-0.5 font-mono text-lg font-bold text-white">
                  {clientZones.length}
                </p>
              </Card>
              <Card className="bg-neutral-900/40 px-4 py-3">
                <span className="text-[11px] text-neutral-400">Supports NFC actifs</span>
                <p className="mt-0.5 font-mono text-lg font-bold text-emerald-300">
                  {nfcTags.filter((t) => t.status !== "defective").length}
                </p>
              </Card>
              <Card className="bg-neutral-900/40 px-4 py-3">
                <span className="text-[11px] text-neutral-400">Commandes</span>
                <p className="mt-0.5 font-mono text-lg font-bold text-sky-300">
                  {orders.length}
                </p>
              </Card>
            </div>

            {properties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
                Aucun logement configuré. Cliquez sur « + Ajouter un logement » pour commencer.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {properties.map((p) => {
                  const pZones = clientZones.filter((z) => z.property === p["@id"]);
                  const wifiData = revealedWifi[p.id];

                  return (
                    <div
                      key={p["@id"]}
                      className="flex flex-col gap-4 rounded-2xl border border-neutral-800/90 bg-neutral-900/45 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-white">{p.name}</h2>
                            {p.wifiConfigured ? (
                              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-300">
                                Wi-Fi {p.wifiSsidMasked ?? "actif"}
                                {p.wifiProtectedByCode ? " • PIN" : ""}
                              </span>
                            ) : (
                              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                                Wi-Fi non renseigné
                              </span>
                            )}
                          </div>
                          {p.instructions && (
                            <p className="mt-1.5 line-clamp-2 max-w-2xl text-xs text-neutral-400">
                              {p.instructions}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.wifiConfigured && (
                            <button
                              type="button"
                              onClick={() => void toggleRevealWifi(p)}
                              className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            >
                              {wifiData ? "Masquer QR Wi-Fi" : "QR Code Wi-Fi"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingZone(null);
                              setZonePropIri(p["@id"]);
                              setZoneName("");
                              setZoneMount("Support Bois Gravé");
                              setZoneModalOpen(true);
                            }}
                            className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                          >
                            + Zone
                          </button>
                          <button
                            type="button"
                            onClick={() => void openEditPropModal(p)}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
                          >
                            Configurer
                          </button>
                        </div>
                      </div>

                      {/* Carte QR Code Wi-Fi déverrouillée */}
                      {wifiData && (
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 sm:flex-row">
                          {wifiData.wifiQrPayload && (
                            <WifiQrCodeSvg value={wifiData.wifiQrPayload} size={120} />
                          )}
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-white">
                              Réseau : <span className="font-mono">{wifiData.wifiSSID}</span>
                            </span>
                            <span className="text-neutral-400">
                              Clé WPA :{" "}
                              <span className="font-mono text-emerald-300">
                                {wifiData.wifiPassword}
                              </span>
                            </span>
                            <span className="mt-1 text-[11px] text-neutral-500">
                              Ce QR Code est affiché automatiquement aux voyageurs qui scannent vos supports NFC.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Zones & Puces NFC rattachées */}
                      <div className="flex flex-col gap-2 border-t border-neutral-800/80 pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Zones & Emplacements NFC ({pZones.length})
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            {QUICK_ZONE_PRESETS.filter(
                              (preset) =>
                                !pZones.some(
                                  (z) => z.name.toLowerCase() === preset.toLowerCase(),
                                ),
                            ).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => void quickCreateZone(p["@id"], preset)}
                                className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-400 hover:border-neutral-700 hover:text-white"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {pZones.length === 0 ? (
                          <p className="text-xs text-neutral-500">
                            Cliquez sur un emplacement rapide ci-dessus (ex: + Entrée, + Salon) pour créer vos zones.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {pZones.map((z) => {
                              const zTags = nfcTags.filter(
                                (t) => t.zoneId === z.id && t.status !== "defective",
                              );
                              return (
                                <div
                                  key={z["@id"]}
                                  className="flex flex-col justify-between gap-2 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="font-semibold text-neutral-200">
                                        {z.name}
                                      </div>
                                      {z.mountType && (
                                        <div className="text-[11px] text-neutral-500">
                                          {z.mountType}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingZone(z);
                                          setZonePropIri(p["@id"]);
                                          setZoneName(z.name);
                                          setZoneMount(z.mountType ?? "");
                                          setZoneModalOpen(true);
                                        }}
                                        className="text-[11px] text-neutral-400 hover:text-white"
                                      >
                                        Éditer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteZone(z["@id"])}
                                        className="ml-1 text-neutral-500 hover:text-rose-300"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {zTags.length === 0 ? (
                                      <span className="text-[11px] text-neutral-500">
                                        Aucune puce assignée
                                      </span>
                                    ) : (
                                      zTags.map((tg) => (
                                        <div
                                          key={tg.id}
                                          className="flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5"
                                        >
                                          <span className="font-mono text-[11px] font-semibold text-purple-300">
                                            #{tg.shortUid}
                                          </span>
                                          <a
                                            href={`/g/${tg.shortUid}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-sky-300 hover:underline"
                                          >
                                            Guide ↗
                                          </a>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Liste des supports NFC du compte */}
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800/90 bg-neutral-900/40 p-5">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Mes Supports NFC ({nfcTags.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Affectez chaque puce NFC à une zone de vos logements ou testez le guide voyageur
                </p>
              </div>

              {nfcTags.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  Vos puces NFC apparaîtront ici dès leur encodage en atelier.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {nfcTags.map((tg) => (
                    <div
                      key={tg.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-lg bg-purple-500/15 px-2 py-1 font-mono text-xs font-bold text-purple-300">
                          #{tg.shortUid}
                        </span>
                        <div>
                          <div className="font-medium text-neutral-200">
                            {tg.productName ?? "Support NFC VisuAlpes"}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {tg.propertyName
                              ? `${tg.propertyName} • ${tg.zoneName}`
                              : "Non assigné à une zone"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={tg.zoneId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            void assignTagZone(tg.id, val ? Number(val) : null);
                          }}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
                        >
                          <option value="">— Choisir une zone —</option>
                          {clientZones.map((z) => {
                            const parentProp = properties.find(
                              (p) => p["@id"] === z.property,
                            );
                            return (
                              <option key={z.id} value={z.id}>
                                {parentProp ? `${parentProp.name} — ` : ""}
                                {z.name}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          onClick={() => void copyGuideLink(tg.shortUid)}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 hover:text-white"
                        >
                          {copiedUid === tg.shortUid ? "✓ Copié" : "Copier lien"}
                        </button>

                        <a
                          href={`/g/${tg.shortUid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-sky-300 hover:bg-neutral-800"
                        >
                          Ouvrir ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET 2 : MES COMMANDES & SUIVI DE PRODUCTION */}
        {activeTab === "orders" && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Mes Commandes
              </h1>
              <p className="text-xs text-neutral-400">
                Suivi en temps réel de la fabrication de vos supports en atelier et de leur expédition
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
                Aucune commande enregistrée sur votre compte.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {orders.map((order) => {
                  const stepIdx = ORDER_STEPS.findIndex((s) => s.id === order.status);
                  const items = order.orderItems ?? [];

                  return (
                    <div
                      key={order["@id"]}
                      className="flex flex-col gap-4 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">
                            Commande #{order.id}
                          </span>
                          {order.storeReference && (
                            <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] text-sky-300">
                              Réf. {order.storeReference}
                            </span>
                          )}
                          <span className="text-xs text-neutral-500">
                            • {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {order.trackingNumber && (
                          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-300">
                            Suivi : {order.trackingNumber}
                          </span>
                        )}
                      </div>

                      {/* Barre de progression 4 étapes */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ORDER_STEPS.map((step, idx) => {
                          const done = idx <= stepIdx;
                          const current = idx === stepIdx;
                          return (
                            <div
                              key={step.id}
                              className={`rounded-xl border px-3 py-2 text-xs ${
                                current
                                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 font-semibold"
                                  : done
                                    ? "border-neutral-800 bg-neutral-900 text-neutral-300"
                                    : "border-neutral-800/50 bg-neutral-950/40 text-neutral-600"
                              }`}
                            >
                              <div className="font-mono text-[10px]">Étape {idx + 1}</div>
                              <div className="mt-0.5">{step.label}</div>
                            </div>
                          );
                        })}
                      </div>

                      {items.length > 0 && (
                        <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs">
                          {items.map((it, i) => (
                            <div
                              key={it["@id"] ?? i}
                              className="flex items-center justify-between text-neutral-300"
                            >
                              <span>{it.productName}</span>
                              <span className="font-mono font-semibold text-neutral-400">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 : ÉQUIPE & ACCÈS COLLABORATEURS */}
        {activeTab === "team" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Équipe & Collaborateurs
                </h1>
                <p className="text-xs text-neutral-400">
                  Gérez les accès des employés de votre conciergerie à cet espace client
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setMemberEmail("");
                  setMemberPassword("");
                  setTeamModalOpen(true);
                }}
                className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
              >
                + Inviter un collaborateur
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teamMembers.map((member) => {
                const isSelf = overview?.currentUser.id === member.id;
                return (
                  <div
                    key={member["@id"]}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4 text-xs"
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold text-white">
                        {member.email}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-400">
                        {isSelf ? "Votre session active" : "Accès collaborateur"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(member);
                          setMemberEmail(member.email);
                          setMemberPassword("");
                          setTeamModalOpen(true);
                        }}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      >
                        Mot de passe
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => void deleteTeamMember(member)}
                          className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-rose-950/40 hover:text-rose-300"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ONGLET 4 : ASSISTANCE & SAV */}
        {activeTab === "support" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Assistance & SAV
                </h1>
                <p className="text-xs text-neutral-400">
                  Signalez un support NFC endommagé ou posez une question à notre équipe
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTicketIssueType("other");
                  setTicketPropIri("");
                  setTicketSubject("");
                  setTicketMessage("");
                  setTicketModalOpen(true);
                }}
                className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
              >
                + Nouvelle demande SAV
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800/80 py-12 text-center text-xs text-neutral-500">
                Aucune demande SAV en cours.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2.5 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-neutral-500">
                          #{t.id}
                        </span>
                        <h3 className="text-sm font-bold text-white">{t.subject}</h3>
                        <span className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                          {ISSUE_LABELS[t.issueType] ?? "Demande"}
                        </span>
                        {t.propertyName && (
                          <span className="text-xs text-neutral-400">
                            • {t.propertyName}
                          </span>
                        )}
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          t.status === "resolved"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : t.status === "in_progress"
                              ? "bg-sky-500/15 text-sky-300"
                              : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {t.status === "resolved"
                          ? "Résolu"
                          : t.status === "in_progress"
                            ? "En cours"
                            : "Ouvert"}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-neutral-300">
                      {t.message}
                    </p>

                    {t.resolutionMessage && (
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 text-xs leading-relaxed text-emerald-100">
                        <div className="mb-1 font-semibold text-emerald-300">
                          Réponse Support VisuAlpes :
                        </div>
                        <p className="whitespace-pre-line">{t.resolutionMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALE CRÉATION / ÉDITION LOGEMENT */}
      {propModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={(e) => void submitPropForm(e)}
            className="flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold">
                {editingProp
                  ? `Configurer « ${editingProp.name} »`
                  : "Ajouter un logement"}
              </h2>
              <button
                type="button"
                onClick={() => setPropModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom du logement
              <input
                type="text"
                required
                value={propName}
                onChange={(e) => setPropName(e.target.value)}
                placeholder="ex: Chalet Le Flocon d'Or"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Wi-Fi du logement (chiffré AES-256)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-[11px] text-neutral-400 hover:text-white"
                >
                  {showPass ? "Masquer" : "Afficher"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={propWifiSsid}
                  onChange={(e) => setPropWifiSsid(e.target.value)}
                  placeholder="Nom du réseau (SSID)"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
                />
                <input
                  type={showPass ? "text" : "password"}
                  value={propWifiPass}
                  onChange={(e) => setPropWifiPass(e.target.value)}
                  placeholder={
                    editingProp?.wifiConfigured
                      ? "Vide = conserver"
                      : "Mot de passe Wi-Fi"
                  }
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>

              <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-2 text-xs text-neutral-400">
                <div className="flex items-center justify-between">
                  <span>Code PIN voyageur (optionnel)</span>
                  {editingProp?.wifiProtectedByCode && (
                    <label className="flex items-center gap-1 text-[11px] text-rose-300">
                      <input
                        type="checkbox"
                        checked={clearPin}
                        onChange={(e) => setClearPin(e.target.checked)}
                      />
                      Retirer le PIN
                    </label>
                  )}
                </div>
                {!clearPin && (
                  <input
                    type={showPass ? "text" : "password"}
                    value={propWifiPin}
                    onChange={(e) => setPropWifiPin(e.target.value)}
                    placeholder="Ex: 2516"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
                  />
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Consignes d&apos;arrivée, ski room, départ (Concierge Virtuel IA)
              <textarea
                rows={4}
                value={propInstructions}
                onChange={(e) => setPropInstructions(e.target.value)}
                placeholder="Ex: Arrivée dès 16h (boîte à clés 2048). Casier à skis n°12. Départ avant 10h."
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              URL du livret d&apos;accueil externe (optionnel)
              <input
                type="url"
                value={propGuideUrl}
                onChange={(e) => setPropGuideUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPropModalOpen(false)}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingProp}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950"
              >
                {savingProp ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE CRÉATION / ÉDITION ZONE */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="max-w-sm">
          <form
            onSubmit={(e) => void submitZoneForm(e)}
            className="flex flex-col gap-3.5"
          >
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "Modifier la zone" : "Nouvelle zone"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setZoneModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </DialogHeader>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom de la pièce / zone
              <Input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="ex: Entrée, Îlot Cuisine, Salon…"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Type de support
              <Input
                type="text"
                value={zoneMount}
                onChange={(e) => setZoneMount(e.target.value)}
                placeholder="ex: Plaque Bois Gravé, Socle Comptoir…"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoneModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={savingZone}>
                {savingZone ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE COLLABORATEUR ÉQUIPE */}
      <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
        <DialogContent className="max-w-sm">
          <form
            onSubmit={(e) => void submitTeamMember(e)}
            className="flex flex-col gap-3.5"
          >
            <DialogHeader>
              <DialogTitle>
                {editingMember
                  ? `Mot de passe (${editingMember.email})`
                  : "Inviter un collaborateur"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </DialogHeader>
            {!editingMember && (
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Email du collaborateur
                <Input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="collaborateur@conciergerie.fr"
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Mot de passe (8 caractères min.)
              <Input
                type="password"
                required
                minLength={8}
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTeamModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={savingMember}>
                {savingMember ? "Enregistrement…" : "Valider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE DEMANDE SAV */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => void submitSupportTicket(e)}
            className="flex flex-col gap-3.5"
          >
            <DialogHeader>
              <DialogTitle>Nouvelle demande SAV</DialogTitle>
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Sujet de la demande
                <select
                  value={ticketIssueType}
                  onChange={(e) =>
                    setTicketIssueType(e.target.value as SupportIssueType)
                  }
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white"
                >
                  <option value="nfc_defect">Puce NFC / Matériel</option>
                  <option value="wifi_issue">Wi-Fi & Accès</option>
                  <option value="guide_update">Livret / Consignes</option>
                  <option value="billing">Commande / Facturation</option>
                  <option value="other">Autre demande</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Logement concerné
                <select
                  value={ticketPropIri}
                  onChange={(e) => setTicketPropIri(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white"
                >
                  <option value="">— Général —</option>
                  {properties.map((p) => (
                    <option key={p["@id"]} value={p["@id"]}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Objet
              <Input
                type="text"
                required
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="ex: Remplacement plaque NFC #VA4568"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Description
              <Textarea
                rows={4}
                required
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Précisez votre besoin…"
              />
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTicketModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={savingTicket}>
                {savingTicket ? "Envoi…" : "Envoyer au support"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

