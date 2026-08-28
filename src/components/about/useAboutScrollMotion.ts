import { useEffect } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function useAboutScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".about-experience");
    const hero = document.querySelector<HTMLElement>(".about-hero");
    const scrollStage = document.querySelector<HTMLElement>(".about-hero__scroll-stage");

    if (!root || !hero || !scrollStage) return;

    let frame = 0;
    let lastY = window.scrollY;
    let lastTime = performance.now();

    const render = () => {
      frame = 0;
      const y = window.scrollY;
      const viewport = Math.max(window.innerHeight, 1);
      const heroTop = hero.getBoundingClientRect().top + y;
      const heroHeight = Math.max(hero.offsetHeight, viewport);
      const progress = clamp((y - heroTop) / (heroHeight * 0.9));
      const now = performance.now();
      const velocity = (y - lastY) / Math.max(now - lastTime, 16);

      root.style.setProperty("--about-scroll", progress.toFixed(4));
      root.style.setProperty("--about-scroll-velocity", velocity.toFixed(4));
      scrollStage.style.setProperty("--about-scroll-y", `${(-progress * 100).toFixed(2)}px`);
      scrollStage.style.setProperty("--about-scroll-scale", `${(1 + progress * 0.14).toFixed(4)}`);
      scrollStage.style.setProperty("--about-scroll-rotate", `${(-progress * 6).toFixed(2)}deg`);
      scrollStage.style.setProperty("--about-scroll-opacity", `${(1 - progress * 0.52).toFixed(4)}`);

      lastY = y;
      lastTime = now;
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    render();
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestRender);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}
