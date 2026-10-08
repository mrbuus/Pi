"""Read-only XLSX audit → selected local planning data. Never imports into the product."""
from pathlib import Path
import json,re,datetime,collections,hashlib,unicodedata
from openpyxl.utils.cell import range_boundaries,get_column_letter
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
A=json.loads((HERE/'private/schedule-audit.json').read_text())
roles={'Ангийн хуваарь':'Давтамжийн хувилбарууд','Зуны хуваарь':'Зуны өдөр тутмын хуваарь','Багш нар хуваарь':'Багшийн ажиллах өдөр / сондгой-тэгш ээлж','0601-с хойшхи':'Зургадугаар сарын өдөр тутмын хуваарь','Сул анги':'Өрөө × цаг × гаригийн хоёр хувилбар','Хичээлийн хуваарь1':'Нэгдүгээр–тавдугаар сарын өдөр тутмын хуваарь','ХХ хуучин':'Есдүгээр–нэгдүгээр сарын өдөр тутмын архив','Сэдэвчилсэн':'Сар, долоо хоног, их сургуулийн календарийн тэмдэглэгээ'}
week=['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням']
regex=re.compile(r'^\s*(\d{1,2})\s*/\s*(\d{1,2})\s*('+'|'.join(week)+r')',re.I)
S=[];B=[]
for index,s in enumerate(A['sheets']):
 if s['name'] not in roles:continue
 s=dict(s);s['id']='sheet'+str(index+1);s['purpose']=roles[s['name']];S.append(s)
 headers=[]
 if s['name'] not in ['ХХ хуучин','Хичээлийн хуваарь1','0601-с хойшхи','Зуны хуваарь']:continue
 merges=[range_boundaries(v) for v in s['merged']];lookup={(c['r'],c['c']):c for c in s['cells']}
 for c in s['cells']:
  m=regex.match(str(c['value']))
  if not m:continue
  span=next((z for z in merges if z[0]<=c['c']<=z[2] and z[1]<=c['r']<=z[3]),None)
  if not span:continue
  headers.append((c,m,span))
 for c,m,span in headers:
  start,end=span[0],span[2]; bottom=min([z[0]['r']-1 for z in headers if z[0]['r']>c['r'] and max(start,z[2][0])<=min(end,z[2][2])]+[s['rows']])
  month,day=int(m[1]),int(m[2]);year=2025 if s['name']=='ХХ хуучин' and month>=8 else 2026
  issues=[];date=None
  try:
   date=datetime.date(year,month,day);actual=week[date.weekday()]
   if actual.lower()!=m[3].lower():issues.append('Огноо–гариг зөрүү: '+actual+' байх таамаг')
  except ValueError:issues.append('Хүчингүй огноо')
  cells=[v['cell'] for v in s['cells'] if c['r']<=v['r']<=bottom and start<=v['c']<=end]
  block={'id':s['id']+'-'+c['cell'],'sheet':s['name'],'sheetId':s['id'],'anchor':c['cell'],'raw':c['value'],'date':date.isoformat() if date else None,'yearInferred':True,'weekday':m[3],'bounds':[start,c['r'],end,bottom],'cells':cells,'issues':issues,'lessons':[],'calendar':[]}
  header=[v for v in s['cells'] if c['r']<v['r']<=c['r']+3 and start<=v['c']<=end]
  col=lambda name:next((v['c'] for v in header if str(v['value']).strip()==name),None)
  classCol,roomCol,timeCol,topicCol=col('Анги'),col('Танхим'),col('Цаг'),col('Хичээл')
  def get(r,k,inherit=False):
   if k is None:return None
   cell=lookup.get((r,k))
   if not cell and inherit:
    merged=next((z for z in merges if z[0]<=k<=z[2] and z[1]<=r<=z[3]),None)
    if merged and merged[1]>=c['r']:cell=lookup.get((merged[1],merged[0]))
   return {'value':cell['value'],'cell':cell['cell']} if cell else None
  if classCol:
   for r in range(c['r']+2,bottom+1):
    cl=get(r,classCol)
    if not cl or not re.search(r'\d+\s*-\s*\d+|зун|нийгэм|өвөл|замын|онлайн',str(cl['value']),re.I):continue
    other=[v['cell'] for v in s['cells'] if v['r']==r and classCol<v['c']<=end and v['c']!=topicCol]
    block['lessons'].append({'row':r,'class':cl,'room':get(r,roomCol),'time':get(r,timeCol,True),'topic':get(r,topicCol),'otherCells':other})
  B.append(block)
