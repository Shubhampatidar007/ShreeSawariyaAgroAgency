type DigitalSeedProps = { reducedMotion?: boolean };

export function DigitalSeed({ reducedMotion = false }: DigitalSeedProps) {
  return (
    <div className={`digital-seed ${reducedMotion ? "digital-seed--static" : ""}`} aria-hidden="true">
      <div className="digital-seed__halo digital-seed__halo--one" />
      <div className="digital-seed__halo digital-seed__halo--two" />
      <div className="digital-seed__orbit digital-seed__orbit--one" />
      <div className="digital-seed__orbit digital-seed__orbit--two" />
      <div className="digital-seed__body">
        <div className="digital-seed__terrain" />
        <div className="digital-seed__ridge digital-seed__ridge--one" />
        <div className="digital-seed__ridge digital-seed__ridge--two" />
        <div className="digital-seed__glint" />
      </div>
      <div className="digital-seed__nodes digital-seed__nodes--one" />
      <div className="digital-seed__nodes digital-seed__nodes--two" />
      <div className="digital-seed__shadow" />
    </div>
  );
}
