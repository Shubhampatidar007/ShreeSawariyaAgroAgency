import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AboutSection } from "@/components/about/AboutSection";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Shree Sawariya Agro Agency" },
      {
        name: "description",
        content: "Discover the story, profile and technology behind Shree Sawariya Agro Agency.",
      },
      { property: "og:title", content: "About — Shree Sawariya Agro Agency" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="about-page-shell min-h-screen bg-background">
      <SiteHeader />
      <AboutSection />
      <SiteFooter />
    </div>
  );
}
