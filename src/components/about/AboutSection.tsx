import { ExternalLink, Github, Instagram, Linkedin, Mail, MapPin, Pencil, Phone, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AvatarUploader } from "@/components/about/AvatarUploader";
import { AdminPanel } from "@/components/about/AdminPanel";
import { SocialLinks } from "@/components/about/SocialLinks";
import { useGithubProfile } from "@/hooks/useGithubProfile";
import type { AboutProfile, SocialLink } from "@/types/about";
import "@/components/about/about.css";

const socialLinks: SocialLink[] = [
  { id: "github", label: "GitHub", url: "https://github.com/Shubhampatidar007", Icon: Github },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/", Icon: Instagram },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/", Icon: Linkedin },
];

export function AboutSection() {
  const { profile, loading, error } = useGithubProfile("Shubhampatidar007");

  const fallback: AboutProfile = {
    name: "Shree Sawariya Agro Agency",
    role: "Agricultural supplies & local service",
    bio: "A dependable local agro-agency focused on practical products, clear availability and farmer support.",
    contact: "",
    photoUrl: "",
  };

  const display = {
    name: profile?.name || fallback.name,
    role: profile?.company || fallback.role,
    bio: profile?.bio || fallback.bio,
    photoUrl: profile?.avatar_url || fallback.photoUrl,
  };

  return (
    <main className="about-page" id="about-page">
      <section className="about-hero">
        <div className="about-hero-media" aria-hidden="true">
          <div className="about-hero-orb about-hero-orb-a" />
          <div className="about-hero-orb about-hero-orb-b" />
          <div className="about-hero-grid" />
        </div>
        <div className="about-container about-hero-inner">
          <ScrollReveal direction="up" distance={40} duration={800} blur={4}>
            <p className="about-kicker">SHREE SAWARIYA / ABOUT</p>
            <h1 className="about-display-title">
              Local trust.
              <br />
              <span>Modern storefront.</span>
            </h1>
            <p className="about-hero-copy">
              A dedicated profile page for the people, technology and story behind the store — built as a richer destination than the homepage teaser.
            </p>
            <a className="about-pill" href="#about-profile">
              Explore profile <span aria-hidden="true">↓</span>
            </a>
          </ScrollReveal>
        </div>
      </section>

      <section id="about-profile" className="about-container about-profile-grid">
        <ScrollReveal direction="right" distance={32} duration={700}>
          <div className="about-photo-frame">
            <div className="about-photo-glow" aria-hidden="true" />
            {display.photoUrl ? (
              <img src={display.photoUrl} alt={`${display.name} profile`} />
            ) : (
              <div className="about-photo-placeholder" aria-label="Profile photo placeholder">SA</div>
            )}
            <div className="about-photo-caption">
              <span>01</span>
              <span>PROFILE</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" distance={28} duration={700} delay={120}>
          <div className="about-copy-column">
            <p className="about-kicker">The person / the business</p>
            <h2>{display.name}</h2>
            <p className="about-role">{display.role}</p>
            <p className="about-body">{display.bio}</p>

            <div className="about-contact-grid">
              <div className="about-contact-item">
                <MapPin className="size-4" aria-hidden="true" />
                <span>Shree Sawariya Agro Agency</span>
              </div>
              <div className="about-contact-item">
                <Mail className="size-4" aria-hidden="true" />
                <span>Contact through the storefront</span>
              </div>
            </div>

            <div className="about-inline-meta">
              <span>{loading ? "Syncing GitHub profile…" : error ? "GitHub fallback active" : "GitHub profile connected"}</span>
              {profile?.html_url ? (
                <a href={profile.html_url} target="_blank" rel="noopener noreferrer">
                  View GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="about-tech-band" aria-label="Technology and platform stack">
        <div className="about-tech-track">
          {["React", "TypeScript", "TanStack Start", "Supabase", "Tailwind", "GitHub", "Lucide", "Responsive UI"].map((item) => (
            <span key={item} className="about-tech-item">
              <Sparkles className="size-4" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="about-container about-story-grid">
        <ScrollReveal direction="up" distance={26} duration={700}>
          <div>
            <p className="about-kicker">02 / THE STORY</p>
            <p className="about-story-lead">
              The About page is intentionally more editorial: large type, layered surfaces, subtle movement and content that can grow with the business.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="left" distance={28} duration={700} delay={120}>
          <div className="about-story-copy">
            <p>
              The homepage remains focused on shopping. This page carries the identity layer: profile information, links, technology, contact context and future media.
            </p>
            <p>
              The hero artwork is deliberately a replaceable placeholder so the final personal/business image can be swapped later without changing the page structure.
            </p>
          </div>
        </ScrollReveal>
      </section>

      <section className="about-container about-social-section">
        <ScrollReveal direction="up" distance={24} duration={700}>
          <div>
            <p className="about-kicker">03 / CONNECT</p>
            <h2 className="about-section-title">Find the work online.</h2>
          </div>
        </ScrollReveal>
        <SocialLinks links={socialLinks} />
      </section>

      <section className="about-container about-admin-section">
        <div className="about-admin-header">
          <div>
            <p className="about-kicker">04 / ADMIN</p>
            <h2 className="about-section-title">Keep the profile current.</h2>
          </div>
          <Pencil className="size-5" aria-hidden="true" />
        </div>
        <div className="about-admin-grid">
          <AdminPanel />
          <AvatarUploader />
        </div>
      </section>

      <footer className="about-footer about-container">
        <span>SHREE SAWARIYA AGRO AGENCY</span>
        <a href="/">Back to store <Phone className="size-3.5" aria-hidden="true" /></a>
      </footer>
    </main>
  );
}
