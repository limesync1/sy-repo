const rows = [
  {
    label: "Kvalitet",
    title: "De stærkere profiler bliver nemmere at spotte hurtigt.",
    body: "Anmeldelser, verificering og præsentation ligger tættere på beslutningen i stedet for at være spredt ud.",
  },
  {
    label: "Pris",
    title: "Du får tidligere en fornemmelse af budget og niveau.",
    body: "Det gør det lettere at frasortere og vælge videre uden at åbne en masse irrelevante profiler.",
  },
  {
    label: "Nærhed",
    title: "Lokale muligheder står stærkere, når hastighed betyder noget.",
    body: "Det giver en mere naturlig prioritering for kunder, der gerne vil hurtigt videre med en opgave.",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Overblik
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Forsiden er bygget til at hjælpe dig videre, ikke til at stå i
              vejen.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            Hele informationshierarkiet er strammet op omkring de signaler, der
            faktisk afgør, hvem der vælges.
          </p>
        </div>

        <div className="border-t border-border">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-4 border-b border-border py-6 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,0.8fr)] md:gap-8 md:py-8"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.label}
              </div>
              <div className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {row.title}
              </div>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                {row.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
