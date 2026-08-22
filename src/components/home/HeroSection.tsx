import { motion } from "motion/react";
import {
  BadgeCheck,
  Leaf,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Sprout,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import agroStore from "@/assets/hero-field.jpg";
import type { CmsSection } from "@/types/operations";

export function HeroSection({
  content,
}: {
  content?: Pick<CmsSection, "headline" | "body">;
}) {
  const { language, t } = useI18n();

  /*
   * CMS values take priority.
   * If Homepage CMS has a headline/body, those are displayed.
   * Otherwise the translated default values are used.
   */
  const title =
    content?.headline ||
    t("home.hero.title", "श्री सांवरिया एग्रो एजेंसी");

  const subtitle =
    content?.body ||
    t(
      "home.hero.subtitle",
      "उच्च गुणवत्ता के बीज, खाद और कृषि उत्पाद किसानों की समृद्धि के लिए।",
    );

  const benefits =
    language === "hi"
      ? [
          {
            icon: BadgeCheck,
            title: "गुणवत्तापूर्ण उत्पाद",
            text: "बेहतर फसल, बेहतर भविष्य",
          },
          {
            icon: ShieldCheck,
            title: "विश्वसनीय सेवा",
            text: "हमेशा आपके साथ",
          },
          {
            icon: Sprout,
            title: "किसानों की प्रगति",
            text: "हमारी प्राथमिकता",
          },
        ]
      : [
          {
            icon: BadgeCheck,
            title: "Quality Products",
            text: "Better crops, better future",
          },
          {
            icon: ShieldCheck,
            title: "Reliable Service",
            text: "Always with you",
          },
          {
            icon: Sprout,
            title: "Farmer Growth",
            text: "Our priority",
          },
        ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      {/* HERO CONTAINER */}
      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-soft">
        <div className="grid min-h-[480px] lg:grid-cols-[0.9fr_1.1fr]">
          {/* =========================================================
              LEFT CONTENT
          ========================================================== */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="flex flex-col justify-center px-7 py-9 sm:px-10 lg:px-12 lg:py-12"
          >
            {/* BADGE */}
            <div className="w-fit">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                <Leaf className="size-3.5" />

                {t(
                  "home.hero.badge",
                  "आपके भरोसे का साथी",
                )}
              </span>
            </div>

            {/* TITLE */}
            <h1 className="mt-6 max-w-lg font-display text-4xl font-bold leading-[1.02] tracking-tight text-primary sm:text-5xl lg:text-[3.5rem]">
              {title}
            </h1>

            {/* DESCRIPTION */}
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {subtitle}
            </p>

            {/* CTA BUTTONS */}
            <div className="mt-7 flex flex-wrap gap-3">
              {/* PRODUCTS */}
              <Button
                size="lg"
                className="h-12 rounded-xl bg-primary px-6 text-primary-foreground shadow-none hover:bg-primary/90"
                asChild
              >
                <a href="#products">
                  <ShoppingCart className="size-4" />

                  {t(
                    "home.hero.shopNow",
                    "हमारे उत्पाद देखें",
                  )}
                </a>
              </Button>

              {/* CONTACT */}
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-primary/40 bg-transparent px-6 text-primary shadow-none hover:bg-primary/10 hover:text-primary"
                asChild
              >
                <a href="#contact">
                  <Phone className="size-4" />

                  {t(
                    "home.hero.explore",
                    "संपर्क करें",
                  )}
                </a>
              </Button>
            </div>

            {/* BENEFITS */}
            <div className="mt-9 grid gap-6 sm:grid-cols-3 lg:gap-5">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;

                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.15 + index * 0.08,
                    }}
                    className="flex items-start gap-3"
                  >
                    {/* ICON */}
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 text-primary">
                      <Icon className="size-5" />
                    </span>

                    {/* TEXT */}
                    <div>
                      <p className="text-sm font-bold leading-5 text-foreground">
                        {benefit.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {benefit.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* =========================================================
              RIGHT IMAGE
          ========================================================== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative min-h-[360px] overflow-hidden lg:min-h-full"
          >
            {/* MAIN IMAGE */}
            <img
              src={agroStore}
              alt={
                language === "hi"
                  ? "कृषि उत्पाद और बीज की दुकान"
                  : "Agricultural products and seeds store"
              }
              className="absolute inset-0 size-full object-cover"
              loading="eager"
            />

            {/* IMAGE OVERLAY */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

            {/* FLOATING CARD */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: 0.45,
              }}
              className="absolute bottom-7 left-6 right-6 sm:left-7 sm:right-auto sm:max-w-[330px]"
            >
              <div className="flex items-center gap-4 rounded-2xl border border-primary-foreground/20 bg-primary/95 px-5 py-4 text-primary-foreground shadow-xl backdrop-blur-md">
                {/* ICON */}
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
                  <Leaf className="size-5" />
                </span>

                {/* CONTENT */}
                <div>
                  <p className="text-sm font-bold">
                    {language === "hi"
                      ? "गुणवत्तापूर्ण कृषि उत्पाद"
                      : "Quality Agricultural Products"}
                  </p>

                  <p className="mt-1 text-xs text-primary-foreground/80">
                    {language === "hi"
                      ? "बेहतर फसल, बेहतर भविष्य"
                      : "Better crops, better future"}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}