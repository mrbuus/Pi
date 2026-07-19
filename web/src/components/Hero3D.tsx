"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* ============================================================================
 * Өдрийн 3D биет (Шийдвэр 10) — нүүр хуудасны 3D элемент өдөр бүр өөр
 * огторгуйн биет байна: хэмжигдэхүүн нь (өндөр h, радиус r, ирмэг a) өөр
 * өнгөөр ялгарч, хүүхэд өдөр тутам орохдоо биетүүдийг аяндаа таньж сурна.
 *
 * «Бага энерги — их бүтээмж» зарчим:
 *   - Сервер огт оролцохгүй: биет = каталог[УБ-ын огноо % урт] — бүх хэрэглэгчид
 *     ижил өдөр ижил биет, API дуудлага 0, хадгалалт 0 байт
 *   - Модель файл татахгүй — Three.js-ийн бэлэн геометрүүд (сүлжээний ачаалал ~0)
 *   - prefers-reduced-motion үед автомат эргэлтгүй + frameloop="demand"
 *     (зөвхөн хэрэглэгч эргүүлэх үед л рендерлэнэ — батарей хэмнэнэ)
 * ========================================================================== */

const BODY = "#4f7fe6"; // биеийн wireframe — брэндийн хөх
const MEASURE = "#2dd4a8"; // ялгарах хэмжигдэхүүн — ногоон

// Тэнхлэгийн дагуух хэмжилтийн шугам: нарийн цилиндр + хоёр үзүүрийн цэг.
// axis="y" бол босоо (өндөр), "x" бол хэвтээ (радиус/ирмэг).
function MeasureLine({
  axis,
  from,
  to,
  at = [0, 0],
}: {
  axis: "x" | "y";
  from: number;
  to: number;
  at?: [number, number]; // y-шугамд [x,z], x-шугамд [y,z]
}) {
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;
  const pos: [number, number, number] =
    axis === "y" ? [at[0], mid, at[1]] : [mid, at[0], at[1]];
  const rot: [number, number, number] =
    axis === "y" ? [0, 0, 0] : [0, 0, Math.PI / 2];
  const end = (v: number): [number, number, number] =>
    axis === "y" ? [at[0], v, at[1]] : [v, at[0], at[1]];
  return (
    <group>
      <mesh position={pos} rotation={rot}>
        <cylinderGeometry args={[0.022, 0.022, len, 8]} />
        <meshBasicMaterial color={MEASURE} />
      </mesh>
      {[from, to].map((v) => (
        <mesh key={v} position={end(v)}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color={MEASURE} />
        </mesh>
      ))}
    </group>
  );
}

interface Solid {
  title: string;
  measure: string; // ногоон шугам юуг заадаг вэ
  formula: string;
  render: () => React.ReactNode;
}

// Сургалтын хөтөлбөрийн үндсэн биетүүд — өдөр бүр дараагийнх нь гарна
const CATALOG: Solid[] = [
  {
    title: "Куб",
    measure: "ногоон шугам — ирмэг a",
    formula: "V = a³",
    render: () => (
      <>
        <mesh>
          <boxGeometry args={[1.7, 1.7, 1.7]} />
          <FlatWire />
        </mesh>
        <MeasureLine axis="y" from={-0.85} to={0.85} at={[0.85, 0.85]} />
      </>
    ),
  },
  {
    title: "Тэгш өнцөгт параллелепипед",
    measure: "ногоон шугам — өндөр h",
    formula: "V = a·b·h",
    render: () => (
      <>
        <mesh>
          <boxGeometry args={[2.1, 1.2, 1.4]} />
          <FlatWire />
        </mesh>
        <MeasureLine axis="y" from={-0.6} to={0.6} at={[1.05, 0.7]} />
      </>
    ),
  },
  {
    title: "Гурвалжин призм",
    measure: "ногоон шугам — өндөр h",
    formula: "V = S·h",
    render: () => (
      <>
        <mesh>
          <cylinderGeometry args={[1.15, 1.15, 1.7, 3]} />
          <FlatWire />
        </mesh>
        <MeasureLine axis="y" from={-0.85} to={0.85} />
      </>
    ),
  },
  {
    title: "Дөрвөн өнцөгт пирамид",
    measure: "ногоон шугам — өндөр h",
    formula: "V = ⅓·S·h",
    render: () => (
      <>
        <mesh position={[0, -0.1, 0]}>
          <coneGeometry args={[1.35, 1.7, 4]} />
          <FlatWire />
        </mesh>
        <MeasureLine axis="y" from={-0.95} to={0.75} />
      </>
    ),
  },
  {
    title: "Конус",
    measure: "ногоон шугам — өндөр h",
    formula: "V = ⅓·π·r²·h",
    render: () => (
      <>
        <mesh position={[0, -0.05, 0]}>
          <coneGeometry args={[1.1, 1.8, 48]} />
          <Wire />
        </mesh>
        <MeasureLine axis="y" from={-0.95} to={0.85} />
      </>
    ),
  },
  {
    title: "Цилиндр",
    measure: "ногоон шугам — өндөр h",
    formula: "V = π·r²·h",
    render: () => (
      <>
        <mesh>
          <cylinderGeometry args={[1.0, 1.0, 1.7, 48]} />
          <Wire />
        </mesh>
        <MeasureLine axis="y" from={-0.85} to={0.85} />
      </>
    ),
  },
  {
    title: "Бөмбөрцөг",
    measure: "ногоон шугам — радиус r",
    formula: "V = 4⁄3·π·r³",
    render: () => (
      <>
        <mesh>
          <sphereGeometry args={[1.4, 28, 20]} />
          <Wire />
        </mesh>
        <MeasureLine axis="x" from={0} to={1.4} />
      </>
    ),
  },
];

