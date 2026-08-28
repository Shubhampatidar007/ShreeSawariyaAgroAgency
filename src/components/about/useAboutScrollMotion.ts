import { useEffect } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function useAboutScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".about-experience");
    const hero = document.querySelector<HTMLElement>(".about-hero");
    const scrollStage = document.querySelector<HTMLElement>(".about-hero__scroll-stage");
    const scrollCopy = document.querySelector<HTMLElement>(".about-hero__scroll-copy");

    if (!root || !hero || !scrollStage || !scrollCopy) return;

    const scroller = document.scrollingElement ?? document.documentElement;
    let frame = 0;
    let lastScrollTop = scroller.scrollTop;
    let lastTime = performance.now();

    const render = () => {
      frame = 0;

      const scrollTop = scroller.scrollTop;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const heroTop = hero.getBoundingClientRect().top + scrollTop;
      const heroHeight = Math.max(hero.offsetHeight, viewportHeight);
      const progress = clamp((scrollTop - heroTop) / Math.max(heroHeight * 0.9, 1));

      const now = performance.now();
      const deltaTime = Math.max(now - lastTime, 16);
      const velocity = (scrollTop - lastScrollTop) / deltaTime;

      root.style.setProperty("--about-scroll", progress.toFixed(4));
      root.style.setProperty("--about-scroll-velocity", velocity.toFixed(4));

      scrollStage.style.transform = `translate3d(0, ${(-progress * 110).toFixed(2)}px, 0) scale(${(1 + progress * 0.14).toFixed(4)}) rotate(${(-progress * 6).toFixed(2)}deg)`;
      scrollStage.style.opacity = `${(1 - progress * 0.52).toFixed(4)}`;

      scrollCopy.style.transform = `translate3d(0, ${(-progress * 110).toFixed(2)}px, 0)`;
      scrollCopy.style.opacity = `${(1 - progress * 0.55).toFixed(4)}`;

      root.style.setProperty("--about-grid-y", `${(progress * 120).toFixed(2)}px`);

      lastScrollTop = scrollTop;
      lastTime = now;
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    render();
    scroller.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);

    return () => {
      scroller.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestRender);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}
