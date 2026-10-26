import React, { useState, useEffect } from 'react';
import { AVAILABLE_HAMMERS } from '../utils/constants';
import { HammerId } from '../types/game';

interface HammerCursorProps {
  equippedHammerId: HammerId;
}

export const HammerCursor: React.FC<HammerCursorProps> = ({ equippedHammerId }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isSwinging, setIsSwinging] = useState<boolean>(false);
  const [isInsideArena, setIsInsideArena] = useState<boolean>(false);

  const activeHammer =
    AVAILABLE_HAMMERS.find((h) => h.id === equippedHammerId) || AVAILABLE_HAMMERS[0];

  useEffect(() => {
    // Only enable on desktop mouse devices
    const handleMouseMove = (e: MouseEvent) => {
      const arena = document.getElementById('classic-arena') || document.querySelector('.grid-cols-3');
      if (arena) {
        const rect = arena.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left - 20 &&
          e.clientX <= rect.right + 20 &&
          e.clientY >= rect.top - 20 &&
          e.clientY <= rect.bottom + 20;

        setIsInsideArena(inside);
        if (inside) {
          setPos({ x: e.clientX, y: e.clientY });
        }
      }
    };

    const handleMouseDown = () => {
      setIsSwinging(true);
      setTimeout(() => setIsSwinging(false), 180);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  if (!pos || !isInsideArena) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `translate(-30%, -70%) ${isSwinging ? 'rotate(-40deg) scale(1.2)' : 'rotate(0deg)'}`,
        transition: 'transform 0.12s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
      }}
    >
      <div className="relative text-3xl filter drop-shadow-md">
        <span>{activeHammer.icon}</span>
        {isSwinging && (
          <span className="absolute -top-1 -right-2 text-xs font-black text-amber-500 animate-ping">
            💥
          </span>
        )}
      </div>
    </div>
  );
};
