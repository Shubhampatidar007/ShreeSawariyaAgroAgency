
ALTER TABLE public.customers ADD COLUMN legacy_id text UNIQUE;
ALTER TABLE public.suppliers ADD COLUMN legacy_id text UNIQUE;
ALTER TABLE public.inventory_items ADD COLUMN legacy_id text UNIQUE;
ALTER TABLE public.products ADD COLUMN legacy_id text UNIQUE;

INSERT INTO public.suppliers (legacy_id, name, company, mobile, email, gstin, address, products_supplied, total_purchases, total_paid, advance, due_balance, last_order, status) VALUES
('s1','Rajeev Bansal','Bansal Agro Traders','+91 98110 22114','sales@bansalagro.in','06AABCB1234K1Z9','Grain Market, Hisar, Haryana','{"Wheat seed","Mustard seed","Bajra seed"}',1845000,1690000,50000,155000,'2026-07-29','active'),
('s2','Mohit Jain','Kisan Fertilizer Depot','+91 99123 88472','orders@kisandepot.in','06AACCK9911L1Z2','NH-9 Bypass, Hansi','{"Urea","DAP","Potash"}',2410000,2410000,0,0,'2026-08-01','active'),
('s3','Suresh Yadav','Green Shield Crop Care','+91 95600 74128','info@greenshield.co.in','06AAECG7788M1Z4','Industrial Area Phase 2, Rohtak','{"Insecticide","Fungicide","Neem oil"}',682000,590000,25000,92000,'2026-07-11','active'),
('s4','Parveen Kumar','AquaFlow Irrigation','+91 90341 55670','parveen@aquaflow.in','06AAFCA5566N1Z7','Delhi Road, Rohtak','{"Drip kits","Sprinklers","HDPE pipes"}',431000,380000,0,51000,'2026-06-24','active'),
('s5','Naveen Garg','Garg Farm Machinery','+91 98964 30117','garg.machinery@gmail.com','06AAGCG3344P1Z1','Tool Market, Sirsa','{"Sprayers","Hand tools","Pruners"}',298000,298000,15000,0,'2026-05-30','inactive'),
('s6','Anil Dhaka','Pashu Aahar Bhandar','+91 94667 21983','pashuaahar@outlook.com','06AAHCP2211Q1Z8','Feed Market, Bhiwani','{"Cattle feed","Mineral mixture"}',512000,470000,0,42000,'2026-07-20','active'),
('s7','Kavita Singh','BioGrow Organics','+91 89201 66450','hello@biogrow.in','06AAJCB8899R1Z5','Sector 12, Karnal','{"Vermicompost","Bio fertilizer"}',187000,152000,10000,35000,'2026-07-05','active'),
('s8','Rakesh Bishnoi','Bishnoi Seeds Pvt Ltd','+91 97119 40025','supply@bishnoiseeds.com','06AAKCB4455S1Z3','Seed Complex, Fatehabad','{"Paddy seed","Maize seed","Cotton seed"}',1290000,1180000,0,110000,'2026-07-27','active');

INSERT INTO public.customers (legacy_id, name, mobile, village, address, joined_on, credit_limit, total_purchases, total_paid, current_due, credit_balance, last_purchase, status, notes) VALUES
('c1','Ramesh Chaudhary','+91 98120 44521','Barwala','Ward 4, Barwala, Hisar','2021-06-14',50000,248500,226000,22500,22500,'2026-07-28','active','Buys wheat seed in bulk every rabi season.'),
('c2','Sunita Devi','+91 99961 20874','Uklana','Near Panchayat Bhawan, Uklana','2022-01-09',25000,96400,96400,0,0,'2026-07-30','active',NULL),
('c3','Jagdish Poonia','+91 94162 77310','Adampur','Kheri Road, Adampur','2020-03-22',75000,512900,458000,54900,54900,'2026-08-01','active',NULL),
('c4','Karan Singh','+91 90345 11298','Narnaund','Main Bazaar, Narnaund','2023-11-02',20000,41200,31200,10000,10000,'2026-06-19','active',NULL),
('c5','Balwant Rai','+91 98765 33220','Hansi','Gali No 6, Hansi','2019-08-30',100000,782300,782300,0,0,'2026-07-12','active',NULL),
('c6','Meena Kumari','+91 97288 41003','Bass','Bass Khurd, Hisar','2024-02-17',10000,18700,12700,6000,6000,'2026-05-09','inactive',NULL),
('c7','Hariram Beniwal','+91 96718 55940','Mundhal','Mundhal Kalan, Bhiwani Road','2018-12-05',120000,1024000,968000,56000,56000,'2026-08-02','active',NULL),
('c8','Vikas Sheoran','+91 89012 66431','Talwandi','Talwandi Rana, Hisar','2022-09-11',0,65400,40400,25000,25000,'2026-04-27','blocked','Cheque bounced twice — cash only.'),
('c9','Anita Sharma','+91 93540 90218','Sisai','Sisai Bolan, Hisar','2023-05-20',30000,132600,129600,3000,3000,'2026-07-25','active',NULL),
('c10','Devender Malik','+91 95553 74812','Kharia','Kharia Village, Hisar','2021-10-01',60000,289000,248000,41000,41000,'2026-07-18','active',NULL),
('c11','Pooja Rani','+91 90178 22093','Dhansu','Dhansu, Hisar','2025-01-28',5000,9400,9400,0,0,'2026-03-14','inactive',NULL),
('c12','Satpal Godara','+91 99118 30274','Siwani','Siwani Mandi, Bhiwani','2020-07-07',80000,445700,401700,44000,44000,'2026-07-31','active',NULL);

