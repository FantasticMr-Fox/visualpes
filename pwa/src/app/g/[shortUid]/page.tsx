"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

interface PublicGuidePayload {
  shortUid: string;
  status: string;
  encodeAt?: string | null;
  productName?: string | null;
  orderId?: number | null;
  accountName?: string | null;
  zone?: {
    id: number;
    name: string;
    mountType?: string | null;
  } | null;
  property?: {
    id: number;
    name: string;
    wifiSSID?: string | null;
    wifiPassword?: string | null;
    externalGuideUrl?: string | null;
    instructions?: string | null;
  } | null;
  error?: string;
}

export default function PublicGuidePage() {
  const params = useParams<{ shortUid: string }>();
  const shortUid = params?.shortUid ?? "";

  const [data, setData] = useState<PublicGuidePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [copiedWifi, setCopiedWifi] = useState<boolean>(false);

  useEffect(() => {
    if (!shortUid) return;
    fetch(`${API_URL}/public/guide/${encodeURIComponent(shortUid)}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const body = (await res.json()) as PublicGuidePayload;
        if (!res.ok) {
          setNotFoundError(body.error ?? "Support NFC non reconnu.");
        } else {
          setData(body);
        }
      })
      .catch(() => {
        setNotFoundError("Impossible de joindre le serveur VisuAlpes.");
      })
      .finally(() => setLoading(false));
  }, [shortUid]);

  const copyWifiPassword = async () => {
    const pass = data?.property?.wifiPassword;
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2500);
    } catch {
      // Fallback silencieux
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
        <div className="text-center text-sm text-neutral-400">
          Chargement du guide d&apos;accueil VisuAlpes…
        </div>
      </main>
    );
  }

  if (notFoundError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 font-mono text-lg font-black text-rose-400">
            !
          </div>
          <h1 className="text-lg font-bold">Support NFC #{shortUid.toUpperCase()}</h1>
          <p className="mt-2 text-xs text-neutral-400">{notFoundError}</p>
        </div>
      </main>
    );
  }

  const prop = data.property;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 p-4 text-neutral-100">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-2xl">
        {/* En-tête VisuAlpes & Logement */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-sm font-black text-neutral-950">
              VA
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                {data.accountName ?? "Accueil Voyageur"}
              </span>
              <h1 className="text-xl font-bold leading-tight text-white">
                {prop?.name ?? "Support Connecté VisuAlpes"}
              </h1>
            </div>
          </div>

          <span className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 font-mono text-xs font-bold text-neutral-300">
            #{data.shortUid}
          </span>
        </div>

        {/* Badge Zone & Support */}
        {(data.zone || data.productName) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-3.5 py-2 text-xs">
            {data.zone ? (
              <span className="text-neutral-300">
                Emplacement : <strong className="text-white">{data.zone.name}</strong>
                {data.zone.mountType ? ` (${data.zone.mountType})` : ""}
              </span>
            ) : (
              <span className="text-neutral-400">{data.productName}</span>
            )}
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
              NFC Actif
            </span>
          </div>
        )}

        {/* Carte Wi-Fi 1 clic */}
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
              Connexion Wi-Fi du logement
            </span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
              Accès rapide
            </span>
          </div>

          {prop?.wifiSSID ? (
            <>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Réseau (SSID)</span>
                  <span className="font-mono text-sm font-bold text-white">
                    {prop.wifiSSID}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2">
                  <span className="text-neutral-400">Mot de passe</span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {prop.wifiPassword || "Accès libre"}
                  </span>
                </div>
              </div>

              {prop.wifiPassword && (
                <button
                  type="button"
                  onClick={copyWifiPassword}
                  className="w-full rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-sky-400"
                >
                  {copiedWifi
                    ? "✓ Mot de passe Wi-Fi copié !"
                    : "Copier le mot de passe Wi-Fi"}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-neutral-400">
              Aucun identifiant Wi-Fi configuré sur cette propriété pour le moment.
            </p>
          )}
        </div>

        {/* Instructions d'accueil / départ */}
        {prop?.instructions && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Instructions & Informations utiles
            </span>
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-200">
              {prop.instructions}
            </p>
          </div>
        )}

        {/* Lien vers le livret d'accueil externe */}
        {prop?.externalGuideUrl && (
          <a
            href={prop.externalGuideUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-neutral-950 shadow-lg transition-colors hover:bg-emerald-400"
          >
            <span>Ouvrir le livret d&apos;accueil complet</span>
            <span>↗</span>
          </a>
        )}

        <footer className="border-t border-neutral-800/80 pt-3 text-center text-[11px] text-neutral-500">
          Support connecté fabriqué dans les Alpes par <strong>VisuAlpes</strong>
        </footer>
      </div>
    </main>
  );
}

