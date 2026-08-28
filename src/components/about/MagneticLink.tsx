import { type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

type MagneticLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
};

export function MagneticLink({ href, children, className = "", target, rel }: MagneticLinkProps) {
  const reducedMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 220, damping: 18, mass: 0.35 });
  const y = useSpring(rawY, { stiffness: 220, damping: 18, mass: 0.35 });

  const onMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set(((event.clientX - rect.left) / rect.width - 0.5) * 10);
    rawY.set(((event.clientY - rect.top) / rect.height - 0.5) * 10);
  };

  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.a
      href={href}
      target={target}
      rel={rel}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={reducedMotion ? undefined : { x, y }}
      className={className}
    >
      {children}
    </motion.a>
  );
}
