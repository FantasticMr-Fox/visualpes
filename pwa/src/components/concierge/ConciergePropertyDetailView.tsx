"use client";

import React, { useState } from "react";
import {
  Plus,
  ChevronRight,
  Crown,
  MoreHorizontal,
  FileText,
  Sliders,
  Lock,
  Plug,
  Trash2,
  LayoutGrid,
  Users,
  Settings,
} from "lucide-react";
import type { ConciergeNavState, PropertySubTab } from "./types";
import { ALPINE_IMAGES } from "./types";
import type { PropertyItem, ZoneItem, UserItem } from "@/types/erp";
import { ConciergeAddButton } from "./ConciergeAddButton";

interface ConciergePropertyDetailViewProps {
  property: PropertyItem;
  zones: ZoneItem[];
  allTeamMembers: UserItem[];
  subTab: PropertySubTab;
  onNavigate: (state: ConciergeNavState) => void;
  onAddZone: () => void;
  onEditZone: (zone: ZoneItem) => void;
  onInviteUser: () => void;
  onEditProperty: (p: PropertyItem) => void;
  onDeleteProperty: (p: PropertyItem) => void;
  onRevealWifi: (p: PropertyItem) => void;
}

export function ConciergePropertyDetailView({
  property,
  zones,
  subTab,
  onNavigate,
  onAddZone,
  onInviteUser,
  onEditProperty,
  onDeleteProperty,
  onRevealWifi,
}: ConciergePropertyDetailViewProps) {
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | number | null>(null);

  // Filter zones belonging to this property
  const propZones = zones.filter((z) => {
    const pId = typeof z.property === "string" ? z.property.split("/").pop() : z.property;
    return String(pId) === String(property.id);
  });

  // Curated room items matching Screen 3
  const defaultRooms = [
    { id: 1001, name: "Salon", tags: "4 tags", img: "/storyboard/room_salon.png", fallback: ALPINE_IMAGES.roomSalon },
    { id: 1002, name: "Cuisine", tags: "3 tags", img: ALPINE_IMAGES.roomCuisine, fallback: ALPINE_IMAGES.roomCuisine },
    { id: 1003, name: "Chambres", tags: "3 tags", img: ALPINE_IMAGES.roomChambres, fallback: ALPINE_IMAGES.roomChambres },
    { id: 1004, name: "Extérieur", tags: "2 tags", img: ALPINE_IMAGES.roomExterieur, fallback: ALPINE_IMAGES.roomExterieur },
  ];

  // Curated 5 members matching Screen 6
  const defaultMembers = [
    { id: "prop-member-1", numericId: 1001, name: "Emma Dubois", role: "Propriétaire", isOwner: true, avatar: ALPINE_IMAGES.avatars.emma },
    { id: "prop-member-2", numericId: 1002, name: "Lucas Martin", role: "Co-hôte", isOwner: false, avatar: ALPINE_IMAGES.avatars.lucas },
    { id: "prop-member-3", numericId: 1003, name: "Sophie Lambert", role: "Ménage", isOwner: false, avatar: ALPINE_IMAGES.avatars.sophie },
    { id: "prop-member-4", numericId: 1004, name: "Thomas Renaud", role: "Maintenance", isOwner: false, avatar: ALPINE_IMAGES.avatars.thomas },
    { id: "prop-member-5", numericId: 1005, name: "Chloé Morel", role: "Invité", isOwner: false, avatar: ALPINE_IMAGES.avatars.chloe },
  ];

  const chaletCover = property.coverImageUrl || ALPINE_IMAGES.chaletCimes;

  return (
    <div className="space-y-3.5 pb-20 select-none">
      {/* Property Title & Right Landscape Thumbnail (Screen 3) */}
      <div className="flex items-center justify-between pt-1 gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight truncate">
            {property.name || "Les Cimes"}
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal truncate">
            {property.resort || "Chamonix"}
          </p>
        </div>

        {/* Small Landscape Thumbnail */}
        <div className="w-16 h-11 rounded-xl overflow-hidden border border-white/[0.1] shrink-0 bg-neutral-900 shadow">
          <img
            src={chaletCover}
            alt={property.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = ALPINE_IMAGES.chaletCimes;
            }}
          />
        </div>
      </div>

      {/* 3-Tab Segmented Control ([ Zones ] [ Utilisateurs ] [ Paramètres ]) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#16161A] border border-white/[0.06]">
        <button
          type="button"
          onClick={() =>
            onNavigate({
              type: "property-detail",
              propertyId: property.id,
              subTab: "zones",
            })
          }
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer ${
            subTab === "zones"
              ? "bg-[#1E1912] text-[#DFB277] border border-[#DFB277] shadow-sm shadow-[#DFB277]/20"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3 h-3" />
          <span>Zones</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigate({
              type: "property-detail",
              propertyId: property.id,
              subTab: "users",
            })
          }
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer ${
            subTab === "users"
              ? "bg-[#1E1912] text-[#DFB277] border border-[#DFB277] shadow-sm shadow-[#DFB277]/20"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Utilisateurs</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigate({
              type: "property-detail",
              propertyId: property.id,
              subTab: "settings",
            })
          }
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer ${
            subTab === "settings"
              ? "bg-[#1E1912] text-[#DFB277] border border-[#DFB277] shadow-sm shadow-[#DFB277]/20"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          <Settings className="w-3 h-3" />
          <span>Paramètres</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ZONES (Storyboard Screen 3)                             */}
      {/* ============================================================== */}
      {subTab === "zones" && (
        <div className="space-y-2.5">
          {/* Subheader: 4 zones • 12 tags + Harmonized Round Amber (+) button */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-[#8E8E93] font-medium">
              4 zones • 12 tags
            </span>
            <ConciergeAddButton
              onClick={onAddZone}
              title="Ajouter une zone"
            />
          </div>

          {/* Rooms List matching Storyboard Screen 3 */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {defaultRooms.map((room) => (
              <div
                key={room.id}
                onClick={() =>
                  onNavigate({
                    type: "zone-detail",
                    propertyId: property.id,
                    zoneId: room.id,
                  })
                }
                className="group flex items-center justify-between p-2.5 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Room Thumbnail Photo */}
                  <div className="w-14 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] shrink-0 group-hover:scale-105 group-hover:border-[#DFB277]/40 transition-all duration-300">
                    <img
                      src={room.img}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = room.fallback;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200 truncate">
                      {room.name}
                    </h2>
                    <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200 mt-0.5">
                      {room.tags}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: UTILISATEURS (Storyboard Screen 6)                      */}
      {/* ============================================================== */}
      {subTab === "users" && (
        <div className="space-y-2.5">
          {/* Subheader: 5 utilisateurs + Harmonized Round Amber (+) button */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-[#8E8E93] font-medium">
              5 utilisateurs
            </span>
            <ConciergeAddButton
              onClick={onInviteUser}
              title="Inviter un utilisateur"
            />
          </div>

          {/* Members List matching Screen 6 */}
          <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
            {defaultMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#16161A] border border-white/[0.07] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Portrait Avatar Photo */}
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 border border-[#DFB277]/30 shrink-0">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">
                        {m.name}
                      </p>
                      {m.isOwner && (
                        <Crown className="w-3 h-3 text-[#DFB277] fill-[#DFB277] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">
                      {m.role}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenuMemberId(
                        activeMenuMemberId === m.id ? null : m.id,
                      )
                    }
                    className="p-1 text-[#8E8E93] hover:text-white rounded-md cursor-pointer"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {activeMenuMemberId === m.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setActiveMenuMemberId(null)}
                      />
                      <div className="absolute right-0 top-7 z-50 w-36 rounded-xl bg-[#1D1D24] border border-white/[0.1] shadow-2xl p-1 text-[11px] text-neutral-200">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuMemberId(null);
                            onInviteUser();
                          }}
                          className="w-full px-2 py-1 rounded-md hover:bg-white/[0.06] text-left"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenuMemberId(null)}
                          className="w-full px-2 py-1 rounded-md hover:bg-rose-500/10 text-left text-rose-400"
                        >
                          Retirer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Button: + Inviter un utilisateur */}
          <button
            type="button"
            onClick={onInviteUser}
            className="group w-full py-2.5 px-4 rounded-xl border border-dashed border-[#5A482A] hover:border-[#DFB277] hover:bg-[#DFB277]/10 text-xs font-medium text-[#DFB277] flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.99] hover:shadow-[0_0_15px_rgba(223,178,119,0.15)] cursor-pointer mt-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2] transition-transform duration-300 group-hover:rotate-90" />
            <span>Inviter un utilisateur</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PARAMÈTRES (Storyboard Screen 7)                        */}
      {/* ============================================================== */}
      {subTab === "settings" && (
        <div className="space-y-3">
          {/* Header Title */}
          <div>
            <h2 className="text-sm font-bold text-white">Paramètres</h2>
            <p className="text-[10px] text-[#8E8E93]">Configuration de la propriété</p>
          </div>

          {/* Panoramic Chalet Photo Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] h-28 bg-neutral-900 shadow">
            <img
              src="/storyboard/chalet_cimes.png"
              alt={property.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = ALPINE_IMAGES.chaletCimes;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D10]/60 via-transparent to-black/20" />
          </div>

          {/* 5 Rows matching Screen 7 */}
          <div className="space-y-1.5">
            {/* 1. Informations générales */}
            <button
              type="button"
              onClick={() => onEditProperty(property)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1E1E24] border border-white/[0.06] hover:border-[#DFB277]/40 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#DFB277] transition-colors">
                    Informations générales
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">
                    Nom, adresse, photos...
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 2. Personnalisation */}
            <button
              type="button"
              onClick={() => onEditProperty(property)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1E1E24] border border-white/[0.06] hover:border-[#DFB277]/40 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#DFB277] transition-colors">
                    Personnalisation
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">
                    Couleurs, logo, page client...
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 3. Accès et sécurité */}
            <button
              type="button"
              onClick={() => onRevealWifi(property)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1E1E24] border border-white/[0.06] hover:border-[#DFB277]/40 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#DFB277] transition-colors">
                    Accès et sécurité
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">
                    Gestion des accès
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 4. Intégrations */}
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#16161A] hover:bg-[#1E1E24] border border-white/[0.06] hover:border-[#DFB277]/40 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Plug className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#DFB277] transition-colors">
                    Intégrations
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">
                    Outils tiers, API...
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6E6E73] group-hover:text-[#DFB277] group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 5. Supprimer la propriété */}
            <button
              type="button"
              onClick={() => onDeleteProperty(property)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1416]/50 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/40 transition-all text-left cursor-pointer group mt-2"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-rose-400 group-hover:text-rose-300 transition-colors">
                    Supprimer la propriété
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
