import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type AnimatedTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

interface AnimatedTextProps {
  /** The text to animate. Plain string only — this splits on spaces. */
  text: string;
  /** Element to render as. Defaults to "p". */
  as?: AnimatedTextTag;
  className?: string;
  /**
   * "words"  -> each word slides in on its own stagger step.
   * "lines"  -> words are grouped by their rendered line (recalculated on
   *             resize) and each *line* slides in together — the classic
   *             "text comes up from behind a mask" effect.
   */
  splitBy?: "words" | "lines";
  /** Stagger between each word/line, in seconds. */
  stagger?: number;
  /** Duration of each reveal, in seconds. */
  duration?: number;
  /** ScrollTrigger start position. */
  start?: string;
  /** If false, the animation replays when scrolling back up past start. */
  once?: boolean;
  /** Extra delay before the whole reveal begins, in seconds. */
  delay?: number;
}

/**
 * Splits `text` into words, each wrapped in a clipping mask, and reveals
 * them on scroll with GSAP + ScrollTrigger. Fully responsive: line grouping
 * (when splitBy="lines") is recalculated on resize via ResizeObserver, and
 * ScrollTrigger recalculates trigger points on viewport changes on its own.
 *
 * Respects prefers-reduced-motion: text is simply shown in place, no motion.
 */
export function AnimatedText({
  text,
  as: Tag = "p",
  className = "",
  splitBy = "words",
  stagger = 0.035,
  duration = 0.9,
  start = "top 85%",
  once = true,
  delay = 0,
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const words = text.split(" ").filter(Boolean);
  const [lineGroups, setLineGroups] = useState<number[][] | null>(null);
  const uid = useId();

  // Group word indices by their rendered top offset -> "lines".
  useLayoutEffect(() => {
    if (splitBy !== "lines") {
      setLineGroups(null);
      return;
    }

    const computeLines = () => {
      const groups: number[][] = [];
      let currentTop: number | null = null;
      let currentGroup: number[] = [];

      wordRefs.current.forEach((el, index) => {
        if (!el) return;
        const top = el.offsetTop;
        if (currentTop === null || Math.abs(top - currentTop) < 2) {
          currentGroup.push(index);
          currentTop = top;
        } else {
          groups.push(currentGroup);
          currentGroup = [index];
          currentTop = top;
        }
      });
      if (currentGroup.length) groups.push(currentGroup);
      setLineGroups(groups);
    };

    computeLines();

    const resizeObserver = new ResizeObserver(() => computeLines());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", computeLines);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", computeLines);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitBy, words.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets: HTMLSpanElement[][] =
          splitBy === "lines" && lineGroups
            ? lineGroups.map((group) =>
                group.map((i) => wordRefs.current[i]).filter((el): el is HTMLSpanElement => Boolean(el)),
              )
            : wordRefs.current
                .filter((el): el is HTMLSpanElement => Boolean(el))
                .map((el) => [el]);

        const flat = targets.flat();
        if (!flat.length) return;

        gsap.set(flat, { yPercent: 115, opacity: 0 });

        gsap.to(flat, {
          yPercent: 0,
          opacity: 1,
          duration,
          delay,
          ease: "power4.out",
          stagger,
          scrollTrigger: {
            trigger: container,
            start,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(wordRefs.current.filter(Boolean), { yPercent: 0, opacity: 1 });
      });

      return () => mm.revert();
    }, container);

    return () => ctx.revert();
  }, [splitBy, stagger, duration, start, once, delay, lineGroups, words.length]);

  return (
    <Tag ref={containerRef as React.RefObject<HTMLElement>} className={className}>
      {words.map((word, index) => (
        <span
          key={`${uid}-${index}`}
          className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em] align-bottom"
        >
          <span
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className="inline-block will-change-transform"
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}