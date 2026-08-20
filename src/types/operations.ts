import type { PaymentMethod } from "@/types/business";

export type OrderChannel = "online" | "offline";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "paid" | "partial" | "pending" | "refunded";
export type DeliveryStatus =
  | "not-required"
  | "scheduled"
  | "out-for-delivery"
  | "delivered"
  | "failed";
export type InvoiceStatus = "generated" | "draft" | "not-generated";

export type OrderLine = {
  id: string;
  product: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type OrderTimelineEvent = {
  id: string;
  label: string;
  at: string;
  note?: string | undefined;
};

export type Order = {
  id: string;
  code: string;
  channel: OrderChannel;
  customerId?: string | undefined;
  customerName: string;
  customerType: "registered" | "guest" | "walk-in";
  village: string;
  mobile: string;
  deliveryAddress?: string | undefined;
  pincode?: string | undefined;
  placedOn: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  orderStatus: OrderStatus;
  invoiceStatus: InvoiceStatus;
  remarks?: string | undefined;
  timeline: OrderTimelineEvent[];
};

export type PaymentDirection = "incoming" | "outgoing";

export type PaymentRecord = {
  id: string;
  reference: string;
  direction: PaymentDirection;
  partyId: string;
  partyName: string;
  date: string;
  amount: number;
  method: PaymentMethod | "card" | "online";
  status: "success" | "pending" | "failed";
  orderCode?: string | undefined;
  remarks?: string | undefined;
};

export type ReminderChannel = "sms" | "whatsapp" | "call" | "email";
export type ReminderSchedule = "immediate" | "daily" | "weekly" | "monthly" | "custom";

export type Reminder = {
  id: string;
  title: string;
  audience: string;
  target: "customer" | "supplier";
  filterSummary: string;
  schedule: ReminderSchedule;
  channel: ReminderChannel;
  dueAmount: number;
  status: "active" | "paused" | "completed";
  nextRun: string;
  message: string;
};

export type ReminderLog = {
  id: string;
  reminderTitle: string;
  recipient: string;
  channel: ReminderChannel;
  sentAt: string;
  delivery: "delivered" | "pending" | "failed";
  retries: number;
};

export type CmsSectionType =
  | "hero"
  | "poster"
  | "featured"
  | "categories"
  | "offers"
  | "announcement"
  | "marketing";

export type CmsSection = {
  id: string;
  name: string;
  type: CmsSectionType;
  enabled: boolean;
  visibility: "public" | "hidden";
  order: number;
  headline: string;
  body: string;
  scheduledFrom?: string | undefined;
  scheduledTo?: string | undefined;
  imageLabel: string;
};
