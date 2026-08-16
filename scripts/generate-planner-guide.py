# Genererer PDF-brugerguiden til ruteplanlæggeren ud fra samme datakilde
# som den søgbare guide i appen (src/data/routePlannerFeatures.ts).
import json, subprocess, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, KeepTogether, Table, TableStyle, PageBreak)

DATA = json.load(open(sys.argv[1]))
OUT = sys.argv[2]

reg = lambda name, q: pdfmetrics.registerFont(TTFont(name, subprocess.check_output(["fc-match","-f","%{file}",q],text=True).strip()))
reg("DJ", "DejaVu Sans"); reg("DJB", "DejaVu Sans:bold")

INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
ACCENT = colors.HexColor("#0B8FA0")
LINE = colors.HexColor("#E2E8F0")
SOFT = colors.HexColor("#F1F5F9")

S = lambda **kw: ParagraphStyle(**kw)
h1 = S(name="h1", fontName="DJB", fontSize=26, leading=31, textColor=INK, spaceAfter=8)
h2 = S(name="h2", fontName="DJB", fontSize=14, leading=18, textColor=INK, spaceBefore=6, spaceAfter=8)
h3 = S(name="h3", fontName="DJB", fontSize=11.5, leading=15, textColor=INK, spaceAfter=3)
body = S(name="body", fontName="DJ", fontSize=9.5, leading=14, textColor=INK)
mut = S(name="mut", fontName="DJ", fontSize=9, leading=13, textColor=MUTED)
eyebrow = S(name="eyebrow", fontName="DJB", fontSize=8, leading=11, textColor=ACCENT)
lead = S(name="lead", fontName="DJ", fontSize=11, leading=16.5, textColor=MUTED, spaceAfter=6)
step = S(name="step", fontName="DJ", fontSize=9.5, leading=13.5, textColor=INK, leftIndent=12, firstLineIndent=-12, spaceAfter=2)

def on_page(canv, doc):
    canv.saveState()
    canv.setFont("DJ", 8); canv.setFillColor(MUTED)
    canv.drawString(20*mm, 12*mm, "Serviceydere · Brugerguide til ruteplanlæggeren")
    canv.drawRightString(A4[0]-20*mm, 12*mm, "Side %d" % canv.getPageNumber())
    canv.setStrokeColor(LINE); canv.setLineWidth(0.5)
    canv.line(20*mm, 15*mm, A4[0]-20*mm, 15*mm)
    canv.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4, title="Brugerguide til ruteplanlæggeren – Serviceydere",
                      author="Serviceydere", leftMargin=20*mm, rightMargin=20*mm,
                      topMargin=18*mm, bottomMargin=20*mm)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=on_page)])

W = doc.width
flow = []

# Forside
flow += [Spacer(1, 26*mm),
         Paragraph("SERVICEYDERE · SOFTWARE TIL SERVICEVIRKSOMHEDER", eyebrow),
         Spacer(1, 4*mm),
         Paragraph("Brugerguide til<br/>ruteplanlæggeren", h1),
         Spacer(1, 3*mm),
         Paragraph("De vigtigste funktioner forklaret med et konkret eksempel og korte trin. "
                   "Samme indhold findes søgbart på serviceydere.dk/software/funktioner.", lead),
         Spacer(1, 6*mm)]

cats = DATA["categories"]
feats = DATA["features"]
rows = [[Paragraph(f"<b>{c}</b>", body),
         Paragraph(", ".join(f["title"] for f in feats if f["category"] == c), mut)] for c in cats]
t = Table(rows, colWidths=[W*0.32, W*0.68])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("BACKGROUND", (0,0), (-1,-1), SOFT),
    ("BOX", (0,0), (-1,-1), 0.5, LINE),
    ("INNERGRID", (0,0), (-1,-1), 0.5, colors.white),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
flow += [Paragraph("Indhold", h2), t, PageBreak()]

for c in cats:
    items = [f for f in feats if f["category"] == c]
    if not items: continue
    for idx, f in enumerate(items):
        # Kategorioverskriften holdes sammen med sin første funktion, så den
        # aldrig bliver stående alene nederst på en side.
        block = [] if idx else [Paragraph(c.upper(), eyebrow), Spacer(1, 2*mm)]
        block += [Paragraph(f["title"], h3), Paragraph(f["summary"], mut), Spacer(1, 2.5*mm)]
        ex = Table([[Paragraph(f"<b>Eksempel:</b> {f['example']}", body)]], colWidths=[W])
        ex.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), SOFT),
            ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
            ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LINEBEFORE", (0,0), (0,-1), 2, ACCENT),
        ]))
        block += [ex, Spacer(1, 2.5*mm)]
        for i, s in enumerate(f["steps"], 1):
            block.append(Paragraph(f"{i}.&nbsp;&nbsp;{s}", step))
        if f.get("shortcut"):
            block += [Spacer(1, 1.5*mm), Paragraph(f"Genvej: {f['shortcut']}", mut)]
        block.append(Spacer(1, 6*mm))
        flow.append(KeepTogether(block))
    flow.append(Spacer(1, 2*mm))

flow += [PageBreak(), Paragraph("Kom videre", h2),
         Paragraph("Ruteplanlægning er inkluderet i basisprisen på 289 kr./md. ekskl. moms. "
                   "Der er 14 dages gratis prøve uden betalingskort og ingen binding. "
                   "Skal jeres eksisterende kunder flyttes ind, står Serviceyderes support for importen.", body),
         Spacer(1, 4*mm),
         Paragraph("Søgbar funktionsguide: serviceydere.dk/software/funktioner<br/>"
                   "Om ruteplanlæggeren: serviceydere.dk/software/ruteplanlaegger<br/>"
                   "Priser: serviceydere.dk/software/priser<br/>"
                   "Kontakt: serviceydere.dk/kontakt", mut)]

doc.build(flow)
print("wrote", OUT)