INSERT INTO public.inventory_items (legacy_id, product_name, supplier_id, supplier_name, quantity, unit, purchase_price, min_stock_level, status, last_updated)
SELECT v.legacy_id, v.product_name, s.id, v.supplier_name, v.quantity, v.unit, v.purchase_price, v.min_stock, v.status, v.last_updated::date
FROM (VALUES
('i1','Hybrid Wheat Seed HD-3226','s1','Bansal Agro Traders',62,'40 kg bag',1620,15,'published','2026-07-29'),
('i2','Urea 46% Nitrogen','s2','Kisan Fertilizer Depot',240,'45 kg bag',242,50,'published','2026-08-01'),
('i3','Neem Oil Bio Pesticide','s3','Green Shield Crop Care',88,'1 litre',520,20,'published','2026-07-11'),
('i4','Battery Knapsack Sprayer 16L','s5','Garg Farm Machinery',24,'unit',2740,8,'published','2026-05-30'),
('i5','Drip Irrigation Starter Kit','s4','AquaFlow Irrigation',12,'1 acre kit',4600,5,'published','2026-06-24'),
('i6','Mustard Seed Pusa Bold','s1','Bansal Agro Traders',105,'5 kg pack',790,25,'published','2026-07-29'),
('i7','Zinc Sulphate Micronutrient','s2','Kisan Fertilizer Depot',74,'10 kg bag',410,20,'published','2026-07-16'),
('i8','Cattle Mineral Mixture','s6','Pashu Aahar Bhandar',38,'25 kg bag',960,10,'published','2026-07-20'),
('i9','Paddy Seed PR-126','s8','Bishnoi Seeds Pvt Ltd',140,'10 kg bag',640,30,'inventory-only','2026-07-27'),
('i10','Vermicompost Organic Manure','s7','BioGrow Organics',96,'50 kg bag',380,20,'inventory-only','2026-07-05'),
('i11','DAP 18:46:0','s2','Kisan Fertilizer Depot',0,'50 kg bag',1350,40,'out-of-stock','2026-06-28'),
('i12','HDPE Pipe 63mm','s4','AquaFlow Irrigation',320,'metre',78,100,'hidden','2026-06-24'),
('i13','Cotton Seed BG-II','s8','Bishnoi Seeds Pvt Ltd',58,'475 g packet',767,15,'inventory-only','2026-07-27'),
('i14','Manual Sickle Set','s5','Garg Farm Machinery',15,'set of 5',340,6,'archived','2026-02-14')
) AS v(legacy_id, product_name, supplier_legacy, supplier_name, quantity, unit, purchase_price, min_stock, status, last_updated)
LEFT JOIN public.suppliers s ON s.legacy_id = v.supplier_legacy;

