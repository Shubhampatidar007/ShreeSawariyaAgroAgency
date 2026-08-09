import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Pause, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import type { Advertisement } from "@/types";

export const Route = createFileRoute("/admin/advertisements")({
  component: AdvertisementsPage,
});

const statusStyles: Record<string, string> = {
  live: "bg-success/15 text-success",
  scheduled: "bg-primary/10 text-primary",
  paused: "bg-warning/15 text-warning",
  expired: "bg-muted text-muted-foreground",
};

const placements = ["Homepage hero", "Category banner", "Storefront strip", "Product sidebar"];
const audiences = ["All visitors", "Repeat customers", "Wheat growers", "Dairy farmers"];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function AdvertisementsPage() {
  const ads = useShopStore((s) => s.advertisements);
  const loading = useShopStore((s) => s.loading);
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    placement: placements[0]!,
    audience: audiences[0]!,
    status: "scheduled" as Advertisement["status"],
    startsOn: today(),
    runsUntil: inDays(30),
  });

  const live = ads.filter((ad) => ad.status === "live");
  const impressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const clicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  const visible = tab === "all" ? ads : ads.filter((ad) => ad.status === tab);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      placement: placements[0]!,
      audience: audiences[0]!,
      status: "scheduled",
      startsOn: today(),
      runsUntil: inDays(30),
    });
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      placement: ad.placement,
      audience: ad.audience,
      status: ad.status,
      startsOn: ad.startsOn,
      runsUntil: ad.runsUntil,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Give the campaign a title.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await shopStore.updateAdvertisement(editing.id, form);
        toast.success("Campaign updated");
      } else {
        await shopStore.addAdvertisement(form);
        toast.success("Campaign created");
      }
      setOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (ad: Advertisement) => {
    const next = ad.status === "live" ? "paused" : "live";
    await shopStore.updateAdvertisement(ad.id, { status: next });
    toast.success(next === "live" ? "Campaign resumed" : "Campaign paused");
  };

  const remove = async (ad: Advertisement) => {
    await shopStore.deleteAdvertisement(ad.id);
    toast.success("Campaign deleted");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing"
        title="Advertisements"
        description="Banners and promotions shown across the storefront, category pages and product sidebars."
        actions={
          <Button className="rounded-full" onClick={openNew}>
            <Plus className="size-4" /> New campaign
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Live campaigns" value={String(live.length)} helper="Running right now" />
        <SummaryCard
          label="Total impressions"
          value={impressions.toLocaleString("en-IN")}
          helper="Across all placements"
        />
        <SummaryCard
          label="Average CTR"
          value={`${ctr}%`}
          helper={`${clicks.toLocaleString("en-IN")} clicks`}
        />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-primary" /> All campaigns
          </CardTitle>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="hidden md:table-cell">Placement</TableHead>
                  <TableHead className="hidden lg:table-cell">Audience</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="hidden sm:table-cell">Runs until</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      {loading
                        ? "Loading campaigns…"
                        : "No campaigns yet. Create your first one with “New campaign”."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left font-medium hover:text-primary"
                          onClick={() => openEdit(ad)}
                        >
                          {ad.title}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {ad.placement}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {ad.audience}
                      </TableCell>
                      <TableCell className="text-right">
                        {ad.impressions.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">{ad.clicks.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(ad.runsUntil)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`border-0 capitalize ${statusStyles[ad.status] ?? ""}`}
                        >
                          {ad.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={ad.status === "live" ? "Pause campaign" : "Resume campaign"}
                            onClick={() => void toggleStatus(ad)}
                          >
                            {ad.status === "live" ? (
                              <Pause className="size-4" />
                            ) : (
                              <Play className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            aria-label="Delete campaign"
                            onClick={() => void remove(ad)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit campaign" : "New campaign"}</DialogTitle>
            <DialogDescription>
              Campaigns appear on the storefront placement you choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-title">Campaign title</Label>
              <Input
                id="ad-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Kharif seed festival — 15% off"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Placement</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) => setForm({ ...form, placement: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {placements.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={form.audience}
                  onValueChange={(v) => setForm({ ...form, audience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-from">Starts on</Label>
                <Input
                  id="ad-from"
                  type="date"
                  value={form.startsOn}
                  onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-to">Runs until</Label>
                <Input
                  id="ad-to"
                  type="date"
                  value={form.runsUntil}
                  onChange={(e) => setForm({ ...form, runsUntil: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Advertisement["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
