"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";

interface TapInspectPayload {
  shortUid: string;
  status: string;
  paired: boolean;
  redirectUrl: string | null;
  productName?: string | null;
  accountName?: string | null;
  propertyName?: string | null;
  zoneName?: string | null;
  existingProperties?: { id: number; name: string }[];
  error?: string;
}

const ZONE_SUGGESTIONS = ["Entrée", "Salon", "Cuisine", "Chambre", "Ski Room"];

export default function NfcTapRoutingPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params?.uid ?? "";
  const forceSetup = searchParams?.get("setup") === "1";

  const [inspectData, setInspectData] = useState<TapInspectPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire Magic Scan (Appairage B2C/B2B)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(0);
  const [accountName, setAccountName] = useState<string>("");
  const [propertyName, setPropertyName] = useState<string>("");
  const [zoneName, setZoneName] = useState<string>("Entrée");
  const [wifiSSID, setWifiSSID] = useState<string>("");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [wifiAccessCode, setWifiAccessCode] = useState<string>("");
  const [externalGuideUrl, setExternalGuideUrl] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!uid) return;
    fetch(`${API_URL}/public/tap/${encodeURIComponent(uid)}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const body = (await res.json()) as TapInspectPayload;
        if (!res.ok) {
          setError(body.error ?? "Support NFC non reconnu.");
          setLoading(false);
          return;
        }

        // Si le tag est déjà rattaché à une propriété/zone et que l'utilisateur n'a pas demandé ?setup=1,
        // redirection transparente vers le portail voyageur /g/[uid].
        if (body.paired && body.redirectUrl && !forceSetup) {
          router.replace(body.redirectUrl);
          return;
        }

        setInspectData(body);
        if (body.accountName) setAccountName(body.accountName);
        if (body.propertyName) setPropertyName(body.propertyName);
        if (body.zoneName) setZoneName(body.zoneName);
        if (body.existingProperties && body.existingProperties.length > 0) {
          setSelectedPropertyId(body.existingProperties[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de contacter le serveur VisuAlpes.");
        setLoading(false);
      });
  }, [uid, forceSetup, router]);

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/public/tap/${encodeURIComponent(uid)}/pair`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            propertyId: selectedPropertyId > 0 ? selectedPropertyId : undefined,
            accountName: accountName.trim() || undefined,
            propertyName: propertyName.trim(),
            zoneName: zoneName.trim() || "Entrée",
            wifiSSID: wifiSSID.trim() || undefined,
            wifiPassword: wifiPassword || undefined,
            wifiAccessCode: wifiAccessCode.trim() || undefined,
            externalGuideUrl: externalGuideUrl.trim() || undefined,
            instructions: instructions.trim() || undefined,
          }),
        },
      );

      const body = (await res.json()) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Échec de l'appairage du support NFC.");
        setSubmitting(false);
        return;
      }

      router.replace(body.redirectUrl ?? `/g/${encodeURIComponent(uid.toUpperCase())}`);
    } catch {
      setError("Erreur réseau lors de l'activation du support.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
        <div className="text-center text-xs text-neutral-400">
          Identification du support NFC #{uid.toUpperCase()}…
        </div>
      </main>
    );
  }

  if (error && !inspectData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 text-center">
          <h1 className="text-base font-bold">Support #{uid.toUpperCase()}</h1>
          <p className="mt-1.5 text-xs text-neutral-400">{error}</p>
        </div>
      </main>
    );
  }

  const existingProps = inspectData?.existingProperties ?? [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-100">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-neutral-800/90 bg-neutral-900/70 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-xs font-black text-neutral-950">
              VA
            </div>
            <div>
              <span className="text-[11px] font-medium text-emerald-400">
                Magic Scan • Activation rapide
              </span>
              <h1 className="text-lg font-bold leading-snug text-white">
                Configurer votre support
              </h1>
            </div>
          </div>

          <span className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            #{inspectData?.shortUid ?? uid.toUpperCase()}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handlePairSubmit(e)} className="flex flex-col gap-3.5">
          {!inspectData?.accountName && (
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Votre nom ou conciergerie
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="ex: Chalet Les Marmottes"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </label>
          )}

          {existingProps.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Logement
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
              >
                {existingProps.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value={0}>+ Créer un nouveau logement…</option>
              </select>
            </label>
          )}

          {(existingProps.length === 0 || selectedPropertyId === 0) && (
            <label className="flex flex-col gap-1 text-xs text-neutral-300">
              Nom du logement
              <input
                type="text"
                required
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="ex: Appartement Le Glacier — Val Thorens"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </label>
          )}

          <div className="flex flex-col gap-1.5 text-xs text-neutral-300">
            <span>Pièce / Emplacement du support</span>
            <input
              type="text"
              required
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="ex: Entrée, Salon, Cuisine…"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
            />
            <div className="flex flex-wrap gap-1">
              {ZONE_SUGGESTIONS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoneName(z)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] ${
                    zoneName === z
                      ? "border-white bg-white text-neutral-950 font-semibold"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <span className="text-xs font-semibold text-white">
              Wi-Fi du logement (chiffré AES-256)
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={wifiSSID}
                onChange={(e) => setWifiSSID(e.target.value)}
                placeholder="Nom du Wi-Fi (SSID)"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
              />
              <input
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Mot de passe Wi-Fi"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
              />
            </div>
            <input
              type="text"
              value={wifiAccessCode}
              onChange={(e) => setWifiAccessCode(e.target.value)}
              placeholder="Code PIN voyageur optionnel (ex: 2516)"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white"
            />
          </div>

          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Consignes d&apos;accueil & départ (alimente le Concierge IA)
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Check-in 16h, casier à skis n°12 au sous-sol, départ avant 10h…"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-300">
            Lien externe optionnel (Airbnb, Notion, livret PDF…)
            <input
              type="url"
              value={externalGuideUrl}
              onChange={(e) => setExternalGuideUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {submitting ? "Activation en cours…" : "Activer ce support NFC →"}
          </button>
        </form>
      </div>
    </main>
  );
}

