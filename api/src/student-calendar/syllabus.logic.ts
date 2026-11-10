// Сурагчийн «Сэдэв хөтөлбөр» (эзэн 2026-11-08) — цэвэр логик (I/O-гүй), тест: student-calendar.logic.spec.ts.
//
// Нэгж = тест (бодлогын сангийн Test.id) эсвэл бодлогын санд байхгүй, гараар бичсэн сэдэв (нэрээр).
//
// ДҮРЭМ — тест сурагчийн хувьд хэзээ «ХИЙСЭН» бэ (нэг ч үйл явдал хангалттай, давхардвал бүгд жагсана):
//  A. Анги C тестийг D өдөр хийсэн (ClassTestSession, D <= өнөөдөр), ба тэр өдөр сурагчийн ирц C ангид:
//       PRESENT → хийсэн; LATE → хийсэн (хоцорсон гэж тэмдэглэнэ);
//       ABSENT / EXCUSED → ХИЙГЭЭГҮЙ (тасалсан гэж бүртгэнэ, нөхөх хүртэл дутуу).
//     Ирц тэмдэглээгүй бол: тэр өдөр C-д элссэн байсан (joined <= D < left) → хийсэн гэж тооцно
//     (эзэн: «ангид орсон сэдэв тасалснаас бусад тохиолдолд үзсэнд тооцно»).
//  B. Анги C тестийг «өмнө үзсэн» гэж тэмдэглэсэн (ClassCoveredTest, огноогүй, removedAt = null):
//     тэмдэглэсэн өдөр (createdAt) сурагч C-д элссэн байсан бол хийсэн (огноогүй, «ангитайгаа өмнө үзсэн»).
//  C. Нөхөлт (MakeupVisit, deletedAt = null; MakeupVisitTest deletedAt = null): 406-д багшийн сонгосон
//     тест (RECORDED) эсвэл зочилсон ангийн тэр өдөр БАТАЛСАН тест (CONFIRMED) → хийсэн (огноо, газартай).
//     Зочилсон ангийн зөвхөн төлөвлөгөөгөөр (PLANNED, батлагдаагүй) тестийг тооцохгүй — өөрийн ангид ч
//     батлагдаагүй төлөвлөгөөг тооцдоггүйтэй адил. Нөхөлтийн ирц ABSENT/EXCUSED бол тооцохгүй.
//     Устгасан (зөөлөн) нөхөлт, хасагдсан сэдэв хэзээ ч тооцогдохгүй (дуудагч тал шүүнэ).
//
// Тест хэзээ «ДУТУУ» бэ: хийсэн үйл явдал байхгүй ба дараахын аль нэг:
//  - сурагч элссэн байх үедээ тэр хичээлийг тасалсан/чөлөө авсан (ямар ч анги, хуучин анги ч);
//  - ОДООГИЙН анги тестийг сурагч элсэхээс өмнө хийсэн / өмнө үзсэн гэж тэмдэглэсэн
//    (анги солиход шинэ анги түрүүлж үзсэн сэдэв — хуучин ангидаа хийгээгүй бол дутуу).
// Хуучин ангийн, сурагч элсэхээс өмнө эсвэл гарсны дараах хичээл хамаарахгүй.
// Одоогийн анги хараахан үзээгүй, сурагч ч хийгээгүй тест — «Үзээгүй» (дутуу биш).
// «Эрт явсан» төлөв өгөгдөлд байхгүй тул тусдаа тооцохгүй (ирц PRESENT/LATE-ээр л).

export type AttStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface SyllabusSessionIn {
  classroomId: string;
  date: string;
  testId: string | null;
  /** Гараар бичсэн тестийн нэр (testId = null үед) */
  title: string;
}
export interface SyllabusPastIn {
  classroomId: string;
  testId: string;
  /** Тэмдэглэсэн өдөр */
  markedOn: string;
}
export interface SyllabusMakeupIn {
  visitId: string;
  date: string;
  place: { kind: 'CLASS' | 'ROOM_406'; classroomId: string | null; name: string };
  attStatus: AttStatus | null;
  teacher: string | null;
  comment: string | null;
  tests: { testId: string | null; title: string; source: 'CONFIRMED' | 'PLANNED' | 'RECORDED' }[];
}

