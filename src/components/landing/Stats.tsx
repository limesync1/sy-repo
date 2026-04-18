const stats = [
  { value: "1.200+", label: "Verificerede virksomheder", sub: "i hele Danmark" },
  { value: "8.400+", label: "Tilfredse kunder", sub: "siden lanceringen" },
  { value: "4.9", label: "Gennemsnitlig rating", sub: "baseret på anmeldelser" },
  { value: "98", label: "byer dækket", sub: "Aalborg → København" },
];

const Stats = () => {
  return (
    <section className="border-y border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="group relative overflow-hidden px-6 py-8 transition-colors hover:bg-secondary/40 md:py-10">
              <div className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
