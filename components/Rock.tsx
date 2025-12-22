import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Dodecahedron, Text } from '@react-three/drei';
import { Player } from '@/lib/store';
import * as THREE from 'three';

interface RockProps {
  player: Player;
  isMe?: boolean;
}

export const Rock: React.FC<RockProps> = ({ player, isMe }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3(player.x, 0, player.y));

  // Update target position when prop changes
  React.useEffect(() => {
    targetPos.current.set(player.x, 0, player.y);
  }, [player.x, player.y]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Interpolate position for smooth movement (especially for remote players)
      // If it's me, the parent controller might set position directly, but here we render based on store/props
      // For smoother network sync, we lerp.
      meshRef.current.position.lerp(targetPos.current, delta * 10);

      // Rotate the rock slightly for effect
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={[player.x, 0, player.y]}>
      <Dodecahedron
        ref={meshRef}
        args={[player.size, 0]} // radius, detail (0 for low poly rock look)
        position={[0, 0, 0]} // Local position
      >
        <meshStandardMaterial color={player.color} roughness={0.8} />
      </Dodecahedron>
      <Text
        position={[0, player.size + 1, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {player.name}
      </Text>
    </group>
  );
};
