import type { Customer, CustomerLedgerEntry } from "@/types/business";

export const customersSeed: Customer[] = [
  { id: "c1", name: "Ramesh Chaudhary", mobile: "+91 98120 44521", village: "Barwala", address: "Ward 4, Barwala, Hisar", joinedOn: "2021-06-14", totalPurchases: 248500, totalPaid: 226000, currentDue: 22500, lastPurchase: "2026-07-28", status: "active", notes: "Buys wheat seed in bulk every rabi season." },
  { id: "c2", name: "Sunita Devi", mobile: "+91 99961 20874", village: "Uklana", address: "Near Panchayat Bhawan, Uklana", joinedOn: "2022-01-09", totalPurchases: 96400, totalPaid: 96400, currentDue: 0, lastPurchase: "2026-07-30", status: "active" },
  { id: "c3", name: "Jagdish Poonia", mobile: "+91 94162 77310", village: "Adampur", address: "Kheri Road, Adampur", joinedOn: "2020-03-22", totalPurchases: 512900, totalPaid: 458000, currentDue: 54900, lastPurchase: "2026-08-01", status: "active" },
  { id: "c4", name: "Karan Singh", mobile: "+91 90345 11298", village: "Narnaund", address: "Main Bazaar, Narnaund", joinedOn: "2023-11-02", totalPurchases: 41200, totalPaid: 31200, currentDue: 10000, lastPurchase: "2026-06-19", status: "active" },
  { id: "c5", name: "Balwant Rai", mobile: "+91 98765 33220", village: "Hansi", address: "Gali No 6, Hansi", joinedOn: "2019-08-30", totalPurchases: 782300, totalPaid: 782300, currentDue: 0, lastPurchase: "2026-07-12", status: "active" },
  { id: "c6", name: "Meena Kumari", mobile: "+91 97288 41003", village: "Bass", address: "Bass Khurd, Hisar", joinedOn: "2024-02-17", totalPurchases: 18700, totalPaid: 12700, currentDue: 6000, lastPurchase: "2026-05-09", status: "inactive" },
  { id: "c7", name: "Hariram Beniwal", mobile: "+91 96718 55940", village: "Mundhal", address: "Mundhal Kalan, Bhiwani Road", joinedOn: "2018-12-05", totalPurchases: 1024000, totalPaid: 968000, currentDue: 56000, lastPurchase: "2026-08-02", status: "active" },
  { id: "c8", name: "Vikas Sheoran", mobile: "+91 89012 66431", village: "Talwandi", address: "Talwandi Rana, Hisar", joinedOn: "2022-09-11", totalPurchases: 65400, totalPaid: 40400, currentDue: 25000, lastPurchase: "2026-04-27", status: "blocked", notes: "Cheque bounced twice — cash only." },
  { id: "c9", name: "Anita Sharma", mobile: "+91 93540 90218", village: "Sisai", address: "Sisai Bolan, Hisar", joinedOn: "2023-05-20", totalPurchases: 132600, totalPaid: 129600, currentDue: 3000, lastPurchase: "2026-07-25", status: "active" },
  { id: "c10", name: "Devender Malik", mobile: "+91 95553 74812", village: "Kharia", address: "Kharia Village, Hisar", joinedOn: "2021-10-01", totalPurchases: 289000, totalPaid: 248000, currentDue: 41000, lastPurchase: "2026-07-18", status: "active" },
  { id: "c11", name: "Pooja Rani", mobile: "+91 90178 22093", village: "Dhansu", address: "Dhansu, Hisar", joinedOn: "2025-01-28", totalPurchases: 9400, totalPaid: 9400, currentDue: 0, lastPurchase: "2026-03-14", status: "inactive" },
  { id: "c12", name: "Satpal Godara", mobile: "+91 99118 30274", village: "Siwani", address: "Siwani Mandi, Bhiwani", joinedOn: "2020-07-07", totalPurchases: 445700, totalPaid: 401700, currentDue: 44000, lastPurchase: "2026-07-31", status: "active" },
];

export const customerLedgerSeed: CustomerLedgerEntry[] = [
  { id: "cl1", customerId: "c1", date: "2026-03-11", product: "Urea 46% Nitrogen", quantity: 20, amount: 5500, payment: 5500, remainingDue: 0, method: "cash", remarks: "Counter sale" },
  { id: "cl2", customerId: "c1", date: "2026-04-22", product: "Hybrid Wheat Seed HD-3226", quantity: 6, amount: 11100, payment: 6000, remainingDue: 5100, method: "upi" },
  { id: "cl3", customerId: "c1", date: "2026-05-30", product: "Neem Oil Bio Pesticide", quantity: 4, amount: 2560, payment: 0, remainingDue: 7660, method: "credit", remarks: "Promised after mandi sale" },
  { id: "cl4", customerId: "c1", date: "2026-06-18", product: "Drip Irrigation Starter Kit", quantity: 2, amount: 10800, payment: 5000, remainingDue: 13460, method: "bank" },
  { id: "cl5", customerId: "c1", date: "2026-07-28", product: "Zinc Sulphate Micronutrient", quantity: 25, amount: 12000, payment: 2960, remainingDue: 22500, method: "cash", remarks: "Balance due on kharif harvest" },
  { id: "cl6", customerId: "c3", date: "2026-05-04", product: "Urea 46% Nitrogen", quantity: 60, amount: 16500, payment: 16500, remainingDue: 0, method: "upi" },
  { id: "cl7", customerId: "c3", date: "2026-06-21", product: "Battery Knapsack Sprayer 16L", quantity: 3, amount: 9750, payment: 4000, remainingDue: 5750, method: "cheque" },
  { id: "cl8", customerId: "c3", date: "2026-08-01", product: "Mustard Seed Pusa Bold", quantity: 55, amount: 50600, payment: 1450, remainingDue: 54900, method: "credit", remarks: "Society purchase" },
  { id: "cl9", customerId: "c7", date: "2026-06-02", product: "Cattle Mineral Mixture", quantity: 30, amount: 33600, payment: 33600, remainingDue: 0, method: "bank" },
  { id: "cl10", customerId: "c7", date: "2026-08-02", product: "Hybrid Wheat Seed HD-3226", quantity: 32, amount: 59200, payment: 3200, remainingDue: 56000, method: "credit" },
];