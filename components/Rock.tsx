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

  // Interpolation state
  const prevPos = useRef(new THREE.Vector3(player.x, 0, player.y));
  const nextPos = useRef(new THREE.Vector3(player.x, 0, player.y));
  const lastUpdateTime = useRef(0);

  // When props change (new server update), update our buffers
  React.useEffect(() => {
    if (isMe) {
        // For local player, just snap to latest state immediately in buffer to avoid logic conflict
        // (though we might handle isMe separately in useFrame)
        nextPos.current.set(player.x, 0, player.y);
    } else {
        // For remote players, record where we were, and where we are going
        if (groupRef.current) {
            prevPos.current.copy(groupRef.current.position);
        }
        nextPos.current.set(player.x, 0, player.y);
        lastUpdateTime.current = Date.now();
    }
  }, [player.x, player.y, isMe]);

  useFrame((state, delta) => {
    if (groupRef.current) {
        if (isMe) {
            // Local player: lerp fast to input state for responsiveness
            // We use the prop directly or the nextPos buffer which is updated by props
            // Actually, for isMe, it's better to just snap or lerp very fast to reduce input lag perception
            // The prop 'player' is updated every frame in GameScene for 'isMe', so it is already the "current physics state".
            // Lerping here just smoothes the visual if the physics update was large.
            groupRef.current.position.lerp(nextPos.current, delta * 20);
        } else {
            // Remote player: Interpolate over time
            const now = Date.now();
            const timeSinceUpdate = now - lastUpdateTime.current;
            const updateInterval = 350; // Expected update rate (~333ms) + buffer

            // Progress 0..1
            let alpha = timeSinceUpdate / updateInterval;
            if (alpha > 1) alpha = 1;

            // Simple Linear Interpolation
            groupRef.current.position.lerpVectors(prevPos.current, nextPos.current, alpha);
        }
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
