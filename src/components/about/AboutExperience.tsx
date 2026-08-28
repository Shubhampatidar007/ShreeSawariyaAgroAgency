import { AboutExperienceNavbar } from "@/components/about/AboutExperienceNavbar";
import { AboutHero } from "@/components/about/AboutHero";
import "@/components/about/about.css";

export function AboutExperience() {
  return (
    <div className="about-experience min-h-screen overflow-x-clip bg-[#050805] text-white">
      <AboutExperienceNavbar />
      <main>
        <AboutHero />
        <section className="about-phase-placeholder" aria-label="About experience continuation">
          <div className="about-container py-28 sm:py-36">
            <p className="about-kicker" data-text-reveal="done">SCROLL TO CONTINUE</p>
            <p className="about-placeholder-copy" data-text-reveal="done">
              A story about building useful digital experiences from real-world problems.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
