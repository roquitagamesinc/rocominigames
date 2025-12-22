'use client';

import React, { useState, useEffect } from 'react';
import { Joystick } from 'react-joystick-component';
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

interface UIProps {
  onJoystickMove: (e: IJoystickUpdateEvent) => void;
  onJoystickStop: () => void;
  isMobile: boolean;
}

export const UI: React.FC<UIProps> = ({ onJoystickMove, onJoystickStop, isMobile }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
      <div className="absolute top-4 left-4 text-white text-xl font-bold">
        Rocosos.io
      </div>

      {isMobile && (
        <div className="absolute bottom-10 left-10 pointer-events-auto">
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
  );
};
