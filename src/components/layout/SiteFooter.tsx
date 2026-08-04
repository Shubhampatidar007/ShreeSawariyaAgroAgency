import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { shopInfo } from "@/data/storefront";
import { categories } from "@/data/storefront";

const supportLinks = [
  "Order & delivery status",
  "Return and replacement policy",
  "Bulk / society enquiries",
  "Crop advisory helpline",
  "Government subsidy schemes",
];

const companyLinks = ["About our shop", "Licences & certifications", "Careers", "Dealer network", "Contact us"];

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm text-sidebar-foreground/70">
            Serving farmers since 1998 with certified seeds, fertilizers, crop protection and
            irrigation supplies — backed by honest billing and field-level advice.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-sidebar-foreground/70">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" /> {shopInfo.address}
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" /> {shopInfo.phone}
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" /> {shopInfo.email}
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" /> {shopInfo.hours}
            </li>
          </ul>
        </div>

        <FooterColumn title="Shop by category" links={categories.map((c) => c.name)} />
        <FooterColumn title="Customer support" links={supportLinks} />
        <FooterColumn title="Our business" links={companyLinks} />
      </div>

      <div className="border-t border-sidebar-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-sidebar-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {shopInfo.name}. Seed Licence HR/SD/2211 · Fertilizer Licence HR/FT/8842.</p>
          <p>GSTIN 06ABCDE1234F1Z5 · Prices inclusive of applicable taxes.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-sidebar-foreground">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-sm text-sidebar-foreground/70">
        {links.map((link) => (
          <li key={link}>
            <a href="#products" className="transition-colors hover:text-sidebar-primary">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}