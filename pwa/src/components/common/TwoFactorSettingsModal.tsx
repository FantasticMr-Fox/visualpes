"use client";

import React, { useCallback, useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { WifiQrCodeSvg } from "@/components/common/WifiQrCodeSvg";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { Mail, ShieldCheck, Smartphone } from "lucide-react";

interface TwoFactorSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

interface AuthMePayload {
  id: number;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: "email" | "totp";
  hasTotpSecret: boolean;
}

interface EmailLogItem {
  id: number;
  recipient: string;
  subject: string;
  category: string;
  status: string;
  sentAt: string;
  textBody?: string | null;
}

export function TwoFactorSettingsModal({
  open,
  onOpenChange,
  isAdmin = false,
}: TwoFactorSettingsModalProps) {
  const [me, setMe] = useState<AuthMePayload | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [otpAuthUri, setOtpAuthUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Journal des e-mails (pour admin)
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);

  const loadSecurityProfile = useCallback(async () => {
    const res = await apiFetch(`${API_URL}/auth/me`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      setMe((await res.json()) as AuthMePayload);
    }
    if (isAdmin) {
      const mailRes = await apiFetch(`${API_URL}/auth/emails`, {
        headers: { Accept: "application/json" },
      });
      if (mailRes.ok) {
        const data = (await mailRes.json()) as { items?: EmailLogItem[] };
        setEmailLogs(data.items ?? []);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadSecurityProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, loadSecurityProfile]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFeedback(null);
      setError(null);
      setTotpSecret(null);
      setOtpAuthUri(null);
      setTotpCode("");
    }
    onOpenChange(nextOpen);
  };

  const enableEmail2FA = async () => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch(`${API_URL}/auth/2fa/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ method: "email" }),
      });
      if (res.ok) {
        setFeedback(
          "Double authentification par e-mail activée. Un code à 6 chiffres vous sera demandé à chaque connexion.",
        );
        await loadSecurityProfile();
      }
    } finally {
      setBusy(false);
    }
  };

  const startTotpSetup = async () => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch(`${API_URL}/auth/2fa/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ method: "totp" }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          secret: string;
          otpAuthUri: string;
        };
        setTotpSecret(data.secret);
        setOtpAuthUri(data.otpAuthUri);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/auth/2fa/confirm-totp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Code TOTP incorrect.");
      } else {
        setFeedback(
          "Application d'authentification TOTP validée et activée avec succès.",
        );
        setTotpSecret(null);
        setOtpAuthUri(null);
        setTotpCode("");
        await loadSecurityProfile();
      }
    } finally {
      setBusy(false);
    }
  };

  const disable2FA = async () => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiFetch(`${API_URL}/auth/2fa/disable`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setFeedback("La double authentification (2FA) a été désactivée.");
        await loadSecurityProfile();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <DialogTitle>Sécurité, 2FA &amp; Notifications E-mail</DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="text-sm text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </DialogHeader>

        {me && (
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 text-xs">
            <div>
              <div className="font-mono font-semibold text-white">
                {me.email}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">
                Statut 2FA :{" "}
                {me.twoFactorEnabled
                  ? `Activée (${me.twoFactorMethod === "totp" ? "Application Authenticator" : "Code par E-mail"})`
                  : "Désactivée"}
              </div>
            </div>
            <Badge variant={me.twoFactorEnabled ? "success" : "secondary"}>
              {me.twoFactorEnabled ? "2FA Active" : "Standard"}
            </Badge>
          </div>
        )}

        {feedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            {feedback}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3.5 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Mail className="h-3.5 w-3.5 text-sky-400" />
                <span>2FA par E-mail</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Envoie un code à 6 chiffres par e-mail à chaque connexion.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={
                me?.twoFactorEnabled && me.twoFactorMethod === "email"
                  ? "secondary"
                  : "default"
              }
              disabled={busy}
              onClick={() => void enableEmail2FA()}
            >
              {me?.twoFactorEnabled && me.twoFactorMethod === "email"
                ? "✓ Mode E-mail actif"
                : "Activer 2FA par E-mail"}
            </Button>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3.5 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Smartphone className="h-3.5 w-3.5 text-purple-400" />
                <span>App Authenticator (TOTP)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Google Authenticator, Apple Mots de passe, Authy ou 1Password.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void startTotpSetup()}
            >
              {me?.twoFactorEnabled && me.twoFactorMethod === "totp"
                ? "Reconfigurer QR TOTP"
                : "Configurer QR Code TOTP"}
            </Button>
          </div>
        </div>

        {/* Assistant d'appairage QR Code TOTP */}
        {otpAuthUri && totpSecret && (
          <form
            onSubmit={(e) => void confirmTotp(e)}
            className="flex flex-col items-center gap-3 rounded-2xl border border-purple-500/30 bg-purple-950/15 p-4 text-xs"
          >
            <WifiQrCodeSvg value={otpAuthUri} size={156} />
            <div className="text-center">
              <div className="text-[11px] text-neutral-300">
                Scannez ce QR Code dans votre application Authenticator
              </div>
              <div className="mt-1 font-mono text-[11px] text-purple-300">
                Clé manuelle : {totpSecret}
              </div>
            </div>
            <div className="flex w-full gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="Code à 6 chiffres"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D+/g, "").slice(0, 6))
                }
                className="text-center font-mono"
              />
              <Button type="submit" disabled={busy || totpCode.length < 6}>
                Confirmer
              </Button>
            </div>
          </form>
        )}

        {me?.twoFactorEnabled && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void disable2FA()}
            >
              Désactiver la double authentification
            </Button>
          </div>
        )}

        {/* Journal des e-mails envoyés (Admin uniquement) */}
        {isAdmin && (
          <div className="flex flex-col gap-2 border-t border-neutral-800 pt-3 text-xs">
            <button
              type="button"
              onClick={() => setShowEmailLogs((v) => !v)}
              className="flex items-center justify-between text-left font-semibold text-neutral-300 hover:text-white"
            >
              <span>Journal des e-mails envoyés ({emailLogs.length})</span>
              <span className="text-[11px] text-sky-300">
                {showEmailLogs ? "Masquer" : "Afficher"}
              </span>
            </button>

            {showEmailLogs && (
              <div className="flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {emailLogs.length === 0 ? (
                  <p className="text-[11px] text-neutral-500">
                    Aucun e-mail envoyé pour le moment.
                  </p>
                ) : (
                  emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-emerald-300">
                          {log.recipient}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(log.sentAt).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div className="font-medium text-white">{log.subject}</div>
                      {log.textBody && (
                        <p className="line-clamp-2 whitespace-pre-line text-neutral-400">
                          {log.textBody}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

