/** Small convex solids, projected locally. No renderer, network or WebGL. */
export type Point = readonly [number, number, number];
type Dimension = { from: Point; to: Point; label: string };
type Solid = { vertices: Point[]; faces: number[][]; dimensions: Dimension[] };
export const SOLIDS = [
  { name: "Куб", formula: "$V=a^3$", dimensions: "$a$ — ирмэг" },
  { name: "Конус", formula: "$V=\\frac{1}{3}\\pi r^2h$", dimensions: "$r$ — радиус, $h$ — өндөр" },
  { name: "Бөмбөрцөг", formula: "$V=\\frac{4}{3}\\pi r^3$", dimensions: "$r$ — радиус" },
] as const;
export const INITIAL_VIEW = { yaw: -0.56, pitch: -0.27 };

const cube: Solid = {
  vertices: [[-0.8, -0.8, -0.8], [0.8, -0.8, -0.8], [0.8, -0.8, 0.8], [-0.8, -0.8, 0.8], [-0.8, 0.8, -0.8], [0.8, 0.8, -0.8], [0.8, 0.8, 0.8], [-0.8, 0.8, 0.8]],
  faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
  dimensions: [{ from: [-0.8, -0.8, 0.8], to: [0.8, -0.8, 0.8], label: "a" }],
};
function cone(): Solid {
  const count = 40;
  const vertices: Point[] = Array.from({ length: count }, (_, i) => [Math.cos(i * 2 * Math.PI / count) * 0.9, -0.75, Math.sin(i * 2 * Math.PI / count) * 0.9]);
  vertices.push([0, 1.05, 0]);
  return {
    vertices,
    faces: [Array.from({ length: count }, (_, i) => i), ...Array.from({ length: count }, (_, i) => [i, count, (i + 1) % count])],
    dimensions: [{ from: [0, -0.75, 0], to: [0.9, -0.75, 0], label: "r" }, { from: [0, -0.75, 0], to: [0, 1.05, 0], label: "h" }],
  };
}
function sphere(): Solid {
  const rows = 14, columns = 28, radius = 1;
  const vertices: Point[] = [];
  const faces: number[][] = [];
  for (let row = 0; row <= rows; row++) {
    const latitude = Math.PI * row / rows;
    for (let column = 0; column < columns; column++) {
      const longitude = Math.PI * 2 * column / columns;
      vertices.push([radius * Math.sin(latitude) * Math.cos(longitude), radius * Math.cos(latitude), radius * Math.sin(latitude) * Math.sin(longitude)]);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const next = (column + 1) % columns;
      faces.push([row * columns + column, row * columns + next, (row + 1) * columns + next, (row + 1) * columns + column]);
    }
  }
  return { vertices, faces, dimensions: [{ from: [0, 0, 0], to: [1, 0, 0], label: "r" }] };
}
const meshes = [cube, cone(), sphere()];
function rotate([x, y, z]: Point, yaw: number, pitch: number): Point {
  const xx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const zz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return [xx, y * Math.cos(pitch) - zz * Math.sin(pitch), y * Math.sin(pitch) + zz * Math.cos(pitch)];
}
function project([x, y, z]: Point) {
  const perspective = 5 / (5 - z);
  return { x: 280 + x * perspective * 123, y: 177 - y * perspective * 123 };
}
function cross(a: Point, b: Point): Point {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const pointString = ({ x, y }: { x: number; y: number }) => `${x.toFixed(2)} ${y.toFixed(2)}`;

export function drawSolid(index: number, yaw: number, pitch: number) {
  const mesh = meshes[index] ?? meshes[0];
  const rotated = mesh.vertices.map((point) => rotate(point, yaw, pitch));
  const projected = rotated.map(project);
  const shades = Array<string>(8).fill("");
  const frontEdges = new Set<string>();
  const allEdges = new Set<string>();
  const center = rotate(index === 1 ? [0, -0.15, 0] : [0, 0, 0], yaw, pitch);
  for (const face of mesh.faces) {
    const points = face.map((i) => rotated[i]);
    // Pole quads have two coincident points, so pick a non-degenerate normal.
    let normal = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    if (Math.hypot(...normal) < 1e-8) normal = cross(subtract(points[2], points[0]), subtract(points[3], points[0]));
    const mean = (axis: number) => points.reduce((total, point) => total + point[axis], 0) / points.length;
    const centroid: Point = [mean(0), mean(1), mean(2)];
    if (dot(normal, subtract(centroid, center)) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    const visible = dot(normal, subtract([0, 0, 5], centroid)) > 0;
    for (let edge = 0; edge < face.length; edge++) {
      const indices = [face[edge], face[(edge + 1) % face.length]].sort((a, b) => a - b);
      const key = indices.join(":");
      allEdges.add(key);
      if (visible) frontEdges.add(key);
    }
    if (!visible) continue;
    const brightness = dot(normal, [-0.4, 0.7, 0.65]) / (Math.hypot(...normal) || 1);
    const shade = Math.max(0, Math.min(7, Math.floor((brightness + 1) * 3.5)));
    shades[shade] += `M${face.map((i) => pointString(projected[i])).join("L")}Z`;
  }
  let front = "", back = "";
  for (const key of allEdges) {
    const [a, b] = key.split(":").map(Number);
    const path = `M${pointString(projected[a])}L${pointString(projected[b])}`;
    if (frontEdges.has(key)) front += path;
    else back += path;
  }
  const dimensions = mesh.dimensions.map(({ from, to, label }) => {
    const a = project(rotate(from, yaw, pitch)), b = project(rotate(to, yaw, pitch));
    return { label, path: `M${pointString(a)}L${pointString(b)}`, x: (a.x + b.x) / 2 + 8, y: (a.y + b.y) / 2 + 8 };
  });
  return { shades, front, back, dimensions };
}
