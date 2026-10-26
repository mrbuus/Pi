// drag.ts — зураг дээр чирэх
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDrag, settlePose } from "./drag.ts";
import { DEFAULT_PARAMS } from "./shapes.ts";

const P = (x) => ({ ...DEFAULT_PARAMS, ...x });

test("гурвалжны оройг чирэхэд 3 тал", () => {
  const verts = [{ x: 0, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 }];
  const r = applyDrag(P({ shape: "triangle" }), "C", { x: 4.02, y: 0 }, verts);
  assert.equal(r.p.triKind, "sss");
  assert.deepEqual([r.p.a, r.p.b, r.p.c], [4, 5, 3]);
  assert.equal(applyDrag(P({ shape: "triangle" }), "A", { x: 2, y: 0 }, verts), null); // хавтгай
});

test("бусад дүрс", () => {
  assert.deepEqual([applyDrag(P({ shape: "rectangle" }), "C", { x: 6.04, y: 2.5 }).p.rw, applyDrag(P({ shape: "rectangle" }), "C", { x: 6.04, y: 2.5 }).p.rh], [6, 2.5]);
  assert.equal(applyDrag(P({ shape: "circle", r: 4 }), "K", { x: 3, y: 4 }).p.r, 5);
  assert.equal(applyDrag(P({ shape: "parallelogram" }), "D", { x: 0, y: 3 }).p.palpha, 90);
});

test("тогтоосон байрлал: урт яг, чиглэл хадгалагдана", () => {
  const pose = [{ x: 1, y: 3.1 }, { x: 1, y: 1 }, { x: 1, y: 5 }];
  const s = settlePose({ a: 4, b: 5, c: 3 }, pose);
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  assert.ok(Math.abs(d(s[1], s[2]) - 4) < 1e-9 && Math.abs(d(s[0], s[1]) - 3) < 1e-9);
  assert.ok(Math.abs(s[2].x - 1) < 1e-9 && s[2].y > s[1].y);
});
