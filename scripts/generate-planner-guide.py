# Genererer PDF-brugerguiden ud fra samme datakilde som den søgbare guide i
# appen (src/data/routePlannerFeatures.ts). Kør aldrig manuelt — den bygges
# automatisk af scripts/build-planner-guide.mjs (predev/prebuild + dev-watch).
import json, subprocess, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, KeepTogether, Table, TableStyle, PageBreak,
                                NextPageTemplate, Flowable)

DATA = json.load(open(sys.argv[1]))
OUT = sys.argv[2]

reg = lambda name, q: pdfmetrics.registerFont(TTFont(name, subprocess.check_output(["fc-match","-f","%{file}",q],text=True).strip()))
reg("DJ", "DejaVu Sans"); reg("DJB", "DejaVu Sans:bold"); reg("DJM", "DejaVu Sans Mono")

INK    = colors.HexColor("#0F172A")
MUTED  = colors.HexColor("#64748B")
ACCENT = colors.HexColor("#0B8FA0")
LINE   = colors.HexColor("#E2E8F0")
SOFT   = colors.HexColor("#F6F8FA")
PAPER  = colors.HexColor("#FFFFFF")

S = lambda **kw: ParagraphStyle(**kw)
h1      = S(name="h1", fontName="DJB", fontSize=30, leading=35, textColor=PAPER, spaceAfter=8)
h2      = S(name="h2", fontName="DJB", fontSize=15, leading=19, textColor=INK, spaceAfter=8)
h3      = S(name="h3", fontName="DJB", fontSize=11.5, leading=15, textColor=INK, spaceAfter=2)
body    = S(name="body", fontName="DJ", fontSize=9.5, leading=14, textColor=INK)
mut     = S(name="mut", fontName="DJ", fontSize=9, leading=13.5, textColor=MUTED)
eyebrow = S(name="eyebrow", fontName="DJB", fontSize=8, leading=11, textColor=ACCENT)
eyebrow_light = S(name="eyebrowl", fontName="DJB", fontSize=8.5, leading=12, textColor=colors.HexColor("#7FD8E3"))
lead    = S(name="lead", fontName="DJ", fontSize=11.5, leading=17, textColor=colors.HexColor("#CBD5E1"))
step    = S(name="step", fontName="DJ", fontSize=9.5, leading=13.5, textColor=INK,
            leftIndent=14, firstLineIndent=-14, spaceAfter=1.5)
kbd     = S(name="kbd", fontName="DJM", fontSize=8.5, leading=12, textColor=INK)

PW, PH = A4
M = 20*mm


class Rule(Flowable):
    """Tynd vandret streg i fuld tekstbredde."""
    def __init__(self, w, color=LINE, thickness=0.6):
        super().__init__(); self.w, self.color, self.thickness = w, color, thickness
    def wrap(self, *a): return (self.w, self.thickness + 2)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 1, self.w, 1)


def cover_page(canv, doc):
    canv.saveState()
    canv.setFillColor(INK); canv.rect(0, 0, PW, PH, stroke=0, fill=1)
    canv.setFillColor(ACCENT); canv.rect(0, PH-8*mm, PW, 8*mm, stroke=0, fill=1)
    canv.setFillColor(colors.HexColor("#132033"))
    canv.circle(PW+10*mm, 40*mm, 70*mm, stroke=0, fill=1)
    canv.setFont("DJ", 8); canv.setFillColor(colors.HexColor("#7C8DA5"))
    canv.drawString(M, 16*mm, "serviceydere.dk/software/funktioner")
    canv.restoreState()


def inner_page(canv, doc):
    canv.saveState()
    canv.setFillColor(ACCENT); canv.rect(0, PH-3*mm, PW, 3*mm, stroke=0, fill=1)
    canv.setFont("DJ", 8); canv.setFillColor(MUTED)
    canv.drawString(M, 12*mm, "Serviceydere · Brugerguide til ruteplanlæggeren")
    canv.drawRightString(PW-M, 12*mm, "Side %d" % (canv.getPageNumber() - 1))
    canv.setStrokeColor(LINE); canv.setLineWidth(0.5)
    canv.line(M, 15.5*mm, PW-M, 15.5*mm)
    canv.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4,
                      title="Brugerguide til ruteplanlæggeren – Serviceydere",
                      author="Serviceydere", subject="Funktioner i Serviceyderes ruteplanlægger",
                      leftMargin=M, rightMargin=M, topMargin=20*mm, bottomMargin=22*mm)
W = doc.width
cover_frame = Frame(M, 22*mm, W, PH-44*mm, id="cover")
inner_frame = Frame(M, doc.bottomMargin, W, PH - doc.bottomMargin - 20*mm, id="inner")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[cover_frame], onPage=cover_page),
    PageTemplate(id="inner", frames=[inner_frame], onPage=inner_page),
])

cats = DATA["categories"]
feats = DATA["features"]
flow = []

# ---------- Forside ----------
flow += [NextPageTemplate("inner"),
         Spacer(1, 46*mm),
         Paragraph("SERVICEYDERE · SOFTWARE TIL SERVICEVIRKSOMHEDER", eyebrow_light),
         Spacer(1, 5*mm),
         Paragraph("Brugerguide til<br/>ruteplanlæggeren", h1),
         Spacer(1, 4*mm),
         Paragraph("Alle funktioner forklaret med et konkret eksempel og korte trin. "
                   "Samme indhold findes søgbart på serviceydere.dk/software/funktioner.", lead),
         Spacer(1, 10*mm)]

