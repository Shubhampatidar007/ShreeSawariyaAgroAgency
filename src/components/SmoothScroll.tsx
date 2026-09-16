import { animate } from "motion";
import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { adminNavSections } from "@/data/navigation";

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

function isTouchInsideHorizontalScroller(element: Element) {
  let current: Element | null = element;

  while (current && current !== document.body) {
    if (current instanceof HTMLElement && current.scrollWidth > current.clientWidth + 1) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function isInteractiveElement(element: Element) {
  return Boolean(
    element.closest(
      "a, button, input, textarea, select, option, [role=button], [contenteditable=true], iframe",
    ),
  );
}

export function SmoothScroll() {
  const router = useRouter();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({ select: (state) => state.location.pathname });

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
        if (element.closest(".about-experience")) return;
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    if (!mediaQuery.matches) return;

    let startX = 0;
    let startY = 0;
    let startTarget: EventTarget | null = null;

    const getSections = () => Array.from(document.querySelectorAll<HTMLElement>("main > section"));

    const getCurrentSectionIndex = (sections: HTMLElement[]) => {
      const scrollPosition = window.scrollY + 80;
      let currentIndex = 0;

      sections.forEach((section, index) => {
        if (section.offsetTop <= scrollPosition) currentIndex = index;
      });

      return currentIndex;
    };

    const goToSection = (direction: 1 | -1) => {
      const sections = getSections();
      if (pathname !== "/" || sections.length < 2) return;

      const currentIndex = getCurrentSectionIndex(sections);
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));

      if (nextIndex === currentIndex) return;

      window.scrollTo({
        top: Math.max(0, sections[nextIndex].offsetTop),
        behavior: "auto",
      });
    };

    const primaryAdminPaths = ["/admin", "/admin/sales", "/admin/inventory", "/admin/customers"];
    const allAdminItems = adminNavSections.flatMap((section) => section.items);
    const additionalAdminItems = allAdminItems.filter(
      (item) => !primaryAdminPaths.includes(item.to),
    );
    const adminItems = [
      ...primaryAdminPaths.map((to) => allAdminItems.find((item) => item.to === to)).filter(Boolean),
      ...additionalAdminItems,
    ] as typeof allAdminItems;

    const getCurrentAdminIndex = () =>
      adminItems.findIndex((item) =>
        item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to),
      );

    const goToAdminPage = (direction: 1 | -1) => {
      if (!pathname.startsWith("/admin")) return;

      const currentIndex = getCurrentAdminIndex();
      if (currentIndex < 0) return;

      const nextIndex = (currentIndex + direction + adminItems.length) % adminItems.length;
      if (nextIndex === currentIndex) return;

      void router.navigate({ to: adminItems[nextIndex].to });
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      startX = touch.clientX;
      startY = touch.clientY;
      startTarget = event.target;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      if (startTarget instanceof Element) {
        if (isInteractiveElement(startTarget)) return;
        if (isTouchInsideHorizontalScroller(startTarget)) return;
      }

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (horizontalDistance < 60 || horizontalDistance <= verticalDistance + 20) return;

      if (pathname.startsWith("/admin")) {
        // Swipe right-to-left to advance: Home -> Sales -> Stock -> Customers -> ... -> Home.
        goToAdminPage(deltaX < 0 ? 1 : -1);
      } else {
        goToSection(deltaX < 0 ? 1 : -1);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
