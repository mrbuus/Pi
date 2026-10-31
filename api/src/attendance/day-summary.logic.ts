// «Өнөөдөр» тойм (эзэн 2026-10-31) — ӨС-гүй цэвэр тооцоо, тесттэй.

export interface SummaryClass {
  id: string;
  name: string;
  type: string;
  lessons: { scheduleId: string; startMinute: number; room: string | null }[];
}

export interface DayClassSummary {
  id: string;
  name: string;
  startMinute: number;
  room: string | null;
  students: number;
  attendance: { present: number; late: number; absent: number; excused: number; unmarked: number };
  /** Онлайн ангид гэрийн даалгавар тэмдэглэхгүй — null */
  homework: { done: number; partial: number; notDone: number; unmarked: number } | null;
  /** Тухайн өдрийн бүх хичээл нь батлагдсан */
  confirmed: boolean;
}

/**
 * Анги бүрийн өдрийн ирц, даалгаврын тоо. Зөвхөн ОДОО ангид байгаа сурагчийг
 * тоолно (гарсан сурагчийн хуучин мөр тоонд орохгүй); тэмдэглээгүй = үлдэгдэл.
 */
export function summarizeDay(
  classes: SummaryClass[],
  enrolled: { classroomId: string; studentId: string }[],
  attendance: { classroomId: string; studentId: string; status: string }[],
  homework: { classroomId: string; studentId: string; status: string | null }[],
  confirmedScheduleIds: Set<string>,
): DayClassSummary[] {
  const roster = new Map<string, Set<string>>();
  for (const e of enrolled) {
    const set = roster.get(e.classroomId) ?? new Set<string>();
    set.add(e.studentId);
    roster.set(e.classroomId, set);
  }
  return classes.map((c) => {
    const ids = roster.get(c.id) ?? new Set<string>();
    const att = { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
    const seenAtt = new Set<string>();
    for (const a of attendance) {
      if (a.classroomId !== c.id || !ids.has(a.studentId) || seenAtt.has(a.studentId)) continue;
      seenAtt.add(a.studentId);
      if (a.status === 'PRESENT') att.present += 1;
      else if (a.status === 'LATE') att.late += 1;
      else if (a.status === 'ABSENT') att.absent += 1;
      else if (a.status === 'EXCUSED') att.excused += 1;
    }
    att.unmarked = ids.size - seenAtt.size;

    let hw: DayClassSummary['homework'] = null;
    if (c.type !== 'ONLINE') {
      hw = { done: 0, partial: 0, notDone: 0, unmarked: 0 };
      const seenHw = new Set<string>();
      for (const h of homework) {
        if (h.classroomId !== c.id || !h.status || !ids.has(h.studentId) || seenHw.has(h.studentId)) continue;
        seenHw.add(h.studentId);
        if (h.status === 'DONE') hw.done += 1;
        else if (h.status === 'PARTIAL') hw.partial += 1;
        else if (h.status === 'NOT_DONE') hw.notDone += 1;
      }
      hw.unmarked = ids.size - seenHw.size;
    }

    const first = [...c.lessons].sort((a, b) => a.startMinute - b.startMinute)[0];
    return {
      id: c.id,
      name: c.name,
      startMinute: first?.startMinute ?? 0,
      room: first?.room ?? null,
      students: ids.size,
      attendance: att,
      homework: hw,
      confirmed: c.lessons.length > 0 && c.lessons.every((l) => confirmedScheduleIds.has(l.scheduleId)),
    };
  });
}
