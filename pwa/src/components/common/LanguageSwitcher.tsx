"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Globe, Check, ChevronDown } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "dropdown" | "pill";
  className?: string;
}

export function LanguageSwitcher({
  variant = "pill",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown lors d'un clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open]);

  if (variant === "pill") {
    return (
      <div
        className={`inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs font-medium backdrop-blur-md transition-all ${className}`}
      >
        <button
          type="button"
          onClick={() => setLocale("fr")}
          title="Français"
          aria-label="Passer en français"
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            locale === "fr"
              ? "bg-[#C9A96B] text-[#0E0E0E] shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          FR
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          title="English"
          aria-label="Switch to English"
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            locale === "en"
              ? "bg-[#C9A96B] text-[#0E0E0E] shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Globe className="h-3.5 w-3.5 text-[#C9A96B]" />
        <span className="font-semibold uppercase">{locale}</span>
        <ChevronDown className="h-3 w-3 text-neutral-400 transition-transform duration-200" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-36 origin-top-right rounded-lg border border-white/10 bg-[#121215]/95 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setLocale("fr");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
              locale === "fr"
                ? "bg-[#C9A96B]/15 text-[#DFCA9F] font-semibold"
                : "text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">FR</span>
              <span>Français</span>
            </div>
            {locale === "fr" && <Check className="h-3.5 w-3.5 text-[#C9A96B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setLocale("en");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
              locale === "en"
                ? "bg-[#C9A96B]/15 text-[#DFCA9F] font-semibold"
                : "text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">EN</span>
              <span>English</span>
            </div>
            {locale === "en" && <Check className="h-3.5 w-3.5 text-[#C9A96B]" />}
          </button>
        </div>
      )}
    </div>
  );
}

