import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2 } from "lucide-react";
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
  /** Vis hjælpetekst ("Klik for at uploade") under ikonet — default false. */
  showHint?: boolean;
  /** Maks bredde/højde i pixels for komprimeret upload — default 1600 */
  maxDimension?: number;
  /** WebP kvalitet 0-1 — default 0.82 */
  quality?: number;
}

/**
 * Komprimer billede client-side til WebP via canvas.
 * Reducerer typisk filstørrelse med 60-80% og indlæser hurtigere på alle sider.
 */
const compressToWebP = (file: File, maxDim: number, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context utilgængelig");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error("Konvertering mislykkedes"));
            resolve(blob);
          },
          "image/webp",
          quality,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunne ikke indlæse billede"));
    };
    img.src = url;
  });

const ImageUpload = ({
  bucket = "business-assets",
  folder,
  currentUrl,
  onUploaded,
  label = "Upload billede",
  className = "",
  aspectRatio = "aspect-square",
  objectFit = "cover",
  showHint = false,
  maxDimension = 1600,
  quality = 0.82,
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

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Billedet må max være 15MB");
      return;
    }

    setUploading(true);
    try {
      // SVG kan ikke komprimeres via canvas — upload originalt
      let uploadBody: Blob | File = file;
      let ext = "webp";
      if (file.type === "image/svg+xml") {
        ext = "svg";
      } else {
        try {
          uploadBody = await compressToWebP(file, maxDimension, quality);
        } catch (err) {
          console.warn("WebP-komprimering fejlede, uploader original", err);
          uploadBody = file;
          ext = file.name.split(".").pop() || "png";
        }
      }
      const fileName = `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fileName, uploadBody, {
        cacheControl: "31536000",
        upsert: true,
        contentType: ext === "webp" ? "image/webp" : (ext === "svg" ? "image/svg+xml" : file.type),
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
      <div className={`group relative overflow-hidden rounded-xl border border-dashed border-border bg-secondary/40 ${aspectRatio} flex items-center justify-center transition-colors hover:border-foreground/40 hover:bg-secondary/60`}>
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className={`h-full w-full ${fitClass}`}
              loading="lazy"
              decoding="async"
            />
            <button
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background hover:bg-foreground"
              aria-label="Fjern billede"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Upload billede"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {showHint && (
              <span className="text-[11px] font-medium">{uploading ? "Uploader…" : "Tilføj billede"}</span>
            )}
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
