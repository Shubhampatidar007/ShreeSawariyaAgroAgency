import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { categories } from "@/data/storefront";
import { useI18n } from "@/lib/i18n";

export function CategorySection() {
  const { t } = useI18n();
  return (
    <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeading
        eyebrow={t("home.category.eyebrow")}
        title={t("home.category.title")}
        description={t("home.category.description")}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <motion.a
            key={category.id}
            href="#products"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <Card className="group h-full shadow-soft transition-shadow hover:shadow-lg">
              <CardContent className="flex h-full items-start gap-4 p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-2xl">
                  {category.emoji}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{category.name}</h3>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  <p className="mt-3 text-xs font-semibold text-primary">
                    {category.itemCount} products in stock
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.a>
        ))}
      </div>
    </section>
  );
}