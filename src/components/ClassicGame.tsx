import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { MoleGrid } from './MoleGrid';
import { AVAILABLE_HAMMERS, DIFFICULTY_CONFIG } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Difficulty, Hammer, HammerId, MoleHole, ScorePopup, UserProfile } from '../types/game';
import { Play, RotateCcw, Zap, Sparkles, Trophy, Award, Flame, Timer, Volume2 } from 'lucide-react';

interface ClassicGameProps {
  profile: UserProfile;
  onUpdateProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  onLevelUpAlert: (newLevel: number, newBadges: string[]) => void;
}

export const ClassicGame: React.FC<ClassicGameProps> = ({
  profile,
  onUpdateProfile,
  onLevelUpAlert
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxComboThisRound, setMaxComboThisRound] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [holes, setHoles] = useState<MoleHole[]>(
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      isActive: false,
      isHit: false,
      hitCount: 0,
      popType: 'normal',
      pointsValue: 100
    }))
  );
  const [popups, setPopups] = useState<ScorePopup[]>([]);

  // Special Hammer Skill states
  const [skillCooldownRemaining, setSkillCooldownRemaining] = useState<number>(0);
  const [isMultiplierActive, setIsMultiplierActive] = useState<boolean>(false);
  const [multiplierTimer, setMultiplierTimer] = useState<number>(0);

  // References
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holeRetractTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const gameCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeHammer: Hammer =
    AVAILABLE_HAMMERS.find((h) => h.id === profile.equippedHammerId) || AVAILABLE_HAMMERS[0];

  // Hammer speed multiplier based on upgrade level (1.0 to 1.9)
  const hammerSpeedMultiplier = 1.0 + (profile.hammerSpeedLevel - 1) * 0.1;

  // Cleanup all timers
  const clearAllTimers = useCallback(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameCountdownRef.current) clearInterval(gameCountdownRef.current);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    Object.values(holeRetractTimers.current).forEach((t) => clearTimeout(t));
    holeRetractTimers.current = {};
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Skill Cooldown Countdown
  useEffect(() => {
    if (skillCooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setSkillCooldownRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [skillCooldownRemaining]);

  // Multiplier Active Countdown (Tiger Lady hammer)
  useEffect(() => {
    if (multiplierTimer > 0) {
      const timer = setTimeout(() => {
        setMultiplierTimer((prev) => {
          if (prev <= 1) {
            setIsMultiplierActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [multiplierTimer]);

  // Spawn Mole Logic
  const spawnMole = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];

    setHoles((prevHoles) => {
      const inactiveIndices = prevHoles
        .map((h, idx) => (!h.isActive ? idx : -1))
        .filter((idx) => idx !== -1);

      if (inactiveIndices.length === 0) return prevHoles;

      // Determine how many to spawn
      const currentActive = prevHoles.filter((h) => h.isActive).length;
      if (currentActive >= config.maxSimultaneous) return prevHoles;

      const randomIndex = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)];
      const isGolden = Math.random() < 0.15; // 15% chance for golden extra points

      soundManager.playPopUp();

      // Schedule auto-retract if not whacked
      if (holeRetractTimers.current[randomIndex]) {
        clearTimeout(holeRetractTimers.current[randomIndex]);
      }

      // Faster stay duration with higher difficulty and hammer speed
      const adjustedStayDuration = Math.max(350, config.stayDurationMs / (1 + (hammerSpeedMultiplier - 1) * 0.15));

      holeRetractTimers.current[randomIndex] = setTimeout(() => {
        setHoles((current) =>
          current.map((h, i) =>
            i === randomIndex ? { ...h, isActive: false, isHit: false } : h
          )
        );
        // Break combo if mole escaped without being whacked
        setCombo(0);
      }, adjustedStayDuration);

      return prevHoles.map((h, i) => {
        if (i === randomIndex) {
          return {
            ...h,
            isActive: true,
            isHit: false,
            hitCount: 0,
            popType: isGolden ? 'golden' : 'normal',
            pointsValue: isGolden ? config.pointsPerHit * 2 : config.pointsPerHit
          };
        }
        return h;
      });
    });
  }, [difficulty, hammerSpeedMultiplier]);

  // Start / Restart Game
  const startGame = useCallback(() => {
    clearAllTimers();
    setScore(0);
    setCombo(0);
    setMaxComboThisRound(0);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsPlaying(true);
    setPopups([]);
    setSkillCooldownRemaining(0);
    setIsMultiplierActive(false);
    setMultiplierTimer(0);

    setHoles(
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        isActive: false,
        isHit: false,
        hitCount: 0,
        popType: 'normal',
        pointsValue: 100
      }))
    );

    // Main 60-second game countdown
    gameCountdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mole spawn interval
    const config = DIFFICULTY_CONFIG[difficulty];
    spawnTimerRef.current = setInterval(() => {
      spawnMole();
    }, config.spawnIntervalMs);
  }, [clearAllTimers, difficulty, spawnMole]);

  // End Game
  const endGame = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    setIsGameOver(true);
    soundManager.playLevelUp();

    // Small celebratory confetti
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, [clearAllTimers]);

  // Handle Whack on a Mole
  const handleWhack = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;

    const hole = holes[index];
    if (!hole.isActive || hole.isHit) return;

    const config = DIFFICULTY_CONFIG[difficulty];
    let multiplier = 1;
    let isDouble = false;

    // Check equipped hammer abilities
    if (activeHammer.id === 'double_whack') {
      isDouble = true;
      multiplier *= 2;
    }

    if (isMultiplierActive || (activeHammer.id === 'tiger_lady' && multiplierTimer > 0)) {
      multiplier *= 3;
    }

    // Play Sound
    if (multiplier >= 3) {
      soundManager.playWhack('crit');
    } else if (isDouble) {
      soundManager.playWhack('double');
    } else {
      soundManager.playWhack('normal');
    }

    // Calculate Points, Exp, Coins
    const comboBonus = Math.floor(combo * 5);
    const basePoints = hole.pointsValue;
    const gainedPoints = (basePoints + comboBonus) * multiplier;
    const gainedExp = Math.floor(config.expPerHit * multiplier);
    const gainedCoins = Math.floor((gainedPoints / 25) * (activeHammer.id === 'golden_star' ? 1.5 : 1));

    // Update Combo
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    if (nextCombo > maxComboThisRound) {
      setMaxComboThisRound(nextCombo);
    }

    // Update Score
    setScore((prev) => prev + gainedPoints);

    // Trigger Jelly Hit Animation on the Hole
    setHoles((prev) =>
      prev.map((h, i) => {
        if (i === index) {
          return { ...h, isHit: true, hitCount: h.hitCount + 1 };
        }
        return h;
      })
    );

    // Add floating score popup text
    const popupId = Math.random().toString();
    const popupText = isMultiplierActive
      ? `+${gainedPoints} (x3 เสือ!)`
      : isDouble
      ? `+${gainedPoints} (x2 เบิ้ล!)`
      : `+${gainedPoints}`;
    const popupColor = isMultiplierActive ? '#f43f5e' : isDouble ? '#f59e0b' : '#059669';

    setPopups((prev) => [
      ...prev,
      { id: popupId, holeIndex: index, text: popupText, color: popupColor }
    ]);

    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 800);

    // Retract mole after hit animation
    if (holeRetractTimers.current[index]) {
      clearTimeout(holeRetractTimers.current[index]);
    }
    holeRetractTimers.current[index] = setTimeout(() => {
      setHoles((prev) =>
        prev.map((h, i) => (i === index ? { ...h, isActive: false, isHit: false } : h))
      );
    }, 450);

    // Update User Profile (EXP, Coins, Level up check)
    onUpdateProfile((prev) => {
      let newExp = prev.currentExp + gainedExp;
      let newLevel = prev.level;
      let newMaxExp = prev.maxExp;
      let didLevelUp = false;

      while (newExp >= newMaxExp && newLevel < 100) {
        newExp -= newMaxExp;
        newLevel += 1;
        newMaxExp = Math.floor(100 + Math.pow(newLevel, 1.8) * 35);
        didLevelUp = true;
      }

      if (didLevelUp) {
        soundManager.playLevelUp();
      }

      return {
        ...prev,
        coins: prev.coins + gainedCoins,
        currentExp: newLevel >= 100 ? 0 : newExp,
        level: newLevel,
        maxExp: newMaxExp,
        totalMolesWhacked: prev.totalMolesWhacked + 1,
        highestScore: Math.max(prev.highestScore, score + gainedPoints),
        highestCombo: Math.max(prev.highestCombo, nextCombo)
      };
    });
  };

  // Trigger Special Hammer Skill
  const triggerHammerSkill = () => {
    if (!isPlaying) return;
    if (skillCooldownRemaining > 0) return; // If on cooldown, does nothing (normal whacking still works)

    // ค้อนเฆี่ยนแชงเบี้ย (Board Sweeper)
    if (activeHammer.id === 'board_sweeper') {
      soundManager.playSweep();
      setSkillCooldownRemaining(activeHammer.cooldownSeconds);

      // Hit all active moles on board!
      let totalWipeHits = 0;
      holes.forEach((h, idx) => {
        if (h.isActive && !h.isHit) {
          totalWipeHits++;
          handleWhack(idx, { stopPropagation: () => {} } as unknown as React.MouseEvent);
        }
      });

      // Camera / board shake feedback
      const mainEl = document.getElementById('classic-arena');
      if (mainEl) {
        mainEl.classList.add('animate-ping');
        setTimeout(() => mainEl.classList.remove('animate-ping'), 250);
      }
    }

    // ค้อนแม่เสือสาว (Tiger Lady x3 multiplier)
    if (activeHammer.id === 'tiger_lady') {
      soundManager.playMultiplier();
      setIsMultiplierActive(true);
      setMultiplierTimer(6); // 6 seconds duration
      setSkillCooldownRemaining(activeHammer.cooldownSeconds);
    }
  };

  return (
    <div id="classic-arena" className="w-full flex flex-col items-center">
      {/* Top Banner: Mode Indicator & Difficulty selector */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-3 mb-4 bg-white/90 p-3 sm:p-4 rounded-2xl border border-emerald-100 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> โหมดคลาสสิก (ไม่มีโฆษณา/ลิงก์รบกวน)
          </div>
          <h2 className="text-lg font-bold text-slate-800">เลือกความยากในการท้าทาย</h2>
        </div>

        {/* 3 Difficulty Buttons */}
        <div className="flex items-center gap-1.5 bg-emerald-50/80 p-1 rounded-xl border border-emerald-100">
          {(['easy', 'medium', 'insane'] as Difficulty[]).map((d) => (
            <button
              key={d}
              disabled={isPlaying}
              onClick={() => setDifficulty(d)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition-all ${
                difficulty === d
                  ? DIFFICULTY_CONFIG[d].color + ' shadow-xs border scale-102 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 opacity-70'
              } ${isPlaying ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {DIFFICULTY_CONFIG[d].label}
            </button>
          ))}
        </div>
      </div>

      {/* Game HUD Bar: Timer, Score, Combo, Active Hammer */}
      <div className="w-full max-w-xl grid grid-cols-4 gap-2 mb-4 select-none">
        {/* Timer Card */}
        <div className="bg-white/90 border border-emerald-100 p-2.5 rounded-2xl flex flex-col items-center justify-center shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <Timer className="w-3 h-3 text-emerald-600" /> เวลา
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono leading-tight ${
              timeLeft <= 10 ? 'text-rose-600 animate-pulse' : 'text-slate-800'
            }`}
          >
            {timeLeft}s
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-white/90 border border-emerald-100 p-2.5 rounded-2xl flex flex-col items-center justify-center shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-500" /> คะแนน
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 leading-tight">
            {score.toLocaleString()}
          </div>
        </div>

        {/* Combo Card */}
        <div className="bg-white/90 border border-emerald-100 p-2.5 rounded-2xl flex flex-col items-center justify-center shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> คอมโบ
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono leading-tight ${
              combo >= 5 ? 'text-orange-500 animate-bounce' : 'text-slate-700'
            }`}
          >
            {combo}x
          </div>
        </div>

        {/* Hammer Status / Skill Card */}
        <div className="bg-white/90 border border-emerald-100 p-2 rounded-2xl flex flex-col items-center justify-center shadow-xs relative overflow-hidden">
          <div className="text-[10px] text-emerald-700 font-medium truncate max-w-full">
            {activeHammer.name}
          </div>
          <div className="text-xl sm:text-2xl">{activeHammer.icon}</div>

          {/* Special Ability Pill or Cooldown indicator */}
          {activeHammer.cooldownSeconds > 0 && (
            <div className="mt-0.5 text-[9px] font-bold">
              {skillCooldownRemaining > 0 ? (
                <span className="text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                  คูลดาวน์ {skillCooldownRemaining}s
                </span>
              ) : isMultiplierActive ? (
                <span className="text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded-full animate-pulse">
                  x3 เสือ ({multiplierTimer}s)
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                  พร้อมใช้!
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Special Hammer Skill Trigger Button (If hammer has an active skill) */}
      {activeHammer.cooldownSeconds > 0 && (
        <div className="w-full max-w-xl mb-3 flex justify-center">
          <button
            onClick={triggerHammerSkill}
            disabled={!isPlaying || skillCooldownRemaining > 0}
            className={`w-full py-2.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              !isPlaying || skillCooldownRemaining > 0
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:scale-101 active:scale-98 shadow-emerald-500/25 cursor-pointer ring-2 ring-emerald-300 animate-pulse-subtle'
            }`}
          >
            <Zap className="w-4 h-4 text-yellow-300" />
            <span>
              กดใช้สกิลค้อน: <strong className="underline">{activeHammer.skillName}</strong>
            </span>
            {skillCooldownRemaining > 0 ? (
              <span className="bg-black/10 px-2 py-0.5 rounded-full text-xs font-mono">
                รอคูลดาวน์ {skillCooldownRemaining} วินาที (ตีปกติได้)
              </span>
            ) : isMultiplierActive ? (
              <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-xs">
                ติดสถานะ x3 เหลือ {multiplierTimer}s
              </span>
            ) : (
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                คลิกเพื่อใช้งาน!
              </span>
            )}
          </button>
        </div>
      )}

      {/* The 3x3 Mole Grid Arena */}
      <div className="w-full max-w-xl relative">
        <MoleGrid
          holes={holes}
          onWhack={handleWhack}
          popups={popups}
          hammerSpeedMultiplier={hammerSpeedMultiplier}
        />

        {/* Start Game Overlay if not currently playing and not game over */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center p-6 z-30">
            <div className="bg-white/95 p-6 rounded-2xl border-2 border-[#95D58B] shadow-2xl max-w-sm text-center flex flex-col items-center animate-mole-emerge relative overflow-hidden">
              {/* Geometric shapes decoration */}
              <div className="absolute top-2 right-2 text-xs text-[#95D58B]">⭐</div>
              <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#B4E578]/40" />
              <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-sm bg-[#C3E895]/60" />

              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border border-[#C3E895] flex items-center justify-center text-3xl shadow-lg shadow-[#95D58B]/30 mb-3 relative">
                {activeHammer.icon}
                <span className="absolute -bottom-1 -right-1 text-xs">✨</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                <span>⭐</span> สังเวียนล่าแชงเบี้ย <span>⭐</span>
              </h3>
              <p className="text-xs text-slate-700 mt-1 mb-4 leading-relaxed font-medium">
                ทุบตีไอ้แชงเบี้ยตัวการ์ตูนปืนเขียวที่เด้งดึ๋งขึ้นมาจากหลุม! ยิ่งทุบต่อเนื่องคอมโบยิ่งสูง รับเหรียญและ EXP อัปเลเวลปลดล็อกป้ายฉายา
              </p>

              <button
                onClick={startGame}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#82cb75] text-slate-900 font-black text-base shadow-lg shadow-[#95D58B]/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#C3E895]"
              >
                <Play className="w-5 h-5 fill-slate-900" /> เริ่มทุบเลย (60 วินาที)
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[3px] rounded-3xl flex flex-col items-center justify-center p-6 z-30">
            <div className="bg-white/95 p-6 rounded-3xl border-2 border-emerald-300 shadow-2xl max-w-sm w-full text-center flex flex-col items-center animate-mole-emerge">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-2xl font-black text-slate-800">หมดเวลาการท้าทาย!</h3>
              <p className="text-xs text-emerald-700 font-semibold mb-4">
                คุณทำผลงานได้อย่างยอดเยี่ยม
              </p>

              <div className="w-full grid grid-cols-2 gap-2 mb-4">
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-[10px] text-emerald-700 font-medium">คะแนนรวมรอบนี้</div>
                  <div className="text-xl font-black text-emerald-900 font-mono">
                    {score.toLocaleString()}
                  </div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <div className="text-[10px] text-amber-700 font-medium">คอมโบสูงสุด</div>
                  <div className="text-xl font-black text-amber-900 font-mono">
                    {maxComboThisRound}x
                  </div>
                </div>
              </div>

              <div className="w-full flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 mb-5">
                <span>เลเวลปัจจุบัน: <strong className="text-emerald-700">Lv. {profile.level}</strong></span>
                <span>เหรียญทั้งหมด: <strong className="text-amber-600">{profile.coins.toLocaleString()} 🪙</strong></span>
              </div>

              <button
                onClick={startGame}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-base shadow-lg shadow-emerald-500/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" /> เล่นใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Tip: Hammer & Rule Notice */}
      <div className="w-full max-w-xl mt-4 p-3 bg-white/70 rounded-2xl border border-emerald-100/80 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">{activeHammer.icon}</span>
          <div>
            <div className="font-bold text-slate-800">{activeHammer.name} (ค้อนที่ติดตั้งอยู่)</div>
            <div className="text-[11px] text-slate-500">{activeHammer.skillDescription}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
          ความเร็วค้อน: x{hammerSpeedMultiplier.toFixed(1)}
        </div>
      </div>
    </div>
  );
};
