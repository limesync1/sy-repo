import { Search, BarChart3, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, anmeldelser og beregn din pris direkte.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med det samme.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary/50 py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
          Sådan virker det
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
