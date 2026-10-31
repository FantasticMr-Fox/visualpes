"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Building,
  User,
  Users,
  Home,
  Package,
  Headphones,
  Mail,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import type {
  AccountSummary,
  ErpTab,
  Order,
  PropertyItem,
  SupportTicketItem,
  UserItem,
} from "@/types/erp";

interface AccountsViewProps {
  isAdmin: boolean;
  accounts: AccountSummary[];
  properties: PropertyItem[];
  orders: Order[];
  users: UserItem[];
  supportTickets: SupportTicketItem[];
  onCreateAccount: (payload: {
    name: string;
    type: string;
    contactEmail?: string;
    contactPhone?: string;
    billingAddress?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateAccount: (
    accountIri: string,
    payload: {
      name: string;
      type: string;
      contactEmail?: string;
      contactPhone?: string;
      billingAddress?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteAccount: (accountIri: string) => Promise<void>;
  onNavigateTab?: (tab: ErpTab) => void;
}

export function AccountsView({
  isAdmin,
  accounts,
  properties,
  orders,
  users,
  supportTickets,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onNavigateTab,
}: AccountsViewProps) {
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modale Compte Client
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountSummary | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("B2B");
  const [accEmail, setAccEmail] = useState("");
  const [accPhone, setAccPhone] = useState("");
  const [accAddress, setAccAddress] = useState("");
  const [accNotes, setAccNotes] = useState("");
  const [savingAcc, setSavingAcc] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Copie dans le presse-papier
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Filtrage
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.contactEmail && a.contactEmail.toLowerCase().includes(q)) ||
        (a.contactPhone && a.contactPhone.toLowerCase().includes(q)) ||
        (a.billingAddress && a.billingAddress.toLowerCase().includes(q));

      const matchType = typeFilter === "all" || a.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [accounts, searchQuery, typeFilter]);

  // État de dépliement des comptes
  const [expandedAccountIds, setExpandedAccountIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedAccountIds(filteredAccounts.map((a) => a.id));
  };

  const collapseAll = () => {
    setExpandedAccountIds([]);
  };

  // Ouvrir en création
  const handleOpenCreate = () => {
    setEditingAccount(null);
    setAccName("");
    setAccType("B2B");
    setAccEmail("");
    setAccPhone("");
    setAccAddress("");
    setAccNotes("");
    setErrorNotice(null);
    setModalOpen(true);
  };

  // Ouvrir en édition
  const handleOpenEdit = (acc: AccountSummary) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type || "B2B");
    setAccEmail(acc.contactEmail || "");
    setAccPhone(acc.contactPhone || "");
    setAccAddress(acc.billingAddress || "");
    setAccNotes(acc.notes || "");
    setErrorNotice(null);
    setModalOpen(true);
  };

  // Soumission modale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAcc(true);
    setErrorNotice(null);

    const payload = {
      name: accName.trim(),
      type: accType,
      contactEmail: accEmail.trim() || undefined,
      contactPhone: accPhone.trim() || undefined,
      billingAddress: accAddress.trim() || undefined,
      notes: accNotes.trim() || undefined,
    };

