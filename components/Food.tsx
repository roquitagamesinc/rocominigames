import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Dodecahedron } from '@react-three/drei';
import * as THREE from 'three';

interface FoodProps {
  id: string;
  x: number;
  y: number;
  color: string;
}

export const Food: React.FC<FoodProps> = ({ x, y, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta;
    }
  });

  return (
    <Dodecahedron
      ref={meshRef}
      args={[0.3, 0]}
      position={[x, 0, y]}
    >
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </Dodecahedron>
  );
};
