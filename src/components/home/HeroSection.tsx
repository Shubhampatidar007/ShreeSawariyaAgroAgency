import { motion } from "motion/react";
import {
  BadgeCheck,
  LayoutGrid,
  Leaf,
  Package,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePublicShopStore } from "@/lib/public-shop-store";
import agroStore from "@/assets/hero-field.jpg";
import { shopInfo } from "@/data/storefront";
import type { CmsSection } from "@/types/operations";

export function HeroSection({
  content,
}: {
  content?: Pick<CmsSection, "headline" | "body">;
}) {
  const { language } = useI18n();
  const publishedProducts = usePublicShopStore((s) => s.products);
  const catalogLoading = usePublicShopStore((s) => s.loading);

  const title = content?.headline || "Quality agricultural inputs. Better farming outcomes.";
  const subtitle =
    content?.body ||
    "Trusted seeds, crop inputs, and practical farmer support from Shree Sawariya Agro Agency.";

  const categoryCount = new Set(publishedProducts.map((product) => product.category)).size;
  const productCount = publishedProducts.length;

  const benefits =
    language === "hi"
      ? [
          { icon: BadgeCheck, title: "असली उत्पाद" },
          { icon: ShieldCheck, title: "तेज़ स्थानीय सेवा" },
          { icon: Sprout, title: "किसान सहायता" },
        ]
      : [
          { icon: BadgeCheck, title: "Genuine Products" },
          { icon: ShieldCheck, title: "Fast Local Service" },
          { icon: Sprout, title: "Farmer Support" },
        ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-soft">
        <div className="grid min-h-[560px] lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="flex flex-col justify-center px-7 py-10 sm:px-10 lg:px-12 lg:py-12"
          >
            <div className="w-fit">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                <Leaf className="size-3.5" />
                Shree Sawariya Agro Agency
              </span>
            </div>

            <h1 className="mt-6 max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[3.65rem]">
              {title}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-primary px-6 text-primary-foreground shadow-none hover:bg-primary/90"
                asChild
              >
                <a href="#products">
                  <ShoppingCart className="size-4" />
                  Shop Products
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-primary/40 bg-transparent px-6 text-primary shadow-none hover:bg-primary/10 hover:text-primary"
                asChild
              >
                <a href={`tel:${shopInfo.phone}`}>
                  <Phone className="size-4" />
                  Talk to an Expert
                </a>
              </Button>
            </div>

            <div className="mt-9 grid gap-4 sm:grid-cols-3 lg:gap-5">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 + index * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <p className="pt-1 text-sm font-bold leading-5 text-foreground">{benefit.title}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
              <TrustMetric
                icon={Package}
                value={catalogLoading ? "—" : String(productCount)}
                label="Published products"
              />
              <TrustMetric
                icon={LayoutGrid}
                value={catalogLoading ? "—" : String(categoryCount)}
                label="Catalog categories"
              />
              <TrustMetric icon={Store} value="Local" label="Sitamau service" />
            </div>
          </motion.div>

          <div className="relative min-h-[440px] overflow-hidden lg:min-h-full">
            <img
              src={agroStore}
              alt="Agricultural field and farm inputs"
              className="absolute inset-0 size-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-black/10 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5 }}
              className="absolute bottom-5 left-5 sm:bottom-7 sm:left-7"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-primary/95 px-4 py-3 text-primary-foreground shadow-xl backdrop-blur-md">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Sprout className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">Farmer-first service</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/80">Local support for your next crop decision</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Package;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="size-4" />
        <span className="font-display text-lg font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
