// geometry.ts-ийн ЖИНХЭНЭ кодыг импортлож шалгана (логикийг давтаж бичихгүй —
// давтвал эх код өөрчлөгдөхөд тест хуучирсан хэвээрээ «ногоон» үлдэнэ).
//
// Ажиллуулах:  node --test src/components/hero3d/
// Node 22 нь .ts-ийг төрлийг нь хуулаад шууд ачаална (type stripping).

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BODY_KEY,
  MESHES,
  buildPaths,
  meshOfIndex,
  project,
  ring,
} from "./geometry.ts";

test("проекц: эргэлт 0 үед орой төвдөө үлдэнэ", () => {
  const p = project([0, 0, 0], 0, 0, 4.2, 62, 100);
  assert.equal(p.x, 100);
  assert.equal(p.y, 100);
  assert.equal(p.z, 0);
});

test("перспектив: камерт ОЙР орой холоос нь ТОМ харагдана", () => {
  // Ижил x, өөр z. z эерэг = камерт ойр.
  const near = project([1, 0, 1], 0, 0, 4.2, 62, 100);
  const far = project([1, 0, -1], 0, 0, 4.2, 62, 100);
  const nearOffset = Math.abs(near.x - 100);
  const farOffset = Math.abs(far.x - 100);
  assert.ok(
    nearOffset > farOffset,
    `ойр орой (${nearOffset}) хол оройгоос (${farOffset}) том байх ёстой`,
  );
});

test("эргэлт: 90° эргэхэд x тэнхлэг z рүү шилжинэ", () => {
  const p = project([1, 0, 0], Math.PI / 2, 0, 4.2, 62, 100);
  // x' = x·cos + z·sin = 0 тул дэлгэц дээр төв рүү буулаа
  assert.ok(Math.abs(p.x - 100) < 1e-6);
  // z' = -x·sin + z·cos = -1 → камераас хол
  assert.ok(p.z < 0);
});

test("проекц хэзээ ч NaN/Infinity гаргахгүй (distance > |z|)", () => {
  for (let i = 0; i < MESHES.length; i++) {
    const mesh = meshOfIndex(i);
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * Math.PI * 2;
      for (const v of mesh.vertices) {
        const p = project(v, angle, -0.28, 4.2, 62, 100);
        assert.ok(
          Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
          `биет ${i}, өнцөг ${angle}: тоо биш утга гарлаа`,
        );
      }
    }
  }
});

test("ring: n орой, бүгд өгсөн радиус дээр, өгсөн өндөрт", () => {
  const r = 0.8;
  const pts = ring(6, r, 0.5);
  assert.equal(pts.length, 6);
  for (const [x, y, z] of pts) {
    assert.ok(Math.abs(Math.hypot(x, z) - r) < 1e-9);
    assert.equal(y, 0.5);
  }
});

test("бүх биет ирмэгтэй бөгөөд индекс нь хүрээнээсээ гарахгүй", () => {
  for (let i = 0; i < MESHES.length; i++) {
    const mesh = meshOfIndex(i);
    assert.ok(mesh.edges.length > 0, `биет ${i} ирмэггүй байна`);
    for (const e of mesh.edges) {
      assert.ok(
        e.a >= 0 && e.a < mesh.vertices.length,
        `биет ${i}: ирмэгийн a=${e.a} индекс хүрээнээс гарлаа`,
      );
      assert.ok(
        e.b >= 0 && e.b < mesh.vertices.length,
        `биет ${i}: ирмэгийн b=${e.b} индекс хүрээнээс гарлаа`,
      );
      assert.notEqual(e.a, e.b, `биет ${i}: ирмэг өөр дээрээ холбогдсон`);
    }
  }
});

test("meshOfIndex сөрөг ба хэт том индексийг хүрээнд оруулна", () => {
  assert.deepEqual(meshOfIndex(0).edges.length, meshOfIndex(MESHES.length).edges.length);
  assert.deepEqual(meshOfIndex(0).edges.length, meshOfIndex(-MESHES.length).edges.length);
});

test("buildPaths: ирмэг бүр урд эсвэл хойд хэсэгт ЯГ нэг удаа орно", () => {
  const mesh = meshOfIndex(0); // Куб
  const { back, front } = buildPaths(mesh, 0.6);
  const count = (map) =>
    [...map.values()].reduce((n, d) => n + (d.match(/M/g) ?? []).length, 0);
  assert.equal(count(back) + count(front), mesh.edges.length);
});

test("buildPaths: хэмжигдэхүүний ирмэг биеийн ирмэгээс ТУСДАА хэсэгт орно", () => {
  const mesh = meshOfIndex(6); // Цилиндр — m1 (радиус) ба m2 (өндөр)
  const { back, front } = buildPaths(mesh, 0.3);
  const keys = new Set([...back.keys(), ...front.keys()]);
  assert.ok(keys.has(BODY_KEY), "биеийн ирмэг байх ёстой");
  assert.ok(keys.has("m1"), "радиусын ирмэг тусдаа байх ёстой");
  assert.ok(keys.has("m2"), "өндрийн ирмэг тусдаа байх ёстой");
});

test("buildPaths: гаралт нь зөвхөн зөв тооноос бүрдсэн SVG зам", () => {
  for (let i = 0; i < MESHES.length; i++) {
    const { back, front } = buildPaths(meshOfIndex(i), 1.1);
    for (const d of [...back.values(), ...front.values()]) {
      assert.doesNotMatch(d, /NaN|Infinity|undefined/, `биет ${i}: эвдэрсэн зам`);
      assert.match(d, /^M[-\d.]+ [-\d.]+L[-\d.]+ [-\d.]+/);
    }
  }
});

test("эргэлт нь дүрсийг хавтгайруулж алга болгохгүй (rotateY-ийн хуучин алдаа)", () => {
  // Хуучин хувилбар хавтгай SVG-г rotateY хийдэг байсан тул 90°-д ЦЭГ болдог.
  // Жинхэнэ 3D бол ямар ч өнцөгт өргөнтэй хэвээрээ байх ёстой.
  const mesh = meshOfIndex(0); // Куб
  for (let step = 0; step < 12; step++) {
    const angle = (step / 12) * Math.PI * 2;
    const pts = mesh.vertices.map((v) => project(v, angle, -0.28, 4.2, 62, 100));
    const xs = pts.map((p) => p.x);
    const width = Math.max(...xs) - Math.min(...xs);
    assert.ok(width > 40, `өнцөг ${angle}: өргөн ${width.toFixed(1)} — хэт нарийслаа`);
  }
});
