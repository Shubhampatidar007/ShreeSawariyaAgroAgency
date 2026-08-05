import type { InventoryItem, PublishedProduct } from "@/types/business";

export const inventorySeed: InventoryItem[] = [
  { id: "i1", productName: "Hybrid Wheat Seed HD-3226", supplierId: "s1", supplierName: "Bansal Agro Traders", quantity: 62, unit: "40 kg bag", purchasePrice: 1620, status: "published", lastUpdated: "2026-07-29" },
  { id: "i2", productName: "Urea 46% Nitrogen", supplierId: "s2", supplierName: "Kisan Fertilizer Depot", quantity: 240, unit: "45 kg bag", purchasePrice: 242, status: "published", lastUpdated: "2026-08-01" },
  { id: "i3", productName: "Neem Oil Bio Pesticide", supplierId: "s3", supplierName: "Green Shield Crop Care", quantity: 88, unit: "1 litre", purchasePrice: 520, status: "published", lastUpdated: "2026-07-11" },
  { id: "i4", productName: "Battery Knapsack Sprayer 16L", supplierId: "s5", supplierName: "Garg Farm Machinery", quantity: 24, unit: "unit", purchasePrice: 2740, status: "published", lastUpdated: "2026-05-30" },
  { id: "i5", productName: "Drip Irrigation Starter Kit", supplierId: "s4", supplierName: "AquaFlow Irrigation", quantity: 12, unit: "1 acre kit", purchasePrice: 4600, status: "published", lastUpdated: "2026-06-24" },
  { id: "i6", productName: "Mustard Seed Pusa Bold", supplierId: "s1", supplierName: "Bansal Agro Traders", quantity: 105, unit: "5 kg pack", purchasePrice: 790, status: "published", lastUpdated: "2026-07-29" },
  { id: "i7", productName: "Zinc Sulphate Micronutrient", supplierId: "s2", supplierName: "Kisan Fertilizer Depot", quantity: 74, unit: "10 kg bag", purchasePrice: 410, status: "published", lastUpdated: "2026-07-16" },
  { id: "i8", productName: "Cattle Mineral Mixture", supplierId: "s6", supplierName: "Pashu Aahar Bhandar", quantity: 38, unit: "25 kg bag", purchasePrice: 960, status: "published", lastUpdated: "2026-07-20" },
  { id: "i9", productName: "Paddy Seed PR-126", supplierId: "s8", supplierName: "Bishnoi Seeds Pvt Ltd", quantity: 140, unit: "10 kg bag", purchasePrice: 640, status: "inventory-only", lastUpdated: "2026-07-27" },
  { id: "i10", productName: "Vermicompost Organic Manure", supplierId: "s7", supplierName: "BioGrow Organics", quantity: 96, unit: "50 kg bag", purchasePrice: 380, status: "inventory-only", lastUpdated: "2026-07-05" },
  { id: "i11", productName: "DAP 18:46:0", supplierId: "s2", supplierName: "Kisan Fertilizer Depot", quantity: 0, unit: "50 kg bag", purchasePrice: 1350, status: "out-of-stock", lastUpdated: "2026-06-28" },
  { id: "i12", productName: "HDPE Pipe 63mm", supplierId: "s4", supplierName: "AquaFlow Irrigation", quantity: 320, unit: "metre", purchasePrice: 78, status: "hidden", lastUpdated: "2026-06-24" },
  { id: "i13", productName: "Cotton Seed BG-II", supplierId: "s8", supplierName: "Bishnoi Seeds Pvt Ltd", quantity: 58, unit: "475 g packet", purchasePrice: 767, status: "inventory-only", lastUpdated: "2026-07-27" },
  { id: "i14", productName: "Manual Sickle Set", supplierId: "s5", supplierName: "Garg Farm Machinery", quantity: 15, unit: "set of 5", purchasePrice: 340, status: "archived", lastUpdated: "2026-02-14" },
];

