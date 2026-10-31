"use client";

import React, { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTokenRoles,
  login,
  resendTwoFactorEmail,
  verifyTwoFactorCode,
} from "@/lib/api";
import { Badge, Input } from "@/components/ui";
import { ShieldCheck, ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import { SavoieBlason } from "@/components/common/SavoieBlason";
import { AlpineNightBackdrop } from "@/components/common/AlpineNightBackdrop";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
    router.replace(roles.includes("ROLE_ADMIN") ? "/va-admin" : "/");
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
    <div className="relative min-h-screen w-full flex flex-col justify-between p-6 md:p-10 overflow-x-hidden text-[#F7F5EF]">
      {/* Ciel nocturne et silhouette de massifs alpins */}
      <AlpineNightBackdrop />

      {/* EN-TÊTE : Logo à gauche + Menu Langue & Bouton d'action à droite */}
      <header className="w-full flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <VisuAlpesLogo variant="dark" className="h-7 sm:h-8 w-auto" />
        </Link>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher variant="pill" />

          <Link
            href="/va-admin/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span>{t.common.atelierAccess}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#C9A96B]" />
          </Link>
        </div>
      </header>

      {/* CARTE CENTRALE AVEC BORDURE HALO DORÉ ANIMÉE */}
      <main className="my-auto flex items-center justify-center py-8">
        <div className="relative w-full max-w-[430px] rounded-xl p-[1.5px] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)]">
          {/* Faisceau lumineux doré en rotation continue (halo qui fait le tour de la bordure) */}
          <div
            className="absolute inset-[-150%] animate-border-beam"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, rgba(201,169,107,0.2) 300deg, #DFCA9F 335deg, #C9A96B 355deg, transparent 360deg)",
            }}
          />
          {/* Lueur diffuse d'ambiance dorée derrière le halo */}
          <div
            className="absolute inset-[-150%] animate-border-beam blur-md opacity-70"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 280deg, #C9A96B 330deg, #DFCA9F 355deg, transparent 360deg)",
            }}
          />

          {/* Intérieur de la carte glassmorphic */}
          <div className="relative h-full w-full rounded-[10.5px] border border-white/10 bg-[#0B0B0E]/95 p-8 sm:p-9 backdrop-blur-2xl">
          {!challengeToken ? (
            <div>
              <div className="mb-7">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {t.login.title}
                </h1>
                <p className="mt-2 text-xs text-neutral-400">
                  {t.login.clientSubtitle}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">
                    {t.login.email}
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      type="email"
                      required
                      autoComplete="username"
                      placeholder={t.login.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#131316] pl-10 pr-3.5 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:border-[#C9A96B] focus:outline-none focus:ring-1 focus:ring-[#C9A96B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">
                    {t.login.password}
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder={t.login.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#131316] pl-10 pr-10 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:border-[#C9A96B] focus:outline-none focus:ring-1 focus:ring-[#C9A96B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 transition-colors hover:text-white focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* LIGNE SWITCH "SE SOUVENIR DE MOI" + "MOT DE PASSE OUBLIÉ" */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-neutral-300 hover:text-white transition-colors">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rememberMe ? "bg-[#C9A96B]" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rememberMe ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span>{t.login.rememberMe}</span>
                  </label>

                  <Link
                    href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                    className="text-xs text-neutral-400 hover:text-[#C9A96B] transition-colors"
                  >
                    {t.login.forgotPassword}
                  </Link>
                </div>

                {/* BOUTON D'ACTION PRINCIPAL DORÉ */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#C9A96B] py-3.5 text-sm font-semibold text-[#0B0B0D] shadow-[0_4px_20px_rgba(201,169,107,0.25)] transition duration-200 hover:bg-[#D4B577] hover:shadow-[0_4px_25px_rgba(201,169,107,0.4)] disabled:opacity-50"
                >
                  {loading ? t.login.submittingClient : t.login.submitClient}
                </button>
              </form>

              {/* MENTIONS LÉGALES & CONDITIONS */}
              <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-500">
                {t.login.legalPrefix}{" "}
                <Link
                  href="/terms"
                  className="text-neutral-400 hover:text-[#DFCA9F] underline underline-offset-2 transition-colors"
                >
                  {t.login.terms}
                </Link>
                <br />
                {t.login.and}{" "}
                <Link
                  href="/privacy"
                  className="text-neutral-400 hover:text-[#DFCA9F] underline underline-offset-2 transition-colors"
                >
                  {t.login.privacy}
                </Link>.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#C9A96B]/15 text-[#DFCA9F] mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {t.twoFactor.titleClient}
                </h1>
                <p className="mt-1.5 text-xs text-neutral-400">
                  {twoFactorMessage || t.twoFactor.defaultMessage}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="border-[#C9A96B]/40 text-[#DFCA9F]">
                    {twoFactorMethod === "totp"
                      ? t.twoFactor.totpBadge
                      : t.twoFactor.emailBadge}
                  </Badge>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFCA9F]">
                    {t.twoFactor.otpLabel}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="mt-1.5 w-full text-center font-mono text-2xl tracking-[0.4em] bg-[#141417] border-white/10 text-white rounded-lg py-3 focus:border-[#C9A96B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full rounded-lg bg-[#C9A96B] py-3.5 text-sm font-semibold text-[#0B0B0D] shadow-[0_4px_20px_rgba(201,169,107,0.25)] transition duration-200 hover:bg-[#D4B577] hover:shadow-[0_4px_25px_rgba(201,169,107,0.4)] disabled:opacity-50"
                >
                  {loading ? t.twoFactor.verifying : t.twoFactor.confirmClient}
                </button>

                {twoFactorMethod === "email" && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendEmailOtp}
                      className="text-xs text-neutral-400 hover:text-[#C9A96B] transition-colors disabled:opacity-50"
                    >
                      {resending ? t.twoFactor.resending : t.twoFactor.resendEmail}
                    </button>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setChallengeToken(null);
                      setOtpCode("");
                      setError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    {t.common.backToPassword}
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* PIED DE PAGE : Copyright & Blason de la Savoie */}
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
