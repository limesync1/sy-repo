import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/admin/shared/AdminUI";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, User, Loader2, Save, ShoppingBag, Camera, X, Upload } from "lucide-react";
import { toast } from "sonner";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import CustomerContactsSection from "./CustomerContactsSection";
import CustomerDocumentsSection from "./CustomerDocumentsSection";

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
}

const CustomerEditDialog = ({ open, onOpenChange, businessId, businessName, initial }: Props) => {
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
  const [accountingEnabled, setAccountingEnabled] = useState<boolean>(false);

  // Tjek om virksomheden har et regnskabsprogram aktiveret — ellers skjuler vi
  // hele "Regnskab & fakturering"-sektionen, så panelet er rent og enkelt.
  useEffect(() => {
    if (!open || !businessId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("businesses")
          .select("settings")
          .eq("id", businessId)
          .maybeSingle();
        if (cancelled) return;
        const enabled = !!(data?.settings as any)?.accounting_integration_enabled;
        setAccountingEnabled(enabled);
      } catch {
        if (!cancelled) setAccountingEnabled(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, businessId]);

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
        cacheControl: "3600", upsert: true,
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
    if (!email.trim()) return "Email er påkrævet";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Ugyldig email";
    if (type === "private" && !name.trim()) return "Navn er påkrævet";
    if (type === "business" && !companyName.trim()) return "Firmanavn er påkrævet";
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

      if (alsoCreateOrder) {
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
        <DialogContent className="max-w-xl max-h-[calc(100dvh-1rem)] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0 text-left sm:px-5 sm:py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              {type === "business" ? <Building2 className="h-4 w-4 text-accent" /> : <User className="h-4 w-4 text-accent" />}
              {initial?.id ? "Rediger kunde" : "Opret ny kunde"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Gem kunden i kartoteket — eller fortsæt direkte til første bestilling.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-secondary/20 sm:px-5 sm:py-4 sm:space-y-4">
            {!initial?.id && (
              <Tabs value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <TabsList className="grid h-10 w-full grid-cols-2">
                  <TabsTrigger value="private" className="gap-1.5"><User className="h-3.5 w-3.5" /> Privatkunde</TabsTrigger>
                  <TabsTrigger value="business" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Erhvervskunde</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Profilbillede */}
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:border-0 sm:bg-transparent sm:p-0">
              <div className="relative h-12 w-12 shrink-0 group/avatar sm:h-14 sm:w-14">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profil"
                    className="h-12 w-12 rounded-full object-cover border sm:h-14 sm:w-14"
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-accent/10 border flex items-center justify-center text-accent sm:h-14 sm:w-14">
                    {type === "business" ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 text-background text-[10px] font-semibold opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity" title="Skift profilbillede">
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skift"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>
              <div className="text-xs text-muted-foreground flex-1 min-w-0">
                <p className="font-medium text-foreground">Profilbillede</p>
                <p className="truncate sm:whitespace-normal">Tryk på billedet for at skifte. Maks 5MB.</p>
                {avatarUrl && (
                  <button type="button" onClick={() => setAvatarUrl(null)} className="text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline mt-0.5">
                    Fjern billede
                  </button>
                )}
              </div>
            </div>

            {type === "business" && (
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div>
                  <FieldLabel optional>CVR (slå op for at auto-udfylde)</FieldLabel>
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
                        setTimeout(() => geocodeCurrentAddress(r.address!, r.zip_code!, r.city!), 50);
                      }
                    }}
                  />
                </div>
                <div>
                  <FieldLabel required>Firmanavn</FieldLabel>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Hansen ApS" className="h-9" />
                </div>
                <div>
                  <FieldLabel optional>Kontaktperson</FieldLabel>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Mette Hansen" className="h-9" />
                </div>
              </div>
            )}

            {type === "private" && (
              <div>
                <FieldLabel required>Navn</FieldLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mette Hansen" className="h-9" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Email</FieldLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kunde@email.dk" className="h-9" />
              </div>
              <div>
                <FieldLabel optional>Telefon</FieldLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-9" />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3 space-y-2 sm:border-0 sm:bg-transparent sm:p-0">
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
                <div><FieldLabel optional>Postnr.</FieldLabel><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="h-9" /></div>
                <div className="col-span-2"><FieldLabel optional>By</FieldLabel><Input value={city} onChange={(e) => setCity(e.target.value)} className="h-9" /></div>
              </div>
            )}

            <div>
              <FieldLabel optional>Interne noter</FieldLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))} rows={2} placeholder="Fx kode til hoveddør, særlige aftaler…" className="bg-background resize-none" />
            </div>

            {/* Regnskabs-felter — vises kun hvis virksomheden har integreret et regnskabsprogram */}
            {accountingEnabled && (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <p className="text-xs font-medium text-foreground">Regnskab & fakturering</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel optional>Kunde-nr.</FieldLabel>
                  <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} placeholder="Auto" className="h-9" />
                </div>
                <div>
                  <FieldLabel optional>Betalingsbetingelse (dage)</FieldLabel>
                  <Input type="number" min="0" value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(e.target.value)} placeholder="14" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel optional>Momszone</FieldLabel>
                  <Select value={vatZone} onValueChange={setVatZone}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                  <Input value={eanNumber} onChange={(e) => setEanNumber(e.target.value)} placeholder="5790000000000" className="h-9" />
                </div>
              </div>
              {customerGroups.length > 0 && (
                <div>
                  <FieldLabel optional>{groupsLabel}</FieldLabel>
                  <Select value={customerGroup} onValueChange={setCustomerGroup}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Vælg gruppe" /></SelectTrigger>
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
            </div>
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
          </div>

          <DialogFooter className="px-4 py-3 border-t shrink-0 gap-2 sm:gap-2 sm:px-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={saving} className="h-9">Annullér</Button>
            <div className="grid w-full gap-2 sm:flex sm:w-auto">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="h-9">
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Gem kunde
              </Button>
              {!initial?.id && (
                <Button onClick={() => handleSave(true)} disabled={saving} className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Gem og opret bestilling
                </Button>
              )}
            </div>
          </DialogFooter>
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