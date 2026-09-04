import type { Category, Product } from "@/types";

export const categories: Category[] = [
  {
    id: "general",
    name: "Farm Essentials",
    description: "Essential agricultural products and everyday farm-use items",
    itemCount: 0,
    emoji: "🛒",
  },
  {
    id: "seasonal",
    name: "Seasonal items",
    description: "Products that change with demand and seasonality",
    itemCount: 0,
    emoji: "🌦️",
  },
  {
    id: "services",
    name: "Farmer Support",
    description: "Product guidance and practical support for local farming needs",
    itemCount: 0,
    emoji: "🧾",
  },
];

export const featuredProducts: Product[] = [];

export const businessHighlights = [
  {
    title: "Wide Product Selection",
    description: "Find seeds, fertilizers, crop protection products, and farm essentials in one place.",
    emoji: "📦",
  },
  {
    title: "Clear stock tracking",
    description: "Check current availability, pack sizes, pricing, and product details before ordering.",
    emoji: "✅",
  },
  {
    title: "Farmer Assistance",
    description: "Get practical product guidance and assistance for your farming requirements.",
    emoji: "💬",
  },
  {
    title: "Trusted Local Store",
    description: "A local agricultural store focused on dependable products, clear pricing, and farmer service.",
    emoji: "🪴",
  },
];

export const shopInfo = {
  name: "Shree Sanwariya Agro Agency",
  tagline: "Quality agricultural products and trusted local service for farmers",
  phone: "9752469028",
  whatsapp: "9752469028",
  email: "Sunilpatidardev@gmail.com",
  address: "Sitamau , Near Hotel Aadarsh",
  hours: "8:30 AM - 8:00 PM",
};
