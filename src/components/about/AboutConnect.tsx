import { ArrowUpRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { MagneticLink } from "@/components/about/MagneticLink";

const links = [
  {
    label: "EMAIL",
    detail: "shubhampatidar7851@gmail.com",
    href: "mailto:shubhampatidar7851@gmail.com",
    icon: Mail,
  },
  {
    label: "WHATSAPP",
    detail: "9752469028",
    href: "https://wa.me/9752469028",
    icon: MessageCircle,
  },
  {
    label: "INSTAGRAM",
    detail: "vibeswithshubh",
    href: "https://instagram.com/vibeswithshubh",
    icon: Instagram,
  },
] as const;

export function AboutConnect() {
  return (
    <section id="connect" className="border-t border-white/10 bg-[#071007] py-24 sm:py-32" aria-labelledby="about-connect-title">
      <div className="mx-auto w-[min(100%-1.25rem,1200px)]">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="about-kicker" data-text-reveal="done">06 / CONNECT</p>
            <h2 id="about-connect-title" className="mt-5 max-w-4xl text-[clamp(3rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.075em]" data-text-reveal="done">
              KEEP THE
              <span className="block text-white/32">CONVERSATION</span>
              <span className="block">MOVING.</span>
            </h2>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:mt-20 lg:grid-cols-3">
          {links.map(({ label, detail, href, icon: Icon }, index) => (
            <MagneticLink
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="group flex min-h-56 flex-col justify-between rounded-[1.75rem] border border-white/10 bg-[#0a140b] p-6 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-[#8ef06a]/35 hover:bg-[#0c180d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ef06a]/70 sm:p-7"
            >
              <div className="flex items-center justify-between text-[#8ef06a]">
                <Icon className="size-5" />
                <span className="text-[0.58rem] font-semibold tracking-[0.16em] text-white/25">0{index + 1}</span>
              </div>
              <div>
                <p className="text-[0.63rem] font-semibold tracking-[0.17em] text-white/32">{label}</p>
                <p className="mt-2 break-words text-sm leading-6 text-white/70">{detail}</p>
                <ArrowUpRight className="mt-6 size-4 text-white/25 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#8ef06a]" />
              </div>
            </MagneticLink>
          ))}
        </div>

        <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-5 text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-white/25 sm:mt-24 sm:flex-row sm:items-center sm:justify-between">
          <span>SHREE SAWARIYA AGRO AGENCY</span>
          <span>8:30 AM - 8:00 PM</span>
          <span>06 / 06 — END OF STORY</span>
        </footer>
      </div>
    </section>
  );
}
