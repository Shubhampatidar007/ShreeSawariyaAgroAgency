type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
