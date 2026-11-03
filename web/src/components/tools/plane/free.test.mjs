// free.ts — динамик геометрийн загварыг шалгана
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve, nextName, removeWithDependents, removeLast, hitTest, measures, snap, intersections } from "./free.ts";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const pt = (id, x, y, name) => ({ id, t: "point", x, y, name });

test("дунд цэг, хэрчим, тойрог, хэмжээс", () => {
  const objs = [pt(1, 0, 0, "A"), pt(2, 4, 0, "B"), pt(3, 4, 3, "C"), { id: 4, t: "segment", a: 1, b: 3 }, { id: 5, t: "midpoint", a: 1, b: 2, name: "M" }, { id: 6, t: "polygon", pts: [1, 2, 3] }, { id: 7, t: "angle", a: 1, b: 2, c: 3 }];
  const r = resolve(objs);
  assert.deepEqual(r.get(5).p, { x: 2, y: 0 });
  const ms = measures(objs, r);
  assert.ok(ms.some((m) => m.tex === "AC=5"));
  assert.ok(ms.some((m) => m.tex.startsWith("S_{ABC}=6")));
  assert.ok(ms.some((m) => m.tex === "\\angle ABC=90^\\circ"));
});

test("цэг чирэхэд хамааралтай объект шинэчлэгдэнэ", () => {
  let objs = [pt(1, 0, 0, "A"), pt(2, 2, 0, "B"), { id: 3, t: "midpoint", a: 1, b: 2, name: "C" }];
  assert.deepEqual(resolve(objs).get(3).p, { x: 1, y: 0 });
  objs = objs.map((o) => (o.id === 2 ? { ...o, x: 6, y: 4 } : o));
  assert.deepEqual(resolve(objs).get(3).p, { x: 3, y: 2 });
});

test("перпендикуляр, параллель, биссектрис", () => {
  const objs = [pt(1, 0, 0, "A"), pt(2, 4, 0, "B"), pt(3, 1, 3, "C"), { id: 4, t: "line", a: 1, b: 2 }, { id: 5, t: "perp", line: 4, p: 3 }, { id: 6, t: "parallel", line: 4, p: 3 }, { id: 7, t: "intersect", o1: 4, o2: 5, idx: 0, name: "H" }, { id: 8, t: "bisector", a: 2, b: 1, c: 3 }];
  const r = resolve(objs);
  const H = r.get(7).p;
  near(H.x, 1); near(H.y, 0);
  const par = r.get(6);
  near(par.b.y - par.a.y, 0);
  const bis = r.get(8);
  const ang = (Math.atan2(bis.b.y - bis.a.y, bis.b.x - bis.a.x) * 180) / Math.PI;
  near(ang, (Math.atan2(3, 1) * 180) / Math.PI / 2);
  // параллель ба шулуун огтлолцохгүй
  const objs2 = [...objs, { id: 9, t: "intersect", o1: 4, o2: 6, idx: 0, name: "X" }];
  assert.equal(resolve(objs2).has(9), false);
});

test("тойрог-тойрог, тойрог-хэрчим огтлолцол", () => {
  const objs = [pt(1, 0, 0, "A"), pt(2, 5, 0, "B"), pt(3, 8, 0, "C"), pt(4, 3, 0, "D"), { id: 5, t: "circle", c: 1, p: 2 }, { id: 6, t: "circle", c: 3, p: 4 }, { id: 7, t: "intersect", o1: 5, o2: 6, idx: 0, name: "E" }, { id: 8, t: "intersect", o1: 5, o2: 6, idx: 1, name: "F" }];
  const r = resolve(objs);
  near(r.get(7).p.x, 4); near(Math.abs(r.get(7).p.y), 3);
  near(r.get(7).p.y, -r.get(8).p.y);
  // хэрчмийн гадна огтлолцол тооцогдохгүй
  const segRes = { k: "lin", kind: "segment", a: { x: 0, y: 0 }, b: { x: 1, y: 0 } };
  const circ = { k: "circ", c: { x: 0, y: 0 }, r: 5 };
  assert.equal(intersections(segRes, circ).length, 0);
  assert.equal(intersections({ ...segRes, kind: "line" }, circ).length, 2);
  assert.equal(intersections({ ...segRes, kind: "ray" }, circ).length, 1);
});

