import { Terminal, Database, Sparkles, Github } from "lucide-react";

const stack = [
  { label: "React", type: "INTERFACE" },
  { label: "TypeScript", type: "STRUCTURE" },
  { label: "Supabase", type: "DATA" },
  { label: "Motion", type: "MOTION" },
  { label: "Tailwind", type: "SYSTEM" },
  { label: "GitHub", type: "SHIP" },
] as const;

const icons = [Terminal, Terminal, Database, Sparkles, Terminal, Github];

export function AboutTechnology() {
  return (
    <section id="building" className="border-t border-white/10 bg-[#050805] py-28 sm:py-40">
      <div className="about-scroll-content mx-auto w-[min(100%-1.25rem,1200px)]">
        <div className="about-building__intro grid gap-12 lg:grid-cols-[0.3fr_0.7fr] lg:gap-20">
          <div>
            <p className="about-kicker" data-text-reveal="done">03 / BUILDING</p>
            <p className="mt-4 text-xs uppercase leading-6 tracking-[0.13em] text-white/42">
              Tools are not trophies. They are the machinery behind the experience.
            </p>
          </div>

          <div>
            <h2 className="about-building__heading max-w-4xl text-[clamp(3.2rem,8vw,8.2rem)] font-semibold leading-[0.87] tracking-[-0.075em]" data-text-reveal="done">
              BUILD.
              <span className="block text-white/34">TEST.</span>
              <span className="block">SHIP.</span>
            </h2>
            <p className="about-building__copy mt-8 max-w-xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8" data-text-reveal="done">
              A practical stack keeps the visual layer fast, the data layer explicit, and the finished product close to the problem it was built to solve.
            </p>
          </div>
        </div>

        <div className="about-building__stack mt-18 overflow-hidden border-y border-white/10 py-7 sm:mt-24 sm:py-9">
          {stack.map(({ label, type }, index) => {
            const Icon = icons[index];
            return (
              <div
                key={label}
                data-cinematic-element="row"
                className="about-building__row flex items-center justify-between border-b border-white/[0.07] py-5 last:border-b-0"
              >
                <div className="about-building__row-main flex min-w-0 items-center gap-4 sm:gap-7">
                  <span className="about-building__row-index text-[0.6rem] font-semibold tracking-[0.16em] text-white/25">0{index + 1}</span>
                  <Icon className="about-building__row-icon size-4 text-[#8ef06a]/70" />
                  <span className="about-building__row-label truncate text-[clamp(1.35rem,3vw,2.8rem)] font-medium tracking-[-0.04em]">{label}</span>
                </div>
                <span className="about-building__row-type ml-5 shrink-0 text-[0.58rem] font-semibold tracking-[0.16em] text-white/28">{type}</span>
              </div>
            );
          })}
        </div>

        <div className="about-building__status mt-6 flex items-center justify-between gap-4 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-white/25 sm:mt-8">
          <span>STACK / ACTIVE</span>
          <span className="flex items-center gap-2 text-[#8ef06a]/65"><i className="about-building__status-dot" aria-hidden="true" /> SCROLL TO COMPILE</span>
        </div>
      </div>
    </section>
  );
}
