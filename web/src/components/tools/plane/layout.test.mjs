// layout.ts — шошгын давхцал зайлуулалт
import assert from "node:assert/strict";
import { test } from "node:test";
import { placeLabels, textSize, boxSegHit, countOverlaps } from "./layout.ts";

const boxes = (reqs, placed) => placed.map((p, i) => ({ x: p.x, y: p.y, w: reqs[i].w, h: reqs[i].h }));

test("бичвэрийн хэмжээ: урт бичвэр өргөн, доод индекс өндөр", () => {
  assert.ok(textSize("53.1^\\circ", 14).w > textSize("5", 14).w);
  assert.ok(textSize("A_1", 16).h > textSize("A", 16).h);
});

test("хэрчим хайрцгийг огтлох", () => {
  const b = { x: 50, y: 50, w: 20, h: 10 };
  assert.equal(boxSegHit(b, { x1: 0, y1: 50, x2: 100, y2: 50 }), true);
  assert.equal(boxSegHit(b, { x1: 0, y1: 0, x2: 100, y2: 0 }), false);
});

test("нэг цэгт олон шошго — давхцахгүй", () => {
  const reqs = Array.from({ length: 6 }, () => ({ ax: 200, ay: 200, dx: 1, dy: 0, gap: 6, w: 30, h: 16 }));
  const pl = placeLabels(reqs, [], [], 400, 400);
  assert.equal(countOverlaps(boxes(reqs, pl)), 0);
});

test("шошго шугамыг огтлохгүй, хүрээнд багтана", () => {
  const segs = [{ x1: 0, y1: 100, x2: 400, y2: 100 }];
  const reqs = [{ ax: 200, ay: 100, dx: 0, dy: 1, gap: 4, w: 40, h: 16, spread: Math.PI / 5, flipCost: 3 }];
  const [p] = placeLabels(reqs, segs, [], 400, 400);
  assert.equal(boxSegHit({ x: p.x, y: p.y, w: 40, h: 16 }, segs[0]), false);
  assert.ok(p.ideal && p.y > 100);
  // хүрээний захад — дотогш шилжинэ
  const [q] = placeLabels([{ ax: 395, ay: 200, dx: 1, dy: 0, gap: 6, w: 30, h: 16 }], [], [], 400, 400);
  assert.ok(q.x + 15 <= 400);
});

test("өнцгийн жижиг завсар: хоёр цацрагийн хооронд холдож багтана", () => {
  const segs = [{ x1: 0, y1: 0, x2: 400, y2: 0 }, { x1: 0, y1: 0, x2: 400, y2: 100 }];
  const reqs = [{ ax: 0, ay: 0, dx: Math.cos(0.12), dy: Math.sin(0.12), gap: 24, w: 34, h: 15, spread: 0.08, flipCost: 4, reach: [0, 6, 14, 24, 36, 52, 72, 100, 140] }];
  const [p] = placeLabels(reqs, segs, [], 400, 400);
  const b = { x: p.x, y: p.y, w: 34, h: 15 };
  assert.ok(!boxSegHit(b, segs[0]) && !boxSegHit(b, segs[1]));
});
