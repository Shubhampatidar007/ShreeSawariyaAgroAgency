import { useState, type PointerEvent } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import { ArrowDown, CircleArrowOutUpRight, Leaf } from "lucide-react";
import { DigitalSeed } from "@/components/about/DigitalSeed";
import { AnimatedText } from "@/components/about/AnimatedText";
import { HeroNameReveal } from "@/components/about/Heronamereveal";

export function AboutHero() {
  const reducedMotion = useReducedMotion();
  const pointerX = useSpring(0, { stiffness: 120, damping: 18, mass: 0.55 });
  const pointerY = useSpring(0, { stiffness: 120, damping: 18, mass: 0.55 });
  const pointerRotateX = useSpring(0, { stiffness: 100, damping: 20 });
  const pointerRotateY = useSpring(0, { stiffness: 100, damping: 20 });
  const [scrollHint, setScrollHint] = useState(true);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x * 24);
    pointerY.set(y * 20);
    pointerRotateY.set(x * 7);
    pointerRotateX.set(-y * 7);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
    pointerRotateX.set(0);
    pointerRotateY.set(0);
  };

  const enterStory = () => {
    setScrollHint(false);
    document.getElementById("identity")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section className="about-hero min-h-screen" aria-labelledby="about-hero-title">
      <div className="about-hero__grid" aria-hidden="true" />
      <div className="about-hero__noise" aria-hidden="true" />

      <div className="about-container about-hero__content">
        <div className="about-hero__eyebrow" data-text-reveal="done">
          <span><Leaf className="size-3.5" /> SHUBHAM PATIDAR</span>
          <span>AGRICULTURE × TECHNOLOGY</span>
        </div>

        <div className="about-hero__main">
          <div className="about-hero__scroll-copy">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="about-hero__copy"
            >
              <p className="about-kicker" data-text-reveal="done">DIGITAL BUILDER / DEVELOPER / PRODUCT THINKER</p>

              {/*
                Headline uses HeroNameReveal: per-letter 3D flip-in with a
                decode/scramble pass, a shimmering gradient, and cursor
                magnetism. data-text-reveal="done" keeps the site-wide
                generic text-reveal effect from also touching this element
                and double-animating it.
              */}
              <h1 id="about-hero-title" className="about-hero__title" data-text-reveal="done">
                <HeroNameReveal lines={["SHUBHAM", "PATIDAR."]} start="top 95%" />
              </h1>

              <AnimatedText
                as="p"
                text="Turning real-world problems into clear, useful digital experiences — with the discipline of a builder and the curiosity of a grower."
                className="about-hero__lede"
                splitBy="lines"
                stagger={0.05}
                start="top 95%"
                delay={0.3}
              />

              <button type="button" className="about-hero__scroll" onClick={enterStory}>
                <span>{scrollHint ? "ENTER THE STORY" : "CONTINUE THE STORY"}</span>
                <ArrowDown className="size-4" />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.88, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1.1, delay: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="about-hero__visual"
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
          >
            <div className="about-hero__scroll-stage">
              <motion.div
                style={reducedMotion ? undefined : { x: pointerX, y: pointerY, rotateX: pointerRotateX, rotateY: pointerRotateY, transformPerspective: 900 }}
                className="about-hero__visual-stage"
              >
                <DigitalSeed reducedMotion={reducedMotion === true} />
              </motion.div>
            </div>
            <div className="about-hero__visual-label" aria-hidden="true">
              <span>01</span>
              <span>DIGITAL SEED</span>
              <span><CircleArrowOutUpRight className="size-3.5" /></span>
            </div>
          </motion.div>
        </div>

        <div className="about-hero__footer" data-text-reveal="done">
          <span>BASED IN INDIA</span>
          <span>BUILDING WITH PURPOSE</span>
          <span>SCROLL / 01 →</span>
        </div>
      </div>
    </section>
  );
}