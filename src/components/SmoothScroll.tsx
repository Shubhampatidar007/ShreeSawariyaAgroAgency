import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const TEXT_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, label";

/**
 * Sections whose animation is owned by another system (GSAP drives the
 * About page). SmoothScroll never touches anything inside them so the two
 * systems cannot fight over the same elements.
 */
const SKIP_CONTAINER_SELECTOR = ".about-page";

/**
 * Bookkeeping lives in WeakSets instead of `data-*` attributes and inline
 * styles. Mutating server-rendered nodes before React hydrates them (which
 * used to happen here because the root mounts before lazy route chunks
 * finish hydrating) triggered a hydration mismatch on every page load and
 * made the reveal animations flicker or appear stuck. WeakSets never touch
 * the DOM, and a finished Web Animations API animation leaves no trace on
 * the element either.
 */
const revealedElements = new WeakSet<Element>();
const observedElements = new WeakSet<Element>();

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasVisibleText(element: Element) {
  return Boolean(element.textContent?.trim());
}

function isOptedOut(element: Element) {
  if (element.hasAttribute("data-text-reveal")) return true;
  return Boolean(element.closest(SKIP_CONTAINER_SELECTOR));
}

function supportsWAAPI(element: Element): element is HTMLElement & {
  animate: typeof HTMLElement.prototype.animate;
} {
  return typeof (element as HTMLElement).animate === "function";
}

function revealElement(element: HTMLElement, immediate = false) {
  if (revealedElements.has(element) || !hasVisibleText(element)) return;
  revealedElements.add(element);

  /*
   * With reduced motion, an immediate reveal, or no Web Animations API
   * support, we simply leave the element in its natural visible state —
   * nothing was hidden, so there is nothing to restore.
   */
  if (immediate || prefersReducedMotion() || !supportsWAAPI(element)) return;

  element.animate(
    [
      {
        opacity: 0,
        transform: "translateY(1.1em)",
        clipPath: "inset(1.15em 0 0 0)",
      },
      {
        opacity: 1,
        transform: "translateY(0)",
        clipPath: "inset(0 0 0 0)",
      },
    ],
    {
      duration: 800,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
}

export function SmoothScroll() {
  const locationHref = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

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
        if (observedElements.has(element) || revealedElements.has(element)) return;
        if (isOptedOut(element)) {
          revealedElements.add(element);
          return;
        }
        observedElements.add(element);
        observer.observe(element);
      });
    };

    /*
     * React re-renders (cart updates, dialogs, route chunks mounting…) fire
     * this observer constantly on busy pages. Coalesce each burst into a
     * single scan per frame instead of re-querying the whole document.
     */
    let scanQueued = false;
    const queueScan = () => {
      if (scanQueued) return;
      scanQueued = true;
      requestAnimationFrame(() => {
        scanQueued = false;
        scan();
      });
    };

    scan();

    const mutationObserver = new MutationObserver(queueScan);
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
