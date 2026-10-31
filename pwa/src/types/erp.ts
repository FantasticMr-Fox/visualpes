export type ErpTab =
  | "overview"
  | "orders"
  | "stocks"
  | "clients"
  | "properties"
  | "users"
  | "nfc"
  | "support";

export interface AccountSummary {
  "@id": string;
  id: number;
  name: string;
  type: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface NfcTagEmbedded {
  "@id": string;
  id: number;
  shortUid: string;
  status: "stock" | "encoded" | "assigned" | "defective";
  encodeAt?: string | null;
  zone?: string | null;
}

export interface OrderItem {
  "@id"?: string;
  id?: number;
  productName: string;
  quantity: number;
  nfcTags?: NfcTagEmbedded[];
}

export type StockCategory = "raw_material" | "pre_produced";
export type SupplierOrderStatus = "none" | "ordered";

export interface StockItemSummary {
  "@id": string;
  id: number;
  code: string;
  name: string;
  unit: string;
  type?: StockCategory;
  supplier?: string | null;
  supplierOrderStatus?: SupplierOrderStatus;
  supplierOrderQuantity?: number | null;
  supplierOrderedAt?: string | null;
}

export interface StockItem extends StockItemSummary {
  type: StockCategory;
  quantity: number;
  alertThreshold: number;
  reorderQuantity: number;
  updatedAt: string;
  supplier?: string | null;
  supplierOrderStatus?: SupplierOrderStatus;
  supplierOrderQuantity?: number | null;
  supplierOrderedAt?: string | null;
}

export type StockMovementType = "in" | "out" | "adjustment";

export interface StockMovement {
  "@id": string;
  id: number;
  stockItem: StockItem | string;
  type: StockMovementType;
  quantity: number;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Order {
  "@id": string;
  id: number;
  status: "pending" | "processing" | "quality_check" | "completed";
  createdAt: string;
  stockDeducted?: boolean;
  isStockOrder?: boolean;
  stockCredited?: boolean;
  targetStockItem?: StockItemSummary | null;
  account?: AccountSummary | string | null;
  workshopNotes?: string | null;
  trackingNumber?: string | null;
  storeReference?: string | null;
  orderItems?: OrderItem[];
}

export type UserRole =
  | "ROLE_ADMIN"
  | "ROLE_ATELIER"
  | "ROLE_ACCOUNT_ADMIN"
  | "ROLE_PROPERTY_ADMIN"
  | "ROLE_USER";

export interface UserItem {
  "@id": string;
  id: number;
  email: string;
  roles: string[];
  account: string;
  properties?: string[];
}

export const USER_ROLE_LABELS: Record<
  UserRole,
  { title: string; badge: string; desc: string; color: string }
> = {
  ROLE_ACCOUNT_ADMIN: {
    title: "Administrateur du compte",
    badge: "Admin Compte",
    desc: "Accès total au compte, gestion des utilisateurs et affectation des hébergements.",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  ROLE_PROPERTY_ADMIN: {
    title: "Administrateur de propriété",
    badge: "Admin Propriété",
    desc: "Gestion autonome des hébergements affectés (Wi-Fi, codes, consignes, signalétique).",
    color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  ROLE_USER: {
    title: "Simple utilisateur",
    badge: "Simple Utilisateur",
    desc: "Consultation et accès opérationnel aux hébergements affectés.",
    color: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  },
  ROLE_ADMIN: {
    title: "Administrateur Global VisuAlpes",
    badge: "Super Admin",
    desc: "Super-administrateur plateforme & atelier.",
    color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  ROLE_ATELIER: {
    title: "Artisan Atelier VisuAlpes",
    badge: "Atelier",
    desc: "Fabrication de signalétique, puces NFC et gestion des stocks matières.",
    color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
};

export interface ZoneItem {
  "@id": string;
  id: number;
  name: string;
  mountType?: string | null;
  property: string;
}

export interface PropertyItem {
  "@id": string;
  id: number;
  name: string;
  address?: string | null;
  resort?: string | null;
  typology?: string | null;
  capacity?: number | null;
  bedrooms?: number | null;
  keyBoxCode?: string | null;
  coverImageUrl?: string | null;
  externalGuideUrl?: string | null;
  instructions?: string | null;
  wifiSSID?: string | null;
  wifiSsidMasked?: string | null;
  wifiPassword?: string | null;
  wifiAccessCode?: string | null;
  wifiConfigured?: boolean;
  wifiProtectedByCode?: boolean;
  canManageWifi?: boolean;
  account: string;
  zones?: string[];
  assignedUsers?: string[];
}

export interface NfcTagItem {
  "@id": string;
  id: number;
  shortUid: string;
  status: "stock" | "encoded" | "assigned" | "defective";
  encodeAt?: string | null;
  zone?: string | null;
  orderItem?: string | null;
}

export type SupportIssueType =
  | "nfc_defect"
  | "wifi_issue"
  | "guide_update"
  | "billing"
  | "other";

export interface SupportTicketItem {
  "@id": string;
  id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  issueType?: SupportIssueType;
  isAiResolved?: boolean;
  aiDraft?: string | null;
  aiConfidence?: number | null;
  account: string;
  property?: string | null;
  nfcTag?: string | null;
}

export interface Supplier {
  "@id": string;
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  leadTimeDays?: number;
  notes?: string | null;
  createdAt?: string;
}

export interface SupplierOrderItem {
  "@id"?: string;
  id?: number;
  stockItem?: string | StockItem | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  totalPrice?: number;
}

export type SupplierOrderStatusType = "draft" | "sent" | "received" | "cancelled";

export interface SupplierOrder {
  "@id": string;
  id: number;
  reference: string;
  supplier: Supplier | string;
  status: SupplierOrderStatusType;
  notes?: string | null;
  expectedDeliveryDate?: string | null;
  createdAt: string;
  sentAt?: string | null;
  receivedAt?: string | null;
  items: SupplierOrderItem[];
  totalAmount: number;
  totalQuantity: number;
}

