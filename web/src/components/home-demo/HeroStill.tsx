import MathText from "@/components/MathText";
import styles from "./still.module.css";

// WebGL байхгүй, удаан сүлжээ эсвэл 3D ачаалж дуусаагүй үед харагдах
// сурах бичгийн куб: харагдахгүй ирмэг тасархай, диагональ, тэгш өнцөг.
const W = 400, H = 360;
const P = {
  A: [80, 300], B: [250, 300], C: [330, 240], D: [160, 240],
  A_1: [80, 130], B_1: [250, 130], C_1: [330, 70], D_1: [160, 70],
} as const;
type K = keyof typeof P;
const VISIBLE: [K, K][] = [["A", "B"], ["B", "B_1"], ["B_1", "A_1"], ["A_1", "A"], ["A_1", "D_1"], ["D_1", "C_1"], ["C_1", "B_1"], ["B", "C"], ["C", "C_1"]];
const HIDDEN: [K, K][] = [["A", "D"], ["D", "C"], ["D", "D_1"]];
// оройн нэрийг төвөөс гадагш түлхэх чиглэл
const NUDGE: Record<K, [number, number]> = {
  A: [-16, 14], B: [6, 18], C: [18, 10], D: [-14, -14],
  A_1: [-18, -10], B_1: [-4, -18], C_1: [16, -14], D_1: [-10, -18],
};

const line = (a: K, b: K) => ({ x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1] });

// C дээрх тэгш өнцөг: CA ба CC_1 чиглэлд 14 нэгж
function rightMark() {
  const [cx, cy] = P.C, u = [P.A[0] - cx, P.A[1] - cy], w = [P.C_1[0] - cx, P.C_1[1] - cy];
  const nu = Math.hypot(u[0], u[1]), nw = Math.hypot(w[0], w[1]), s = 14;
  const a = [cx + u[0] / nu * s, cy + u[1] / nu * s], c = [cx + w[0] / nw * s, cy + w[1] / nw * s];
  return `M${a[0]} ${a[1]} L${a[0] + c[0] - cx} ${a[1] + c[1] - cy} L${c[0]} ${c[1]}`;
}

const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

export default function HeroStill() {
  const mid = (a: K, b: K, dx = 0, dy = 0) => pct((P[a][0] + P[b][0]) / 2 + dx, (P[a][1] + P[b][1]) / 2 + dy);
  return (
    <div className={styles.still} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} fill="none" strokeLinecap="round">
        <ellipse cx="205" cy="318" rx="170" ry="22" fill="rgba(0,0,0,.28)" />
        <polygon points={[P.A, P.B, P.B_1, P.A_1].map((p) => p.join(",")).join(" ")} fill="rgba(201,215,242,.06)" />
        <polygon points={[P.A_1, P.B_1, P.C_1, P.D_1].map((p) => p.join(",")).join(" ")} fill="rgba(201,215,242,.10)" />
        <polygon points={[P.B, P.C, P.C_1, P.B_1].map((p) => p.join(",")).join(" ")} fill="rgba(201,215,242,.04)" />
        {HIDDEN.map(([a, b]) => <line key={a + b} {...line(a, b)} stroke="var(--dim)" strokeWidth="1.4" strokeDasharray="7 6" />)}
        {VISIBLE.map(([a, b]) => <line key={a + b} {...line(a, b)} stroke="var(--text)" strokeWidth="2" />)}
        <line {...line("A", "C")} stroke="var(--accent-2)" strokeWidth="1.8" strokeDasharray="7 5" />
        <line {...line("A", "C_1")} stroke="var(--accent-2)" strokeWidth="3" />
        <path d={rightMark()} stroke="var(--accent-2)" strokeWidth="1.6" />
        {(Object.keys(P) as K[]).map((k) => (
          <circle key={k} cx={P[k][0]} cy={P[k][1]} r="3.4" fill={k === "D" ? "var(--dim)" : "var(--text)"} />
        ))}
      </svg>
      {(Object.keys(P) as K[]).map((k) => (
        <span key={k} className={styles.lb} style={{ ...pct(P[k][0] + NUDGE[k][0], P[k][1] + NUDGE[k][1]), opacity: k === "D" ? .5 : 1 }}>
          <MathText>{`$${k}$`}</MathText>
        </span>
      ))}
      <span className={styles.lb} data-kind="em" style={mid("A", "C_1", 12, -14)}><MathText>{"$d$"}</MathText></span>
      <span className={styles.lb} data-kind="em" style={mid("A", "C", 4, 16)}><MathText>{"$a\\sqrt{2}$"}</MathText></span>
      <span className={styles.lb} style={mid("A", "B", 0, 22)}><MathText>{"$a$"}</MathText></span>
    </div>
  );
}
