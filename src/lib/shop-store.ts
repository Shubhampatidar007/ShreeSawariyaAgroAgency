import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Customer,
  CustomerLedgerEntry,
  CustomerSaleItem,
  InventoryItem,
  KhataSaleItemInput,
  PublishedProduct,
  Supplier,
  SupplierLedgerEntry,
} from "@/types/business";
import type {
  Advertisement,
  Backup,
  PaymentRecord,
  Reminder,
  ReminderLog,
  CmsSection,
  AdminNotification,
} from "@/types";
import type { Order } from "@/types/operations";

type ShopState = {
  notifications: AdminNotification[];
  customers: Customer[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  products: PublishedProduct[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  draftProduct: PublishedProduct | null;
  orders: Order[];
  payments: PaymentRecord[];
  reminders: Reminder[];
  reminderLogs: ReminderLog[];
  cmsSections: CmsSection[];
  advertisements: Advertisement[];
  backups: Backup[];
  loading: boolean;
};

let state: ShopState = {
  notifications: [], customers: [], suppliers: [], inventory: [], products: [],
  customerLedger: [], supplierLedger: [], draftProduct: null, orders: [], payments: [],
  reminders: [], reminderLogs: [], cmsSections: [], advertisements: [], backups: [], loading: true,
};

const listeners = new Set<() => void>();
function setState(update: Partial<ShopState>) { state = { ...state, ...update }; listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
const getSnapshot = () => state;
export function useShopStore<T>(selector: (s: ShopState) => T): T { const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot); return selector(snapshot); }

const num = (value: unknown) => Number(value ?? 0);
const toCustomer = (r: any): Customer => ({ id:r.id,name:r.name,mobile:r.mobile,village:r.village??"",address:r.address??"",joinedOn:r.joined_on,creditLimit:num(r.credit_limit),creditBalance:num(r.credit_balance),totalPurchases:num(r.total_purchases),totalPaid:num(r.total_paid),currentDue:num(r.current_due),lastPurchase:r.last_purchase??r.joined_on,status:r.status,notes:r.notes??undefined });
const toSupplier = (r:any):Supplier=>({id:r.id,name:r.name,company:r.company??"",mobile:r.mobile??"",email:r.email??"",gstin:r.gstin??"",address:r.address??"",productsSupplied:r.products_supplied??[],totalPurchases:num(r.total_purchases),totalPaid:num(r.total_paid),advance:num(r.advance),dueBalance:num(r.due_balance),lastOrder:r.last_order??"",status:r.status});
const toInventory=(r:any):InventoryItem=>({id:r.id,productName:r.product_name,supplierId:r.supplier_id??"",supplierName:r.supplier_name??"",quantity:num(r.quantity),unit:r.unit,purchasePrice:num(r.purchase_price),totalPrice:num(r.total_price),minStockLevel:num(r.min_stock_level),status:r.status,lastUpdated:r.last_updated});
const toProduct=(r:any):PublishedProduct=>({id:r.id,inventoryId:r.inventory_id??"",title:r.title,category:r.category,sellingPrice:num(r.selling_price),discountPrice:r.discount_price==null?undefined:num(r.discount_price),stock:num(r.stock),description:r.description??"",tags:r.tags??[],images:r.images??[],emoji:r.emoji??"🌾",visibility:r.visibility,featured:!!r.featured,status:r.status,publishedOn:r.published_on});
const toCustomerLedger=(r:any):CustomerLedgerEntry=>({id:r.id,customerId:r.customer_id,date:r.entry_date,entryType:r.entry_type,product:r.product??"",quantity:num(r.quantity),amount:num(r.amount),payment:num(r.payment),remainingDue:num(r.remaining_due),method:r.method,remarks:r.remarks??undefined});
const toSaleItem=(r:any):CustomerSaleItem=>({id:r.id,transactionId:r.transaction_id,productId:r.product_id??undefined,product:r.product,quantity:num(r.quantity),unit:r.unit,rate:num(r.rate),amount:num(r.amount)});
const toSupplierLedger=(r:any):SupplierLedgerEntry=>({id:r.id,supplierId:r.supplier_id,date:r.entry_date,type:r.entry_type,reference:r.reference??"",amount:num(r.amount),balance:num(r.balance),method:r.method,remarks:r.remarks??undefined,productName:r.product_name??undefined,quantity:r.quantity!==undefined?num(r.quantity):undefined,unit:r.unit??undefined,unitPrice:r.rate!==undefined?num(r.rate):undefined});
const toOrder=(r:any):Order=>({id:r.id,code:r.code,channel:r.channel,customerId:r.customer_id??undefined,customerName:r.customer_name??"",customerType:r.customer_type,village:r.village??"",mobile:r.mobile??"",placedOn:r.placed_on,items:(r.order_items??[]).map((i:any)=>({id:i.id,product:i.product,quantity:num(i.quantity),unit:i.unit,rate:num(i.rate),amount:num(i.amount)})),subtotal:num(r.subtotal),discount:num(r.discount),tax:num(r.tax),total:num(r.total),paid:num(r.paid),paymentMethod:r.payment_method,paymentStatus:r.payment_status,deliveryStatus:r.delivery_status,orderStatus:r.order_status,invoiceStatus:r.invoice_status,remarks:r.remarks??undefined,timeline:r.timeline??[]});
const toPayment=(r:any):PaymentRecord=>({id:r.id,reference:r.reference,direction:r.direction,partyId:r.party_id??"",partyName:r.party_name??"",date:r.entry_date,amount:num(r.amount),method:r.method,status:r.status,orderCode:r.order_code??undefined,remarks:r.remarks??undefined});
const toReminder=(r:any):Reminder=>({id:r.id,title:r.title,audience:r.audience??"",target:r.target,filterSummary:r.filter_summary??"",schedule:r.schedule,channel:r.channel,dueAmount:num(r.due_amount),status:r.status,nextRun:r.next_run,message:r.message??"",sourceId:r.source_id??undefined});
const toNotification=(r:any):AdminNotification=>({id:r.id,title:r.title,body:r.body??"",type:r.type,link:r.link??undefined,isRead:!!r.is_read,sourceId:r.source_id??undefined,createdAt:r.created_at});
const toReminderLog=(r:any):ReminderLog=>({id:r.id,reminderTitle:r.reminder_title,recipient:r.recipient??"",channel:r.channel,sentAt:r.sent_at,delivery:r.delivery,retries:r.retries??0});
const toCms=(r:any):CmsSection=>({id:r.id,name:r.name,type:r.type,enabled:!!r.enabled,visibility:r.visibility,order:r.sort_order,headline:r.headline??"",body:r.body??"",scheduledFrom:r.scheduled_from??undefined,scheduledTo:r.scheduled_to??undefined,imageLabel:r.image_label??""});
const toAd=(r:any):Advertisement=>({id:r.id,title:r.title,placement:r.placement,audience:r.audience,status:r.status,impressions:r.impressions??0,clicks:r.clicks??0,startsOn:r.starts_on,runsUntil:r.runs_until});
const toBackup=(r:any):Backup=>({id:r.id,name:r.name,type:r.type,size:r.size,createdAt:r.created_at,status:r.status,destination:r.destination});

let loadPromise: Promise<void> | null = null;
export async function loadShopData() {
  setState({loading:true});
  try {
    const [notifications,customers,suppliers,inventory,products,customerLedger,supplierLedger,orders,payments,reminders,reminderLogs,cmsSections,ads,backupRows]=await Promise.all([
      supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(50),
      supabase.from("customers").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("inventory_items").select("*").order("product_name"),
      supabase.from("products").select("*").order("published_on",{ascending:false}),
      supabase.from("customer_transactions").select("*").order("entry_date"),
      supabase.from("supplier_transactions").select("*").order("entry_date"),
      supabase.from("orders").select("*, order_items(*)").order("placed_on",{ascending:false}),
      supabase.from("payments").select("*").order("entry_date",{ascending:false}),
      supabase.from("reminders").select("*").order("created_at",{ascending:false}),
      supabase.from("reminder_logs").select("*").order("sent_at",{ascending:false}),
      supabase.from("cms_sections").select("*").order("sort_order"),
      supabase.from("advertisements").select("*").order("created_at",{ascending:false}),
      supabase.from("backups").select("*").order("created_at",{ascending:false}),
    ]);
    const firstError=[notifications,customers,suppliers,inventory,products,customerLedger,supplierLedger,orders,payments,reminders,reminderLogs,cmsSections,ads,backupRows].find(result=>result.error);
    if(firstError?.error) throw firstError.error;
    setState({notifications:(notifications.data??[]).map(toNotification),customers:(customers.data??[]).map(toCustomer),suppliers:(suppliers.data??[]).map(toSupplier),inventory:(inventory.data??[]).map(toInventory),products:(products.data??[]).map(toProduct),customerLedger:(customerLedger.data??[]).map(toCustomerLedger),supplierLedger:(supplierLedger.data??[]).map(toSupplierLedger),orders:(orders.data??[]).map(toOrder),payments:(payments.data??[]).map(toPayment),reminders:(reminders.data??[]).map(toReminder),reminderLogs:(reminderLogs.data??[]).map(toReminderLog),cmsSections:(cmsSections.data??[]).map(toCms),advertisements:(ads.data??[]).map(toAd),backups:(backupRows.data??[]).map(toBackup),loading:false});
  } catch(error){setState({loading:false});throw error;}
}

/** Loads once per session and refreshes whenever any table changes. */
export function initShopData(){
  if(typeof window==="undefined") return null;
  if(!loadPromise){
    loadPromise=loadShopData().catch(error=>{loadPromise=null;throw error;});
    let timer:ReturnType<typeof setTimeout>|null=null;
    const refresh=()=>{if(timer) clearTimeout(timer);timer=setTimeout(()=>{void loadShopData().catch(error=>console.error("Shop data refresh failed:",error));},250);};
    supabase.channel("shop-data").on("postgres_changes",{event:"*",schema:"public"},refresh).subscribe();
  }
  return loadPromise;
}

const after=async<T,>(value:T)=>{await loadShopData();return value;};

export const shopStore={
  get:getSnapshot,reload:loadShopData,
  async addCustomer(customer:Omit<Customer,"id">){const{data,error}=await supabase.from("customers").insert({name:customer.name,mobile:customer.mobile,village:customer.village,address:customer.address,joined_on:customer.joinedOn,credit_limit:customer.creditLimit??0,status:customer.status,notes:customer.notes??null}).select().single();if(error)throw error;return after(toCustomer(data));},
  async updateCustomer(id:string,patch:Partial<Customer>){const payload:any={};if(patch.name!==undefined)payload.name=patch.name;if(patch.mobile!==undefined)payload.mobile=patch.mobile;if(patch.village!==undefined)payload.village=patch.village;if(patch.address!==undefined)payload.address=patch.address;if(patch.status!==undefined)payload.status=patch.status;if(patch.notes!==undefined)payload.notes=patch.notes??null;if(patch.creditLimit!==undefined)payload.credit_limit=patch.creditLimit;if(patch.joinedOn!==undefined)payload.joined_on=patch.joinedOn;const{error}=await supabase.from("customers").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async deleteCustomer(id:string){await supabase.from("customers").delete().eq("id",id);return after(undefined);},
  async addCustomerTransaction(entry:{customerId:string;date:string;entryType:CustomerLedgerEntry["entryType"];product:string;quantity:number;amount:number;payment:number;method:CustomerLedgerEntry["method"];remarks?:string}){const{error}=await supabase.from("customer_transactions").insert({customer_id:entry.customerId,entry_date:entry.date,entry_type:entry.entryType,product:entry.product,quantity:entry.quantity,amount:entry.amount,payment:entry.payment,method:entry.method,remarks:entry.remarks??null});if(error)throw error;return after(undefined);},
  async createKhataSale(input:{customerId:string;items:KhataSaleItemInput[];paid:number;method:CustomerLedgerEntry["method"];date?:string;remarks?:string}){const{data,error}=await supabase.rpc("create_khata_sale" as any,{_customer_id:input.customerId,_items:input.items.map(i=>({inventory_id:i.inventoryId??null,product_id:i.productId??null,product:i.product,quantity:i.quantity,unit:i.unit,rate:i.rate})),_paid:input.paid,_method:input.method,_entry_date:input.date??new Date().toISOString().slice(0,10),_remarks:input.remarks??null});if(error)throw error;return after(data as string);},
  async recordKhataPayment(input:{customerId:string;amount:number;method:CustomerLedgerEntry["method"];date?:string;remarks?:string}){const{data,error}=await supabase.rpc("record_khata_payment" as any,{_customer_id:input.customerId,_amount:input.amount,_method:input.method,_entry_date:input.date??new Date().toISOString().slice(0,10),_remarks:input.remarks??null});if(error)throw error;return after(data as string);},
  async recordSupplierPayment(input:{supplierId:string;amount:number;method:"cash"|"upi"|"bank"|"cheque";date?:string;reference?:string;remarks?:string}){const{data,error}=await supabase.rpc("record_supplier_payment" as any,{_supplier_id:input.supplierId,_amount:input.amount,_method:input.method,_entry_date:input.date??new Date().toISOString().slice(0,10),_reference:input.reference??"",_remarks:input.remarks??null});if(error)throw error;return after(data as string);},
  async fetchTransactionItems(transactionId:string):Promise<CustomerSaleItem[]>{const{data,error}=await supabase.from("customer_transaction_items").select("*").eq("transaction_id",transactionId).order("created_at");if(error)throw error;return(data??[]).map(toSaleItem);},
  async addSupplier(supplier:Omit<Supplier,"id">){const{data,error}=await supabase.from("suppliers").insert({name:supplier.name,company:supplier.company,mobile:supplier.mobile,email:supplier.email,gstin:supplier.gstin,address:supplier.address,products_supplied:supplier.productsSupplied,last_order:supplier.lastOrder||null,status:supplier.status}).select().single();if(error)throw error;return after(toSupplier(data));},
  async updateSupplier(id:string,patch:Partial<Supplier>){const payload:any={};if(patch.name!==undefined)payload.name=patch.name;if(patch.company!==undefined)payload.company=patch.company;if(patch.mobile!==undefined)payload.mobile=patch.mobile;if(patch.email!==undefined)payload.email=patch.email;if(patch.gstin!==undefined)payload.gstin=patch.gstin;if(patch.address!==undefined)payload.address=patch.address;if(patch.status!==undefined)payload.status=patch.status;if(patch.productsSupplied!==undefined)payload.products_supplied=patch.productsSupplied;const{error}=await supabase.from("suppliers").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async deleteSupplier(id:string){await supabase.from("suppliers").delete().eq("id",id);return after(undefined);},
  async addInventoryItem(item:{supplierId:string;supplierName:string;productName:string;quantity:number;unit:string;purchasePrice:number;advancePaid:number;advanceMethod:"cash"|"upi"|"bank"|"cheque";minStockLevel:number;lastUpdated:string}){const{data,error}=await supabase.rpc("record_supplier_purchase" as any,{_supplier_id:item.supplierId,_product_name:item.productName,_quantity:item.quantity,_unit:item.unit,_purchase_price:item.purchasePrice,_min_stock_level:item.minStockLevel,_entry_date:item.lastUpdated,_advance_paid:item.advancePaid,_advance_method:item.advanceMethod});if(error)throw error;return after(data as string);},
  async updateInventoryItem(id:string,patch:Partial<InventoryItem>){const payload:any={last_updated:new Date().toISOString().slice(0,10)};if(patch.productName!==undefined)payload.product_name=patch.productName;if(patch.quantity!==undefined)payload.quantity=patch.quantity;if(patch.unit!==undefined)payload.unit=patch.unit;if(patch.purchasePrice!==undefined)payload.purchase_price=patch.purchasePrice;if(patch.minStockLevel!==undefined)payload.min_stock_level=patch.minStockLevel;if(patch.status!==undefined)payload.status=patch.status;const{error}=await supabase.from("inventory_items").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async deleteInventoryItem(id:string){await supabase.from("inventory_items").delete().eq("id",id);return after(undefined);},
  setDraftProduct(draft:PublishedProduct|null){setState({draftProduct:draft});},
  async publishProduct(product:PublishedProduct){const{error}=await supabase.from("products").insert({inventory_id:product.inventoryId||null,title:product.title,category:product.category,selling_price:product.sellingPrice,discount_price:product.discountPrice??null,stock:product.stock,description:product.description,tags:product.tags,images:product.images,emoji:product.emoji,visibility:product.visibility,featured:product.featured,status:product.status,published_on:product.publishedOn});if(error)throw error;if(product.inventoryId)await supabase.from("inventory_items").update({status:"published"}).eq("id",product.inventoryId);setState({draftProduct:null});return after(undefined);},
  async updateProduct(id:string,patch:Partial<PublishedProduct>){const payload:any={};if(patch.title!==undefined)payload.title=patch.title;if(patch.category!==undefined)payload.category=patch.category;if(patch.sellingPrice!==undefined)payload.selling_price=patch.sellingPrice;if(patch.discountPrice!==undefined)payload.discount_price=patch.discountPrice??null;if(patch.stock!==undefined)payload.stock=patch.stock;if(patch.description!==undefined)payload.description=patch.description;if(patch.visibility!==undefined)payload.visibility=patch.visibility;if(patch.featured!==undefined)payload.featured=patch.featured;if(patch.status!==undefined)payload.status=patch.status;const{error}=await supabase.from("products").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async deleteProduct(id:string){await supabase.from("products").delete().eq("id",id);return after(undefined);},
  async addOrder(order:Omit<Order,"id">){const{data,error}=await supabase.from("orders").insert({code:order.code,channel:order.channel,customer_id:order.customerId??null,customer_name:order.customerName,customer_type:order.customerType,village:order.village,mobile:order.mobile,placed_on:order.placedOn,subtotal:order.subtotal,discount:order.discount,tax:order.tax,total:order.total,paid:order.paid,payment_method:order.paymentMethod,payment_status:order.paymentStatus,delivery_status:order.deliveryStatus,order_status:order.orderStatus,invoice_status:order.invoiceStatus,remarks:order.remarks??null,timeline:order.timeline}).select().single();if(error)throw error;if(order.items.length)await supabase.from("order_items").insert(order.items.map((item:any)=>({order_id:data.id,product:item.product,quantity:item.quantity,unit:item.unit,rate:item.rate,amount:item.amount})));return after(toOrder(data));},
  async updateOrder(id:string,patch:Partial<Order>){const payload:any={};if(patch.orderStatus!==undefined)payload.order_status=patch.orderStatus;if(patch.paymentStatus!==undefined)payload.payment_status=patch.paymentStatus;if(patch.deliveryStatus!==undefined)payload.delivery_status=patch.deliveryStatus;if(patch.invoiceStatus!==undefined)payload.invoice_status=patch.invoiceStatus;if(patch.paid!==undefined)payload.paid=patch.paid;if(patch.timeline!==undefined)payload.timeline=patch.timeline;const{error}=await supabase.from("orders").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async addPayment(payment:Omit<PaymentRecord,"id">){const{error}=await supabase.from("payments").insert({reference:payment.reference,direction:payment.direction,party_name:payment.partyName,entry_date:payment.date,amount:payment.amount,method:payment.method,status:payment.status,order_code:payment.orderCode??null,remarks:payment.remarks??null});if(error)throw error;return after(undefined);},
  async updateReminder(id:string,patch:Partial<Reminder>){const payload:any={};if(patch.status!==undefined)payload.status=patch.status;if(patch.message!==undefined)payload.message=patch.message;if(patch.schedule!==undefined)payload.schedule=patch.schedule;if(patch.channel!==undefined)payload.channel=patch.channel;const{error}=await supabase.from("reminders").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async updateCmsSection(id:string,patch:Partial<CmsSection>){const payload:any={};if(patch.headline!==undefined)payload.headline=patch.headline;if(patch.body!==undefined)payload.body=patch.body;if(patch.enabled!==undefined)payload.enabled=patch.enabled;if(patch.visibility!==undefined)payload.visibility=patch.visibility;if(patch.order!==undefined)payload.sort_order=patch.order;const{error}=await supabase.from("cms_sections").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async moveCmsSection(id:string,direction:-1|1){const sorted=[...state.cmsSections].sort((a,b)=>a.order-b.order);const index=sorted.findIndex(c=>c.id===id);const target=index+direction;if(index<0||target<0||target>=sorted.length)return;const current=sorted[index]!,swap=sorted[target]!;await Promise.all([supabase.from("cms_sections").update({sort_order:swap.order}).eq("id",current.id),supabase.from("cms_sections").update({sort_order:current.order}).eq("id",swap.id)]);return after(undefined);},
  async addAdvertisement(ad:Omit<Advertisement,"id"|"impressions"|"clicks">){const{error}=await supabase.from("advertisements").insert({title:ad.title,placement:ad.placement,audience:ad.audience,status:ad.status,starts_on:ad.startsOn,runs_until:ad.runsUntil});if(error)throw error;return after(undefined);},
  async updateAdvertisement(id:string,patch:Partial<Advertisement>){const payload:any={};if(patch.title!==undefined)payload.title=patch.title;if(patch.placement!==undefined)payload.placement=patch.placement;if(patch.audience!==undefined)payload.audience=patch.audience;if(patch.status!==undefined)payload.status=patch.status;if(patch.startsOn!==undefined)payload.starts_on=patch.startsOn;if(patch.runsUntil!==undefined)payload.runs_until=patch.runsUntil;const{error}=await supabase.from("advertisements").update(payload).eq("id",id);if(error)throw error;return after(undefined);},
  async deleteAdvertisement(id:string){await supabase.from("advertisements").delete().eq("id",id);return after(undefined);},
  async addBackup(name:string,destination="Cloud vault"){const{error}=await supabase.from("backups").insert({name,type:"manual",destination,status:"completed",size:"—"});if(error)throw error;return after(undefined);},
  async deleteBackup(id:string){await supabase.from("backups").delete().eq("id",id);return after(undefined);},
};

export const formatCurrency=(value:number)=>`₹${Math.round(value).toLocaleString("en-IN")}`;
export const formatDate=(value:string)=>new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
