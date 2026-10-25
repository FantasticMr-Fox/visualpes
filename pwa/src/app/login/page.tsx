"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  getTokenRoles,
  login,
  resendTwoFactorEmail,
  verifyTwoFactorCode,
} from "@/lib/api";
import { Badge, Button, Card, Input } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // État 2FA
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | "totp">("email");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const redirectByRole = () => {
    const roles = getTokenRoles();
    router.replace(roles.includes("ROLE_ADMIN") ? "/kanban" : "/client");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.twoFactorRequired && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setTwoFactorMethod(res.method ?? "email");
        setTwoFactorMessage(
          res.message ?? "Saisissez votre code de vérification à 6 chiffres.",
        );
        setOtpCode("");
      } else {
        redirectByRole();
      }
    } catch {
      setError(
        "Identifiants incorrects. Vérifiez votre email et votre mot de passe.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!challengeToken || !otpCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await verifyTwoFactorCode(challengeToken, otpCode.trim());
      redirectByRole();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Code de vérification à 6 chiffres invalide.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (!challengeToken) return;
    setResending(true);
    setError(null);
    try {
      const msg = await resendTwoFactorEmail(challengeToken);
      setTwoFactorMessage(msg);
      setTwoFactorMethod("email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <Card className="w-full max-w-sm bg-neutral-900/70 p-7 shadow-2xl">
        {!challengeToken ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-sm font-black text-neutral-950">
                VA
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  VisuAlpes
                </h1>
                <p className="text-xs text-neutral-400">
                  Connexion Espace Client &amp; Atelier ERP
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
                Adresse email
                <Input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="nom@visualpes.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-2.5"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>Mot de passe</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-[11px] font-normal text-neutral-400 hover:text-neutral-200"
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-2.5"
                />
              </label>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-neutral-400 underline-offset-4 hover:text-white hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full py-2.5">
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">
                    Double authentification
                  </h1>
                  <p className="text-[11px] text-neutral-400">{email}</p>
                </div>
              </div>
              <Badge variant={twoFactorMethod === "totp" ? "purple" : "info"}>
                {twoFactorMethod === "totp" ? "App TOTP" : "Code Email"}
              </Badge>
            </div>

            {twoFactorMessage && (
              <p className="rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs leading-relaxed text-neutral-300">
                {twoFactorMessage}
              </p>
            )}

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Code de sécurité à 6 chiffres
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D+/g, "").slice(0, 6))
                }
                className="py-2.5 text-center font-mono text-lg tracking-[0.35em]"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-2.5"
            >
              {loading ? "Vérification…" : "Valider le code 2FA"}
            </Button>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setChallengeToken(null);
                  setError(null);
                }}
                className="text-neutral-400 hover:text-white"
              >
                ← Retour
              </button>
              <button
                type="button"
                disabled={resending}
                onClick={() => void handleResendEmailOtp()}
                className="text-sky-300 hover:underline disabled:opacity-50"
              >
                {resending ? "Envoi…" : "Recevoir un code par e-mail"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
