import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldLabel, SectionCard } from "@/components/admin/shared/AdminUI";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, User, Loader2, Save, ShoppingBag, Camera, X, Upload } from "lucide-react";
import { toast } from "sonner";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState<EditableCustomer | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

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
    setSavedCustomer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const reset = () => {
    setType("private");
    setName(""); setCompanyName(""); setCvr(""); setContactName("");
    setEmail(""); setPhone(""); setAddress(""); setZipCode(""); setCity("");
    setLatitude(null); setLongitude(null); setNotes("");
    setAvatarUrl(null);
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
      };
      let savedRow: any;
      if (type === "private") {
        const row = { ...baseShared, name: name.trim() };
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
        <DialogContent className="max-h-[92vh] max-w-[720px] gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3.5">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              {type === "business" ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
              {initial?.id ? "Rediger kunde" : "Opret ny kunde"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Gem kunden i kartoteket og opret eventuelt en bestilling bagefter.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/20 px-4 py-4">
            {!initial?.id && (
              <Tabs value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <TabsList className="grid h-8 w-full grid-cols-2 rounded-md border border-border bg-card p-1">
                  <TabsTrigger value="private" className="gap-1.5 rounded-md text-xs"><User className="h-3.5 w-3.5" /> Privatkunde</TabsTrigger>
                  <TabsTrigger value="business" className="gap-1.5 rounded-md text-xs"><Building2 className="h-3.5 w-3.5" /> Erhvervskunde</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <SectionCard title="Profil" description="Grundlæggende kundeoplysninger og billede.">
              <div className="flex items-center gap-3">
                <div className="group/avatar relative h-11 w-11 shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profil" className="h-11 w-11 rounded-md border border-border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                      {type === "business" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-md bg-foreground/60 text-[10px] font-semibold text-background opacity-0 transition-opacity group-hover/avatar:opacity-100" title="Skift profilbillede">
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skift"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <div className="flex-1 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">Profilbillede</p>
                  <p>Maks 5MB.</p>
                  {avatarUrl && (
                    <button type="button" onClick={() => setAvatarUrl(null)} className="mt-1 text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline">
                      Fjern billede
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            {type === "business" && (
              <SectionCard title="Virksomhedsoplysninger" description="Brug CVR-opslag for hurtig udfyldning.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel>CVR (slå op for at auto-udfylde)</FieldLabel>
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
                        setLatitude(null); setLongitude(null);
                        if (r.address && r.zip_code && r.city) {
                          setTimeout(() => geocodeCurrentAddress(r.address!, r.zip_code!, r.city!), 50);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Firmanavn</FieldLabel>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Hansen ApS" className="h-8" />
                  </div>
                  <div>
                    <FieldLabel>Kontaktperson</FieldLabel>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Mette Hansen" className="h-8" />
                  </div>
                </div>
              </SectionCard>
            )}

            {type === "private" && (
              <SectionCard title="Kundeoplysninger" description="Navn og kontakt på kunden.">
                <div>
                  <FieldLabel required>Navn</FieldLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mette Hansen" className="h-8" />
                </div>
              </SectionCard>
            )}

            <SectionCard title="Kontakt" description="Primær kontaktinformation og adresse.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Email</FieldLabel>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kunde@email.dk" className="h-8" />
                </div>
                <div>
                  <FieldLabel>Telefon</FieldLabel>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-8" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Adresse</FieldLabel>
                  <AddressAutocomplete
                    value={{ address, zip_code: zipCode, city, latitude, longitude }}
                    onChange={(v) => {
                      setAddress(v.address); setZipCode(v.zip_code); setCity(v.city);
                      setLatitude(v.latitude ?? null); setLongitude(v.longitude ?? null);
                    }}
                  />
                </div>
                {(zipCode || city) && (
                  <>
                    <div>
                      <FieldLabel>Postnr.</FieldLabel>
                      <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <FieldLabel>By</FieldLabel>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8" />
                    </div>
                  </>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Interne noter" description="Noter der kun er synlige internt.">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))} rows={3} placeholder="Fx kode til hoveddør, særlige aftaler…" className="resize-none bg-background" />
            </SectionCard>
          </div>

          <DialogFooter className="shrink-0 flex-row gap-2 border-t border-border px-4 py-3 sm:justify-between sm:gap-2">
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>Annullér</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="h-8 rounded-md text-xs">
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Gem kunde
              </Button>
              {!initial?.id && (
                <Button onClick={() => handleSave(true)} disabled={saving} className="h-8 rounded-md bg-foreground text-xs text-background hover:bg-foreground/90">
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Gem & opret bestilling
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