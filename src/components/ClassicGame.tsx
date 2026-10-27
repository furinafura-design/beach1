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
  onOpenWheel?: () => void;
}

export type SkillType = 'weapon' | 'bomb' | 'multiplier' | 'dog_frenzy';

export const ClassicGame: React.FC<ClassicGameProps> = ({
  profile,
  onUpdateProfile,
  onLevelUpAlert,
  onOpenWheel
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
      pointsValue: 100,
      moleCount: 1
    }))
  );
  const [popups, setPopups] = useState<ScorePopup[]>([]);

  // Special Hammer Skill states
  const [selectedSkill, setSelectedSkill] = useState<SkillType>('weapon');
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

    // Submit score to online real-time leaderboard
    if (score > 0) {
      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          score,
          maxCombo: maxComboThisRound,
          mode: 'classic',
          badgeName: profile.unlockedBadgeIds.length > 0 ? 'นักล่าแชงเบี้ย' : 'มือใหม่หัดทุบ',
          hammerName: activeHammer.name,
          molesWhacked: profile.totalMolesWhacked
        })
      }).catch((err) => console.warn('Failed to submit classic leaderboard score:', err));
    }
  }, [activeHammer.name, clearAllTimers, maxComboThisRound, profile.totalMolesWhacked, profile.unlockedBadgeIds.length, profile.username, score]);

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

    const moleCount = hole.moleCount && hole.moleCount > 1 ? hole.moleCount : 1;

    // Play Sound
    if (multiplier >= 3) {
      soundManager.playWhack('crit');
    } else if (isDouble || moleCount > 1) {
      soundManager.playWhack('double');
    } else {
      soundManager.playWhack('normal');
    }

    // Check passive proc bonus (Unlocked at Hammer Speed Level >= 2: "สุ่มสกิลเสริม")
    let hasProcBonus = false;
    let procBonusPoints = 0;
    let procBonusCoins = 0;
    if (profile.hammerSpeedLevel >= 2 && Math.random() < 0.25) {
      hasProcBonus = true;
      procBonusPoints = 250;
      procBonusCoins = 15;
      soundManager.playProc();
    }

    // Calculate Points, Exp, Coins
    const comboBonus = Math.floor(combo * 5);
    const basePoints = hole.pointsValue * moleCount;
    const gainedPoints = (basePoints + comboBonus) * multiplier + procBonusPoints;
    const gainedExp = Math.floor(config.expPerHit * multiplier * moleCount);
    const gainedCoins =
      Math.floor((gainedPoints / 25) * (activeHammer.id === 'golden_star' ? 1.5 : 1)) + procBonusCoins;

    // Update Combo (adds moleCount to combo for multi-mole whacks!)
    const nextCombo = combo + moleCount;
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

    // Floating score popup text with kuy! on every hit as requested
    const popupId = Math.random().toString();
    let popupText = `kuy! +${gainedPoints} ดิว้า!`;
    if (moleCount > 1) {
      popupText = `kuy! x${moleCount} ตัวดิว้า! อะไรว้า ชั่ยคร๊าฟ +${gainedPoints}`;
    } else if (hasProcBonus) {
      popupText = `kuy! +${gainedPoints} 🎲โบนัสสุ่มดิว้า ชั่ยคร๊าฟ!`;
    } else if (isMultiplierActive) {
      popupText = `kuy! +${gainedPoints} (x3 ดิว้า!)`;
    } else if (isDouble) {
      popupText = `kuy! +${gainedPoints} (x2 ชั่ยคร๊าฟ!)`;
    }

    const popupColor = isMultiplierActive
      ? '#f43f5e'
      : moleCount > 1
      ? '#a855f7'
      : hasProcBonus
      ? '#0284c7'
      : isDouble
      ? '#f59e0b'
      : '#059669';

    setPopups((prev) => [
      ...prev,
      { id: popupId, holeIndex: index, text: popupText, color: popupColor }
    ]);

    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 800);

    // Retract mole after hit animation (smooth 650ms retreat back into hole)
    if (holeRetractTimers.current[index]) {
      clearTimeout(holeRetractTimers.current[index]);
    }
    holeRetractTimers.current[index] = setTimeout(() => {
      setHoles((prev) =>
        prev.map((h, i) => (i === index ? { ...h, isActive: false, isHit: false, moleCount: 1 } : h))
      );
    }, 650);

    // Update User Profile (EXP, Coins, Points for wheel, Level up check without annoying alerts)
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
        points: (prev.points ?? 0) + gainedPoints,
        currentExp: newLevel >= 100 ? 0 : newExp,
        level: newLevel,
        maxExp: newMaxExp,
        totalMolesWhacked: prev.totalMolesWhacked + moleCount,
        highestScore: Math.max(prev.highestScore, score + gainedPoints),
        highestCombo: Math.max(prev.highestCombo, nextCombo)
      };
    });
  };

  // Trigger Special Hammer Skill (Reliable for all hammers, activated by F key or button)
  const triggerHammerSkill = useCallback((skillOverride?: SkillType) => {
    if (!isPlaying) return;
    if (skillCooldownRemaining > 0) return; // If on cooldown, does normal whacking

    const targetSkill = skillOverride || selectedSkill;
    const baseCooldown = activeHammer.cooldownSeconds || 8;
    // Level 10 halves the cooldown!
    const cooldown = profile.hammerSpeedLevel >= 10 ? Math.ceil(baseCooldown / 2) : baseCooldown;

    // 1. ระเบิดบอร์ด (Unlocked at Hammer Speed Level >= 4)
    if (targetSkill === 'bomb' && profile.hammerSpeedLevel >= 4) {
      setSkillCooldownRemaining(cooldown);
      soundManager.playBomb();

      // Wipe all holes immediately!
      setHoles((prev) =>
        prev.map((h) => ({
          ...h,
          isActive: true,
          isHit: true,
          hitCount: h.hitCount + 1
        }))
      );

      const bonusPoints = 1600;
      setScore((prev) => prev + bonusPoints);
      setCombo((prev) => prev + 6);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '💣 kuy! ระเบิดตูมตามทั้งโต๊ะ! +1,600', color: '#e11d48' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      // Camera vibration
      const mainEl = document.getElementById('classic-arena');
      if (mainEl) {
        mainEl.classList.add('animate-ping');
        setTimeout(() => mainEl.classList.remove('animate-ping'), 250);
      }

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // 2. คะแนนคูณ 3 หนึ่งครั้ง (Unlocked at Hammer Speed Level >= 6)
    if (targetSkill === 'multiplier' && profile.hammerSpeedLevel >= 6) {
      setSkillCooldownRemaining(cooldown);
      soundManager.playMultiplier();
      setIsMultiplierActive(true);
      setMultiplierTimer(10); // 10 seconds of 3x

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '✨ kuy! แต้มคูณ 3 พุ่งทะลุพิกัด!', color: '#f59e0b' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
      return;
    }

    // 3. สกิลหมา (หลายตัวในรูเดียว!) (Unlocked at Hammer Speed Level >= 8)
    if (targetSkill === 'dog_frenzy' && profile.hammerSpeedLevel >= 8) {
      setSkillCooldownRemaining(cooldown);
      soundManager.playDogBark();

      // Immediately crowd multiple moles inside 4-5 holes!
      setHoles((prev) =>
        prev.map((h, i) => {
          if (i % 2 === 0 || i === 4) {
            return {
              ...h,
              isActive: true,
              isHit: false,
              hitCount: 0,
              popType: 'fast',
              pointsValue: 250,
              moleCount: 3 // Multiple moles crowded in hole
            };
          }
          return h;
        })
      );

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '🐕 kuy! สกิลหมาหมู่! โผล่หลายตัวในรูเดียว!', color: '#9333ea' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
      return;
    }

    // 4. Default: Equipped Hammer's Weapon Ability
    setSkillCooldownRemaining(cooldown);

    // ค้อนเฆี่ยนแชงเบี้ย (Board Sweeper)
    if (activeHammer.id === 'board_sweeper') {
      soundManager.playSweep();

      setHoles((prev) => {
        return prev.map((h, i) => {
          if (h.isActive && !h.isHit) {
            return { ...h, isHit: true, hitCount: h.hitCount + 1 };
          }
          if (i < 4) {
            return { ...h, isActive: true, isHit: true, hitCount: h.hitCount + 1 };
          }
          return h;
        });
      });

      const bonusPoints = 1200;
      setScore((prev) => prev + bonusPoints);
      setCombo((prev) => prev + 4);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '💥 kuy! ทุบกวาดโต๊ะ! +1,200', color: '#9333ea' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      const mainEl = document.getElementById('classic-arena');
      if (mainEl) {
        mainEl.classList.add('animate-ping');
        setTimeout(() => mainEl.classList.remove('animate-ping'), 250);
      }

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // ค้อนแม่เสือสาว (Tiger Lady x3 multiplier)
    if (activeHammer.id === 'tiger_lady') {
      soundManager.playMultiplier();
      setIsMultiplierActive(true);
      setMultiplierTimer(8);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '🐯 kuy! คำรามแม่เสือสาว! แต้ม x3', color: '#f43f5e' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
      return;
    }

    // ค้อนล่าไวเบิ้ลสอง (Double Whack)
    if (activeHammer.id === 'double_whack') {
      soundManager.playWhack('double');
      let hitCount = 0;
      setHoles((prev) =>
        prev.map((h, i) => {
          if (h.isActive && !h.isHit && hitCount < 2) {
            hitCount++;
            return { ...h, isHit: true };
          }
          if (hitCount < 2 && i < 2) {
            hitCount++;
            return { ...h, isActive: true, isHit: true };
          }
          return h;
        })
      );

      const bonusPoints = 600;
      setScore((prev) => prev + bonusPoints);
      setCombo((prev) => prev + 2);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 1, text: '⚡ kuy! พายุหมุนทุบเบิ้ล! +600', color: '#f59e0b' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // ค้อนดาวทองพาสเทล (Golden Star)
    if (activeHammer.id === 'golden_star') {
      soundManager.playCoin();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 150 }));
      setScore((prev) => prev + 400);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '⭐ kuy! โปรยเหรียญทอง! +150 🪙', color: '#eab308' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
      return;
    }

    // 1. ครกหินตำแหลก (ครก)
    if (activeHammer.id === 'mortar') {
      soundManager.playBomb();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 60 }));
      let hitCount = 0;
      setHoles((prev) =>
        prev.map((h, i) => {
          if (i === 3 || i === 4 || i === 5) {
            hitCount++;
            return { ...h, isActive: true, isHit: true, hitCount: h.hitCount + 1 };
          }
          return h;
        })
      );
      setScore((prev) => prev + 950);
      setCombo((prev) => prev + 3);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '🥣 kuy! สากตำแหลกกระจุย! โป๊กกกก +950 🪙+60', color: '#78716c' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // 2. รถถังประจัญบาน (รถถัง)
    if (activeHammer.id === 'tank') {
      soundManager.playBomb();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 120 }));
      setHoles((prev) =>
        prev.map((h, i) => {
          if (i === 1 || i === 3 || i === 5 || i === 7) {
            return { ...h, isActive: true, isHit: true, hitCount: h.hitCount + 1 };
          }
          return h;
        })
      );
      setScore((prev) => prev + 1800);
      setCombo((prev) => prev + 4);

      const mainEl = document.getElementById('classic-arena');
      if (mainEl) {
        mainEl.classList.add('animate-ping');
        setTimeout(() => mainEl.classList.remove('animate-ping'), 250);
      }

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '🚜 kuy! ปืนใหญ่รถถังยิงกวาด! ตูมมม +1,800 🪙+120', color: '#047857' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // 3. ปืนใหญ่พระกาฬ (ปืนใหญ่)
    if (activeHammer.id === 'cannon') {
      soundManager.playBomb();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 200 }));
      setHoles((prev) =>
        prev.map((h, i) => {
          if (i === 0 || i === 2 || i === 6 || i === 8) {
            return { ...h, isActive: true, isHit: true, hitCount: h.hitCount + 1 };
          }
          return h;
        })
      );
      setScore((prev) => prev + 1600);
      setCombo((prev) => prev + 4);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '💣 kuy! กระสุนใหญ่ถล่มรัง! +1,600 🪙+200', color: '#1e293b' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // 4. ไข่หมาในตำนาน (ไข่หมา)
    if (activeHammer.id === 'dog_egg') {
      soundManager.playDogBark();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 150 }));
      setHoles((prev) =>
        prev.map((h, i) => {
          if (i === 1 || i === 4 || i === 7) {
            return {
              ...h,
              isActive: true,
              isHit: false,
              hitCount: 0,
              popType: 'fast',
              pointsValue: 300,
              moleCount: 4 // 4 moles crammed in hole!
            };
          }
          return h;
        })
      );
      setScore((prev) => prev + 1000);

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '🥚 kuy! ไข่หมาสำแดงเดช! ตุ่นร้องเอ๋งงง โผล่ 4 ตัวรวด! +1,000', color: '#d97706' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
      return;
    }

    // 5. เมียหลวงพิโรธ (เมีย)
    if (activeHammer.id === 'wife') {
      soundManager.playLevelUp();
      soundManager.playBomb();
      onUpdateProfile((prev) => ({ ...prev, coins: prev.coins + 350 }));

      // Complete 100% board wipe
      setHoles((prev) =>
        prev.map((h) => ({
          ...h,
          isActive: true,
          isHit: true,
          hitCount: h.hitCount + 1
        }))
      );
      setScore((prev) => prev + 2500);
      setCombo((prev) => prev + 9);

      const mainEl = document.getElementById('classic-arena');
      if (mainEl) {
        mainEl.classList.add('animate-bounce');
        setTimeout(() => mainEl.classList.remove('animate-bounce'), 400);
      }

      const popupId = Math.random().toString();
      setPopups((prev) => [
        ...prev,
        { id: popupId, holeIndex: 4, text: '👰 kuy! เมียหลวงพิโรธ! เสียงด่าสะท้านปฐพี ตุ่นยอมแพ้ทั้งโต๊ะ! +2,500 🪙+350', color: '#e11d48' }
      ]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 1100);

      setTimeout(() => {
        setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
      }, 650);
      return;
    }

    // ค้อนไม้พาสเทล (Basic Hammer Power Smash)
    soundManager.playWhack('crit');
    setScore((prev) => prev + 350);
    setCombo((prev) => prev + 1);

    const popupId = Math.random().toString();
    setPopups((prev) => [
      ...prev,
      { id: popupId, holeIndex: 4, text: '🔨 kuy! ทุบพลังพาสเทล! +350', color: '#10b981' }
    ]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 900);
  }, [activeHammer, isPlaying, onUpdateProfile, profile.hammerSpeedLevel, selectedSkill, skillCooldownRemaining]);

  // Trigger Bomb from Wheel inventory (using key [B] or UI button)
  const triggerInventoryBomb = useCallback(() => {
    if (!isPlaying) return;
    if ((profile.bombsCount ?? 0) <= 0) return;

    onUpdateProfile((prev) => ({
      ...prev,
      bombsCount: Math.max(0, (prev.bombsCount ?? 0) - 1)
    }));

    soundManager.playBomb();

    setHoles((prev) =>
      prev.map((h) => ({
        ...h,
        isActive: true,
        isHit: true,
        hitCount: h.hitCount + 1
      }))
    );

    const bonusPoints = 2000;
    setScore((prev) => prev + bonusPoints);
    setCombo((prev) => prev + 9);

    const popupId = Math.random().toString();
    setPopups((prev) => [
      ...prev,
      { id: popupId, holeIndex: 4, text: '💣 kuy! ระเบิดบึ้มตูดแชงเบี้ยดิว้า! อะไรว้า ชั่ยคร๊าฟ +2,000', color: '#e11d48' }
    ]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 1000);

    const mainEl = document.getElementById('classic-arena');
    if (mainEl) {
      mainEl.classList.add('animate-ping');
      setTimeout(() => mainEl.classList.remove('animate-ping'), 300);
    }

    setTimeout(() => {
      setHoles((prev) => prev.map((h) => ({ ...h, isActive: false, isHit: false, moleCount: 1 })));
    }, 650);
  }, [isPlaying, onUpdateProfile, profile.bombsCount]);

  // Keyboard shortcut listener: Press 'F' for hammer skill, Press 'B' for inventory bomb
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        triggerHammerSkill();
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        triggerInventoryBomb();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerHammerSkill, triggerInventoryBomb]);

  // Helper for skill name and icon display
  const getSkillInfo = () => {
    if (selectedSkill === 'bomb') {
      return {
        icon: '💣',
        name: 'สกิลระเบิด',
        desc: 'ระเบิดกวาดทั้งโต๊ะทันที (ปลดล็อกที่ค้อน Lv.4)',
        available: profile.hammerSpeedLevel >= 4
      };
    }
    if (selectedSkill === 'multiplier') {
      return {
        icon: '✨',
        name: 'สกิลแต้ม x3',
        desc: 'เปิดโหมดแต้มคูณ 3 นาน 10 วินาที (ปลดล็อกที่ค้อน Lv.6)',
        available: profile.hammerSpeedLevel >= 6
      };
    }
    if (selectedSkill === 'dog_frenzy') {
      return {
        icon: '🐕',
        name: 'สกิลหมาหมู่',
        desc: 'เสกตุ่นโผล่ขึ้นมาหลายตัวในรูเดียว! (ปลดล็อกที่ค้อน Lv.8)',
        available: profile.hammerSpeedLevel >= 8
      };
    }
    return {
      icon: activeHammer.icon,
      name: `ค้อน: ${activeHammer.skillName}`,
      desc: activeHammer.skillDescription,
      available: true
    };
  };

  const skillInfo = getSkillInfo();

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

      {/* Quick Wheel Banner */}
      <div 
        onClick={onOpenWheel}
        className="w-full max-w-xl mb-3.5 p-2.5 bg-gradient-to-r from-purple-100 via-pink-50 to-emerald-50 rounded-2xl border-2 border-purple-200/90 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl group-hover:rotate-180 transition-transform duration-500">🎡</span>
          <div>
            <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
              <span>วงล้อดิว้า เสี่ยงโชคตูดระเบิด</span>
              <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.2 rounded-md">
                {(profile.points ?? 0).toLocaleString()} แต้ม
              </span>
            </div>
            <div className="text-[10px] text-purple-700 font-medium">
              เอาคะแนนไปหมุนลุ้นระเบิด ได้เงิน ได้คะแนน ได้ขยะ ได้อาม่า อะไรว้า ชั่ยคร๊าฟ!
            </div>
          </div>
        </div>
        <button className="text-xs bg-purple-600 group-hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1">
          หมุนดิว้า →
        </button>
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

      {/* Special Skills Switcher Tabs (Weapon, Bomb Lv4, Multiplier Lv6, Dog Frenzy Lv8) */}
      <div className="w-full max-w-xl mb-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1 px-1">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> เลือกสกิลใช้งานด้วยปุ่ม [F] หรือปุ่มลอย:
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-mono">
            ค้อน Lv.{profile.hammerSpeedLevel}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/80 rounded-2xl border border-emerald-100 shadow-xs">
          {/* 1. Hammer Weapon Skill */}
          <button
            onClick={() => setSelectedSkill('weapon')}
            className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              selectedSkill === 'weapon'
                ? 'bg-gradient-to-r from-[#95D58B] to-[#B4E578] text-slate-950 font-black shadow-xs ring-2 ring-[#95D58B]'
                : 'bg-emerald-50/60 hover:bg-emerald-100/60 text-slate-700 font-semibold'
            }`}
          >
            <span className="text-base sm:text-lg">{activeHammer.icon}</span>
            <span className="text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-bold">ค้อนหลัก</span>
          </button>

          {/* 2. Bomb Skill (Lv. 4) */}
          <button
            disabled={profile.hammerSpeedLevel < 4}
            onClick={() => setSelectedSkill('bomb')}
            className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
              profile.hammerSpeedLevel < 4
                ? 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                : selectedSkill === 'bomb'
                ? 'bg-gradient-to-r from-rose-400 to-rose-500 text-white font-black shadow-xs ring-2 ring-rose-400 cursor-pointer'
                : 'bg-rose-50/80 hover:bg-rose-100 text-rose-900 font-semibold cursor-pointer'
            }`}
          >
            <span className="text-base sm:text-lg">💣</span>
            <span className="text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-bold">
              {profile.hammerSpeedLevel < 4 ? 'ระเบิด (Lv.4)' : 'ระเบิดบอร์ด'}
            </span>
          </button>

          {/* 3. Multiplier x3 (Lv. 6) */}
          <button
            disabled={profile.hammerSpeedLevel < 6}
            onClick={() => setSelectedSkill('multiplier')}
            className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
              profile.hammerSpeedLevel < 6
                ? 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                : selectedSkill === 'multiplier'
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black shadow-xs ring-2 ring-amber-400 cursor-pointer'
                : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-semibold cursor-pointer'
            }`}
          >
            <span className="text-base sm:text-lg">✨</span>
            <span className="text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-bold">
              {profile.hammerSpeedLevel < 6 ? 'คูณ 3 (Lv.6)' : 'แต้ม x3'}
            </span>
          </button>

          {/* 4. Dog Frenzy Multi-mole (Lv. 8) */}
          <button
            disabled={profile.hammerSpeedLevel < 8}
            onClick={() => setSelectedSkill('dog_frenzy')}
            className={`py-1.5 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
              profile.hammerSpeedLevel < 8
                ? 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                : selectedSkill === 'dog_frenzy'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-xs ring-2 ring-purple-400 cursor-pointer'
                : 'bg-purple-50/80 hover:bg-purple-100 text-purple-900 font-semibold cursor-pointer'
            }`}
          >
            <span className="text-base sm:text-lg">🐕</span>
            <span className="text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-bold">
              {profile.hammerSpeedLevel < 8 ? 'หมาหมู่ (Lv.8)' : 'สกิลหมาหมู่'}
            </span>
          </button>
        </div>
      </div>

      {/* Special Hammer Skill Trigger Button (Active & Keybind [F]) */}
      <div className="w-full max-w-xl mb-3 flex justify-center">
        <button
          onClick={() => triggerHammerSkill(selectedSkill)}
          disabled={!isPlaying || skillCooldownRemaining > 0 || !skillInfo.available}
          className={`w-full py-3 px-4 rounded-2xl font-black flex items-center justify-between gap-2 transition-all shadow-md touch-manipulation cursor-pointer ${
            !isPlaying || skillCooldownRemaining > 0 || !skillInfo.available
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
              : 'bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] text-slate-950 border-2 border-[#95D58B] hover:scale-101 active:scale-95 shadow-[#95D58B]/30 ring-2 ring-[#B4E578] animate-pulse-subtle'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/80 border border-[#95D58B] flex items-center justify-center font-mono font-black text-xs text-slate-900 shadow-xs">
              [ F ]
            </span>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black flex items-center gap-1">
                <span>{skillInfo.icon}</span>
                <span>{skillInfo.name}</span>
              </div>
              <div className="text-[10px] text-slate-600 font-medium hidden sm:block">
                {skillInfo.desc}
              </div>
            </div>
          </div>

          <div>
            {skillCooldownRemaining > 0 ? (
              <span className="bg-black/15 text-slate-700 px-3 py-1 rounded-xl text-xs font-mono font-bold">
                คูลดาวน์ {skillCooldownRemaining}s (ตีปกติได้)
              </span>
            ) : isMultiplierActive ? (
              <span className="bg-rose-500 text-white px-3 py-1 rounded-xl text-xs font-bold animate-pulse">
                🔥 x3 แชงเบี้ย ({multiplierTimer}s)
              </span>
            ) : !skillInfo.available ? (
              <span className="bg-slate-300 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold">
                ยังไม่ปลดล็อก
              </span>
            ) : (
              <span className="bg-white/90 text-emerald-950 px-3 py-1 rounded-xl text-xs font-black shadow-xs border border-[#95D58B]">
                แตะ / กด [F] ทันที!
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Bomb from Wheel Inventory Button (Shows when player has bombs from the wheel) */}
      {(profile.bombsCount ?? 0) > 0 && (
        <div className="w-full max-w-xl mb-3 flex justify-center">
          <button
            onClick={triggerInventoryBomb}
            disabled={!isPlaying}
            className={`w-full py-2.5 px-4 rounded-2xl font-black flex items-center justify-between gap-2 transition-all shadow-md touch-manipulation cursor-pointer ${
              !isPlaying
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 text-white border-2 border-rose-300 hover:scale-101 active:scale-95 shadow-rose-500/30 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center font-mono font-black text-xs text-white shadow-xs">
                [ B ]
              </span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black flex items-center gap-1">
                  <span>💣</span>
                  <span>ระเบิดบึ้มตูดแชงเบี้ย (มี {profile.bombsCount} ลูก)</span>
                </div>
                <div className="text-[10px] text-white/90 font-medium hidden sm:block">
                  กดปุ่มหรือกด [B] เพื่อบึ้มตัวแชงเบี้ยทั้งหมดทันทีดิว้า! อะไรว้า ชั่ยคร๊าฟ
                </div>
              </div>
            </div>
            <span className="bg-white text-rose-700 px-3 py-1 rounded-xl text-xs font-black shadow-xs">
              แตะ / กด [B] บึ้มเลย!
            </span>
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
                <span>⭐</span> ตีแชงเบี้ย ตีให้ตูดระเบิด <span>⭐</span>
              </h3>
              <p className="text-xs text-slate-700 mt-1 mb-4 leading-relaxed font-medium">
                ทุบตีไอ้แชงเบี้ยที่เด้งดึ๋งขึ้นมาจากหลุมดิว้า! อะไรว้า ชั่ยคร๊าฟ ยิ่งทุบต่อเนื่องคอมโบยิ่งสูง รับเหรียญและสะสมคะแนนไปหมุนวงล้อเสี่ยงโชค!
              </p>

              <button
                onClick={startGame}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#82cb75] text-slate-900 font-black text-base shadow-lg shadow-[#95D58B]/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#C3E895]"
              >
                <Play className="w-5 h-5 fill-slate-900" /> เริ่มทุบดิว้า (60 วินาที)
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[3px] rounded-3xl flex flex-col items-center justify-center p-6 z-30">
            <div className="bg-white/95 p-6 rounded-3xl border-2 border-emerald-300 shadow-2xl max-w-sm w-full text-center flex flex-col items-center animate-mole-emerge">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-2xl font-black text-slate-800">หมดเวลาการท้าทายดิว้า!</h3>
              <p className="text-xs text-emerald-700 font-semibold mb-4">
                คุณทำผลงานได้อย่างยอดเยี่ยมอะไรว้า ชั่ยคร๊าฟ!
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
                <span>เลเวล: <strong className="text-emerald-700">Lv. {profile.level}</strong></span>
                <span>คะแนนสะสม: <strong className="text-purple-700">{(profile.points ?? 0).toLocaleString()} ⭐</strong></span>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={startGame}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-base shadow-lg shadow-emerald-500/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" /> เล่นใหม่อีกครั้งดิว้า
                </button>

                {onOpenWheel && (
                  <button
                    onClick={onOpenWheel}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>🎡</span> ไปหมุนวงล้อดิว้า (มี {(profile.points ?? 0).toLocaleString()} แต้ม) ชั่ยคร๊าฟ
                  </button>
                )}
              </div>
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

      {/* Mobile Floating Action Button (FAB) for Instant Hammer Skill */}
      {isPlaying && (
        <div className="md:hidden fixed bottom-18 right-4 z-40">
          <button
            onClick={() => triggerHammerSkill(selectedSkill)}
            disabled={skillCooldownRemaining > 0 || !skillInfo.available}
            className={`w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center border-3 touch-manipulation transition-all cursor-pointer ${
              skillCooldownRemaining > 0 || !skillInfo.available
                ? 'bg-slate-200 border-slate-300 text-slate-500 opacity-80 cursor-not-allowed'
                : 'bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border-white text-slate-950 scale-105 ring-4 ring-[#B4E578]/50 shadow-[#95D58B]/50 active:scale-90 animate-pulse-subtle'
            }`}
          >
            <span className="text-2xl">{skillInfo.icon}</span>
            <span className="text-[10px] font-black leading-tight">
              {skillCooldownRemaining > 0 ? `${skillCooldownRemaining}s` : 'สกิล [F]'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
