import { Mail, MapPin, Phone, Clock, ShoppingBag, LifeBuoy, FileText } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { shopInfo, categories } from "@/data/storefront";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore } from "@/lib/storefront-filter-store";

const supportLinks: FooterLink[] = [
  { label: "Order and delivery enquiries", href: `tel:${shopInfo.phone}`, icon: ShoppingBag },
  { label: "Returns and replacements", href: `mailto:${shopInfo.email}`, icon: FileText },
  { label: "Bulk and society enquiries", href: `tel:${shopInfo.phone}`, icon: LifeBuoy },
  { label: "Crop advisory", href: `tel:${shopInfo.phone}`, icon: LifeBuoy },
  { label: "Subsidy scheme enquiries", href: `mailto:${shopInfo.email}`, icon: FileText },
];

const companyLinks: FooterLink[] = [
  { label: "About our shop", href: "#about" },
  { label: "Contact us", href: "#contact" },
];

type FooterLink = { label: string; href: string; onClick?: () => void; icon?: typeof ShoppingBag };

export function SiteFooter() {
  const products = usePublicShopStore((s) => s.products);
  const categoryLinks: FooterLink[] = (products.length
    ? [...new Set(products.map((product) => product.category))]
    : categories.map((category) => category.name)
  ).map((category) => ({
    label: category,
    href: "#categories",
    onClick: () => storefrontFilterStore.setCategory(category),
  }));

  return (
    <footer id="contact" className="scroll-mt-24 border-t border-border bg-card text-card-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-4 lg:py-14">
        <div className="min-w-0">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Shree Sanwariya Agro Agency provides quality agricultural products and dependable local service for farmers in Sitamau and nearby areas.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{shopInfo.address}</span>
            </li>
            <li className="flex min-w-0 items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a href={`tel:${shopInfo.phone}`} className="break-words hover:text-primary">{shopInfo.phone}</a>
            </li>
            <li className="flex min-w-0 items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${shopInfo.email}`} className="break-all hover:text-primary">{shopInfo.email}</a>
            </li>
            <li className="flex min-w-0 items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{shopInfo.hours}</span>
            </li>
          </ul>
        </div>

        <FooterColumn title="Shop by category" links={categoryLinks} />
        <FooterColumn title="Customer support" links={supportLinks} />
        <FooterColumn title="Our business" links={companyLinks} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="#categories" className="hover:text-primary">Categories</a>
            <a href="#products" className="hover:text-primary">Products</a>
            <a href="#offers" className="hover:text-primary">Offers</a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#contact" className="hover:text-primary">Contact</a>
          </nav>
          <p>© {new Date().getFullYear()} {shopInfo.name}.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-0">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={link.onClick}
                className="flex min-w-0 items-start gap-2 break-words transition-colors hover:text-primary"
              >
                {Icon ? <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : null}
                <span>{link.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
