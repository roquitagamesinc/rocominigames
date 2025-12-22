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
  const groupRef = useRef<THREE.Group>(null);

  // We use a target vector to lerp the GROUP position, not the mesh position.
  // The mesh should stay at 0,0,0 local to the group.
  const targetPos = useRef(new THREE.Vector3(player.x, 0, player.y));

  React.useEffect(() => {
    targetPos.current.set(player.x, 0, player.y);
  }, [player.x, player.y]);

  useFrame((state, delta) => {
    // Lerp the whole group for smooth movement
    if (groupRef.current) {
        // If it's me, we might want instant movement to avoid input lag feel,
        // but for consistency with the camera (which lerps), we can lerp here too.
        // However, since the parent component updates props based on input,
        // and we want the rock to be exactly where the logic thinks it is for collision visual,
        // we might just want to set it directly or lerp very fast.

        // Actually, the previous bug was: Group was at X,Y and Mesh was lerping to X,Y (local).
        // Correct approach: Group is at X,Y. Mesh is at 0,0,0.
        // To smooth remote players: We can use the Group lerp.

        groupRef.current.position.lerp(targetPos.current, delta * 15);
    }

    if (meshRef.current) {
      // Just rotate the rock mesh locally
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[player.x, 0, player.y]}>
      <Dodecahedron
        ref={meshRef}
        args={[player.size, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={player.color} roughness={0.8} />
      </Dodecahedron>
      <Text
        position={[0, player.size + 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5 + (player.size * 0.1)} // Scale text slightly with player
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {player.name}
      </Text>
    </group>
  );
};
