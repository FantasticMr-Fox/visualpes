"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Home, Users, Settings, ChevronRight } from "lucide-react";
import type { ConciergeNavState } from "./types";
import { ConciergeBellIcon } from "./ConciergeBellIcon";
import type { PropertyItem, ZoneItem, UserItem } from "@/types/erp";

interface ConciergeHomeViewProps {
  onNavigate: (state: ConciergeNavState) => void;
  properties: PropertyItem[];
  zones: ZoneItem[];
  teamMembers: UserItem[];
  nfcTagsCount: number;
}

/** 1u = 1px de la maquette (312px de large), mis à l'échelle selon l'écran. */
const u = (n: number) => `calc(var(--u) * ${n})`;

export function ConciergeHomeView({
  onNavigate,
  properties,
  teamMembers,
}: ConciergeHomeViewProps) {
  const propertyCount = properties.length;
  const userCount = teamMembers.length;

  const [activeIdx, setActiveIdx] = useState(0);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const measure = useCallback(() => {
    const el = itemRefs.current[activeIdx];
    if (!el) return;
    setIndicator({ top: el.offsetTop, height: el.offsetHeight, ready: true });
  }, [activeIdx]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure]);

  const cards = [
    {
      key: "properties",
      title: "Propriétés",
      subtitle: `${propertyCount} ${propertyCount > 1 ? "propriétés" : "propriété"}`,
      icon: Home,
      target: { type: "properties" } as ConciergeNavState,
    },
    {
      key: "users",
      title: "Utilisateurs",
      subtitle: `${userCount} ${userCount > 1 ? "utilisateurs" : "utilisateur"}`,
      icon: Users,
      target: { type: "users" } as ConciergeNavState,
    },
    {
      key: "settings",
      title: "Paramètres",
      subtitle: "Configuration",
      icon: Settings,
      target: { type: "settings" } as ConciergeNavState,
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0C] select-none">
      {/* Photo alpine plein cadre (touche le haut de l'écran, sans aucun gap), fondue vers le noir */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: u(360) }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: "url('/storyboard/home-hero.jpg'), url('/alpes-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C]/40 via-transparent to-[#0A0A0C]" />
      </div>

      <div
        className="relative z-10 mx-auto"
        style={{
          width: u(312),
          maxWidth: "100%",
          paddingTop: u(74),
          paddingBottom: u(110),
        }}
      >
        {/* Titre + sous-titre */}
        <div style={{ marginLeft: u(20), marginRight: u(20) }}>
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
            Conciergerie
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
            Gérez vos propriétés, tags et utilisateurs depuis un seul espace.
          </p>
        </div>

        {/* Cloche + trait de liaison (centré sur la colonne des cartes) */}
        <div
          className="flex flex-col items-center"
          style={{ marginTop: u(53), marginLeft: u(20), marginRight: u(20) }}
        >
          <div
            className="group flex cursor-pointer items-center justify-center rounded-full border-[#F0B35A] bg-[#0A0A0C]/55 text-[#F5C070] backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-[0_0_36px_rgba(240,179,90,0.7)]"
            style={{
              width: u(64),
              height: u(64),
              borderWidth: u(2),
              boxShadow:
                "0 0 28px rgba(240,179,90,0.55), inset 0 0 14px rgba(240,179,90,0.25)",
            }}
          >
            <ConciergeBellIcon
              className="drop-shadow-[0_0_6px_rgba(245,192,112,0.8)] transition-transform duration-300 group-hover:-translate-y-0.5"
              style={{ width: u(32), height: u(32) }}
            />
          </div>
          <div
            className="relative bg-gradient-to-b from-[#F0B35A] to-[#F0B35A]/70"
            style={{ width: 1, height: u(23) }}
          >
            <span
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#F0B35A] shadow-[0_0_8px_#F0B35A]"
              style={{ width: u(6), height: u(6), bottom: u(-3) }}
            />
          </div>
        </div>

        {/* Cartes : le contour doré glisse vers le bloc survolé */}
        <div
          ref={listRef}
          className="relative flex flex-col"
          style={{ gap: u(8), marginLeft: u(20), marginRight: u(20) }}
          onMouseLeave={() => setActiveIdx(0)}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-[#F0B35A]"
            style={{
              top: indicator.top,
              height: indicator.height,
              borderRadius: u(12),
              borderWidth: u(1.5),
              opacity: indicator.ready ? 1 : 0,
              boxShadow:
                "0 0 22px rgba(240,179,90,0.45), inset 0 0 14px rgba(240,179,90,0.12)",
              transition:
                "top 520ms cubic-bezier(0.34, 1.4, 0.64, 1), height 520ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 200ms",
            }}
          >
            <span
              className="absolute inset-0 animate-pulse"
              style={{
                borderRadius: u(12),
                boxShadow: "0 0 30px rgba(240,179,90,0.25)",
              }}
            />
          </div>

          {cards.map((card, i) => {
            const Icon = card.icon;
            const active = activeIdx === i;
            return (
              <button
                key={card.key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                onClick={() => onNavigate(card.target)}
                onMouseEnter={() => setActiveIdx(i)}
                onFocus={() => setActiveIdx(i)}
                onBlur={() => setActiveIdx(0)}
                className={`group flex w-full cursor-pointer items-center border border-white/[0.09] text-left transition-all duration-300 active:scale-[0.99] ${
                  active ? "bg-[#17130C]/90" : "bg-[#0F0F12]/90 hover:bg-[#15120E]/80"
                }`}
                style={{
                  height: u(56),
                  borderRadius: u(12),
                  paddingLeft: u(19),
                  paddingRight: u(14),
                }}
              >
                <Icon
                  className="shrink-0 text-[#F0B35A] transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.6}
                  style={{ width: u(26), height: u(26) }}
                />
                <div style={{ marginLeft: u(26) }} className="flex-1">
                  <p
                    className="font-semibold text-white transition-colors duration-200 group-hover:text-[#F0B35A]"
                    style={{ fontSize: u(13), lineHeight: u(16) }}
                  >
                    {card.title}
                  </p>
                  <p
                    className="text-neutral-300 transition-colors duration-200 group-hover:text-neutral-100"
                    style={{ fontSize: u(11.5), lineHeight: u(15), marginTop: u(2) }}
                  >
                    {card.subtitle}
                  </p>
                </div>
                <ChevronRight
                  className={`shrink-0 text-white transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#F0B35A] ${
                    active ? "translate-x-1 text-[#F0B35A]" : ""
                  }`}
                  strokeWidth={2}
                  style={{ width: u(15), height: u(15) }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
