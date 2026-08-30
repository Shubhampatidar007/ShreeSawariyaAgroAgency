import { useAboutScrollMotion } from "@/components/about/useAboutScrollMotion";
import { AboutExperienceNavbar } from "@/components/about/AboutExperienceNavbar";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutIdentity } from "@/components/about/AboutIdentity";
import { AboutTechnology } from "@/components/about/AboutTechnology";
import { AboutAgricultureTech } from "@/components/about/AboutAgricultureTech";
import { AboutStory } from "@/components/about/AboutStory";
import { AboutGithubProfile } from "@/components/about/AboutGithubProfile";
import { AboutConnect } from "@/components/about/AboutConnect";
import "@/components/about/about.css";
import "@/components/about/about-polish.css";
import "@/components/about/about-responsive.css";

export function AboutExperience() {
  useAboutScrollMotion();

  return (
    // id="about-experience" added: the navbar's "Intro" link and its
    // IntersectionObserver both target this id, but no element in the
    // page actually carried it before now — so "Back to intro" and the
    // nav's active-state highlighting for the hero silently did nothing.
    <div
      id="about-experience"
      className="about-experience min-h-screen overflow-x-clip bg-[#050805] text-white"
    >
      <AboutExperienceNavbar />
      <main>
        <AboutHero />
        <AboutIdentity />
        <AboutTechnology />
        <AboutAgricultureTech />
        <AboutStory />
        <AboutGithubProfile />
        <AboutConnect />
      </main>
    </div>
  );
}
