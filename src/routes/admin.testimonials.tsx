import { useEffect, useState } from "react";
import { BadgeCheck, ImagePlus, Plus, Save, Trash2, Upload } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";

type AdminTestimonial = {
  id: string;
  farmerName: string;
  farmName: string;
  location: string;
  crop: string;
  content: string;
  imageUrl: string;
  verified: boolean;
  enabled: boolean;
  isNew?: boolean;
};

const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_TESTIMONIALS = 3;

async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a JPG, PNG or WebP image");
  if (file.size <= MAX_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  let width = Math.max(1, bitmap.width);
  let height = Math.max(1, bitmap.height);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the image");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  try {
    let quality = 0.84;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
      quality -= 0.06;
      if (quality < 0.5) {
        quality = 0.78;
        width = Math.max(480, Math.round(width * 0.82));
        height = Math.max(480, Math.round(height * 0.82));
        canvas.width = width;
        canvas.height = height;
        context.drawImage(bitmap, 0, 0, width, height);
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error("Image could not be compressed below 200 KB");
}

function getStoragePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/testimonial-images/";
  const index = imageUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(imageUrl.slice(index + marker.length)) : null;
}

function mapRow(row: any): AdminTestimonial {
  return {
    id: row.id,
    farmerName: row.farmer_name ?? row.name ?? "",
    farmName: row.farm_name ?? "",
    location: row.location ?? "",
    crop: row.crop ?? "",
    content: row.content ?? row.quote ?? "",
    imageUrl: row.image_url ?? "",
    verified: Boolean(row.verified),
    enabled: Boolean(row.enabled),
  };
}

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("testimonials" as any)
      .select("id, name, location, crop, quote, enabled, farmer_name, farm_name, content, image_url, verified, created_at")
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    else setItems((data ?? []).map(mapRow));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (id: string, patch: Partial<AdminTestimonial>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const publicCount = items.filter((item) => item.enabled && item.verified).length;
  const atRecordLimit = items.length >= MAX_TESTIMONIALS;
  const canPublish = (item: AdminTestimonial, nextEnabled: boolean, nextVerified: boolean) =>
    !item.isNew && item.enabled && item.verified
      ? true
      : !(nextEnabled && nextVerified && publicCount >= MAX_TESTIMONIALS);

  const handleEnabledChange = (item: AdminTestimonial, enabled: boolean) => {
    if (!canPublish(item, enabled, item.verified)) {
      toast.error("Only 3 published and verified testimonials are allowed on the homepage");
      return;
    }
    update(item.id, { enabled });
  };

  const handleVerifiedChange = (item: AdminTestimonial, verified: boolean) => {
    if (!canPublish(item, item.enabled, verified)) {
      toast.error("Only 3 published and verified testimonials are allowed on the homepage");
      return;
    }
    update(item.id, { verified });
  };

  const handleImage = (id: string, file: File | null) => {
    const previousPreview = imagePreviews[id];
    if (previousPreview) URL.revokeObjectURL(previousPreview);

    setImageFiles((current) => ({ ...current, [id]: file }));
    setImagePreviews((current) => ({
      ...current,
      [id]: file ? URL.createObjectURL(file) : "",
    }));
  };

  const save = async (item: AdminTestimonial) => {
    if (!item.farmerName.trim() || !item.content.trim()) {
      toast.error("Farmer name and testimonial content are required");
      return;
    }

    if (item.enabled && item.verified && !canPublish(item, true, true)) {
      toast.error("Only 3 published and verified testimonials are allowed on the homepage");
      return;
    }

    setSavingId(item.id);
    try {
      const payload = {
        name: item.farmerName.trim(),
        farmer_name: item.farmerName.trim(),
        farm_name: item.farmName.trim(),
        location: item.location.trim(),
        crop: item.crop.trim(),
        quote: item.content.trim(),
        content: item.content.trim(),
        image_url: item.imageUrl.trim(),
        verified: item.verified,
        enabled: item.enabled,
      };

      let testimonialId = item.id;
      let uploadedPath: string | null = null;

      if (item.isNew) {
        testimonialId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from("testimonials" as any)
          .insert({ ...payload, id: testimonialId })
          .select("id")
          .single();
        if (insertError) throw insertError;
      }

      const imageFile = imageFiles[item.id];
      let imageUrl = item.imageUrl;

      if (imageFile) {
        const blob = await prepareImage(imageFile);
        uploadedPath = `testimonials/${testimonialId}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("testimonial-images")
          .upload(uploadedPath, blob, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        imageUrl = supabase.storage
          .from("testimonial-images")
          .getPublicUrl(uploadedPath).data.publicUrl;
      }

      if (item.isNew || imageUrl !== item.imageUrl) {
        const result = await supabase
          .from("testimonials" as any)
          .update({ image_url: imageUrl.trim() })
          .eq("id", testimonialId)
          .select("id")
          .single();
        if (result.error) {
          if (uploadedPath) {
            await supabase.storage.from("testimonial-images").remove([uploadedPath]);
          }
          throw result.error;
        }

        if (!item.isNew) {
          const result = await supabase
            .from("testimonials" as any)
            .update(payload)
            .eq("id", testimonialId)
            .select("id")
            .single();
          if (result.error) throw result.error;
        }
      } else {
        const result = await supabase
          .from("testimonials" as any)
          .update(payload)
          .eq("id", testimonialId)
          .select("id")
          .single();
        if (result.error) throw result.error;
      }

      toast.success("Testimonial saved");
      setImageFiles((current) => ({ ...current, [item.id]: null }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save testimonial");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (item: AdminTestimonial) => {
    if (item.isNew) {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      return;
    }

    setSavingId(item.id);
    try {
      const { error } = await supabase.from("testimonials" as any).delete().eq("id", item.id);
      if (error) throw error;

      const previousPath = getStoragePath(item.imageUrl);
      if (previousPath) {
        await supabase.storage.from("testimonial-images").remove([previousPath]);
      }

      toast.success("Testimonial removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove testimonial");
    } finally {
      setSavingId(null);
    }
  };

  const addNew = () => {
    if (atRecordLimit) {
      toast.error("You can keep a maximum of 3 testimonials");
      return;
    }

    const id = crypto.randomUUID();
    setItems((current) => [
      {
        id,
        farmerName: "",
        farmName: "",
        location: "",
        crop: "",
        content: "",
        imageUrl: "",
        verified: false,
        enabled: false,
        isNew: true,
      },
      ...current,
    ]);
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Testimonials" }]}
        eyebrow="Storefront"
        title="Farmer testimonials"
        description="Enter the verified farmer, farm, story and image data that the public storefront reads from Supabase."
        actions={(
          <Button className="rounded-full" onClick={addNew} disabled={atRecordLimit}>
            <Plus className="size-4" />
            {atRecordLimit ? "3 testimonials max" : "Add testimonial"}
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <div>
          <span className="font-medium">Homepage limit</span>
          <span className="ml-2 text-muted-foreground">Maximum 3 published + verified testimonials</span>
        </div>
        <span className="font-semibold text-primary">{publicCount}/{MAX_TESTIMONIALS} published</span>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">Loading testimonials…</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <ImagePlus className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No testimonials yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add real farmer feedback and its photo to publish it on the homepage.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const preview = imagePreviews[item.id] || item.imageUrl;
            const saving = savingId === item.id;

            return (
              <Card key={item.id} className="overflow-hidden shadow-soft">
                <CardHeader className="border-b border-border/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">{item.farmerName || "New testimonial"}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Supabase fields are mapped directly on save.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                        <BadgeCheck className="size-4 text-primary" />
                        <span>Verified</span>
                        <Switch checked={item.verified} onCheckedChange={(verified) => handleVerifiedChange(item, verified)} />
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                        <span>{item.enabled ? "Published" : "Hidden"}</span>
                        <Switch checked={item.enabled} onCheckedChange={(enabled) => handleEnabledChange(item, enabled)} />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
                  <div className="space-y-3">
                    <Label>Farmer photo</Label>
                    <div className="overflow-hidden rounded-3xl border border-border bg-muted/30">
                      {preview ? (
                        <img src={preview} alt={item.farmerName || "Farmer testimonial"} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                          <ImagePlus className="size-8" />
                          <span className="px-4 text-xs">Add a real farmer photo</span>
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => handleImage(item.id, event.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP · stored in testimonial-images · max 200 KB after compression.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Farmer name</Label>
                      <Input value={item.farmerName} onChange={(event) => update(item.id, { farmerName: event.target.value })} placeholder="Real farmer name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Farm / village</Label>
                      <Input value={item.farmName} onChange={(event) => update(item.id, { farmName: event.target.value })} placeholder="Farm or village" />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={item.location} onChange={(event) => update(item.id, { location: event.target.value })} placeholder="Location shown publicly" />
                    </div>
                    <div className="space-y-2">
                      <Label>Crop</Label>
                      <Input value={item.crop} onChange={(event) => update(item.id, { crop: event.target.value })} placeholder="Crop, optional" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Testimonial content</Label>
                      <Textarea rows={5} value={item.content} onChange={(event) => update(item.id, { content: event.target.value })} placeholder="Enter the farmer's real feedback" />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button className="rounded-full" onClick={() => void save(item)} disabled={saving}>
                        <Save className="size-4" />
                        {saving ? "Saving…" : "Save testimonial"}
                      </Button>
                      <Button variant="outline" className="rounded-full" onClick={() => void remove(item)} disabled={saving}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                      {item.enabled && item.verified ? (
                        <div className="ml-auto flex items-center gap-2 self-center text-xs text-muted-foreground">
                          <Upload className="size-4" />
                          Ready for public homepage
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
