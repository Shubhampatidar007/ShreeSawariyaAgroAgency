import { useRef, type PointerEvent } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";
import { ArrowDown, CircleArrowOutUpRight, Leaf } from "lucide-react";
import { DigitalSeed } from "@/components/about/DigitalSeed";

export function AboutHero() {
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const scrollVelocity = useVelocity(scrollY);

  const heroCopyY = useTransform(scrollYProgress, [0, 0.7, 1], [0, -40, -150]);
  const heroCopyOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 0.72, 0]);
  const heroVisualY = useTransform(scrollYProgress, [0, 0.7, 1], [0, 35, 115]);
  const heroVisualScale = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.94, 0.82]);
  const heroVisualOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 0.82, 0.18]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const velocityTilt = useTransform(scrollVelocity, [-2500, 0, 2500], [7, 0, -7]);

  const pointerX = useSpring(0, { stiffness: 120, damping: 18, mass: 0.55 });
  const pointerY = useSpring(0, { stiffness: 120, damping: 18, mass: 0.55 });
  const pointerRotateX = useSpring(0, { stiffness: 100, damping: 20 });
  const pointerRotateY = useSpring(0, { stiffness: 100, damping: 20 });

  const instant = reducedMotion === true;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (instant || event.pointerType !== "mouse") return;
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

  return (
    <section ref={heroRef} id="about-experience" className="about-hero min-h-screen" aria-labelledby="about-hero-title">
      <motion.div className="about-hero__grid" style={instant ? undefined : { y: gridY }} aria-hidden="true" />
      <div className="about-hero__noise" aria-hidden="true" />

      <div className="about-container about-hero__content">
        <div className="about-hero__eyebrow" data-text-reveal="done">
          <span><Leaf className="size-3.5" /> SHUBHAM PATIDAR</span>
          <span>AGRICULTURE × TECHNOLOGY</span>
        </div>

        <div className="about-hero__main">
          <motion.div
            initial={instant ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            style={instant ? undefined : { y: heroCopyY, opacity: heroCopyOpacity }}
            transition={{ duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="about-hero__copy"
          >
            <p className="about-kicker" data-text-reveal="done">DIGITAL BUILDER / DEVELOPER / PRODUCT THINKER</p>
            <h1 id="about-hero-title" className="about-hero__title" data-text-reveal="done">
              SHUBHAM
              <span>PATIDAR.</span>
            </h1>
            <p className="about-hero__lede" data-text-reveal="done">
              Turning real-world problems into clear, useful digital experiences — with the discipline of a builder and the curiosity of a grower.
            </p>

            <button type="button" className="about-hero__scroll" onClick={() => document.getElementById("identity")?.scrollIntoView({ behavior: "smooth" })}>
              <span>ENTER THE STORY</span>
              <ArrowDown className="size-4" />
            </button>
          </motion.div>

          <motion.div
            initial={instant ? false : { opacity: 0, scale: 0.88, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            style={instant ? undefined : { y: heroVisualY, scale: heroVisualScale, opacity: heroVisualOpacity }}
            transition={{ duration: instant ? 0 : 1.1, delay: instant ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="about-hero__visual"
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
          >
            <motion.div
              style={instant ? undefined : { x: pointerX, y: pointerY, rotateX: pointerRotateX, rotateY: pointerRotateY, rotateZ: velocityTilt, transformPerspective: 900 }}
              className="about-hero__visual-stage"
            >
              <DigitalSeed reducedMotion={instant} />
            </motion.div>
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
