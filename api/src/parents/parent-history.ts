import { BadRequestException } from '@nestjs/common';
export function historyWindow(year?: string, page?: string, now = new Date()) {
  const selected = year === undefined ? now.getUTCFullYear() : Number(year);
  const selectedPage = page === undefined ? 1 : Number(page);
  if (
    (year !== undefined && !/^\d{4}$/.test(year)) ||
    !Number.isInteger(selected) ||
    selected < 2000 ||
    selected > now.getUTCFullYear() + 1
  )
    throw new BadRequestException('Жилээ шалгана уу.');
  if (
    (page !== undefined && !/^\d{1,4}$/.test(page)) ||
    !Number.isInteger(selectedPage) ||
    selectedPage < 1 ||
    selectedPage > 1000
  )
    throw new BadRequestException('Түүхийн хуудсыг шалгана уу.');
  return {
    year: selected,
    page: selectedPage,
    start: new Date(Date.UTC(selected, 0, 1)),
    end: new Date(Date.UTC(selected + 1, 0, 1)),
    skip: (selectedPage - 1) * 50,
    take: 51,
  };
}
/** Only pupil-facing learning fields. Arbitrary client metadata is never exposed wholesale. */
export function parentLearningMeta(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const meta = input as Record<string, unknown>;
  if (
    meta.lab !== 'v1' ||
    ![
      'first',
      'solution-viewed',
      'retry-before-solution',
      'solution-assisted-correction',
    ].includes(String(meta.kind))
  )
    return null;
  return {
    kind: String(meta.kind),
    answer: typeof meta.answer === 'string' ? meta.answer.slice(0, 128) : null,
    correct: typeof meta.correct === 'boolean' ? meta.correct : null,
    mode: ['classroom', 'independent', 'probe'].includes(String(meta.mode))
      ? String(meta.mode)
      : null,
    flags: Array.isArray(meta.flags)
      ? meta.flags
          .filter((f) => ['unsure', 'guessed', 'could-not', 'help'].includes(f))
          .slice(0, 4)
      : [],
  };
}
export function historyPage<T>(rows: T[]) {
  return { rows: rows.slice(0, 50), hasMore: rows.length > 50 };
}

/** Class-level records are limited to this pupil's historical enrolled calendar days. */
export function enrollmentDayScopes(
  enrollments: { classroomId: string; joinedAt: Date; leftAt: Date | null }[],
  start: Date,
  end: Date,
) {
  const day = (value: Date) =>
    new Date(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(
        value,
      ),
    );
  return enrollments.flatMap((e) => {
    const from = day(e.joinedAt) > start ? day(e.joinedAt) : start;
    const until = e.leftAt && day(e.leftAt) < end ? day(e.leftAt) : end;
    return from < until
      ? [{ classroomId: e.classroomId, date: { gte: from, lt: until } }]
      : [];
  });
}
