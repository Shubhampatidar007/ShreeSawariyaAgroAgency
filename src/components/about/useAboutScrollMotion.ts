import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Drives every scroll-linked visual on the About page:
 *  - hero visual/copy scrub (shrink + fade as you leave the hero)
 *  - hero background grid parallax
 *  - per-section scrub reveal (translate + scale + opacity) for every
 *    `main > section[id]`, targeting `.about-scroll-content` when present
 *
 * Built on GSAP + ScrollTrigger instead of a manual scroll listener:
 *  - ScrollTrigger recalculates all trigger positions on resize/orientation
 *    change on its own, so this stays correct across breakpoints with no
 *    extra code (this is what makes it "fully responsive").
 *  - `gsap.matchMedia()` gives a clean, binary reduced-motion branch: full
 *    scrub animation, or the final resting state with no motion at all —
 *    no more "55% strength" half-measure.
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
          if (stageEl) {
            gsap.to(stageEl, {
              scale: 0.86,
              opacity: 0.35,
              ease: "none",
              scrollTrigger: {
                trigger: heroEl,
                start: "top top",
                end: "bottom top",
                scrub: 0.4,
              },
            });
          }

          if (copyEl) {
            gsap.to(copyEl, {
              yPercent: -18,
              opacity: 0,
              ease: "none",
              scrollTrigger: {
                trigger: heroEl,
                start: "top top",
                end: "65% top",
                scrub: 0.4,
              },
            });
          }

          if (gridEl) {
            gsap.to(gridEl, {
              yPercent: 22,
              ease: "none",
              scrollTrigger: {
                trigger: heroEl,
                start: "top top",
                end: "bottom top",
                scrub: 0.6,
              },
            });
          }

          gsap.utils.toArray<HTMLElement>("main > section[id]").forEach((section) => {
            const content =
              section.querySelector<HTMLElement>(":scope > .about-scroll-content") ??
              section.firstElementChild;

            if (!(content instanceof HTMLElement)) return;

            gsap.fromTo(
              content,
              { y: 64, scale: 0.97, opacity: 0.35 },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 82%",
                  end: "top 38%",
                  scrub: 0.5,
                },
              },
            );
          });

          return () => {
            // gsap.context handles teardown of everything created above.
          };
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
          if (stageEl) gsap.set(stageEl, { scale: 1, opacity: 1 });
          if (copyEl) gsap.set(copyEl, { yPercent: 0, opacity: 1 });
          if (gridEl) gsap.set(gridEl, { yPercent: 0 });

          gsap.utils.toArray<HTMLElement>("main > section[id]").forEach((section) => {
            const content =
              section.querySelector<HTMLElement>(":scope > .about-scroll-content") ??
              section.firstElementChild;
            if (content instanceof HTMLElement) {
              gsap.set(content, { y: 0, scale: 1, opacity: 1 });
            }
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