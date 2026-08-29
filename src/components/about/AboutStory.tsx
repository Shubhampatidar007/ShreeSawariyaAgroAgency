import { ArrowDownLeft } from "lucide-react";

const statements = [
  "I DON'T JUST",
  "WRITE CODE.",
  "I BUILD",
  "EXPERIENCES.",
] as const;

export function AboutStory() {
  return (
    <section id="story" className="border-t border-white/10 bg-[#050805] py-28 sm:py-40" aria-labelledby="about-story-title">
      <div className="about-scroll-content mx-auto w-[min(100%-1.25rem,1200px)]">
        <div className="grid gap-14 lg:grid-cols-[0.28fr_0.72fr] lg:gap-20">
          <div>
            <p className="about-kicker" data-text-reveal="done">05 / STORY</p>
            <p className="mt-5 max-w-xs text-xs uppercase leading-6 tracking-[0.14em] text-white/35">
              The brief is simple: make something useful, then make it memorable.
            </p>
          </div>

          <div>
            <p id="about-story-title" className="text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-white/28" data-text-reveal="done">A builder's rule</p>
            <div className="mt-10 space-y-1 sm:mt-14">
              {statements.map((statement, index) => (
                <p
                  key={statement}
                  data-cinematic-element="statement"
                  className={`text-[clamp(3.2rem,9vw,9rem)] font-semibold leading-[0.83] tracking-[-0.075em] ${index > 1 ? "text-white" : "text-white/26"}`}
                >
                  {statement}
                </p>
              ))}
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-6 sm:mt-20">
              <p className="max-w-xl text-sm leading-6 text-white/48 sm:text-base sm:leading-7" data-text-reveal="done">
                Good interfaces disappear into the task. Great interfaces make the task feel lighter.
              </p>
              <div className="flex items-center gap-2 text-[#8ef06a]" aria-hidden="true">
                <ArrowDownLeft className="size-4" />
                <span className="text-[0.58rem] font-semibold uppercase tracking-[0.16em]">Keep building</span>
              </div>
            </div>
          </div>
        </div>

        <div
          data-cinematic-element="story-rule"
          className="mt-20 origin-left border-t border-[#8ef06a]/35 sm:mt-28"
        />
      </div>
    </section>
  );
}
