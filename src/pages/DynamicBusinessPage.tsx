import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews, useCreateReview } from "@/hooks/useDatabase";
import { CartProvider } from "@/contexts/CartContext";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DynamicBusinessContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessBySlug(slug || "");
  const { data: services } = useServices(business?.id);
  const { data: reviews } = useReviews(business?.id);
  const createReview = useCreateReview();

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  // Review form state
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-accent/5 to-background py-16 md:py-24">
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mb-3 text-4xl font-extrabold text-foreground md:text-5xl">{business.name}</h1>
          {business.description && <p className="mx-auto max-w-lg text-lg text-muted-foreground">{business.description}</p>}
          {avgRating && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {[1,2,3,4,5].map((i) => <Star key={i} className={`h-5 w-5 ${i <= Math.round(parseFloat(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />)}
              <span className="ml-2 text-sm text-muted-foreground">{avgRating} ({reviews?.length} anmeldelser)</span>
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      {services && services.length > 0 && (
        <section className="py-16" id="services">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Vores services</h2>
            <div className="mx-auto grid max-w-3xl gap-6">
              {services.map((s) => (
                <DynamicServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="border-t border-border/50 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Anmeldelser</h2>

          {/* Existing reviews */}
          {reviews && reviews.length > 0 ? (
            <div className="mb-10 space-y-4">
              {reviews.map((r) => (
                <Card key={r.id} className="border-border/60">
                  <CardContent className="p-5">
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
            <p className="mb-8 text-center text-muted-foreground">Ingen anmeldelser endnu. Vær den første!</p>
          )}

          {/* Review form */}
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <h3 className="font-semibold text-foreground">Skriv en anmeldelse</h3>
              <Input placeholder="Dit navn" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Bedømmelse</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <button key={i} onClick={() => setReviewRating(i)} className="p-0.5">
                      <Star className={`h-6 w-6 transition-colors ${i <= reviewRating ? "fill-accent text-accent" : "text-muted hover:text-accent/50"}`} />
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
        </div>
      </section>

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
