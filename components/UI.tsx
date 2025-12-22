'use client';

import React, { useState, useEffect } from 'react';
import { Joystick } from 'react-joystick-component';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';
import { useGameStore } from '@/lib/store';
import { Leaderboard } from './Leaderboard';
import { Chat } from './Chat';

interface UIProps {
  onJoystickMove: (e: IJoystickUpdateEvent) => void;
  onJoystickStop: () => void;
  isMobile: boolean;
}

export const UI: React.FC<UIProps> = ({ onJoystickMove, onJoystickStop, isMobile }) => {
  const { myId, players } = useGameStore();
  const me = myId ? players[myId] : null;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-4">

      {/* Top Bar: Title and Stats */}
      <div className="flex justify-between items-start w-full">
         <div className="text-white">
            <h1 className="text-2xl font-bold drop-shadow-md">Rocosos.io</h1>
            {me && (
                <div className="mt-2 text-xl font-mono text-orange-400 drop-shadow-md">
                    Masa: {Math.floor(me.size * 10)}
                </div>
            )}
         </div>
         <Leaderboard />
      </div>

      {/* Bottom Area: Controls and Chat */}
      <div className="flex justify-between items-end w-full">
          {/* Chat on the bottom left */}
          <div className="pointer-events-auto">
             <Chat />
          </div>

          {/* Joystick on bottom right if mobile */}
          {isMobile && (
            <div className="pointer-events-auto">
              <Joystick
                size={100}
                baseColor="rgba(255, 255, 255, 0.3)"
                stickColor="rgba(255, 255, 255, 0.8)"
                move={onJoystickMove}
                stop={onJoystickStop}
              />
            </div>
          )}
      </div>
    </div>
  );
};
