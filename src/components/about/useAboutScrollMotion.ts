import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

type Cleanup = () => void;

export function useAboutScrollMotion() {
  const locationPathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    let disposed = false;
    let retryFrame = 0;
    let frame = 0;
    let cleanup: Cleanup | undefined;

    const setup = (): boolean => {
      if (disposed) return true;

      const root = document.querySelector<HTMLElement>(".about-experience");
      const hero = document.querySelector<HTMLElement>(".about-hero");
      const scrollStage = document.querySelector<HTMLElement>(".about-hero__scroll-stage");
      const scrollCopy = document.querySelector<HTMLElement>(".about-hero__scroll-copy");

      if (!root || !hero || !scrollStage || !scrollCopy) {
        if (import.meta.env.DEV) {
          const missing = [
            [".about-experience", root],
            [".about-hero", hero],
            [".about-hero__scroll-stage", scrollStage],
            [".about-hero__scroll-copy", scrollCopy],
          ]
            .filter(([, element]) => !element)
            .map(([selector]) => selector)
            .join(", ");
          console.warn(`[about-motion] waiting for About DOM: ${missing}`);
        }

        retryFrame = window.requestAnimationFrame(() => {
          setup();
        });
        return false;
      }

      if (cleanup) return true;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const motionStrength = reducedMotion ? 0.55 : 1;
      let lastScrollTop = window.scrollY;
      let lastTime = performance.now();

      const render = () => {
        frame = 0;
        if (disposed) return;

        const scrollTop = window.scrollY;
        const viewportHeight = Math.max(window.innerHeight, 1);
        const heroTop = hero.getBoundingClientRect().top + scrollTop;
        const heroHeight = Math.max(hero.offsetHeight, viewportHeight);
        const heroProgress = clamp((scrollTop - heroTop) / Math.max(heroHeight * 0.78, 1));
        const motionProgress = heroProgress * motionStrength;

        const now = performance.now();
        const deltaTime = Math.max(now - lastTime, 16);
        const velocity = (scrollTop - lastScrollTop) / deltaTime;

        root.style.setProperty("--about-scroll", motionProgress.toFixed(4));
        root.style.setProperty("--about-scroll-velocity", velocity.toFixed(4));
        root.style.setProperty("--about-grid-y", `${(motionProgress * 135).toFixed(2)}px`);

        scrollStage.style.transform = `translate3d(0, ${(-motionProgress * 145).toFixed(2)}px, 0) scale(${(1 + motionProgress * 0.17).toFixed(4)}) rotate(${(-motionProgress * 7).toFixed(2)}deg)`;
        scrollStage.style.opacity = `${(1 - motionProgress * 0.58).toFixed(4)}`;
        scrollCopy.style.transform = `translate3d(0, ${(-motionProgress * 125).toFixed(2)}px, 0)`;
        scrollCopy.style.opacity = `${(1 - motionProgress * 0.62).toFixed(4)}`;

        root.querySelectorAll<HTMLElement>("main > section[id]").forEach((section) => {
          if (section === hero) return;

          const rect = section.getBoundingClientRect();
          const enter = clamp((viewportHeight * 0.88 - rect.top) / Math.max(viewportHeight * 0.62, 1));
          const center = clamp((viewportHeight * 0.72 - rect.top) / Math.max(viewportHeight * 0.9, 1));
          const offset = (1 - enter) * 46 * motionStrength;
          const scale = 0.985 + enter * 0.015;
          const opacity = 0.72 + enter * 0.28;

          section.style.setProperty("--section-progress", enter.toFixed(4));

          const content = section.firstElementChild;
          if (content instanceof HTMLElement) {
            content.style.setProperty("--about-section-offset", `${offset.toFixed(2)}px`);
            content.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
            content.style.opacity = opacity.toFixed(4);
          }

          section.style.setProperty("--about-section-center", center.toFixed(4));
        });

        lastScrollTop = scrollTop;
        lastTime = now;
      };

      const requestRender = () => {
        if (!frame) frame = window.requestAnimationFrame(render);
      };

      render();
      window.addEventListener("scroll", requestRender, { passive: true });
      window.addEventListener("resize", requestRender);
      window.addEventListener("pageshow", requestRender);

      const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(requestRender);
      resizeObserver?.observe(root);

      cleanup = () => {
        window.removeEventListener("scroll", requestRender);
        window.removeEventListener("resize", requestRender);
        window.removeEventListener("pageshow", requestRender);
        resizeObserver?.disconnect();
        if (frame) window.cancelAnimationFrame(frame);
        cleanup = undefined;
      };

      return true;
    };

    setup();

    return () => {
      disposed = true;
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
      if (frame) window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [locationPathname]);
}
