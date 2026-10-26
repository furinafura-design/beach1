import React from 'react';
import { Volume2, VolumeX, ShoppingBag, MessageSquare, User, Music, Gamepad2, Coins } from 'lucide-react';
import { UserProfile } from '../types/game';

interface NavbarProps {
  currentTab: 'classic' | 'rhythm' | 'shop' | 'profile' | 'chat';
  onTabChange: (tab: 'classic' | 'rhythm' | 'shop' | 'profile' | 'chat') => void;
  profile: UserProfile;
  isMuted: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  profile,
  isMuted,
  onToggleSound
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo and Brand */}
        <div 
          onClick={() => onTabChange('classic')}
          className="flex items-center gap-2.5 cursor-pointer group select-none flex-shrink-0"
        >
          {/* Geometric square & star badge icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] p-1 shadow-md shadow-[#95D58B]/30 group-hover:scale-105 transition-transform flex items-center justify-center border border-[#C3E895] relative">
            <span className="text-2xl sm:text-2xl">🔨</span>
            <span className="absolute -top-1 -right-1 text-xs">⭐</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-emerald-950 flex items-center gap-1.5 leading-tight">
              ตีแชงเบี้ย
              <span className="text-[10px] font-bold bg-[#D1EBA0] text-emerald-900 px-2 py-0.5 rounded-md border border-[#95D58B] flex items-center gap-0.5 shadow-2xs">
                ⭐ TOA เขียวอ่อน
              </span>
            </h1>
            <p className="text-[11px] text-emerald-800/90 font-medium hidden sm:block">
              ตีแชงเบี้ย ตีให้ตูดระเบิด
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-emerald-50/70 p-1 rounded-2xl border border-emerald-100">
          <button
            onClick={() => onTabChange('classic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'classic'
                ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-200/60'
                : 'text-emerald-700/80 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-emerald-500" />
            โหมดคลาสสิก
          </button>

          <button
            onClick={() => onTabChange('rhythm')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'rhythm'
                ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-200/60'
                : 'text-emerald-700/80 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <Music className="w-4 h-4 text-teal-500" />
            โหมดเพลง YouTube
          </button>

          <button
            onClick={() => onTabChange('shop')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'shop'
                ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-200/60'
                : 'text-emerald-700/80 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            ร้านค้าค้อน
          </button>

          <button
            onClick={() => onTabChange('chat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'chat'
                ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-200/60'
                : 'text-emerald-700/80 hover:text-emerald-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            แชทโลก
          </button>
        </nav>

        {/* Right Info: Coins, Level, Profile, Sound */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Level Badge */}
          <div 
            onClick={() => onTabChange('profile')}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
            title="คลิกเพื่อดูโปรไฟล์และเปลี่ยนป้าย"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
              {profile.level}
            </div>
            <div className="text-left hidden xs:block">
              <div className="text-[10px] text-emerald-700 font-medium leading-none">Lv. {profile.level}</div>
              <div className="text-[11px] font-bold text-emerald-900 leading-tight truncate max-w-[80px]">
                {profile.username}
              </div>
            </div>
          </div>

          {/* Coins Display */}
          <div 
            onClick={() => onTabChange('shop')}
            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
            title="เหรียญสะสม ซื้อค้อนและอัปเกรด"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold text-amber-900 font-mono">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="w-9 h-9 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 flex items-center justify-center transition-all shadow-xs"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Profile Button (Mobile icon) */}
          <button
            onClick={() => onTabChange('profile')}
            className="md:hidden w-9 h-9 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-center transition-all"
            aria-label="User Profile"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom/Secondary Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-emerald-100/60 bg-emerald-50/50 py-1.5 px-2">
        <button
          onClick={() => onTabChange('classic')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            currentTab === 'classic' ? 'text-emerald-800 font-bold bg-white shadow-xs' : 'text-emerald-600'
          }`}
        >
          <Gamepad2 className="w-4 h-4 mb-0.5" />
          คลาสสิก
        </button>
        <button
          onClick={() => onTabChange('rhythm')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            currentTab === 'rhythm' ? 'text-emerald-800 font-bold bg-white shadow-xs' : 'text-emerald-600'
          }`}
        >
          <Music className="w-4 h-4 mb-0.5" />
          จังหวะเพลง
        </button>
        <button
          onClick={() => onTabChange('shop')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            currentTab === 'shop' ? 'text-emerald-800 font-bold bg-white shadow-xs' : 'text-emerald-600'
          }`}
        >
          <ShoppingBag className="w-4 h-4 mb-0.5" />
          ร้านค้าค้อน
        </button>
        <button
          onClick={() => onTabChange('chat')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            currentTab === 'chat' ? 'text-emerald-800 font-bold bg-white shadow-xs' : 'text-emerald-600'
          }`}
        >
          <MessageSquare className="w-4 h-4 mb-0.5" />
          แชทโลก
        </button>
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            currentTab === 'profile' ? 'text-emerald-800 font-bold bg-white shadow-xs' : 'text-emerald-600'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          โปรไฟล์
        </button>
      </div>
    </header>
  );
};
