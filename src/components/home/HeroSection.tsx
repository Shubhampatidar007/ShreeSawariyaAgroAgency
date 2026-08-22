import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Leaf, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import heroField from "@/assets/hero-field.jpg";
import type { CmsSection } from "@/types/operations";

export function HeroSection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const { t } = useI18n();
  const heroStats = [
    { label: t("home.hero.farmers"), value: "—" },
    { label: t("home.hero.products"), value: "—" },
    { label: t("home.hero.villages"), value: "—" },
  ];
  const title = content?.headline || t("home.hero.title");
  const subtitle = content?.body || t("home.hero.subtitle");

  return (
    <section className="relative overflow-hidden text-white">
      <img
        src={heroField}
        alt="Green wheat field at sunrise on an Indian farm"
        className="absolute inset-0 size-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <Leaf className="size-3.5" /> {t("home.hero.badge")}
          </span>
          <h1 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/85">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full" asChild>
              <a href="#products">
                {t("home.hero.shopNow")} <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 bg-white/5 text-white backdrop-blur hover:bg-white/15 hover:text-white"
              asChild
            >
              <a href="#categories">{t("home.hero.explore")}</a>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur"
              >
                <dt className="text-xs text-white/75">{stat.label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-3xl bg-card p-6 text-card-foreground shadow-soft"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {content?.headline || "Offer of the week"}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Storefront highlight</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {content?.body || "Add your first promotion, seasonal deal, or service highlight here."}
          </p>
          <div className="mt-5 space-y-3">
            <HeroPoint
              icon={BadgeCheck}
              title="Custom content"
              text="Edit the hero copy from Homepage CMS"
            />
            <HeroPoint
              icon={Truck}
              title="Flexible delivery"
              text="Keep your service area or delivery terms visible"
            />
            <HeroPoint
              icon={Leaf}
              title="Live storefront"
              text="CMS changes appear on the public homepage"
            />
          </div>
          <Button className="mt-6 w-full rounded-full" asChild>
            <a href="#offers">View all offers</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function HeroPoint({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Leaf;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
