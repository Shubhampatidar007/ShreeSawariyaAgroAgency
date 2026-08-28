import { useLayoutEffect, useRef } from "react";
import {
  ArrowDown,
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

export function AboutSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroMediaRef = useRef<HTMLDivElement | null>(null);
  const heroLineRefs = useRef<HTMLSpanElement[]>([]);
  const heroCopyRef = useRef<HTMLParagraphElement | null>(null);
  const heroPillRef = useRef<HTMLAnchorElement | null>(null);
  const heroCueRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const profileCopyRef = useRef<HTMLDivElement | null>(null);
  const techBandRef = useRef<HTMLElement | null>(null);
  const techTrackRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const storyLeadRef = useRef<HTMLParagraphElement | null>(null);
  const storyCopyRef = useRef<HTMLDivElement | null>(null);
  const socialRef = useRef<HTMLElement | null>(null);
  const socialTitleRef = useRef<HTMLHeadingElement | null>(null);
  const socialGridRef = useRef<HTMLDivElement | null>(null);
  const adminRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

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

  const setHeroLineRef = (element: HTMLSpanElement | null) => {
    if (!element || heroLineRefs.current.includes(element)) return;
    heroLineRefs.current.push(element);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const heroMedia = heroMediaRef.current;
    const heroLines = heroLineRefs.current;
    const heroCopy = heroCopyRef.current;
    const heroPill = heroPillRef.current;
    const heroCue = heroCueRef.current;
    const photo = photoRef.current;
    const profileCopy = profileCopyRef.current;
    const techBand = techBandRef.current;
    const techTrack = techTrackRef.current;
    const story = storyRef.current;
    const storyLead = storyLeadRef.current;
    const storyCopy = storyCopyRef.current;
    const social = socialRef.current;
    const socialTitle = socialTitleRef.current;
    const socialGrid = socialGridRef.current;
    const admin = adminRef.current;
    const footer = footerRef.current;

    if (
      !root ||
      !hero ||
      !heroMedia ||
      !heroLines.length ||
      !heroCopy ||
      !heroPill ||
      !heroCue ||
      !photo ||
      !profileCopy ||
      !techBand ||
      !techTrack ||
      !story ||
      !storyLead ||
      !storyCopy ||
      !social ||
      !socialTitle ||
      !socialGrid ||
      !admin ||
      !footer
    ) {
      return undefined;
    }

    const context = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            ...heroLines,
            heroCopy,
            heroPill,
            heroCue,
            heroMedia,
            photo,
            profileCopy,
            storyLead,
            storyCopy,
            socialTitle,
            socialGrid.children,
            admin,
            footer,
          ],
          { clearProps: "all" },
        );
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const desktop = gsap.matchMedia();

        desktop.add("(min-width: 901px)", () => {
          const heroIntro = gsap.timeline({ defaults: { ease: "power4.out" } });
          heroIntro
            .fromTo(heroLines, { yPercent: 125, opacity: 0, rotateX: 14 }, { yPercent: 0, opacity: 1, rotateX: 0, duration: 1.15, stagger: 0.1 })
            .fromTo(heroCopy, { y: 38, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 }, "-=0.55")
            .fromTo(heroPill, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.65 }, "-=0.42")
            .fromTo(heroCue, { opacity: 0, y: 14 }, { opacity: 0.6, y: 0, duration: 0.45 }, "-=0.28");

          const heroTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom+=105% top",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          heroTimeline
            .to(heroMedia, { scale: 1.26, yPercent: 10, rotate: -1.5, ease: "none", duration: 1 }, 0)
            .to(heroLines[0], { yPercent: -32, xPercent: -4, scale: 0.82, opacity: 0.2, ease: "none", duration: 1 }, 0)
            .to(heroLines[1], { yPercent: -18, xPercent: 3, scale: 0.9, opacity: 0.48, ease: "none", duration: 1 }, 0)
            .to(heroCopy, { y: -70, opacity: 0, ease: "none", duration: 0.75 }, 0.12)
            .to(heroPill, { y: -55, opacity: 0, scale: 0.88, ease: "none", duration: 0.68 }, 0.16)
            .to(heroCue, { y: 80, opacity: 0, ease: "none", duration: 0.32 }, 0)
            .to(heroMedia.querySelectorAll(".about-hero-grid"), { yPercent: -14, opacity: 0.15, ease: "none", duration: 1 }, 0)
            .to(heroMedia.querySelectorAll(".about-hero-shine"), { scale: 1.55, opacity: 0.04, ease: "none", duration: 1 }, 0.05);

          gsap.fromTo(
            photo,
            { opacity: 0, y: 100, rotate: -4, scale: 0.92 },
            {
              opacity: 1,
              y: 0,
              rotate: -1,
              scale: 1,
              duration: 1.1,
              ease: "power3.out",
              scrollTrigger: { trigger: photo, start: "top 88%", once: true },
            },
          );

          gsap.to(photo, {
            y: -34,
            scale: 1.035,
            rotate: 0,
            ease: "none",
            scrollTrigger: {
              trigger: photo,
              start: "top 70%",
              end: "bottom 35%",
              scrub: 1,
            },
          });

          ScrollTrigger.create({
            trigger: photo,
            start: "top 14%",
            endTrigger: profileCopy,
            end: "bottom 62%",
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
          });
        });

        desktop.add("(max-width: 900px)", () => {
          gsap.fromTo(
            heroLines,
            { y: 34, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" },
          );
          gsap.fromTo(
            [heroCopy, heroPill],
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.18 },
          );

          gsap.to(heroMedia, {
            scale: 1.16,
            yPercent: 4,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 1.25,
            },
          });

          gsap.to(heroLines[0], {
            yPercent: -14,
            opacity: 0.6,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 },
          });

          gsap.to(heroLines[1], {
            yPercent: -8,
            opacity: 0.78,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 },
          });
        });

        gsap.fromTo(
          profileCopy,
          { y: 90, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: profileCopy, start: "top 82%", once: true },
          },
        );

        gsap.fromTo(
          storyLead,
          { y: 100, opacity: 0, clipPath: "inset(20% 0 0 0)" },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0 0 0 0)",
            duration: 1.05,
            ease: "power4.out",
            scrollTrigger: { trigger: story, start: "top 76%", once: true },
          },
        );

        gsap.fromTo(
          storyCopy,
          { y: 65, opacity: 0, clipPath: "inset(0 0 12% 0)" },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0 0 0 0)",
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: storyCopy, start: "top 84%", once: true },
          },
        );

        const moveDistance = () => Math.max(0, techTrack.scrollWidth - window.innerWidth);
        gsap.to(techTrack, {
          x: () => -moveDistance() * 0.48,
          ease: "none",
          scrollTrigger: {
            trigger: techBand,
            start: "top 90%",
            end: "bottom 10%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(
          socialTitle,
          { y: 80, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: social, start: "top 78%", once: true },
          },
        );

        gsap.fromTo(
          socialGrid.children,
          { y: 55, opacity: 0, rotateX: 8 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: socialGrid, start: "top 82%", once: true },
          },
        );

        gsap.fromTo(
          admin,
          { y: 70, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: admin, start: "top 86%", once: true },
          },
        );

        gsap.fromTo(
          footer,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: footer, start: "top 92%", once: true },
          },
        );

        return () => desktop.revert();
      });

      return () => mm.revert();
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("load", refresh, { once: true });
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      window.removeEventListener("resize", refresh);
      context.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="about-page" id="about-page">
      <section ref={heroRef} className="about-hero">
        <div ref={heroMediaRef} className="about-hero-media" aria-hidden="true">
          <div className="about-hero-orb about-hero-orb-a" />
          <div className="about-hero-orb about-hero-orb-b" />
          <div className="about-hero-grid" />
          <div className="about-hero-shine" />
        </div>

        <div className="about-container about-hero-inner">
          <p className="about-kicker">SHREE SAWARIYA / ABOUT</p>
          <h1 ref={undefined} className="about-display-title" aria-label="Local trust. Modern storefront.">
            <span ref={setHeroLineRef} className="about-hero-line">Local trust.</span>
            <span ref={setHeroLineRef} className="about-hero-line about-hero-line-soft">Modern storefront.</span>
          </h1>
          <p ref={heroCopyRef} className="about-hero-copy">
            A dedicated profile page for the people, technology and story behind the store — built as a richer destination than the homepage teaser.
          </p>
          <a ref={heroPillRef} className="about-pill" href="#about-profile">
            Explore profile <ArrowDown className="about-pill-icon" aria-hidden="true" />
          </a>
        </div>

        <div ref={heroCueRef} className="about-scroll-cue" aria-hidden="true">
          <span /> Scroll to explore
        </div>
      </section>

      <section id="about-profile" className="about-container about-profile-grid">
        <div ref={photoRef} className="about-photo-frame">
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

        <div ref={profileCopyRef} className="about-copy-column">
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
              <span>{display.contact || "Contact through the storefront"}</span>
            </div>
          </div>

          <div className="about-inline-meta">
            <span>
              {githubLoading
                ? "Syncing GitHub profile…"
                : githubError
                  ? "GitHub fallback active"
                  : "GitHub profile connected"}
            </span>
            {githubProfile?.html_url ? (
              <a href={githubProfile.html_url} target="_blank" rel="noopener noreferrer">
                View GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section ref={techBandRef} className="about-tech-band" aria-label="Technology and platform stack">
        <div ref={techTrackRef} className="about-tech-track">
          {[...stackItems, ...stackItems].map((item, index) => (
            <span key={`${item}-${index}`} className="about-tech-item">
              <Sparkles className="size-4" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section ref={storyRef} className="about-container about-story-grid">
        <div>
          <p className="about-kicker">02 / THE STORY</p>
          <p ref={storyLeadRef} className="about-story-lead">
            The About page is intentionally more editorial: large type, layered surfaces, subtle movement and content that can grow with the business.
          </p>
        </div>
        <div ref={storyCopyRef} className="about-story-copy">
          <p>
            The homepage remains focused on shopping. This page carries the identity layer: profile information, links, technology, contact context and future media.
          </p>
          <p>
            The hero artwork is deliberately a replaceable placeholder so the final personal/business image can be swapped later without changing the page structure.
          </p>
        </div>
      </section>

      <section ref={socialRef} className="about-container about-social-section">
        <div>
          <p className="about-kicker">03 / CONNECT</p>
          <h2 ref={socialTitleRef} className="about-section-title">Find the work online.</h2>
        </div>
        <div ref={socialGridRef}>
          <SocialLinks links={socialLinks} />
        </div>
      </section>

      <section ref={adminRef} className="about-container about-admin-section">
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

      <footer ref={footerRef} className="about-footer about-container">
        <span>SHREE SAWARIYA AGRO AGENCY</span>
        <a href="/">Back to store</a>
      </footer>
    </main>
  );
}
