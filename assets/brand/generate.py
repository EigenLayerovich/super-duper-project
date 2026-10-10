# Generates the $DALA brand art as SVG: python3 generate.py logo|image|banner > file.svg
import math, sys
out = sys.argv[1]

def shanyrak(cx, cy, s, gold="url(#gold)", dark="#5a3a10"):
    """The yurt crown: a ring with crossed arched bars (kuldyreush) and roof poles (uyk) as sun rays."""
    p = []
    # Roof poles / sun rays.
    for i in range(32):
        a = 2 * math.pi * i / 32
        r1, r2 = 1.08 * s, (1.95 if i % 2 == 0 else 1.6) * s
        w = 0.07 * s
        x1, y1 = cx + r1 * math.cos(a), cy + r1 * math.sin(a)
        x2, y2 = cx + r2 * math.cos(a), cy + r2 * math.sin(a)
        nx, ny = -math.sin(a) * w, math.cos(a) * w
        p.append(f'<polygon points="{x1+nx:.1f},{y1+ny:.1f} {x2:.1f},{y2:.1f} {x1-nx:.1f},{y1-ny:.1f}" fill="{gold}" stroke="{dark}" stroke-width="{0.012*s:.1f}"/>')
    # Ring.
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{s}" fill="#0b4f73" stroke="{dark}" stroke-width="{0.2*s+6:.1f}"/>')
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{s}" fill="none" stroke="{gold}" stroke-width="{0.2*s:.1f}"/>')
    # Crossed arched bars, clipped to the ring.
    p.append(f'<clipPath id="sh{int(cx)}{int(cy)}"><circle cx="{cx}" cy="{cy}" r="{0.92*s:.1f}"/></clipPath>')
    p.append(f'<g clip-path="url(#sh{int(cx)}{int(cy)})" fill="none" stroke-linecap="round">')
    bars = []
    for rot in (0, 90):
        for off in (-0.42, 0, 0.42):
            x = cx + off * s
            bend = x + 0.28 * s * (1 if off > 0 else -1) if off else x
            bars.append((f'M{x:.1f},{cy - s:.1f} Q{bend:.1f},{cy:.1f} {x:.1f},{cy + s:.1f}', rot))
    # Every outline first, then every bar in gold, so the crossings read as woven gold.
    # Solid gold: a gradient stroke on the straight middle bar (zero-width bbox) would not render.
    for col, wd in ((dark, 0.16 * s + 0.05 * s), ("#f2c14e", 0.16 * s)):
        for d, rot in bars:
            p.append(f'<path d="{d}" stroke="{col}" stroke-width="{wd:.1f}" transform="rotate({rot} {cx} {cy})"/>')
    p.append('</g>')
    return "\n".join(p)

def horn(x, y, s, a, fill):
    """Koshkar-muiz (ram's horn): a symmetric pair of curls."""
    d = ("M0,14 C0,0 -6,-10 -18,-12 C-30,-14 -36,-2 -30,6 C-25,12 -17,8 -19,1 "
         "M0,14 C0,0 6,-10 18,-12 C30,-14 36,-2 30,6 C25,12 17,8 19,1")
    return (f'<path d="{d}" transform="translate({x:.1f},{y:.1f}) rotate({a:.1f}) scale({s})" '
            f'fill="none" stroke="{fill}" stroke-width="{5/s:.2f}" stroke-linecap="round"/>')

DEFS = '''<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#f2c14e"/><stop offset="1" stop-color="#b9781c"/>
  </linearGradient>
  <radialGradient id="sky" cx=".5" cy=".38" r=".65">
    <stop offset="0" stop-color="#39d0ec"/><stop offset=".7" stop-color="#0f8fbf"/><stop offset="1" stop-color="#0a5d86"/>
  </radialGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="steppe" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4aa8f0"/><stop offset=".62" stop-color="#bfe9ff"/><stop offset=".62" stop-color="#c7cf7a"/><stop offset="1" stop-color="#8f9c45"/>
  </linearGradient>
</defs>'''

