"use client";

import React, { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";
import { Mail, Lock } from "lucide-react";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import { SavoieBlason } from "@/components/common/SavoieBlason";
import { AlpineNightBackdrop } from "@/components/common/AlpineNightBackdrop";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nContext";

function ForgotPasswordContent() {
  const router = useRouter();
  const { t } = useI18n();
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
    <div className="relative min-h-screen w-full flex flex-col justify-between p-6 md:p-10 overflow-x-hidden text-[#F7F5EF]">
      <AlpineNightBackdrop />

      <header className="w-full flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <VisuAlpesLogo variant="dark" className="h-7 sm:h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher variant="pill" />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span>{t.common.backToLogin}</span>
          </Link>
        </div>
      </header>

      <main className="my-auto flex items-center justify-center py-8">
        <div className="w-full max-w-[430px] rounded-xl border border-white/10 bg-[#0B0B0E]/90 p-8 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="mb-6 flex flex-col items-center text-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t.forgotPassword.title}
            </h1>
            <p className="text-xs text-neutral-400">
              {t.forgotPassword.subtitle}
            </p>
          </div>

        {infoMessage && (
          <div className="mb-4 rounded-lg border border-[#C9A96B]/40 bg-[#C9A96B]/15 px-3 py-2 text-xs leading-relaxed text-[#DFCA9F]">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[#F7F5EF]">
                {t.forgotPassword.emailLabel}
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  type="email"
                  required
                  placeholder="nom@visualpes.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 py-2.5"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-2.5 text-xs uppercase tracking-wider font-semibold">
              {loading ? t.forgotPassword.sending : t.forgotPassword.sendCodeBtn}
            </Button>

            <div className="flex items-center justify-between border-t border-[#262624] pt-3 text-[11px]">
              <Link href="/login" className="text-[#8C8379] hover:text-[#F7F5EF] transition-colors">
                {t.common.backToLogin}
              </Link>
              <button
                type="button"
                onClick={() => setStep("reset")}
                className="text-[#C9A96B] hover:text-[#DFCA9F] hover:underline transition-colors"
              >
                {t.forgotPassword.haveCode}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[#F7F5EF]">
                {t.login.email}
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-[#F7F5EF]">
              {t.forgotPassword.codeLabel}
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
                className="text-center font-mono text-base tracking-[0.3em] text-[#C9A96B]"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-[#F7F5EF]">
                {t.forgotPassword.newPasswordLabel}
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || code.length < 6 || newPassword.length < 8}
              className="w-full py-2.5 text-xs uppercase tracking-wider font-semibold"
            >
              {loading ? t.forgotPassword.resetting : t.forgotPassword.resetBtn}
            </Button>

            <div className="flex items-center justify-between border-t border-[#262624] pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => setStep("request")}
                className="text-[#8C8379] hover:text-[#F7F5EF] transition-colors"
              >
                ← {t.forgotPassword.sendCodeBtn}
              </button>
              <Link href="/login" className="text-[#8C8379] hover:text-[#F7F5EF] transition-colors">
                {t.login.title}
              </Link>
            </div>
          </form>
        )}
        </div>
      </main>

      <footer className="w-full flex flex-col items-center gap-2 text-center text-xs text-neutral-500">
        <p>{t.common.copyright}</p>
        <div className="flex items-center gap-2 text-neutral-400">
          <SavoieBlason className="h-4 w-auto drop-shadow" />
          <span>{t.common.alpsLove}</span>
        </div>
      </footer>
    </div>
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

