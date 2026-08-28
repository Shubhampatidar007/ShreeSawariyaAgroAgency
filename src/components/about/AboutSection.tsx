import { useLayoutEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ExternalLink,
  Github,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AvatarUploader } from "@/components/about/AvatarUploader";
import { AdminPanel } from "@/components/about/AdminPanel";
import { SocialLinks } from "@/components/about/SocialLinks";
import { useGithubProfile } from "@/hooks/useGithubProfile";
import { useAboutProfile } from "@/lib/about-profile-store";
import type { AboutProfile, SocialLink } from "@/types/about";
import "@/components/about/about.css";

gsap.registerPlugin(ScrollTrigger);

const socialLinks: SocialLink[] = [
  { id: "github", label: "GitHub", url: "https://github.com/Shubhampatidar007", Icon: Github },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/", Icon: Instagram },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/", Icon: Linkedin },
];

const stackItems = [
  "React",
  "TypeScript",
  "TanStack Start",
  "Supabase",
  "Tailwind",
  "GitHub",
  "Lucide",
  "Responsive UI",
];

const aboutTextSelector = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,label";

export function AboutSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroMediaRef = useRef<HTMLDivElement | null>(null);
  const heroGridRef = useRef<HTMLDivElement | null>(null);
  const heroShineRef = useRef<HTMLDivElement | null>(null);
  const heroLineRefs = useRef<HTMLSpanElement[]>([]);
  const heroCopyRef = useRef<HTMLParagraphElement | null>(null);
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const heroCueRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const profileCopyRef = useRef<HTMLDivElement | null>(null);
  const techRef = useRef<HTMLElement | null>(null);
  const techTrackRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const storyLeadRef = useRef<HTMLParagraphElement | null>(null);
  const storyCopyRef = useRef<HTMLDivElement | null>(null);
  const socialRef = useRef<HTMLElement | null>(null);
  const socialTitleRef = useRef<HTMLHeadingElement | null>(null);
  const socialGridRef = useRef<HTMLDivElement | null>(null);
  const adminRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  const { profile: githubProfile, loading: githubLoading, error: githubError } =
    useGithubProfile("Shubhampatidar007");
  const localProfile = useAboutProfile();

  const fallback: AboutProfile = {
    name: "Shree Sawariya Agro Agency",
    role: "Agricultural supplies & local service",
    bio: "A dependable local agro-agency focused on practical products, clear availability and farmer support.",
    contact: "",
    photoUrl: "",
  };

  const display = {
    name: localProfile.name || githubProfile?.name || fallback.name,
    role: localProfile.role || githubProfile?.company || fallback.role,
    bio: localProfile.bio || githubProfile?.bio || fallback.bio,
    photoUrl: localProfile.photoUrl || githubProfile?.avatar_url || fallback.photoUrl,
    contact: localProfile.contact || fallback.contact,
  };

  const setHeroLineRef = (node: HTMLSpanElement | null) => {
    if (node && !heroLineRefs.current.includes(node)) heroLineRefs.current.push(node);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const heroMedia = heroMediaRef.current;
    const heroGrid = heroGridRef.current;
    const heroShine = heroShineRef.current;
    const heroLines = heroLineRefs.current;
    const heroCopy = heroCopyRef.current;
    const heroCta = heroCtaRef.current;
    const heroCue = heroCueRef.current;
    const profile = profileRef.current;
    const photo = photoRef.current;
    const profileCopy = profileCopyRef.current;
    const tech = techRef.current;
    const techTrack = techTrackRef.current;
    const story = storyRef.current;
    const storyLead = storyLeadRef.current;
    const storyCopy = storyCopyRef.current;
    const social = socialRef.current;
    const socialTitle = socialTitleRef.current;
    const socialGrid = socialGridRef.current;
    const admin = adminRef.current;
    const footer = footerRef.current;
    const progress = progressRef.current;

    if (
      !root ||
      !hero ||
      !heroMedia ||
      !heroGrid ||
      !heroShine ||
      heroLines.length < 2 ||
      !heroCopy ||
      !heroCta ||
      !heroCue ||
      !profile ||
      !photo ||
      !profileCopy ||
      !tech ||
      !techTrack ||
      !story ||
      !storyLead ||
      !storyCopy ||
      !social ||
      !socialTitle ||
      !socialGrid ||
      !admin ||
      !footer ||
      !progress
    ) {
      return undefined;
    }

    root.querySelectorAll<HTMLElement>(aboutTextSelector).forEach((element) => {
      element.dataset.textReveal = "done";
    });

    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion) {
        gsap.set([heroLines, heroCopy, heroCta, heroCue, heroMedia, heroGrid, heroShine, photo, profileCopy, storyLead, storyCopy, socialTitle, socialGrid.children, admin, footer], {
          clearProps: "all",
        });
        return;
      }

      const setProgress = gsap.quickSetter(progress, "scaleY");

      gsap.set(heroLines, { yPercent: 110, opacity: 0, rotateX: 18 });
      gsap.set([heroCopy, heroCta, heroCue], { y: 36, opacity: 0 });

      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      intro
        .to(heroLines, { yPercent: 0, opacity: 1, rotateX: 0, duration: 1.1, stagger: 0.1 })
        .to(heroCopy, { y: 0, opacity: 1, duration: 0.72 }, "-=0.55")
        .to(heroCta, { y: 0, opacity: 1, duration: 0.62 }, "-=0.42")
        .to(heroCue, { y: 0, opacity: 0.65, duration: 0.45 }, "-=0.24");

      const heroScroll = ScrollTrigger.create({
        id: "about-hero-scroll",
        trigger: hero,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 1.35)}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          gsap.set(heroMedia, {
            scale: 1 + p * 0.42,
            yPercent: p * 12,
            rotation: p * -1.8,
          });
          gsap.set(heroGrid, {
            xPercent: p * -18,
            yPercent: p * -24,
            rotation: p * -7,
            scale: 1 + p * 0.13,
            opacity: 0.35 - p * 0.22,
          });
          gsap.set(heroShine, {
            xPercent: p * -30,
            yPercent: p * 35,
            scale: 1 + p * 0.7,
            opacity: 0.7 - p * 0.64,
          });
          gsap.set(heroLines[0], {
            yPercent: p * -52,
            xPercent: p * -9,
            scale: 1 - p * 0.32,
            opacity: 1 - p * 0.9,
          });
          gsap.set(heroLines[1], {
            yPercent: p * -28,
            xPercent: p * 7,
            scale: 1 - p * 0.18,
            opacity: 0.72 - p * 0.45,
          });
          gsap.set(heroCopy, { y: p * -150, opacity: 1 - p * 1.15 });
          gsap.set(heroCta, { y: p * -120, scale: 1 - p * 0.18, opacity: 1 - p * 1.1 });
          gsap.set(heroCue, { y: p * 100, opacity: 0.65 - p * 0.9 });
          setProgress(p);
        },
      });

      const profileScroll = ScrollTrigger.create({
        id: "about-profile-scroll",
        trigger: profile,
        start: "top 82%",
        end: "bottom 24%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(photo, { y: 70 - p * 115, scale: 0.9 + p * 0.1, rotation: -3 + p * 2 });
          gsap.set(profileCopy, { y: 80 - p * 95, opacity: 0.25 + p * 0.75 });
        },
      });

      const photoPin = ScrollTrigger.create({
        id: "about-photo-pin",
        trigger: photo,
        start: "top 14%",
        endTrigger: profileCopy,
        end: "bottom 62%",
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });

      const techScroll = ScrollTrigger.create({
        id: "about-tech-scroll",
        trigger: tech,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.75,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const distance = Math.max(0, techTrack.scrollWidth - tech.clientWidth);
          gsap.set(techTrack, { x: -distance * 0.62 * self.progress });
        },
      });

      const storyScroll = ScrollTrigger.create({
        id: "about-story-scroll",
        trigger: story,
        start: "top 92%",
        end: "top 34%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(storyLead, { x: -110 + p * 110, y: 80 - p * 80, opacity: p });
          gsap.set(storyCopy, { x: 110 - p * 110, y: 60 - p * 60, opacity: p });
        },
      });

      const socialScroll = ScrollTrigger.create({
        id: "about-social-scroll",
        trigger: social,
        start: "top 90%",
        end: "top 34%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(socialTitle, { y: 85 - p * 85, scale: 0.92 + p * 0.08, opacity: p });
          gsap.utils.toArray<HTMLElement>(".about-social-card", socialGrid).forEach((card, index) => {
            const cardProgress = Math.min(1, Math.max(0, p * 1.35 - index * 0.12));
            gsap.set(card, {
              y: 80 - cardProgress * 80,
              opacity: cardProgress,
              rotateX: 14 - cardProgress * 14,
            });
          });
        },
      });

      const adminScroll = ScrollTrigger.create({
        id: "about-admin-scroll",
        trigger: admin,
        start: "top 94%",
        end: "top 54%",
        scrub: 0.75,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(admin, { y: 80 - self.progress * 80, opacity: self.progress });
        },
      });

      const footerScroll = ScrollTrigger.create({
        id: "about-footer-scroll",
        trigger: footer,
        start: "top 96%",
        end: "top 70%",
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(footer, { y: 40 - self.progress * 40, opacity: self.progress });
        },
      });

      ScrollTrigger.refresh();

      return () => {
        heroScroll.kill();
        profileScroll.kill();
        photoPin.kill();
        techScroll.kill();
        storyScroll.kill();
        socialScroll.kill();
        adminScroll.kill();
        footerScroll.kill();
      };
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("load", refresh, { once: true });
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      window.removeEventListener("resize", refresh);
      ctx.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="about-page" id="about-page">
      <section ref={heroRef} className="about-hero">
        <div ref={heroMediaRef} className="about-hero-media" aria-hidden="true">
          <div ref={heroGridRef} className="about-hero-grid" />
          <div ref={heroShineRef} className="about-hero-shine" />
          <div className="about-hero-orb about-hero-orb-a" />
          <div className="about-hero-orb about-hero-orb-b" />
        </div>
        <div className="about-container about-hero-inner">
          <p className="about-kicker" data-text-reveal="done">SHREE SAWARIYA / ABOUT</p>
          <h1 ref={(node) => { /* keep a stable ref container */ }} className="about-display-title" aria-label="Local trust. Modern storefront." data-text-reveal="done">
            <span ref={setHeroLineRef} className="about-hero-line" data-text-reveal="done">Local trust.</span>
            <span ref={setHeroLineRef} className="about-hero-line about-hero-line-soft" data-text-reveal="done">Modern storefront.</span>
          </h1>
          <p ref={heroCopyRef} className="about-hero-copy" data-text-reveal="done">
            A dedicated profile page for the people, technology and story behind the store — built as a richer destination than the homepage teaser.
          </p>
          <a ref={heroCtaRef} className="about-pill" href="#about-profile">
            Explore profile <ArrowDown className="about-pill-icon size-4" aria-hidden="true" />
          </a>
        </div>
        <div ref={heroCueRef} className="about-scroll-cue" aria-hidden="true">
          <span /> Scroll to explore
        </div>
      </section>

      <section id="about-profile" ref={profileRef} className="about-container about-profile-grid">
        <div ref={photoRef} className="about-photo-frame">
          <div className="about-photo-glow" aria-hidden="true" />
          {display.photoUrl ? (
            <img src={display.photoUrl} alt={`${display.name} profile`} />
          ) : (
            <div className="about-photo-placeholder" aria-label="Profile photo placeholder">SA</div>
          )}
          <div className="about-photo-caption"><span>01</span><span>PROFILE</span></div>
        </div>
        <div ref={profileCopyRef} className="about-copy-column">
          <p className="about-kicker" data-text-reveal="done">The person / the business</p>
          <h2 data-text-reveal="done">{display.name}</h2>
          <p className="about-role" data-text-reveal="done">{display.role}</p>
          <p className="about-body" data-text-reveal="done">{display.bio}</p>
          <div className="about-contact-grid">
            <div className="about-contact-item"><MapPin className="size-4" aria-hidden="true" /><span>Shree Sawariya Agro Agency</span></div>
            <div className="about-contact-item"><Mail className="size-4" aria-hidden="true" /><span>{display.contact || "Contact through the storefront"}</span></div>
          </div>
          <div className="about-inline-meta">
            <span>{githubLoading ? "Syncing GitHub profile…" : githubError ? "GitHub fallback active" : "GitHub profile connected"}</span>
            {githubProfile?.html_url ? <a href={githubProfile.html_url} target="_blank" rel="noopener noreferrer">View GitHub <ExternalLink className="size-3.5" aria-hidden="true" /></a> : null}
          </div>
        </div>
      </section>

      <section ref={techRef} className="about-tech-band" aria-label="Technology and platform stack">
        <div ref={techTrackRef} className="about-tech-track">
          {[...stackItems, ...stackItems].map((item, index) => (
            <span key={`${item}-${index}`} className="about-tech-item"><Sparkles className="size-4" aria-hidden="true" />{item}</span>
          ))}
        </div>
      </section>

      <section ref={storyRef} className="about-container about-story-grid">
        <div><p className="about-kicker" data-text-reveal="done">02 / THE STORY</p><p ref={storyLeadRef} className="about-story-lead" data-text-reveal="done">The About page is intentionally more editorial: large type, layered surfaces, scroll-linked motion and content that can grow with the business.</p></div>
        <div ref={storyCopyRef} className="about-story-copy"><p data-text-reveal="done">The homepage remains focused on shopping. This page carries the identity layer: profile information, links, technology, contact context and future media.</p><p data-text-reveal="done">The hero artwork is deliberately a replaceable placeholder so the final personal or business image can be swapped later without changing the animation structure.</p></div>
      </section>

      <section ref={socialRef} className="about-container about-social-section">
        <div><p className="about-kicker" data-text-reveal="done">03 / CONNECT</p><h2 ref={socialTitleRef} className="about-section-title" data-text-reveal="done">Find the work online.</h2></div>
        <div ref={socialGridRef}><SocialLinks links={socialLinks} /></div>
      </section>

      <section ref={adminRef} className="about-container about-admin-section">
        <div className="about-admin-header"><div><p className="about-kicker" data-text-reveal="done">04 / ADMIN</p><h2 className="about-section-title" data-text-reveal="done">Keep the profile current.</h2></div><Pencil className="size-5" aria-hidden="true" /></div>
        <div className="about-admin-grid"><AdminPanel /><AvatarUploader /></div>
      </section>

      <footer ref={footerRef} className="about-footer about-container">
        <span>SHREE SAWARIYA AGRO AGENCY</span>
        <a href="/">Back to store <ArrowLeft className="size-3.5" aria-hidden="true" /></a>
      </footer>

      <div className="about-progress" aria-hidden="true"><span ref={progressRef} /></div>
    </main>
  );
}
