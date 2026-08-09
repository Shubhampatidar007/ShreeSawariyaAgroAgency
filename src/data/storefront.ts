import type { Category, Product } from "@/types";

export const categories: Category[] = [
  { id: "general", name: "General stock", description: "Everyday essentials and replenishment items", itemCount: 0, emoji: "🛒" },
  { id: "seasonal", name: "Seasonal items", description: "Products that change with demand and seasonality", itemCount: 0, emoji: "🌦️" },
  { id: "services", name: "Services", description: "Support services and add-ons available through the shop", itemCount: 0, emoji: "🧾" },
];

export const featuredProducts: Product[] = [];

export const businessHighlights = [
  { title: "Flexible catalog", description: "Add products and services as your inventory grows.", emoji: "📦" },
  { title: "Clear stock tracking", description: "Keep quantity, pricing, and supplier details organized in one place.", emoji: "✅" },
  { title: "Simple communications", description: "Share updates with customers and staff without relying on fixed sample content.", emoji: "💬" },
  { title: "Custom storefront", description: "Present your brand and offers once real products are ready to publish.", emoji: "🪴" },
];

export const shopInfo = {
  name: "Shree Sawariya Agro Agncy",
  tagline: "Manage your store with your own catalog and details",
  phone: "9752469028",
  whatsapp: "9752469028",
  email: "Sunilpatidardev@gmail.com",
  address: "Sitamau , Near Hotel Aadarsh",
  hours: "8:30 AM - 8:00 PM",
};
