import { animate } from "motion";
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const TEXT_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, label";
const REVEAL_CLASS = "data-text-reveal-ready";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasVisibleText(element: Element) {
  return Boolean(element.textContent?.trim());
}

function revealElement(element: HTMLElement, immediate = false) {
  if (!hasVisibleText(element) || element.dataset.textReveal === "done") return;

  element.dataset.textReveal = "done";

  if (prefersReducedMotion() || immediate) {
    element.style.opacity = "1";
    element.style.transform = "translateY(0)";
    element.style.clipPath = "inset(0 0 0 0)";
    return;
  }

  element.classList.add(REVEAL_CLASS);
  element.style.opacity = "0";
  element.style.transform = "translateY(1.1em)";
  element.style.clipPath = "inset(1.15em 0 0 0)";

  animate(
    element,
    {
      opacity: 1,
      transform: "translateY(0)",
      clipPath: "inset(0 0 0 0)",
    },
    {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  );
}

function prepareElement(element: Element) {
  if (!(element instanceof HTMLElement)) return;
  if (element.dataset.textReveal === "done") return;
  element.style.willChange = "transform, opacity, clip-path";
}

export function SmoothScroll() {
  const locationHref = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    const reducedMotion = prefersReducedMotion();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealElement(entry.target as HTMLElement, reducedMotion);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    const scan = () => {
      document.querySelectorAll(TEXT_SELECTOR).forEach((element) => {
        prepareElement(element);
        observer.observe(element);
      });
    };

    scan();

    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [locationHref]);

  return null;
}
