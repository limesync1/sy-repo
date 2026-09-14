import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [biz, rev, cit] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reviews").select("rating").is("hidden_at", null),
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
    /* Tallene lægger sig som et løftet kort hen over kanten mellem heroen og
       resten af siden — det binder de to flader sammen og fjerner det tomme
       "gammel hjemmeside"-mellemrum. */
    <section className="relative z-10 bg-background pb-10 pt-10 md:pb-14 md:pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card px-5 py-6 shadow-[0_24px_60px_-40px_hsl(var(--foreground)/0.45)] md:px-10 md:py-8">
          <div className="relative grid grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`text-left ${i > 0 ? "md:border-l md:border-border/60 md:pl-10" : ""}`}
              >
                <div className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums md:text-[2.25rem]">
                  {s.value}
                </div>
                <div className="mt-2 text-[11px] font-medium leading-snug text-muted-foreground md:text-[10.5px] md:uppercase md:tracking-[0.2em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
