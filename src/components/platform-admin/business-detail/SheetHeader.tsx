import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Building2, ExternalLink, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  business: any;
  ownerEmail?: string | null;
  isDeleted: boolean;
}

export default function BusinessSheetHeader({ business, ownerEmail, isDeleted }: Props) {
  return (
    <SheetHeader>
      <SheetTitle className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        {business?.name || "Indlæser…"}
        {isDeleted && (
          <span className="text-xs font-normal rounded-md bg-destructive/10 text-destructive px-2 py-0.5 ring-1 ring-destructive/20">
            Slettet
          </span>
        )}
      </SheetTitle>
      <SheetDescription className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {business?.category && <span>{business.category}</span>}
        {business?.city && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{business.city}</span>}
        {ownerEmail && <span className="inline-flex items-center gap-0.5"><Mail className="h-3 w-3" />{ownerEmail}</span>}
        {business?.slug && (
          <Link to={`/b/${business.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
            <ExternalLink className="h-3 w-3" />/{business.slug}
          </Link>
        )}
      </SheetDescription>
    </SheetHeader>
  );
}