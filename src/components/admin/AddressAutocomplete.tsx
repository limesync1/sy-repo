import SharedAddressAutocomplete from "@/components/shared/AddressAutocomplete";
interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { address: string; zipCode: string; city: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
  className?: string;
}
export default function AddressAutocomplete({ value, onChange, onSelect, ...props }: Props) {
  return <SharedAddressAutocomplete {...props} value={{ address: value, zip_code: "", city: "" }} onChange={(next) => {
    onChange(next.address);
    if (next.latitude != null && next.longitude != null) onSelect({ address: next.address, zipCode: next.zip_code, city: next.city, lat: next.latitude, lng: next.longitude });
  }} />;
}
