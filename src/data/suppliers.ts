import type { Supplier, SupplierLedgerEntry } from "@/types/business";

export const suppliersSeed: Supplier[] = [
  { id: "s1", name: "Rajeev Bansal", company: "Bansal Agro Traders", mobile: "+91 98110 22114", email: "sales@bansalagro.in", gstin: "06AABCB1234K1Z9", address: "Grain Market, Hisar, Haryana", productsSupplied: ["Wheat seed", "Mustard seed", "Bajra seed"], totalPurchases: 1845000, totalPaid: 1690000, advance: 50000, dueBalance: 155000, lastOrder: "2026-07-29", status: "active" },
  { id: "s2", name: "Mohit Jain", company: "Kisan Fertilizer Depot", mobile: "+91 99123 88472", email: "orders@kisandepot.in", gstin: "06AACCK9911L1Z2", address: "NH-9 Bypass, Hansi", productsSupplied: ["Urea", "DAP", "Potash"], totalPurchases: 2410000, totalPaid: 2410000, advance: 0, dueBalance: 0, lastOrder: "2026-08-01", status: "active" },
  { id: "s3", name: "Suresh Yadav", company: "Green Shield Crop Care", mobile: "+91 95600 74128", email: "info@greenshield.co.in", gstin: "06AAECG7788M1Z4", address: "Industrial Area Phase 2, Rohtak", productsSupplied: ["Insecticide", "Fungicide", "Neem oil"], totalPurchases: 682000, totalPaid: 590000, advance: 25000, dueBalance: 92000, lastOrder: "2026-07-11", status: "active" },
  { id: "s4", name: "Parveen Kumar", company: "AquaFlow Irrigation", mobile: "+91 90341 55670", email: "parveen@aquaflow.in", gstin: "06AAFCA5566N1Z7", address: "Delhi Road, Rohtak", productsSupplied: ["Drip kits", "Sprinklers", "HDPE pipes"], totalPurchases: 431000, totalPaid: 380000, advance: 0, dueBalance: 51000, lastOrder: "2026-06-24", status: "active" },
  { id: "s5", name: "Naveen Garg", company: "Garg Farm Machinery", mobile: "+91 98964 30117", email: "garg.machinery@gmail.com", gstin: "06AAGCG3344P1Z1", address: "Tool Market, Sirsa", productsSupplied: ["Sprayers", "Hand tools", "Pruners"], totalPurchases: 298000, totalPaid: 298000, advance: 15000, dueBalance: 0, lastOrder: "2026-05-30", status: "inactive" },
  { id: "s6", name: "Anil Dhaka", company: "Pashu Aahar Bhandar", mobile: "+91 94667 21983", email: "pashuaahar@outlook.com", gstin: "06AAHCP2211Q1Z8", address: "Feed Market, Bhiwani", productsSupplied: ["Cattle feed", "Mineral mixture"], totalPurchases: 512000, totalPaid: 470000, advance: 0, dueBalance: 42000, lastOrder: "2026-07-20", status: "active" },
  { id: "s7", name: "Kavita Singh", company: "BioGrow Organics", mobile: "+91 89201 66450", email: "hello@biogrow.in", gstin: "06AAJCB8899R1Z5", address: "Sector 12, Karnal", productsSupplied: ["Vermicompost", "Bio fertilizer"], totalPurchases: 187000, totalPaid: 152000, advance: 10000, dueBalance: 35000, lastOrder: "2026-07-05", status: "active" },
  { id: "s8", name: "Rakesh Bishnoi", company: "Bishnoi Seeds Pvt Ltd", mobile: "+91 97119 40025", email: "supply@bishnoiseeds.com", gstin: "06AAKCB4455S1Z3", address: "Seed Complex, Fatehabad", productsSupplied: ["Paddy seed", "Maize seed", "Cotton seed"], totalPurchases: 1290000, totalPaid: 1180000, advance: 0, dueBalance: 110000, lastOrder: "2026-07-27", status: "active" },
];

export const supplierLedgerSeed: SupplierLedgerEntry[] = [
  { id: "sl1", supplierId: "s1", date: "2026-04-08", type: "purchase", reference: "PO-2041 · Wheat seed 200 bags", amount: 320000, balance: 320000, method: "credit" },
  { id: "sl2", supplierId: "s1", date: "2026-04-25", type: "payment", reference: "NEFT ref 88214", amount: 200000, balance: 120000, method: "bank" },
  { id: "sl3", supplierId: "s1", date: "2026-05-19", type: "advance", reference: "Advance for kharif lot", amount: 50000, balance: 70000, method: "upi" },
  { id: "sl4", supplierId: "s1", date: "2026-06-30", type: "purchase", reference: "PO-2098 · Mustard seed 90 bags", amount: 148000, balance: 218000, method: "credit" },
  { id: "sl5", supplierId: "s1", date: "2026-07-29", type: "payment", reference: "Cheque 445192", amount: 63000, balance: 155000, method: "cheque", remarks: "Part settlement" },
  { id: "sl6", supplierId: "s3", date: "2026-05-12", type: "purchase", reference: "PO-1875 · Neem oil 300 L", amount: 132000, balance: 132000, method: "credit" },
  { id: "sl7", supplierId: "s3", date: "2026-06-15", type: "payment", reference: "UPI 3392018", amount: 65000, balance: 67000, method: "upi" },
  { id: "sl8", supplierId: "s3", date: "2026-07-11", type: "purchase", reference: "PO-1990 · Fungicide 120 kg", amount: 25000, balance: 92000, method: "credit" },
  { id: "sl9", supplierId: "s8", date: "2026-07-02", type: "purchase", reference: "PO-2110 · Paddy seed 150 bags", amount: 210000, balance: 210000, method: "credit" },
  { id: "sl10", supplierId: "s8", date: "2026-07-27", type: "payment", reference: "RTGS 771204", amount: 100000, balance: 110000, method: "bank" },
];