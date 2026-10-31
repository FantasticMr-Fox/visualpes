"use client";

import React, { useState } from "react";
import {
  Pencil,
  MoreHorizontal,
  Plus,
  Wifi,
  BookOpen,
  Bell,
  Phone,
  Trash2,
} from "lucide-react";
import type { ConciergeNavState, EnrichedNfcTag } from "./types";
import { ALPINE_IMAGES } from "./types";
import type { PropertyItem, ZoneItem } from "@/types/erp";
import { ConciergeAddButton } from "./ConciergeAddButton";

interface ConciergeZoneDetailViewProps {
  property: PropertyItem;
  zone: ZoneItem;
  onNavigate: (state: ConciergeNavState) => void;
  onEditZone: (zone: ZoneItem) => void;
  onDeleteZone: (zone: ZoneItem) => void;
  onAddTag: (zoneId: number) => void;
}

export function ConciergeZoneDetailView({
  property,
  zone,
  onNavigate,
  onEditZone,
  onDeleteZone,
  onAddTag,
}: ConciergeZoneDetailViewProps) {
  const [showZoneMenu, setShowZoneMenu] = useState(false);

  // Exact 4 tags matching Storyboard Screen 4
  const displayTags = [
    {
      id: 1,
      title: "Tag #01",
      subtitle: "Wi-Fi",
      icon: Wifi,
    },
    {
      id: 2,
      title: "Tag #02",
      subtitle: "Guide du logement",
      icon: BookOpen,
    },
    {
      id: 3,
      title: "Tag #03",
      subtitle: "Services",
      icon: Bell,
    },
    {
      id: 4,
      title: "Tag #04",
      subtitle: "Contact conciergerie",
      icon: Phone,
    },
  ];

  return (
    <div className="space-y-3 pb-20 select-none">
      {/* Title & Edit/Options buttons */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
            {zone.name || "Salon"}
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
            4 tags NFC
          </p>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => onEditZone(zone)}
            className="w-8 h-8 rounded-lg bg-[#16161A] hover:bg-[#22222A] border border-white/[0.08] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Modifier la zone"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowZoneMenu((prev) => !prev)}
            className="w-8 h-8 rounded-lg bg-[#16161A] hover:bg-[#22222A] border border-white/[0.08] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Harmonized Circular Amber/Gold (+) Button with Warm Glow */}
          <ConciergeAddButton
            onClick={() => onAddTag(zone.id)}
            title="Ajouter un tag NFC"
          />

          {showZoneMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowZoneMenu(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-36 rounded-xl bg-[#1D1D24] border border-white/[0.1] shadow-2xl p-1 text-[11px] text-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneMenu(false);
                    onEditZone(zone);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] text-left text-neutral-200"
                >
                  Renommer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneMenu(false);
                    onDeleteZone(zone);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md hover:bg-rose-500/10 text-left text-rose-400"
                >
                  Supprimer la zone
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panoramic Room Hero Photo matching Screen 4 */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] h-36 bg-neutral-900 shadow">
        <img
          src="/storyboard/room_salon.png"
          alt={zone.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = ALPINE_IMAGES.roomSalon;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D10]/50 via-transparent to-black/20" />
      </div>

      {/* 4 Tag Cards matching Screen 4 */}
      <div className="grid grid-cols-1 gap-2 sm:gap-2.5 pt-1">
        {displayTags.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              onClick={() =>
                onNavigate({
                  type: "tag-detail",
                  propertyId: property.id,
                  zoneId: zone.id,
                  tagId: t.id,
                })
              }
              className="group flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Rounded square with teal/cyan tinted dark background and bright teal icon */}
                <div className="w-9 h-9 rounded-xl bg-[#092224] border border-[#115E59]/40 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#2DD4BF]/60 transition-all duration-300">
                  <Icon className="w-4 h-4 text-[#2DD4BF] transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200 truncate">
                    {t.title}
                  </h3>
                  <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200 mt-0.5 truncate">
                    {t.subtitle}
                  </p>
                </div>
              </div>

              {/* Green status badge: ● Actif */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A261C] border border-[#14533C] group-hover:border-[#10B981]/60 transition-colors duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse" />
                <span className="text-[10px] font-medium text-[#34D399]">
                  Actif
                </span>
              </div>
            </div>
          );
        })}

        {/* Outline Button: + Ajouter un tag */}
        <button
          type="button"
          onClick={() => onAddTag(zone.id)}
          className="group w-full py-2.5 px-4 rounded-xl border border-dashed border-[#5A482A] hover:border-[#DFB277] hover:bg-[#DFB277]/10 text-xs font-medium text-[#DFB277] flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.99] hover:shadow-[0_0_15px_rgba(223,178,119,0.15)] cursor-pointer mt-2"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.2] transition-transform duration-300 group-hover:rotate-90" />
          <span>Ajouter un tag</span>
        </button>
      </div>
    </div>
  );
}
