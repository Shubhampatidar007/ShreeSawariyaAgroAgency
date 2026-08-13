import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { authStore, useAuth } from "@/lib/auth-store";
import { shopInfo } from "@/data/storefront";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Admin" },
      { name: "description", content: "Manage your Agrishop account profile and business contact details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [village, setVillage] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setMobile(user?.mobile ?? "");
    setVillage(user?.village ?? "");
  }, [user?.id, user?.name, user?.mobile, user?.village]);

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const result = await authStore.updateProfile({ name, mobile, village });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Profile updated");
  };

  const updatePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    const result = await authStore.changePassword(password);
    setChangingPassword(false);
    if (!result.ok) return toast.error(result.error);
    setPassword("");
    toast.success("Password updated");
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Profile" }]}
        eyebrow="Account"
        title="Your profile"
        description="Keep your operator details current. These values are stored in the Supabase profile record used by the admin panel."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" /> Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="profile-email" value={user?.email ?? ""} disabled className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-mobile">Mobile</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="profile-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-village">Village / area</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="profile-village" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village or area" className="pl-9" />
                </div>
              </div>
            </div>
            <Button className="rounded-full" onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Role" value={user?.role === "admin" ? "Owner / Admin" : user?.role ?? "—"} />
              <InfoRow label="Account ID" value={user?.id ?? "—"} mono />
              <Separator />
              <p className="text-xs text-muted-foreground">Role is managed from the database and is not editable from this page.</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> Business
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Shop" value={shopInfo.name} />
              <InfoRow label="Phone" value={shopInfo.phone} />
              <InfoRow label="Email" value={shopInfo.email} />
              <InfoRow label="Address" value={shopInfo.address} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => void updatePassword()} disabled={changingPassword}>
            {changingPassword ? "Updating…" : "Update password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
