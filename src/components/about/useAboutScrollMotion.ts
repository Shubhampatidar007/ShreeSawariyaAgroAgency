import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Cinematic, scroll-driven motion for the About experience.
 *
 * Scroll position is the animation timeline: every transform/opacity change
 * is scrubbed against the user's scroll instead of playing independently.
 * The implementation deliberately stays on GSAP + ScrollTrigger, which is
 * already a project dependency, and keeps reduced-motion as a first-class
 * non-animated path.
 */
export function useAboutScrollMotion() {
  const locationPathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ctx: gsap.Context | undefined;
    let raf = 0;
    let disposed = false;

    const setup = () => {
      if (disposed) return;

      const rootEl = document.querySelector<HTMLElement>(".about-experience");
      const heroEl = document.querySelector<HTMLElement>(".about-hero");
      const stageEl = document.querySelector<HTMLElement>(".about-hero__scroll-stage");
      const copyEl = document.querySelector<HTMLElement>(".about-hero__scroll-copy");
      const gridEl = document.querySelector<HTMLElement>(".about-hero__grid");
      const noiseEl = document.querySelector<HTMLElement>(".about-hero__noise");
      const visualEl = document.querySelector<HTMLElement>(".about-hero__visual");
      const visualStageEl = document.querySelector<HTMLElement>(".about-hero__visual-stage");
      const visualLabelEl = document.querySelector<HTMLElement>(".about-hero__visual-label");

      if (!rootEl || !heroEl) {
        if (import.meta.env.DEV) {
          console.warn("[about-motion] waiting for About DOM: .about-experience, .about-hero");
        }
        raf = window.requestAnimationFrame(setup);
        return;
      }

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const smoothScrub = 0.65;
          const fastScrub = 0.4;

          // HERO: one continuous, cinematic sequence tied directly to scroll.
          const heroTimeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: smoothScrub,
              invalidateOnRefresh: true,
            },
          });

          if (stageEl) {
            heroTimeline.to(stageEl, {
              scale: 0.84,
              yPercent: -3,
              opacity: 0.26,
              rotateX: 2,
              transformOrigin: "50% 50%",
            }, 0);
          }

          if (copyEl) {
            heroTimeline.to(copyEl, {
              yPercent: -20,
              opacity: 0,
              filter: "blur(6px)",
            }, 0.08);
          }

          if (visualEl) {
            heroTimeline.to(visualEl, {
              yPercent: -7,
              scale: 0.93,
              opacity: 0.62,
            }, 0);
          }

          if (visualStageEl) {
            heroTimeline.to(visualStageEl, {
              rotateZ: 9,
              rotateY: 8,
              scale: 1.06,
            }, 0);
          }

          if (visualLabelEl) {
            heroTimeline.to(visualLabelEl, {
              yPercent: -80,
              opacity: 0,
            }, 0.18);
          }

          if (gridEl) {
            heroTimeline.to(gridEl, {
              yPercent: 24,
              opacity: 0.28,
            }, 0);
          }

          if (noiseEl) {
            heroTimeline.to(noiseEl, {
              yPercent: 12,
              opacity: 0.025,
            }, 0);
          }

          // SECTION TRANSITIONS: each section behaves like the next shot in
          // one long film rather than a collection of disconnected reveals.
          gsap.utils.toArray<HTMLElement>("main > section[id]").forEach((section, index) => {
            const content =
              section.querySelector<HTMLElement>(":scope > .about-scroll-content") ??
              section.firstElementChild;

            if (!(content instanceof HTMLElement)) return;

            const sectionElements = gsap.utils.toArray<HTMLElement>(
              ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a",
              section,
            );

            // Keep the initial state subtle so the page never looks empty
            // while ScrollTrigger is settling after mount.
            gsap.set(content, { transformPerspective: 1000, transformOrigin: "50% 50%" });

            const timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: "top 92%",
                end: "top 18%",
                scrub: fastScrub,
                invalidateOnRefresh: true,
              },
            });

            timeline.fromTo(
              content,
              { y: 86, scale: 0.94, opacity: 0.28, rotateX: index % 2 === 0 ? 1.8 : -1.8 },
              { y: 0, scale: 1, opacity: 1, rotateX: 0 },
              0,
            );

            if (sectionElements.length) {
              timeline.fromTo(
                sectionElements,
                { y: 34, opacity: 0.16 },
                { y: 0, opacity: 1, stagger: 0.025 },
                0.08,
              );
            }

            // Add a slight depth pull around the middle of the viewport.
            timeline.to(content, {
              y: -18,
              scale: 0.992,
            }, 0.72);
          });

          // Lightweight global progress signal for CSS polish hooks.
          ScrollTrigger.create({
            trigger: rootEl,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              rootEl.style.setProperty("--about-scroll-progress", self.progress.toFixed(4));
              rootEl.style.setProperty("--about-scroll-velocity", self.getVelocity().toFixed(2));
            },
          });

          return () => {
            rootEl.style.removeProperty("--about-scroll-progress");
            rootEl.style.removeProperty("--about-scroll-velocity");
          };
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
          const reset = (element: HTMLElement | null) => {
            if (element) {
              gsap.set(element, {
                clearProps: "transform,opacity,filter,rotateX,rotateY,rotateZ,scale,yPercent",
              });
            }
          };

          reset(stageEl);
          reset(copyEl);
          reset(gridEl);
          reset(noiseEl);
          reset(visualEl);
          reset(visualStageEl);
          reset(visualLabelEl);

          gsap.utils.toArray<HTMLElement>("main > section[id]").forEach((section) => {
            const content =
              section.querySelector<HTMLElement>(":scope > .about-scroll-content") ??
              section.firstElementChild;
            if (content instanceof HTMLElement) {
              reset(content);
            }

            gsap.utils.toArray<HTMLElement>(
              ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a",
              section,
            ).forEach((element) => reset(element));
          });
        });
      }, rootEl);

      ScrollTrigger.refresh();
    };

    setup();

    return () => {
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
      ctx?.revert();
    };
  }, [locationPathname]);
}
