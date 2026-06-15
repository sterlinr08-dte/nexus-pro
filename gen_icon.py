#!/usr/bin/env python3
"""Genera el icono de la app NEXUS PRO: escudo hexagonal azul cristalino con la N."""
from PIL import Image, ImageDraw, ImageFilter

SS = 4
S = 512 * SS  # master a alta resolucion

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def vgrad(size, top, bot):
    g = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(g)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(top, bot, y / (size - 1)))
    return g

# ---- fondo: gradiente azul diagonal + brillo superior ----
img = vgrad(S, (74, 144, 248), (24, 49, 96)).convert('RGBA')  # #4a90f8 -> #183160
# brillo radial arriba (cristalino)
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([S*0.02, -S*0.45, S*0.98, S*0.55], fill=(255, 255, 255, 60))
glow = glow.filter(ImageFilter.GaussianBlur(S*0.05))
img = Image.alpha_composite(img, glow)

cx, cy = S/2, S*0.50
w, h = S*0.54, S*0.64
pts = [
    (cx - w/2, cy - h*0.30),
    (cx,        cy - h*0.50),
    (cx + w/2, cy - h*0.30),
    (cx + w/2, cy + h*0.10),
    (cx,        cy + h*0.50),
    (cx - w/2, cy + h*0.10),
]

# ---- sombra del escudo (profundidad) ----
sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(sh).polygon([(x, y + S*0.02) for (x, y) in pts], fill=(8, 20, 50, 150))
sh = sh.filter(ImageFilter.GaussianBlur(S*0.025))
img = Image.alpha_composite(img, sh)

# ---- escudo cristalino (gradiente claro->profundo) ----
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).polygon(pts, fill=255)
shield = vgrad(S, (110, 175, 255), (29, 78, 216)).convert('RGBA')  # #6eafff -> #1d4ed8
img.paste(shield, (0, 0), mask)

# brillo de vidrio en la mitad superior del escudo
gloss = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(gloss).ellipse([cx - w*0.46, cy - h*0.52, cx + w*0.46, cy + h*0.02],
                              fill=(255, 255, 255, 90))
gloss = gloss.filter(ImageFilter.GaussianBlur(S*0.02))
gm = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gm.paste(gloss, (0, 0), mask)
img = Image.alpha_composite(img, gm)

# borde blanco del escudo
ImageDraw.Draw(img).polygon(pts, outline=(255, 255, 255, 235), width=int(S*0.011))

# ---- la "N" en blanco ----
d = ImageDraw.Draw(img)
nw = int(S*0.052)
nx0, nx1 = cx - S*0.115, cx + S*0.115
ny0, ny1 = cy - S*0.155, cy + S*0.155
white = (255, 255, 255, 255)
for seg in [((nx0, ny1), (nx0, ny0)), ((nx0, ny0), (nx1, ny1)), ((nx1, ny1), (nx1, ny0))]:
    d.line([seg[0], seg[1]], fill=white, width=nw)
# remates redondeados en las uniones
for (px, py) in [(nx0, ny0), (nx0, ny1), (nx1, ny0), (nx1, ny1)]:
    r = nw/2
    d.ellipse([px - r, py - r, px + r, py + r], fill=white)

# ---- exportar a todos los tamanos ----
sizes = {
    'icon-512.png': 512, 'icon-512 (1).png': 512, 'icon-192.png': 192,
    'icon-apple-180.png': 180, 'icon-apple-152.png': 152, 'icon-apple-120.png': 120,
    'icon-apple-76.png': 76, 'icon-32.png': 32, 'icon-16.png': 16,
}
for name, sz in sizes.items():
    img.resize((sz, sz), Image.LANCZOS).convert('RGB').save(name)
    print('escrito', name, sz)
print('OK')
