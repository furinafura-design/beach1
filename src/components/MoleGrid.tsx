import React from 'react';
import { MOLE_IMAGE_URL } from '../utils/constants';
import { MoleHole, ScorePopup } from '../types/game';
import { Sparkles } from 'lucide-react';

interface MoleGridProps {
  holes: MoleHole[];
  onWhack: (holeIndex: number, event: React.MouseEvent | React.TouchEvent) => void;
  popups: ScorePopup[];
  hammerSpeedMultiplier: number;
}

export const MoleGrid: React.FC<MoleGridProps> = ({
  holes,
  onWhack,
  popups
}) => {
  return (
    <div className="relative w-full max-w-xl mx-auto p-4 sm:p-6 bg-gradient-to-b from-[#D1EBA0]/50 via-white/90 to-[#C3E895]/40 rounded-2xl border-2 border-[#95D58B] shadow-xl shadow-[#95D58B]/10 select-none">
      {/* Decorative shapes header: square badge with star */}
      <div className="absolute -top-3.5 left-6 px-3.5 py-1 bg-white rounded-lg border-2 border-[#95D58B] text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 shadow-xs">
        <span className="text-amber-500">⭐</span>
        <span>สังเวียนล่าแชงเบี้ย</span>
        <span className="text-xs">✨</span>
      </div>

      {/* Floating geometric decorative background accents */}
      <div className="absolute -top-2 right-6 text-sm text-[#B4E578]">⭐</div>
      <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-[#B4E578]/50" />
      <div className="absolute top-12 right-2 w-2.5 h-2.5 rounded-sm bg-[#C3E895]/80" />
      <div className="absolute bottom-8 left-2 text-xs text-[#95D58B]">⭐</div>

      {/* 3x3 Grid of Holes */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 mt-2">
        {holes.map((hole, index) => {
          const currentPopups = popups.filter((p) => p.holeIndex === index);

          return (
            <div
              key={hole.id}
              className="relative aspect-square flex flex-col items-center justify-end select-none"
            >
              {/* Hole Hit Area */}
              <div
                className="relative w-full h-full flex flex-col items-center justify-end cursor-pointer group"
                onClick={(e) => onWhack(index, e)}
                onTouchStart={(e) => onWhack(index, e)}
              >
                {/* Back / Dirt hole crater shadow (Circle) */}
                <div className="absolute bottom-1 w-[88%] h-[42%] bg-gradient-to-b from-[#251d13] to-[#120e09] rounded-[50%] border-2 border-[#95D58B]/50 shadow-inner flex items-center justify-center">
                  <div className="w-[85%] h-[55%] bg-black/75 rounded-[50%] blur-[2px]" />
                </div>

                {/* Character emerge mask container */}
                <div className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden pb-4 z-10 pointer-events-none">
                  {hole.isActive && (
                    <div
                      className={`relative z-10 w-[85%] sm:w-[82%] flex items-end justify-center ${
                        hole.isHit ? 'animate-jelly-hit' : 'animate-mole-emerge'
                      }`}
                    >
                      <div className="relative group/mole select-none flex flex-col items-center">
                        <img
                          src={MOLE_IMAGE_URL}
                          alt="ตัวการ์ตูนปืนเขียว"
                          crossOrigin="anonymous"
                          className="w-full h-auto object-contain drop-shadow-lg select-none pointer-events-none max-h-[110px] sm:max-h-[135px]"
                          loading="eager"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=moleGunner&backgroundColor=b6e3f4,c0aede,d1d4f9';
                          }}
                        />

                        {/* Golden Aura if golden pop */}
                        {hole.popType === 'golden' && (
                          <div className="absolute inset-0 rounded-full bg-[#B7E658]/40 filter blur-md animate-pulse -z-10" />
                        )}

                        {/* Hit explosion emoji */}
                        {hole.isHit && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            <span className="text-3xl sm:text-4xl animate-ping">💥</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Front Hole Grass Mound & Rim (TOA palette: Green Berry #B4E578, Little Pony #95D58B, Vivid Lawn #C3E895) */}
                <div className="absolute bottom-0 z-20 w-[92%] h-[32%] flex flex-col items-center justify-end pointer-events-none">
                  <div className="w-full h-full bg-gradient-to-t from-[#95D58B] via-[#B4E578] to-[#C3E895] rounded-b-[40%] rounded-t-[50%] border-t-2 border-[#D1EBA0] shadow-md flex items-center justify-between px-3 overflow-hidden">
                    <span className="text-[10px] opacity-80">🌱</span>
                    <span className="text-[9px] text-amber-300">⭐</span>
                    <span className="text-[10px] opacity-80">🌱</span>
                  </div>
                </div>
              </div>

              {/* Floating Score / Multiplier Popups */}
              {currentPopups.map((popup) => (
                <div
                  key={popup.id}
                  className="absolute -top-4 z-40 pointer-events-none font-bold text-center animate-float-score"
                  style={{
                    color: popup.color,
                    textShadow: '0 2px 4px rgba(0,0,0,0.35)'
                  }}
                >
                  <div className="text-sm sm:text-lg font-black tracking-wider bg-white/95 px-2.5 py-0.5 rounded-full border border-emerald-200/90 shadow-lg whitespace-nowrap">
                    {popup.text}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
