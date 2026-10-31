"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, UserCheck, EyeOff } from "lucide-react";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import { SavoieBlason } from "@/components/common/SavoieBlason";
import { AlpineNightBackdrop } from "@/components/common/AlpineNightBackdrop";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nContext";
import { privacyData } from "@/lib/i18n/legalData";

export default function PrivacyPolicyPage() {
  const { locale, t } = useI18n();
  const data = privacyData[locale] || privacyData.fr;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-6 md:p-12 text-[#F7F5EF] overflow-x-hidden">
      <AlpineNightBackdrop />

      {/* EN-TÊTE */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-8 border-b border-white/10">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <VisuAlpesLogo variant="dark" className="h-7 sm:h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="pill" />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#C9A96B]" />
            <span>{t.common.backToLogin}</span>
          </Link>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="w-full max-w-5xl mx-auto py-10">
        {/* Titre & Entête de document */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#C9A96B]/30 bg-[#C9A96B]/10 px-3.5 py-1 text-xs font-semibold text-[#DFCA9F] mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C9A96B]" />
            <span>{data.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {data.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {data.subtitle}
          </p>
        </div>

        {/* Bloc vitrine en verre teinté */}
        <div className="rounded-xl border border-white/10 bg-[#0B0B0E]/85 p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-neutral-300 text-sm leading-relaxed">
          {/* SECTION 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                01
              </span>
              <span>{data.s1Title}</span>
            </h2>
            <p>{data.s1Intro}</p>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs font-mono text-neutral-300 space-y-1">
              <div><strong>{data.s1Company}</strong></div>
              <div>{data.s1Address}</div>
              <div>{data.s1Dpo}</div>
            </div>
          </section>

          {/* SECTION 2 */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                02
              </span>
              <span>{data.s2Title}</span>
            </h2>
            <p>{data.s2Intro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="font-semibold text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#C9A96B]" />
                  <span>{data.s2Card1Title}</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {data.s2Card1Text}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#C9A96B]" />
                  <span>{data.s2Card2Title}</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {data.s2Card2Text}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3 */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                03
              </span>
              <span>{data.s3Title}</span>
            </h2>
            <div className="rounded-lg border border-[#C9A96B]/30 bg-[#C9A96B]/5 p-4 text-xs text-neutral-300 space-y-2">
              <p className="font-semibold text-[#DFCA9F] flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                <span>{data.s3BannerTitle}</span>
              </p>
              <p>{data.s3BannerP1}</p>
              <p>{data.s3BannerP2}</p>
            </div>
          </section>

          {/* SECTION 4 */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                04
              </span>
              <span>{data.s4Title}</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-300">
              {data.s4Bullets.map((b, idx) => (
                <li key={idx}>
                  <strong>{b.title} </strong>
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* SECTION 5 */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                05
              </span>
              <span>{data.s5Title}</span>
            </h2>
            <p>{data.s5P1}</p>
            <p>{data.s5P2}</p>
          </section>

          {/* SECTION 6 */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                06
              </span>
              <span>{data.s6Title}</span>
            </h2>
            <p>{data.s6Intro}</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-300">
              {data.s6Bullets.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
            <p className="pt-2 text-xs text-neutral-400">
              {data.s6Cnil}
            </p>
          </section>
        </div>

        {/* LIENS DE NAVIGATION RAPIDE */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <Link
            href="/terms"
            className="inline-flex items-center gap-1.5 text-[#DFCA9F] hover:underline"
          >
            <span>{data.linkToTerms}</span>
            <span>&rarr;</span>
          </Link>
          <Link
            href="/login"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            &larr; {data.backToLogin}
          </Link>
        </div>
      </main>

      {/* PIED DE PAGE */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-xs text-neutral-500">
        <p>{t.common.copyright}</p>
        <div className="flex items-center gap-2 text-neutral-300">
          <SavoieBlason className="h-4 w-auto drop-shadow" />
          <span>{t.common.alpsLove}</span>
        </div>
      </footer>
    </div>
  );
}
