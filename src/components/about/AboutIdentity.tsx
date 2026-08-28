import { ArrowUpRight, Braces, Compass, Layers3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const traits = [
  { icon: Braces, index: "01", title: "DEVELOPER", body: "Systems, interfaces, and interactions that stay understandable under real use." },
  { icon: Layers3, index: "02", title: "BUILDER", body: "From a rough problem to a shipped experience, with structure before spectacle." },
  { icon: Compass, index: "03", title: "PRODUCT THINKER", body: "Every screen earns its place by helping someone move from intent to outcome." },
] as const;

export function AboutIdentity() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="identity" className="border-t border-white/10 bg-[#071007] py-28 sm:py-40">
      <div className="mx-auto w-[min(100%-1.25rem,1200px)]">
        <div className="grid gap-12 lg:grid-cols-[0.33fr_0.67fr] lg:gap-20">
          <div>
            <p className="about-kicker" data-text-reveal="done">02 / IDENTITY</p>
            <p className="mt-4 max-w-[17rem] text-xs uppercase leading-6 tracking-[0.13em] text-white/42">
              The person behind the interface is part of the product.
            </p>
          </div>

          <div>
            <h2 className="max-w-5xl text-[clamp(3rem,8vw,8rem)] font-semibold leading-[0.88] tracking-[-0.07em]" data-text-reveal="done">
              WHO IS
              <span className="block text-white/34">SHUBHAM</span>
              <span className="block">PATIDAR?</span>
            </h2>

            <div className="mt-10 max-w-2xl border-l border-[#8ef06a]/35 pl-5 sm:pl-7">
              <p className="text-base leading-7 text-white/66 sm:text-lg sm:leading-8" data-text-reveal="done">
                A digital builder mindset: start with the real problem, strip away noise, then make the useful part feel inevitable.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 md:grid-cols-3">
          {traits.map(({ icon: Icon, index, title, body }, traitIndex) => (
            <motion.article
              key={title}
              initial={reducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: reducedMotion ? 0 : 0.65, delay: reducedMotion ? 0 : traitIndex * 0.08 }}
              className="group bg-[#0b140b] p-6 sm:p-8"
            >
              <div className="flex items-center justify-between text-[#8ef06a]">
                <Icon className="size-5" />
                <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-white/35">{index}</span>
              </div>
              <h3 className="mt-16 text-lg font-semibold tracking-[0.12em]">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/48">{body}</p>
              <ArrowUpRight className="mt-7 size-4 text-white/25 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#8ef06a]" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
