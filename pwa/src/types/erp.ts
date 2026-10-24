export type ErpTab = "orders" | "stocks" | "clients" | "nfc" | "support";

export interface AccountSummary {
  "@id": string;
  id: number;
  name: string;
  type: string;
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

export interface StockItemSummary {
  "@id": string;
  id: number;
  code: string;
  name: string;
  unit: string;
}

export interface StockItem extends StockItemSummary {
  quantity: number;
  alertThreshold: number;
  reorderQuantity: number;
  updatedAt: string;
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
  orderItems?: OrderItem[];
}

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
  externalGuideUrl?: string | null;
  instructions?: string | null;
  wifiSSID?: string | null;
  wifiPassword?: string | null;
  account: string;
  zones?: string[];
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

export interface SupportTicketItem {
  "@id": string;
  id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  aiDraft?: string | null;
  aiConfidence?: number | null;
  account: string;
}
