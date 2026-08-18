import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, useShopStore } from "@/lib/shop-store";

export function InventoryReminderCard() {
  const inventory = useShopStore((state) => state.inventory);
  const lowStockItems = useMemo(() => inventory.filter((item) => item.quantity <= item.minStockLevel), [inventory]);

  return (
    <Card className="shadow-soft">
      <CardHeader className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><PackageCheck className="size-5 text-primary" />Inventory reminder</CardTitle>
            <CardDescription>Low-stock items that need restocking.</CardDescription>
          </div>
          <Badge variant={lowStockItems.length ? "destructive" : "outline"} className="rounded-full">{lowStockItems.length} {lowStockItems.length === 1 ? "item" : "items"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStockItems.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No products are currently at or below their minimum stock level.</div> : lowStockItems.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><AlertTriangle className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.productName}</p>
                <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} remaining · minimum {item.minStockLevel} {item.unit}</p>
                <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(item.lastUpdated)}</p>
              </div>
            </div>
          </div>
        ))}
        <Button asChild variant="outline" className="w-full rounded-full"><Link to="/admin/inventory">Open inventory</Link></Button>
      </CardContent>
    </Card>
  );
}
