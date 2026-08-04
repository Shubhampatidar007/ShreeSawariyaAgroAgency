import type { Category, Product } from "@/types";

export const categories: Category[] = [
  { id: "seeds", name: "Seeds & Saplings", description: "Certified hybrid and desi seed varieties", itemCount: 184, emoji: "🌱" },
  { id: "fertilizer", name: "Fertilizers", description: "Urea, DAP, potash and organic compost", itemCount: 96, emoji: "🧪" },
  { id: "pesticide", name: "Crop Protection", description: "Insecticides, fungicides and weedicides", itemCount: 132, emoji: "🛡️" },
  { id: "tools", name: "Farm Tools", description: "Sprayers, sickles, pruners and hand tools", itemCount: 78, emoji: "🛠️" },
  { id: "irrigation", name: "Irrigation", description: "Drip kits, pipes, sprinklers and pumps", itemCount: 64, emoji: "💧" },
  { id: "feed", name: "Cattle Feed", description: "Balanced feed, mineral mixture and supplements", itemCount: 41, emoji: "🐄" },
];

export const featuredProducts: Product[] = [
  { id: "p1", name: "Hybrid Wheat Seed HD-3226", category: "Seeds", price: 1850, unit: "40 kg bag", rating: 4.8, stock: 62, tag: "Best seller", emoji: "🌾" },
  { id: "p2", name: "Urea 46% Nitrogen", category: "Fertilizers", price: 275, unit: "45 kg bag", rating: 4.6, stock: 240, emoji: "🧪" },
  { id: "p3", name: "Neem Oil Bio Pesticide", category: "Crop Protection", price: 640, unit: "1 litre", rating: 4.7, stock: 88, tag: "Organic", emoji: "🍃" },
  { id: "p4", name: "Battery Knapsack Sprayer 16L", category: "Farm Tools", price: 3250, unit: "1 unit", rating: 4.5, stock: 24, tag: "New arrival", emoji: "🚿" },
  { id: "p5", name: "Drip Irrigation Starter Kit", category: "Irrigation", price: 5400, unit: "1 acre kit", rating: 4.4, stock: 12, emoji: "💧" },
  { id: "p6", name: "Mustard Seed Pusa Bold", category: "Seeds", price: 920, unit: "5 kg pack", rating: 4.6, stock: 105, tag: "Season pick", emoji: "🌼" },
  { id: "p7", name: "Zinc Sulphate Micronutrient", category: "Fertilizers", price: 480, unit: "10 kg bag", rating: 4.3, stock: 74, emoji: "⚗️" },
  { id: "p8", name: "Cattle Mineral Mixture", category: "Cattle Feed", price: 1120, unit: "25 kg bag", rating: 4.5, stock: 38, emoji: "🐄" },
];

export const businessHighlights = [
  { title: "Government licensed dealer", description: "Licensed seed, fertilizer and pesticide retailer serving 3 districts.", emoji: "📜" },
  { title: "Genuine stock guarantee", description: "Every batch is company-billed with lot numbers printed on your invoice.", emoji: "✅" },
  { title: "Same-day village delivery", description: "Free delivery on orders above ₹2,000 within a 25 km radius.", emoji: "🚚" },
  { title: "Agronomist support", description: "Free crop advisory on soil health, dosage and spray schedules.", emoji: "👨‍🌾" },
];

export const shopInfo = {
  name: "AgriKisan Krishi Kendra",
  tagline: "Seeds, inputs and farm supplies for every season",
  phone: "+91 98765 43210",
  whatsapp: "+91 98765 43211",
  email: "support@agrikisan.in",
  address: "Mandi Road, Near Krishi Market, Hisar, Haryana 125001",
  hours: "Mon – Sat, 7:00 AM to 8:00 PM",
};
