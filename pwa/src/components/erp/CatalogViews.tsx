"use client";

import React, { useState } from "react";
import type {
  AccountSummary,
  NfcTagItem,
  PropertyItem,
  SupportTicketItem,
} from "@/types/erp";

interface ClientsViewProps {
  isAdmin: boolean;
  accounts: AccountSummary[];
  properties: PropertyItem[];
  onCreateAccount: (payload: { name: string; type: string }) => Promise<void>;
  onCreateProperty: (payload: {
    name: string;
    account: string;
    wifiSSID?: string;
    wifiPassword?: string;
    externalGuideUrl?: string;
    instructions?: string;
  }) => Promise<void>;
  onDeleteProperty: (propertyIri: string) => Promise<void>;
}

export function ClientsView({
  isAdmin,
  accounts,
  properties,
  onCreateAccount,
  onCreateProperty,
  onDeleteProperty,
}: ClientsViewProps) {
  const [accountModal, setAccountModal] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("B2B");
  const [savingAcc, setSavingAcc] = useState(false);

  const [propModal, setPropModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAccount, setPropAccount] = useState(accounts[0]?.["@id"] ?? "/api/accounts/1");
  const [propWifiSsid, setPropWifiSsid] = useState("");
  const [propWifiPass, setPropWifiPass] = useState("");
  const [propGuideUrl, setPropGuideUrl] = useState("");
  const [propInstructions, setPropInstructions] = useState("");
  const [savingProp, setSavingProp] = useState(false);

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAcc(true);
    try {
      await onCreateAccount({ name: accName.trim(), type: accType });
      setAccName("");
      setAccountModal(false);
    } finally {
      setSavingAcc(false);
    }
  };

  const submitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProp(true);
    try {
      await onCreateProperty({
        name: propName.trim(),
        account: propAccount || accounts[0]?.["@id"] || "/api/accounts/1",
        wifiSSID: propWifiSsid.trim() || undefined,
        wifiPassword: propWifiPass.trim() || undefined,
        externalGuideUrl: propGuideUrl.trim() || undefined,
        instructions: propInstructions.trim() || undefined,
      });
      setPropName("");
      setPropWifiSsid("");
      setPropWifiPass("");
      setPropGuideUrl("");
      setPropInstructions("");
      setPropModal(false);
    } finally {
      setSavingProp(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients & Propriétés</h1>
          <p className="text-sm text-neutral-400">
            Comptes conciergeries / propriétaires, identifiants Wi-Fi et livrets d&apos;accueil connectés
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAccountModal(true)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            >
              + Nouveau compte client
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPropAccount(accounts[0]?.["@id"] ?? "/api/accounts/1");
              setPropModal(true);
            }}
            className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            + Nouvelle propriété
          </button>
        </div>
      </div>

      {/* Comptes clients */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Comptes enregistrés ({accounts.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const propCount = properties.filter((p) => p.account === acc["@id"]).length;
            return (
              <div
                key={acc["@id"]}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 p-4"
              >
                <div>
                  <div className="font-semibold text-neutral-100">{acc.name}</div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {propCount} propriété{propCount > 1 ? "s" : ""} rattachée{propCount > 1 ? "s" : ""}
                  </div>
                </div>
                <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300">
                  {acc.type}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Propriétés & Guides */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Propriétés & Paramètres NFC ({properties.length})
        </h2>
        {properties.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
            Aucune propriété configurée pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {properties.map((prop) => {
              const acc = accounts.find((a) => a["@id"] === prop.account);
              return (
                <div
                  key={prop["@id"]}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-neutral-100">{prop.name}</h3>
                        <span className="text-xs text-neutral-400">
                          Compte : <strong className="text-neutral-200">{acc?.name ?? prop.account}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteProperty(prop["@id"])}
                        className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-900/50"
                      >
                        Suppr.
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-2.5 text-xs">
                      <div>
                        <span className="text-neutral-500">Wi-Fi SSID :</span>
                        <div className="font-mono font-medium text-neutral-200">
                          {prop.wifiSSID || "Non renseigné"}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500">Clé Wi-Fi :</span>
                        <div className="font-mono font-medium text-neutral-200">
                          {prop.wifiPassword || "—"}
                        </div>
                      </div>
                    </div>

                    {prop.instructions && (
                      <p className="mt-2.5 text-xs text-neutral-300">{prop.instructions}</p>
                    )}
                    {prop.externalGuideUrl && (
                      <a
                        href={prop.externalGuideUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-sky-400 underline hover:text-sky-300"
                      >
                        {prop.externalGuideUrl}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitAccount}
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <h2 className="text-base font-bold">Nouveau compte client</h2>
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
                {savingAcc ? "Enregistrement…" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {propModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={submitProperty}
            className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
          >
            <h2 className="text-base font-bold">Nouvelle propriété</h2>
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
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Wi-Fi SSID
                <input
                  type="text"
                  value={propWifiSsid}
                  onChange={(e) => setPropWifiSsid(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-300">
                Mot de passe Wi-Fi
                <input
                  type="text"
                  value={propWifiPass}
                  onChange={(e) => setPropWifiPass(e.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
                />
              </label>
            </div>
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
                rows={2}
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
                {savingProp ? "Enregistrement…" : "Ajouter"}
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
  onCreateNfcTag: (payload: { shortUid: string; status: NfcTagItem["status"] }) => Promise<void>;
  onUpdateNfcStatus: (tagIri: string, status: NfcTagItem["status"]) => Promise<void>;
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
  onCreateNfcTag,
  onUpdateNfcStatus,
  onDeleteNfcTag,
}: NfcTagsViewProps) {
  const [shortUid, setShortUid] = useState("");
  const [status, setStatus] = useState<NfcTagItem["status"]>("stock");
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags NFC Atelier</h1>
          <p className="text-sm text-neutral-400">
            Inventaire des puces NFC, UID courts (`/g/[shortUid]`) et statut d&apos;encodage
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
          Aucun tag NFC enregistré. Ajoutez un UID court ci-dessus pour préparer l&apos;encodage.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nfcTags.map((tag) => {
            const badge = NFC_STATUS_BADGES[tag.status] ?? NFC_STATUS_BADGES.stock;
            return (
              <div
                key={tag["@id"]}
                className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-base font-bold text-neutral-100">
                      #{tag.shortUid}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      URL publique : <span className="font-mono text-neutral-300">/g/{tag.shortUid}</span>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800 pt-2.5 text-xs">
                  <select
                    value={tag.status}
                    onChange={(e) =>
                      onUpdateNfcStatus(tag["@id"], e.target.value as NfcTagItem["status"])
                    }
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
                  >
                    <option value="stock">En stock</option>
                    <option value="encoded">Encodé</option>
                    <option value="assigned">Assigné</option>
                    <option value="defective">Défectueux</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onDeleteNfcTag(tag["@id"])}
                    className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-900/50"
                  >
                    Suppr.
                  </button>
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

