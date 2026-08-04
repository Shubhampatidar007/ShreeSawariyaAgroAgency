import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";

const offers = [
  {
    title: "Kharif Seed Festival",
    detail: "15% off on paddy, maize and bajra seed packs until 31 August.",
    code: "KHARIF15",
  },
  {
    title: "Fertilizer bundle",
    detail: "Buy 10 bags of urea and get a hand sprayer free.",
    code: "UREA10",
  },
  {
    title: "Drip irrigation camp",
    detail: "Subsidy paperwork support with every drip kit booking.",
    code: "DRIPCAMP",
  },
];

export function OffersSection() {
  return (
    <section id="offers" className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeading
        eyebrow="Offers & promotions"
        title="Running offers at the counter and online"
        description="Mention the code at billing or apply it at checkout. Offers cannot be combined with society slab rates."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {offers.map((offer) => (
          <Card key={offer.code} className="shadow-soft">
            <CardContent className="space-y-3 p-6">
              <Badge variant="secondary" className="rounded-full">
                {offer.code}
              </Badge>
              <h3 className="font-display text-lg font-semibold">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">{offer.detail}</p>
              <Button variant="link" className="h-auto p-0 text-primary" asChild>
                <a href="#products">Shop this offer →</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}