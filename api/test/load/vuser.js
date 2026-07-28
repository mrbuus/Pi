'use strict';
/**
 * НЭГ виртуал сурагчийн бодит шалгалтын урсгал:
 *   POST /tests/:id/start
 *   → давтан PATCH /tests/:id/session (autosave, шахсан хугацаанд)
 *   → POST /tests/:id/submit
 *
 * Хугацаа ШАХАЛТ: жинхэнэ 100 минутын шалгалтад ~300 autosave (debounce
 * 1.2с тутамд) явагддаг ч 4 түвшинд бодитоор 100 минут ажиллуулах боломжгүй
 * тул `saveCount` ширхэг autosave-ыг `saveIntervalMs`-ийн зайтай (жинхэнэ
 * debounce-оос богино) явуулна — cadence-ийн ХЭЛБЭР ижил (жижиг JSON diff,
 * дараалсан PATCH), гэхдээ ЖИНХЭНЭ 300 удаагийн бүрэн тоог БИШ. Энэ бол
 * зориудаар "конкурренси/сек" дарамтыг илэрхийлэх, wall-clock-ийг богино
 * байлгах ХЯЗГААРЛАЛТ — үр дүнгийн тайланд ил тод дурдана.
 */
const { request, sleep } = require('./lib/http');

const SELF_STATES = ['SOLVED_CLEAN', 'FIXED_AFTER_ERROR', 'FAILED', 'GUESSED'];

function pick(arr, i) {
  return arr[i % arr.length];
}

async function runVirtualStudent({
  apiBase,
  token,
  testId,
  problemIds,
  saveCount,
  saveIntervalMs,
  recorders,
}) {
  const start = await request('POST', `${apiBase}/tests/${testId}/start`, { token, body: {} });
  recorders.start.record(start.ms, start.ok, start.status);
  if (!start.ok) {
    return { ok: false, phase: 'start', status: start.status };
  }

  for (let i = 0; i < saveCount; i += 1) {
    await sleep(saveIntervalMs);
    const pid = pick(problemIds, i);
    const body = {
      answers: { [pid]: String((i % 9) + 1) },
      selfStates: { [pid]: pick(SELF_STATES, i) },
      problemTimes: { [pid]: 5 + i * 3 },
    };
    // Бодит сурагч ~1/20 удаа "leave"/"return" (анти-чит) үйл явдал үүсгэдэг
    if (i > 0 && i % 20 === 19) body.event = 'RETURN';

    const r = await request('PATCH', `${apiBase}/tests/${testId}/session`, { token, body });
    recorders.session.record(r.ms, r.ok, r.status);
    if (!r.ok) {
      return { ok: false, phase: 'session', status: r.status };
    }
  }

  const submit = await request('POST', `${apiBase}/tests/${testId}/submit`, { token, body: {} });
  recorders.submit.record(submit.ms, submit.ok, submit.status);
  return { ok: submit.ok, phase: 'submit', status: submit.status };
}

module.exports = { runVirtualStudent };
