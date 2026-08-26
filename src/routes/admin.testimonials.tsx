import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Testimonial } from "@/types/business";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({ meta: [{ title: "Testimonials — Admin" }, { name: "robots", content: "noindex" }] }),
  component: TestimonialsPage,
});

type Draft = Testimonial & { isNew?: boolean };

function TestimonialsPage() {
  const [items, setItems] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("testimonials").select("id, name, location, crop, quote, enabled").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Draft[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const update = (id: string, patch: Partial<Draft>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const save = async (item: Draft) => {
    if (!item.name.trim() || !item.quote.trim()) {
      toast.error("Name and real quote are required");
      return;
    }
    const payload = { name: item.name.trim(), location: item.location.trim(), crop: item.crop.trim(), quote: item.quote.trim(), enabled: item.enabled };
    const result = item.isNew
      ? await supabase.from("testimonials").insert(payload).select("id, name, location, crop, quote, enabled").single()
      : await supabase.from("testimonials").update(payload).eq("id", item.id).select("id, name, location, crop, quote, enabled").single();
    if (result.error) toast.error(result.error.message);
    else { toast.success("Testimonial saved"); await load(); }
  };

  const remove = async (item: Draft) => {
    if (item.isNew) { setItems((current) => current.filter((entry) => entry.id !== item.id)); return; }
    const { error } = await supabase.from("testimonials").delete().eq("id", item.id);
    if (error) toast.error(error.message); else { toast.success("Testimonial removed"); await load(); }
  };

  return <div className="space-y-6">
    <ModulePageHeader crumbs={[{ label: "Admin", to: "/admin" }, { label: "Testimonials" }]} eyebrow="Storefront" title="Verified farmer testimonials" description="Only testimonials entered from real, verified feedback should be enabled for the public homepage." actions={<Button className="rounded-full" onClick={() => setItems((current) => [{ id: `new-${Date.now()}`, name: "", location: "", crop: "", quote: "", enabled: false, isNew: true }, ...current])}><Plus className="size-4" /> Add testimonial</Button>} />
    {loading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading testimonials…</CardContent></Card> : items.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No testimonials stored yet. Add real feedback only.</CardContent></Card> : <div className="space-y-4">{items.map((item) => <Card key={item.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Testimonial</CardTitle><div className="flex items-center gap-2 text-sm"><Switch checked={item.enabled} onCheckedChange={(enabled) => update(item.id, { enabled })} /><span>{item.enabled ? "Published" : "Hidden"}</span></div></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Name</Label><Input value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} placeholder="Real farmer name" /></div>
      <div className="space-y-2"><Label>Location</Label><Input value={item.location} onChange={(e) => update(item.id, { location: e.target.value })} placeholder="Real location" /></div>
      <div className="space-y-2"><Label>Crop</Label><Input value={item.crop} onChange={(e) => update(item.id, { crop: e.target.value })} placeholder="Real crop" /></div>
      <div className="space-y-2 sm:col-span-2"><Label>Real quote</Label><Textarea rows={4} value={item.quote} onChange={(e) => update(item.id, { quote: e.target.value })} placeholder="Paste the farmer's verified feedback" /></div>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button className="rounded-full" onClick={() => void save(item)}><Save className="size-4" /> Save</Button><Button variant="outline" className="rounded-full" onClick={() => void remove(item)}><Trash2 className="size-4" /> Delete</Button></div>
    </CardContent></Card>)}</div>}
  </div>;
}
