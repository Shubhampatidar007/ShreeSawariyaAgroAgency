import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { sendWhatsAppBatch } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/types/operations";

export const Route=createFileRoute("/admin/sales")({head:()=>({meta:[{title:"Orders & Sales — Admin"},{name:"description",content:"Track sales and automatically send customer purchase receipts after a khata sale."},{name:"robots",content:"noindex"}]}),component:SalesPage});
const orderStatuses:OrderStatus[]=["pending","confirmed","packed","shipped","delivered","cancelled","returned"];

async function autoSendPurchaseReceipt(transactionId:string){
 try{
  const state=shopStore.get();
  const entry=state.customerLedger.find(record=>record.id===transactionId);
  if(!entry)return;
  const customer=state.customers.find(item=>item.id===entry.customerId);
  if(!customer)return;
  if(!customer.mobile?.trim()){toast.warning(`Sale saved for ${customer.name}, but no WhatsApp number is available.`);return;}
  const items=await shopStore.fetchTransactionItems(transactionId);
  const itemLines=items.length?items.map(item=>`• ${item.product} — ${item.quantity} ${item.unit} × ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}`).join("\n"):`• ${entry.product}`;
  const message=`Hello ${customer.name},\n\nHere is your purchase receipt from Shree Sawariya Agro Agency.\n\nDate: ${formatDate(entry.date)}\n\nITEMS\n${itemLines}\n\nTotal: ${formatCurrency(entry.amount)}\nPaid: ${formatCurrency(entry.payment)}\nDue from this sale: ${formatCurrency(entry.remainingDue)}\nCurrent total due: ${formatCurrency(customer.currentDue)}\n\nThank you.`;
  const response=await sendWhatsAppBatch({kind:"purchase-receipt",recipients:[{id:customer.id,name:customer.name,mobile:customer.mobile,due:customer.currentDue,village:customer.village,lastPurchase:customer.lastPurchase}],message});
  if(response.ok)toast.success(`Purchase receipt automatically sent to ${customer.name}.`);else toast.error(response.note||`Receipt could not be sent to ${customer.name}.`);
 }catch(error){toast.error(error instanceof Error?`Sale saved, but receipt sending failed: ${error.message}`:"Sale saved, but receipt sending failed.")}
}

function SalesPage(){
 const orders=useShopStore(s=>s.orders),[channel,setChannel]=useState<"all"|"online"|"offline">("all"),[status,setStatus]=useState("all"),[query,setQuery]=useState(""),[active,setActive]=useState<Order|null>(null);
 const filtered=useMemo(()=>orders.filter(order=>{const channelMatch=channel==="all"||order.channel===channel,statusMatch=status==="all"||order.orderStatus===status,q=query.trim().toLowerCase(),queryMatch=!q||order.code.toLowerCase().includes(q)||order.customerName.toLowerCase().includes(q)||order.village.toLowerCase().includes(q);return channelMatch&&statusMatch&&queryMatch}),[orders,channel,status,query]);
 const revenue=orders.reduce((sum,order)=>sum+order.total,0),collected=orders.reduce((sum,order)=>sum+order.paid,0),pendingDeliveries=orders.filter(order=>order.deliveryStatus==="scheduled"||order.deliveryStatus==="out-for-delivery").length;
 return <div className="space-y-6">
  <ModulePageHeader crumbs={[{label:"Admin",to:"/admin"},{label:"Orders & Sales"}]} eyebrow="Operations" title="Orders & sales" description="Record sales in khata. After a customer purchase is saved, its WhatsApp receipt is sent automatically." actions={<div className="flex flex-wrap items-center gap-2"><KhataSaleDialog trigger={<Button className="rounded-full"><ShoppingBag className="size-4"/>New Khata Sale</Button>} onCreated={transactionId=>void autoSendPurchaseReceipt(transactionId)}/><ExportMenu/></div>}/>
  <SummaryCards items={[{label:"Order value",value:formatCurrency(revenue),icon:IndianRupee},{label:"Payments collected",value:formatCurrency(collected),icon:WalletCards,tone:"success"},{label:"Outstanding",value:formatCurrency(revenue-collected),icon:IndianRupee,tone:"warning"},{label:"Pending deliveries",value:String(pendingDeliveries),icon:Truck}]}/>
  <Tabs value={channel} onValueChange={value=>setChannel(value as typeof channel)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="online">Online orders</TabsTrigger><TabsTrigger value="offline">Offline counter</TabsTrigger></TabsList></Tabs>
  <SearchToolbar value={query} onChange={setQuery} placeholder="Search order, customer or village"><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44 rounded-full"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{orderStatuses.map(value=><SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></SearchToolbar>
  {filtered.length===0?<EmptyState icon={ShoppingBag} title="No orders" description="No sales match the current filters."/>:<Card className="shadow-soft"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Payment</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map(order=><TableRow key={order.id}><TableCell><p className="font-semibold">{order.code}</p><p className="text-xs text-muted-foreground">{formatDate(order.placedOn)}</p></TableCell><TableCell><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.village} · {order.customerType}</p></TableCell><TableCell className="text-right">{order.items.length}</TableCell><TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell><TableCell><StatusBadge status={order.paymentStatus}/></TableCell><TableCell className="text-xs capitalize text-muted-foreground">{order.deliveryStatus.replace(/-/g," ")}</TableCell><TableCell><Badge variant="outline" className="rounded-full capitalize">{order.orderStatus}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" className="rounded-full" onClick={()=>setActive(order)}>View</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
  <Dialog open={Boolean(active)} onOpenChange={open=>!open&&setActive(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">{active&&<><DialogHeader><DialogTitle>{active.code}</DialogTitle><DialogDescription>{active.customerName} · {active.village} · {formatDate(active.placedOn)}</DialogDescription></DialogHeader><div className="space-y-5"><div className="grid gap-2 sm:grid-cols-5">{orderStatuses.slice(0,5).map(value=><Button key={value} size="sm" variant={active.orderStatus===value?"default":"outline"} className="rounded-full capitalize" onClick={()=>{void shopStore.updateOrder(active.id,{orderStatus:value});setActive({...active,orderStatus:value})}}>{value}</Button>)}</div><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{active.items.map(line=><TableRow key={line.id}><TableCell>{line.product}</TableCell><TableCell className="text-right">{line.quantity} {line.unit}</TableCell><TableCell className="text-right">{formatCurrency(line.rate)}</TableCell><TableCell className="text-right">{formatCurrency(line.amount)}</TableCell></TableRow>)}</TableBody></Table><div className="grid gap-2 rounded-xl border bg-muted/40 p-4 text-sm"><Row label="Subtotal" value={formatCurrency(active.subtotal)}/><Row label="Discount" value={`- ${formatCurrency(active.discount)}`}/><Row label="Tax" value={formatCurrency(active.tax)}/><Row label="Total" value={formatCurrency(active.total)} bold/><Row label="Paid" value={formatCurrency(active.paid)}/><Row label="Balance" value={formatCurrency(active.total-active.paid)} bold/></div><Timeline items={active.timeline.map(event=>({id:event.id,title:event.label,meta:formatDate(event.at),...(event.note?{description:event.note}:{})}))}/></div></>}</DialogContent></Dialog>
 </div>
}
function Row({label,value,bold}:{label:string;value:string;bold?:boolean}){return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className={bold?"font-semibold":""}>{value}</span></div>}
