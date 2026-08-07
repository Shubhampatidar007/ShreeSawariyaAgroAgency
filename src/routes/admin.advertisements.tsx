import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { advertisements } from "@/data/admin";

export const Route = createFileRoute("/admin/advertisements")({
  component: AdvertisementsPage,
});

const statusStyles: Record<string, string> = {
  live: "bg-success/15 text-success",
  scheduled: "bg-primary/10 text-primary",
  paused: "bg-warning/15 text-warning",
  expired: "bg-muted text-muted-foreground",
};

function AdvertisementsPage() {
  const live = advertisements.filter((ad) => ad.status === "live");
  const impressions = advertisements.reduce((sum, ad) => sum + ad.impressions, 0);
  const clicks = advertisements.reduce((sum, ad) => sum + ad.clicks, 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing"
        title="Advertisements"
        description="Banners and promotions shown across the storefront, category pages and product sidebars."
        actions={
          <Button className="rounded-full">
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
        <SummaryCard label="Average CTR" value={`${ctr}%`} helper={`${clicks.toLocaleString("en-IN")} clicks`} />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-primary" /> All campaigns
          </CardTitle>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisements.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">{ad.title}</TableCell>
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
                      {ad.runsUntil}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`border-0 capitalize ${statusStyles[ad.status]}`}>
                        {ad.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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