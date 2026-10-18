#!/usr/bin/env python3
"""SPEC.md-ийн дүрмээр JSON шалгагч. Хэрэглээ: validate.py <file.json> [--tests]"""
import json, re, sys, subprocess
FORBID = set("°∠∡△▲Δ∥⊥√π²³¹·×÷≤≥≠≈−–—∼≅′″αβγδθφϕλμωΩ…∞∈⇒⇔→←↔∑∏∫\u00a0\u200b\u2212")
SLOT_RE = re.compile(r'\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack')
CTRL = re.compile(r'[\x00-\x09\x0b-\x1f]')
def split_math(s):
    parts = re.split(r'(?<!\\)\$', s)
    return parts
MATHGLYPH = set("°∠∡△▲Δ∥⊥√π²³¹·×÷≤≥≠≈−∼≅′″αβγδθφϕλμωΩ∞∈⇒⇔→←↔∑∏∫\u2212")
def check_text(s, where, errs, maths, strict_latin=True, allow_newline=False, prose=False):
    if s != s.strip(): errs.append(f'{where}: эхэнд/төгсгөлд хоосон зай')
    if '  ' in s: errs.append(f'{where}: давхар хоосон зай')
    if CTRL.search(s): errs.append(f'{where}: удирдлагын тэмдэгт (\\t \\f \\b \\r — JSON escape алдаа?)')
    if '\n' in s and not allow_newline: errs.append(f'{where}: мөр шилжилт зөвшөөрөгдөөгүй')
    for line in s.split('\n'):
        if line != line.rstrip(): errs.append(f'{where}: мөрийн төгсгөлд хоосон зай')
    bad = sorted({c for c in s if c in (MATHGLYPH if prose else FORBID)})
    if bad: errs.append(f'{where}: хориотой юникод {bad}')
    if '$$' in s: errs.append(f'{where}: $$ хориотой')
    parts = split_math(s)
    if len(parts) % 2 == 0: errs.append(f'{where}: $ тэгш биш'); return
    for i, p in enumerate(parts):
        if i % 2 == 1:
            if not p.strip(): errs.append(f'{where}: хоосон $$')
            inner = re.sub(r'\\text\{[^}]*\}', '', p)
            if re.search(r'[А-Яа-яЁёӨөҮү]', inner): errs.append(f'{where}: томьёон дотор кирилл ({p})')
            for bad_cmd in [r'\lbrack', r'\dfrac', r'\tfrac', r'\left', r'\right', r'\displaystyle']:
                if bad_cmd in p: errs.append(f'{where}: {bad_cmd} хориотой ({p})')
            if re.search(r'\\sqrt\[', p): errs.append(f'{where}: \\sqrt[..] хориотой ({p})')
            if re.search(r'[\^_][^{\\]', p.replace('^{', '').replace('_{', '')): pass
            if re.search(r'[\^_](?!\{)', p): errs.append(f'{where}: ^/_ хаалтгүй ({p})')
            maths.append((where, p))
        else:
            if strict_latin:
                for line in p.split('\n'):
                    l2 = re.sub(r'^(I|II|III|IV)\. ', '', line)
                    if re.search(r'[A-Za-z]', l2): errs.append(f'{where}: томьёоны гадна латин үсэг ({line[:60]})')
                    if re.search(r'[0-9]', l2): errs.append(f'{where}: томьёоны гадна цифр ({line[:60]})')
                    if re.search(r'[\[\]\\^_{}|=<>+]', l2): errs.append(f'{where}: томьёоны гадна математик тэмдэгт ({line[:60]})')
def katex_check(maths):
    if not maths: return []
    js = r'''const k=require("katex");let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d);const o=[];for(const [w,t] of a){try{k.renderToString(t,{throwOnError:true,strict:"error"})}catch(e){o.push(w+": KaTeX: "+e.message.split("\n")[0]+" :: "+t)}}console.log(JSON.stringify(o))})'''
    r = subprocess.run(['node', '-e', js], input=json.dumps(maths), capture_output=True, text=True,
                       cwd='/Users/mr.buus/Intern/pi.mnv2/web')
    if r.returncode: return ['node алдаа: ' + r.stderr[:300]]
    return json.loads(r.stdout)
