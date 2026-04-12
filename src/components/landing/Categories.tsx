import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

const categories = [
  { icon: Sparkles, label: "Rengøring" },
  { icon: Wrench, label: "Håndværker" },
  { icon: Truck, label: "Flyttehjælp" },
  { icon: TreePine, label: "Haveservice" },
  { icon: Paintbrush, label: "Maler" },
  { icon: Droplets, label: "VVS" },
  { icon: Zap, label: "Elektriker" },
  { icon: ShieldCheck, label: "Sikkerhed" },
];

const Categories = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
          Populære kategorier
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((cat) => (
            <Card
              key={cat.label}
              className="group flex cursor-pointer flex-col items-center gap-3 p-6 transition-all hover:border-primary hover:shadow-md"
            >
              <cat.icon className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="font-medium text-foreground">{cat.label}</span>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
