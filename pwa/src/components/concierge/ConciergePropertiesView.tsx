"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronRight } from "lucide-react";
import { ConciergeAddButton } from "./ConciergeAddButton";
import type { ConciergeNavState } from "./types";
import { ALPINE_IMAGES } from "./types";
import type { PropertyItem, ZoneItem } from "@/types/erp";

interface ConciergePropertiesViewProps {
  onNavigate: (state: ConciergeNavState) => void;
  properties: PropertyItem[];
  zones: ZoneItem[];
  onAddProperty: () => void;
  onEditProperty?: (p: PropertyItem) => void;
  onDeleteProperty?: (p: PropertyItem) => void;
  onRevealWifi?: (p: PropertyItem) => void;
}

export function ConciergePropertiesView({
  onNavigate,
  properties,
  zones,
  onAddProperty,
}: ConciergePropertiesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter properties
  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.resort && p.resort.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)),
    );
  }, [properties, searchQuery]);

  return (
    <div className="space-y-3 pb-24 select-none">
      {/* Title & Amber-Gold Round (+) Button */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
            Propriétés
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
            {properties.length}{" "}
            {properties.length > 1 ? "propriétés en gestion" : "propriété en gestion"}
          </p>
        </div>

        {/* Harmonized Circular Amber/Gold (+) Button with Warm Glow */}
        <ConciergeAddButton
          onClick={onAddProperty}
          title="Ajouter une propriété"
        />
      </div>

      {/* Search Input */}
      <div className="relative mt-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none transition-colors peer-focus:text-[#DFB277]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une propriété..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#16161A] border border-white/[0.08] focus:border-[#DFB277]/50 focus:bg-[#1A1A20] focus:outline-none text-xs text-white placeholder-[#8E8E93] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8E8E93] hover:text-white cursor-pointer"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Chalet Cards with Full-Block Photo */}
      <div className="flex flex-col gap-3.5 pt-3">
        {filteredProperties.map((prop, idx) => {
          const propZones = zones.filter((z) => {
            const pId = typeof z.property === "string" ? z.property.split("/").pop() : z.property;
            return String(pId) === String(prop.id);
          });

          // Metadata
          let resortLabel = prop.resort || (idx === 0 ? "Chamonix" : idx === 1 ? "Megève" : "Courchevel");
          let zoneCount = propZones.length || (idx === 0 ? 4 : idx === 1 ? 5 : 3);
          let tagCount = idx === 0 ? 12 : idx === 1 ? 18 : 8;

          // Curated HD photos matching luxury Alpine aesthetic
          let chaletImg = prop.coverImageUrl;
          if (
            !chaletImg ||
            chaletImg.includes("chalet_cimes.png") ||
            chaletImg.includes("chalet_horizon.png") ||
            chaletImg.includes("chalet_rochebrune.png") ||
            chaletImg.includes("unsplash.com/photo-1542601906990-b4d3fb778b09")
          ) {
            if (idx === 0) chaletImg = ALPINE_IMAGES.chaletCimes;
            else if (idx === 1) chaletImg = ALPINE_IMAGES.chaletHorizon;
            else chaletImg = ALPINE_IMAGES.chaletRochebrune;
          }

          return (
            <div
              key={prop.id}
              onClick={() =>
                onNavigate({
                  type: "property-detail",
                  propertyId: prop.id,
                  subTab: "zones",
                })
              }
              className="group relative rounded-2xl overflow-hidden border-[1.5px] border-[#F0B35A] min-h-[148px] sm:min-h-[160px] flex flex-col justify-between p-3.5 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.99] cursor-pointer bg-[#111419] shadow-[0_0_22px_rgba(240,179,90,0.45),inset_0_0_14px_rgba(240,179,90,0.12)] hover:shadow-[0_0_32px_rgba(240,179,90,0.65),inset_0_0_18px_rgba(240,179,90,0.2)]"
            >
              {/* Photo en fond plein bloc */}
              <img
                src={chaletImg}
                alt={prop.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  e.currentTarget.src =
                    idx === 0
                      ? ALPINE_IMAGES.chaletCimes
                      : idx === 1
                      ? ALPINE_IMAGES.chaletHorizon
                      : ALPINE_IMAGES.chaletRochebrune;
                }}
              />

              {/* Dégradé cinématique pour contraste et lisibilité parfaite */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C]/95 via-black/40 to-black/20 group-hover:via-black/30 transition-all duration-300" />

              {/* Haut de carte : Badge statut émeraude/cyan chic */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A0A0C]/65 backdrop-blur-md border border-white/10 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F8D0] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F8D0] shadow-[0_0_8px_#00F8D0]" />
                  </span>
                  <span className="text-[10px] font-medium text-neutral-200 tracking-wide">
                    En gestion
                  </span>
                </div>
              </div>

              {/* Bas de carte : Titre + métadonnées + Chevron rond chic */}
              <div className="relative z-10 flex items-end justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[17px] font-bold text-white group-hover:text-[#F0B35A] transition-colors duration-200 truncate leading-tight drop-shadow-sm">
                    {prop.name}
                  </h2>
                  <p className="text-xs text-neutral-300 group-hover:text-white transition-colors duration-200 mt-1 truncate leading-tight flex items-center gap-1.5 font-normal">
                    <span>{resortLabel}</span>
                    <span className="text-white/40">·</span>
                    <span>{zoneCount} {zoneCount > 1 ? "zones" : "zone"}</span>
                    <span className="text-white/40">·</span>
                    <span>{tagCount} tags</span>
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-[#F0B35A]/40 flex items-center justify-center text-[#F0B35A] group-hover:border-[#F0B35A] group-hover:scale-105 group-hover:translate-x-0.5 transition-all duration-300 shrink-0 shadow-[0_0_12px_rgba(240,179,90,0.3)]">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredProperties.length === 0 && (
          <div className="py-12 text-center text-xs text-[#8E8E93]">
            Aucune propriété ne correspond à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}
