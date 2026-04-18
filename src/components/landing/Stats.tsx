import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [biz, rev, cit] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reviews").select("rating"),
        supabase.from("businesses").select("city").eq("is_active", true).not("city", "is", null),
      ]);
      const ratings = rev.data ?? [];
      const avg = ratings.length
        ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1)
        : null;
      const cities = new Set((cit.data ?? []).map((r) => r.city?.trim().toLowerCase()).filter(Boolean));
      return {
        businesses: biz.count ?? 0,
        reviews: ratings.length,
        avg,
        cities: cities.size,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n);

  const stats = [
    { value: data ? fmt(data.businesses) : "—", label: "Verificerede virksomheder" },
    { value: data && data.reviews > 0 ? fmt(data.reviews) : "Nye", label: "Anmeldelser" },
    { value: data?.avg ?? "—", label: "Gennemsnitlig rating" },
    { value: data ? fmt(data.cities) : "—", label: data?.cities === 1 ? "By dækket" : "Byer dækket" },
  ];

  return (
    <section className="bg-background pb-12 pt-4 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 border-y border-border py-8 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
