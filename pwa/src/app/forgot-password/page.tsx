"use client";

import React, { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";
import { KeyRound } from "lucide-react";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get("email") ?? "";
  const initialCode = searchParams?.get("code") ?? "";

  const [step, setStep] = useState<"request" | "reset">(
    initialCode ? "reset" : "request",
  );
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const msg = await requestPasswordReset(email.trim());
      setInfoMessage(msg);
      setStep("reset");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi de l'e-mail.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const msg = await confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setInfoMessage(msg);
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Code de réinitialisation invalide ou expiré.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <Card className="w-full max-w-sm bg-neutral-900/70 p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Mot de passe oublié
            </h1>
            <p className="text-xs text-neutral-400">
              Réinitialisation sécurisée par e-mail
            </p>
          </div>
        </div>

        {infoMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs leading-relaxed text-emerald-200">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Votre adresse e-mail
              <Input
                type="email"
                required
                placeholder="nom@visualpes.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-2.5"
              />
            </label>

            <Button type="submit" disabled={loading} className="w-full py-2.5">
              {loading ? "Envoi en cours…" : "Recevoir mon code par e-mail"}
            </Button>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-[11px]">
              <Link href="/login" className="text-neutral-400 hover:text-white">
                ← Retour à la connexion
              </Link>
              <button
                type="button"
                onClick={() => setStep("reset")}
                className="text-sky-300 hover:underline"
              >
                J&apos;ai déjà un code
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Adresse e-mail
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Code à 6 chiffres reçu par e-mail
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D+/g, "").slice(0, 6))
                }
                className="text-center font-mono text-base tracking-[0.3em]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Nouveau mot de passe (8 caractères min.)
              <Input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <Button
              type="submit"
              disabled={loading || code.length < 6 || newPassword.length < 8}
              className="w-full py-2.5"
            >
              {loading ? "Mise à jour…" : "Enregistrer le nouveau mot de passe"}
            </Button>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => setStep("request")}
                className="text-neutral-400 hover:text-white"
              >
                ← Renvoyer un code
              </button>
              <Link href="/login" className="text-neutral-400 hover:text-white">
                Connexion
              </Link>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-xs text-neutral-500">
          Chargement…
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}

