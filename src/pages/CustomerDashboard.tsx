import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMySubscriptions, useUpdateSubscription, useMyProfile, useUpdateProfile, useCreateReview } from "@/hooks/useDatabase";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import {
  Package, User, Star, LogOut, Pause, Play, XCircle,
  CalendarClock, ArrowLeft, ExternalLink,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Aktiv", bg: "bg-green-50", text: "text-green-700" },
  paused: { label: "På pause", bg: "bg-yellow-50", text: "text-yellow-700" },
  cancelled: { label: "Opsagt", bg: "bg-red-50", text: "text-red-700" },
};

const CustomerDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"subscriptions" | "profile">("subscriptions");

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e1e3e5] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <Link to="/"><img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" /></Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Log ud
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-4">Mit kundepanel</h1>
        <div className="flex gap-0 border-b border-[#e1e3e5] mb-6">
          {[
            { key: "subscriptions" as const, label: "Mine services", icon: Package },
            { key: "profile" as const, label: "Min profil", icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "text-foreground border-b-2 border-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "subscriptions" && <SubscriptionsView />}
        {tab === "profile" && <ProfileView />}
      </div>
    </div>
  );
};

const SubscriptionsView = () => {
  const { data: subscriptions, isLoading } = useMySubscriptions();
  const updateSub = useUpdateSubscription();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser dine services...</p>;

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
      <Card className="rounded-xl border-dashed border-[#e1e3e5]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Ingen aktive services</p>
          <p className="mt-1 text-sm text-muted-foreground">Bestil en service hos en virksomhed for at komme i gang.</p>
          <Link to="/search">
            <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-lg">
              <ExternalLink className="h-3.5 w-3.5" /> Find virksomheder
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {subscriptions.map((sub: any) => {
        const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
        const biz = sub.businesses;
        return (
          <Card key={sub.id} className="rounded-xl shadow-sm border-[#e1e3e5]">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {biz?.logo_url && (
                    <img src={biz.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-secondary p-0.5" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{sub.service_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {biz?.name}
                      {biz?.slug && (
                        <Link to={`/b/${biz.slug}`} className="ml-1 text-accent hover:underline">→ Se side</Link>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${cfg.bg} ${cfg.text} text-xs font-medium`}>{cfg.label}</Badge>
                  {sub.interval !== "engangskøb" && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {INTERVAL_LABELS[sub.interval] || sub.interval}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              {sub.details && (sub.details as any).stepDetails && (
                <div className="rounded-lg bg-secondary/30 divide-y divide-border">
                  {((sub.details as any).stepDetails as any[]).map((sd: any, i: number) => (
                    <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground">{sd.label}: {sd.value} {sd.unit}</span>
                      <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{sub.total_price} kr</span>
                <div className="flex gap-1.5">
                  {sub.status === "active" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handlePause(sub.id)} className="h-7 gap-1 text-xs rounded-lg">
                        <Pause className="h-3 w-3" /> Pause
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)} className="h-7 gap-1 text-xs rounded-lg text-destructive hover:text-destructive">
                        <XCircle className="h-3 w-3" /> Opsig
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setReviewingId(reviewingId === sub.id ? null : sub.id)} className="h-7 gap-1 text-xs rounded-lg">
                        <Star className="h-3 w-3" /> Anmeld
                      </Button>
                    </>
                  )}
                  {sub.status === "paused" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleResume(sub.id)} className="h-7 gap-1 text-xs rounded-lg text-green-600">
                        <Play className="h-3 w-3" /> Genoptag
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)} className="h-7 gap-1 text-xs rounded-lg text-destructive hover:text-destructive">
                        <XCircle className="h-3 w-3" /> Opsig
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Review form */}
              {reviewingId === sub.id && (
                <ReviewForm
                  businessId={sub.business_id}
                  subscriptionId={sub.id}
                  onDone={() => setReviewingId(null)}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const ReviewForm = ({ businessId, subscriptionId, onDone }: { businessId: string; subscriptionId: string; onDone: () => void }) => {
  const { user } = useAuth();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    createReview.mutate({
      business_id: businessId,
      reviewer_name: user?.email?.split("@")[0] || "Kunde",
      rating,
      comment: comment.trim() || null,
      customer_id: user?.id,
      subscription_id: subscriptionId,
    }, {
      onSuccess: () => { toast.success("Anmeldelse sendt!"); onDone(); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-3 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Bedømmelse</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} type="button">
              <Star className={`h-6 w-6 transition-colors ${i <= rating ? "fill-accent text-accent" : "text-muted"}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Kommentar (valgfrit)</label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Fortæl om din oplevelse..." rows={2} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={createReview.isPending} className="h-7 rounded-lg text-xs bg-accent text-accent-foreground hover:bg-accent/90">
          {createReview.isPending ? "Sender..." : "Send anmeldelse"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} className="h-7 rounded-lg text-xs">Annuller</Button>
      </div>
    </div>
  );
};

const ProfileView = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  // Init form once profile loads
  if (profile && !displayName && !phone) {
    setTimeout(() => {
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
    }, 0);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser profil...</p>;

  const handleSave = () => {
    updateProfile.mutate({
      userId: user!.id,
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
    } as any, {
      onSuccess: () => toast.success("Profil opdateret"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Profiloplysninger</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">E-mail</label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Navn</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Dit navn" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Telefon</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" />
          </div>
          <Button onClick={handleSave} disabled={updateProfile.isPending} size="sm" className="rounded-lg bg-foreground text-background hover:bg-foreground/90">
            {updateProfile.isPending ? "Gemmer..." : "Gem profil"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
