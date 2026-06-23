"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Knot() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (mesh.current) {
      mesh.current.rotation.x += dt * 0.12;
    }
  });
  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[1.05, 0.3, 240, 40]} />
      <meshStandardMaterial
        color="#4f7fe6"
        emissive="#1b3a7a"
        wireframe
        transparent
        opacity={0.85}
      />
    </mesh>
  );
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#9db8f5" transparent opacity={0.6} />
    </points>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.8], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={80} color="#7fa4ff" />
      <pointLight position={[-5, -3, 2]} intensity={40} color="#34d6a8" />
      <Knot />
      <Particles />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.1}
      />
    </Canvas>
  );
}