// Муруй гадаргуутай биет (бөмбөрцөг, конус, цилиндр) — нягт wireframe нь
// өөрөө тод харагдана (knot-той ижил aesthetic)
function Wire() {
  return (
    <meshStandardMaterial
      color={BODY}
      emissive="#1b3a7a"
      wireframe
      transparent
      opacity={0.8}
    />
  );
}

// Хавтгай талст биет (куб, призм, пирамид) — цөөн ирмэгтэй тул wireframe
// бүдэг гардаг: бүдэг дүүргэлт + Edges-ээр тод ирмэг зурна
function FlatWire() {
  return (
    <>
      <meshStandardMaterial
        color={BODY}
        emissive="#1b3a7a"
        transparent
        opacity={0.16}
      />
      <Edges color="#7fa4ff" />
    </>
  );
}

// УБ-ын өдрөөр детерминистик сонголт — бүх хэрэглэгчид ижил өдөр ижил биет
export function solidOfDay(date = new Date()): Solid {
  const key = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" })
      .format(date)
      .replaceAll("-", ""),
  );
  return CATALOG[key % CATALOG.length];
}

function Particles() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 350;
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      values[i] = (x - Math.floor(x) - 0.5) * 9;
    }
    return values;
  }, []);
  useFrame((_, dt) => {
    if (points.current) points.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#9db8f5" transparent opacity={0.6} />
    </points>
  );
}

export default function Hero3D() {
  const solid = useMemo(() => solidOfDay(), []);
  // Хөдөлгөөн багасгах тохиргоотой хэрэглэгчид авто эргэлтгүй, зөвхөн
  // өөрөө эргүүлэх үед рендерлэнэ (сул төхөөрөмжид ч хөнгөн)
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <>
      {/* Canvas-ыг absolute давхаргад хийнэ: canvas инлайн px өргөнөө layout-д
          тулгаж grid баганыг томруулдаг (агшихад түгждэг) асуудлыг таслана —
          хэмжээ нь зөвхөн эцэг wrapper-ийн CSS-ээс тодорно */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0.4, 3.9], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          frameloop={reducedMotion ? "demand" : "always"}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={80} color="#7fa4ff" />
          <pointLight position={[-5, -3, 2]} intensity={40} color="#34d6a8" />
          {/* Биетийг багасгаж дээшлүүлнэ — доод тайлбарын карт халхлахгүй (Ё) */}
          <group scale={0.72} position={[0, 0.55, 0]}>
            {solid.render()}
          </group>
          {!reducedMotion && <Particles />}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={!reducedMotion}
            autoRotateSpeed={1.1}
          />
        </Canvas>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[#060c1d]/82 px-4 py-3 text-left shadow-xl shadow-black/25 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft">
              Өдрийн 3D жишээ
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-ink">
              {solid.title}
            </p>
          </div>
          <span className="rounded-full bg-brand-bright/15 px-3 py-1 font-serif text-sm font-bold text-brand-soft">
            {solid.formula}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-dim">
          {solid.measure.replace("ногоон шугам — ", "Ногоон шугам: ")}
        </p>
      </div>
    </>
  );
}