# Duplicate labels kept as separate source blocks, never silently repaired.
counts=collections.Counter((b['sheet'],b['date']) for b in B if b['date'])
for b in B:
 if counts[(b['sheet'],b['date'])]>1:b['issues'].append('Нэг табд ижил огноотой өөр блок бий')
# Only explicitly sourced historical intervals; unmatched dates are unknown, not school days.
calendar=[{'from':'2025-10-20','to':'2025-10-24','grades':'I–XII','type':'Бие даалт','confidence':'Албан эх сурвалж','source':'https://city.edu.mn/public/br?id=584'}, {'from':'2025-12-08','to':'2025-12-12','grades':'VI–IX (дурдсан 7 дүүрэг)','type':'Цахим хичээл','confidence':'Албан эх сурвалж','source':'https://city.edu.mn/public/br?id=733'}, {'from':'2025-12-08','to':'2025-12-12','grades':'I–V (дурдсан 7 дүүрэг)','type':'Танхимын хичээл','confidence':'Албан эх сурвалж','source':'https://city.edu.mn/public/br?id=733'}, {'from':'2026-03-30','to':'2026-04-03','grades':'Нийслэл — анхны тушаалаар батлах','type':'Бие даалт','confidence':'Хоёрдогч мэдээ; батлах','source':'https://urug.mn/215928/'}, {'from':'2026-04-06','to':'2026-04-10','grades':'Нийслэл — анхны тушаалаар батлах','type':'Улирлын амралт','confidence':'Хоёрдогч мэдээ; батлах','source':'https://urug.mn/215928/'}]
# A/95 signed scan, retrieved through a news source's public Drive link.
# Dates below are calculated interpretations, not an approved operating calendar.
a95='https://drive.google.com/file/d/1aXh3L2XZDHUdjE8lIQKSQQVzncFiFiJL/view'
for start,end,grades,kind in [
 ('2025-09-01','2025-10-17','I–XII','Танхимын хичээл'),
 ('2025-10-27','2025-12-12','I–V','Танхимын хичээл'),
 ('2025-10-27','2025-12-19','VI–IX','Танхимын хичээл'),
 ('2025-10-27','2025-12-26','X–XII','Танхимын хичээл'),
 ('2025-12-15','2026-01-23','I–V','I улирлын амралт'),
 ('2025-12-22','2026-01-23','VI–IX','I улирлын амралт'),
 ('2025-12-29','2026-01-16','X–XII','I улирлын амралт'),
 ('2026-01-19','2026-01-23','X–XII','Цахим хичээл'),
 ('2026-01-26','2026-03-27','I–XII','Танхимын хичээл'),
 ('2026-03-30','2026-04-03','I–XII','Бие даалт'),
 ('2026-04-06','2026-04-10','I–XII','II улирлын амралт'),
 ('2026-04-13','2026-06-05','I–XII','III улирлын хичээл'),
 ('2026-06-08','2026-06-12','I–III тайлан; IV–XII шалгалт','Үр дүн / шалгалтын долоо хоног')]:
 calendar.append({'from':start,'to':end,'grades':grades,'type':kind,'confidence':'А/95 хавсралтаас тооцсон ноорог · огноог батлах','source':a95,'weekdaysOnly':kind in ['Танхимын хичээл','III улирлын хичээл','Бие даалт','Цахим хичээл','Үр дүн / шалгалтын долоо хоног'],'priority':0})