def check_problem(o, errs, maths):
    lab = o.get('label', '?')
    req = ['label', 'test', 'part', 'number', 'statement', 'choices', 'slots', 'figure', 'uncertain']
    for k in req:
        if k not in o: errs.append(f'{lab}: талбар дутуу {k}')
    if not re.fullmatch(r'([1-9]|[12][0-9]|3[0-5])[AB]', str(o.get('test',''))): errs.append(f'{lab}: test буруу')
    part = o.get('part')
    if part == 'I':
        if not re.fullmatch(rf"{re.escape(str(o.get('test')))}-\d\d", lab) or int(lab[-2:]) != o.get('number'): errs.append(f'{lab}: label/number таарахгүй')
        ch = o.get('choices')
        if not (isinstance(ch, list) and len(ch) == 5): errs.append(f'{lab}: choices яг 5 биш')
        else:
            for i, c in enumerate(ch): check_text(c, f'{lab}.choices[{"ABCDE"[i]}]', errs, maths)
        if o.get('slots') is not None: errs.append(f'{lab}: I хэсэгт slots null байх ёстой')
        check_text(o.get('statement', ''), f'{lab}.statement', errs, maths)
    elif part == 'II':
        if not re.fullmatch(rf"{re.escape(str(o.get('test')))}-II0[1-4]", lab) or int(lab[-1]) != o.get('number'): errs.append(f'{lab}: label/number таарахгүй')
        if o.get('choices') is not None: errs.append(f'{lab}: II хэсэгт choices null байх ёстой')
        st = o.get('statement', '')
        check_text(st, f'{lab}.statement', errs, maths, allow_newline=True)
        keys = []
        for m in SLOT_RE.finditer(st):
            kk = m.group(1) or m.group(2)
            if kk not in keys: keys.append(kk)
        if '\\lbrack' in st: errs.append(f'{lab}: \\lbrack биш [ab] хэрэглэ')
        if o.get('slots') != keys: errs.append(f'{lab}: slots {o.get("slots")} ≠ нөхцөлөөс {keys}')
        letters = ''.join(keys)
        if letters != 'abcdefghij'[:len(letters)] and not o.get('uncertain'):
            errs.append(f'{lab}: нүдний үсэг a,b,c… дараалалгүй ({letters}) — uncertain бөглөх ёстой')
        # slot outside math?
        parts = split_math(st)
        for i, p in enumerate(parts):
            if i % 2 == 0 and SLOT_RE.search(p): errs.append(f'{lab}: нүд $…$-ийн гадна')
        lines = st.split('\n')
        for j, line in enumerate(lines[1:], 1):
            if not re.match(r'^(I|II|III|IV)\. ', line): errs.append(f'{lab}: {j+1}-р мөр «I. »/«II. »/«III. »-аар эхлээгүй')
    else:
        errs.append(f'{lab}: part буруу')
    if o.get('figure') not in ('ok', 'missing', 'bad-crop', 'not-needed'): errs.append(f'{lab}: figure утга буруу')
    u = o.get('uncertain')
    if u is not None:
        if not isinstance(u, str) or not u.strip(): errs.append(f'{lab}: uncertain нь null эсвэл хоосон биш мөр')
        else: check_text(u, f'{lab}.uncertain', errs, maths, strict_latin=False, prose=True)
    if 'solution' in o and o['solution'] is not None: check_text(o['solution'], f'{lab}.solution', errs, maths)
    if 'keyCheck' in o and not (o['keyCheck']=='ok' or str(o['keyCheck']).startswith('mismatch: ')): errs.append(f'{lab}: keyCheck буруу хэлбэр')
def main():
    path = sys.argv[1]; data = json.load(open(path))
    errs, maths = [], []
    if '--tests' in sys.argv:
        for t in data:
            w = f'test{t["test"]}'
            check_text(t['name'], w + '.name', errs, maths, strict_latin=False)
            if re.search(r'[A-Za-z$]', t['name']): errs.append(w + ': нэрэнд латин/томьёо')
            if t['name'].endswith('.'): errs.append(w + ': нэр цэгээр төгссөн')
            for i, f in enumerate(t['formulas']): check_text(f, f'{w}.formulas[{i}]', errs, maths, strict_latin=False, prose=True)
            check_text(t['notes'], w + '.notes', errs, maths, strict_latin=False, prose=True)
        names = [t['name'] for t in data]
        if len(set(names)) != len(names): errs.append('давхардсан нэр')
    else:
        for o in data: check_problem(o, errs, maths)
    errs += katex_check(maths)
    print('\n'.join(errs) if errs else f'OK ({len(maths)} томьёо KaTeX-ээр шалгагдав)')
    sys.exit(1 if errs else 0)
main()
