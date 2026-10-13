#!/usr/bin/env python3
"""Нүүр хуудасны мокапыг (home/index.html) pi.mnv2 web руу хөрвүүлнэ.

    python3 docs/v2/hero/port_home.py

Мокап бол эх. Мокапыг засаад энэ скриптийг дахин ажиллуулбал web/src/components/home/
доторх 4 файл шинэчлэгдэнэ (гараар бүү зас):
  home.css   — мокапын CSS, бүх сонгогч `.sie` дотор хаалттай (апптай мөргөлдөхгүй)
  markup.ts  — <body>-ийн HTML (волейболын хэсэггүй)
  dom.ts     — гүйлгэлт, цэс, сувгууд, «Он оноор» — mountDom(root) → цэвэрлэгч
  three.ts   — hero, лаборатори, бөөмс, дэлхий (three.js) — mountThree(root) → цэвэрлэгч
CDN огт үлдэхгүй: three/lenis/lucide/katex npm-ээс, зураг/хил/бүтэц web/public/home-оос.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'home', 'index.html')
OUT = os.path.join(HERE, '..', '..', '..', 'web', 'src', 'components', 'home')
html = open(SRC, encoding='utf-8').read()
HEADER = '// ⚠️ АВТОМАТААР ҮҮСГЭСЭН — docs/v2/hero/port_home.py. Гараар бүү зас, мокапаа засаад дахин ажиллуул.\n'


def sub1(s, old, new, count=1):
    """Яг тэр мөрийг олж солино; олдохгүй бол алдаа (мокап өөрчлөгдсөнийг илрүүлнэ)."""
    n = s.count(old)
    if n == 0 or (count and n != count):
        raise SystemExit(f'Олдсонгүй эсвэл {n} удаа: {old[:80]!r}')
    return s.replace(old, new)


def between(s, a, b):
    i = s.index(a) + len(a)
    return s[i:s.index(b, i)]


def cut(s, a, b):
    """a-аас b хүртэл (b-г үлдээнэ) хасна."""
    i = s.index(a)
    j = s.index(b, i)
    return s[:i] + s[j:]


# ---------------------------------------------------------------- CSS
css = between(html, '<style>', '</style>')
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def scope_sel(sel):
    out = []
    for p in sel.split(','):
        p = p.strip()
        if not p:
            continue
        if p.startswith('html.lenis') or p.startswith('.lenis'):
            out.append(p)
        elif p in (':root', 'html', 'body'):
            out.append('.sie')
        elif p.startswith('body'):
            out.append('.sie' + p[4:])
        elif p == '*':
            out += ['.sie', '.sie *']
        else:
            out.append('.sie ' + p)
    return ','.join(out)


def parse(s, i=0, depth=0):
    """Блок бүрийг уншиж сонгогчийг хаана. (s, i) → (гаралт, i)"""
    res = []
    while i < len(s):
        if s[i] == '}':
            return ''.join(res), i + 1
        j = s.find('{', i)
        k = s.find('}', i)
        if j == -1 or (k != -1 and k < j):
            res.append(s[i:k] if k != -1 else s[i:])
            if k == -1:
                break
            return ''.join(res), k + 1
        pre = s[i:j].strip()
        if pre.startswith('@keyframes'):
            name = pre.split()[1]
            d = 1
            m = j + 1
            while d:
                d += {'{': 1, '}': -1}.get(s[m], 0)
                m += 1
            res.append(f'@keyframes sie-{name}' + s[j:m])
            i = m
        elif pre.startswith('@'):
            inner, i = parse(s, j + 1, depth + 1)
            if inner.strip():
                res.append(pre + '{' + inner + '}')
        else:
            k = s.index('}', j)
            body = s[j + 1:k]
            i = k + 1
            sels = [p.strip() for p in pre.split(',')]
            if all(p.startswith('.club') for p in sels):
                continue  # волейболын хэсэг ороогүй
            res.append(scope_sel(pre) + '{' + body + '}')
        res.append('\n' if depth == 0 else '')
    return ''.join(res), i


css_out, _ = parse(css)
css_out = re.sub(r'animation:mq\b', 'animation:sie-mq', css_out)
css_out = ('/* ⚠️ АВТОМАТААР ҮҮСГЭСЭН — docs/v2/hero/port_home.py. Гараар бүү зас. */\n'
           'body:has(.sie){background:#0B1834}\n'
           '.sie{min-height:100vh}\n' + css_out)

# ---------------------------------------------------------------- MARKUP
body = between(html, '<body>', '<script type="importmap">').strip()
body = cut(body, '<!-- 10. Хамт олон', '<!-- 11.')
for a, b in [('src="logo-white.png"', 'src="/home/logo-white.png"'),
             ('src="logo-navy.png"', 'src="/home/logo-navy.png"'),
             ('src="mark-white.png"', 'src="/home/mark-white.png"')]:
    body = body.replace(a, b)
body = sub1(body, '<a class="btn" href="#">Нэвтрэх', '<a class="btn" href="/login">Нэвтрэх')
body = sub1(body, '<a class="tlink" href="#">Бүртгүүлэх</a>', '<a class="tlink" href="/register">Бүртгүүлэх</a>')
body = sub1(body, '<a class="btn ink" href="#">Номоос бодож үзэх', '<a class="btn ink" href="/preview">Номоос бодож үзэх')
body = sub1(body, '<a class="tlink" href="#">Төлбөр</a>', '<a class="tlink" href="#plan">Төлбөр</a>')
# Мокапад «Нэвтрэх/Бүртгүүлэх» нь hero-гийн карт руу гүйлгэдэг — жинхэнэ вэбд шууд хуудас руу
body = sub1(body, '<a class="btn sm cta" href="#enter">Нэвтрэх', '<a class="btn sm cta" href="/login">Нэвтрэх')
body = sub1(body, '<a class="go" href="#enter" aria-label="Нэвтрэх">', '<a class="go" href="/login" aria-label="Нэвтрэх">')
body = sub1(body, '<a class="btn" href="#enter">Бүртгүүлэх', '<a class="btn" href="/register">Бүртгүүлэх')
body = sub1(body, '<a href="#enter">Нэвтрэх', '<a href="/login">Нэвтрэх')
body = sub1(body, '<span>Нэвтрэх, Бүртгүүлэх</span>', '<a href="/login">Нэвтрэх</a><a href="/register">Бүртгүүлэх</a>')
body = sub1(body, '<a class="it" href="#foot"><small>07</small>Тусламж</a>', '<a class="it" href="/help"><small>07</small>Тусламж</a>')
if 'href="#enter"' in body:
    raise SystemExit('href="#enter" үлдлээ')
if re.search(r'href="#"', body):
    raise SystemExit('Хоосон href="#" үлдлээ')
open(os.path.join(OUT, 'markup.ts'), 'w', encoding='utf-8').write(
    HEADER + 'export const MARKUP = ' + json.dumps(body, ensure_ascii=False) + ';\n')

# ---------------------------------------------------------------- DOM
dom = between(html, '<script>\nconst $=', '</script>')
dom = 'const $=' + dom
dom = sub1(dom, 'const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];',
           'const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];')
dom = dom.replace('window.katex', 'katex')
dom = sub1(dom, "if(window.Lenis && !RM){", "if(!RM){")
dom = sub1(dom, "const id=a.getAttribute('href'); if(id.length<2) return;",
           "const id=a.getAttribute('href'); if(id.length<2||id[0]!=='#') return;")
dom = sub1(dom, "fetch('amjilt/index.json')", "fetch('/amjilt/index.json')")
dom = sub1(dom, "fetch('amjilt/'+y+'.json')", "fetch('/amjilt/'+y+'.json')")
dom = sub1(dom, "img:'100x100-front.jpg'", "img:'/home/100x100-front.jpg'")
dom = sub1(dom, "club:$('#club'),", "")
dom = sub1(dom, "const clubNums=$$('.club .cs b'), logoFix=$('#logoFix');", "const logoFix=$('#logoFix');")
dom = cut(dom, '  /* 10. Хамт олон */', '  /* 11. Өлгөөтэй')
dom = sub1(dom, 'function frame(now){\n', 'function frame(now){\n  if(dead) return;\n')
dom = dom.replace('requestAnimationFrame(frame);', 'rafId=requestAnimationFrame(frame);')
dom = sub1(dom, 'setInterval(tickClock,15000);', 'const clockTimer=setInterval(tickClock,15000);')
dom = sub1(dom, "new IntersectionObserver((e,o)=>{ if(e[0].isIntersecting){ $('#pol').classList.add('in'); o.disconnect(); } },{threshold:.25}).observe($('#pol'));",
           "const polIO=new IntersectionObserver((e,o)=>{ if(e[0].isIntersecting){ $('#pol').classList.add('in'); o.disconnect(); } },{threshold:.25}); polIO.observe($('#pol'));")
dom = sub1(dom, "addEventListener('DOMContentLoaded',()=>{\n  lucide.createIcons({attrs:{'stroke-width':1.75}});",
           "(()=>{\n  createIcons({icons:ICONS,attrs:{'stroke-width':1.75}});")
dom = sub1(dom, "requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('ready')));\n});",
           "requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')));\n})();")
dom = sub1(dom, "document.body.classList.toggle('past',past);", "root.classList.toggle('past',past);")
if 'document.body' in dom:
    raise SystemExit('dom.ts-д document.body үлдлээ (root руу шилжүүл)')
dom = re.sub(r'(?<![.\w])addEventListener\(', 'on(window,', dom)
icons = sorted(set(re.findall(r'data-lucide="([a-z-]+)"', html)))
pascal = [''.join(w.capitalize() for w in n.split('-')) for n in icons]
dom_ts = (HEADER + '/* eslint-disable */\n// @ts-nocheck\n'
          "import katex from 'katex';\nimport Lenis from 'lenis';\n"
          f"import {{ createIcons, {', '.join(pascal)} }} from 'lucide';\n\n"
          f"const ICONS = {{ {', '.join(pascal)} }};\n\n"
          'export function mountDom(root) {\n'
          '  let dead = false, rafId = 0;\n'
          '  const offs = [];\n'
          '  const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); offs.push(() => t.removeEventListener(ev, f, o)); };\n'
          + dom +
          '\n  return () => {\n'
          '    dead = true; cancelAnimationFrame(rafId); clearInterval(clockTimer); polIO.disconnect();\n'
          '    offs.forEach((f) => f()); if (lenis) lenis.destroy();\n'
          '    delete window.S; delete window.LAB; delete window.labPick; delete window.__W;\n'
          '  };\n}\n')
open(os.path.join(OUT, 'dom.ts'), 'w', encoding='utf-8').write(dom_ts)

# ---------------------------------------------------------------- THREE
three = between(html, '<script type="module">', '</script>')
three = three[three.index("const $=s=>document.querySelector(s);"):]
three = sub1(three, "const $=s=>document.querySelector(s);", "const $=s=>root.querySelector(s);")
three = three.replace('window.katex', 'katex')
three = sub1(three, "const IMG='https://cdn.jsdelivr.net/npm/three-globe/example/img/';", "const IMG='/home/';")
three = sub1(three, "TL.load(IMG+'earth-blue-marble.jpg',", "TL.load(IMG+(MOBILE?'earth-blue-marble-2k.webp':'earth-blue-marble.webp'),")
three = sub1(three, "TL.load(IMG+'earth-topology.png',", "TL.load(IMG+'earth-topology.webp',")
three = sub1(three,
             "const [topo,world]=await Promise.all([import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'),fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json').then(r=>r.json())]);\n"
             "    const f=topo.feature(world,world.objects.countries).features.find(f=>String(f.id)==='496'||(f.properties&&f.properties.name==='Mongolia'));\n"
             "    if(!f) throw new Error('Монгол олдсонгүй');\n"
             "    drawMongolia(f.geometry); mnState=2;",
             "const geom=await fetch('/home/mongolia.json').then(r=>{ if(!r.ok) throw new Error(String(r.status)); return r.json(); });\n"
             "    if(dead) return; drawMongolia(geom); mnState=2;")
three = cut(three, '/* =========================================================\n   ВОЛЕЙБОЛ',
            '/* =========================================================\n   Нэг кадр')
three = cut(three, '  /* ---- ВОЛЕЙБОЛ ---- */', '};\napplySolid')
three = re.sub(r'(?<![.\w])addEventListener\(', 'on(window,', three)
if 'http' in re.sub(r'https://www\.google', '', three) or 'Room' in three or 'ball' in three.lower():
    raise SystemExit('three.ts-д CDN эсвэл волейбол үлдлээ')
three_ts = (HEADER + '/* eslint-disable */\n// @ts-nocheck\n'
            "import katex from 'katex';\n"
            "import * as THREE from 'three';\n"
            "import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';\n"
            "import { Line2 } from 'three/examples/jsm/lines/Line2.js';\n"
            "import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';\n"
            "import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';\n"
            "import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';\n"
            "import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';\n"
            "import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';\n\n"
            'export function mountThree(root) {\n'
            '  let dead = false;\n'
            '  const offs = [];\n'
            '  const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); offs.push(() => t.removeEventListener(ev, f, o)); };\n'
            + three +
            '\n  return () => {\n'
            '    dead = true; delete window.__three; offs.forEach((f) => f()); controls.dispose();\n'
            '    [heroStage.r, labStage.r, ir, gr2].forEach((r) => { r.dispose(); r.forceContextLoss(); });\n'
            '  };\n}\n')
open(os.path.join(OUT, 'three.ts'), 'w', encoding='utf-8').write(three_ts)
open(os.path.join(OUT, 'home.css'), 'w', encoding='utf-8').write(css_out)
print('Болсон:', ', '.join(sorted(os.listdir(OUT))))
