import type { LucideIcon } from "lucide-react";

export interface AboutProfile {
  name: string;
  role: string;
  bio: string;
  contact: string;
  photoUrl: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  Icon: LucideIcon;
}
