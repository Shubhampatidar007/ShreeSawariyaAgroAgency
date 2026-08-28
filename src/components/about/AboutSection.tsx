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
  const heroLinesRef = useRef<HTMLSpanElement[]>([]);
  const heroCopyRef = useRef<HTMLParagraphElement | null>(null);
  const heroPillRef = useRef<HTMLAnchorElement | null>(null);
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
    if (node && !heroLinesRef.current.includes(node)) heroLinesRef.current.push(node);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const heroMedia = heroMediaRef.current;
    const heroGrid = heroGridRef.current;
    const heroShine = heroShineRef.current;
    const heroLines = heroLinesRef.current;
    const heroCopy = heroCopyRef.current;
    const heroPill = heroPillRef.current;
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

    if (!root || !hero || !heroMedia || !heroGrid || !heroShine || !heroLines.length || !heroCopy || !heroPill || !heroCue || !profile || !photo || !profileCopy || !tech || !techTrack || !story || !storyLead || !storyCopy || !social || !socialTitle || !socialGrid || !admin || !footer || !progress) {
      return undefined;
    }

    // The shared app-wide Motion observer targets text nodes globally. Mark only
    // this route's text as already handled so this component owns its transforms.
    root.querySelectorAll<HTMLElement>(aboutTextSelector).forEach((element) => {
      element.dataset.textReveal = "done";
    });

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        gsap.set(root.querySelectorAll<HTMLElement>("[style]"), { clearProps: "all" });
        return;
      }

      const mm = gsap.matchMedia();

      const setupSharedScroll = () => {
        gsap.fromTo(profileCopy, { y: 90, opacity: 0 }, {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: profileCopy,
            start: "top 92%",
            end: "top 54%",
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(photo, { y: 100, scale: 0.9, opacity: 0, rotation: -4 }, {
          y: 0,
          scale: 1,
          opacity: 1,
          rotation: -1,
          ease: "none",
          scrollTrigger: {
            trigger: photo,
            start: "top 92%",
            end: "top 54%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        const horizontalDistance = () => Math.max(0, techTrack.scrollWidth - tech.clientWidth);
        gsap.to(techTrack, {
          x: () => -horizontalDistance() * 0.68,
          ease: "none",
          scrollTrigger: {
            trigger: tech,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(storyLead, { x: -100, y: 75, opacity: 0 }, {
          x: 0,
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: story,
            start: "top 92%",
            end: "top 40%",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(storyCopy, { x: 100, y: 55, opacity: 0 }, {
          x: 0,
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: story,
            start: "top 88%",
            end: "top 40%",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(socialTitle, { y: 90, scale: 0.92, opacity: 0 }, {
          y: 0,
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: social,
            start: "top 92%",
            end: "top 52%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(socialGrid.querySelectorAll(".about-social-card"), { y: 90, opacity: 0, rotateX: 12 }, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: 0.12,
          ease: "none",
          scrollTrigger: {
            trigger: socialGrid,
            start: "top 92%",
            end: "top 42%",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(admin, { y: 90, opacity: 0 }, {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: admin,
            start: "top 94%",
            end: "top 56%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(footer, { y: 40, opacity: 0 }, {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: footer,
            start: "top 96%",
            end: "top 70%",
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });

        ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => gsap.set(progress, { scaleY: self.progress }),
        });
      };

      mm.add("(min-width: 901px)", () => {
        gsap.set(heroLines, { yPercent: 120, opacity: 0, rotateX: 18 });
        gsap.set([heroCopy, heroPill, heroCue], { y: 34, opacity: 0 });

        const intro = gsap.timeline({ delay: 0.08, defaults: { ease: "power4.out" } });
        intro
          .to(heroLines, { yPercent: 0, opacity: 1, rotateX: 0, duration: 1.1, stagger: 0.1 })
          .to(heroCopy, { y: 0, opacity: 1, duration: 0.72 }, "-=0.55")
          .to(heroPill, { y: 0, opacity: 1, duration: 0.62 }, "-=0.42")
          .to(heroCue, { y: 0, opacity: 0.62, duration: 0.45 }, "-=0.25");

        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom+=125% top",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        heroTl
          .to(heroMedia, { scale: 1.34, yPercent: 11, rotation: -1.5, ease: "none" }, 0)
          .to(heroGrid, { xPercent: -16, yPercent: -22, rotation: -8, scale: 1.16, ease: "none" }, 0)
          .to(heroShine, { xPercent: -30, yPercent: 35, scale: 1.7, opacity: 0.04, ease: "none" }, 0)
          .to(heroLines[0], { yPercent: -48, xPercent: -8, scale: 0.7, opacity: 0.08, ease: "none" }, 0)
          .to(heroLines[1], { yPercent: -27, xPercent: 6, scale: 0.83, opacity: 0.28, ease: "none" }, 0)
          .to(heroCopy, { y: -135, opacity: 0, ease: "none" }, 0.1)
          .to(heroPill, { y: -110, scale: 0.8, opacity: 0, ease: "none" }, 0.1)
          .to(heroCue, { y: 100, opacity: 0, ease: "none" }, 0)
          .to(heroGrid, { opacity: 0.08, ease: "none" }, 0.55);

        setupSharedScroll();

        return () => {
          heroTl.scrollTrigger?.kill();
        };
      });

      mm.add("(max-width: 900px)", () => {
        gsap.fromTo(heroLines, { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" });
        gsap.fromTo([heroCopy, heroPill], { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, delay: 0.16, ease: "power3.out" });

        const mobileTl = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });

        mobileTl
          .to(heroMedia, { scale: 1.18, yPercent: 5, ease: "none" }, 0)
          .to(heroGrid, { xPercent: -6, yPercent: -10, rotation: -3, ease: "none" }, 0)
          .to(heroLines[0], { yPercent: -18, xPercent: -2, opacity: 0.5, ease: "none" }, 0)
          .to(heroLines[1], { yPercent: -9, xPercent: 2, opacity: 0.7, ease: "none" }, 0)
          .to(heroCopy, { y: -55, opacity: 0.12, ease: "none" }, 0)
          .to(heroPill, { y: -42, opacity: 0, ease: "none" }, 0.08);

        setupSharedScroll();
      });

      return () => mm.revert();
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
          <p className="about-kicker">SHREE SAWARIYA / ABOUT</p>
          <h1 className="about-display-title" aria-label="Local trust. Modern storefront.">
            <span ref={setHeroLineRef} className="about-hero-line">Local trust.</span>
            <span ref={setHeroLineRef} className="about-hero-line about-hero-line-soft">Modern storefront.</span>
          </h1>
          <p ref={heroCopyRef} className="about-hero-copy">A dedicated profile page for the people, technology and story behind the store — built as a richer destination than the homepage teaser.</p>
          <a ref={heroPillRef} className="about-pill" href="#about-profile">
            Explore profile
            <ArrowDown size={15} className="about-pill-icon" aria-hidden="true" />
          </a>
        </div>
        <div ref={heroCueRef} className="about-scroll-cue" aria-hidden="true"><span /> Scroll to explore</div>
      </section>

      <section ref={profileRef} id="about-profile" className="about-container about-profile-grid">
        <div ref={photoRef} className="about-photo-frame">
          <div className="about-photo-glow" aria-hidden="true" />
          {display.photoUrl ? <img src={display.photoUrl} alt={`${display.name} profile`} /> : <div className="about-photo-placeholder" aria-label="Profile photo placeholder">SA</div>}
          <div className="about-photo-caption"><span>01</span><span>PROFILE</span></div>
        </div>
        <div ref={profileCopyRef} className="about-copy-column">
          <p className="about-kicker">The person / the business</p>
          <h2>{display.name}</h2>
          <p className="about-role">{display.role}</p>
          <p className="about-body">{display.bio}</p>
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
          {[...stackItems, ...stackItems].map((item, index) => <span key={`${item}-${index}`} className="about-tech-item"><Sparkles className="size-4" aria-hidden="true" />{item}</span>)}
        </div>
      </section>

      <section ref={storyRef} className="about-container about-story-grid">
        <div><p className="about-kicker">02 / THE STORY</p><p ref={storyLeadRef} className="about-story-lead">The About page is intentionally more editorial: large type, layered surfaces, scroll-linked motion and content that can grow with the business.</p></div>
        <div ref={storyCopyRef} className="about-story-copy"><p>The homepage remains focused on shopping. This page carries the identity layer: profile information, links, technology, contact context and future media.</p><p>The hero artwork is deliberately a replaceable placeholder so the final personal or business image can be swapped later without changing the animation structure.</p></div>
      </section>

      <section ref={socialRef} className="about-container about-social-section">
        <div><p className="about-kicker">03 / CONNECT</p><h2 ref={socialTitleRef} className="about-section-title">Find the work online.</h2></div>
        <div ref={socialGridRef}><SocialLinks links={socialLinks} /></div>
      </section>

      <section ref={adminRef} className="about-container about-admin-section">
        <div className="about-admin-header"><div><p className="about-kicker">04 / ADMIN</p><h2 className="about-section-title">Keep the profile current.</h2></div><Pencil className="size-5" aria-hidden="true" /></div>
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
