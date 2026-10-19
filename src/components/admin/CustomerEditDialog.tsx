import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Section, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldLabel } from "@/components/admin/shared/AdminUI";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, User, Loader2, Save, ShoppingBag, Camera, ChevronDown, StickyNote } from "lucide-react";
import { toast } from "sonner";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { useServices } from "@/hooks/useDatabase";
import { useActiveAccountingIntegration } from "@/hooks/useActiveAccountingIntegration";
import CustomerContactsSection from "./CustomerContactsSection";
import CustomerDocumentsSection from "./CustomerDocumentsSection";
import NotificationOverridesPanel from "./NotificationOverridesPanel";

export type CustomerType = "private" | "business";

export interface EditableCustomer {
  id?: string;
  type: CustomerType;
  // private
  name?: string;
  // business
  company_name?: string;
  cvr?: string;
  contact_name?: string;
  // shared
  email: string;
  phone?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  avatar_url?: string | null;
  customer_number?: string | null;
  customer_group?: string | null;
  vat_zone?: string | null;
  is_blocked?: boolean | null;
  payment_terms_days?: number | null;
  ean_number?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  businessName: string;
  initial?: EditableCustomer | null;
  /** Kaldes efter gem, så fx ruteplanlæggeren kan opdatere sine aftalekort. */
  onSaved?: (saved: EditableCustomer) => void | Promise<void>;
}

