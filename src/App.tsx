import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ClassicGame } from './components/ClassicGame';
import { RhythmGame } from './components/RhythmGame';
import { ShopModal } from './components/ShopModal';
import { ProfileModal } from './components/ProfileModal';
import { WorldChat } from './components/WorldChat';
import { HammerCursor } from './components/HammerCursor';
import { loadUserProfile, saveUserProfile, checkAndUnlockBadges } from './utils/storage';
import { soundManager } from './utils/audio';
import { UserProfile } from './types/game';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'classic' | 'rhythm' | 'shop' | 'profile' | 'chat'>('classic');
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.isMuted);

  // Auto-save profile changes to localStorage & check badge unlocks
  useEffect(() => {
    const { updatedProfile } = checkAndUnlockBadges(profile);
    saveUserProfile(updatedProfile);
  }, [profile]);

  // Update profile handler with automatic badge check
  const handleUpdateProfile = (updater: (prev: UserProfile) => UserProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      const { updatedProfile } = checkAndUnlockBadges(next);
      return updatedProfile;
    });
  };

  const handleToggleSound = () => {
    soundManager.isMuted = !soundManager.isMuted;
    setIsMuted(soundManager.isMuted);
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] text-slate-800 flex flex-col selection:bg-emerald-200">
      {/* Custom Hammer Cursor for tactile feedback */}
      <HammerCursor equippedHammerId={profile.equippedHammerId} />

      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        profile={profile}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {currentTab === 'classic' && (
          <ClassicGame
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onLevelUpAlert={() => {}}
          />
        )}

        {currentTab === 'rhythm' && (
          <RhythmGame
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onLevelUpAlert={() => {}}
          />
        )}

        {currentTab === 'shop' && (
          <ShopModal
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileModal
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'chat' && (
          <WorldChat
            profile={profile}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-emerald-800/70 border-t border-emerald-100 bg-white/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>เกมตีตุ่นเด้งดึ๋ง สไตล์พาสเทล TOA • ภาพขึ้น 100% พร้อมระบบเด้งดึ๋งหยดน้ำ</span>
          <span className="text-[11px] text-emerald-600">
            ตัวการ์ตูนปืนเขียว • โหมดคลาสสิก 3 ระดับ • โหมดเพลง YouTube • แชทโลก
          </span>
        </div>
      </footer>
    </div>
  );
}
