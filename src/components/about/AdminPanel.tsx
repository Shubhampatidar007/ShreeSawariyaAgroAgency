import { useEffect, useState } from "react";
import { Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { aboutProfileStore, useAboutProfile } from "@/lib/about-profile-store";

export function AdminPanel() {
  const profile = useAboutProfile();
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);
  const [contact, setContact] = useState(profile.contact);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setRole(profile.role);
    setBio(profile.bio);
    setContact(profile.contact);
  }, [profile.name, profile.role, profile.bio, profile.contact]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      aboutProfileStore.setProfile({
        ...profile,
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        contact: contact.trim(),
      });
      toast.success("About profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="about-admin-card">
      <div className="about-form-grid">
        <div className="space-y-2">
          <Label htmlFor="about-name">Name</Label>
          <Input id="about-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about-role">Role</Label>
          <Input id="about-role" value={role} onChange={(event) => setRole(event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="about-bio">Bio</Label>
          <Textarea id="about-bio" rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="about-contact">Contact</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="about-contact" value={contact} onChange={(event) => setContact(event.target.value)} className="pl-9" placeholder="Phone or email" />
          </div>
        </div>
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving} className="mt-5 rounded-full">
        <Save className="size-4" aria-hidden="true" />
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
