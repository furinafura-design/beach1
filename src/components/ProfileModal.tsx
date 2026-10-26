import React, { useState } from 'react';
import { BADGES_LIST } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Badge, UserProfile } from '../types/game';
import { User, Award, Check, Lock, Edit3, Save, Flame, Trophy, Hammer as HammerIcon } from 'lucide-react';

interface ProfileModalProps {
  profile: UserProfile;
  onUpdateProfile: (updater: (prev: UserProfile) => UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onUpdateProfile }) => {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(profile.username);

  const equippedBadge =
    BADGES_LIST.find((b) => b.id === profile.equippedBadgeId) || BADGES_LIST[0];

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    onUpdateProfile((prev) => ({
      ...prev,
      username: trimmed
    }));
    setIsEditingName(false);
    soundManager.playCoin();
  };

  const handleEquipBadge = (badge: Badge) => {
    if (!profile.unlockedBadgeIds.includes(badge.id)) return;
    soundManager.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      equippedBadgeId: badge.id
    }));
  };

  // Calculate percentage to next level
  const expPercent =
    profile.level >= 100
      ? 100
      : Math.min(100, Math.floor((profile.currentExp / profile.maxExp) * 100));

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Profile Card Header */}
      <div className="bg-white/95 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
          {/* Avatar Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-300 p-1 shadow-md shadow-emerald-500/20 flex items-center justify-center text-4xl">
              <span className="animate-pulse-subtle">🦹</span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg border-2 border-white shadow-xs">
              Lv. {profile.level}
            </div>
          </div>

          {/* User Details & Edit Username */}
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={16}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="border border-emerald-300 rounded-xl px-2.5 py-1 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="กรอกชื่อผู้เล่น..."
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                    title="บันทึกชื่อ"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                    {profile.username}
                  </h2>
                  <button
                    onClick={() => {
                      setNameInput(profile.username);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="เปลี่ยนชื่อผู้ใช้"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Currently Equipped Badge Banner */}
            <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs text-slate-500">ป้ายฉายาปัจจุบัน:</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border bg-gradient-to-r ${equippedBadge.bgGradient} ${equippedBadge.textColor}`}
              >
                <span>{equippedBadge.icon}</span>
                <span>{equippedBadge.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Level & EXP Progress Bar */}
        <div className="w-full md:w-64 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-emerald-900">เลเวล {profile.level} {profile.level >= 100 && '(เวลตัน)'}</span>
            <span className="font-mono text-emerald-700">
              {profile.level >= 100 ? 'MAX' : `${profile.currentExp} / ${profile.maxExp} EXP`}
            </span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden p-0.5 border border-emerald-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${expPercent}%` }}
            />
          </div>
          <div className="text-[10.5px] text-emerald-600 mt-1 text-right">
            {profile.level >= 100 ? 'บรรลุจุดสูงสุดแล้ว 👑' : `ต้องการอีก ${profile.maxExp - profile.currentExp} EXP เพื่ออัปเวล`}
          </div>
        </div>
      </div>

      {/* Lifetime Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/95 p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center text-center">
          <HammerIcon className="w-5 h-5 text-emerald-500 mb-1" />
          <span className="text-[11px] text-slate-500">ทุบโดนทั้งหมด</span>
          <span className="text-lg font-black text-slate-800">
            <span className="font-mono">{profile.totalMolesWhacked.toLocaleString()}</span> ครั้ง
          </span>
        </div>

        <div className="bg-white/95 p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center text-center">
          <Trophy className="w-5 h-5 text-amber-500 mb-1" />
          <span className="text-[11px] text-slate-500">คะแนนสูงสุด</span>
          <span className="text-lg font-black text-emerald-700 font-mono">
            {profile.highestScore.toLocaleString()}
          </span>
        </div>

        <div className="bg-white/95 p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center text-center">
          <Flame className="w-5 h-5 text-orange-500 mb-1" />
          <span className="text-[11px] text-slate-500">คอมโบสูงสุด</span>
          <span className="text-lg font-black text-orange-600 font-mono">
            {profile.highestCombo}x
          </span>
        </div>

        <div className="bg-white/95 p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center text-center">
          <Award className="w-5 h-5 text-purple-500 mb-1" />
          <span className="text-[11px] text-slate-500">ป้ายที่ปลดล็อก</span>
          <span className="text-lg font-black text-purple-700 font-mono">
            {profile.unlockedBadgeIds.length} / {BADGES_LIST.length}
          </span>
        </div>
      </div>

      {/* Badges Collection & Selection */}
      <div className="bg-white/95 p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              ระบบป้ายฉายาประจำตัว (เลือกใส่เพื่อแสดงในแชทโลก)
            </h3>
            <p className="text-xs text-slate-500">
              ปลดล็อกป้ายตามระดับเลเวล ยิ่งเลเวลสูงยิ่งได้รับป้ายเกียรติยศสุดเท่
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {BADGES_LIST.map((badge) => {
            const isUnlocked = profile.unlockedBadgeIds.includes(badge.id);
            const isEquipped = profile.equippedBadgeId === badge.id;

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  isEquipped
                    ? 'border-emerald-500 ring-2 ring-emerald-200 bg-white shadow-md'
                    : isUnlocked
                    ? 'border-emerald-200 bg-white/90 hover:border-emerald-400'
                    : 'border-slate-200 bg-slate-50/70 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{badge.icon}</span>
                    {isUnlocked ? (
                      isEquipped ? (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> ใช้งานอยู่
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                          ปลดล็อกแล้ว
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-200 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-3 h-3" /> เลเวล {badge.requiredLevel}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    {badge.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">
                    เงื่อนไข: Lv. {badge.requiredLevel}
                  </span>

                  {isUnlocked && !isEquipped && (
                    <button
                      onClick={() => handleEquipBadge(badge)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      เลือกใส่ป้ายนี้
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
