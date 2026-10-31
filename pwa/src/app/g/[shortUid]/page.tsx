"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";
import { VisuAlpesMark } from "@/components/common/VisuAlpesLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

interface PublicGuidePayload {
  shortUid: string;
  status: string;
  needsPairing?: boolean;
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

interface ConciergeAnswer {
  question: string;
  answer: string;
  confidence: number;
  matchedExcerpts: string[];
  suggestWifiCard: boolean;
  error?: string;
}

const QUICK_QUESTIONS = [
  "Arrivée & clés ?",
  "Où est le casier à skis ?",
  "Heure de départ & poubelles ?",
];

function PublicGuideContent() {
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

  // Concierge Virtuel RAG
  const [question, setQuestion] = useState<string>("");
  const [askingAi, setAskingAi] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<ConciergeAnswer | null>(null);

  // Signalement SAV discret
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reportSubject, setReportSubject] = useState<string>("");
  const [reportMessage, setReportMessage] = useState<string>("");
  const [sendingReport, setSendingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

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

  const askConcierge = async (queryText?: string) => {
    const q = (queryText ?? question).trim();
    if (!q || !shortUid) return;
    if (queryText) setQuestion(queryText);

    setAskingAi(true);
    try {
      const res = await fetch(
        `${API_URL}/public/guide/${encodeURIComponent(shortUid)}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ question: q }),
        },
      );
      const body = (await res.json()) as ConciergeAnswer;
      if (res.ok) {
        setAiResult(body);
      }
    } finally {
      setAskingAi(false);
    }
  };

  const submitIssueReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortUid || !reportSubject.trim() || !reportMessage.trim()) return;

    setSendingReport(true);
    try {
      const res = await fetch(
        `${API_URL}/public/guide/${encodeURIComponent(shortUid)}/report-issue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            subject: reportSubject.trim(),
            message: reportMessage.trim(),
          }),
        },
      );
      if (res.ok) {
        setReportSuccess(true);
        setReportSubject("");
        setReportMessage("");
      }
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0E0E0E] p-6 text-[#F7F5EF]">
        <div className="text-center text-xs text-[#8C8379]">
          Chargement du guide d&apos;accueil…
        </div>
      </main>
    );
  }

  if (notFoundError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0E0E0E] p-6 text-[#F7F5EF]">
        <div className="w-full max-w-sm rounded-2xl border border-[#262624] bg-[#141414]/90 p-6 text-center">
          <h1 className="text-base font-bold  text-[#F7F5EF]">Support #{shortUid.toUpperCase()}</h1>
          <p className="mt-1.5 text-xs text-[#8C8379]">{notFoundError}</p>
        </div>
      </main>
    );
  }

  const prop = data.property;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0E0E0E] p-4 text-[#F7F5EF]">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-[#262624] bg-[#141414]/90 p-6 shadow-2xl backdrop-blur-md">
        {/* En-tête épuré du logement */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9A96B]/50 bg-[#191617] p-2">
              <VisuAlpesMark className="h-full w-full" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#C9A96B]">
                {data.accountName ?? "Bienvenue"}
                {data.zone ? ` • ${data.zone.name}` : ""}
              </span>
              <h1 className="text-lg font-bold leading-snug text-[#F7F5EF] ">
                {prop?.name ?? "Support VisuAlpes"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="pill" />
            <span className="rounded-lg border border-white/[0.08] bg-[#111113] px-2 py-0.5 font-mono text-[11px] text-[#C9A96B]">
              #{data.shortUid}
            </span>
          </div>
        </div>

        {/* Invitation Magic Scan si ce support n'a pas encore été jumelé */}
        {!prop && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs">
            <span className="font-semibold text-emerald-300">
              Nouveau support NFC prêt à être configuré
            </span>
            <p className="text-neutral-300">
              Associez cette plaque à votre logement, votre réseau Wi-Fi et vos consignes en quelques secondes.
            </p>
            <a
              href={`/t/${encodeURIComponent(data.shortUid)}?setup=1`}
              className="rounded-xl bg-white py-2.5 text-center font-semibold text-neutral-950 hover:bg-neutral-200"
            >
              Configurer ce support (Magic Scan) →
            </a>
          </div>
        )}

        {/* Carte Wi-Fi */}
        {prop && (
          <div className="flex flex-col gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Connexion Wi-Fi</span>
              <span className="text-[11px] text-neutral-400">
                {unlockedWifi ? "Déverrouillé" : prop.wifiSsidMasked ?? ""}
              </span>
            </div>

            {prop.wifiConfigured ? (
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
        )}

        {/* Concierge Virtuel IA (RAG) */}
        {prop && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Concierge Virtuel
              </span>
              <span className="text-[10px] text-neutral-500">
                Recherche instantanée
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askConcierge();
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Une question sur le logement ?"
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
              />
              <button
                type="submit"
                disabled={askingAi || !question.trim()}
                className="rounded-xl bg-neutral-100 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-white disabled:opacity-50"
              >
                {askingAi ? "…" : "Demander"}
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void askConcierge(q)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-[11px] text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>

            {aiResult && (
              <div className="mt-1 rounded-xl border border-sky-500/25 bg-sky-950/15 p-3 text-xs leading-relaxed text-neutral-200">
                <p className="whitespace-pre-line">{aiResult.answer}</p>
              </div>
            )}
          </div>
        )}

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

        {/* Pied de page + Signalement SAV discret */}
        <footer className="flex flex-col items-center gap-2 pt-1 text-center text-[11px] text-neutral-500">
          {!reportOpen ? (
            <div className="flex items-center gap-3">
              <span>VisuAlpes</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setReportOpen(true);
                  setReportSuccess(false);
                }}
                className="text-neutral-500 underline hover:text-neutral-300"
              >
                Signaler un souci
              </button>
            </div>
          ) : reportSuccess ? (
            <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
              Merci, votre signalement a été transmis à l&apos;assistance.
            </div>
          ) : (
            <form
              onSubmit={(e) => void submitIssueReport(e)}
              className="flex w-full flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3 text-left text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">
                  Signaler un problème (#{data.shortUid})
                </span>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                required
                value={reportSubject}
                onChange={(e) => setReportSubject(e.target.value)}
                placeholder="Objet (ex: Wi-Fi, support abîmé…)"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white"
              />
              <textarea
                rows={2}
                required
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Votre message…"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={sendingReport}
                className="rounded-lg bg-white py-1.5 text-xs font-semibold text-neutral-950"
              >
                {sendingReport ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          )}
        </footer>
      </div>
    </main>
  );
}

export default function PublicGuidePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0E0E0E] p-6 text-xs text-[#8C8379]">
          Chargement du guide d&apos;accueil…
        </main>
      }
    >
      <PublicGuideContent />
    </Suspense>
  );
}
