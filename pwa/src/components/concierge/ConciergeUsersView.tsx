"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Crown,
  MoreHorizontal,
  Edit3,
  Trash2,
} from "lucide-react";
import { ConciergeAddButton } from "./ConciergeAddButton";
import type { ConciergeNavState } from "./types";
import { ALPINE_IMAGES } from "./types";
import type { UserItem, PropertyItem } from "@/types/erp";

interface ConciergeUsersViewProps {
  onNavigate: (state: ConciergeNavState) => void;
  teamMembers: UserItem[];
  properties: PropertyItem[];
  onInviteUser: () => void;
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (user: UserItem) => void;
}

export function ConciergeUsersView({
  onNavigate,
  teamMembers,
  onInviteUser,
  onEditUser,
  onDeleteUser,
}: ConciergeUsersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "owners" | "cohosts">("all");
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | number | null>(null);

  // Exact 5 members from Storyboard Screen 8
  const defaultMembers = [
    {
      id: "demo-user-1",
      numericId: 1001,
      email: "emma.dubois@chalet-cimes.fr",
      name: "Emma Dubois",
      role: "Propriétaire",
      isOwner: true,
      category: "owner",
      avatar: ALPINE_IMAGES.avatars.emma,
    },
    {
      id: "demo-user-2",
      numericId: 1002,
      email: "lucas.martin@conciergerie-alpes.fr",
      name: "Lucas Martin",
      role: "Co-hôte",
      isOwner: false,
      category: "cohost",
      avatar: ALPINE_IMAGES.avatars.lucas,
    },
    {
      id: "demo-user-3",
      numericId: 1003,
      email: "sophie.lambert@service-clean.fr",
      name: "Sophie Lambert",
      role: "Ménage",
      isOwner: false,
      category: "team",
      avatar: ALPINE_IMAGES.avatars.sophie,
    },
    {
      id: "demo-user-4",
      numericId: 1004,
      email: "thomas.renaud@technique-chalets.com",
      name: "Thomas Renaud",
      role: "Maintenance",
      isOwner: false,
      category: "team",
      avatar: ALPINE_IMAGES.avatars.thomas,
    },
    {
      id: "demo-user-5",
      numericId: 1005,
      email: "chloe.morel@invites-alpes.fr",
      name: "Chloé Morel",
      role: "Invité",
      isOwner: false,
      category: "guest",
      avatar: ALPINE_IMAGES.avatars.chloe,
    },
  ];

  // Merge any API members seamlessly without ID collisions
  const membersList = useMemo(() => {
    const list = [...defaultMembers];
    teamMembers.forEach((tm) => {
      if (!list.some((m) => m.email === tm.email || m.numericId === tm.id)) {
        list.push({
          id: `api-user-${tm.id}`,
          numericId: tm.id,
          email: tm.email,
          name: tm.email.split("@")[0].charAt(0).toUpperCase() + tm.email.split("@")[0].slice(1),
          role: tm.roles.includes("ROLE_ACCOUNT_ADMIN") ? "Propriétaire" : "Co-hôte",
          isOwner: tm.roles.includes("ROLE_ACCOUNT_ADMIN"),
          category: tm.roles.includes("ROLE_ACCOUNT_ADMIN") ? "owner" : "cohost",
          avatar: ALPINE_IMAGES.avatars.emma,
        });
      }
    });
    return list;
  }, [teamMembers]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return membersList.filter((m) => {
      if (selectedFilter === "owners" && m.category !== "owner") return false;
      if (selectedFilter === "cohosts" && m.category !== "cohost") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [membersList, selectedFilter, searchQuery]);

  return (
    <div className="space-y-3 pb-20 select-none">
      {/* Title & Amber-Gold Round (+) Button matching Screen 8 */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
            Utilisateurs
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1 font-normal leading-normal">
            {membersList.length} {membersList.length > 1 ? "utilisateurs au total" : "utilisateur au total"}
          </p>
        </div>

        {/* Harmonized Circular Amber/Gold (+) Button with Warm Glow */}
        <ConciergeAddButton
          onClick={onInviteUser}
          title="Inviter un utilisateur"
        />
      </div>

      {/* Search Input matching Screen 8 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none transition-colors peer-focus:text-[#DFB277]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="peer w-full bg-[#16161A] border border-white/[0.08] focus:border-[#DFB277]/50 focus:ring-2 focus:ring-[#DFB277]/15 rounded-xl pl-9 pr-4 py-2 text-[11px] text-white placeholder-[#8E8E93] focus:outline-none transition-all duration-200"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8E8E93] hover:text-white transition-colors"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Filter Pills matching Screen 8 ([ Tous (8) ] [ Propriétaires (2) ] [ Co-hôtes (2) ]) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setSelectedFilter("all")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
            selectedFilter === "all"
              ? "bg-[#DFB277] text-[#0A0A0C] font-semibold shadow-sm shadow-[#DFB277]/30"
              : "bg-[#16161A] text-[#8E8E93] border border-white/[0.06] hover:text-white hover:border-white/[0.15]"
          }`}
        >
          Tous (8)
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter("owners")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
            selectedFilter === "owners"
              ? "bg-[#DFB277] text-[#0A0A0C] font-semibold shadow-sm shadow-[#DFB277]/30"
              : "bg-[#16161A] text-[#8E8E93] border border-white/[0.06] hover:text-white hover:border-white/[0.15]"
          }`}
        >
          Propriétaires (2)
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter("cohosts")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
            selectedFilter === "cohosts"
              ? "bg-[#DFB277] text-[#0A0A0C] font-semibold shadow-sm shadow-[#DFB277]/30"
              : "bg-[#16161A] text-[#8E8E93] border border-white/[0.06] hover:text-white hover:border-white/[0.15]"
          }`}
        >
          Co-hôtes (2)
        </button>
      </div>

      {/* 5 User Cards matching Screen 8 */}
      <div className="grid grid-cols-1 gap-2 sm:gap-2.5 pt-1">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className="group flex items-center justify-between p-2.5 rounded-xl bg-[#16161A] border border-white/[0.07] hover:border-[#DFB277]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(223,178,119,0.08)] active:scale-[0.99] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Portrait Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 border border-[#DFB277]/30 shrink-0 group-hover:scale-105 group-hover:border-[#DFB277]/60 transition-all duration-300">
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white group-hover:text-[#F3C075] transition-colors duration-200 truncate">
                    {m.name}
                  </p>
                  {m.isOwner && (
                    <Crown className="w-3 h-3 text-[#DFB277] fill-[#DFB277] shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-[#8E8E93] group-hover:text-neutral-300 transition-colors duration-200 mt-0.5">
                  {m.role}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveMenuUserId(
                    activeMenuUserId === m.id ? null : m.id,
                  )
                }
                className="p-1 text-[#8E8E93] hover:text-white rounded-md cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {activeMenuUserId === m.id && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActiveMenuUserId(null)}
                  />
                  <div className="absolute right-0 top-7 z-50 w-36 rounded-xl bg-[#1D1D24] border border-white/[0.1] shadow-2xl p-1 text-[11px] text-neutral-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuUserId(null);
                        onEditUser({
                          "@id": `/api/users/${m.numericId}`,
                          id: m.numericId,
                          email: m.email,
                          roles: m.isOwner ? ["ROLE_ACCOUNT_ADMIN"] : ["ROLE_USER"],
                          account: "/api/accounts/1",
                        });
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.06] text-left"
                    >
                      <Edit3 className="w-3 h-3 text-[#DFB277]" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuUserId(null);
                        onDeleteUser({
                          "@id": `/api/users/${m.numericId}`,
                          id: m.numericId,
                          email: m.email,
                          roles: [],
                          account: "/api/accounts/1",
                        });
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-rose-500/10 text-rose-400 text-left"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