export type SyllabusEvent =
  | {
      kind: 'CLASS';
      done: boolean;
      date: string;
      classroomId: string;
      /** null = ирц тэмдэглээгүй (элссэн тул хийсэнд тооцсон) */
      attendance: AttStatus | null;
    }
  | { kind: 'PAST'; done: true; date: null; classroomId: string }
  | {
      kind: 'MAKEUP';
      done: true;
      date: string;
      visitId: string;
      place: SyllabusMakeupIn['place'];
      teacher: string | null;
      comment: string | null;
    }
  | { kind: 'BEFORE_JOIN'; done: false; date: string | null; classroomId: string };

export type SyllabusStatus = 'DONE' | 'MISSING' | 'TODO';

export interface SyllabusItemState {
  key: string;
  status: SyllabusStatus;
  /** Огноогоор (огноогүй PAST/BEFORE_JOIN эхэнд) */
  events: SyllabusEvent[];
}

/** Нэгжийн түлхүүр: тест бол `t:<id>`, гараар бичсэн бол `x:<нормчилсон нэр>` */
export function itemKey(testId: string | null, title: string): string {
  if (testId) return `t:${testId}`;
  return `x:${String(title ?? '').toLocaleLowerCase('mn').replace(/\s+/g, ' ').trim()}`;
}

export function computeSyllabus(input: {
  today: string;
  currentClassroomId: string | null;
  enrolled: (classroomId: string, date: string) => boolean;
  /** `${classroomId}|${date}` → ирц */
  attendance: ReadonlyMap<string, AttStatus>;
  sessions: SyllabusSessionIn[];
  past: SyllabusPastIn[];
  makeups: SyllabusMakeupIn[];
}): Map<string, SyllabusItemState> {
  const { today, currentClassroomId, enrolled } = input;
  const events = new Map<string, SyllabusEvent[]>();
  const push = (key: string, e: SyllabusEvent) => {
    if (key === 'x:') return;
    const list = events.get(key) ?? [];
    list.push(e);
    events.set(key, list);
  };

  for (const s of input.sessions) {
    if (s.date > today) continue;
    const key = itemKey(s.testId, s.title);
    const att = input.attendance.get(`${s.classroomId}|${s.date}`) ?? null;
    const isEnrolled = enrolled(s.classroomId, s.date);
    if (att) {
      push(key, { kind: 'CLASS', done: att === 'PRESENT' || att === 'LATE', date: s.date, classroomId: s.classroomId, attendance: att });
    } else if (isEnrolled) {
      push(key, { kind: 'CLASS', done: true, date: s.date, classroomId: s.classroomId, attendance: null });
    } else if (s.classroomId === currentClassroomId) {
      push(key, { kind: 'BEFORE_JOIN', done: false, date: s.date, classroomId: s.classroomId });
    }
  }
  for (const p of input.past) {
    const key = itemKey(p.testId, '');
    if (enrolled(p.classroomId, p.markedOn)) push(key, { kind: 'PAST', done: true, date: null, classroomId: p.classroomId });
    else if (p.classroomId === currentClassroomId)
      push(key, { kind: 'BEFORE_JOIN', done: false, date: null, classroomId: p.classroomId });
  }
  for (const m of input.makeups) {
    if (m.attStatus === 'ABSENT' || m.attStatus === 'EXCUSED') continue;
    for (const t of m.tests) {
      if (t.source === 'PLANNED') continue;
      push(itemKey(t.testId, t.title), {
        kind: 'MAKEUP',
        done: true,
        date: m.date,
        visitId: m.visitId,
        place: m.place,
        teacher: m.teacher,
        comment: m.comment,
      });
    }
  }

  const out = new Map<string, SyllabusItemState>();
  for (const [key, list] of events) {
    const sorted = [...list].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    const status: SyllabusStatus = sorted.some((e) => e.done) ? 'DONE' : 'MISSING';
    out.set(key, { key, status, events: sorted });
  }
  return out;
}

/** Хийсэн огноо (хамгийн эрт огноотой «хийсэн» үйл явдал); огноогүй (PAST) бол null */
export function firstDoneDate(state: SyllabusItemState | undefined): string | null {
  return state?.events.find((e) => e.done && e.date)?.date ?? null;
}
