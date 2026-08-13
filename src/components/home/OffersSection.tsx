import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import type { CmsSection } from "@/types/operations";

const offers: Array<{ title: string; detail: string; code: string }> = [];

export function OffersSection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  return (
    <section id="offers" className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeading eyebrow="Offers & promotions" title={content?.headline || "Running offers at the counter and online"} description={content?.body || "Mention the code at billing or apply it at checkout. Offers cannot be combined with society slab rates."} />
      <div className="mt-8">{offers.length === 0 ? <Card className="shadow-soft"><CardContent className="p-6 text-sm text-muted-foreground">No offers yet. Add your first promotion once your catalog is ready.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-3">{offers.map((offer) => <Card key={offer.code} className="shadow-soft"><CardContent className="space-y-3 p-6"><Badge variant="secondary" className="rounded-full">{offer.code}</Badge><h3 className="font-display text-lg font-semibold">{offer.title}</h3><p className="text-sm text-muted-foreground">{offer.detail}</p><Button variant="link" className="h-auto p-0 text-primary" asChild><a href="#products">Shop this offer →</a></Button></CardContent></Card>)}</div>}</div>
    </section>
  );
}
