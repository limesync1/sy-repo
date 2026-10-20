"""Byg den fælles, danske brugerguide. Kaldes fra build-planner-guide.mjs."""
import json
import subprocess
import sys
from html import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

DATA = json.load(open(sys.argv[1], encoding='utf-8'))
for name, query in [('DJ', 'DejaVu Sans'), ('DJB', 'DejaVu Sans:bold'), ('DJM', 'DejaVu Sans Mono')]:
    font = subprocess.check_output(['fc-match', '-f', '%{file}', query], text=True).strip()
    pdfmetrics.registerFont(TTFont(name, font))
pdfmetrics.registerFontFamily('DJ', normal='DJ', bold='DJB', italic='DJ', boldItalic='DJB')
NAVY = colors.HexColor('#0F172A')
TEAL = colors.HexColor('#0996A5')
BRIGHT = colors.HexColor('#0BB5C6')
MUTED = colors.HexColor('#475569')
LINE = colors.HexColor('#DEE7EC')
SOFT = colors.HexColor('#F1F7F8')
PW, PH = A4
M = 19 * mm
W = PW - 2 * M

def style(name, size=10, leading=15, font='DJ', color=NAVY, **kw):
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading, textColor=color, **kw)
BODY = style('body')
SMALL = style('small', 9, 13, color=MUTED)
TITLE = style('title', 14, 19, 'DJB', spaceAfter=7)
LABEL = style('label', 8, 12, 'DJB', TEAL, spaceAfter=7)
HERO = style('hero', 36, 44, 'DJB', colors.white)
LEAD = style('lead', 12, 19, color=colors.HexColor('#CBD5E1'))
CHIP = style('chip', 8, 12, 'DJM', TEAL)

def p(text, st=BODY):
    return Paragraph(escape(text), st)

def page(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, PW, PH, fill=1, stroke=0)
        canvas.setFillColor(BRIGHT)
        canvas.rect(M, PH - 31*mm, 25*mm, 3*mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor('#16283B'))
        canvas.circle(PW, 15*mm, 76*mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor('#CBD5E1'))
        canvas.setFont('DJ', 9)
        canvas.drawString(M, 19*mm, 'serviceydere.dk / software / funktioner')
    else:
        canvas.setFillColor(TEAL)
        canvas.rect(0, PH-2*mm, PW, 2*mm, fill=1, stroke=0)
        canvas.setFont('DJB', 8)
        canvas.setFillColor(NAVY)
        canvas.drawString(M, PH-13*mm, 'SERVICEYDERE')
        canvas.setFont('DJ', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(PW-M, PH-13*mm, 'Ruteplanlægger · Brugerguide')
        canvas.setStrokeColor(LINE)
        canvas.line(M, 17*mm, PW-M, 17*mm)
        canvas.drawString(M, 11*mm, 'Korte trin. Overblik over dagen.')
        canvas.drawRightString(PW-M, 11*mm, f'{doc.page:02d}')
    canvas.restoreState()

features = DATA['features']
groups = [(c, [f for f in features if f['category'] == c]) for c in DATA['categories']]
groups = [(c, fs) for c, fs in groups if fs]
# To hele kort pr. side. Faste sideskift giver ro og præcise indholdshenvisninger.
category_pages = {}
next_page = 3
for category, fs in groups:
    category_pages[category] = next_page
    next_page += (len(fs)+1)//2
flow = [Spacer(1, 39*mm), p('SERVICEYDERE / BRUGERGUIDE', style('brand', 10, 15, 'DJB', BRIGHT)),
        Spacer(1, 9*mm), p('Få ro på\nruteplanlægningen'.replace('\n', ' '), HERO), Spacer(1, 8*mm),
        p('Planlæg dagen. Fordel aftaler. Hjælp medarbejderne godt afsted.', LEAD), Spacer(1, 14*mm),
        p(f'{len(features)} funktioner  /  {len(groups)} områder', style('stats', 12, 19, 'DJB', BRIGHT)),
        Spacer(1, 7*mm), p('Den samme guide findes søgbart i appen. Brug indholdet på næste side til at finde det, du har brug for.', LEAD), PageBreak()]
flow += [p('FIND HURTIGT RUNDT', LABEL), p('Indhold', style('contents', 29, 36, 'DJB')), Spacer(1, 7*mm)]
for i, (category, fs) in enumerate(groups, 1):
    row = Table([[p(f'{i:02d}', LABEL), p(category, TITLE), p(str(category_pages[category]), TITLE)]], colWidths=[12*mm,W-26*mm,14*mm])
    row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.5,LINE),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    flow += [row]
flow += [Spacer(1, 10*mm), p('Sådan bruger du guiden', TITLE), p('Hvert kort forklarer én funktion. Læs først den korte forklaring. Følg derefter trinene. Eksemplet viser en hverdagssituation.'), Spacer(1,4*mm), p('Genveje står i lyse felter. Command bruges på Mac. Ctrl bruges på Windows. Genveje virker ikke, mens du skriver i et felt.', SMALL), PageBreak()]

def card(feature, number):
    content = [p(f'FUNKTION {number:02d}', LABEL), p(feature['title'], TITLE), p(feature['summary']), Spacer(1, 3*mm)]
    if feature.get('shortcut'):
        chip = Table([[p(feature['shortcut'], CHIP)]], colWidths=[W-12*mm])
        chip.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),SOFT),('BOX',(0,0),(-1,-1),.5,LINE),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        content += [chip, Spacer(1, 3*mm)]
    for i, text in enumerate(feature['steps'], 1):
        row = Table([[p(f'{i}.', LABEL), p(text)]], colWidths=[8*mm,W-20*mm])
        row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        content.append(row)
    content += [Spacer(1, 2*mm), p('EKSEMPEL', LABEL), p(feature['example'], SMALL)]
    box = Table([[content]], colWidths=[W])
    box.setStyle(TableStyle([('BOX',(0,0),(-1,-1),.7,LINE),('LINEBEFORE',(0,0),(0,0),3,TEAL),('BACKGROUND',(0,0),(-1,-1),colors.white),('LEFTPADDING',(0,0),(-1,-1),6*mm),('RIGHTPADDING',(0,0),(-1,-1),6*mm),('TOPPADDING',(0,0),(-1,-1),5*mm),('BOTTOMPADDING',(0,0),(-1,-1),5*mm)]))
    return box
number = 0
for gi, (category, fs) in enumerate(groups, 1):
    for offset in range(0, len(fs), 2):
        flow += [p(f'{gi:02d} / {category.upper()}', LABEL), p(category, style('section', 23, 29, 'DJB')), Spacer(1, 5*mm)]
        for feature in fs[offset:offset+2]:
            number += 1
            flow += [card(feature, number), Spacer(1, 5*mm)]
        if not (gi == len(groups) and offset+2 >= len(fs)):
            flow.append(PageBreak())
SimpleDocTemplate(sys.argv[2], pagesize=A4, leftMargin=M, rightMargin=M, topMargin=23*mm, bottomMargin=23*mm,
                  title='Brugerguide til ruteplanlæggeren – Serviceydere', author='Serviceydere').build(flow, onFirstPage=page, onLaterPages=page)
print(f'PDF skrevet: {sys.argv[2]}')
