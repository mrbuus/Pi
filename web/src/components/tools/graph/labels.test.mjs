import assert from "node:assert/strict";
import { test } from "node:test";
import { placeLabels, shortNum, textWidth } from "./labels.ts";

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("ойрхон цэгүүдийн шошго давхцахгүй", () => {
  const reqs = Array.from({ length: 6 }, (_, i) => ({ px: 100 + i * 4, py: 100, w: 50, h: 14 }));
  const out = placeLabels(reqs, { w: 400, h: 300 });
  const ok = out.filter(Boolean);
  assert.ok(ok.length >= 4);
  for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) assert.ok(!overlap(ok[i], ok[j]));
});

test("хүрээнээс гарахгүй, хориглосон хэсэгт орохгүй", () => {
  const [a] = placeLabels([{ px: 395, py: 5, w: 60, h: 14 }], { w: 400, h: 300 });
  assert.ok(a && a.x >= 2 && a.x + a.w <= 398 && a.y >= 2);
  const blocked = [{ x: 0, y: 0, w: 400, h: 300 }];
  assert.equal(placeLabels([{ px: 50, py: 50, w: 20, h: 10 }], { w: 400, h: 300 }, blocked)[0], null);
});

test("тоо хэт олон оронгүй", () => {
  assert.equal(shortNum(2.0000001), "2");
  assert.equal(shortNum(-1), "−1");
  assert.equal(shortNum(3.60555), "3.61");
  assert.equal(shortNum(0.5), "0.5");
  assert.ok(textWidth("(2; −1)", 12) > 20);
});
