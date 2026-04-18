import { Search, BarChart3, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område på sekunder.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, ægte anmeldelser og beregn pris direkte i appen.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med ét klik – betal efter levering.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Sådan virker det
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Tre nemme trin – under to minutter.</p>
        </div>

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {/* connector line — desktop only */}
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step, i) => (
            <div key={step.title} className="relative flex flex-col gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <step.icon className="h-6 w-6 text-foreground" />
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