INSERT INTO public.products (legacy_id, inventory_id, title, category, selling_price, discount_price, stock, description, tags, emoji, visibility, featured, status, published_on)
SELECT v.legacy_id, i.id, v.title, v.category, v.selling_price, v.discount_price, v.stock, v.description, v.tags::text[], v.emoji, v.visibility, v.featured, v.status, v.published_on::date
FROM (VALUES
('pp1','i1','Hybrid Wheat Seed HD-3226','Seeds',1850,1780::numeric,62,'High-yield certified wheat seed suited to irrigated rabi sowing across north India.','{"wheat","rabi","certified"}','🌾','public',true,'published','2026-07-29'),
('pp2','i2','Urea 46% Nitrogen','Fertilizers',275,NULL,240,'Government-rate urea bags with company billing and lot numbers on the invoice.','{"urea","nitrogen"}','🧪','public',true,'published','2026-08-01'),
('pp3','i3','Neem Oil Bio Pesticide','Crop Protection',640,599,88,'Cold-pressed neem oil concentrate for organic pest control on vegetables and pulses.','{"organic","neem"}','🍃','public',true,'published','2026-07-11'),
('pp4','i4','Battery Knapsack Sprayer 16L','Farm Tools',3250,NULL,24,'12V battery sprayer with dual mode pump, 4 nozzles and one-year warranty.','{"sprayer","tools"}','🚿','public',false,'published','2026-05-30'),
('pp5','i5','Drip Irrigation Starter Kit','Irrigation',5400,NULL,12,'One acre inline drip kit with filters, laterals and fittings, installation guidance included.','{"drip","water saving"}','💧','public',false,'published','2026-06-24'),
('pp6','i6','Mustard Seed Pusa Bold','Seeds',920,NULL,105,'Bold-grain mustard variety with high oil content and good aphid tolerance.','{"mustard","oilseed"}','🌼','public',true,'published','2026-07-29'),
('pp7','i7','Zinc Sulphate Micronutrient','Fertilizers',480,NULL,74,'Corrects zinc deficiency in paddy and wheat, suitable for soil and foliar application.','{"micronutrient"}','⚗️','public',false,'published','2026-07-16'),
('pp8','i8','Cattle Mineral Mixture','Cattle Feed',1120,NULL,38,'Balanced chelated mineral mixture that improves milk yield and cattle fertility.','{"cattle","feed"}','🐄','public',false,'published','2026-07-20'),
('pp9','i12','HDPE Pipe 63mm','Irrigation',96,NULL,320,'ISI-marked HDPE pipe for field water conveyance, sold per running metre.','{"pipe"}','🪈','hidden',false,'published','2026-06-24'),
('pp10','i14','Manual Sickle Set','Farm Tools',420,NULL,0,'Forged carbon steel sickles with wooden grip, set of five.','{"harvest"}','🔪','public',false,'archived','2026-02-14')
) AS v(legacy_id, inv_legacy, title, category, selling_price, discount_price, stock, description, tags, emoji, visibility, featured, status, published_on)
LEFT JOIN public.inventory_items i ON i.legacy_id = v.inv_legacy;

INSERT INTO public.supplier_transactions (supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks)
SELECT s.id, v.d::date, v.t, v.ref, v.amount, v.balance, v.method, v.remarks
FROM (VALUES
('s1','2026-04-08','purchase','PO-2041 · Wheat seed 200 bags',320000,320000,'credit',NULL),
('s1','2026-04-25','payment','NEFT ref 88214',200000,120000,'bank',NULL),
('s1','2026-05-19','advance','Advance for kharif lot',50000,70000,'upi',NULL),
('s1','2026-06-30','purchase','PO-2098 · Mustard seed 90 bags',148000,218000,'credit',NULL),
('s1','2026-07-29','payment','Cheque 445192',63000,155000,'cheque','Part settlement'),
('s3','2026-05-12','purchase','PO-1875 · Neem oil 300 L',132000,132000,'credit',NULL),
('s3','2026-06-15','payment','UPI 3392018',65000,67000,'upi',NULL),
('s3','2026-07-11','purchase','PO-1990 · Fungicide 120 kg',25000,92000,'credit',NULL),
('s8','2026-07-02','purchase','PO-2110 · Paddy seed 150 bags',210000,210000,'credit',NULL),
('s8','2026-07-27','payment','RTGS 771204',100000,110000,'bank',NULL)
) AS v(sl, d, t, ref, amount, balance, method, remarks)
JOIN public.suppliers s ON s.legacy_id = v.sl;

INSERT INTO public.customer_transactions (customer_id, entry_date, entry_type, product, quantity, amount, payment, method, remarks)
SELECT c.id, v.d::date, v.t, v.product, v.qty, v.amount, v.payment, v.method, v.remarks
FROM (VALUES
('c1','2026-03-11','purchase','Urea 46% Nitrogen',20,5500,5500,'cash','Counter sale'),
('c1','2026-04-22','purchase','Hybrid Wheat Seed HD-3226',6,11100,6000,'upi',NULL),
('c1','2026-05-30','purchase','Neem Oil Bio Pesticide',4,2560,0,'credit','Promised after mandi sale'),
('c1','2026-06-18','purchase','Drip Irrigation Starter Kit',2,10800,5000,'bank',NULL),
('c1','2026-07-28','purchase','Zinc Sulphate Micronutrient',25,12000,2960,'cash','Balance due on kharif harvest'),
('c3','2026-05-04','purchase','Urea 46% Nitrogen',60,16500,16500,'upi',NULL),
('c3','2026-06-21','purchase','Battery Knapsack Sprayer 16L',3,9750,4000,'cheque',NULL),
('c3','2026-08-01','purchase','Mustard Seed Pusa Bold',55,50600,1450,'credit','Society purchase'),
('c7','2026-06-02','purchase','Cattle Mineral Mixture',30,33600,33600,'bank',NULL),
('c7','2026-08-02','purchase','Hybrid Wheat Seed HD-3226',32,59200,3200,'credit',NULL)
) AS v(cl, d, t, product, qty, amount, payment, method, remarks)
JOIN public.customers c ON c.legacy_id = v.cl;

