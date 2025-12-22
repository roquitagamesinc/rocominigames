'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Grid } from '@react-three/drei';
import { useGameStore, Player, FoodItem } from '@/lib/store';
import { Rock } from './Rock';
import { Food } from './Food';
import { databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID, APPWRITE_FOOD_COLLECTION_ID } from '@/lib/appwrite';
import * as THREE from 'three';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';
import { v4 as uuidv4 } from 'uuid';

interface GameSceneProps {
  joystickData: IJoystickUpdateEvent | null;
}

const MAP_SIZE = 100;
const MAX_FOOD = 150; // Increased limit considerably

const GameLogic: React.FC<GameSceneProps> = ({ joystickData }) => {
  const { myId, players, food, updatePlayer, removeFood, updateFood, removePlayer } = useGameStore();
  const { camera } = useThree();

  // Refs for timers to avoid unnecessary re-renders
  const lastUpdate = useRef(0);
  const lastCleanup = useRef(0);
  const lastSpawnCheck = useRef(0);

  // Mouse position tracking
  const mousePos = useRef(new THREE.Vector2());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initial Camera Setup (Top Down)
  useEffect(() => {
      camera.rotation.set(-Math.PI / 2, 0, 0); // Look straight down
  }, [camera]);

  const spawnFood = () => {
       const id = uuidv4();
       const newFood: FoodItem = {
           id,
           x: (Math.random() - 0.5) * MAP_SIZE,
           y: (Math.random() - 0.5) * MAP_SIZE,
           color: `hsl(${Math.random() * 360}, 70%, 60%)`
       };
       // Optimistic Update
       updateFood(newFood);

       databases.createDocument(
           APPWRITE_DATABASE_ID,
           APPWRITE_FOOD_COLLECTION_ID,
           id,
           newFood
       ).catch(e => {
           // If creation fails (e.g. permission or rate limit), remove local copy
           removeFood(id);
       });
  };

  // Spawn food logic (Periodic check)
  useFrame(() => {
    const now = Date.now();
    // Check every 2 seconds to optimize server load
    if (now - lastSpawnCheck.current > 2000) {
        lastSpawnCheck.current = now;
        const foodCount = Object.keys(food).length;
        const playerCount = Object.keys(players).length || 1;

        // Dynamic probability based on player count to normalize server load.
        // If 1 player: 20% chance. If 10 players: 2% chance each.
        const spawnChance = 0.2 / playerCount;

        if (foodCount < MAX_FOOD && Math.random() < spawnChance) {
           spawnFood();
        }
    }
  });

  // Cleanup Stale Players logic
  useFrame(() => {
      const now = Date.now();
      if (now - lastCleanup.current > 5000) {
          lastCleanup.current = now;
          Object.values(players).forEach(p => {
              if (p.id !== myId && p.lastHeartbeat) {
                  // Remove players inactive for > 30s
                  if (now - p.lastHeartbeat > 30000) {
                      removePlayer(p.id);
                      databases.deleteDocument(
                          APPWRITE_DATABASE_ID,
                          APPWRITE_COLLECTION_ID,
                          p.id
                      ).catch(() => {});
                  }
              }
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

    // Current state of the player for this frame
    let currentMe = { ...me, x: nextX, y: nextY, lastHeartbeat: Date.now() };
    updatePlayer(currentMe);

    // Camera follow - Top Down
    const camHeight = Math.max(15, currentMe.size * 5);
    const targetCamPos = new THREE.Vector3(nextX, camHeight, nextY);

    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(nextX, 0, nextY);

    // Eating Food
    Object.values(food).forEach(f => {
        const dist = Math.sqrt(Math.pow(currentMe.x - f.x, 2) + Math.pow(currentMe.y - f.y, 2));
        if (dist < currentMe.size) {
            // 1. Remove locally immediately
            removeFood(f.id);

            // 2. Grow player
            currentMe = { ...currentMe, size: Math.sqrt(currentMe.size * currentMe.size + 0.1) };
            updatePlayer(currentMe);

            // 3. Remove from DB
            databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_FOOD_COLLECTION_ID,
                f.id
            ).catch(console.error);

            // 4. Spawn replacement if needed (Keeps density high without polling)
            if (Object.keys(food).length < MAX_FOOD) {
                spawnFood();
            }
        }
    });

    // Eating Players
    Object.values(players).forEach(other => {
        if (other.id !== currentMe.id && other.status === 'alive') {
            const dist = Math.sqrt(Math.pow(currentMe.x - other.x, 2) + Math.pow(currentMe.y - other.y, 2));
            if (dist < currentMe.size && currentMe.size > other.size * 1.1) {
                const newSize = Math.sqrt(currentMe.size * currentMe.size + other.size * other.size);
                currentMe = { ...currentMe, size: newSize };
                updatePlayer(currentMe);

                updatePlayer({ ...other, status: 'dead' });
            }
            if (dist < other.size && other.size > currentMe.size * 1.1) {
                 updatePlayer({ ...currentMe, status: 'dead' });
                 databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_ID,
                    currentMe.id,
                    { status: 'dead' }
                 ).catch(console.error);
            }
        }
    });

    // Server Sync (Position + Heartbeat)
    const now = Date.now();
    if (now - lastUpdate.current > 333) {
      lastUpdate.current = now;
      databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        currentMe.id,
        {
          x: currentMe.x,
          y: currentMe.y,
          size: currentMe.size,
          lastHeartbeat: currentMe.lastHeartbeat
        }
      ).catch((e) => console.error("Sync error", e));
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

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
        <PerspectiveCamera makeDefault position={[0, 50, 0]} fov={60} />
        <GameLogic {...props} />
      </Canvas>
    </div>
  );
};
