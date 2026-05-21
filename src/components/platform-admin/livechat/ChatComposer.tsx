import { RefObject } from "react";
import { Zap, Sparkles, Loader2, Paperclip, Send, Image as ImageIcon, X as XIcon } from "lucide-react";
import type { CannedResponse } from "../livechat/CannedResponsesManager";

type Props = {
  visitorFirstName: string;
  canned: CannedResponse[];
  onInsertCanned: (c: CannedResponse) => void;
  onPreviewCanned: (c: CannedResponse | null) => void;
  onOpenCannedManager: () => void;
  onAiSuggest: () => void;
  aiBusy: boolean;
  aiError: string | null;

  draft: string;
  setDraft: (v: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;

  pendingImage: File | null;
  pendingImagePreview: string | null;
  onPickImage: (f: File) => void;
  onClearImage: () => void;
  uploadError: string | null;

  sending: boolean;
  onSend: () => void;
};

/** Hurtige-svar-bjælke + tekstarea + billede-vedhæftning. */
export default function ChatComposer({
  visitorFirstName, canned, onInsertCanned, onPreviewCanned, onOpenCannedManager,
  onAiSuggest, aiBusy, aiError,
  draft, setDraft, textareaRef, fileInputRef,
  pendingImage, pendingImagePreview, onPickImage, onClearImage, uploadError,
  sending, onSend,
}: Props) {
  return (
    <>
      {canned.length > 0 && (
        <div className="border-t border-border bg-card px-3 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <Zap className="h-3 w-3 flex-shrink-0 text-accent" />
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hurtige svar</span>
            {canned.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => onInsertCanned(c)}
                onMouseEnter={() => onPreviewCanned(c)}
                onMouseLeave={() => onPreviewCanned(null)}
                className="flex-shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-card"
                title={c.body}
              >
                {c.title}
                {c.category && <span className="ml-1 text-muted-foreground">·{c.category}</span>}
              </button>
            ))}
            <button onClick={onOpenCannedManager} className="flex-shrink-0 rounded-full border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground" title="Administrér">
              +
            </button>
            <button
              onClick={onAiSuggest}
              disabled={aiBusy}
              className="ml-auto flex flex-shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              title="Lad AI foreslå et svar baseret på samtalen"
            >
              {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI-forslag
            </button>
          </div>
          {aiError && <p className="mt-1 text-[10px] text-destructive">{aiError}</p>}
        </div>
      )}

      <div className="border-t border-border bg-card px-3 py-2.5">
        {pendingImagePreview && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
            <img src={pendingImagePreview} alt="" className="h-12 w-12 rounded object-cover" />
            <span className="flex-1 truncate text-[11px] text-muted-foreground">
              <ImageIcon className="mr-1 inline h-3 w-3" />{pendingImage?.name}
            </span>
            <button onClick={onClearImage} className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Fjern vedhæftet billede">
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        {uploadError && <p className="mb-1.5 text-[11px] text-destructive">{uploadError}</p>}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            aria-label="Vedhæft billede">
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <textarea
            ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            maxLength={2000} rows={1} placeholder={`Svar ${visitorFirstName}…`}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
          />
          <button onClick={onSend} disabled={sending || (!draft.trim() && !pendingImage)}
            aria-label="Send besked"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          Enter sender · Shift+Enter for ny linje · {"{name}"} erstattes automatisk · / søg · j/k navigér
        </p>
      </div>
    </>
  );
}