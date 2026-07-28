'use strict';
const { signHs256 } = require('./lib/jwt');
const { Recorder } = require('./lib/stats');
const { sleep } = require('./lib/http');
const { runVirtualStudent } = require('./vuser');

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

/**
 * `level` тооны виртуал сурагчийг ЗЭРЭГ (арай тархсан ирэлттэй, жинхэнэ
 * "proctor эхлүүлье гэсэн 30-60с цонх"-той адилтгасан) ажиллуулж, нэгдсэн
 * req/s + endpoint тус бүрийн p50/p95/p99-ийг буцаана.
 */
async function runLevel({
  apiBase,
  jwtSecret,
  level,
  testId,
  studentIds,
  problemIds,
  arriveSpreadMs,
  saveCount,
  saveIntervalMs,
}) {
  const recorders = {
    start: new Recorder('start'),
    session: new Recorder('session'),
    submit: new Recorder('submit'),
  };

  const chosen = studentIds.slice(0, level);
  const wallStart = Date.now();

  const tasks = chosen.map((studentId, i) => {
    const token = signHs256({ sub: studentId, role: 'STUDENT' }, jwtSecret, SEVEN_DAYS_SEC);
    const delay = chosen.length > 1 ? Math.floor((i / chosen.length) * arriveSpreadMs) : 0;
    return (async () => {
      if (delay > 0) await sleep(delay);
      try {
        return await runVirtualStudent({
          apiBase,
          token,
          testId,
          problemIds,
          saveCount,
          saveIntervalMs,
          recorders,
        });
      } catch (e) {
        return { ok: false, phase: 'exception', error: e.message };
      }
    })();
  });

  const results = await Promise.all(tasks);
  const wallMs = Date.now() - wallStart;
  const failedStudents = results.filter((r) => !r.ok).length;

  const totalRequests = recorders.start.count + recorders.session.count + recorders.submit.count;
  const totalErrors = recorders.start.errors + recorders.session.errors + recorders.submit.errors;

  return {
    level,
    studentsRequested: level,
    studentsRun: chosen.length,
    studentsFailed: failedStudents,
    wallMs,
    totalRequests,
    totalErrors,
    overallErrorRate: totalRequests ? totalErrors / totalRequests : 0,
    reqPerSec: wallMs > 0 ? Math.round((totalRequests / (wallMs / 1000)) * 10) / 10 : 0,
    phases: {
      start: recorders.start.summary(),
      session: recorders.session.summary(),
      submit: recorders.submit.summary(),
    },
  };
}

module.exports = { runLevel };
