import { animate } from "motion";
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToPosition(targetY: number) {
  if (prefersReducedMotion()) {
    window.scrollTo(0, targetY);
    return () => undefined;
  }

  return animate(window.scrollY, targetY, {
    duration: 0.85,
    ease: [0.22, 1, 0.36, 1],
    onUpdate: (value) => window.scrollTo(0, value),
  });
}

export function SmoothScroll() {
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const hasMounted = useRef(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) {
        return;
      }

      const hash = decodeURIComponent(url.hash.slice(1));
      const element = document.getElementById(hash);
      if (!element) return;

      event.preventDefault();
      const targetY = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 24);
      const controls = scrollToPosition(targetY);
      window.history.pushState(null, "", url.hash);

      if (controls && "stop" in controls) {
        void controls;
      }
    };

    document.addEventListener("click", handleClick, { passive: false });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const controls = scrollToPosition(0);
    return () => {
      if (controls && "stop" in controls) controls.stop();
    };
  }, [locationHref]);

  return null;
}
