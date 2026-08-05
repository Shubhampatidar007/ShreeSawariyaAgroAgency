import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { AdminProductCard } from "@/components/shared/EntityCards";
import { shopStore, useShopStore } from "@/lib/shop-store";
import type { PublishedProduct } from "@/types/business";

export const Route = createFileRoute("/admin/products/publish")({
  head: () => ({
    meta: [
      { title: "Publish Product — AgriKisan Admin" },
      { name: "description", content: "Turn an inventory item into a customer-facing product." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublishProductPage,
});

function PublishProductPage() {
  const navigate = useNavigate();
  const inventory = useShopStore((s) => s.inventory);
  const [inventoryId, setInventoryId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Fertilizers");
  const [sellingPrice, setSellingPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const [featured, setFeatured] = useState(false);

  const item = inventory.find((i) => i.id === inventoryId);

  const draft: PublishedProduct = {
    id: `p${Date.now()}`,
    inventoryId,
    title: title || item?.productName || "Untitled product",
    category,
    sellingPrice: Number(sellingPrice) || 0,
    discountPrice: discountPrice ? Number(discountPrice) : undefined,
    stock: item?.quantity ?? 0,
    description,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    images: [],
    emoji: "🌾",
    visibility,
    featured,
    status: "published",
    publishedOn: new Date().toISOString().slice(0, 10),
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Products", to: "/admin/products" },
          { label: "Publish" },
        ]}
        eyebrow="Products"
        title="Publish product"
        description="Inventory → Publish → Preview → Live on the storefront."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Product details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Inventory item</Label>
              <Select value={inventoryId} onValueChange={setInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stock to publish" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.productName} · {i.quantity} {i.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={item?.productName ?? "Product title"} />
            </div>
            <div className="space-y-2">
              <Label>Selling price</Label>
              <Input value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Discount price</Label>
              <Input value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Seeds">Seeds</SelectItem>
                  <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                  <SelectItem value="Pesticides">Pesticides</SelectItem>
                  <SelectItem value="Tools">Tools</SelectItem>
                  <SelectItem value="Irrigation">Irrigation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kharif, urea" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Public visibility</p>
                <p className="text-xs text-muted-foreground">Show on the storefront</p>
              </div>
              <Switch
                checked={visibility === "public"}
                onCheckedChange={(checked) => setVisibility(checked ? "public" : "hidden")}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Highlight in featured section</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                className="rounded-full"
                onClick={() => {
                  if (!inventoryId || !sellingPrice) {
                    toast.error("Select inventory and set a selling price");
                    return;
                  }
                  shopStore.publishProduct(draft);
                  toast.success("Product published to the storefront");
                  navigate({ to: "/admin/products" });
                }}
              >
                Publish product
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/admin/products" })}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Live preview</p>
          <AdminProductCard product={draft} />
        </div>
      </div>
    </div>
  );
}