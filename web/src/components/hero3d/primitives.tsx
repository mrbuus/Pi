"use client";

import { Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThemeColors } from "./theme";

/* ============================================================================
 * Дахин ашиглагдах 3D барилгын блокууд: хэмжилтийн шугам, тэгш өнцгийн
 * тэмдэг, wireframe материалууд, дэвсгэрийн тоос.
 * ========================================================================== */

// Тэнхлэгийн дагуух хэмжилтийн шугам: нарийн цилиндр + хоёр үзүүрийн цэг.
// axis="y" бол босоо (өндөр), "x" бол хэвтээ (радиус/ирмэг).
export function MeasureLine({
  axis,
  from,
  to,
  at = [0, 0],
  color,
}: {
  axis: "x" | "y";
  from: number;
  to: number;
  at?: [number, number]; // y-шугамд [x,z], x-шугамд [y,z]
  color: string;
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
        <meshBasicMaterial color={color} />
      </mesh>
      {[from, to].map((v) => (
        <mesh key={v} position={end(v)}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

// Хоёр шулуун перпендикуляр (90°) байгааг заасан жижиг дөрвөлжин тэмдэг —
// хоёр хэмжилтийн шугамын өнцгийн буланд байрлана.
export function RightAngleMark({
  corner,
  size,
  color,
}: {
  corner: [number, number];
  size: number;
  color: string;
}) {
  const [cx, cy] = corner;
  return (
    <mesh position={[cx + size / 2, cy + size / 2, 0.002]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial visible={false} />
      <Edges color={color} />
    </mesh>
  );
}

// Муруй гадаргуутай биет (бөмбөрцөг, конус, цилиндр) — нягт wireframe нь
// өөрөө тод харагдана.
export function Wire({ colors }: { colors: ThemeColors }) {
  const emissive = useMemo(
    () => `#${new THREE.Color(colors.body).multiplyScalar(0.3).getHexString()}`,
    [colors.body],
  );
  return (
    <meshStandardMaterial
      color={colors.body}
      emissive={emissive}
      wireframe
      transparent
      opacity={0.8}
    />
  );
}

// Хавтгай талст биет (куб, призм, пирамид) — цөөн ирмэгтэй тул wireframe
// бүдэг гардаг: бүдэг дүүргэлт + Edges-ээр тод ирмэг зурна.
export function FlatWire({ colors }: { colors: ThemeColors }) {
  const emissive = useMemo(
    () => `#${new THREE.Color(colors.body).multiplyScalar(0.3).getHexString()}`,
    [colors.body],
  );
  return (
    <>
      <meshStandardMaterial
        color={colors.body}
        emissive={emissive}
        transparent
        opacity={0.16}
      />
      <Edges color={colors.soft} />
    </>
  );
}

export function Particles({ color }: { color: string }) {
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
      <pointsMaterial size={0.025} color={color} transparent opacity={0.6} />
    </points>
  );
}