const CustomerEditDialog = ({ open, onOpenChange, businessId, businessName, initial, onSaved }: Props) => {
  const qc = useQueryClient();
  const [type, setType] = useState<CustomerType>(initial?.type || "private");
  const [name, setName] = useState(initial?.name || "");
  const [companyName, setCompanyName] = useState(initial?.company_name || "");
  const [cvr, setCvr] = useState(initial?.cvr || "");
  const [contactName, setContactName] = useState(initial?.contact_name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [zipCode, setZipCode] = useState(initial?.zip_code || "");
  const [city, setCity] = useState(initial?.city || "");
  const [latitude, setLatitude] = useState<number | null>(initial?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initial?.longitude ?? null);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatar_url ?? null);
  const [customerNumber, setCustomerNumber] = useState(initial?.customer_number || "");
  const [customerGroup, setCustomerGroup] = useState(initial?.customer_group || "");
  const [vatZone, setVatZone] = useState<string>(initial?.vat_zone || "domestic");
  const [isBlocked, setIsBlocked] = useState<boolean>(!!initial?.is_blocked);
  const [paymentTermsDays, setPaymentTermsDays] = useState<string>(
    initial?.payment_terms_days != null ? String(initial.payment_terms_days) : ""
  );
  const [eanNumber, setEanNumber] = useState(initial?.ean_number || "");
  const [customerGroups, setCustomerGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupsLabel, setGroupsLabel] = useState<string>("Kundegruppe");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState<EditableCustomer | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(!!initial?.notes);
  const [showAccounting, setShowAccounting] = useState(false);
  const { data: activeAccountingIntegration } = useActiveAccountingIntegration(open ? businessId : undefined);
  const accountingEnabled = !!activeAccountingIntegration;
  const { data: services = [] } = useServices(businessId);
  const hasActiveServices = services.some((service) => service.is_active !== false);

  // Geocode address — used after CVR autofill so adressefeltet ikke vises som "ikke fundet"
  const geocodeCurrentAddress = async (addr: string, zip: string, ci: string) => {
    if (!addr.trim() || !zip.trim() || !ci.trim()) return;
    try {
      const { data } = await supabase.functions.invoke("geocode-address", {
        body: { address: addr, zip_code: zip, city: ci },
      });
      if (data?.found && data.latitude && data.longitude) {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      }
    } catch { /* non-fatal */ }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Kun billedfiler er tilladt"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Billedet må max være 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du er ikke logget ind");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/customers/${initial?.id || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-assets").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("business-assets").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      toast.success("Billede klar — husk at gemme");
    } catch (err: any) {
      toast.error(err.message || "Upload fejlede");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Sync state when `initial` changes (e.g. user opens dialog for different customer)
  useEffect(() => {
    if (!open) return;
    setType(initial?.type || "private");
    setName(initial?.name || "");
    setCompanyName(initial?.company_name || "");
    setCvr(initial?.cvr || "");
    setContactName(initial?.contact_name || "");
    setEmail(initial?.email || "");
    setPhone(initial?.phone || "");
    setAddress(initial?.address || "");
    setZipCode(initial?.zip_code || "");
    setCity(initial?.city || "");
    setLatitude(initial?.latitude ?? null);
    setLongitude(initial?.longitude ?? null);
    setNotes(initial?.notes || "");
    setAvatarUrl(initial?.avatar_url ?? null);
    setCustomerNumber(initial?.customer_number || "");
    setCustomerGroup(initial?.customer_group || "");
    setVatZone(initial?.vat_zone || "domestic");
    setIsBlocked(!!initial?.is_blocked);
    setPaymentTermsDays(initial?.payment_terms_days != null ? String(initial.payment_terms_days) : "");
    setEanNumber(initial?.ean_number || "");
    setSavedCustomer(null);
    setShowNotes(!!initial?.notes);
    setShowPhoto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // Hent kundegrupper fra det forbundne regnskabsprogram (hvis nogen)
  useEffect(() => {
    if (!open || !businessId || !accountingEnabled) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("accounting-list-groups", {
          body: { business_id: businessId },
        });
        const cg = (data as any)?.customer_groups ?? [];
        const label = (data as any)?.labels?.customer_groups;
        if (Array.isArray(cg)) setCustomerGroups(cg);
        if (label) setGroupsLabel(label);
      } catch { /* ingen integration — ignorér */ }
    })();
  }, [open, businessId, accountingEnabled]);

  const reset = () => {
    setType("private");
    setName(""); setCompanyName(""); setCvr(""); setContactName("");
    setEmail(""); setPhone(""); setAddress(""); setZipCode(""); setCity("");
    setLatitude(null); setLongitude(null); setNotes("");
    setAvatarUrl(null);
    setCustomerNumber(""); setCustomerGroup(""); setVatZone("domestic");
    setIsBlocked(false); setPaymentTermsDays(""); setEanNumber("");
    setSavedCustomer(null);
  };

  const validate = (): string | null => {
    const missing: string[] = [];
    if (type === "private" && !name.trim()) missing.push("navn");
    if (type === "business" && !companyName.trim()) missing.push("firmanavn");
    if (!email.trim()) missing.push("e-mail");
    if (missing.length) return `Udfyld ${missing.join(" og ")}`;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Skriv en gyldig e-mailadresse, fx navn@firma.dk";
    return null;
  };

  const handleSave = async (alsoCreateOrder = false) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const baseShared = {
        business_id: businessId,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        zip_code: zipCode.trim() || null,
        city: city.trim() || null,
        latitude, longitude,
        notes: notes.trim() || null,
        avatar_url: avatarUrl,
        customer_number: customerNumber.trim() || null,
        customer_group: customerGroup.trim() || null,
        vat_zone: vatZone || null,
        is_blocked: isBlocked,
        payment_terms_days: paymentTermsDays.trim() ? Number(paymentTermsDays) : null,
      };
      let savedRow: any;
      if (type === "private") {
        const row = { ...baseShared, name: name.trim(), ean_number: eanNumber.trim() || null };
        const { data, error } = initial?.id
          ? await supabase.from("private_customers").update(row).eq("id", initial.id).select().single()
          : await supabase.from("private_customers").upsert(row, { onConflict: "business_id,email" }).select().single();
        if (error) throw error;
        savedRow = data;
      } else {
        const row = {
          ...baseShared,
          company_name: companyName.trim(),
          cvr: cvr.replace(/\D/g, "") || null,
          contact_name: contactName.trim() || null,
          ean_number: eanNumber.trim() || null,
        };
        const { data, error } = initial?.id
          ? await supabase.from("business_customers").update(row).eq("id", initial.id).select().single()
          : await supabase.from("business_customers").upsert(row, { onConflict: "business_id,email" }).select().single();
        if (error) throw error;
        savedRow = data;
      }
      qc.invalidateQueries({ queryKey: ["customers", businessId] });
      qc.invalidateQueries({ queryKey: ["saved-customers", businessId] });
      toast.success(initial?.id ? "Kunde opdateret" : "Kunde oprettet");

      const saved: EditableCustomer = {
        id: savedRow.id,
        type,
        name: type === "private" ? savedRow.name : undefined,
        company_name: type === "business" ? savedRow.company_name : undefined,
        cvr: savedRow.cvr,
        contact_name: savedRow.contact_name,
        email: savedRow.email,
        phone: savedRow.phone,
        address: savedRow.address,
        zip_code: savedRow.zip_code,
        city: savedRow.city,
        latitude: savedRow.latitude,
        longitude: savedRow.longitude,
        notes: savedRow.notes,
      };
      if (onSaved) await onSaved(saved);

      if (alsoCreateOrder && !hasActiveServices) {
        toast.error("Kunden er gemt, men bestillingen kan ikke oprettes", {
          description: "Opret eller aktivér først en service.",
        });
        reset();
        onOpenChange(false);
      } else if (alsoCreateOrder) {
        setSavedCustomer(saved);
        setOrderDialogOpen(true);
      } else {
        reset();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke gemme kunde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) { reset(); onOpenChange(false); } else if (v) onOpenChange(true); }}>
        <DialogContent className="modal-large planner-overlay flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-2.5 pr-12 border-b shrink-0 space-y-0 text-left">
            <SheetHeaderBlock
              title={<DialogTitle className="text-base">{initial?.id ? "Rediger kunde" : "Opret kunde"}</DialogTitle>}
              description={<DialogDescription className="text-xs leading-snug">{initial?.id ? "Ret kundens oplysninger i kartoteket." : "Gem kunden eller fortsæt til en bestilling."}</DialogDescription>}
            />
          </DialogHeader>

          <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-2 [&_input]:min-h-11 sm:[&_input]:min-h-10 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-10">
            {!initial?.id && (
              <Tabs value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <TabsList className="grid h-11 sm:h-10 w-full grid-cols-2">
                  <TabsTrigger value="private" className="h-full gap-1.5"><User className="h-3.5 w-3.5" /> Privatkunde</TabsTrigger>
                  <TabsTrigger value="business" className="h-full gap-1.5"><Building2 className="h-3.5 w-3.5" /> Erhvervskunde</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <Section icon={type === "business" ? <Building2 /> : <User />} title={type === "business" ? "Erhvervskunde" : "Kunde"}>
            {type === "business" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel optional>CVR</FieldLabel>
                  <CvrLookupField
                    value={cvr}
                    onChange={setCvr}
                    onResult={(r: CvrResult | null) => {
                      if (!r) return;
                      setCompanyName(r.name);
                      if (r.address) setAddress(r.address);
                      if (r.zip_code) setZipCode(r.zip_code);
                      if (r.city) setCity(r.city);
                      if (r.phone && !phone) setPhone(r.phone);
                      if (r.email && !email) setEmail(r.email);
                      // Geocode den nye adresse straks så den ikke vises som "ikke fundet"
                      setLatitude(null); setLongitude(null);
                      if (r.address && r.zip_code && r.city) {
                        const { address: companyAddress, zip_code: companyZip, city: companyCity } = r;
                        setTimeout(() => geocodeCurrentAddress(companyAddress, companyZip, companyCity), 50);
                      }
                    }}
                  />
                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Slå virksomheden op for at udfylde navn og adresse automatisk.</p>
                </div>
                <div>
                  <FieldLabel required>Firmanavn</FieldLabel>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Fx Hansen ApS" className="h-10" />
                </div>
                <div>
                  <FieldLabel optional>Kontaktperson</FieldLabel>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Mette Hansen" className="h-10" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {type === "private" && (
              <div>
                <FieldLabel required>Navn</FieldLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mette Hansen" className="h-10" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <FieldLabel required>E-mail</FieldLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kunde@email.dk" className="h-10" />
              </div>
              <div>
                <FieldLabel optional>Telefon</FieldLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-10" />
              </div>
            </div>
            </div>

            <div className="relative z-20 space-y-1.5">
              <FieldLabel optional>Adresse</FieldLabel>
              <AddressAutocomplete
                value={{ address, zip_code: zipCode, city, latitude, longitude }}
                onChange={(v) => {
                  setAddress(v.address); setZipCode(v.zip_code); setCity(v.city);
                  setLatitude(v.latitude ?? null); setLongitude(v.longitude ?? null);
                }}
              />
            </div>

            {(zipCode || city) && (
              <div className="grid grid-cols-3 gap-3">
                <div><FieldLabel optional>Postnr.</FieldLabel><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="h-10" /></div>
                <div className="col-span-2"><FieldLabel optional>By</FieldLabel><Input value={city} onChange={(e) => setCity(e.target.value)} className="h-10" /></div>
              </div>
            )}

            </Section>

            {/* Profilbillede — altid synligt */}
            <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <label className="group/avatar relative h-14 w-14 shrink-0 cursor-pointer" title="Vælg profilbillede">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profilbillede" className="h-14 w-14 rounded-full border-2 border-accent/40 object-cover" width={56} height={56} loading="lazy" decoding="async" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-accent/50 bg-background text-accent">
                    <Camera className="h-6 w-6" />
                  </span>
                )}
                {uploadingAvatar && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70"><Loader2 className="h-5 w-5 animate-spin text-accent" /></span>}
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} aria-label="Vælg profilbillede" />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Profilbillede <span className="font-normal text-muted-foreground">(valgfrit)</span></p>
                <p className="text-xs text-muted-foreground">JPG eller PNG, maks. 5 MB.</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button asChild size="sm" className="h-11 cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90 sm:h-9">
                    <label><Camera className="h-4 w-4" />{avatarUrl ? "Skift billede" : "Tilføj billede"}<input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} /></label>
                  </Button>
                  {avatarUrl && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setAvatarUrl(null)} className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9">Fjern</Button>
                  )}
                </div>
              </div>
            </div>

            <Collapsible open={showNotes} onOpenChange={setShowNotes} className="rounded-lg border border-warning/40 bg-warning/5">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/20 text-warning-foreground dark:text-warning"><StickyNote className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">Intern note <span className="font-normal text-muted-foreground">(valgfrit)</span></span>
                    <span className="block text-xs text-muted-foreground">Kun synlig for jer — fx kode til hoveddør.</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-accent">{showNotes ? "Skjul" : notes ? "Vis" : "Tilføj"}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showNotes ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <Textarea aria-label="Intern note" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))} rows={2} placeholder="Fx kode til hoveddør, særlige aftaler…" className="bg-background resize-none" />
              </CollapsibleContent>
            </Collapsible>

            {/* Regnskabs-felter — vises kun hvis virksomheden har integreret et regnskabsprogram */}
            {accountingEnabled && (
            <Collapsible open={showAccounting} onOpenChange={setShowAccounting} className="rounded-lg border border-primary/20 bg-secondary/40">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-foreground"><Building2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">Regnskab & fakturering <span className="font-normal text-muted-foreground">(valgfrit)</span></span>
                    <span className="block text-xs text-muted-foreground">Kunde-nr., betaling, moms og EAN.</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-accent">{showAccounting ? "Skjul" : "Vis"}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showAccounting ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 px-3 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel optional>Kunde-nr.</FieldLabel>
                  <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} placeholder="Auto" className="h-10" />
                </div>
                <div>
                  <FieldLabel optional>Betalingsbetingelse (dage)</FieldLabel>
                  <Input type="number" min="0" value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(e.target.value)} placeholder="14" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel optional>Momszone</FieldLabel>
                  <Select value={vatZone} onValueChange={setVatZone}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">Indland</SelectItem>
                      <SelectItem value="eu">EU</SelectItem>
                      <SelectItem value="export">Eksport (3. land)</SelectItem>
                      <SelectItem value="exempt">Momsfri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel optional>EAN-nummer</FieldLabel>
                  <Input value={eanNumber} onChange={(e) => setEanNumber(e.target.value)} placeholder="5790000000000" className="h-10" />
                </div>
              </div>
              {customerGroups.length > 0 && (
                <div>
                  <FieldLabel optional>{groupsLabel}</FieldLabel>
                  <Select value={customerGroup} onValueChange={setCustomerGroup}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Vælg gruppe" /></SelectTrigger>
                    <SelectContent>
                      {customerGroups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border bg-background p-2.5">
                <div>
                  <p className="text-xs font-medium">Spær for fakturering</p>
                  <p className="text-[11px] text-muted-foreground">Når aktiveret kan kunden ikke faktureres.</p>
                </div>
                <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
              </div>
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Ekstra kontaktpersoner & dokumenter — kun for erhvervskunder
                OG kun når der er et regnskabsprogram tilkoblet. Begge dele er
                regnskabs-funktioner (bogholderi-mail, kontrakter osv.). */}
            {type === "business" && accountingEnabled && initial?.id && (
              <CustomerContactsSection businessCustomerId={initial?.id ?? null} />
            )}

            {type === "business" && accountingEnabled && initial?.id && (
              <CustomerDocumentsSection
                businessId={businessId}
                businessCustomerId={initial?.id ?? null}
                customerEmail={email}
              />
            )}

            {initial?.id && email && (
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Notifikationer for denne kunde</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tilsidesæt virksomhedens standard for SMS- og e-mail-påmindelser specifikt for denne kunde.
                  </p>
                </div>
                <NotificationOverridesPanel
                  businessId={businessId}
                  scope="customer"
                  customerEmail={email}
                  compact
                />
              </div>
            )}
          </div>

          <SheetFooterBar>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving} className="h-11 sm:h-10">Annullér</Button>
              <div className="contents sm:flex sm:gap-2">
                <Button variant={initial?.id ? "default" : "outline"} onClick={() => handleSave(false)} disabled={saving} className="h-11 sm:h-10">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {initial?.id ? "Gem ændringer" : "Opret kunde"}
                </Button>
                {!initial?.id && (
                  <Button onClick={() => handleSave(true)} disabled={saving}
                    title={hasActiveServices ? "Gem kunden og opret en bestilling" : "Opret en aktiv service før du kan oprette bestillinger"}
                    className="h-11 sm:h-10 col-span-2">
                    <ShoppingBag className="h-4 w-4" />Gem og opret bestilling
                  </Button>
                )}
              </div>
            </div>
          </SheetFooterBar>
        </DialogContent>
      </Dialog>

      {/* Genbrug eksisterende manuel-bestilling-dialog. Den læser nu kunden via autocomplete eller udfyld initial via key remount */}
      {savedCustomer && (
        <CreateManualOrderDialog
          open={orderDialogOpen}
          onOpenChange={(v) => {
            setOrderDialogOpen(v);
            if (!v) {
              reset();
              onOpenChange(false);
            }
          }}
          businessId={businessId}
          businessName={businessName}
          initialCustomer={{
            customer_name: savedCustomer.type === "private" ? (savedCustomer.name || "") : (savedCustomer.company_name || ""),
            customer_email: savedCustomer.email,
            customer_phone: savedCustomer.phone || null,
            address: savedCustomer.address || null,
            zip_code: savedCustomer.zip_code || null,
            city: savedCustomer.city || null,
            latitude: savedCustomer.latitude ?? null,
            longitude: savedCustomer.longitude ?? null,
            cvr: savedCustomer.cvr || null,
            company_name: savedCustomer.type === "business" ? (savedCustomer.company_name || null) : null,
          }}
        />
      )}
    </>
  );
};

export default CustomerEditDialog;