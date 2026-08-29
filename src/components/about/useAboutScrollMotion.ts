import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * About-only cinematic camera system.
 *
 * Scroll position is the source of truth: every scene is scrubbed from the
 * document position instead of relying on one-shot viewport reveals. The
 * controller owns only visual transforms and never mutates text/glyph DOM.
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

      if (!rootEl || !heroEl) {
        raf = window.requestAnimationFrame(setup);
        return;
      }

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            desktop: "(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
            mobile: "(max-width: 900px), (pointer: coarse), (prefers-reduced-motion: no-preference)",
          },
          ({ conditions }) => {
            if (!conditions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

            const isDesktop = Boolean(conditions.desktop);
            const strength = isDesktop ? 1 : 0.55;
            const sections = gsap.utils.toArray<HTMLElement>("main > section[id]");
            const contentSections = sections.filter((section) => section !== heroEl);

            gsap.set(rootEl, {
              transformStyle: "preserve-3d",
              perspective: isDesktop ? 1400 : 900,
            });

            // HERO: one pinned camera shot with separate copy, visual, grid,
            // noise and label layers. HeroNameReveal itself is deliberately
            // untouched so its nested glyph animation remains stable.
            const copyEl = heroEl.querySelector<HTMLElement>(".about-hero__scroll-copy");
            const stageEl = heroEl.querySelector<HTMLElement>(".about-hero__scroll-stage");
            const visualEl = heroEl.querySelector<HTMLElement>(".about-hero__visual");
            const visualStageEl = heroEl.querySelector<HTMLElement>(".about-hero__visual-stage");
            const visualLabelEl = heroEl.querySelector<HTMLElement>(".about-hero__visual-label");
            const gridEl = heroEl.querySelector<HTMLElement>(".about-hero__grid");
            const noiseEl = heroEl.querySelector<HTMLElement>(".about-hero__noise");
            const titleEl = heroEl.querySelector<HTMLElement>(".about-hero__title");
            const ledeEl = heroEl.querySelector<HTMLElement>(".about-hero__lede");

            const heroTimeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: heroEl,
                start: "top top",
                end: isDesktop ? "+=130%" : "+=108%",
                scrub: isDesktop ? 0.8 : 0.55,
                pin: true,
                pinSpacing: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });

            if (copyEl) {
              heroTimeline
                .to(copyEl, {
                  yPercent: -8 * strength,
                  xPercent: -1.5 * strength,
                  scale: 1.06 + 0.025 * strength,
                  opacity: 0.96,
                }, 0)
                .to(copyEl, {
                  yPercent: -28 * strength,
                  xPercent: -4 * strength,
                  scale: 0.8 + 0.035 * (1 - strength),
                  opacity: 0,
                  filter: `blur(${isDesktop ? 8 : 4}px)`,
                }, 0.56);
            }

            if (titleEl) {
              heroTimeline
                .to(titleEl, {
                  scale: 1.045 + 0.045 * strength,
                  yPercent: -4 * strength,
                  transformOrigin: "50% 55%",
                }, 0.02)
                .to(titleEl, {
                  scale: 0.82,
                  yPercent: -24 * strength,
                  filter: `blur(${isDesktop ? 8 : 3}px)`,
                }, 0.58);
            }

            if (ledeEl) {
              heroTimeline
                .to(ledeEl, { yPercent: -5 * strength, opacity: 0.78 }, 0.05)
                .to(ledeEl, { yPercent: -34 * strength, opacity: 0 }, 0.58);
            }

            if (stageEl) {
              heroTimeline
                .to(stageEl, {
                  xPercent: 1.5 * strength,
                  yPercent: -2.5 * strength,
                  scale: 1.025 + 0.02 * strength,
                  rotateX: -2 * strength,
                  rotateZ: -1.5 * strength,
                }, 0)
                .to(stageEl, {
                  xPercent: 10 * strength,
                  yPercent: -8 * strength,
                  scale: 0.82,
                  rotateX: 5 * strength,
                  rotateZ: 7 * strength,
                  opacity: 0.2,
                }, 0.68)
                .to(stageEl, {
                  xPercent: 18 * strength,
                  yPercent: -18 * strength,
                  scale: 0.72,
                  rotateY: 16 * strength,
                  rotateZ: 12 * strength,
                  opacity: 0,
                }, 0.88);
            }

            if (visualEl) {
              heroTimeline
                .to(visualEl, {
                  xPercent: 3 * strength,
                  yPercent: -3 * strength,
                  scale: 1.035 + 0.025 * strength,
                }, 0)
                .to(visualEl, {
                  xPercent: 8 * strength,
                  yPercent: -10 * strength,
                  scale: 1.12,
                  opacity: 0.45,
                  filter: `blur(${isDesktop ? 2 : 1}px)`,
                }, 0.42)
                .to(visualEl, {
                  xPercent: 20 * strength,
                  yPercent: -24 * strength,
                  scale: 0.78,
                  opacity: 0,
                  filter: `blur(${isDesktop ? 9 : 4}px)`,
                }, 0.78);
            }

            if (visualStageEl) {
              heroTimeline
                .to(visualStageEl, {
                  rotateY: -5 * strength,
                  rotateZ: 3 * strength,
                  scale: 1.035 + 0.015 * strength,
                }, 0.08)
                .to(visualStageEl, {
                  rotateY: 12 * strength,
                  rotateZ: 14 * strength,
                  scale: 1.18,
                }, 0.46)
                .to(visualStageEl, {
                  rotateY: 24 * strength,
                  rotateZ: 24 * strength,
                  scale: 0.84,
                }, 0.78);
            }

            if (visualLabelEl) {
              heroTimeline
                .to(visualLabelEl, { yPercent: -30 * strength, opacity: 0.62 }, 0.14)
                .to(visualLabelEl, { yPercent: -120 * strength, opacity: 0 }, 0.62);
            }

            if (gridEl) {
              heroTimeline
                .to(gridEl, {
                  yPercent: 12 * strength,
                  scale: 1.035,
                  opacity: 0.48,
                }, 0)
                .to(gridEl, {
                  yPercent: 34 * strength,
                  scale: 1.1,
                  opacity: 0.1,
                }, 0.58);
            }

            if (noiseEl) {
              heroTimeline
                .to(noiseEl, { xPercent: -1.5 * strength, yPercent: 6 * strength, scale: 1.02 }, 0)
                .to(noiseEl, { xPercent: 4 * strength, yPercent: 16 * strength, opacity: 0.02 }, 0.6);
            }

            // SECTION CAMERA SHOTS: alternate tilt/direction and let content
            // recede as the next scene takes over. No independent enter/exit
            // timers are used here.
            contentSections.forEach((section, index) => {
              const content = section.querySelector<HTMLElement>(":scope > .about-scroll-content") ?? section.firstElementChild;
              if (!(content instanceof HTMLElement)) return;

              const elements = gsap.utils.toArray<HTMLElement>(
                ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a, :scope [data-cinematic-element]",
                section,
              );
              const tilt = index % 2 === 0 ? 3.2 : -3.2;
              const yEnter = (isDesktop ? 110 : 65) * strength;
              const yExit = (isDesktop ? -42 : -24) * strength;

              gsap.set(content, {
                transformPerspective: isDesktop ? 1200 : 800,
                transformOrigin: "50% 50%",
              });

              const shot = gsap.timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                  trigger: section,
                  start: isDesktop ? "top 98%" : "top 94%",
                  end: isDesktop ? "top 6%" : "top 8%",
                  scrub: isDesktop ? 0.75 : 0.55,
                  invalidateOnRefresh: true,
                },
              });

              shot.fromTo(
                content,
                {
                  y: yEnter,
                  scale: 0.93,
                  opacity: 0.05,
                  rotateX: tilt,
                  rotateY: tilt * 0.25,
                  filter: `blur(${isDesktop ? 9 : 4}px)`,
                  clipPath: isDesktop ? "inset(7% 2% 3% 2% round 1.25rem)" : "inset(4% 1% 1% 1% round 0.9rem)",
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

              if (elements.length) {
                shot.fromTo(
                  elements,
                  {
                    y: isDesktop ? 48 * strength : 24,
                    xPercent: index % 2 === 0 ? -1.2 * strength : 1.2 * strength,
                    opacity: 0.04,
                    filter: `blur(${isDesktop ? 5 : 2}px)`,
                  },
                  {
                    y: 0,
                    xPercent: 0,
                    opacity: 1,
                    filter: "blur(0px)",
                    stagger: isDesktop ? 0.045 : 0.02,
                  },
                  0.05,
                );
              }

              shot.to(content, {
                y: yExit,
                scale: 0.975,
                opacity: 0.82,
                rotateX: index % 2 === 0 ? -1 : 1,
              }, 0.8);
            });

            ScrollTrigger.create({
              trigger: rootEl,
              start: "top top",
              end: "bottom bottom",
              onUpdate: (self) => {
                const velocity = self.getVelocity();
                const normalizedVelocity = gsap.utils.clamp(-1, 1, velocity / 2200);
                rootEl.style.setProperty("--about-scroll-progress", self.progress.toFixed(4));
                rootEl.style.setProperty("--about-scroll-velocity", normalizedVelocity.toFixed(4));
                rootEl.style.setProperty("--about-scroll-energy", Math.abs(normalizedVelocity).toFixed(4));
              },
              onRefresh: () => {
                rootEl.style.setProperty("--about-scroll-progress", "0");
                rootEl.style.setProperty("--about-scroll-velocity", "0");
                rootEl.style.setProperty("--about-scroll-energy", "0");
              },
            });

            const refresh = () => ScrollTrigger.refresh();
            window.addEventListener("orientationchange", refresh, { passive: true });
            window.addEventListener("resize", refresh, { passive: true });

            return () => {
              window.removeEventListener("orientationchange", refresh);
              window.removeEventListener("resize", refresh);
              rootEl.style.removeProperty("--about-scroll-progress");
              rootEl.style.removeProperty("--about-scroll-velocity");
              rootEl.style.removeProperty("--about-scroll-energy");
            };
          }, rootEl);

        mm.add("(prefers-reduced-motion: reduce)", () => {
          const selectors = [
            ".about-hero__scroll-stage",
            ".about-hero__scroll-copy",
            ".about-hero__grid",
            ".about-hero__noise",
            ".about-hero__visual",
            ".about-hero__visual-stage",
            ".about-hero__visual-label",
            ".about-hero__title",
            ".about-hero__lede",
          ];

          selectors.forEach((selector) => {
            document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
              gsap.set(element, {
                clearProps: "transform,opacity,filter,clipPath,perspective,rotateX,rotateY,rotateZ,scale,xPercent,yPercent",
              });
            });
          });

          gsap.utils.toArray<HTMLElement>("main > section[id]").forEach((section) => {
            const content = section.querySelector<HTMLElement>(":scope > .about-scroll-content") ?? section.firstElementChild;
            if (content instanceof HTMLElement) {
              gsap.set(content, { clearProps: "transform,opacity,filter,clipPath,perspective,rotateX,rotateY,rotateZ,scale,xPercent,yPercent" });
            }
            gsap.utils.toArray<HTMLElement>(
              ":scope .about-kicker, :scope h2, :scope h3, :scope p, :scope article, :scope a",
              section,
            ).forEach((element) => {
              gsap.set(element, { clearProps: "transform,opacity,filter,clipPath" });
            });
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
      ScrollTrigger.refresh();
    };
  }, [locationPathname]);
}
