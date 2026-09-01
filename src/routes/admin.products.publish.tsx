import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Upload } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { shopStore, useShopStore } from "@/lib/shop-store";
import type { PublishedProduct } from "@/types/business";

const MAX_IMAGE_BYTES = 1024 * 1024;

async function compressImage(file: File): Promise<Blob> {
  if (file.size <= MAX_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the image for upload");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.86;
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;

      quality -= 0.06;
      if (quality < 0.5) {
        quality = 0.78;
        width = Math.max(640, Math.round(width * 0.8));
        height = Math.max(640, Math.round(height * 0.8));
        canvas.width = width;
        canvas.height = height;
        const resizedContext = canvas.getContext("2d");
        if (!resizedContext) throw new Error("Could not resize the image");
        resizedContext.drawImage(bitmap, 0, 0, width, height);
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error("The image could not be compressed below 1 MB");
}

function imageExtension(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
}

export const Route = createFileRoute("/admin/products/publish")({
  head: () => ({
    meta: [
      { title: "Publish Product — Admin" },
      { name: "description", content: "Turn an inventory item into a customer-facing product." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublishProductPage,
});

function PublishProductPage() {
  const navigate = useNavigate();
  const inventory = useShopStore((s) => s.inventory);
  const [editId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("edit"),
  );
  const editing = Boolean(editId);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(editing);
  const [inventoryId, setInventoryId] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Fertilizers");
  const [sellingPrice, setSellingPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const [featured, setFeatured] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!editId) return;

    let cancelled = false;
    const loadProduct = async () => {
      setEditLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", editId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Product not found");

        if (cancelled) return;
        setEditingProduct(data);
        setInventoryId(data.inventory_id ?? "");
        setTitle(data.title ?? "");
        setBrand(data.brand ?? "");
        setCategory(data.category ?? "Fertilizers");
        setSellingPrice(data.selling_price == null ? "" : String(data.selling_price));
        setDiscountPrice(data.discount_price == null ? "" : String(data.discount_price));
        setDescription(data.description ?? "");
        setTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");
        setVisibility(data.visibility === "hidden" ? "hidden" : "public");
        setFeatured(Boolean(data.featured));
        setExistingImageUrl(Array.isArray(data.images) ? data.images[0] ?? "" : "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load product");
        navigate({ to: "/admin/products" });
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    };

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [editId, navigate]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const item = inventory.find((i) => i.id === inventoryId);
  const stock = item?.quantity ?? editingProduct?.stock ?? 0;
  const previewImage = imagePreview || existingImageUrl;

  const draft: PublishedProduct = {
    id: editId ?? `p${Date.now()}`,
    inventoryId,
    title: title || item?.productName || editingProduct?.title || "Untitled product",
    brand: brand.trim() || undefined,
    category,
    sellingPrice: Number(sellingPrice) || 0,
    discountPrice: discountPrice ? Number(discountPrice) : undefined,
    stock,
    description,
    tags: tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    images: previewImage ? [previewImage] : [],
    emoji: editingProduct?.emoji ?? "🌾",
    visibility,
    featured,
    status: editingProduct?.status === "archived" ? "published" : editingProduct?.status ?? "published",
    publishedOn: editingProduct?.published_on ?? new Date().toISOString().slice(0, 10),
  };

  const publish = async () => {
    if (!inventoryId || !sellingPrice) {
      toast.error("Select inventory and set a selling price");
      return;
    }

    if (!editing && (!item || item.quantity <= 0)) {
      toast.error("Selected inventory item is out of stock");
      return;
    }

    setPublishing(true);
    try {
      let imageUrl = existingImageUrl || undefined;

      if (imageFile) {
        const blob = await compressImage(imageFile);
        if (blob.size > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 1 MB");

        const path = `products/${inventoryId}/${crypto.randomUUID()}.${imageExtension(blob)}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, blob, {
            contentType: blob.type || "image/webp",
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      if (editing) {
        const { error } = await supabase
          .from("products")
          .update({
            title: draft.title,
            brand: draft.brand ?? null,
            category: draft.category,
            selling_price: draft.sellingPrice,
            discount_price: draft.discountPrice ?? null,
            description: draft.description,
            tags: draft.tags,
            images: imageUrl ? [imageUrl] : [],
            visibility: draft.visibility,
            featured: draft.featured,
            status: "published",
          } as never)
          .eq("id", editId);
        if (error) throw error;

        await shopStore.reload();
        toast.success("Product details updated");
      } else {
        await shopStore.publishProduct({
          ...draft,
          images: imageUrl ? [imageUrl] : [],
        });

        if (brand.trim()) {
          const { data: createdProduct, error: lookupError } = await supabase
            .from("products")
            .select("id")
            .eq("inventory_id", inventoryId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (lookupError) throw lookupError;

          const { error: brandError } = await supabase
            .from("products")
            .update({ brand: brand.trim() } as never)
            .eq("id", createdProduct.id);
          if (brandError) throw brandError;
        }

        toast.success("Product published to the storefront");
      }

      navigate({ to: "/admin/products" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Products", to: "/admin/products" },
          { label: editing ? "Edit" : "Publish" },
        ]}
        eyebrow="Products"
        title={editing ? "Edit product" : "Publish product"}
        description={
          editing
            ? "Update the existing storefront product, image and publishing details."
            : "Inventory → Publish → Preview → Live on the storefront."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Product details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Inventory item</Label>
              <Select value={inventoryId} onValueChange={setInventoryId} disabled={editing || editLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stock to publish" />
                </SelectTrigger>
                <SelectContent>
                  {inventory
                    .filter((i) => i.quantity > 0 || i.id === inventoryId)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.productName} · {i.quantity} {i.unit}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {editing ? (
                <p className="text-xs text-muted-foreground">
                  The inventory link is fixed for an existing product; stock stays synced from inventory.
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Product image</Label>
              <div className="rounded-lg border border-dashed border-border p-4">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  disabled={editLoading}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Maximum 1 MB after compression. JPEG, PNG and WebP are supported. Existing image is kept when no new image is selected.
                </p>
                {previewImage ? (
                  <div className="mt-3 flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
                    <img
                      src={previewImage}
                      alt="Product preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={item?.productName ?? "Product title"}
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Verified brand name"
                disabled={editLoading}
              />
              <p className="text-xs text-muted-foreground">Leave blank when the brand is unknown.</p>
            </div>
            <div className="space-y-2">
              <Label>Selling price</Label>
              <Input
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                inputMode="numeric"
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount price</Label>
              <Input
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                inputMode="numeric"
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={editLoading}>
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
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tags, categories"
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={editLoading}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Public visibility</p>
                <p className="text-xs text-muted-foreground">Show on the storefront</p>
              </div>
              <Switch
                checked={visibility === "public"}
                onCheckedChange={(checked) => setVisibility(checked ? "public" : "hidden")}
                disabled={editLoading}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Highlight in featured section</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} disabled={editLoading} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button className="rounded-full" onClick={publish} disabled={publishing || editLoading}>
                {editing ? <Pencil className="size-4" /> : <Upload className="size-4" />}
                {publishing ? "Saving…" : editing ? "Save changes" : "Publish product"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate({ to: "/admin/products" })}
                disabled={publishing}
              >
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