    try {
      if (editingAccount) {
        await onUpdateAccount(editingAccount["@id"], payload);
      } else {
        await onCreateAccount(payload);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSavingAcc(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-[#F7F5EF]">
      {/* EN-TÊTE & STATS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#DFCA9F]">
              <Building2 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Comptes Clients &amp; Entreprises
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8C8379]">
            Portefeuille conciergeries B2B, propriétaires particuliers, coordonnées de facturation &amp; suivi d&apos;activité.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-4 py-2 text-xs font-semibold text-[#111113] transition-all hover:bg-[#DFCA9F] hover:shadow-lg hover:shadow-[#C9A96B]/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Compte Client</span>
          </button>
        )}
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#161619] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8379]" />
          <input
            type="text"
            placeholder="Rechercher par raison sociale, email, téléphone, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#111113] pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-none"
          >
            <option value="all">Tous les types de compte</option>
            <option value="B2B">B2B — Conciergeries &amp; Gestionnaires</option>
            <option value="B2C">B2C — Propriétaires Particuliers</option>
          </select>
        </div>
      </div>

      {/* BARRE D'ÉTAT & EXPAND ALL / COLLAPSE ALL */}
      <div className="flex items-center justify-between text-xs text-[#8C8379] px-1">
        <span>
          {filteredAccounts.length} compte{filteredAccounts.length > 1 ? "s" : ""} client{filteredAccounts.length > 1 ? "s" : ""} trouvé{filteredAccounts.length > 1 ? "s" : ""}
        </span>

        {filteredAccounts.length > 0 && (
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

      {/* LISTE DÉPLIABLE DES COMPTES CLIENTS */}
      {filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-12 text-center text-[#8C8379]">
          <Building2 className="mx-auto h-8 w-8 text-[#8C8379]/40 mb-3" />
          <p className="text-sm font-medium text-white">Aucun compte client trouvé</p>
          <p className="text-xs text-[#8C8379] mt-1">
            Modifiez votre recherche ou ajoutez une nouvelle entreprise cliente.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAccounts.map((acc) => {
            const isExpanded = expandedAccountIds.includes(acc.id);
            const accProps = properties.filter((p) => p.account === acc["@id"]);
            const accUsers = users.filter((u) => u.account === acc["@id"]);
            const accOrders = orders.filter((o) => {
              const orderAccIri = typeof o.account === "string" ? o.account : o.account?.["@id"];
              return orderAccIri === acc["@id"];
            });
            const accTickets = supportTickets.filter((t) => t.account === acc["@id"]);
            const isB2B = acc.type === "B2B";

            return (
              <div
                key={acc["@id"]}
                className={`rounded-xl border transition-all duration-200 bg-[#161619] overflow-hidden ${
                  isExpanded
                    ? "border-[#C9A96B]/50 shadow-xl shadow-black/40"
                    : "border-white/[0.08] hover:border-white/[0.18]"
                }`}
              >
                {/* LIGNE D'EN-TÊTE DÉPLIABLE (CLIQUEZ POUR DÉPLIER) */}
                <div
                  onClick={() => toggleExpand(acc.id)}
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
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isB2B
                              ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {acc.type || "B2B"}
                        </span>
                        <span className="text-[10px] text-[#8C8379] font-mono">
                          ID #{acc.id}
                        </span>
                        {acc.billingAddress && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#8C8379] truncate max-w-[220px]">
                            <MapPin className="h-2.5 w-2.5 text-[#C9A96B] shrink-0" />
                            {acc.billingAddress}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-white hover:text-[#DFCA9F] transition-colors truncate">
                          {acc.name}
                        </h2>
                        {acc.contactEmail && (
                          <span className="hidden sm:inline text-xs text-[#8C8379] font-mono truncate">
                            • {acc.contactEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PILLS D'INFORMATIONS RAPIDES & BOUTONS D'ACTION */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t border-white/[0.05] lg:border-t-0">
                    {/* Propriétés */}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-2.5 py-1 text-xs text-[#DFCA9F]">
                      <Home className="h-3.5 w-3.5 text-[#C9A96B]" />
                      <span>{accProps.length} propriété{accProps.length > 1 ? "s" : ""}</span>
                    </span>

                    {/* Commandes */}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-2.5 py-1 text-xs text-sky-300">
                      <Package className="h-3.5 w-3.5 text-sky-400" />
                      <span>{accOrders.length} commande{accOrders.length > 1 ? "s" : ""}</span>
                    </span>

                    {/* Collaborateurs */}
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-2 py-1 text-xs text-purple-300">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      <span>{accUsers.length} accès</span>
                    </span>

                    {/* Actions rapides */}
                    <div
                      className="flex items-center gap-1.5 pl-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin && (
                        <a
                          href={`/?accountId=${acc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-[#C9A96B] hover:border-[#C9A96B]/40 hover:bg-[#C9A96B]/10 transition-colors"
                          title="Ouvrir le portail client"
                        >
                          <span>Portail</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(acc)}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-white/20 hover:text-white transition-colors"
                        title="Modifier le compte"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer définitivement le compte ${acc.name} ? Cela supprimera l'ensemble des propriétés, puces NFC et utilisateurs associés.`
                            )
                          ) {
                            void onDeleteAccount(acc["@id"]);
                          }
                        }}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        title="Supprimer ce compte"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PANNEAU DÉPLIÉ AVEC TOUTES LES INFORMATIONS DU COMPTE */}
                {isExpanded && (
                  <div className="border-t border-white/[0.08] bg-[#111113]/80 p-5 space-y-5 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* COLONNE 1 : COORDONNÉES & FACTURATION */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <Building className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>Coordonnées &amp; Facturation</span>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-[#161619] p-3 text-xs space-y-2.5">
                          {/* Email */}
                          <div>
                            <span className="text-[10px] text-[#8C8379] block">Email de contact</span>
                            {acc.contactEmail ? (
                              <div className="flex items-center justify-between text-neutral-300 mt-0.5">
                                <a
                                  href={`mailto:${acc.contactEmail}`}
                                  className="font-mono text-white hover:underline truncate"
                                >
                                  {acc.contactEmail}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(acc.contactEmail!, `email-${acc.id}`)}
                                  className="text-[#8C8379] hover:text-[#DFCA9F] ml-2 shrink-0"
                                  title="Copier l'email"
                                >
                                  {copiedField === `email-${acc.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#8C8379] italic">Non renseigné</span>
                            )}
                          </div>

                          {/* Téléphone */}
                          <div>
                            <span className="text-[10px] text-[#8C8379] block">Téléphone</span>
                            {acc.contactPhone ? (
                              <a
                                href={`tel:${acc.contactPhone}`}
                                className="font-mono text-white hover:underline mt-0.5 inline-block"
                              >
                                {acc.contactPhone}
                              </a>
                            ) : (
                              <span className="text-[11px] text-[#8C8379] italic">Non renseigné</span>
                            )}
                          </div>

                          {/* Adresse siège / facturation */}
                          <div>
                            <span className="text-[10px] text-[#8C8379] block">Siège social / Facturation</span>
                            {acc.billingAddress ? (
                              <span className="text-white flex items-start gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-[#C9A96B] shrink-0 mt-0.5" />
                                <span>{acc.billingAddress}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#8C8379] italic">Non renseignée</span>
                            )}
                          </div>

                          {/* Type de compte */}
                          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
                            <span className="text-[10px] text-[#8C8379]">Typologie</span>
                            <span className="text-xs font-medium text-white">
                              {isB2B ? "Conciergerie / Pro B2B" : "Propriétaire Particulier B2C"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* COLONNE 2 : ACTIVITÉ & ÉCOSYSTÈME VISUALPES */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <Package className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>Écosystème &amp; Navigation</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {/* Propriétés */}
                          <button
                            type="button"
                            onClick={() => onNavigateTab && onNavigateTab("properties")}
                            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition-colors hover:border-[#C9A96B]/40 hover:bg-white/[0.02] group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#C9A96B]/10 text-[#DFCA9F]">
                                <Home className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-white">
                                  {accProps.length} Propriété{accProps.length > 1 ? "s" : ""}
                                </div>
                                <div className="text-[10px] text-[#8C8379]">Voir le parc hébergement</div>
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#8C8379] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </button>

                          {/* Commandes Atelier */}
                          <button
                            type="button"
                            onClick={() => onNavigateTab && onNavigateTab("orders")}
                            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition-colors hover:border-sky-500/40 hover:bg-white/[0.02] group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                                <Package className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-white">
                                  {accOrders.length} Commande{accOrders.length > 1 ? "s" : ""}
                                </div>
                                <div className="text-[10px] text-[#8C8379]">Fabrication &amp; plaques livrées</div>
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#8C8379] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </button>

                          {/* Utilisateurs & Accès */}
                          <button
                            type="button"
                            onClick={() => onNavigateTab && onNavigateTab("users")}
                            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition-colors hover:border-purple-500/40 hover:bg-white/[0.02] group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                                <Users className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-white">
                                  {accUsers.length} Collaborateur{accUsers.length > 1 ? "s" : ""}
                                </div>
                                <div className="text-[10px] text-[#8C8379]">Logins &amp; habilitations</div>
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#8C8379] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </button>

                          {/* Support SAV si tickets */}
                          {accTickets.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab && onNavigateTab("support")}
                              className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition-colors hover:border-amber-500/40 hover:bg-white/[0.02] group"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                                  <Headphones className="h-3.5 w-3.5" />
                                </span>
                                <div>
                                  <div className="text-xs font-semibold text-white">
                                    {accTickets.length} Ticket{accTickets.length > 1 ? "s" : ""} SAV
                                  </div>
                                  <div className="text-[10px] text-[#8C8379]">Assistance &amp; réclamations</div>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-[#8C8379] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                            </button>
                          )}

                          {/* Portail direct */}
                          {isAdmin && (
                            <a
                              href={`/?accountId=${acc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition-colors hover:border-[#C9A96B]/40 hover:bg-[#C9A96B]/5 group"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#C9A96B]/20 text-[#DFCA9F]">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </span>
                                <div>
                                  <div className="text-xs font-semibold text-[#DFCA9F]">
                                    Ouvrir l'Espace Client
                                  </div>
                                  <div className="text-[10px] text-[#8C8379]">Vue portail en direct</div>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-[#DFCA9F] group-hover:translate-x-0.5 transition-transform" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* COLONNE 3 : NOTES ATELIER & GESTION DU COMPTE */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#DFCA9F]">
                          <FileText className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>Atelier &amp; Suivi SAV</span>
                        </div>

                        <div className="rounded-lg border border-white/[0.08] bg-[#161619] p-3 text-xs space-y-3">
                          {acc.notes ? (
                            <div className="rounded-lg border border-[#C9A96B]/20 bg-[#C9A96B]/5 p-2.5 text-xs space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFCA9F] flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Consignes atelier &amp; SAV
                              </span>
                              <p className="text-[11px] leading-relaxed text-neutral-300">
                                {acc.notes}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-white/[0.05] bg-[#111113] p-2.5 text-[11px] text-[#8C8379] italic">
                              Aucune note spécifique atelier ou SAV pour ce compte client.
                            </div>
                          )}

                          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#8C8379]">
                            <span>Certifié VisuAlpes</span>
                            <span className="font-mono text-emerald-400">Actif</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(acc)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5 text-[#C9A96B]" />
                              <span>Modifier la fiche</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Supprimer définitivement le compte ${acc.name} ? Cela supprimera l'ensemble des propriétés, puces NFC et utilisateurs associés.`
                                  )
                                ) {
                                  void onDeleteAccount(acc["@id"]);
                                }
                              }}
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              title="Supprimer ce compte"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE CRÉATION / ÉDITION COMPTE CLIENT                  */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-white/[0.12] bg-[#161619] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#C9A96B]" />
                <h2 className="text-lg font-bold text-white">
                  {editingAccount ? "Modifier le Compte Client" : "Créer un Nouveau Compte"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-white font-bold"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Raison sociale */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Raison sociale / Nom commercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Conciergerie des Sommets"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                />
              </div>

              {/* Type de compte */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Typologie de compte
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                >
                  <option value="B2B">B2B — Conciergerie / Société de gestion</option>
                  <option value="B2C">B2C — Propriétaire Particulier Direct</option>
                </select>
              </div>

              {/* Email & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    placeholder="contact@conciergerie.com"
                    value={accEmail}
                    onChange={(e) => setAccEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="+33 4 50 ..."
                    value={accPhone}
                    onChange={(e) => setAccPhone(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Adresse de facturation */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Adresse de facturation / Siège social
                </label>
                <input
                  type="text"
                  placeholder="24 Place de l'Église, 74400 Chamonix"
                  value={accAddress}
                  onChange={(e) => setAccAddress(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                />
              </div>

              {/* Notes spécifiques atelier */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Notes atelier &amp; SAV (consignes bois, délais, charte)
                </label>
                <textarea
                  rows={3}
                  placeholder="Essence de bois privilégiée : Chêne massif. Gravure laser fine dorée."
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                />
              </div>

              {/* Boutons validation */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingAcc || !accName.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-5 py-2 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
                >
                  {savingAcc ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {editingAccount ? "Mettre à jour" : "Créer le compte"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

