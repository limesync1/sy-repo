import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bucket?: string;
  folder: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
  aspectRatio?: string;
  objectFit?: "cover" | "contain";
}

const ImageUpload = ({
  bucket = "business-assets",
  folder,
  currentUrl,
  onUploaded,
  label = "Upload billede",
  className = "",
  aspectRatio = "aspect-square",
  objectFit = "cover",
}: Props) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Kun billedfiler er tilladt");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Billedet må max være 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setPreview(publicUrl);
      onUploaded(publicUrl);
      toast.success("Billede uploadet!");
    } catch (err: any) {
      console.error(err);
      toast.error("Upload fejlede: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const fitClass = objectFit === "contain" ? "object-contain p-2" : "object-cover";

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>}
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/30 ${aspectRatio} flex items-center justify-center`}>
        {preview ? (
          <>
            <img src={preview} alt="Preview" className={`h-full w-full ${fitClass}`} />
            <button
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background hover:bg-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 p-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
            <span className="text-sm">{uploading ? "Uploader..." : "Klik for at uploade"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
