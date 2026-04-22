import { Search, BarChart3, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description:
      "Start med kategori, virksomhed eller område uden at blive sendt gennem et tungt flow.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description:
      "Se de vigtigste signaler tættere samlet, så frasortering og valg går hurtigere.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description:
      "Når det rigtige match er fundet, er du allerede tæt på næste skridt og kan gå videre med det samme.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Flow
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Et enklere flow gennem hele forsiden.
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Mere som et værktøj, mindre som en kampagne.
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-6 right-6 top-7 hidden h-px bg-border md:block" />
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground ring-8 ring-background">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  0{index + 1}
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[32ch] text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