INSERT INTO public.orders (code, channel, customer_id, customer_name, customer_type, village, mobile, placed_on, subtotal, discount, tax, total, paid, payment_method, payment_status, delivery_status, order_status, invoice_status, remarks, timeline)
VALUES
('ORD-3081','online',NULL,'Ramesh Yadav','registered','Barwala','+91 98120 44521','2026-08-05',3960,160,0,3800,3800,'upi','paid','out-for-delivery','shipped','generated','Deliver before noon','[{"id":"t1","label":"Order placed","at":"05 Aug, 08:12 AM"},{"id":"t2","label":"Payment received","at":"05 Aug, 08:14 AM","note":"UPI · ₹3,800"},{"id":"t3","label":"Packed","at":"05 Aug, 09:40 AM"},{"id":"t4","label":"Shipped","at":"05 Aug, 10:25 AM","note":"Tempo HR-20-8841"}]'::jsonb),
('ORD-3080','online',NULL,'Sunita Devi','registered','Adampur','+91 99911 20034','2026-08-05',4720,0,0,4720,2000,'credit','partial','scheduled','confirmed','draft','Balance on delivery','[{"id":"t5","label":"Order placed","at":"05 Aug, 07:02 AM"},{"id":"t6","label":"Advance received","at":"05 Aug, 07:10 AM","note":"Cash · ₹2,000"},{"id":"t7","label":"Confirmed","at":"05 Aug, 07:30 AM"}]'::jsonb),
('ORD-3079','offline',NULL,'Walk-in customer','walk-in','Hisar','—','2026-08-04',3610,110,0,3500,3500,'cash','paid','not-required','delivered','generated',NULL,'[{"id":"t8","label":"Counter sale","at":"04 Aug, 04:12 PM"},{"id":"t9","label":"Cash collected","at":"04 Aug, 04:13 PM"}]'::jsonb),
('ORD-3078','online',NULL,'Gurmeet Singh','registered','Narnaund','+91 98965 71120','2026-08-04',20250,750,0,19500,0,'credit','pending','scheduled','packed','draft','Khata entry after delivery','[{"id":"t10","label":"Order placed","at":"04 Aug, 11:20 AM"},{"id":"t11","label":"Confirmed","at":"04 Aug, 12:05 PM"},{"id":"t12","label":"Packed","at":"04 Aug, 06:15 PM"}]'::jsonb),
('ORD-3077','offline',NULL,'Kisan Seva Society','guest','Hansi','+91 90341 88210','2026-08-03',28200,1200,0,27000,15000,'cheque','partial','delivered','delivered','generated',NULL,'[{"id":"t13","label":"Counter sale","at":"03 Aug, 10:02 AM"},{"id":"t14","label":"Cheque received","at":"03 Aug, 10:20 AM","note":"PNB · ₹15,000"},{"id":"t15","label":"Delivered","at":"03 Aug, 05:40 PM"}]'::jsonb),
('ORD-3076','online',NULL,'Mahesh Kumar','registered','Uklana','+91 98183 45510','2026-08-02',2160,0,0,2160,2160,'upi','refunded','failed','returned','generated','Damaged seal, refunded','[{"id":"t16","label":"Order placed","at":"02 Aug, 09:12 AM"},{"id":"t17","label":"Delivery failed","at":"02 Aug, 06:20 PM"},{"id":"t18","label":"Returned & refunded","at":"03 Aug, 11:00 AM"}]'::jsonb);

