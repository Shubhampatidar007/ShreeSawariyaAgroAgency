import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { shopInfo } from "@/data/storefront";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const profileSchema = z.object({
  shopName: z.string().min(3, "Shop name is required"),
  phone: z.string().min(10, "Enter a valid contact number"),
  email: z.string().email("Enter a valid email address"),
  gstin: z.string().min(15, "GSTIN must be 15 characters").max(15, "GSTIN must be 15 characters"),
  address: z.string().min(10, "Enter the full shop address"),
});

type ProfileValues = z.infer<typeof profileSchema>;

function SettingsPage() {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      shopName: shopInfo.name,
      phone: shopInfo.phone,
      email: shopInfo.email,
      gstin: "06ABCDE1234F1Z5",
      address: shopInfo.address,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Shop identity, billing defaults, notifications and staff access preferences."
      />

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Shop profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(() => toast.success("Shop profile saved"))}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <FormField
                    control={form.control}
                    name="shopName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>Printed on every tax invoice.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Shop address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2">
                    <Separator className="mb-5" />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" className="rounded-full">
                        Save changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => form.reset()}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <SettingsToggleCard
            title="Billing defaults"
            rows={[
              { id: "roundoff", label: "Round off bill totals", helper: "Nearest rupee on every invoice", on: true },
              { id: "khata", label: "Allow khata (credit) billing", helper: "Staff can bill against customer credit", on: true },
              { id: "batch", label: "Print batch and expiry", helper: "Mandatory for pesticide sales", on: true },
              { id: "discount", label: "Allow counter discount", helper: "Up to 5% without owner approval", on: false },
            ]}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <SettingsToggleCard
            title="Alerts and reminders"
            rows={[
              { id: "lowstock", label: "Low stock alerts", helper: "Notify when stock falls below reorder level", on: true },
              { id: "duekhata", label: "Khata due reminders", helper: "Weekly SMS to customers with pending dues", on: true },
              { id: "expiry", label: "Expiry warnings", helper: "60 days before product expiry", on: true },
              { id: "daily", label: "Daily sales summary", helper: "WhatsApp digest at 9 PM", on: false },
            ]}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SettingsToggleCard
            title="Access and security"
            rows={[
              { id: "2fa", label: "Two-factor authentication", helper: "OTP on every owner login", on: true },
              { id: "device", label: "Approve new devices", helper: "Owner must authorise unknown devices", on: true },
              { id: "session", label: "Auto sign-out idle staff", helper: "After 30 minutes of inactivity", on: true },
              { id: "audit", label: "Detailed audit trail", helper: "Record field-level changes", on: false },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ToggleRow = { id: string; label: string; helper: string; on: boolean };

function SettingsToggleCard({ title, rows }: { title: string; rows: ToggleRow[] }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <Label htmlFor={row.id} className="text-sm font-medium">
                {row.label}
              </Label>
              <p className="text-xs text-muted-foreground">{row.helper}</p>
            </div>
            <Switch
              id={row.id}
              defaultChecked={row.on}
              onCheckedChange={() => toast.success(`${row.label} updated`)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}