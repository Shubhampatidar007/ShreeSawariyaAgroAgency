import { useAboutScrollMotion } from "@/components/about/useAboutScrollMotion";
import { AboutExperienceNavbar } from "@/components/about/AboutExperienceNavbar";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutIdentity } from "@/components/about/AboutIdentity";
import { AboutTechnology } from "@/components/about/AboutTechnology";
import { AboutAgricultureTech } from "@/components/about/AboutAgricultureTech";
import { AboutStory } from "@/components/about/AboutStory";
import { AboutConnect } from "@/components/about/AboutConnect";
import "@/components/about/about.css";
import "@/components/about/about-polish.css";

export function AboutExperience() {
  useAboutScrollMotion();

  return (
    <div className="about-experience min-h-screen overflow-x-clip bg-[#050805] text-white">
      <AboutExperienceNavbar />
      <main>
        <AboutHero />
        <AboutIdentity />
        <AboutTechnology />
        <AboutAgricultureTech />
        <AboutStory />
        <AboutConnect />
      </main>
    </div>
  );
}
