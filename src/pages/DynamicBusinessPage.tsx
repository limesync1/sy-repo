import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews, useCreateReview } from "@/hooks/useDatabase";
import { CartProvider } from "@/contexts/CartContext";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DynamicBusinessContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessBySlug(slug || "");
  const { data: services } = useServices(business?.id);
  const { data: reviews } = useReviews(business?.id);
  const createReview = useCreateReview();

  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  if (bizLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (bizError || !business) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Virksomheden blev ikke fundet.</p>
      <Link to="/"><Button variant="outline">Tilbage til forsiden</Button></Link>
    </div>
  );

  const avgRating = reviews?.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const openingHours = business.opening_hours && typeof business.opening_hours === "object"
    ? Object.entries(business.opening_hours as Record<string, string>).filter(([, v]) => v)
    : [];

  const handleReviewSubmit = async () => {
    if (!reviewName.trim()) { toast.error("Indtast dit navn"); return; }
    try {
      await createReview.mutateAsync({
        business_id: business.id,
        reviewer_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      toast.success("Anmeldelse sendt!");
      setReviewName("");
      setReviewRating(5);
      setReviewComment("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <Link to="/"><img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8" /></Link>
          </div>
          <CartSheet businessId={business.id} />
        </div>
      </nav>

      {/* Cover image */}
      {business.cover_image_url && (
        <div className="h-48 w-full overflow-hidden md:h-64">
          <img src={business.cover_image_url} alt={business.name} className="h-full w-full object-cover" />
        </div>
      )}

      {/* Hero */}
      <section className={`border-b border-border bg-secondary/50 py-10 md:py-14 ${business.cover_image_url ? "-mt-12 relative" : ""}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
            {/* Logo */}
            {business.logo_url && (
              <div className={`shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-background shadow-lg ${business.cover_image_url ? "h-24 w-24 -mt-8" : "h-20 w-20"}`}>
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="mb-1 text-3xl font-extrabold text-foreground md:text-4xl">{business.name}</h1>
              {business.description && <p className="mb-3 max-w-lg text-muted-foreground">{business.description}</p>}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground md:justify-start">
                {business.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{business.city}</span>}
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    {avgRating} ({reviews?.length} anmeldelser)
                  </span>
                )}
                {business.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{business.email}</span>}
                {business.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{business.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4">
        <div className="grid gap-8 py-10 md:grid-cols-3">
          {/* Main content */}
          <div className="space-y-10 md:col-span-2">
            {/* Services */}
            {services && services.length > 0 && (
              <section id="services">
                <h2 className="mb-5 text-2xl font-bold text-foreground">Vores services</h2>
                <div className="space-y-4">
                  {services.map((s) => (
                    <DynamicServiceCard key={s.id} service={s} />
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section>
              <h2 className="mb-5 text-2xl font-bold text-foreground">
                Anmeldelser {reviews && reviews.length > 0 && `(${reviews.length})`}
              </h2>

              {reviews && reviews.length > 0 ? (
                <div className="mb-6 space-y-3">
                  {reviews.map((r) => (
                    <Card key={r.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-foreground">{r.reviewer_name}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="mb-4 text-muted-foreground">Ingen anmeldelser endnu. Vær den første!</p>
              )}

              <Card className="border-border">
                <CardContent className="space-y-3 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Skriv en anmeldelse</h3>
                  <Input placeholder="Dit navn" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
                  <div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <button key={i} onClick={() => setReviewRating(i)} className="p-0.5">
                          <Star className={`h-5 w-5 transition-colors ${i <= reviewRating ? "fill-accent text-accent" : "text-muted hover:text-accent/50"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea placeholder="Din kommentar (valgfrit)" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                  <Button
                    onClick={handleReviewSubmit}
                    disabled={createReview.isPending}
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {createReview.isPending ? "Sender..." : "Send anmeldelse"}
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Opening hours */}
            {openingHours.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                    <Clock className="h-4 w-4" /> Åbningstider
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    {openingHours.map(([day, time]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-muted-foreground">{day}</span>
                        <span className="font-medium text-foreground">{time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact card */}
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="mb-3 font-semibold text-foreground">Kontakt</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {business.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{business.email}</p>}
                  {business.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{business.phone}</p>}
                  {business.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {business.address}{business.zip_code ? `, ${business.zip_code}` : ""}{business.city ? ` ${business.city}` : ""}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {business.name} · Drevet af <Link to="/" className="font-medium text-foreground hover:underline">Serviceydere</Link></p>
      </footer>
    </div>
  );
};

const DynamicBusinessPage = () => (
  <CartProvider>
    <DynamicBusinessContent />
  </CartProvider>
);

export default DynamicBusinessPage;
