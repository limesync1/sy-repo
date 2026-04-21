import { useState } from "react";
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
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, User, Loader2, Save, ShoppingBag } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState<EditableCustomer | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const reset = () => {
    setType("private");
    setName(""); setCompanyName(""); setCvr(""); setContactName("");
    setEmail(""); setPhone(""); setAddress(""); setZipCode(""); setCity("");
    setLatitude(null); setLongitude(null); setNotes("");
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
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              {type === "business" ? <Building2 className="h-4 w-4 text-accent" /> : <User className="h-4 w-4 text-accent" />}
              {initial?.id ? "Rediger kunde" : "Opret ny kunde"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tilføj kunden i dit kartotek. Du kan vælge at oprette en bestilling for kunden bagefter.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-secondary/20">
            {!initial?.id && (
              <Tabs value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="private" className="gap-1.5"><User className="h-3.5 w-3.5" /> Privatkunde</TabsTrigger>
                  <TabsTrigger value="business" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Erhvervskunde</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {type === "business" && (
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div>
                  <Label className="text-xs">CVR (slå op for at auto-udfylde)</Label>
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
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Firmanavn *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Hansen ApS" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Kontaktperson</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Mette Hansen" className="h-9" />
                </div>
              </div>
            )}

            {type === "private" && (
              <div>
                <Label className="text-xs">Navn *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mette Hansen" className="h-9" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kunde@email.dk" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-9" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Adresse</Label>
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
                <div><Label className="text-xs">Postnr.</Label><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="h-9" /></div>
                <div className="col-span-2"><Label className="text-xs">By</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="h-9" /></div>
              </div>
            )}

            <div>
              <Label className="text-xs">Interne noter</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))} rows={2} placeholder="Fx kode til hoveddør, særlige aftaler…" className="bg-background resize-none" />
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2 sm:gap-2 flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>Annullér</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Gem kunde
              </Button>
              {!initial?.id && (
                <Button onClick={() => handleSave(true)} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
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