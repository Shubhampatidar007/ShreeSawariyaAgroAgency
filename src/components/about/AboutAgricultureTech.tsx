import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Activity, Sprout } from "lucide-react";

const rows = Array.from({ length: 8 }, (_, index) => index);

export function AboutAgricultureTech() {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const fieldY = useTransform(scrollYProgress, [0, 1], [50, -70]);
  const scanY = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const copyY = useTransform(scrollYProgress, [0, 1], [40, -30]);

  return (
    <section ref={ref} id="agriculture-tech" className="relative overflow-hidden border-t border-white/10 bg-[#080d08] py-28 sm:py-40" aria-labelledby="field-tech-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(112,255,92,0.08),transparent_34%)]" aria-hidden="true" />
      <div className="mx-auto w-[min(100%-1.25rem,1200px)]">
        <div className="grid items-end gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:gap-20">
          <motion.div style={reducedMotion ? undefined : { y: copyY }}>
            <p className="about-kicker" data-text-reveal="done">04 / FIELD × TECH</p>
            <div className="mt-5 flex items-center gap-3 text-white/42">
              <Sprout className="size-4 text-[#8ef06a]" />
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.15em]">From field signal to digital signal</span>
            </div>
          </motion.div>

          <motion.div style={reducedMotion ? undefined : { y: copyY }}>
            <h2 id="field-tech-title" className="max-w-5xl text-[clamp(3rem,8vw,8rem)] font-semibold leading-[0.87] tracking-[-0.075em]" data-text-reveal="done">
              AGRICULTURE
              <span className="block text-white/30">IS DATA.</span>
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/57 sm:text-lg sm:leading-8" data-text-reveal="done">
              A field has patterns, constraints, timing, supply, and decisions. A digital product has the same raw ingredients. The craft is making that complexity legible.
            </p>
          </motion.div>
        </div>

        <div className="relative mt-18 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a140b] p-5 sm:mt-24 sm:p-8" style={{ minHeight: "min(68vw, 720px)" }}>
          <motion.div style={reducedMotion ? undefined : { y: fieldY }} className="absolute inset-[-12%] opacity-90">
            <div className="absolute inset-0 rotate-[-4deg] bg-[repeating-linear-gradient(96deg,transparent_0_26px,rgba(141,240,106,0.13)_27px,transparent_28px_55px)]" />
            <div className="absolute inset-[8%] rounded-[50%] border border-[#8ef06a]/15 [transform:rotate(-8deg)]" />
            <div className="absolute inset-[18%] rounded-[46%] border border-[#8ef06a]/20 [transform:rotate(9deg)]" />
            <div className="absolute inset-[29%] rounded-[42%] border border-white/10 [transform:rotate(-14deg)]" />
          </motion.div>

          <motion.div style={reducedMotion ? undefined : { y: scanY }} className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-[#9ff67c]/70 shadow-[0_0_30px_rgba(142,240,106,0.55)]" aria-hidden="true" />

          <div className="relative grid min-h-[min(60vw,650px)] content-end gap-8 sm:grid-cols-[0.5fr_0.5fr] sm:items-end">
            <div className="max-w-xl rounded-3xl border border-white/10 bg-[#071007]/78 p-6 backdrop-blur-md sm:p-8">
              <div className="flex items-center justify-between gap-4 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-white/35">
                <span>FIELD / 04</span>
                <span className="flex items-center gap-2 text-[#8ef06a]"><Activity className="size-3.5" /> LIVE PATTERN</span>
              </div>
              <p className="mt-8 text-[clamp(2rem,4vw,4.3rem)] font-medium leading-[0.95] tracking-[-0.05em] text-white">
                Turn the mess into a signal.
              </p>
            </div>

            <div className="space-y-2 sm:justify-self-end sm:w-[min(100%,360px)]">
              {rows.map((row) => (
                <div key={row} className="flex items-center gap-3 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-white/30">
                  <span className="w-6 tabular-nums">{String(row + 1).padStart(2, "0")}</span>
                  <div className="h-px flex-1 bg-white/10">
                    <motion.div
                      initial={{ width: reducedMotion ? `${30 + row * 7}%` : "0%" }}
                      whileInView={{ width: `${30 + row * 7}%` }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : row * 0.06 }}
                      className="h-full bg-[#8ef06a]/55"
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums text-white/20">{30 + row * 7}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
