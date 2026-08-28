import { useEffect, useState } from "react";
import { ArrowDown, Menu } from "lucide-react";

const items = [
  { id: "about-experience", label: "Intro" },
  { id: "identity", label: "Identity" },
  { id: "building", label: "Building" },
  { id: "agriculture-tech", label: "Field × Tech" },
  { id: "story", label: "Story" },
  { id: "connect", label: "Connect" },
] as const;

export function AboutExperienceNavbar() {
  const [activeId, setActiveId] = useState("about-experience");
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.65] },
    );
    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className={`about-nav ${compact ? "about-nav--compact" : ""}`}>
      <div className="about-nav__shell">
        <button type="button" className="about-nav__brand" onClick={() => goTo("about-experience")} aria-label="Back to About intro">
          <span className="about-nav__brand-mark">SP</span>
          <span>
            <strong>SHUBHAM</strong>
            <small>DIGITAL BUILDER</small>
          </span>
        </button>

        <nav className="about-nav__links" aria-label="About sections">
          {items.slice(1).map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeId === item.id ? "is-active" : ""}
              onClick={() => goTo(item.id)}
            >
              <span>{item.label}</span>
              {activeId === item.id ? <i aria-hidden="true" /> : null}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="about-nav__menu"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-controls="about-mobile-menu"
          aria-label="Toggle About navigation"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {menuOpen ? (
        <nav id="about-mobile-menu" className="about-nav__mobile" aria-label="About mobile sections">
          {items.slice(1).map((item) => (
            <button key={item.id} type="button" className={activeId === item.id ? "is-active" : ""} onClick={() => goTo(item.id)}>
              <span>{item.label}</span>
              <ArrowDown className="size-4 -rotate-45" />
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
