"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";

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
    wifiConfigured?: boolean;
    wifiProtectedByCode?: boolean;
    wifiSsidMasked?: string | null;
    externalGuideUrl?: string | null;
    instructions?: string | null;
  } | null;
  error?: string;
}

interface UnlockedWifiPayload {
  wifiSSID: string | null;
  wifiPassword: string | null;
  wifiQrPayload: string | null;
  error?: string;
}

export default function PublicGuidePage() {
  const params = useParams<{ shortUid: string }>();
  const shortUid = params?.shortUid ?? "";

  const [data, setData] = useState<PublicGuidePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

  const [accessCode, setAccessCode] = useState<string>("");
  const [unlockingWifi, setUnlockingWifi] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockedWifi, setUnlockedWifi] = useState<UnlockedWifiPayload | null>(null);
  const [showWifiPassword, setShowWifiPassword] = useState<boolean>(false);
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

  const handleUnlockWifi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shortUid) return;

    setUnlockingWifi(true);
    setUnlockError(null);
    try {
      const res = await fetch(
        `${API_URL}/public/guide/${encodeURIComponent(shortUid)}/unlock-wifi`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ accessCode: accessCode.trim() }),
        },
      );
      const body = (await res.json()) as UnlockedWifiPayload;
      if (!res.ok) {
        setUnlockError(body.error ?? "Impossible de déverrouiller le Wi-Fi.");
      } else {
        setUnlockedWifi(body);
        setShowWifiPassword(false);
      }
    } catch {
      setUnlockError("Erreur réseau lors du déverrouillage Wi-Fi.");
    } finally {
      setUnlockingWifi(false);
    }
  };

  const copyWifiPassword = async () => {
    const pass = unlockedWifi?.wifiPassword;
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
        <div className="text-center text-xs text-neutral-500">
          Chargement du guide d&apos;accueil…
        </div>
      </main>
    );
  }

  if (notFoundError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 text-center">
          <h1 className="text-base font-bold">Support #{shortUid.toUpperCase()}</h1>
          <p className="mt-1.5 text-xs text-neutral-400">{notFoundError}</p>
        </div>
      </main>
    );
  }

  const prop = data.property;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-100">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-neutral-800/90 bg-neutral-900/70 p-6 shadow-2xl">
        {/* En-tête épuré du logement */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-xs font-black text-neutral-950">
              VA
            </div>
            <div>
              <span className="text-[11px] font-medium text-neutral-400">
                {data.accountName ?? "Bienvenue"}
                {data.zone ? ` • ${data.zone.name}` : ""}
              </span>
              <h1 className="text-lg font-bold leading-snug text-white">
                {prop?.name ?? "Guide d'accueil"}
              </h1>
            </div>
          </div>

          <span className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            #{data.shortUid}
          </span>
        </div>

        {/* Carte Wi-Fi */}
        <div className="flex flex-col gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Connexion Wi-Fi</span>
            <span className="text-[11px] text-neutral-400">
              {unlockedWifi ? "Déverrouillé" : prop?.wifiSsidMasked ?? ""}
            </span>
          </div>

          {prop?.wifiConfigured ? (
            unlockedWifi ? (
              <>
                {unlockedWifi.wifiQrPayload && (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <WifiQrCodeSvg value={unlockedWifi.wifiQrPayload} size={172} />
                    <span className="text-center text-[11px] text-neutral-400">
                      Scannez avec l&apos;appareil photo pour vous connecter
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Réseau</span>
                    <span className="font-mono font-semibold text-white">
                      {unlockedWifi.wifiSSID}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-800/70 pt-2">
                    <span className="text-neutral-400">Mot de passe</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-emerald-300">
                        {unlockedWifi.wifiPassword
                          ? showWifiPassword
                            ? unlockedWifi.wifiPassword
                            : "••••••••••••"
                          : "Accès libre"}
                      </span>
                      {unlockedWifi.wifiPassword && (
                        <button
                          type="button"
                          onClick={() => setShowWifiPassword((prev) => !prev)}
                          className="rounded border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300 hover:text-white"
                        >
                          {showWifiPassword ? "Masquer" : "Afficher"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {unlockedWifi.wifiPassword && (
                  <button
                    type="button"
                    onClick={() => void copyWifiPassword()}
                    className="w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
                  >
                    {copiedWifi
                      ? "✓ Mot de passe copié"
                      : "Copier le mot de passe Wi-Fi"}
                  </button>
                )}
              </>
            ) : (
              <form
                onSubmit={(e) => void handleUnlockWifi(e)}
                className="flex flex-col gap-3"
              >
                {prop.wifiProtectedByCode && (
                  <label className="flex flex-col gap-1.5 text-xs text-neutral-300">
                    Code d&apos;accès séjour
                    <input
                      type="password"
                      required
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Saisir le code communiqué par votre hôte"
                      className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-center font-mono text-sm tracking-widest text-white outline-none focus:border-neutral-600"
                    />
                  </label>
                )}

                {unlockError && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300">
                    {unlockError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={unlockingWifi}
                  className="w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                >
                  {unlockingWifi
                    ? "Déverrouillage…"
                    : "Afficher le QR Code & le mot de passe Wi-Fi"}
                </button>
              </form>
            )
          ) : (
            <p className="text-xs text-neutral-500">
              Aucun réseau Wi-Fi renseigné pour ce logement.
            </p>
          )}
        </div>

        {/* Instructions d'accueil / départ */}
        {prop?.instructions && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-800/80 bg-neutral-950/50 p-4">
            <span className="text-xs font-semibold text-white">
              Informations pratiques
            </span>
            <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-300">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            <span>Ouvrir le livret d&apos;accueil complet</span>
            <span>↗</span>
          </a>
        )}

        <footer className="text-center text-[11px] text-neutral-600">
          VisuAlpes
        </footer>
      </div>
    </main>
  );
}
