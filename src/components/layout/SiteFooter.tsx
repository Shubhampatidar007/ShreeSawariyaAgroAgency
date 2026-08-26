import { Mail, MapPin, Phone, Clock, ShoppingBag, LifeBuoy, FileText } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { shopInfo, categories } from "@/data/storefront";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore } from "@/lib/storefront-filter-store";

const supportLinks: FooterLink[] = [
  { label: "Order & delivery status", href: `tel:${shopInfo.phone}`, icon: ShoppingBag },
  { label: "Return and replacement policy", href: `mailto:${shopInfo.email}`, icon: FileText },
  { label: "Bulk / society enquiries", href: `tel:${shopInfo.phone}`, icon: LifeBuoy },
  { label: "Crop advisory helpline", href: `tel:${shopInfo.phone}`, icon: LifeBuoy },
  { label: "Government subsidy schemes", href: `mailto:${shopInfo.email}`, icon: FileText },
];

const companyLinks: FooterLink[] = [
  { label: "About our shop", href: "#about" },
  { label: "Licences & certifications", href: "#contact" },
  { label: "Careers", href: "#contact" },
  { label: "Dealer network", href: "#contact" },
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
    <footer id="contact" className="border-t border-border bg-card text-card-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">Add your own shop story, service details, and business information here.</p>
          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /> {shopInfo.address}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" /> <a href={`tel:${shopInfo.phone}`} className="hover:text-primary">{shopInfo.phone}</a></li>
            <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" /> <a href={`mailto:${shopInfo.email}`} className="hover:text-primary">{shopInfo.email}</a></li>
            <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" /> {shopInfo.hours}</li>
          </ul>
        </div>

        <FooterColumn title="Shop by category" links={categoryLinks} />
        <FooterColumn title="Customer support" links={supportLinks} />
        <FooterColumn title="Our business" links={companyLinks} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="#categories" className="hover:text-primary">Categories</a>
            <a href="#products" className="hover:text-primary">Products</a>
            <a href="#offers" className="hover:text-primary">Offers</a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#contact" className="hover:text-primary">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} {shopInfo.name}.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {links.slice(0, 5).map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.label}>
              <a href={link.href} onClick={link.onClick} className="flex items-center gap-2 transition-colors hover:text-primary">
                {Icon ? <Icon className="size-3.5 shrink-0" /> : null}{link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