def coin(cx, cy, R):
    p = [f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#4a2c08"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R*0.975:.1f}" fill="url(#gold)"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R*0.86:.1f}" fill="#7a4e12"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R*0.845:.1f}" fill="url(#sky)"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{R*0.6:.1f}" fill="url(#glow)"/>']
    n = 14
    for i in range(n):
        a = 360 * i / n
        r = R * 0.918
        x, y = cx + r * math.sin(math.radians(a)), cy - r * math.cos(math.radians(a))
        p.append(horn(x, y, R / 520, a, "#7a4e12"))
    p.append(shanyrak(cx, cy, R * 0.3))
    # Shine on the rim.
    p.append(f'<path d="M{cx-R*0.8:.1f},{cy-R*0.35:.1f} A{R*0.88:.1f},{R*0.88:.1f} 0 0 1 {cx-R*0.2:.1f},{cy-R*0.86:.1f}" '
             f'fill="none" stroke="#fffbe0" stroke-opacity=".55" stroke-width="{R*0.03:.1f}" stroke-linecap="round"/>')
    return "\n".join(p)

def yurt(x, base, s):
    return f'''<g transform="translate({x},{base}) scale({s})">
  <path d="M-46,0 V-40 Q0,-78 46,-40 V0 Z" fill="#f6f1e4" stroke="#2b1d33" stroke-width="5"/>
  <rect x="-44" y="-36" width="88" height="9" fill="#c23b3b"/>
  <path d="M-12,0 V-24 H12 V0" fill="#b23434" stroke="#2b1d33" stroke-width="4"/>
  <ellipse cx="0" cy="-60" rx="12" ry="4" fill="#8a5a32"/></g>'''

if out == "logo":
    print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{DEFS}{coin(512, 512, 500)}</svg>')
elif out == "image":
    W = H = 1024
    hills = "".join(f'<ellipse cx="{x}" cy="{740 + (x // 150 % 2) * 14}" rx="190" ry="70" fill="#a9b85c"/>' for x in range(-60, W + 120, 170))
    yurts = yurt(140, 790, 1.15) + yurt(895, 800, 1.0) + yurt(790, 815, 0.75)
    print(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{DEFS}
<rect width="{W}" height="{H}" fill="url(#steppe)"/>
<g fill="#ffffff" opacity=".9"><ellipse cx="170" cy="150" rx="90" ry="28"/><ellipse cx="220" cy="132" rx="60" ry="30"/>
<ellipse cx="860" cy="230" rx="100" ry="26"/><ellipse cx="820" cy="214" rx="56" ry="26"/></g>
<g fill="#7d8fb0"><path d="M520,640 L700,460 L880,640 Z"/><path d="M640,640 L860,420 L1080,640 Z"/></g>
<g fill="#fff"><path d="M670,490 L700,460 L730,490 Z"/><path d="M820,460 L860,420 L900,460 Z"/></g>
{hills}
<rect y="770" width="{W}" height="{H-770}" fill="#d8b878"/><rect y="764" width="{W}" height="12" fill="#9aae45"/>
{yurts}
{coin(512, 400, 300)}
<text x="512" y="905" text-anchor="middle" font-family="Inter, 'DejaVu Sans', sans-serif" font-weight="900" font-size="128"
  fill="#fff0a8" stroke="#4a2c08" stroke-width="14" paint-order="stroke" letter-spacing="6">$DALA</text>
<text x="512" y="975" text-anchor="middle" font-family="Inter, 'DejaVu Sans', sans-serif" font-weight="800" font-size="40"
  fill="#ffffff" stroke="#4a2c08" stroke-width="8" paint-order="stroke" letter-spacing="3">DALA BATYRS · SOLANA</text>
</svg>''')
elif out == "banner":
    # 1500x500 header for X / DEX listings. X's profile picture covers the bottom-left corner, so
    # nothing important lives there: text in the middle, the coin on the right.
    W, H = 1500, 500
    hills = "".join(f'<ellipse cx="{x}" cy="{388 + (x // 160 % 2) * 12}" rx="200" ry="60" fill="#a9b85c"/>' for x in range(-60, W + 160, 180))
    peaks = "".join(
        f'<path d="M{x-150},{330} L{x},{330-h} L{x+150},{330} Z" fill="#7d8fb0"/>'
        f'<path d="M{x-h*0.22:.0f},{330-h*0.78:.0f} L{x},{330-h} L{x+h*0.22:.0f},{330-h*0.78:.0f} Z" fill="#fff"/>'
        for x, h in ((80, 170), (260, 210), (430, 150)))
    yurts = yurt(330, 446, 0.9) + yurt(455, 452, 0.65) + yurt(900, 452, 0.75) + yurt(1440, 446, 0.85)
    font = "font-family=\"Inter, 'DejaVu Sans', sans-serif\""
    print(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{DEFS}
<linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9de8"/><stop offset="1" stop-color="#c4ebff"/></linearGradient>
<rect width="{W}" height="{H}" fill="url(#bsky)"/>
<g fill="#ffffff" opacity=".9"><ellipse cx="560" cy="70" rx="80" ry="22"/><ellipse cx="600" cy="56" rx="50" ry="24"/>
<ellipse cx="960" cy="110" rx="90" ry="22"/><ellipse cx="925" cy="96" rx="48" ry="22"/></g>
{peaks}
{hills}
<rect y="410" width="{W}" height="{H-410}" fill="#d8b878"/><rect y="404" width="{W}" height="12" fill="#9aae45"/>
{yurts}
{coin(1240, 245, 195)}
<text x="640" y="215" text-anchor="middle" {font} font-weight="900" font-size="150"
  fill="#fff0a8" stroke="#4a2c08" stroke-width="16" paint-order="stroke" letter-spacing="6">$DALA</text>
<text x="640" y="285" text-anchor="middle" {font} font-weight="800" font-size="40"
  fill="#ffffff" stroke="#4a2c08" stroke-width="8" paint-order="stroke" letter-spacing="2">DALA BATYRS · STEPPE LEGENDS</text>
<text x="640" y="335" text-anchor="middle" {font} font-weight="700" font-size="28"
  fill="#ffffff" stroke="#4a2c08" stroke-width="6" paint-order="stroke" letter-spacing="2">IDLE GAME ON SOLANA · IDOSGAMES.COM</text>
</svg>''')
