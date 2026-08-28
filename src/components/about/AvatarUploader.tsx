import { ChangeEvent, useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { aboutProfileStore, useAboutProfile } from "@/lib/about-profile-store";

const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const profile = useAboutProfile();

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPG or WebP image");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Please choose an image smaller than 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      aboutProfileStore.setProfile({ ...profile, photoUrl: reader.result });
      toast.success("Profile photo updated");
    };
    reader.onerror = () => toast.error("Unable to read the selected image");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="about-admin-card about-avatar-card">
      <div>
        <p className="about-kicker">Profile media</p>
        <h3 className="about-admin-card-title">Personal photo</h3>
        <p className="about-admin-help">Temporary browser upload. Replace with Supabase Storage when the public admin media flow is ready.</p>
      </div>
      <div className="about-avatar-upload-row">
        <div className="about-avatar-preview">
          {profile.photoUrl ? <img src={profile.photoUrl} alt="Current admin profile" /> : <ImagePlus className="size-6" aria-hidden="true" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-full" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden="true" /> Upload photo
          </Button>
          {profile.photoUrl ? (
            <Button type="button" variant="outline" className="rounded-full" onClick={() => aboutProfileStore.setProfile({ ...profile, photoUrl: "" })}>
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} aria-label="Upload profile photo" />
    </div>
  );
}