test("нэр, устгах", () => {
  const objs = [pt(1, 0, 0, "A"), pt(2, 1, 0, "B"), pt(3, 1, 1, "D")];
  assert.equal(nextName(objs), "C");
  const many = Array.from({ length: 26 }, (_, i) => pt(i + 1, i, 0, String.fromCharCode(65 + i)));
  assert.equal(nextName(many), "A_1");
  const chain = [pt(1, 0, 0, "A"), pt(2, 1, 0, "B"), { id: 3, t: "segment", a: 1, b: 2 }, { id: 4, t: "midpoint", a: 1, b: 2, name: "M" }, pt(5, 3, 3, "C"), { id: 6, t: "segment", a: 4, b: 5 }];
  assert.deepEqual(removeWithDependents(chain, 1).map((o) => o.id), [2, 5]);
  assert.deepEqual(removeLast(chain).map((o) => o.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(removeLast([]), []);
});

test("цэг/шугам онох, торонд наалдуулах", () => {
  const objs = [pt(1, 0, 0, "A"), pt(2, 10, 0, "B"), { id: 3, t: "segment", a: 1, b: 2 }];
  const r = resolve(objs);
  assert.equal(hitTest(objs, r, { x: 0.1, y: 0.1 }, 0.5, 0.3).id, 1);
  const h = hitTest(objs, r, { x: 5, y: 0.2 }, 0.5, 0.3);
  assert.equal(h.id, 3);
  assert.equal(hitTest(objs, r, { x: 5, y: 2 }, 0.5, 0.3), null);
  assert.deepEqual(snap({ x: 1.26, y: -0.74 }, 0.5), { x: 1.5, y: -0.5 });
});

test("хэрчмээр хүрээ хаагдахад олон өнцөгт үүснэ, давхарлахгүй", async () => {
  const { connect, polygonMetrics, hitPolygon } = await import("./free.ts");
  let objs = [pt(1, 0, 0, "A"), pt(2, 4, 0, "B"), pt(3, 4, 3, "C")];
  let r = connect(objs, 1, 2);
  assert.equal(r.polyId, null);
  r = connect(r.list, 2, 3);
  assert.equal(r.polyId, null);
  assert.equal(connect(r.list, 2, 3).list, r.list, "ижил хэрчим давхардахгүй");
  r = connect(r.list, 3, 1);
  assert.ok(r.polyId);
  const poly = r.list.find((o) => o.id === r.polyId);
  assert.deepEqual([...poly.pts].sort(), [1, 2, 3]);
  const res = resolve(r.list);
  const ms = polygonMetrics(r.list, res, r.polyId);
  assert.equal(ms[0].text, "Тэгш өнцөгт гурвалжин");
  near(ms.find((m) => m.name === "Талбай").rows[0].v.dec * 1, 6);
  near(ms.find((m) => m.name === "Периметр").rows[0].v.dec * 1, 12);
  const angs = ms.find((m) => m.name === "Өнцгүүд").rows.map((x) => x.v.dec);
  assert.ok(angs.includes("90^\\circ"));
  assert.equal(hitPolygon(r.list, res, { x: 3, y: 1 }), r.polyId);
  assert.equal(hitPolygon(r.list, res, { x: -1, y: 1 }), null);
  // дахин холбоход шинэ дүрс үүсэхгүй
  assert.equal(connect(r.list.filter((o) => !(o.t === "segment" && o.a === 3 && o.b === 1)), 3, 1).polyId, null);
});

test("дөрвөн өнцөгтийн төрөл", async () => {
  const { connect, polygonMetrics } = await import("./free.ts");
  let list = [pt(1, 0, 0, "A"), pt(2, 2, 0, "B"), pt(3, 2, 2, "C"), pt(4, 0, 2, "D")];
  for (const [a, b] of [[1, 2], [2, 3], [3, 4]]) list = connect(list, a, b).list;
  const r = connect(list, 4, 1);
  assert.equal(polygonMetrics(r.list, resolve(r.list), r.polyId)[0].text, "Квадрат");
});
