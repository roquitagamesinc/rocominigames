'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import { useGameStore, Player } from '@/lib/store';
import { Rock } from './Rock';
import { databases, client, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID } from '@/lib/appwrite';
import * as THREE from 'three';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

interface GameSceneProps {
  joystickData: IJoystickUpdateEvent | null;
}

const GameLogic: React.FC<GameSceneProps> = ({ joystickData }) => {
  const { myId, players, updatePlayer, removePlayer } = useGameStore();
  const { camera, gl } = useThree();
  const [lastUpdate, setLastUpdate] = useState(0);

  // Mouse position tracking
  const mousePos = useRef(new THREE.Vector2());

  // Update mouse pos
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position (-1 to 1)
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!myId || !players[myId]) return;

    const me = players[myId];
    if (me.status === 'dead') return; // Do nothing if dead

    let moveX = 0;
    let moveZ = 0;
    const speed = 5 * (10 / (me.size + 5)); // Slower as you get bigger

    if (joystickData) {
      // Mobile / Joystick control
      if (joystickData.x) moveX = joystickData.x * speed * delta;
      if (joystickData.y) moveZ = -joystickData.y * speed * delta; // Joystick Y is inverted usually
    } else {
      // Mouse control (follow mouse on ground plane)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mousePos.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);

      if (target) {
        const direction = new THREE.Vector3().subVectors(target, new THREE.Vector3(me.x, 0, me.y));
        if (direction.length() > 0.5) { // Deadzone
            direction.normalize();
            moveX = direction.x * speed * delta;
            moveZ = direction.z * speed * delta;
        }
      }
    }

    const newX = me.x + moveX;
    const newY = me.y + moveZ; // Y in store is Z in 3D space usually, but let's map Store Y to 3D Z.

    // Update local store immediately for smooth prediction
    const newMe = { ...me, x: newX, y: newY };
    updatePlayer(newMe);

    // Camera follow
    camera.position.lerp(new THREE.Vector3(newX, Math.max(10, me.size * 5), newY + Math.max(10, me.size * 5)), 0.1);
    camera.lookAt(newX, 0, newY);

    // Eating Logic (Client Side Check)
    Object.values(players).forEach(other => {
        if (other.id !== me.id && other.status === 'alive') {
            const dist = Math.sqrt(Math.pow(me.x - other.x, 2) + Math.pow(me.y - other.y, 2));
            if (dist < me.size && me.size > other.size * 1.1) {
                // EAT!
                // Update local size
                const newSize = Math.sqrt(me.size * me.size + other.size * other.size); // Conservation of area-ish
                const grownMe = { ...newMe, size: newSize };
                updatePlayer(grownMe);

                // Mark other as dead locally to hide immediately
                updatePlayer({ ...other, status: 'dead' });

                // Sync eating to server
                // We update OUR size.
                // We ideally should update THEIR status to dead. Since we don't have server logic, we try to update their doc.
                // Note: This requires Row Level Security to allow users to update others, which is insecure.
                // For this tutorial, we assume permissions are open or we only update ourselves and they check if they are eaten.
                // Better approach for tutorial: Client B checks if it is overlapping Client A (who is bigger) and kills itself.
                // But latency... Let's try to update the victim if possible, or just rely on victim checking.
                // Let's implement victim checking: EVERYONE checks if they are being eaten.
            }
        }
    });

    // Victim check: Am I inside a bigger player?
    Object.values(players).forEach(other => {
        if (other.id !== me.id && other.status === 'alive') {
             const dist = Math.sqrt(Math.pow(me.x - other.x, 2) + Math.pow(me.y - other.y, 2));
             // If I am inside a bigger player
             if (dist < other.size && other.size > me.size * 1.1) {
                 // I died.
                 const deadMe = { ...me, status: 'dead' as const };
                 updatePlayer(deadMe);
                 // Send update to server
                 databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_ID,
                    me.id,
                    { status: 'dead' }
                 ).catch(console.error);
             }
        }
    });


    // Throttle server updates
    const now = Date.now();
    if (now - lastUpdate > 100) { // 10 updates per second
      setLastUpdate(now);
      databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        me.id,
        {
          x: newMe.x,
          y: newMe.y,
          size: newMe.size
        }
      ).catch((e) => console.error("Sync error", e));
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Grid for reference */}
      <gridHelper args={[200, 200]} position={[0, -0.1, 0]} />

      {Object.values(players).map((p) => (
        p.status === 'alive' && <Rock key={p.id} player={p} isMe={p.id === myId} />
      ))}
    </>
  );
};

export const GameScene: React.FC<GameSceneProps> = (props) => {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 20, 20]} />
        <GameLogic {...props} />
      </Canvas>
    </div>
  );
};
