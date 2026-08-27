import { Clock, ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { shopInfo } from "@/data/storefront";

const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/CzHvPWcfpA1WQkca6";
const MAP_PREVIEW_URL = `https://www.google.com/maps?q=${encodeURIComponent(shopInfo.address)}&output=embed`;

export function LocationSection() {
  return (
    <section id="location" className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <Card className="overflow-hidden border-border shadow-soft">
            <div className="relative h-[360px] bg-muted sm:h-[440px]">
              <iframe
                title="Google Maps preview for Shree Sawariya Agro Agency"
                src={MAP_PREVIEW_URL}
                loading="lazy"
                className="h-full w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur hover:text-primary"
              >
                <MapPin className="size-4 text-primary" />
                Open in Google Maps
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Card>

          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Store location</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Visit Our Store</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Visit Shree Sawariya Agro Agency for agricultural inputs, product guidance, and local support.
            </p>

            <div className="mt-7 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Store address</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{shopInfo.address}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Store hours</p>
                    <p className="mt-1 text-sm text-muted-foreground">{shopInfo.hours}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Call the store</p>
                    <a href={`tel:${shopInfo.phone}`} className="mt-1 block text-sm text-muted-foreground hover:text-primary">
                      {shopInfo.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full">
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" />
                  Get Directions
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open in Google Maps
                </a>
              </Button>
            </div>

            <CardContent className="mt-7 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Location information</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The Google Maps link above is the authoritative location destination. No coordinates or distance estimate are shown unless verified store location data is available.
              </p>
            </CardContent>
          </div>
        </div>
      </div>
    </section>
  );
}
