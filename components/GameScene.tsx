'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Grid } from '@react-three/drei';
import { useGameStore, Player, FoodItem } from '@/lib/store';
import { Rock } from './Rock';
import { Food } from './Food';
import { databases, client, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID, APPWRITE_FOOD_COLLECTION_ID } from '@/lib/appwrite';
import * as THREE from 'three';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';
import { v4 as uuidv4 } from 'uuid';

interface GameSceneProps {
  joystickData: IJoystickUpdateEvent | null;
}

const MAP_SIZE = 100;

const GameLogic: React.FC<GameSceneProps> = ({ joystickData }) => {
  const { myId, players, food, updatePlayer, removeFood, updateFood } = useGameStore();
  const { camera } = useThree();
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

  // Spawn food logic (Master-less: Probabilistic spawning by players)
  useFrame(() => {
    // Only spawn if total food is low and I am "lucky" (to avoid everyone spawning at once)
    const foodCount = Object.keys(food).length;
    if (foodCount < 50 && Math.random() < 0.01) {
       const id = uuidv4();
       const newFood: FoodItem = {
           id,
           x: (Math.random() - 0.5) * MAP_SIZE,
           y: (Math.random() - 0.5) * MAP_SIZE,
           color: `hsl(${Math.random() * 360}, 70%, 60%)`
       };
       // Optimistic update
       updateFood(newFood);

       databases.createDocument(
           APPWRITE_DATABASE_ID,
           APPWRITE_FOOD_COLLECTION_ID,
           id,
           newFood
       ).catch(e => {
           // If it fails (permission etc), remove it
           removeFood(id);
       });
    }
  });

  useFrame((state, delta) => {
    if (!myId || !players[myId]) return;

    const me = players[myId];
    if (me.status === 'dead') return;

    let moveX = 0;
    let moveZ = 0;
    const speed = 5 * (10 / (me.size + 5));

    if (joystickData) {
      if (joystickData.x) moveX = joystickData.x * speed * delta;
      if (joystickData.y) moveZ = -joystickData.y * speed * delta;
    } else {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mousePos.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);

      if (target) {
        const direction = new THREE.Vector3().subVectors(target, new THREE.Vector3(me.x, 0, me.y));
        if (direction.length() > 0.5) {
            direction.normalize();
            moveX = direction.x * speed * delta;
            moveZ = direction.z * speed * delta;
        }
      }
    }

    // Boundary check
    const nextX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, me.x + moveX));
    const nextY = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, me.y + moveZ));

    const newMe = { ...me, x: nextX, y: nextY };
    updatePlayer(newMe);

    // Camera follow - Centered on player
    const camOffset = new THREE.Vector3(0, Math.max(10, me.size * 5), Math.max(10, me.size * 5));
    const targetCamPos = new THREE.Vector3(nextX, 0, nextY).add(camOffset);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(nextX, 0, nextY);

    // Eating Food
    Object.values(food).forEach(f => {
        const dist = Math.sqrt(Math.pow(me.x - f.x, 2) + Math.pow(me.y - f.y, 2));
        if (dist < me.size) {
            // Eat food
            removeFood(f.id);
            const grownMe = { ...newMe, size: Math.sqrt(me.size * me.size + 0.1) }; // Grow slightly
            updatePlayer(grownMe);

            // Server delete
            databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_FOOD_COLLECTION_ID,
                f.id
            ).catch(console.error);
        }
    });

    // Eating Players & Being Eaten
    Object.values(players).forEach(other => {
        if (other.id !== me.id && other.status === 'alive') {
            const dist = Math.sqrt(Math.pow(me.x - other.x, 2) + Math.pow(me.y - other.y, 2));

            // Eat logic
            if (dist < me.size && me.size > other.size * 1.1) {
                const newSize = Math.sqrt(me.size * me.size + other.size * other.size);
                updatePlayer({ ...newMe, size: newSize });
                updatePlayer({ ...other, status: 'dead' });
            }

            // Die logic
            if (dist < other.size && other.size > me.size * 1.1) {
                 updatePlayer({ ...me, status: 'dead' });
                 databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_ID,
                    me.id,
                    { status: 'dead' }
                 ).catch(console.error);
            }
        }
    });

    // Server Sync
    const now = Date.now();
    if (now - lastUpdate > 100) {
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

      {/* Improved Grid */}
      <Grid
        args={[MAP_SIZE, MAP_SIZE]}
        position={[0, -0.1, 0]}
        cellColor="gray"
        sectionColor="white"
        sectionThickness={1}
        cellThickness={0.5}
        fadeDistance={50}
        infiniteGrid={false}
      />

      {Object.values(food).map((f) => (
          <Food key={f.id} {...f} />
      ))}

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
