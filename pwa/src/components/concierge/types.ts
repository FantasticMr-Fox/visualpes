import type { AccountSummary, PropertyItem, ZoneItem, UserItem } from "@/types/erp";

export type ConciergeScreenType =
  | "home"
  | "properties"
  | "property-detail"
  | "zone-detail"
  | "tag-detail"
  | "users"
  | "settings";

export type PropertySubTab = "zones" | "users" | "settings";

export interface ConciergeNavState {
  type: ConciergeScreenType;
  propertyId?: number;
  subTab?: PropertySubTab;
  zoneId?: number;
  tagId?: number;
}

export interface EnrichedNfcTag {
  id: number;
  shortUid: string;
  status: "stock" | "encoded" | "assigned" | "defective";
  title: string;
  subtitle: string;
  tagType: "wifi" | "guide" | "services" | "contact" | "custom";
  zoneId?: number | null;
  zoneName?: string | null;
  propertyId?: number | null;
  propertyName?: string | null;
  readsCount?: number;
}

export type ConciergeUserRole =
  | "owner"
  | "cohost"
  | "cleaning"
  | "maintenance"
  | "guest"
  | "admin";

export interface EnrichedUserItem {
  id: number;
  email: string;
  displayName: string;
  roleType: ConciergeUserRole;
  roleLabel: string;
  roles: string[];
  isOwner?: boolean;
  avatarUrl?: string;
  properties?: string[];
  account: string;
}

// 100% Exact High-Resolution Photographic Assets matching Storyboard
export const ALPINE_IMAGES = {
  heroMountains:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",

  // Chalets matching Screen 2 (Haute résolution locale 1200x675)
  chaletCimes: "/storyboard/chalet_cimes_hd.jpg",
  chaletHorizon: "/storyboard/chalet_horizon_hd.jpg",
  chaletRochebrune: "/storyboard/chalet_rochebrune_hd.jpg",
  chalets: [
    "/storyboard/chalet_cimes_hd.jpg",
    "/storyboard/chalet_horizon_hd.jpg",
    "/storyboard/chalet_rochebrune_hd.jpg",
  ],

  // Rooms matching Screen 3 & Screen 4
  roomSalon:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  roomCuisine:
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
  roomChambres:
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
  roomExterieur:
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",

  // User portrait avatars matching Screen 6 & Screen 8
  avatars: {
    emma: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    lucas: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    sophie: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    thomas: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    chloe: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
};
