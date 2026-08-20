import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealDirection = "up" | "down" | "left" | "right" | "none";

type ScrollRevealProps = {
  children: ReactNode;

  /**
   * Delay before the animation starts.
   * Useful for staggered cards.
   */
  delay?: number;

  /**
   * Animation duration in milliseconds.
   */
  duration?: number;

  /**
   * Distance the element travels during reveal.
   */
  distance?: number;

  /**
   * Direction from which the element enters.
   */
  direction?: RevealDirection;

  /**
   * Starting opacity.
   */
  opacity?: number;

  /**
   * Starting blur amount.
   */
  blur?: number;

  /**
   * Starting scale.
   * Example: 0.96 means the element starts at 96%.
   */
  scale?: number;

  /**
   * IntersectionObserver threshold.
   */
  threshold?: number;

  /**
   * How far outside the viewport to start detecting.
   */
  rootMargin?: string;

  /**
   * Whether the animation should happen only once.
   */
  once?: boolean;

  /**
   * Optional className for the wrapper.
   */
  className?: string;

  /**
   * Optional inline styles.
   */
  style?: CSSProperties;

  /**
   * Optional callback when reveal starts.
   */
  onReveal?: () => void;
};

const getTransform = (direction: RevealDirection, distance: number, scale: number) => {
  const translations: Record<RevealDirection, string> = {
    up: `translate3d(0, ${distance}px, 0)`,
    down: `translate3d(0, -${distance}px, 0)`,
    left: `translate3d(${distance}px, 0, 0)`,
    right: `translate3d(-${distance}px, 0, 0)`,
    none: "translate3d(0, 0, 0)",
  };

  const translation = translations[direction];

  if (scale === 1) {
    return translation;
  }

  return `${translation} scale(${scale})`;
};

export function ScrollReveal({
  children,
  delay = 0,
  duration = 600,
  distance = 24,
  direction = "up",
  opacity = 0,
  blur = 0,
  scale = 1,
  threshold = 0.12,
  rootMargin = "0px 0px -60px 0px",
  once = true,
  className = "",
  style,
  onReveal,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const hasRevealedRef = useRef(false);
  const callbackRef = useRef(onReveal);

  const [isVisible, setIsVisible] = useState(false);
  const [supportsReducedMotion, setSupportsReducedMotion] = useState(false);

  /*
   * Keep the callback reference current without
   * forcing the IntersectionObserver to recreate.
   */
  useEffect(() => {
    callbackRef.current = onReveal;
  }, [onReveal]);

  /*
   * Respect the user's operating-system
   * accessibility preference.
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => {
      setSupportsReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  /*
   * Observe when the component enters the viewport.
   */
  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    /*
     * If reduced motion is enabled,
     * reveal immediately without animation.
     */
    if (supportsReducedMotion) {
      setIsVisible(true);
      return;
    }

    /*
     * Browser fallback.
     */
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsVisible(true);

          if (!hasRevealedRef.current) {
            hasRevealedRef.current = true;
            callbackRef.current?.();
          }

          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once, rootMargin, supportsReducedMotion, threshold]);

  const hiddenTransform = getTransform(direction, distance, scale);

  const visibleTransform = "translate3d(0, 0, 0) scale(1)";

  const revealStyle: CSSProperties = {
    opacity: isVisible ? 1 : opacity,
    transform: isVisible ? visibleTransform : hiddenTransform,
    filter: isVisible || blur === 0 ? "blur(0px)" : `blur(${blur}px)`,
    transitionProperty: "opacity, transform, filter",
    transitionDuration: supportsReducedMotion ? "0ms" : `${duration}ms`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: supportsReducedMotion ? "0ms" : `${delay}ms`,
    willChange: isVisible ? "auto" : "opacity, transform, filter",
    ...style,
  };

  return (
    <div ref={elementRef} className={className} style={revealStyle}>
      {children}
    </div>
  );
}

export default ScrollReveal;
