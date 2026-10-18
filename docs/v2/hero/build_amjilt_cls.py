import os
# Facebook-ийн дэлгэцийн зургаас зөвхөн ангийн зургийг таслана (хар хүрээ, баруун талын тайлбарыг хасна)
import sys, numpy as np
from PIL import Image
def crop(path):
    im=Image.open(path).convert('RGB'); W,H=im.size
    a=np.asarray(im).astype(int)
    L=a.mean(axis=2)
    # баруун талын тайлбар самбар ~79%-аас эхэлнэ; дээд хөтчийн хэсэг ~11%
    x1=int(W*.79); y0=int(H*.115); y1=int(H*.985)
    sub=L[y0:y1, :x1]
    # хар биш (>40) пикселтэй мөр/багана
    rows=np.where((sub>40).mean(axis=1)>.25)[0]; cols=np.where((sub>40).mean(axis=0)>.25)[0]
    t,b=rows[0]+y0, rows[-1]+y0; l,r=cols[0], cols[-1]
    return im.crop((l+2,t+2,r-2,b-2))

# Он оноор хэсэгт ангийн хамт олны зураг: Facebook дэлгэцийн зургаас таслаж webp болгоно.
# Эх: ~/Desktop/amjiltiin zurag/before 2026/2026-aas umnuh angiud (эзний хадгалсан, 2026-10-13)
# Тайлбарыг (анги, багш) дэлгэцийн зургаас нүдээр уншсан — 2026-10-17
import glob, json
SRC=os.path.expanduser('~/Desktop/amjiltiin zurag/before 2026/2026-aas umnuh angiud')
files=sorted(glob.glob(SRC+'/*.png'))
assert len(files)==28, len(files)
M={1:(2025,'12-1','Баасанжав'),2:(2025,'12-2','Баасанжав'),3:(2025,'12-3','Номин-Эрдэнэ, Бадрал'),
   4:(2025,'12-4','Баасансүрэн, Болоржин'),5:(2025,'12-5','Баасансүрэн'),6:(2025,'12-6','Номин-Эрдэнэ'),
   7:(2025,'12-7','Энхсайхан'),8:(2025,'12-8','Баасансүрэн, Болоржин'),9:(2025,'12-9','Бадрал'),
   10:(2025,'12-10','Ундаръяа, Номин-Эрдэнэ'),11:(2025,'12-12','Бадрал'),12:(2025,'12-13','Болоржин'),
   13:(2025,'12-14','Цогт-Очир'),
   15:(2024,'12-1',None),16:(2024,'12-2',None),17:(2024,'12-6',None),18:(2024,'12-7',None),
   19:(2024,'12-4',None),20:(2024,'12-9',None),21:(2024,'12-8',None),22:(2024,'12-5',None),
   23:(2023,None,'Ганчимэг'),24:(2023,None,'Бадрал'),25:(2023,None,'Баасанжав'),26:(2023,None,'Дуламсүрэн'),
   27:(2023,None,'Номуунаа'),28:(2023,None,'Номин-Эрдэнэ')}
OUTS=[os.path.expanduser('~/Intern/pi.mnv2/web/public/amjilt'), os.path.expanduser('~/Intern/pi.mnv2/docs/v2/hero/home/amjilt')]
data={}
key=lambda c:(int(c.split('-')[1]) if c else 99)
for i,(y,cls,tch) in sorted(M.items(), key=lambda kv:(kv[1][0], key(kv[1][1]), kv[0])):
    im=crop(files[i-1]); W,H=im.size
    im=im.crop((int(W*.035), int(H*.05), int(W*.965), H))   # Facebook-ийн сум, дээд дүрсийг хасна
    n=len(data.setdefault(y,[]))+1; name=f'cls-{n:03d}.webp'
    for out in OUTS:
        for sub,mx in (('t',900),('f',2000)):
            d=os.path.join(out,str(y),sub); os.makedirs(d,exist_ok=True)
            c=im.copy(); c.thumbnail((mx,mx)); c.save(os.path.join(d,name),'WEBP',quality=80 if sub=='t' else 84)
    t=im.copy(); t.thumbnail((900,900))
    data[y].append({'y':y,'s':'cls','n':(cls+' анги') if cls else tch+' багшийн анги','sc':(tch+' багш') if (tch and cls) else '',
                    't':f'amjilt/{y}/t/{name}','f':f'amjilt/{y}/f/{name}','w':t.width,'h':t.height})
for out in OUTS:
    for y,L in data.items():
        p=os.path.join(out,f'{y}.json')
        old=[d for d in json.load(open(p)) if d.get('s')!='cls'] if os.path.exists(p) else []
        json.dump(old+L,open(p,'w'),ensure_ascii=False)
    ys=sorted(set(json.load(open(os.path.join(out,'index.json'))) if os.path.exists(os.path.join(out,'index.json')) else [])|set(data),reverse=True)
    json.dump(ys,open(os.path.join(out,'index.json'),'w'))
print({y:len(L) for y,L in data.items()})
