"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Building,
  Home,
  Check,
  Copy,
  Trash2,
  Edit,
  Search,
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import type { AccountSummary, PropertyItem, UserItem, UserRole } from "@/types/erp";
import { USER_ROLE_LABELS } from "@/types/erp";

interface UsersViewProps {
  isAdmin: boolean;
  users: UserItem[];
  accounts: AccountSummary[];
  properties: PropertyItem[];
  onCreateUser: (payload: {
    email: string;
    plainPassword: string;
    account: string;
    roles?: string[];
    properties?: string[];
  }) => Promise<boolean>;
  onUpdateUser: (
    userIri: string,
    payload: {
      email?: string;
      account?: string;
      roles?: string[];
      properties?: string[];
    }
  ) => Promise<boolean>;
  onDeleteUser: (userIri: string) => Promise<void>;
  onRegeneratePassword: (
    userId: number,
    payload?: { customPassword?: string; notifyEmail?: boolean }
  ) => Promise<{
    success: boolean;
    temporaryPassword: string;
    emailSent: boolean;
    message: string;
  } | null>;
  onSendResetLink: (userId: number) => Promise<{
    success: boolean;
    resetUrl: string;
    code: string;
    emailSent: boolean;
    message: string;
  } | null>;
}

export function UsersView({
  isAdmin,
  users,
  accounts,
  properties,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onRegeneratePassword,
  onSendResetLink,
}: UsersViewProps) {
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modale Création / Édition
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userAccountIri, setUserAccountIri] = useState("");
  const [userRole, setUserRole] = useState("ROLE_USER");
  const [selectedPropertyIris, setSelectedPropertyIris] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modale SAV Régénération
  const [savModalOpen, setSavModalOpen] = useState(false);
  const [savTargetUser, setSavTargetUser] = useState<UserItem | null>(null);
  const [savMode, setSavMode] = useState<"instant" | "custom" | "link">("instant");
  const [savCustomPassword, setSavCustomPassword] = useState("");
  const [savNotifyEmail, setSavNotifyEmail] = useState(true);
  const [savLoading, setSavLoading] = useState(false);
  const [savGeneratedPassword, setSavGeneratedPassword] = useState<string | null>(null);
  const [savSuccessNotice, setSavSuccessNotice] = useState<string | null>(null);
  const [savCopied, setSavCopied] = useState(false);
  const [showCustomPass, setShowCustomPass] = useState(false);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const acc = accounts.find((a) => a["@id"] === u.account);
      const matchSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        (acc?.name && acc.name.toLowerCase().includes(q));

      const matchAccount =
        accountFilter === "all" || u.account === accountFilter;

      const roles = u.roles || [];
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "ROLE_ACCOUNT_ADMIN" && roles.includes("ROLE_ACCOUNT_ADMIN")) ||
        (roleFilter === "ROLE_PROPERTY_ADMIN" && roles.includes("ROLE_PROPERTY_ADMIN")) ||
        (roleFilter === "ROLE_USER" &&
          !roles.includes("ROLE_ADMIN") &&
          !roles.includes("ROLE_ATELIER") &&
          !roles.includes("ROLE_ACCOUNT_ADMIN") &&
          !roles.includes("ROLE_PROPERTY_ADMIN")) ||
        (roleFilter === "ROLE_ADMIN" && roles.includes("ROLE_ADMIN")) ||
        (roleFilter === "ROLE_ATELIER" && roles.includes("ROLE_ATELIER"));

      return matchSearch && matchAccount && matchRole;
    });
  }, [users, accounts, searchQuery, accountFilter, roleFilter]);

  // Propriétés du compte sélectionné dans la modale
  const modalAccountProperties = useMemo(() => {
    if (!userAccountIri) return properties;
    return properties.filter((p) => p.account === userAccountIri);
  }, [properties, userAccountIri]);

  // Statistiques
  const stats = useMemo(() => {
    const accountAdmins = users.filter((u) => (u.roles || []).includes("ROLE_ACCOUNT_ADMIN")).length;
    const propertyAdmins = users.filter((u) => (u.roles || []).includes("ROLE_PROPERTY_ADMIN")).length;
    const simpleUsers = users.filter((u) => {
      const r = u.roles || [];
      return (
        !r.includes("ROLE_ADMIN") &&
        !r.includes("ROLE_ATELIER") &&
        !r.includes("ROLE_ACCOUNT_ADMIN") &&
        !r.includes("ROLE_PROPERTY_ADMIN")
      );
    }).length;
    const staff = users.filter(
      (u) => (u.roles || []).includes("ROLE_ADMIN") || (u.roles || []).includes("ROLE_ATELIER")
    ).length;
    return {
      total: users.length,
      accountAdmins,
      propertyAdmins,
      simpleUsers,
      staff,
      propertiesCount: properties.length,
    };
  }, [users, properties]);

  // Ouvrir la modale en création
  const handleOpenCreate = () => {
    setEditingUser(null);
    setUserEmail("");
    setUserPassword(generateSecurePass());
    setUserAccountIri(accounts[0]?.["@id"] || "/api/accounts/1");
    setUserRole("ROLE_ACCOUNT_ADMIN");
    setSelectedPropertyIris([]);
    setModalError(null);
    setEditModalOpen(true);
  };

  // Ouvrir la modale en édition
  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setUserEmail(user.email);
    setUserPassword("");
    setUserAccountIri(user.account || accounts[0]?.["@id"] || "/api/accounts/1");

    const roles = user.roles || [];
    if (roles.includes("ROLE_ADMIN")) {
      setUserRole("ROLE_ADMIN");
    } else if (roles.includes("ROLE_ATELIER")) {
      setUserRole("ROLE_ATELIER");
    } else if (roles.includes("ROLE_ACCOUNT_ADMIN")) {
      setUserRole("ROLE_ACCOUNT_ADMIN");
    } else if (roles.includes("ROLE_PROPERTY_ADMIN")) {
      setUserRole("ROLE_PROPERTY_ADMIN");
    } else {
      setUserRole("ROLE_USER");
    }

    setSelectedPropertyIris(user.properties || []);
    setModalError(null);
    setEditModalOpen(true);
  };

  // Ouvrir la modale SAV Mot de passe
  const handleOpenSav = (user: UserItem) => {
    setSavTargetUser(user);
    setSavMode("instant");
    setSavCustomPassword("");
    setSavNotifyEmail(true);
    setSavGeneratedPassword(null);
    setSavSuccessNotice(null);
    setSavCopied(false);
    setShowCustomPass(false);
    setSavModalOpen(true);
  };

  // Soumission modale Utilisateur
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSavingUser(true);

    try {
      if (editingUser) {
        const ok = await onUpdateUser(editingUser["@id"], {
          email: userEmail.trim(),
          account: userAccountIri,
          roles: [userRole],
          properties: selectedPropertyIris,
        });
        if (ok) setEditModalOpen(false);
      } else {
        if (!userPassword || userPassword.length < 8) {
          setModalError("Le mot de passe doit comporter au moins 8 caractères.");
          setSavingUser(false);
          return;
        }
        const ok = await onCreateUser({
          email: userEmail.trim(),
          plainPassword: userPassword,
          account: userAccountIri,
          roles: [userRole],
          properties: selectedPropertyIris,
        });
        if (ok) setEditModalOpen(false);
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSavingUser(false);
    }
  };

  // Exécution action SAV
  const handleTriggerSav = async () => {
    if (!savTargetUser) return;
    setSavLoading(true);
    setSavSuccessNotice(null);
    setSavGeneratedPassword(null);

    try {
      if (savMode === "instant") {
        const res = await onRegeneratePassword(savTargetUser.id, {
          notifyEmail: savNotifyEmail,
        });
        if (res && res.success) {
          setSavGeneratedPassword(res.temporaryPassword);
          setSavSuccessNotice(
            res.emailSent
              ? `Mot de passe temporaire généré et notifié par email à ${savTargetUser.email}.`
              : `Mot de passe temporaire généré avec succès.`
          );
        }
      } else if (savMode === "custom") {
        if (!savCustomPassword || savCustomPassword.length < 8) {
          alert("Le mot de passe doit comporter au moins 8 caractères.");
          setSavLoading(false);
          return;
        }
        const res = await onRegeneratePassword(savTargetUser.id, {
          customPassword: savCustomPassword,
          notifyEmail: savNotifyEmail,
        });
        if (res && res.success) {
          setSavGeneratedPassword(res.temporaryPassword);
          setSavSuccessNotice(
            `Nouveau mot de passe appliqué avec succès à l'utilisateur ${savTargetUser.email}.`
          );
        }
      } else if (savMode === "link") {
        const res = await onSendResetLink(savTargetUser.id);
        if (res && res.success) {
          setSavSuccessNotice(
            `Un e-mail officiel de réinitialisation contenant le lien sécurisé et le code a été envoyé à ${savTargetUser.email}.`
          );
        }
      }
    } finally {
      setSavLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSavCopied(true);
    setTimeout(() => setSavCopied(false), 2500);
  };

  // Générateur de mot de passe convivial
  function generateSecurePass() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Alpes-${new Date().getFullYear()}-${rand}`;
  }

  // Toggle propriété
  const toggleProperty = (iri: string) => {
    setSelectedPropertyIris((prev) =>
      prev.includes(iri) ? prev.filter((x) => x !== iri) : [...prev, iri]
    );
  };

  const selectAllProperties = () => {
    setSelectedPropertyIris(modalAccountProperties.map((p) => p["@id"]));
  };

  const deselectAllProperties = () => {
    setSelectedPropertyIris([]);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-[#F7F5EF]">
      {/* EN-TÊTE & STATS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#DFCA9F]">
              <Users className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Gestion des Utilisateurs &amp; Droits d&apos;Accès
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8C8379]">
            Administration des comptes clients, habilitations d&apos;accès aux chalets &amp; déclencheur SAV à distance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-4 py-2 text-xs font-semibold text-[#111113] transition-all hover:bg-[#DFCA9F] hover:shadow-lg hover:shadow-[#C9A96B]/20"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-3.5">
          <div className="text-[11px] font-medium text-[#8C8379]">Total Utilisateurs</div>
          <div className="mt-1 text-xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-3.5">
          <div className="text-[11px] font-medium text-[#8C8379]">Admins de Compte</div>
          <div className="mt-1 text-xl font-bold text-amber-400">{stats.accountAdmins}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-3.5">
          <div className="text-[11px] font-medium text-[#8C8379]">Admins Propriétés &amp; Users</div>
          <div className="mt-1 text-xl font-bold text-sky-400">
            {stats.propertyAdmins + stats.simpleUsers}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-3.5">
          <div className="text-[11px] font-medium text-[#8C8379]">Staff Atelier &amp; SAV</div>
          <div className="mt-1 text-xl font-bold text-[#DFCA9F]">{stats.staff}</div>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#161619] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8379]" />
          <input
            type="text"
            placeholder="Rechercher par email, entreprise, propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#111113] pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8C8379] focus:border-[#C9A96B] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-1.5 text-xs text-[#F7F5EF] focus:border-[#C9A96B] focus:outline-none"
          >
            <option value="all">Tous les rôles</option>
            <option value="ROLE_ACCOUNT_ADMIN">Administrateurs du Compte</option>
            <option value="ROLE_PROPERTY_ADMIN">Administrateurs de Propriété</option>
            <option value="ROLE_USER">Simples Utilisateurs</option>
            <option value="ROLE_ADMIN">Admins Globaux VisuAlpes</option>
            <option value="ROLE_ATELIER">Artisans Atelier</option>
          </select>
        </div>
      </div>

      {/* TABLEAU DES UTILISATEURS */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161619]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-semibold text-[#8C8379]">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Compte / Entreprise</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Droits Propriétés</th>
                <th className="px-4 py-3 text-right">Actions SAV &amp; Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#8C8379]">
                    Aucun utilisateur ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const acc = accounts.find((a) => a["@id"] === u.account);
                  const accProps = properties.filter((p) => p.account === u.account);
                  const isUserAdmin = (u.roles || []).includes("ROLE_ADMIN");
                  const isUserAtelier = (u.roles || []).includes("ROLE_ATELIER");
                  const isUserAccountAdmin = (u.roles || []).includes("ROLE_ACCOUNT_ADMIN");
                  const isUserPropertyAdmin = (u.roles || []).includes("ROLE_PROPERTY_ADMIN");
                  const userProps = u.properties || [];

                  return (
                    <tr
                      key={u["@id"]}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      {/* EMAIL & IDENTITÉ */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] font-mono text-xs font-bold text-[#C9A96B]">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-mono font-semibold text-white">
                              {u.email}
                            </div>
                            <div className="text-[10px] text-[#8C8379]">ID #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* COMPTE */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <Building className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>{acc?.name || "Compte VisuAlpes"}</span>
                        </div>
                        <div className="text-[10px] text-[#8C8379]">
                          Type : {acc?.type || "B2B"}
                        </div>
                      </td>

                      {/* RÔLE */}
                      <td className="px-4 py-3.5">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            <Shield className="h-3 w-3" />
                            Admin Global
                          </span>
                        ) : isUserAtelier ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                            Artisan Atelier
                          </span>
                        ) : isUserAccountAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Shield className="h-3 w-3" />
                            Admin Compte
                          </span>
                        ) : isUserPropertyAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                            Admin Propriété
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
                            Simple Utilisateur
                          </span>
                        )}
                      </td>

                      {/* DROITS D'ACCÈS AUX PROPRIÉTÉS */}
                      <td className="px-4 py-3.5">
                        {isUserAdmin ? (
                          <span className="text-[11px] text-neutral-400 italic">
                            Accès global plateforme
                          </span>
                        ) : isUserAccountAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            <Building className="h-3 w-3" />
                            Toutes les propriétés ({accProps.length})
                          </span>
                        ) : userProps.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">
                            Aucune propriété affectée
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-2 py-0.5 text-[10px] font-medium text-[#DFCA9F]">
                              <Home className="h-3 w-3" />
                              {userProps.length} propriété{userProps.length > 1 ? "s" : ""} liée{userProps.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* DÉCLENCHEUR SAV MOT DE PASSE */}
                          <button
                            type="button"
                            onClick={() => handleOpenSav(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A96B]/40 bg-[#C9A96B]/10 px-2.5 py-1 text-[11px] font-medium text-[#DFCA9F] transition-colors hover:border-[#C9A96B] hover:bg-[#C9A96B]/20"
                            title="Régénérer le mot de passe à distance pour le SAV"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-[#C9A96B]" />
                            <span>SAV Password</span>
                          </button>

                          {/* MODIFIER */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-white/20 hover:text-white"
                            title="Modifier l'utilisateur et ses droits"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* SUPPRIMER */}
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Êtes-vous sûr de vouloir supprimer définitivement l'accès de ${u.email} ?`
                                )
                              ) {
                                void onDeleteUser(u["@id"]);
                              }
                            }}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 text-neutral-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                            title="Supprimer cet utilisateur"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALE CRÉATION / MODIFICATION UTILISATEUR & PROPRIÉTÉS */}
      {/* ======================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#161619] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#C9A96B]" />
                <h2 className="text-lg font-bold text-white">
                  {editingUser ? "Modifier l'Utilisateur" : "Créer un Nouvel Utilisateur"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="nom@chalet.com"
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                />
              </div>

              {/* Mot de passe initial (si création) */}
              {!editingUser && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">
                      Mot de passe initial (min. 8 car.)
                    </label>
                    <button
                      type="button"
                      onClick={() => setUserPassword(generateSecurePass())}
                      className="inline-flex items-center gap-1 text-[11px] text-[#DFCA9F] hover:underline"
                    >
                      <Sparkles className="h-3 w-3" />
                      Générer sécurisé
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 font-mono text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                  />
                </div>
              )}

              {/* Compte rattaché */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Compte / Entreprise rattachée
                </label>
                <select
                  value={userAccountIri}
                  onChange={(e) => setUserAccountIri(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a["@id"]} value={a["@id"]}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rôle */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Niveau d&apos;habilitation / Rôle
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white focus:border-[#C9A96B] focus:outline-none"
                >
                  <optgroup label="Gestion Client & Conciergerie (Compte > Propriétés > Utilisateurs)">
                    <option value="ROLE_ACCOUNT_ADMIN">
                      Administrateur du compte (accès complet au compte &amp; gestion des collaborateurs)
                    </option>
                    <option value="ROLE_PROPERTY_ADMIN">
                      Administrateur de propriété (gestion autonome des chalets affectés)
                    </option>
                    <option value="ROLE_USER">
                      Simple utilisateur (consultation des chalets affectés)
                    </option>
                  </optgroup>
                  <optgroup label="Personnel Interne VisuAlpes">
                    <option value="ROLE_ATELIER">Artisan Atelier VisuAlpes (ROLE_ATELIER)</option>
                    <option value="ROLE_ADMIN">Administrateur Global VisuAlpes (ROLE_ADMIN)</option>
                  </optgroup>
                </select>
              </div>

              {/* DROITS D'ACCÈS AUX PROPRIÉTÉS */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                {userRole === "ROLE_ACCOUNT_ADMIN" ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                    <Shield className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-300">
                        Accès intégral Administrateur du Compte
                      </div>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        L&apos;administrateur du compte a automatiquement un accès complet à l&apos;ensemble des {modalAccountProperties.length} propriétés de son compte (présentes et futures). Il dispose des droits pour créer des utilisateurs et leur assigner des propriétés.
                      </p>
                    </div>
                  </div>
                ) : userRole === "ROLE_ADMIN" ? (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-start gap-2.5">
                    <Shield className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-300">
                        Administrateur Global VisuAlpes
                      </div>
                      <p className="text-[11px] text-rose-200/80 mt-0.5">
                        Accès complet à la plateforme et à toutes les conciergeries.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Home className="h-3.5 w-3.5 text-[#C9A96B]" />
                          <span>Affectation des Logements / Propriétés</span>
                        </label>
                        <p className="text-[11px] text-[#8C8379]">
                          Cochez les chalets que cet utilisateur a le droit de {userRole === "ROLE_PROPERTY_ADMIN" ? "gérer (Wi-Fi, codes, zones)" : "consulter"}.
                        </p>
                      </div>

                      {modalAccountProperties.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={selectAllProperties}
                            className="text-[#DFCA9F] hover:underline"
                          >
                            Tout cocher
                          </button>
                          <span className="text-neutral-600">•</span>
                          <button
                            type="button"
                            onClick={deselectAllProperties}
                            className="text-neutral-400 hover:text-white"
                          >
                            Tout décocher
                          </button>
                        </div>
                      )}
                    </div>

                    {modalAccountProperties.length === 0 ? (
                      <div className="rounded-lg border border-white/[0.08] bg-[#111113] p-4 text-center text-xs text-[#8C8379]">
                        Aucune propriété enregistrée pour ce compte pour le moment.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111113] p-2 space-y-1.5">
                        {modalAccountProperties.map((prop) => {
                          const checked = selectedPropertyIris.includes(prop["@id"]);
                          return (
                            <label
                              key={prop["@id"]}
                              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                                checked
                                  ? "bg-[#C9A96B]/15 border border-[#C9A96B]/40 text-white"
                                  : "hover:bg-white/[0.03] text-neutral-400"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleProperty(prop["@id"])}
                                  className="rounded border-white/20 text-[#C9A96B] focus:ring-[#C9A96B]"
                                />
                                <span className="text-xs font-medium text-white">
                                  {prop.name}
                                </span>
                              </div>
                              {prop.wifiSSID && (
                                <span className="text-[10px] text-[#8C8379] font-mono">
                                  Wi-Fi: {prop.wifiSSID}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {selectedPropertyIris.length === 0 && modalAccountProperties.length > 0 && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        <span>
                          Attention : aucun chalet n&apos;est sélectionné. Cet utilisateur n&apos;aura accès à aucun hébergement tant qu&apos;une propriété ne lui sera pas affectée.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Boutons validation */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-5 py-2 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
                >
                  {savingUser ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE SAV RÉGÉNÉRATION DU MOT DE PASSE À DISTANCE     */}
      {/* ======================================================== */}
      {savModalOpen && savTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[#C9A96B]/30 bg-[#161619] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F]">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">
                    SAV — Régénération de Mot de Passe
                  </h2>
                  <p className="text-[11px] text-[#8C8379]">
                    Déclenchement d&apos;assistance à distance pour le client
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSavModalOpen(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Fiche client cible */}
            <div className="rounded-lg border border-white/[0.08] bg-[#111113] p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-[#8C8379]">Client cible : </span>
                <span className="font-mono font-bold text-white">
                  {savTargetUser.email}
                </span>
              </div>
              <span className="text-[10px] text-[#DFCA9F] font-mono">
                ID #{savTargetUser.id}
              </span>
            </div>

            {/* Onglets de mode SAV */}
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.08] bg-[#111113] p-1 text-xs">
              <button
                type="button"
                onClick={() => setSavMode("instant")}
                className={`rounded-md py-1.5 font-medium transition-all ${
                  savMode === "instant"
                    ? "bg-[#C9A96B] text-[#111113] font-semibold"
                    : "text-[#8C8379] hover:text-white"
                }`}
              >
                Pass Temporaire
              </button>
              <button
                type="button"
                onClick={() => setSavMode("custom")}
                className={`rounded-md py-1.5 font-medium transition-all ${
                  savMode === "custom"
                    ? "bg-[#C9A96B] text-[#111113] font-semibold"
                    : "text-[#8C8379] hover:text-white"
                }`}
              >
                Personnalisé
              </button>
              <button
                type="button"
                onClick={() => setSavMode("link")}
                className={`rounded-md py-1.5 font-medium transition-all ${
                  savMode === "link"
                    ? "bg-[#C9A96B] text-[#111113] font-semibold"
                    : "text-[#8C8379] hover:text-white"
                }`}
              >
                Lien par E-mail
              </button>
            </div>

            {/* CONTENU SELON MODE */}
            {savMode === "instant" && (
              <div className="space-y-3 text-xs text-neutral-300">
                <p>
                  Génère immédiatement un mot de passe temporaire robuste (ex :{" "}
                  <code className="text-[#DFCA9F]">Alpes-2026-Xk8p</code>) et l&apos;applique instantanément au compte. Vous pourrez le copier et le dicter au client.
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#8C8379]">
                  <input
                    type="checkbox"
                    checked={savNotifyEmail}
                    onChange={(e) => setSavNotifyEmail(e.target.checked)}
                    className="rounded border-white/20 text-[#C9A96B] focus:ring-[#C9A96B]"
                  />
                  <span>Notifier également le client par email</span>
                </label>
              </div>
            )}

            {savMode === "custom" && (
              <div className="space-y-3 text-xs">
                <p className="text-neutral-300">
                  Saisissez un mot de passe de remplacement pour le client (minimum 8 caractères) :
                </p>
                <div className="relative">
                  <input
                    type={showCustomPass ? "text" : "password"}
                    minLength={8}
                    placeholder="Nouveau mot de passe..."
                    value={savCustomPassword}
                    onChange={(e) => setSavCustomPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-xs text-white pr-9 focus:border-[#C9A96B] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomPass(!showCustomPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showCustomPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#8C8379]">
                  <input
                    type="checkbox"
                    checked={savNotifyEmail}
                    onChange={(e) => setSavNotifyEmail(e.target.checked)}
                    className="rounded border-white/20 text-[#C9A96B] focus:ring-[#C9A96B]"
                  />
                  <span>Aviser le client par email</span>
                </label>
              </div>
            )}

            {savMode === "link" && (
              <div className="space-y-3 text-xs text-neutral-300">
                <p>
                  Envoie un e-mail officiel VisuAlpes avec un jeton sécurisé de 30 minutes au client pour qu&apos;il définisse lui-même son nouveau mot de passe.
                </p>
                <div className="rounded-lg border border-white/[0.08] bg-[#111113] p-3 text-[11px] text-[#8C8379] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#C9A96B] shrink-0" />
                  <span>Destinataire : {savTargetUser.email}</span>
                </div>
              </div>
            )}

            {/* RÉSULTAT DU DÉCLENCHEMENT SAV */}
            {savGeneratedPassword && (
              <div className="rounded-xl border border-[#C9A96B]/50 bg-[#C9A96B]/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#DFCA9F]">
                    Nouveau Mot de Passe Actif :
                  </span>
                  {savCopied && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copié !
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#C9A96B]/30 bg-[#111113] px-3.5 py-2">
                  <span className="font-mono text-sm font-bold text-white select-all">
                    {savGeneratedPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(savGeneratedPassword)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#C9A96B] px-3 py-1 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F]"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copier</span>
                  </button>
                </div>
              </div>
            )}

            {savSuccessNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{savSuccessNotice}</span>
              </div>
            )}

            {/* BOUTON D'ACTION SAV */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSavModalOpen(false)}
                className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
              >
                Fermer
              </button>

              <button
                type="button"
                disabled={savLoading}
                onClick={handleTriggerSav}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C9A96B] px-5 py-2 text-xs font-semibold text-[#111113] hover:bg-[#DFCA9F] disabled:opacity-50"
              >
                {savLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>
                      {savMode === "instant"
                        ? "Générer & Appliquer"
                        : savMode === "custom"
                        ? "Appliquer le mot de passe"
                        : "Envoyer l'e-mail"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

