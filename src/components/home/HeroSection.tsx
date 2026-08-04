import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Leaf, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const heroStats = [
  { label: "Farmers served", value: "12,000+" },
  { label: "Products in stock", value: "1,200+" },
  { label: "Villages delivered", value: "180+" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3.5 py-1.5 text-xs font-semibold">
            <Leaf className="size-3.5" /> Kharif season stock has arrived
          </span>
          <h1 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Certified farm inputs, fair prices, delivered to your village
          </h1>
          <p className="mt-4 max-w-lg text-base text-primary-foreground/85">
            Buy company-billed seeds, fertilizers, pesticides and irrigation equipment from a
            licensed krishi kendra — with dosage guidance from our agronomists on every order.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" className="rounded-full" asChild>
              <a href="#products">
                Shop now <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <a href="#categories">Explore categories</a>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-primary-foreground/10 p-4">
                <dt className="text-xs text-primary-foreground/75">{stat.label}</dt>
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
            Offer of the week
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Kharif Seed Festival</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Flat 15% off on paddy, maize and bajra seed packs. Free soil testing coupon on every
            purchase above ₹5,000.
          </p>
          <div className="mt-5 space-y-3">
            <HeroPoint icon={BadgeCheck} title="Genuine batch numbers" text="Printed on your GST invoice" />
            <HeroPoint icon={Truck} title="Free delivery above ₹2,000" text="Within 25 km of the mandi" />
            <HeroPoint icon={Leaf} title="Advisory included" text="Spray schedule shared on WhatsApp" />
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