import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMySubscriptions, useUpdateSubscription, useMyProfile, useUpdateProfile, useCreateReview } from "@/hooks/useDatabase";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import {
  Package, User, Star, LogOut, Pause, Play, XCircle,
  CalendarClock, ArrowLeft, ExternalLink, ShieldCheck, Settings,
  Store, ChevronRight, Sparkles,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "På pause", variant: "secondary" },
  cancelled: { label: "Opsagt", variant: "destructive" },
};

const CustomerDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"subscriptions" | "profile">("subscriptions");

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-muted-foreground">Indlæser dit panel...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;

  const tabs = [
    { key: "subscriptions" as const, label: "Mine services", icon: Package, description: "Administrer dine aktive services" },
    { key: "profile" as const, label: "Min profil", icon: Settings, description: "Opdater dine oplysninger" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
            </Link>
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            <span className="hidden text-sm font-medium text-foreground sm:inline">Kundepanel</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {(user.email || "U").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log ud</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── Hero section ── */}
        <div className="py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                Velkommen, {user.email?.split("@")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">Administrer dine services og profil</p>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:flex sm:gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                tab === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="pb-12">
          {tab === "subscriptions" && <SubscriptionsView />}
          {tab === "profile" && <ProfileView />}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Subscriptions View                              */
/* ════════════════════════════════════════════════ */
const SubscriptionsView = () => {
  const { data: subscriptions, isLoading } = useMySubscriptions();
  const updateSub = useUpdateSubscription();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
      ))}
    </div>
  );

  const handlePause = (id: string) => {
    updateSub.mutate({ id, status: "paused", paused_at: new Date().toISOString() }, {
      onSuccess: () => toast.success("Service sat på pause"),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleResume = (id: string) => {
    updateSub.mutate({ id, status: "active", paused_at: null }, {
      onSuccess: () => toast.success("Service genoptaget"),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleCancel = (id: string) => {
    if (!confirm("Er du sikker på, at du vil opsige denne service?")) return;
    updateSub.mutate({ id, status: "cancelled", cancelled_at: new Date().toISOString() }, {
      onSuccess: () => toast.success("Service opsagt"),
      onError: (e) => toast.error(e.message),
    });
  };

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Package className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ingen aktive services</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Bestil en service hos en virksomhed, og den dukker automatisk op her.
        </p>
        <div className="mt-5 flex gap-3">
          <Link to="/search">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Store className="h-4 w-4" /> Find virksomheder
            </Button>
          </Link>
          <Link to="/quote">
            <Button className="gap-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
              <Sparkles className="h-4 w-4" /> Få tilbud med AI
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Group by business
  const grouped: Record<string, { biz: any; subs: any[] }> = {};
  subscriptions.forEach((sub: any) => {
    const bizId = sub.business_id;
    if (!grouped[bizId]) grouped[bizId] = { biz: sub.businesses || {}, subs: [] };
    grouped[bizId].subs.push(sub);
  });

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([bizId, { biz, subs }]) => (
        <div key={bizId}>
          {/* Business header */}
          <div className="mb-4 flex items-center gap-3">
            {biz.logo_url ? (
              <img src={biz.logo_url} alt="" className="h-10 w-10 rounded-xl border border-border object-contain bg-card p-0.5" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{biz.name || "Virksomhed"}</h3>
              {biz.city && <p className="text-xs text-muted-foreground">{biz.city}</p>}
            </div>
            {biz.slug && (
              <Link to={`/b/${biz.slug}`}>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
                  Se side <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Service cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {subs.map((sub: any) => {
              const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
              return (
                <Card key={sub.id} className="overflow-hidden rounded-2xl border-border transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    {/* Status bar */}
                    <div className={`h-1 w-full ${
                      sub.status === "active" ? "bg-accent" : sub.status === "paused" ? "bg-yellow-400" : "bg-destructive"
                    }`} />

                    <div className="p-5 space-y-4">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground">{sub.service_name}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                            {sub.interval !== "engangskøb" && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3 w-3" />
                                {INTERVAL_LABELS[sub.interval] || sub.interval}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold text-foreground">{sub.total_price} kr</span>
                          {sub.interval !== "engangskøb" && (
                            <span className="block text-xs text-muted-foreground">
                              /{(INTERVAL_LABELS[sub.interval] || sub.interval).toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Step details */}
                      {sub.details && (sub.details as any).stepDetails && (
                        <div className="rounded-xl bg-secondary/40 overflow-hidden divide-y divide-border">
                          {((sub.details as any).stepDetails as any[]).map((sd: any, i: number) => (
                            <div key={i} className="flex justify-between px-3.5 py-2 text-xs">
                              <span className="text-muted-foreground">{sd.label}: {sd.value} {sd.unit}</span>
                              <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Description details */}
                      {sub.details && (sub.details as any).description && !(sub.details as any).stepDetails?.length && (
                        <p className="text-xs text-muted-foreground rounded-xl bg-secondary/40 px-3.5 py-2">
                          {(sub.details as any).description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sub.status === "active" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handlePause(sub.id)}
                              className="gap-1.5 rounded-xl text-xs">
                              <Pause className="h-3.5 w-3.5" /> Sæt på pause
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)}
                              className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                              <XCircle className="h-3.5 w-3.5" /> Opsig
                            </Button>
                            <Button variant="outline" size="sm"
                              onClick={() => setReviewingId(reviewingId === sub.id ? null : sub.id)}
                              className="gap-1.5 rounded-xl text-xs ml-auto">
                              <Star className="h-3.5 w-3.5" /> Anmeld
                            </Button>
                          </>
                        )}
                        {sub.status === "paused" && (
                          <>
                            <Button size="sm" onClick={() => handleResume(sub.id)}
                              className="gap-1.5 rounded-xl text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                              <Play className="h-3.5 w-3.5" /> Genoptag
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)}
                              className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> Opsig
                            </Button>
                          </>
                        )}
                        {sub.status === "cancelled" && (
                          <p className="text-xs text-muted-foreground italic">
                            Opsagt {sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString("da-DK") : ""}
                          </p>
                        )}
                      </div>

                      {/* Review form */}
                      {reviewingId === sub.id && (
                        <ReviewForm
                          businessId={sub.business_id}
                          subscriptionId={sub.id}
                          onDone={() => setReviewingId(null)}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Review Form                                     */
/* ════════════════════════════════════════════════ */
const ReviewForm = ({ businessId, subscriptionId, onDone }: { businessId: string; subscriptionId: string; onDone: () => void }) => {
  const { user } = useAuth();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = () => {
    createReview.mutate({
      business_id: businessId,
      reviewer_name: user?.email?.split("@")[0] || "Kunde",
      rating,
      comment: comment.trim() || null,
      customer_id: user?.id,
      subscription_id: subscriptionId,
    }, {
      onSuccess: () => { toast.success("Anmeldelse sendt! Tak for din feedback."); onDone(); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Star className="h-4 w-4 text-accent" /> Skriv en anmeldelse
      </h4>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Din bedømmelse</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoveredStar(i)}
              onMouseLeave={() => setHoveredStar(0)}
              type="button"
              className="transition-transform hover:scale-110"
            >
              <Star className={`h-7 w-7 transition-colors ${
                i <= (hoveredStar || rating) ? "fill-accent text-accent" : "text-border"
              }`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Kommentar (valgfrit)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Fortæl om din oplevelse med denne service..."
          rows={3}
          className="rounded-xl"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={createReview.isPending}
          className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
          {createReview.isPending ? "Sender..." : "Send anmeldelse"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} className="rounded-xl">
          Annuller
        </Button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Profile View                                    */
/* ════════════════════════════════════════════════ */
const ProfileView = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (isLoading) return (
    <div className="max-w-lg">
      <div className="h-64 animate-pulse rounded-2xl bg-secondary/50" />
    </div>
  );

  const handleSave = () => {
    updateProfile.mutate({
      userId: user!.id,
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
    } as any, {
      onSuccess: () => toast.success("Profil opdateret!"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      <Card className="overflow-hidden rounded-2xl border-border">
        <div className="h-1 w-full bg-accent" />
        <CardContent className="p-6 space-y-5">
          {/* Avatar + email header */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-xl font-bold text-accent">
              {(user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{displayName || user?.email?.split("@")[0]}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Navn</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dit fulde navn"
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Telefon</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+45 00 00 00 00"
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
              <Input value={user?.email || ""} disabled className="h-11 rounded-xl bg-secondary/50" />
              <p className="mt-1 text-xs text-muted-foreground">E-mail kan ikke ændres</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateProfile.isPending}
            className="w-full h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
            {updateProfile.isPending ? "Gemmer..." : "Gem ændringer"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-secondary/20">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Sikkerhed & privatliv
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Dine data er beskyttet og bruges kun til at levere de services, du har bestilt.
            Du kan til enhver tid opsige dine services fra dit kundepanel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