INSERT INTO public.order_items (order_id, product, quantity, unit, rate, amount)
SELECT o.id, v.product, v.qty, v.unit, v.rate, v.qty * v.rate
FROM (VALUES
('ORD-3081','Urea 46% N',10,'bags',268),
('ORD-3081','Neem Oil Spray',2,'litres',640),
('ORD-3080','Paddy Seed PR-126',4,'bags',1180),
('ORD-3079','Sprinkler Nozzle 20mm',12,'pcs',180),
('ORD-3079','Hand Sprayer 16L',1,'pcs',1450),
('ORD-3078','DAP 18:46:0',15,'bags',1350),
('ORD-3077','Cattle Feed Mix',30,'bags',940),
('ORD-3076','Chlorpyriphos 20% EC',3,'litres',720)
) AS v(code, product, qty, unit, rate)
JOIN public.orders o ON o.code = v.code;

INSERT INTO public.payments (reference, direction, party_name, entry_date, amount, method, status, order_code, remarks) VALUES
('PAY-90412','incoming','Ramesh Yadav','2026-08-05',3800,'upi','success','ORD-3081',NULL),
('PAY-90411','incoming','Sunita Devi','2026-08-05',2000,'cash','success','ORD-3080','Advance'),
('PAY-90410','outgoing','IFFCO Regional Depot','2026-08-04',145000,'bank','success',NULL,'PO-1187 settlement'),
('PAY-90409','incoming','Kisan Seva Society','2026-08-03',15000,'cheque','pending','ORD-3077',NULL),
('PAY-90408','incoming','Balwant Rai','2026-08-02',6400,'card','success',NULL,NULL),
('PAY-90407','outgoing','Coromandel Agro','2026-08-01',62000,'online','failed',NULL,'Gateway timeout, retry pending'),
('PAY-90406','incoming','Mahesh Kumar','2026-08-01',2160,'upi','success','ORD-3076',NULL),
('PAY-90405','outgoing','Nagarjuna Seeds','2026-07-31',88400,'bank','success',NULL,NULL);

INSERT INTO public.reminders (title, audience, target, filter_summary, schedule, channel, due_amount, status, next_run, message, kind) VALUES
('Kharif khata dues above ₹10,000','42 farmers','customer','Due > ₹10,000 · Barwala, Adampur','weekly','whatsapp',486000,'active','2026-08-09','नमस्ते {{name}}, आपका बकाया ₹{{due}} है। कृपया भुगतान करें।','manual'),
('Fertilizer buyers — 30 day follow-up','128 farmers','customer','Category: Fertilizers · Purchase > 30 days','monthly','sms',0,'active','2026-09-01','Time to restock urea for the next spray cycle.','manual'),
('Supplier payment due','6 suppliers','supplier','Due balance > ₹50,000','daily','email',412000,'paused','2026-08-10','Payment schedule for pending invoices.','manual'),
('Cash-only buyers festival offer','310 farmers','customer','Payment method: Cash · Last 90 days','custom','call',0,'completed','2026-07-28','Festival combo offer announcement.','manual');

INSERT INTO public.reminder_logs (reminder_title, recipient, channel, sent_at, delivery, retries) VALUES
('Kharif khata dues above ₹10,000','Ramesh Yadav','whatsapp','2026-08-02 09:00+05:30','delivered',0),
('Kharif khata dues above ₹10,000','Gurmeet Singh','whatsapp','2026-08-02 09:00+05:30','failed',2),
('Fertilizer buyers — 30 day follow-up','Sunita Devi','sms','2026-08-01 10:00+05:30','delivered',0),
('Supplier payment due','IFFCO Regional Depot','email','2026-07-31 08:00+05:30','pending',1);

INSERT INTO public.cms_sections (name, type, enabled, visibility, sort_order, headline, body, image_label, scheduled_from, scheduled_to) VALUES
('Hero banner','hero',true,'public',1,'Trusted krishi kendra for every season','Certified seeds, fertilizers and tools with doorstep delivery across Hisar district.','hero-field.jpg','2026-06-01','2026-12-31'),
('Monsoon poster','poster',true,'public',2,'Monsoon combo — save 15%','Urea + spray pump bundle for kharif season.','monsoon-poster.jpg',NULL,NULL),
('Categories strip','categories',true,'public',3,'Shop by category','Seeds, fertilizers, pesticides, tools and irrigation.','—',NULL,NULL),
('Featured products','featured',true,'public',4,'Season picks for your farm','Auto-populated from published products marked featured.','—',NULL,NULL),
('Offers band','offers',true,'public',5,'Kharif seed festival','Flat 15% off on select paddy seed varieties.','offers-band.jpg',NULL,NULL),
('Announcement bar','announcement',false,'hidden',6,'Shop closed on 15 August','Independence Day holiday notice.','—',NULL,NULL),
('Marketing block','marketing',false,'hidden',7,'Soil testing camp','Free soil testing every Sunday at the Hisar counter.','camp.jpg',NULL,NULL);
