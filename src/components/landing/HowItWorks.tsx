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
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Sådan virker det
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Tre nemme trin – under to minutter.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
                <step.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trin {i + 1}
                </div>
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