meta = Table([[Paragraph(f"<font color='#7FD8E3'>{len(feats)}</font>  funktioner", 
                         S(name="m1", fontName="DJB", fontSize=11, textColor=PAPER)),
               Paragraph(f"<font color='#7FD8E3'>{len(cats)}</font>  områder",
                         S(name="m2", fontName="DJB", fontSize=11, textColor=PAPER))]],
             colWidths=[W*0.5, W*0.5])
meta.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0), ("TOPPADDING",(0,0),(-1,-1),0)]))
flow += [meta, PageBreak()]

# ---------- Indhold ----------
flow += [Paragraph("INDHOLD", eyebrow), Spacer(1, 2*mm),
         Paragraph("Sådan er guiden bygget op", h2)]
rows = []
for c in cats:
    titles = [f["title"] for f in feats if f["category"] == c]
    rows.append([Paragraph(f"<b>{c}</b>", body),
                 Paragraph(" · ".join(titles), mut)])
t = Table(rows, colWidths=[W*0.30, W*0.70])
style = [("VALIGN", (0,0), (-1,-1), "TOP"),
         ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
         ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
         ("LINEBELOW", (0,0), (-1,-2), 0.5, LINE),
         ("BOX", (0,0), (-1,-1), 0.6, LINE),
         ("BACKGROUND", (0,0), (-1,-1), SOFT)]
t.setStyle(TableStyle(style))
flow += [t, Spacer(1, 6*mm)]

shortcuts = [f for f in feats if f.get("shortcut")]
if shortcuts:
    flow += [Paragraph("Genveje i overblik", h2)]
    sc_rows, row = [], []
    for f in shortcuts:
        row.append(Paragraph(f"<font name='DJM'>{f['shortcut']}</font>  {f['title']}", body))
        if len(row) == 2:
            sc_rows.append(row); row = []
    if row:
        row.append(Paragraph("", body)); sc_rows.append(row)
    st = Table(sc_rows, colWidths=[W*0.5, W*0.5])
    st.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    flow += [st]
flow += [PageBreak()]

# ---------- Funktioner ----------
for c in cats:
    items = [f for f in feats if f["category"] == c]
    if not items:
        continue
    for idx, f in enumerate(items):
        block = []
        if idx == 0:
            head = Table([[Paragraph(c.upper(), S(name="cat", fontName="DJB", fontSize=9,
                                                  leading=12, textColor=PAPER))]], colWidths=[W])
            head.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), INK),
                ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
                ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ]))
            block += [head, Spacer(1, 4*mm)]

        title_bits = f["title"]
        if f.get("shortcut"):
            title_bits += f"   <font name='DJM' size='8.5' color='#0B8FA0'>{f['shortcut']}</font>"
        block += [Paragraph(title_bits, h3),
                  Paragraph(f["summary"], mut),
                  Spacer(1, 2.5*mm)]

        ex = Table([[Paragraph(f"<b>Eksempel</b><br/>{f['example']}", body)]], colWidths=[W])
        ex.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), SOFT),
            ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LINEBEFORE", (0,0), (0,-1), 2.2, ACCENT),
        ]))
        block += [ex, Spacer(1, 3*mm),
                  Paragraph("Sådan gør du", S(name="sg", fontName="DJB", fontSize=8.5,
                                              leading=11, textColor=MUTED)),
                  Spacer(1, 1.5*mm)]
        for i, s in enumerate(f["steps"], 1):
            block.append(Paragraph(f"<font color='#0B8FA0'><b>{i}</b></font>&nbsp;&nbsp;&nbsp;{s}", step))
        block += [Spacer(1, 4*mm), Rule(W), Spacer(1, 4*mm)]
        flow.append(KeepTogether(block))

# ---------- Afslutning ----------
flow += [PageBreak(), Paragraph("KOM VIDERE", eyebrow), Spacer(1, 2*mm),
         Paragraph("Prøv det med jeres egne kunder", h2),
         Paragraph("Ruteplanlægning er inkluderet i basisprisen på 289 kr./md. ekskl. moms. "
                   "Der er 14 dages gratis prøve uden betalingskort og ingen binding. "
                   "Skal jeres eksisterende kunder flyttes ind, står Serviceyderes support for importen.", body),
         Spacer(1, 5*mm)]
links = Table([[Paragraph("<b>Søgbar funktionsguide</b><br/>serviceydere.dk/software/funktioner", body),
                Paragraph("<b>Om ruteplanlæggeren</b><br/>serviceydere.dk/software/ruteplanlaegger", body)],
               [Paragraph("<b>Priser</b><br/>serviceydere.dk/software/priser", body),
                Paragraph("<b>Kontakt og support</b><br/>serviceydere.dk/kontakt", body)]],
              colWidths=[W*0.5, W*0.5])
links.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("BACKGROUND", (0,0), (-1,-1), SOFT),
    ("BOX", (0,0), (-1,-1), 0.6, LINE),
    ("INNERGRID", (0,0), (-1,-1), 0.6, colors.white),
    ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
flow += [links]

doc.build(flow)
print("wrote", OUT)
