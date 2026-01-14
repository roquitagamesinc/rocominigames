'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Grid } from '@react-three/drei';
import { useGameStore, Player, FoodItem } from '@/lib/store';
import { Rock } from './Rock';
import { Food } from './Food';
import { databases, client, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID, APPWRITE_FOOD_COLLECTION_ID, APPWRITE_MESSAGES_COLLECTION_ID } from '@/lib/appwrite';
import * as THREE from 'three';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';
import { v4 as uuidv4 } from 'uuid';
import { Query } from 'appwrite';

interface GameSceneProps {
  joystickData: IJoystickUpdateEvent | null;
}

const MAP_SIZE = 100;

const GameLogic: React.FC<GameSceneProps> = ({ joystickData }) => {
  const { myId, players, food, updatePlayer, removeFood, updateFood, removePlayer } = useGameStore();
  const { camera } = useThree();
  const [lastUpdate, setLastUpdate] = useState(0);
  const [lastCleanup, setLastCleanup] = useState(0);
  const [lastMessageCleanup, setLastMessageCleanup] = useState(0);

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
      camera.up.set(0, 0, -1); // North is "Up" on the screen (Top-down view)
  }, [camera]);

  // Spawn food logic
  // Optimized for server: Only one client ("Host") should spawn food to avoid collisions and rate limits.
  // We determine the host by sorting player IDs. The lowest ID (lexicographically) is the host.
  const [lastFoodSpawn, setLastFoodSpawn] = useState(0);

  useFrame(() => {
    if (!myId || !players[myId]) return;

    const now = Date.now();
    const foodCount = Object.keys(food).length;

    // Emergency Spawn: If food is effectively zero, ANYONE can spawn with low probability
    // This handles the "cold start" or "stale host" case immediately.
    if (foodCount === 0 && Math.random() < 0.05 && now - lastFoodSpawn > 500) {
        setLastFoodSpawn(now);
        const id = uuidv4();
        // Spawn near me initially so I can see it
        const me = players[myId];
        const newFood: FoodItem = {
           id,
           x: Math.max(-MAP_SIZE/2, Math.min(MAP_SIZE/2, me.x + (Math.random() - 0.5) * 10)),
           y: Math.max(-MAP_SIZE/2, Math.min(MAP_SIZE/2, me.y + (Math.random() - 0.5) * 10)),
           color: `hsl(${Math.random() * 360}, 70%, 60%)`
        };
        updateFood(newFood);
        // Exclude ID from payload to prevent "Unknown Attribute" errors if Appwrite is strict
        const { id: _, ...foodPayload } = newFood;
        databases.createDocument(
           APPWRITE_DATABASE_ID,
           APPWRITE_FOOD_COLLECTION_ID,
           id,
           foodPayload
        ).catch(e => {
           console.error("Failed to create food", e);
           removeFood(id);
        });
        return;
    }

    // Host Election Logic
    // Only consider players who have updated their heartbeat recently (last 10s) as candidates.
    // This ignores stale/ghost players from the database.
    const activeCandidates = Object.values(players)
        .filter(p => p.lastHeartbeat && (now - p.lastHeartbeat < 10000))
        .map(p => p.id)
        .sort();

    const isHost = activeCandidates.length > 0 && activeCandidates[0] === myId;

    if (isHost) {
        // Target 200 items. Throttle spawn to once every 200ms to be safe with rate limits.
        if (foodCount < 200 && now - lastFoodSpawn > 200) {
           setLastFoodSpawn(now);
           const id = uuidv4();
           const newFood: FoodItem = {
               id,
               x: (Math.random() - 0.5) * MAP_SIZE,
               y: (Math.random() - 0.5) * MAP_SIZE,
               color: `hsl(${Math.random() * 360}, 70%, 60%)`
           };
           // Optimistic Update
           updateFood(newFood);

           // Exclude ID from payload to prevent "Unknown Attribute" errors if Appwrite is strict
           const { id: _, ...foodPayload } = newFood;
           databases.createDocument(
               APPWRITE_DATABASE_ID,
               APPWRITE_FOOD_COLLECTION_ID,
               id,
               foodPayload
           ).catch(e => {
               // If creation fails, remove it from local state
               console.error("Failed to create food", e);
               removeFood(id);
           });
        }
    }
  });

  // Cleanup Stale Players logic & Old Messages
  useFrame((state) => {
      const now = Date.now();
      if (now - lastCleanup > 5000) {
          setLastCleanup(now);
          // Cleanup Players
          Object.values(players).forEach(p => {
              if (p.id !== myId && p.lastHeartbeat) {
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

      // Cleanup Messages older than 2 minutes (120000ms)
      if (now - lastMessageCleanup > 10000) { // Check every 10 seconds
          setLastMessageCleanup(now);
          const twoMinutesAgo = now - 120000;

          // Since we can't easily query all messages via store (only last 50),
          // we should query the database for old messages to ensure deep cleanup.
          // Note: This requires permissions to delete.
          databases.listDocuments(
              APPWRITE_DATABASE_ID,
              APPWRITE_MESSAGES_COLLECTION_ID,
              [Query.lessThan('timestamp', twoMinutesAgo), Query.limit(100)]
          ).then(res => {
              res.documents.forEach(doc => {
                  databases.deleteDocument(
                      APPWRITE_DATABASE_ID,
                      APPWRITE_MESSAGES_COLLECTION_ID,
                      doc.$id
                  ).catch(console.error);
              });
          }).catch(console.error);
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

    const newMe = { ...me, x: nextX, y: nextY, lastHeartbeat: Date.now() };
    updatePlayer(newMe);

    // Camera follow - Top Down
    // Adjusted camera height based on player size with limits.
    // Multiplier set to 5 as requested, with a hard limit of 60 units.
    const camHeight = Math.min(60, Math.max(15, me.size * 5));
    const targetCamPos = new THREE.Vector3(nextX, camHeight, nextY);

    camera.position.lerp(targetCamPos, 0.1);
    // camera.lookAt causes instability when looking straight down if Up vector isn't handled.
    // Since we set Up to (0,0,-1) and rotation to (-PI/2, 0, 0), and we move X/Z to match player,
    // we don't strictly need lookAt, but if we use it, it should work now.
    // However, to be safe and avoid "spinning", we'll just rely on the fixed rotation + position.
    // The camera is already rotated -90deg X.
    // camera.lookAt(nextX, 0, nextY); // REMOVED to prevent spinning
    Object.values(food).forEach(f => {
        const dist = Math.sqrt(Math.pow(me.x - f.x, 2) + Math.pow(me.y - f.y, 2));
        if (dist < me.size) { // Simple overlap check
            removeFood(f.id);
            // Each food gives 1 point. Size still grows by mass logic.
            const newScore = (me.score || 0) + 1;
            const grownMe = {
                ...newMe,
                size: Math.sqrt(me.size * me.size + 0.1),
                score: newScore
            };
            updatePlayer(grownMe);
            databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_FOOD_COLLECTION_ID,
                f.id
            ).catch(console.error);
        }
    });

    // Eating Players
    Object.values(players).forEach(other => {
        if (other.id !== me.id && other.status === 'alive') {
            const dist = Math.sqrt(Math.pow(me.x - other.x, 2) + Math.pow(me.y - other.y, 2));
            if (dist < me.size && me.size > other.size * 1.1) {
                // Eating a player gives their score + mass
                const newSize = Math.sqrt(me.size * me.size + other.size * other.size);
                const newScore = (me.score || 0) + (other.score || 0) + 10; // Bonus for kill
                updatePlayer({ ...newMe, size: newSize, score: newScore });
                updatePlayer({ ...other, status: 'dead' });
            }
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

    // Server Sync (Position + Heartbeat)
    // Fix: 3 times per second = ~333ms
    // Optimization: If only 1 player is connected (me), do NOT write to database to save costs.
    const now = Date.now();
    if (now - lastUpdate > 333 && Object.keys(players).length > 1) {
      setLastUpdate(now);
      databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        me.id,
        {
          x: newMe.x,
          y: newMe.y,
          size: newMe.size,
          score: newMe.score || 0,
          lastHeartbeat: newMe.lastHeartbeat
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
        cellSize={2}
        cellColor="gray"
        cellThickness={1}
        sectionThickness={0}
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