# Remove superseded secondary-only spring intervals; retain provenance in research.
calendar=[x for x in calendar if x['source']!='https://urug.mn/215928/']
for b in B:
 b['calendar']=[dict(x,dateCaution=bool(b['issues'])) for x in calendar if b['date'] and x['from']<=b['date']<=x['to'] and (not x.get('weekdaysOnly') or datetime.date.fromisoformat(b['date']).weekday()<5)]
D={'sourceName':'Хуваарь.xlsx','sha256':A['sha256'],'readAt':'2026-09-24','warning':'Дотоод төлөвлөлтийн хуулбар. Он таамагласан. Нийтлэх / импортлох өгөгдөл биш.','sheets':S,'blocks':B,'calendar':calendar,'excluded':[{'name':s['name'],'cells':len(s['cells']),'reason':'Утга тодруулах туслах хүснэгт; өдөр тутмын хуваарь гэж батлаагүй' if s['name']=='Sheet4' else 'Хуваарьт хамаарахгүй санхүү / сурагчийн дүн'} for s in A['sheets'] if s['name'] not in roles]}
(HERE/'schedule-data.js').write_text('window.PI_SCHEDULE='+json.dumps(D,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';\n')
summary={'tabs':len(S),'cells':sum(len(s['cells']) for s in S),'blocks':len(B),'lessonCandidates':sum(len(b['lessons']) for b in B),'weekdayMismatch':sum(any('гариг' in x for x in b['issues']) for b in B),'duplicateBlocks':sum(any('ижил' in x for x in b['issues']) for b in B)}
print(summary)
p=['# Хуваарь.xlsx — эх хүснэгтийн шинжилгээ','', '2026-09-24 · Эх Excel өөрчлөгдөөгүй. Хуваарь нийтлээгүй, үйлдвэрлэлийн системд импортлоогүй.', '',f"14 табын бүх утга, томьёо, кеш утга, нүдний өнгө, merged range-ийг уншсан. Хуваарийн 8 табын {summary['cells']:,} утгатай нүдийг локал харагчид хадгалав. {len(B)} огноотой блок, {summary['lessonCandidates']} анги тэмдэглэсэн мөрийн нэр дэвшигчийг салгасан. Энэ нь давхардалгүй өдөр/бодитоор орсон хичээлийн тоо биш.",'', '## Табыгаа зөв сонгох', '', '| Таб | Утгатай нүд | Зориулалт |','|---|---:|---|']
for s in S:p.append(f"| {s['name']} | {len(s['cells'])} | {s['purpose']} |")
p+=['','Хуваариас тусгаарласан: '+', '.join(x['name'] for x in D['excluded'])+'. Эдгээрийн хувийн дүн/санхүүг хуваарийн харагчид хуулсангүй. Sheet4-ийн огноо мэт утга, Оноо гэсэн хэсгийг тусад нь тодруулна.','', '## Огноо ба чанар', '',f"{summary['weekdayMismatch']} блокийн огноо–гариг зөрсөн. {summary['duplicateBlocks']} блок нь тухайн табдаа ижил огноотой өөр блоктой. Давхардсан блокийг устгаагүй. ХХ хуучин: 2025 оны IX–XII, 2026 оны I; бусад өдөр тутмын таб: 2026 он гэсэн календарийн таамаг ашигласан. Эдгээр нь хэрэглэгчээр батлагдсан он биш.",'', 'Зөвхөн merged цагийг өвлүүлсэн. Хоосон цагийг өмнөх мөрөөр тааж бөглөөгүй. Багшийн нэртэй хажуугийн жагсаалт нь тухайн ангийн томилгоо гэдгийг батлахгүй. Блокийн гаднах бүх тэмдэглэлийг Табын бүх нүд хэсгээс уншина. Эцсийн цаг дутуу тул ажилласан цаг болон хугацааны давхцлыг найдвартай тооцох боломжгүй.', '', '## Өдөр тутмын хэв маяг', '', 'IX–I архивт 15:00 ангиуд, өглөөний 7–8-р анги, хоёр салбар, үндсэн ба туслах багш, шалгалт/засалт/сэдэв, хоол ба ажлын тэмдэглэл зэрэгцдэг. I–V хүснэгтэд 17:30/18:00 нэмэлт цаг, нөхөх/тайлбарлах/хэвлэх ажил, үлдэж болох тэмдэглэл орж ирнэ. VI сарын эх сурвалжид 10:00/13:00/16:00 болон зарим 07:00/14:00 цаг, зуны бүлэг, Замын Үүд, эрчимжүүлсэн сорилго туссан. Нэг жилийн бүх өдөр ижил хуваарьтай гэсэн дүгнэлт хийхгүй.', '', 'Сул анги табын хоёр хүснэгт өөр хувилбартай: зэрэг хүчинтэй гэж нийлүүлэхгүй. Нүд хоосон гэдэг нь баталгаатай сул өрөө гэсэн үг биш. Багш нар хуваарь табын тэгш/сондгой мөчлөг, орой ирэх тэмдэглэл, нэрийн дэргэдэх анги/зун/new-ийг тусдаа тайлбартай болгоно. Сэдэвчилсэн табын С/Т, их сургуулийн долоо хоногийн тоолуур нь багшийн боломжид нөлөөлж болох ч ЕБС-ийн албан календарь биш.', '', '## ЕБС-тэй тулгалтын хязгаар', '', 'Өдөр бүрийн харагчид таарсан баталгаатай / батлах шаардлагатай интервал тусад нь гарна. Таарах интервал олдоогүй өдрийг хичээлтэй эсвэл амралт гэж таагаагүй. Он ба анги–ЕБС-ийн түвшний mapping батлагдаагүй тул бүх тулгалт урьдчилсан. 13-1 нь ЕБС-ийн 13-р анги гэж үзэхгүй. ЕБС амарсан ч сургалтын төв автоматаар амрахгүй.', '', '2025–26 оны А/95 гарын үсэгтэй скан, нийслэлийн хавсралтыг олж хадгалсан. Долоо хоногоос тооцсон огнооны нооргийг эхийн тайлбар болон дараах өөрчлөлттэй хариуцагч батална. 2026 оны А/211 PDF нь дараагийн хичээлийн жилийн эх; түүхэн Excel-ийн 2025–26 өдрүүдэд буцааж хэрэглэхгүй. Судалгааны сан → Хуваарь, сэдэв санал ба брэнд баримтаас нарийн шийдвэр/эх сурвалжийг уншина.', '', '## Бүх огноотой блокийн индекс', '', '| ID / эх нүд | Эх огноо | Он таамагласан | Анги мөр | Шалгах зүйл |','|---|---|---|---:|---|']
for b in B:p.append(f"| {b['sheet']}!{b['anchor']} | {b['raw']} | {b['date']} | {len(b['lessons'])} | {'; '.join(b['issues']) or 'Гариг таарсан; он батлах'} |")
p+=['','Блок бүрийн бүтэн мөр, эх нүд, өнгө, томьёо/кеш, тайлбарыг SYSTEM-DESIGN.html → Бусад → Хуваарь: өдөр бүр хэсэгт харна. Эх нүдний текстийг тайрч хаяагүй. Ижил огноо болон зөрүүтэй огноо тус бүр өөр ID-тай.','', '## Эх файлын таних утга', '', 'SHA-256: `'+A['sha256']+'`']
(ROOT/'docs/SCHEDULE-WORKBOOK-REVIEW.md').write_text('\n'.join(p)+'\n')