export const publishedProductsSeed: PublishedProduct[] = [
  { id: "pp1", inventoryId: "i1", title: "Hybrid Wheat Seed HD-3226", category: "Seeds", sellingPrice: 1850, discountPrice: 1780, stock: 62, description: "High-yield certified wheat seed suited to irrigated rabi sowing across north India.", tags: ["wheat", "rabi", "certified"], images: [], emoji: "🌾", visibility: "public", featured: true, status: "published", publishedOn: "2026-07-29" },
  { id: "pp2", inventoryId: "i2", title: "Urea 46% Nitrogen", category: "Fertilizers", sellingPrice: 275, stock: 240, description: "Government-rate urea bags with company billing and lot numbers on the invoice.", tags: ["urea", "nitrogen"], images: [], emoji: "🧪", visibility: "public", featured: true, status: "published", publishedOn: "2026-08-01" },
  { id: "pp3", inventoryId: "i3", title: "Neem Oil Bio Pesticide", category: "Crop Protection", sellingPrice: 640, discountPrice: 599, stock: 88, description: "Cold-pressed neem oil concentrate for organic pest control on vegetables and pulses.", tags: ["organic", "neem"], images: [], emoji: "🍃", visibility: "public", featured: true, status: "published", publishedOn: "2026-07-11" },
  { id: "pp4", inventoryId: "i4", title: "Battery Knapsack Sprayer 16L", category: "Farm Tools", sellingPrice: 3250, stock: 24, description: "12V battery sprayer with dual mode pump, 4 nozzles and one-year warranty.", tags: ["sprayer", "tools"], images: [], emoji: "🚿", visibility: "public", featured: false, status: "published", publishedOn: "2026-05-30" },
  { id: "pp5", inventoryId: "i5", title: "Drip Irrigation Starter Kit", category: "Irrigation", sellingPrice: 5400, stock: 12, description: "One acre inline drip kit with filters, laterals and fittings, installation guidance included.", tags: ["drip", "water saving"], images: [], emoji: "💧", visibility: "public", featured: false, status: "published", publishedOn: "2026-06-24" },
  { id: "pp6", inventoryId: "i6", title: "Mustard Seed Pusa Bold", category: "Seeds", sellingPrice: 920, stock: 105, description: "Bold-grain mustard variety with high oil content and good aphid tolerance.", tags: ["mustard", "oilseed"], images: [], emoji: "🌼", visibility: "public", featured: true, status: "published", publishedOn: "2026-07-29" },
  { id: "pp7", inventoryId: "i7", title: "Zinc Sulphate Micronutrient", category: "Fertilizers", sellingPrice: 480, stock: 74, description: "Corrects zinc deficiency in paddy and wheat, suitable for soil and foliar application.", tags: ["micronutrient"], images: [], emoji: "⚗️", visibility: "public", featured: false, status: "published", publishedOn: "2026-07-16" },
  { id: "pp8", inventoryId: "i8", title: "Cattle Mineral Mixture", category: "Cattle Feed", sellingPrice: 1120, stock: 38, description: "Balanced chelated mineral mixture that improves milk yield and cattle fertility.", tags: ["cattle", "feed"], images: [], emoji: "🐄", visibility: "public", featured: false, status: "published", publishedOn: "2026-07-20" },
  { id: "pp9", inventoryId: "i12", title: "HDPE Pipe 63mm", category: "Irrigation", sellingPrice: 96, stock: 320, description: "ISI-marked HDPE pipe for field water conveyance, sold per running metre.", tags: ["pipe"], images: [], emoji: "🪈", visibility: "hidden", featured: false, status: "published", publishedOn: "2026-06-24" },
  { id: "pp10", inventoryId: "i14", title: "Manual Sickle Set", category: "Farm Tools", sellingPrice: 420, stock: 0, description: "Forged carbon steel sickles with wooden grip, set of five.", tags: ["harvest"], images: [], emoji: "🔪", visibility: "public", featured: false, status: "archived", publishedOn: "2026-02-14" },
];

export const productCategories = [
  "Seeds",
  "Fertilizers",
  "Crop Protection",
  "Farm Tools",
  "Irrigation",
  "Cattle Feed",
];