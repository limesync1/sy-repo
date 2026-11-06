import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2, Crop } from "lucide-react";
import { ImageCropDialog } from "@/components/shared/ImageCropDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { originalImageUrl } from "@/lib/profile-image-source";

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
  /** Lad brugeren zoome/flytte billedet før upload (kvadratisk resultat). */
  crop?: "circle" | "square";
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

const fetchImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Billedet kunne ikke hentes");
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  bitmap.close();
  return blob;
};

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
  crop,
}: Props) => {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [hasOriginal, setHasOriginal] = useState(true);
  const [opening, setOpening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Indstillinger og serviceformularen kan blive opdateret efter auto-save.
  // Hold den lokale forhåndsvisning synkroniseret med den gemte værdi.
  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Gør det muligt at vælge den samme fil igen efter en fejl.
    e.target.value = "";
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      toast.error("Vælg et billede på højst 15 MB");
      return;
    }
    if (crop && file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      setHasOriginal(true);
      setCropFile(file);
      return;
    }
    await uploadFile(file);
  };

  const adjustExisting = async () => {
    if (!preview) return;
    setOpening(true);
    try {
      const sourceUrl = originalImageUrl(preview);
      let sourceFound = false;
      let blob: Blob;
      if (sourceUrl) {
        try { blob = await fetchImage(sourceUrl); sourceFound = true; }
        catch { blob = await fetchImage(preview); }
      } else { blob = await fetchImage(preview); }
      setHasOriginal(sourceFound);
      setCropFile(new File([blob], "billede", { type: blob.type || "image/webp" }));
    } catch {
      toast.error("Billedet kunne ikke åbnes", { description: "Vælg billedet igen for at tilpasse det." });
    } finally {
      setOpening(false);
    }
  };

  const uploadFile = async (file: File, preCropped = false) => {

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error("Din session er udløbet. Log ind igen og prøv på ny.");
      }

      // Første mappe skal altid matche den aktive bruger. Dermed kan en gammel
      // formular eller en nyligt fornyet session ikke udløse fillagerets RLS.
      const folderParts = folder.split("/").filter(Boolean);
      const safeFolder = [session.user.id, ...folderParts.slice(1)].join("/");

      // SVG kan ikke komprimeres via canvas — upload originalt
      let uploadBody: Blob | File = file;
      let ext = "webp";
      if (file.type === "image/svg+xml") {
        ext = "svg";
      } else if (preCropped) {
        uploadBody = file;
      } else {
        try {
          uploadBody = await compressToWebP(file, maxDimension, quality);
        } catch (err) {
          console.warn("WebP-komprimering fejlede, uploader original", err);
          uploadBody = file;
          ext = file.name.split(".").pop() || "png";
        }
      }
      const imageId = `${Date.now()}-${crypto.randomUUID()}`;
      const fileName = `${safeFolder}/${preCropped && hasOriginal ? "crop-" : ""}${imageId}.${ext}`;

      // Preserve a full, compressed source alongside each crop, independent of browser storage.
      if (preCropped && cropFile && hasOriginal) {
        const original = await compressToWebP(cropFile, 2400, 0.94);
        const { error: sourceError } = await supabase.storage.from(bucket).upload(`${safeFolder}/original-${imageId}.webp`, original, {
          cacheControl: "31536000", upsert: false, contentType: "image/webp",
        });
        if (sourceError) throw sourceError;
      }

      const { error } = await supabase.storage.from(bucket).upload(fileName, uploadBody, {
        cacheControl: "31536000",
        // Filnavnet er altid unikt. Undgå upsert, da Storage ellers kræver
        // både INSERT-, SELECT- og UPDATE-policy og kan fejle med RLS.
        upsert: false,
        contentType: ext === "webp" ? "image/webp" : (ext === "svg" ? "image/svg+xml" : file.type),
      });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setPreview(publicUrl);
      onUploaded(publicUrl);
      setCropFile(null);
      toast.success("Billede uploadet!");
    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Ukendt fejl";
      const isAccessError = /row.level security|not authorized|permission|403/i.test(message);
      toast.error(isAccessError
        ? "Billedet kunne ikke gemmes. Din adgang er muligvis udløbet — genindlæs siden og prøv igen."
        : `Upload fejlede: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>}
      <div className={`group relative overflow-hidden rounded-md border border-dashed border-border bg-secondary/40 ${aspectRatio} flex items-center justify-center transition-colors hover:border-foreground/40 hover:bg-secondary/60`}>
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className={`h-full w-full ${fitClass}`}
              loading="lazy"
              decoding="async"
            />
            <Button variant="secondary" size="icon"
              type="button"
              onClick={handleRemove}
              disabled={uploading || opening}
              className="absolute right-1 top-1 h-11 w-11"
              aria-label="Fjern billede"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost"
            type="button"
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
          </Button>
        )}
      </div>
      {preview && <div className="mt-2 flex flex-wrap gap-1">
        {crop && <Button type="button" variant="outline" className="min-h-11 px-2 text-xs" disabled={uploading || opening} onClick={() => void adjustExisting()} aria-label="Tilpas billede">
          {opening || uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crop className="mr-1 h-4 w-4" />}Tilpas
        </Button>}
        <Button type="button" variant="ghost" className="min-h-11 px-2 text-xs" disabled={uploading || opening} onClick={() => inputRef.current?.click()}>Skift billede</Button>
      </div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {crop ? (
        <ImageCropDialog
          file={cropFile}
          hasOriginal={hasOriginal}
          shape={crop}
          outputSize={Math.min(maxDimension, 800)}
          onCancel={() => { if (!uploading) setCropFile(null); }}
          onDone={(blob) => {
            if (uploading) return;
            void uploadFile(new File([blob], "billede.webp", { type: "image/webp" }), true);
          }}
        />
      ) : null}
    </div>
  );
};

export default ImageUpload;
