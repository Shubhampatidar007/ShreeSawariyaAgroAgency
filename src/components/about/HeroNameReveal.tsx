import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#";

interface HeroNameRevealProps {
  /** Each entry renders on its own line, matching the original two-line title. */
  lines: string[];
  className?: string;
  /** ScrollTrigger start position for the reveal. */
  start?: string;
}

/**
 * The hero name treatment:
 *  - per-character 3D flip-up entrance (GSAP + ScrollTrigger)
 *  - a short "decode" scramble on each character just before it settles
 *  - a continuous shimmering gradient across the text
 *  - cursor-magnetic letters (each character nudges toward the pointer)
 *
 * Entrance + scramble live on an *outer* span per character; the magnetic
 * pointer offset lives on a nested *inner* span. Keeping them on separate
 * elements means the two animations never fight over the same transform.
 *
 * Fully reduced-motion safe: scramble, flip, and the magnetic listener are
 * all skipped when the OS/browser has motion reduced — text just renders
 * in place, gradient included, with no animation of any kind.
 */
export function HeroNameReveal({ lines, className = "", start = "top 95%" }: HeroNameRevealProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const outerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const innerRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const lineGroups = useMemo(() => lines.map((line) => line.split("")), [lines]);
  const flatChars = useMemo(() => lineGroups.flat(), [lineGroups]);

  outerRefs.current = [];
  innerRefs.current = [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const outers = outerRefs.current.filter((el): el is HTMLSpanElement => Boolean(el));
        if (!outers.length) return;

        gsap.set(outers, {
          opacity: 0,
          rotateX: -100,
          y: 42,
          filter: "blur(14px)",
          transformOrigin: "50% 100%",
        });

        const stagger = 0.045;

        outerRefs.current.forEach((el, i) => {
          const finalChar = flatChars[i];
          if (!el || !finalChar || finalChar.trim() === "") return;

          const delayedCall = gsap.delayedCall(i * stagger, () => {
            let step = 0;
            const steps = 5;
            const intervalId = window.setInterval(() => {
              if (!el.isConnected) {
                window.clearInterval(intervalId);
                return;
              }
              if (step >= steps) {
                el.textContent = finalChar;
                window.clearInterval(intervalId);
                return;
              }
              el.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
              step += 1;
            }, 35);
            cleanups.push(() => window.clearInterval(intervalId));
          });
          cleanups.push(() => delayedCall.kill());
        });

        gsap.to(outers, {
          opacity: 1,
          rotateX: 0,
          y: 0,
          filter: "blur(0px)",
          duration: 0.85,
          ease: "power4.out",
          stagger,
          scrollTrigger: {
            trigger: container,
            start,
            toggleActions: "play none none none",
          },
        });

        const quickX = innerRefs.current.map((el) =>
          el ? gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" }) : null,
        );
        const quickY = innerRefs.current.map((el) =>
          el ? gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" }) : null,
        );
        const radius = 110;

        const handlePointerMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          innerRefs.current.forEach((el, i) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = event.clientX - cx;
            const dy = event.clientY - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < radius) {
              const strength = 1 - dist / radius;
              quickX[i]?.(-dx * 0.3 * strength);
              quickY[i]?.(-dy * 0.3 * strength);
            } else {
              quickX[i]?.(0);
              quickY[i]?.(0);
            }
          });
        };

        const handlePointerLeave = () => {
          innerRefs.current.forEach((_, i) => {
            quickX[i]?.(0);
            quickY[i]?.(0);
          });
        };

        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        container.addEventListener("pointerleave", handlePointerLeave);
        cleanups.push(() => {
          window.removeEventListener("pointermove", handlePointerMove);
          container.removeEventListener("pointerleave", handlePointerLeave);
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const outers = outerRefs.current.filter((el): el is HTMLSpanElement => Boolean(el));
        gsap.set(outers, { opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" });
      });

      return () => mm.revert();
    }, container);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [flatChars, start]);

  let globalIndex = -1;

  return (
    <span ref={containerRef} className={`hero-name-reveal ${className}`} style={{ perspective: 600 }}>
      {/* Real text for screen readers / SEO — the split characters below are aria-hidden.
          Inline style is a belt-and-braces fallback in case sr-only isn't in the build. */}
      <span
        className="sr-only"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {lines.join(" ")}
      </span>

      <span aria-hidden="true">
        {lineGroups.map((line, lineIndex) => (
          <span key={lineIndex} className="block" style={{ whiteSpace: "nowrap" }}>
            {line.map((char, charIndex) => {
              globalIndex += 1;
              const index = globalIndex;
              return (
                <span
                  key={`${lineIndex}-${charIndex}`}
                  ref={(el) => {
                    outerRefs.current[index] = el;
                  }}
                  className="hero-name-reveal__char"
                  style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
                >
                  <span
                    ref={(el) => {
                      innerRefs.current[index] = el;
                    }}
                    style={{ display: "inline-block" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                </span>
              );
            })}
          </span>
        ))}
      </span>

      <style>{`
        .hero-name-reveal {
          display: inline-block;
          background-image: linear-gradient(100deg, #f4fff4 0%, #7effb2 35%, #34d17a 55%, #f4fff4 75%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: hero-name-shimmer 6s linear infinite;
        }
        @keyframes hero-name-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 250% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-name-reveal {
            animation: none;
            background-position: 0% 50%;
          }
        }
      `}</style>
    </span>
  );
}