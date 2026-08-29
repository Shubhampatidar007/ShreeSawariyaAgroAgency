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
 * The page is treated as a continuous storyboard rather than a collection
 * of isolated reveal animations. Scroll position controls the timeline, so
 * the user effectively "scrubs" through the experience like a film edit.
 *
 * The implementation intentionally stays on the existing GSAP +
 * ScrollTrigger dependency. It uses pinning, scrubbed timelines, 3D depth,
 * parallax, clip-path transitions, velocity-reactive polish and a strict
 * reduced-motion branch.
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
          const sections = gsap.utils.toArray<HTMLElement>("main > section[id]");

          // Give the storyboard enough perspective for depth moves to read
          // as intentional camera motion instead of flat CSS transforms.
          gsap.set(rootEl, {
            transformStyle: "preserve-3d",
            perspective: 1400,
          });

          // HERO STORYBOARD -------------------------------------------------
          // Pin the hero long enough to make the scroll feel like controlling
          // a scene. The visual and copy then move on different axes and at
          // different rates, creating a layered camera move.
          const heroTimeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "+=115%",
              scrub: 0.85,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          if (copyEl) {
            heroTimeline
              .to(copyEl, {
                yPercent: -12,
                xPercent: -2,
                scale: 0.93,
                opacity: 0.78,
                filter: "blur(1.5px)",
              }, 0)
              .to(copyEl, {
                yPercent: -34,
                xPercent: -4,
                scale: 0.78,
                opacity: 0,
                filter: "blur(10px)",
              }, 0.43);
          }

          if (stageEl) {
            heroTimeline
              .to(stageEl, {
                xPercent: 2,
                yPercent: -3,
                scale: 1.04,
                rotateX: -2,
                rotateZ: -2,
              }, 0)
              .to(stageEl, {
                xPercent: 12,
                yPercent: -7,
                scale: 0.76,
                rotateX: 7,
                rotateZ: 8,
                opacity: 0.12,
              }, 0.52);
          }

          if (visualEl) {
            heroTimeline
              .to(visualEl, {
                xPercent: 3,
                yPercent: -4,
                scale: 1.06,
              }, 0)
              .to(visualEl, {
                xPercent: 10,
                yPercent: -13,
                scale: 1.18,
                opacity: 0.38,
                filter: "blur(2px)",
              }, 0.4)
              .to(visualEl, {
                xPercent: 22,
                yPercent: -28,
                scale: 0.72,
                opacity: 0,
                filter: "blur(10px)",
              }, 0.72);
          }

          if (visualStageEl) {
            heroTimeline
              .to(visualStageEl, {
                rotateY: -7,
                rotateZ: 5,
                scale: 1.08,
              }, 0.08)
              .to(visualStageEl, {
                rotateY: 17,
                rotateZ: 20,
                scale: 1.28,
              }, 0.48)
              .to(visualStageEl, {
                rotateY: 28,
                rotateZ: 32,
                scale: 0.82,
              }, 0.78);
          }

          if (visualLabelEl) {
            heroTimeline
              .to(visualLabelEl, {
                yPercent: -40,
                opacity: 0.5,
              }, 0.14)
              .to(visualLabelEl, {
                yPercent: -150,
                opacity: 0,
              }, 0.55);
          }

          if (gridEl) {
            heroTimeline
              .to(gridEl, {
                yPercent: 18,
                scale: 1.04,
                opacity: 0.48,
              }, 0)
              .to(gridEl, {
                yPercent: 42,
                scale: 1.13,
                opacity: 0.12,
              }, 0.56);
          }

          if (noiseEl) {
            heroTimeline
              .to(noiseEl, {
                xPercent: -2,
                yPercent: 8,
                scale: 1.03,
              }, 0)
              .to(noiseEl, {
                xPercent: 5,
                yPercent: 18,
                scale: 1.1,
                opacity: 0.02,
              }, 0.58);
          }

          // SECTION SHOTS ---------------------------------------------------
          // Each following section gets a stronger entrance/exit treatment:
          // lift + scale + 3D tilt + blur + clip reveal. The alternating tilt
          // prevents every section from feeling mechanically identical.
          sections.forEach((section, index) => {
            const content =
              section.querySelector<HTMLElement>(":scope > .about-scroll-content") ??
              section.firstElementChild;

            if (!(content instanceof HTMLElement)) return;

            const sectionElements = gsap.utils.toArray<HTMLElement>(
              ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a",
              section,
            );

            const tilt = index % 2 === 0 ? 4 : -4;

            gsap.set(content, {
              transformPerspective: 1200,
              transformOrigin: "50% 50%",
            });

            const shot = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: "top 102%",
                end: "top 5%",
                scrub: 0.72,
                invalidateOnRefresh: true,
              },
            });

            shot.fromTo(
              content,
              {
                y: 150,
                scale: 0.9,
                opacity: 0.04,
                rotateX: tilt,
                rotateY: tilt * 0.35,
                filter: "blur(12px)",
                clipPath: "inset(10% 3% 4% 3% round 1.5rem)",
              },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                rotateX: 0,
                rotateY: 0,
                filter: "blur(0px)",
                clipPath: "inset(0% 0% 0% 0% round 0rem)",
              },
              0,
            );

            if (sectionElements.length) {
              shot.fromTo(
                sectionElements,
                {
                  y: 58,
                  opacity: 0.02,
                  filter: "blur(7px)",
                },
                {
                  y: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                  stagger: 0.045,
                },
                0.06,
              );
            }

            shot.to(content, {
              y: -38,
              scale: 0.975,
              opacity: 0.88,
              rotateX: index % 2 === 0 ? -1.2 : 1.2,
            }, 0.78);
          });

          // CONTINUOUS CAMERA SIGNAL --------------------------------------
          // Expose progress and velocity to CSS hooks so the visual layer can
          // respond to how aggressively the user scrolls without another
          // window-level scroll listener.
          ScrollTrigger.create({
            trigger: rootEl,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const velocity = self.getVelocity();
              const normalizedVelocity = gsap.utils.clamp(-1, 1, velocity / 1800);

              rootEl.style.setProperty("--about-scroll-progress", self.progress.toFixed(4));
              rootEl.style.setProperty("--about-scroll-velocity", normalizedVelocity.toFixed(4));
              rootEl.style.setProperty("--about-scroll-energy", Math.abs(normalizedVelocity).toFixed(4));
            },
          });

          return () => {
            rootEl.style.removeProperty("--about-scroll-progress");
            rootEl.style.removeProperty("--about-scroll-velocity");
            rootEl.style.removeProperty("--about-scroll-energy");
          };
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
          const reset = (element: HTMLElement | null) => {
            if (!element) return;
            gsap.set(element, {
              clearProps:
                "transform,opacity,filter,clipPath,perspective,rotateX,rotateY,rotateZ,scale,xPercent,yPercent",
            });
          };

          reset(rootEl);
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
            reset(content instanceof HTMLElement ? content : null);

            gsap.utils.toArray<HTMLElement>(
              ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a",
              section,
            ).forEach(reset);
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
