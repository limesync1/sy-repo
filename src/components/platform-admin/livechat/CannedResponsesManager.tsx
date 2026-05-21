import { useMemo } from "react";
import { Zap, X, Tag, Eye, Trash2, Plus } from "lucide-react";

export type CannedResponse = { id: string; title: string; body: string; category: string };

const DEFAULT_CATEGORIES = ["Velkomst", "Pris", "Support", "Opfølgning", "Afslutning"];

type Props = {
  canned: CannedResponse[];
  cannedFilter: string;
  setCannedFilter: (v: string) => void;
  previewCanned: CannedResponse | null;
  setPreviewCanned: (c: CannedResponse | null) => void;
  editingCanned: CannedResponse | null;
  newCannedTitle: string;
  setNewCannedTitle: (v: string) => void;
  newCannedCategory: string;
  setNewCannedCategory: (v: string) => void;
  newCannedBody: string;
  setNewCannedBody: (v: string) => void;
  onUpsert: () => void;
  onStartEdit: (c: CannedResponse) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  activeVisitorFirstName: string | null;
};

const CannedResponsesManager = (props: Props) => {
  const {
    canned, cannedFilter, setCannedFilter, previewCanned, setPreviewCanned,
    editingCanned, newCannedTitle, setNewCannedTitle, newCannedCategory, setNewCannedCategory,
    newCannedBody, setNewCannedBody, onUpsert, onStartEdit, onCancelEdit, onDelete, onClose,
    activeVisitorFirstName,
  } = props;

  const cannedCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    canned.forEach((c) => c.category && set.add(c.category));
    return ["Alle", ...Array.from(set)];
  }, [canned]);

  const cannedVisible = useMemo(
    () => canned.filter((c) => cannedFilter === "Alle" || c.category === cannedFilter),
    [canned, cannedFilter],
  );

  const previewBody = useMemo(() => {
    if (!previewCanned) return "";
    const firstName = activeVisitorFirstName || "Kunde";
    return previewCanned.body.split("{name}").join(firstName);
  }, [previewCanned, activeVisitorFirstName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Hurtige svar — administrer</h3></div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_320px]">
          <div className="flex flex-col overflow-hidden">
            <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
              {cannedCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCannedFilter(cat)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    cannedFilter === cat ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" /> {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {cannedVisible.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Ingen svar i kategorien "{cannedFilter}".</p>
              )}
              {cannedVisible.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                    previewCanned?.id === c.id ? "border-foreground bg-secondary" : "border-border bg-secondary/40 hover:bg-secondary/70"
                  }`}
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewCanned(c)}>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{c.title}</p>
                      {c.category && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">{c.category}</span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] text-muted-foreground">{c.body}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setPreviewCanned(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground" title="Forhåndsvis">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onStartEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground" title="Rediger">
                      ✎
                    </button>
                    <button onClick={() => onDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Slet">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {editingCanned ? "Rediger svar" : "Tilføj nyt svar"} — brug {"{name}"} som pladsholder
                </p>
                {editingCanned && (
                  <button onClick={onCancelEdit} className="text-[10px] text-muted-foreground hover:text-foreground">Annullér</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newCannedTitle} onChange={(e) => setNewCannedTitle(e.target.value)} placeholder="Titel (fx 'Pris')" maxLength={60}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
                <select value={newCannedCategory} onChange={(e) => setNewCannedCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground">
                  {DEFAULT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <textarea value={newCannedBody} onChange={(e) => setNewCannedBody(e.target.value)} placeholder="Tekst til svaret…" rows={3} maxLength={1000}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
              <button onClick={onUpsert} disabled={!newCannedTitle.trim() || !newCannedBody.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> {editingCanned ? "Gem ændringer" : "Tilføj svar"}
              </button>
            </div>
          </div>

          <div className="hidden flex-col border-l border-border bg-secondary/20 md:flex">
            <div className="border-b border-border px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Eye className="h-3 w-3" /> Forhåndsvisning
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!previewCanned ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Vælg et svar for at se hvordan det ser ud.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Titel</p>
                    <p className="text-sm font-semibold text-foreground">{previewCanned.title}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kategori</p>
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">{previewCanned.category}</span>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sådan ser det ud</p>
                    <div className="overflow-hidden rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-[13px] text-background shadow-sm">
                      <div className="whitespace-pre-wrap break-words">{previewBody}</div>
                    </div>
                    {!activeVisitorFirstName && (
                      <p className="mt-2 text-[10px] text-muted-foreground">Åbn en samtale for at se svaret med kundens navn.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CannedResponsesManager;
