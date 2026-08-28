import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export interface AboutSocialLink {
  id: string;
  label: string;
  url: string;
  Icon: LucideIcon;
}

export function SocialLinks({ links }: { links: AboutSocialLink[] }) {
  return (
    <div className="about-social-grid">
      {links.map(({ id, label, url, Icon }) => (
        <a key={id} href={url} target="_blank" rel="noopener noreferrer" className="about-social-card">
          <span className="about-social-icon"><Icon className="size-5" aria-hidden="true" /></span>
          <span className="about-social-copy">
            <strong>{label}</strong>
            <small>{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</small>
          </span>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
