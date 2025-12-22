'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameScene } from '@/components/GameScene';
import { UI } from '@/components/UI';
import { useGameStore, Player } from '@/lib/store';
import { client, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID } from '@/lib/appwrite';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [joystickData, setJoystickData] = useState<IJoystickUpdateEvent | null>(null);

  const { setMyId, updatePlayer, removePlayer, players } = useGameStore();

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startGame = async () => {
    if (!playerName.trim()) return;

    const id = uuidv4();
    const startX = (Math.random() - 0.5) * 50;
    const startY = (Math.random() - 0.5) * 50;
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;

    const me: Player = {
      id,
      name: playerName,
      x: startX,
      y: startY,
      size: 1,
      color,
      status: 'alive',
    };

    setMyId(id);
    updatePlayer(me);

    try {
      // Create document in Appwrite
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        id,
        me
      );

      // Subscribe to changes
      client.subscribe(`databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID}.documents`, response => {
        const payload = response.payload as any; // Appwrite event payload
        const eventId = payload.$id;

        // Handle events
        if (response.events.some(e => e.includes('.create') || e.includes('.update'))) {
             const p: Player = {
                 id: payload.id || payload.$id,
                 name: payload.name,
                 x: payload.x,
                 y: payload.y,
                 size: payload.size,
                 color: payload.color,
                 status: payload.status
             };
             // Ignore my own updates from server to avoid jitter/lag (client prediction is smoother)
             // But if I died, I need to know.
             if (p.id === id) {
                 if (p.status === 'dead' && me.status !== 'dead') {
                     // I died!
                     updatePlayer(p);
                     alert("Has sido comido!");
                     window.location.reload();
                 }
                 // ignore position updates for myself
             } else {
                 updatePlayer(p);
             }
        } else if (response.events.some(e => e.includes('.delete'))) {
            removePlayer(eventId);
        }
      });

      // Load initial players
      const existing = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID
      );
      existing.documents.forEach((doc: any) => {
          if (doc.$id !== id && doc.status === 'alive') {
              updatePlayer({
                  id: doc.$id,
                  name: doc.name,
                  x: doc.x,
                  y: doc.y,
                  size: doc.size,
                  color: doc.color,
                  status: doc.status
              });
          }
      });

      setIsPlaying(true);
    } catch (err) {
      console.error("Error starting game:", err);
      alert("Error conectando al servidor. Revisa la configuración.");
    }
  };

  const handleJoystickMove = (e: IJoystickUpdateEvent) => {
    setJoystickData(e);
  };

  const handleJoystickStop = () => {
    setJoystickData(null);
  };

  if (isPlaying) {
    return (
      <main className="w-full h-full relative">
        <GameScene joystickData={joystickData} />
        <UI
          isMobile={isMobile}
          onJoystickMove={handleJoystickMove}
          onJoystickStop={handleJoystickStop}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
        Rocosos.io
      </h1>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Nombre de tu Roca</label>
          <input
            type="text"
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-orange-500"
            placeholder="Introduce tu nombre"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />
        </div>
        <button
          onClick={startGame}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition duration-200"
        >
          Jugar Ahora
        </button>
      </div>
      <p className="mt-8 text-gray-500 text-sm">
        Usa el mouse para moverte en PC, o el Joystick en Móviles.
        <br />
        ¡Come rocas más pequeñas para crecer!
      </p>
    </main>
  );
}
