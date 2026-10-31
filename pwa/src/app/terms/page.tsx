"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { VisuAlpesLogo } from "@/components/common/VisuAlpesLogo";
import { SavoieBlason } from "@/components/common/SavoieBlason";
import { AlpineNightBackdrop } from "@/components/common/AlpineNightBackdrop";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nContext";
import { termsData } from "@/lib/i18n/legalData";

export default function TermsOfServicePage() {
  const { locale, t } = useI18n();
  const data = termsData[locale] || termsData.fr;

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
            <Scale className="h-3.5 w-3.5 text-[#C9A96B]" />
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
          {data.sections.map((sec, idx) => (
            <section
              key={sec.num}
              className={`space-y-3 ${idx > 0 ? "pt-4 border-t border-white/10" : ""}`}
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A96B]/20 text-[#DFCA9F] text-xs font-black">
                  {sec.num}
                </span>
                <span>{sec.title}</span>
              </h2>

              {sec.paragraphs?.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}

              {sec.bullets && (
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-300">
                  {sec.bullets.map((b, bIdx) => (
                    <li key={bIdx}>
                      <strong>{b.title} </strong>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* LIENS DE NAVIGATION RAPIDE */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-[#DFCA9F] hover:underline"
          >
            <span>{data.linkToPrivacy}</span>
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
