import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, imageExtension } from "@/lib/image-upload";
import type { Testimonial } from "@/types/business";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({ meta: [{ title: "Testimonials — Admin" }, { name: "robots", content: "noindex" }] }),
  component: TestimonialsPage,
});

type Draft = Testimonial & { isNew?: boolean; imageFile?: File | null; imagePreview?: string };
const IMAGE_MAX_BYTES = 200 * 1024;
const IMAGE_MAX_DIMENSION = 256;

function storagePathFromUrl(url: string) {
  const marker = "/storage/v1/object/public/testimonial-images/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

function emptyDraft(): Draft {
  return {
    id: crypto.randomUUID(),
    farmerName: "",
    farmName: "",
    content: "",
    imageUrl: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verified: false,
    isNew: true,
    imageFile: null,
    imagePreview: "",
  };
}

function looksLikeDebugData(value: string) {
  const normalized = value.toLowerCase();
  const markers = [
    "request url",
    "request method",
    "status code",
    "remote address",
    ":authority",
    "authorization",
    "user-agent",
    "sec-fetch-site",
    "/rest/v1/",
    "supabase.co/rest",
  ];
  return markers.some((marker) => normalized.includes(marker));
}

function TestimonialsPage() {
  const [items, setItems] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("testimonials") as any)
      .select("id, farmer_name, farm_name, content, image_url, created_at, updated_at, verified")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else {
      setItems(
        (data ?? []).map((row: any) => ({
          id: row.id,
          farmerName: row.farmer_name ?? "",
          farmName: row.farm_name ?? undefined,
          content: row.content ?? "",
          imageUrl: row.image_url ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          verified: !!row.verified,
          isNew: false,
          imageFile: null,
          imagePreview: "",
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (id: string, patch: Partial<Draft>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const chooseImage = (item: Draft, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    const preview = URL.createObjectURL(file);
    if (item.imagePreview) URL.revokeObjectURL(item.imagePreview);
    update(item.id, { imageFile: file, imagePreview: preview });
  };

  const removeImage = async (item: Draft) => {
    if (item.imageFile) {
      if (item.imagePreview) URL.revokeObjectURL(item.imagePreview);
      update(item.id, { imageFile: null, imagePreview: "" });
      return;
    }
    if (!item.imageUrl) return;
    const path = storagePathFromUrl(item.imageUrl);
    if (!path) {
      toast.error("Could not determine the image storage path");
      return;
    }
    const { error: storageError } = await supabase.storage
      .from("testimonial-images")
      .remove([path]);
    if (storageError) {
      toast.error(storageError.message);
      return;
    }
    const { error } = await (supabase.from("testimonials") as any)
      .update({ image_url: null })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    update(item.id, { imageUrl: undefined });
    toast.success("Photo removed");
  };

  const save = async (item: Draft) => {
    const farmerName = item.farmerName.trim();
    const content = item.content.trim();
    const farmName = item.farmName?.trim() || "";

    if (!farmerName || !content) {
      toast.error("Enter the farmer's name and feedback");
      return;
    }

    if (looksLikeDebugData(content)) {
      toast.error("Please enter the farmer's feedback, not browser/network details.");
      return;
    }

    if (item.verified && content.length < 10) {
      toast.error("Published feedback should be a little more detailed");
      return;
    }

    setSavingId(item.id);
    let uploadedPath: string | null = null;
    try {
      let imageUrl = item.imageUrl;
      if (item.imageFile) {
        const blob = await compressImage(item.imageFile, {
          maxBytes: IMAGE_MAX_BYTES,
          maxDimension: IMAGE_MAX_DIMENSION,
        });
        const path = `testimonials/${item.id}/${crypto.randomUUID()}.${imageExtension(blob)}`;
        const { error: uploadError } = await supabase.storage
          .from("testimonial-images")
          .upload(path, blob, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        uploadedPath = path;
        imageUrl = supabase.storage.from("testimonial-images").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        farmer_name: farmerName,
        farm_name: farmName || null,
        content,
        image_url: imageUrl ?? null,
        verified: item.verified,
        name: farmerName,
        location: farmName,
        crop: "",
        quote: content,
        enabled: item.verified,
      };

      const result = item.isNew
        ? await (supabase.from("testimonials") as any)
            .insert({ id: item.id, ...payload })
            .select("id, farmer_name, farm_name, content, image_url, created_at, updated_at, verified")
            .single()
        : await (supabase.from("testimonials") as any)
            .update(payload)
            .eq("id", item.id)
            .select("id, farmer_name, farm_name, content, image_url, created_at, updated_at, verified")
            .single();
      if (result.error) throw result.error;

      if (item.imageUrl && imageUrl && item.imageUrl !== imageUrl) {
        const oldPath = storagePathFromUrl(item.imageUrl);
        if (oldPath) await supabase.storage.from("testimonial-images").remove([oldPath]);
      }
      if (item.imagePreview) URL.revokeObjectURL(item.imagePreview);
      toast.success(item.verified ? "Published" : "Saved as draft");
      await load();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("testimonial-images").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Could not save testimonial");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (item: Draft) => {
    if (item.isNew) {
      if (item.imagePreview) URL.revokeObjectURL(item.imagePreview);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      return;
    }
    const { error } = await supabase.functions.invoke("delete-testimonial", { body: { id: item.id } });
    if (error) toast.error(error.message);
    else {
      toast.success("Testimonial deleted");
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Testimonials" }]}
        eyebrow="Storefront"
        title="Farmer testimonials"
        description="Add a farmer's name, their feedback, and an optional photo. Turn on Publish when it is ready for the website."
        actions={
          <Button className="rounded-full" onClick={() => setItems((current) => [emptyDraft(), ...current])}>
            <Plus className="size-4" /> Add testimonial
          </Button>
        }
      />
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading testimonials…</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No testimonials yet. Add a real farmer's feedback to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Farmer testimonial</CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch checked={item.verified} onCheckedChange={(verified) => update(item.id, { verified })} />
                    <span>{item.verified ? "Published" : "Draft"}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Farmer's name</Label>
                  <Input value={item.farmerName} onChange={(e) => update(item.id, { farmerName: e.target.value })} placeholder="Example: Ramkishan Patidar" />
                </div>
                <div className="space-y-2">
                  <Label>Farm / village <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={item.farmName ?? ""} onChange={(e) => update(item.id, { farmName: e.target.value })} placeholder="Example: Lachakhedi" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>What the farmer said</Label>
                  <Textarea rows={4} value={item.content} onChange={(e) => update(item.id, { content: e.target.value })} placeholder="Example: The products are good quality and delivery is reliable." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Farmer photo <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-border p-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {item.imagePreview || item.imageUrl ? (
                        <img src={item.imagePreview || item.imageUrl} alt={`${item.farmerName || "Farmer"} photo`} className="size-16 object-cover" width={64} height={64} />
                      ) : (
                        <ImagePlus className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium">
                        <ImagePlus className="size-4" /> Add photo
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => chooseImage(item, e.target.files?.[0])} />
                      </label>
                      {item.imageUrl || item.imageFile ? (
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => void removeImage(item)}>
                          <X className="size-4" /> Remove photo
                        </Button>
                      ) : null}
                    </div>
                    <p className="basis-full text-xs text-muted-foreground">Photo is automatically resized for fast loading.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button className="rounded-full" onClick={() => void save(item)} disabled={savingId === item.id}>
                    <Save className="size-4" /> {savingId === item.id ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => void remove(item)}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
