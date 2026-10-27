import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { MOLE_IMAGE_URL } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Difficulty, JudgmentType, RhythmNote, UserProfile, NoteType, NoteGimmick, FlickDirection, RhythmHero } from '../types/game';
import {
  Music,
  Play,
  Pause,
  Sparkles,
  Award,
  Flame,
  Maximize,
  Minimize,
  Settings,
  Bot,
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUp
} from 'lucide-react';

interface RhythmGameProps {
  profile: UserProfile;
  onUpdateProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  onLevelUpAlert: (newLevel: number, newBadges: string[]) => void;
}

export const RHYTHM_DIFFICULTY: Record<
  Difficulty,
  {
    label: string;
    subLabel: string;
    speedMultiplier: number;
    intervalMultiplier: number;
    activeLanes: number[];
    scoreMultiplier: number;
    color: string;
  }
> = {
  easy: {
    label: 'ง่าย',
    subLabel: '2 เลน ชิลๆ ดิว้า ชั่ยคร๊าฟ',
    speedMultiplier: 0.9,
    intervalMultiplier: 1.0,
    activeLanes: [1, 2],
    scoreMultiplier: 1.0,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  medium: {
    label: 'ปานกลาง',
    subLabel: '4 เลน โน้ตตามคำร้องเพลงดิว้า ชั่ยคร๊าฟ',
    speedMultiplier: 1.15,
    intervalMultiplier: 0.5,
    activeLanes: [0, 1, 2, 3],
    scoreMultiplier: 1.5,
    color: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  insane: {
    label: 'ยากมหาโหด',
    subLabel: 'Master สปีดไวรัวๆ อะไรว้า นิ้วแทบระเบิด ชั่ยคร๊าฟ',
    speedMultiplier: 1.55,
    intervalMultiplier: 0.32,
    activeLanes: [0, 1, 2, 3],
    scoreMultiplier: 2.2,
    color: 'bg-rose-50 text-rose-800 border-rose-300'
  }
};

const PRESET_TRACKS = [
  {
    name: '🔥 เพลงแนะนำประจำสังเวียน (H3ynKWEboA8) ดิว้า!',
    url: 'https://youtu.be/H3ynKWEboA8?si=7KtV6EmYMvR2EAzR',
    bpm: 145,
    duration: 156
  },
  {
    name: 'Electro Anime Pop (BPM 135)',
    url: 'https://www.youtube.com/watch?v=fKopy74weus',
    bpm: 135,
    duration: 184
  },
  {
    name: 'Vocaloid High Beat (BPM 160)',
    url: 'https://www.youtube.com/watch?v=tNkZsRW7h2c',
    bpm: 160,
    duration: 142
  },
  {
    name: 'Chill Melodic Hop (BPM 90)',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    bpm: 90,
    duration: 120
  }
];

const DEFAULT_LANE_KEYS = ['D', 'F', 'J', 'K'];

const KEY_PRESETS: { name: string; keys: string[] }[] = [
  { name: 'D, F, J, K (มาตรฐาน)', keys: ['D', 'F', 'J', 'K'] },
  { name: 'A, S, K, L (เว้นระยะสบายมือ)', keys: ['A', 'S', 'K', 'L'] },
  { name: 'Z, X, N, M (แถวล่าง)', keys: ['Z', 'X', 'N', 'M'] },
  { name: '←, ↓, ↑, → (ปุ่มลูกศร)', keys: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'] },
  { name: '1, 2, 3, 4 (แป้นตัวเลข)', keys: ['1', '2', '3', '4'] }
];

const INITIAL_HEROES: RhythmHero[] = [
  {
    id: 'hero_drummer',
    name: 'แชงเบี้ยมือกลอง',
    role: 'Fever Booster',
    avatar: '🥁',
    skillName: 'Fever Burst (+50% แต้ม)',
    skillDesc: 'เพิ่มคะแนนทุกการกด 50% นาน 8 วินาที',
    cooldown: 20,
    currentCooldown: 0,
    icon: '⚡',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'hero_gunner',
    name: 'นักล่าปืนเขียว',
    role: 'Miss Shield',
    avatar: '🔫',
    skillName: 'เกราะป้องกัน Miss (3 ครั้ง)',
    skillDesc: 'เปลี่ยนการกดพลาด Miss เป็น Good ได้ 3 ครั้ง',
    cooldown: 25,
    currentCooldown: 0,
    icon: '🛡️',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'hero_chef',
    name: 'เชฟปรุงลาบ',
    role: 'Healer',
    avatar: '🌶️',
    skillName: 'ลาบรสแซ่บ (+25 HP)',
    skillDesc: 'ฟื้นฟูเลือด HP ทันที 25 หน่วย',
    cooldown: 18,
    currentCooldown: 0,
    icon: '💖',
    color: 'from-rose-400 to-pink-500'
  },
  {
    id: 'hero_ahmah',
    name: 'อาม่าซูเปอร์สตาร์',
    role: 'Golden Rain',
    avatar: '👵',
    skillName: 'โปรยทองคำ (Golden Crit x2)',
    skillDesc: 'เปลี่ยนโน้ต 5 ตัวถัดไปเป็นโน้ตทองคำคูณ 2',
    cooldown: 28,
    currentCooldown: 0,
    icon: '⭐',
    color: 'from-yellow-400 to-amber-500'
  }
];

export const RhythmGame: React.FC<RhythmGameProps> = ({
  profile,
  onUpdateProfile
}) => {
  // Main Settings & Preferences
  const [laneKeys, setLaneKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rhythm_custom_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_LANE_KEYS;
  });

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMvMode, setIsMvMode] = useState<boolean>(false); // Auto Play / MV Mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [listeningLane, setListeningLane] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState<boolean>(true);
  const [showCoopDuel, setShowCoopDuel] = useState<boolean>(false);

  // Raised Judgment Line height (~5 cm = 180px from bottom edge)
  const [judgmentLineOffset, setJudgmentLineOffset] = useState<number>(180);

  // Gameplay State
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [health, setHealth] = useState<number>(100);
  const [feverTimer, setFeverTimer] = useState<number>(0);
  const [shieldCharges, setShieldCharges] = useState<number>(0);
  const [goldenBuffRemaining, setGoldenBuffRemaining] = useState<number>(0);
  const [heroes, setHeroes] = useState<RhythmHero[]>(INITIAL_HEROES);

  // Song Timing & Auto-End State
  const [songDurationSec, setSongDurationSec] = useState<number>(156);
  const [songElapsedSec, setSongElapsedSec] = useState<number>(0);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [earnedCoinsInRound, setEarnedCoinsInRound] = useState<number>(0);
  const [earnedPointsInRound, setEarnedPointsInRound] = useState<number>(0);

  // Co-op Duel Rival State
  const [rivalScore, setRivalScore] = useState<number>(0);
  const [rivalCombo, setRivalCombo] = useState<number>(0);

  // Visual & Chart Gimmicks
  const [judgmentLineAngle, setJudgmentLineAngle] = useState<number>(0);
  const [isLineSplit, setIsLineSplit] = useState<boolean>(false);
  const [activeSpeedGimmick, setActiveSpeedGimmick] = useState<string | null>(null);

  // Lane input visual state
  const [laneHits, setLaneHits] = useState<boolean[]>([false, false, false, false]);
  const [holdingLanes, setHoldingLanes] = useState<boolean[]>([false, false, false, false]);
  const [lastJudgment, setLastJudgment] = useState<{ type: JudgmentType; id: number; text?: string } | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({ perfect: 0, great: 0, good: 0, miss: 0 });

  // Refs
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const songStartTimeRef = useRef<number>(0);
  const activeBpmRef = useRef<number>(145);

  const diffConfig = RHYTHM_DIFFICULTY[difficulty];

  // Helper to extract clean YouTube Embed Video ID
  const getEmbedUrl = useCallback((urlStr: string) => {
    try {
      let videoId = 'H3ynKWEboA8';
      if (urlStr.includes('youtu.be/')) {
        videoId = urlStr.split('youtu.be/')[1].split('?')[0];
      } else if (urlStr.includes('youtube.com/watch')) {
        const urlObj = new URL(urlStr);
        videoId = urlObj.searchParams.get('v') || 'H3ynKWEboA8';
      } else if (urlStr.includes('youtube.com/embed/')) {
        videoId = urlStr.split('youtube.com/embed/')[1].split('?')[0];
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&controls=1&mute=0&origin=${window.location.origin}`;
    } catch {
      return `https://www.youtube.com/embed/H3ynKWEboA8?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&controls=1&mute=0`;
    }
  }, [isPlaying]);

  const currentTrack = PRESET_TRACKS[selectedTrackIndex] || PRESET_TRACKS[0];
  const currentTrackUrl = customYoutubeUrl.trim() || currentTrack.url;

  // Save custom keys
  const saveCustomKeys = (newKeys: string[]) => {
    setLaneKeys(newKeys);
    localStorage.setItem('rhythm_custom_keys', JSON.stringify(newKeys));
  };

  // Format key label for display
  const formatKeyName = (k: string) => {
    if (k === 'ArrowLeft') return '←';
    if (k === 'ArrowDown') return '↓';
    if (k === 'ArrowUp') return '↑';
    if (k === 'ArrowRight') return '→';
    if (k === ' ') return 'SPACE';
    return k.toUpperCase();
  };

  // Dedicated Fullscreen Toggle specifically for the Rhythm Arena in Image 1
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        setIsFullscreen(true);
        if (arenaContainerRef.current?.requestFullscreen) {
          try {
            await arenaContainerRef.current.requestFullscreen();
          } catch {
            // CSS fixed overlay fallback works seamlessly if blocked by iframe permissions
          }
        }
      } else {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch {
            // fallback
          }
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle fallback:', err);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Sync fullscreen change event from browser
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Finish Game & Show Score/Combo Summary Modal
  const finishGame = useCallback(() => {
    setIsPlaying(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setNotes([]);
    setShowSummaryModal(true);
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 }
      });
      soundManager.playLevelUp();
    } catch (err) {
      console.warn(err);
    }

    // Submit score to online real-time leaderboard
    if (score > 0) {
      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          score,
          maxCombo,
          mode: 'rhythm',
          badgeName: 'ยอดฝีมือริทึมเซไก',
          hammerName: 'ค้อนเพลง YouTube',
          molesWhacked: stats.perfect + stats.great + stats.good
        })
      }).catch((err) => console.warn('Failed to submit rhythm leaderboard score:', err));
    }
  }, [maxCombo, profile.username, score, stats.good, stats.great, stats.perfect]);

  // Listen to YouTube player state changes via postMessage (onStateChange 0 = ENDED)
  useEffect(() => {
    const handleYTMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && (data.event === 'onStateChange' || data.info !== undefined)) {
          if (data.info === 0 && isPlaying) {
            finishGame();
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handleYTMessage);
    return () => window.removeEventListener('message', handleYTMessage);
  }, [isPlaying, finishGame]);

  // Song timer & auto-completion when track duration finishes
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - songStartTimeRef.current) / 1000);
      setSongElapsedSec(elapsed);
      if (elapsed >= songDurationSec && songDurationSec > 0) {
        finishGame();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, songDurationSec, finishGame]);

  // Start / Restart Game (Only starts when clicked!)
  const startGame = () => {
    const track = PRESET_TRACKS[selectedTrackIndex] || PRESET_TRACKS[0];
    const dur = track.duration || 156;
    setSongDurationSec(dur);
    setSongElapsedSec(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHealth(100);
    setNotes([]);
    setStats({ perfect: 0, great: 0, good: 0, miss: 0 });
    setEarnedCoinsInRound(0);
    setEarnedPointsInRound(0);
    setShowSummaryModal(false);
    setIsPlaying(true);
    lastSpawnTimeRef.current = performance.now();
    songStartTimeRef.current = performance.now();
    activeBpmRef.current = track.bpm || 145;
  };

  // Stop / Pause Game
  const stopGame = () => {
    setIsPlaying(false);
    setNotes([]);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Trigger Hero Skill
  const triggerSkill = (heroId: string) => {
    const hero = heroes.find((h) => h.id === heroId);
    if (!hero || hero.currentCooldown > 0) return;

    soundManager.playSkillCast();

    if (heroId === 'hero_drummer') {
      setFeverTimer(8);
    } else if (heroId === 'hero_gunner') {
      setShieldCharges(3);
    } else if (heroId === 'hero_chef') {
      setHealth((prev) => Math.min(100, prev + 25));
    } else if (heroId === 'hero_ahmah') {
      setGoldenBuffRemaining(5);
    }

    setHeroes((prev) =>
      prev.map((h) => (h.id === heroId ? { ...h, currentCooldown: h.cooldown } : h))
    );
  };

  // Hero Cooldown timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setHeroes((prev) =>
        prev.map((h) => ({
          ...h,
          currentCooldown: Math.max(0, h.currentCooldown - 1)
        }))
      );
      setFeverTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic Judgment Line Animation (Straight and level - no tilting!)
  useEffect(() => {
    setJudgmentLineAngle(0);
    setIsLineSplit(false);
  }, [isPlaying]);

  // Handle Note Evaluation
  const evaluateHit = useCallback(
    (judgment: JudgmentType, noteType: NoteType = 'tap', isCrit = false) => {
      if (judgment === 'MISS') {
        if (shieldCharges > 0) {
          setShieldCharges((prev) => prev - 1);
          soundManager.playProsekaTap('GOOD');
          setLastJudgment({ type: 'GOOD', id: Date.now(), text: '🛡️ SHIELD SAVED!' });
          setStats((prev) => ({ ...prev, good: prev.good + 1 }));
          return;
        }

        soundManager.playProsekaTap('MISS');
        setCombo(0);
        setHealth((prev) => Math.max(0, prev - 10));
        setStats((prev) => ({ ...prev, miss: prev.miss + 1 }));
        setLastJudgment({ type: 'MISS', id: Date.now() });
        return;
      }

      if (noteType === 'flick') {
        soundManager.playFlick();
      } else if (noteType === 'hold') {
        soundManager.playSlide();
      } else {
        soundManager.playProsekaTap(judgment);
      }

      const baseScore = judgment === 'PERFECT' ? 1200 : judgment === 'GREAT' ? 800 : 400;
      const feverMult = feverTimer > 0 ? 1.5 : 1.0;
      const critMult = isCrit ? 2.0 : 1.0;
      const earned = Math.round(baseScore * diffConfig.scoreMultiplier * feverMult * critMult);

      setScore((prev) => prev + earned);
      setCombo((prev) => {
        const next = prev + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });

      const hpRecovery = judgment === 'PERFECT' ? 4 : judgment === 'GREAT' ? 2 : 1;
      setHealth((prev) => Math.min(100, prev + hpRecovery));

      setStats((prev) => ({
        ...prev,
        [judgment.toLowerCase()]: prev[judgment.toLowerCase() as keyof typeof prev] + 1
      }));

      // Track rewards
      const earnedCoin = Math.max(1, Math.floor(earned / 150));
      const earnedPoint = Math.max(2, Math.floor(earned / 80));
      setEarnedCoinsInRound((prev) => prev + earnedCoin);
      setEarnedPointsInRound((prev) => prev + earnedPoint);

      onUpdateProfile((p) => {
        const nextCoins = p.coins + earnedCoin;
        const nextPoints = p.points + earnedPoint;
        return {
          ...p,
          coins: nextCoins,
          points: nextPoints,
          highestCombo: Math.max(p.highestCombo, combo + 1),
          highestScore: Math.max(p.highestScore, score + earned),
          totalMolesWhacked: p.totalMolesWhacked + 1
        };
      });

      if (showCoopDuel) {
        setRivalScore((prev) => prev + Math.round(earned * (0.85 + Math.random() * 0.3)));
        setRivalCombo((prev) => (Math.random() > 0.08 ? prev + 1 : 0));
      }

      setLastJudgment({
        type: judgment,
        id: Date.now(),
        text: noteType === 'flick' ? 'FLICK! 💥' : noteType === 'hold' ? 'HOLD FINISH! ✨' : undefined
      });
    },
    [combo, diffConfig.scoreMultiplier, feverTimer, maxCombo, onUpdateProfile, score, shieldCharges, showCoopDuel]
  );

  // Lane Key Press Handler (with Long Hold & Dual Sync checking)
  const handleLanePress = useCallback(
    (laneIndex: number) => {
      setLaneHits((prev) => {
        const next = [...prev];
        next[laneIndex] = true;
        return next;
      });
      setTimeout(() => {
        setLaneHits((prev) => {
          const next = [...prev];
          next[laneIndex] = false;
          return next;
        });
      }, 120);

      const hitWindowMs = 280;
      const now = performance.now();

      setNotes((prevNotes) => {
        let evaluated = false;
        let dualHitTriggered = false;

        const updated = prevNotes.map((note) => {
          if (evaluated || note.lane !== laneIndex || note.isHit || note.isMissed) {
            return note;
          }

          const diff = Math.abs(now - note.targetTime);
          if (diff <= hitWindowMs) {
            evaluated = true;
            let judgment: JudgmentType = 'GOOD';
            if (diff <= 90) judgment = 'PERFECT';
            else if (diff <= 170) judgment = 'GREAT';

            // Check if this was a simultaneous dual note!
            if (note.isDual && note.pairedLane !== undefined) {
              const paired = prevNotes.find(
                (p) => p.lane === note.pairedLane && Math.abs(p.targetTime - note.targetTime) < 50
              );
              if (paired && (paired.isHit || laneHits[note.pairedLane])) {
                dualHitTriggered = true;
              }
            }

            // Long Hold Note handling
            if (note.type === 'hold') {
              setHoldingLanes((h) => {
                const next = [...h];
                next[laneIndex] = true;
                return next;
              });
              soundManager.playSlide();
              setLastJudgment({ type: 'PERFECT', id: Date.now(), text: 'HOLDING... 🔥' });
              return { ...note, isHolding: true, holdProgress: 0.1 };
            }

            evaluateHit(judgment, note.type, note.isGolden);

            if (dualHitTriggered) {
              setLastJudgment({ type: 'PERFECT', id: Date.now(), text: '⚡ DUAL HIT! x2 ✨' });
              setScore((s) => s + 500);
            }

            return { ...note, isHit: true };
          }
          return note;
        });
        return updated;
      });
    },
    [evaluateHit, laneHits]
  );

  // Lane Key Release (Checks Hold completion)
  const handleLaneRelease = useCallback(
    (laneIndex: number) => {
      setHoldingLanes((h) => {
        const next = [...h];
        next[laneIndex] = false;
        return next;
      });

      const now = performance.now();
      setNotes((prevNotes) => {
        return prevNotes.map((note) => {
          if (note.lane === laneIndex && note.type === 'hold' && note.isHolding && !note.isHit) {
            const holdEndTime = note.holdEndTargetTime || (note.targetTime + (note.holdDuration || 1500));
            const diffFromEnd = Math.abs(now - holdEndTime);

            // Successfully held until the end!
            if (now >= holdEndTime - 250 || diffFromEnd <= 250) {
              evaluateHit('PERFECT', 'hold', note.isGolden);
              return { ...note, isHit: true, isHolding: false, holdCompleted: true };
            } else {
              // Released too early
              evaluateHit('MISS');
              setLastJudgment({ type: 'MISS', id: Date.now(), text: 'HOLD DROPPED! ⚠️' });
              return { ...note, isMissed: true, isHolding: false };
            }
          }
          return note;
        });
      });
    },
    [evaluateHit]
  );

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showKeyModal) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const pressedKey = e.key;
      laneKeys.forEach((configuredKey, idx) => {
        if (
          pressedKey.toUpperCase() === configuredKey.toUpperCase() ||
          pressedKey === configuredKey
        ) {
          handleLanePress(idx);
        }
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const pressedKey = e.key;
      laneKeys.forEach((configuredKey, idx) => {
        if (
          pressedKey.toUpperCase() === configuredKey.toUpperCase() ||
          pressedKey === configuredKey
        ) {
          handleLaneRelease(idx);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLanePress, handleLaneRelease, laneKeys, showKeyModal]);

  // Modal key-capture listener
  useEffect(() => {
    if (listeningLane === null) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const updated = [...laneKeys];
      updated[listeningLane] = newKey;
      saveCustomKeys(updated);
      setListeningLane(null);
    };

    window.addEventListener('keydown', handleCapture);
    return () => window.removeEventListener('keydown', handleCapture);
  }, [listeningLane, laneKeys]);

  // Main Note Spawning & Game Loop
  useEffect(() => {
    if (!isPlaying) return;

    const activeLanes = diffConfig.activeLanes;
    const baseTravelTimeMs = 1500 / diffConfig.speedMultiplier;

    const gameLoop = (currentTime: number) => {
      const bpm = activeBpmRef.current;
      const beatInterval = (60 / bpm) * 1000 * diffConfig.intervalMultiplier;

      if (currentTime - lastSpawnTimeRef.current >= beatInterval) {
        lastSpawnTimeRef.current = currentTime;

        const isGolden = goldenBuffRemaining > 0 || Math.random() < 0.14;
        if (goldenBuffRemaining > 0) {
          setGoldenBuffRemaining((prev) => Math.max(0, prev - 1));
        }

        // 1. Dual Simultaneous Notes roll (22% chance in medium / insane)
        const isDualRoll = difficulty !== 'easy' && activeLanes.length >= 2 && Math.random() < 0.24;

        if (isDualRoll) {
          // Select two distinct active lanes
          const shuffled = [...activeLanes].sort(() => Math.random() - 0.5);
          const laneA = shuffled[0];
          const laneB = shuffled[1];
          const targetTime = currentTime + baseTravelTimeMs;

          const dualNoteA: RhythmNote = {
            id: `${currentTime}-dual-A-${Math.random()}`,
            lane: Math.min(laneA, laneB),
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'tap',
            isDual: true,
            pairedLane: Math.max(laneA, laneB),
            gimmick: 'none'
          };

          const dualNoteB: RhythmNote = {
            id: `${currentTime}-dual-B-${Math.random()}`,
            lane: Math.max(laneA, laneB),
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'tap',
            isDual: true,
            pairedLane: Math.min(laneA, laneB),
            gimmick: 'none'
          };

          setNotes((prev) => [...prev, dualNoteA, dualNoteB]);
        } else {
          // Single Note Spawning (with Long Hold notes according to song rhythm)
          const randomLane = activeLanes[Math.floor(Math.random() * activeLanes.length)];
          const typeRoll = Math.random();
          let noteType: NoteType = 'tap';
          let holdDuration: number | undefined;
          let holdEndTargetTime: number | undefined;
          let flickDir: FlickDirection | undefined;
          let gimmick: NoteGimmick = 'none';

          if (difficulty !== 'easy') {
            if (typeRoll < 0.24) {
              noteType = 'flick';
              flickDir = ['up', 'left', 'right'][Math.floor(Math.random() * 3)] as FlickDirection;
            } else if (typeRoll < 0.52) {
              // Long Hold Note (1.4s to 2.4s duration to hold according to song rhythm!)
              noteType = 'hold';
              holdDuration = 1400 + Math.floor(Math.random() * 1100);
              holdEndTargetTime = currentTime + baseTravelTimeMs + holdDuration;
            } else if (typeRoll < 0.65) {
              noteType = 'drag';
            }
          }

          const gimmickRoll = Math.random();
          if (gimmickRoll < 0.08) {
            gimmick = 'hidden';
          } else if (gimmickRoll < 0.16) {
            gimmick = 'sudden';
          }

          if (Math.random() < 0.015 && !activeSpeedGimmick) {
            const shiftType = Math.random() > 0.5 ? '⚡ 1.4x SPEED SHIFT!' : '⏳ 0.7x SLOW BEAT!';
            setActiveSpeedGimmick(shiftType);
            setTimeout(() => setActiveSpeedGimmick(null), 1800);
          }

          const newNote: RhythmNote = {
            id: `${currentTime}-${Math.random()}`,
            lane: randomLane,
            spawnTime: currentTime,
            targetTime: currentTime + baseTravelTimeMs,
            isGolden,
            isHit: false,
            isMissed: false,
            type: noteType,
            holdDuration,
            holdEndTargetTime,
            flickDir,
            gimmick
          };

          setNotes((prev) => [...prev, newNote]);
        }
      }

      setNotes((prevNotes) => {
        const updated: RhythmNote[] = [];

        for (const note of prevNotes) {
          if (note.isHit) continue;

          // Handling active hold note
          if (note.type === 'hold' && note.isHolding) {
            const holdEndTime = note.holdEndTargetTime || (note.targetTime + (note.holdDuration || 1500));

            // Ticking score while holding
            if (currentTime >= holdEndTime) {
              // Hold Finished Successfully!
              evaluateHit('PERFECT', 'hold', note.isGolden);
              setLastJudgment({ type: 'PERFECT', id: Date.now(), text: 'HOLD PERFECT! 🌟' });
              continue;
            }

            // Still holding - keep note in runway
            updated.push(note);
            continue;
          }

          // MV Mode: Bot hits notes with 100% PERFECT timing!
          if (isMvMode && !note.isHit && !note.isMissed && currentTime >= note.targetTime - 15) {
            if (note.type === 'hold') {
              evaluateHit('PERFECT', 'hold', note.isGolden);
            } else {
              evaluateHit('PERFECT', note.type, note.isGolden);
            }
            setLaneHits((h) => {
              const next = [...h];
              next[note.lane] = true;
              return next;
            });
            setTimeout(() => {
              setLaneHits((h) => {
                const next = [...h];
                next[note.lane] = false;
                return next;
              });
            }, 80);
            continue;
          }

          // Check for Miss on unhit regular notes
          if (!note.isHit && !note.isMissed && currentTime > note.targetTime + 220) {
            evaluateHit('MISS');
            updated.push({ ...note, isMissed: true });
            continue;
          }

          if (currentTime > note.targetTime + 400 && !note.isHolding) {
            continue;
          }

          updated.push(note);
        }

        return updated;
      });

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, diffConfig, difficulty, goldenBuffRemaining, isMvMode, evaluateHit, activeSpeedGimmick]);

  const nowMs = performance.now();
  const travelDuration = 1500 / diffConfig.speedMultiplier;

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Grade & Accuracy Computation for Score Summary Modal
  const totalNotes = stats.perfect + stats.great + stats.good + stats.miss;
  const accuracy =
    totalNotes > 0
      ? Math.round(((stats.perfect * 100 + stats.great * 80 + stats.good * 50) / (totalNotes * 100)) * 1000) / 10
      : 100;
  const isFullCombo = stats.miss === 0 && (stats.perfect + stats.great + stats.good) > 0;

  let grade = 'C';
  let gradeColor = 'text-slate-400';
  let gradeDesc = 'ต้องฝึกสเต็ปเพิ่มอีกนิด สู้ใหม่ดิว้า!';
  if (accuracy >= 95 && stats.miss === 0) {
    grade = 'SSS';
    gradeColor = 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-[#B4E578]';
    gradeDesc = 'ยอดเยี่ยมระดับตำนาน ไร้ที่ติดิว้า! ชั่ยคร๊าฟ';
  } else if (accuracy >= 90) {
    grade = 'SS';
    gradeColor = 'text-yellow-400';
    gradeDesc = 'สเต็ปเทพ จังหวะแน่นเปรี๊ยะ ดิว้า!';
  } else if (accuracy >= 80) {
    grade = 'S';
    gradeColor = 'text-[#95D58B]';
    gradeDesc = 'จังหวะเฉียบคม ดิว้า!';
  } else if (accuracy >= 70) {
    grade = 'A';
    gradeColor = 'text-emerald-400';
    gradeDesc = 'ฝีมือเยี่ยมยอด อะไรว้า!';
  } else if (accuracy >= 55) {
    grade = 'B';
    gradeColor = 'text-amber-400';
    gradeDesc = 'ผ่านเกณฑ์สบาย ชั่ยคร๊าฟ';
  }

  return (
    <div
      className={`w-full flex flex-col items-center select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-2 sm:p-4 overflow-y-auto' : 'relative'
      }`}
    >
      {/* Top Controls & YouTube Embed Header */}
      <div
        className={`w-full max-w-2xl bg-white/95 p-3.5 sm:p-4 rounded-3xl border-2 border-[#95D58B] shadow-sm mb-3 select-none ${
          isFullscreen ? 'bg-slate-900/90 border-[#95D58B]/50 text-white' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] flex items-center justify-center text-slate-900 shadow-xs border border-[#C3E895]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 dark:text-white">
                <span>โหมดดนตรียูทูปสไตล์โปรเจ็คเซไก</span>
                {isMvMode && (
                  <span className="text-[10px] font-black bg-purple-600 text-white px-2 py-0.5 rounded-md animate-pulse">
                    🤖 MV BOT AUTO PLAY
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                Tap, Hold, Flick, Drag โน้ตไหลตามจังหวะร้องดิว้า! ยกเส้นกด 5 ซม. สบายตา ชั่ยคร๊าฟ
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* Key Settings Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
              title="ตั้งค่าปุ่มกดเอง"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งปุ่มกด</span>
            </button>

            {/* MV Mode (Auto Play) Button */}
            <button
              onClick={() => setIsMvMode((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isMvMode
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-500/40'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="โหมดชม MV (ให้บอทเล่นแบบ Perfect อัตโนมัติ)"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isMvMode ? 'บอทออโต้ ON' : 'โหมด MV'}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isFullscreen
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isFullscreen ? 'ย่อจอปกติ' : 'ขยายเต็มจอเฉพาะจอเกมนี้'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
            </button>

            {/* Video Hide/Show Toggle */}
            <button
              onClick={() => setShowVideo((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer text-xs"
              title={showVideo ? 'ซ่อนวิดีโอ' : 'แสดงวิดีโอ'}
            >
              {showVideo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Difficulty Selector & Track Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100/60">
          <div className="flex items-center gap-1 bg-emerald-50/80 p-0.5 rounded-xl border border-emerald-100">
            {(['easy', 'medium', 'insane'] as Difficulty[]).map((d) => (
              <button
                key={d}
                disabled={isPlaying}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  difficulty === d
                    ? RHYTHM_DIFFICULTY[d].color + ' shadow-xs border font-black scale-102'
                    : 'text-slate-600 hover:text-slate-900 opacity-70'
                }`}
              >
                {RHYTHM_DIFFICULTY[d].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTrackIndex}
              disabled={isPlaying}
              onChange={(e) => {
                setSelectedTrackIndex(Number(e.target.value));
                setCustomYoutubeUrl('');
              }}
              className="text-xs bg-slate-50 border border-emerald-200 rounded-lg px-2 py-1 text-slate-700 font-medium outline-none cursor-pointer max-w-[210px] truncate"
            >
              {PRESET_TRACKS.map((t, idx) => (
                <option key={t.url} value={idx}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Start / Pause / Stop Button */}
            {!isPlaying ? (
              <button
                onClick={startGame}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>เริ่มเล่น!</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={stopGame}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs bg-amber-500 hover:bg-amber-600 text-white"
                  title="หยุดพัก"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>พัก</span>
                </button>
                <button
                  onClick={finishGame}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs bg-rose-500 hover:bg-rose-600 text-white"
                  title="จบเพลงและสรุปคะแนนทันที"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>จบเพลง & สรุป</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Embedded YouTube Player */}
        {showVideo && (
          <div className="mt-3 relative w-full aspect-video sm:aspect-[21/9] rounded-2xl overflow-hidden bg-black border border-emerald-200 shadow-inner">
            <iframe
              id="youtube-rhythm-iframe"
              src={getEmbedUrl(currentTrackUrl)}
              title="YouTube Rhythm Player"
              className="w-full h-full object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* RPG Idol Team & Skill Bar */}
      <div className="w-full max-w-2xl px-2 mb-2 flex items-center justify-between gap-1.5 overflow-x-auto">
        {heroes.map((hero) => {
          const isReady = hero.currentCooldown === 0;
          return (
            <button
              key={hero.id}
              onClick={() => triggerSkill(hero.id)}
              disabled={!isPlaying || !isReady}
              className={`flex-1 min-w-[110px] p-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                isReady && isPlaying
                  ? `bg-gradient-to-r ${hero.color} text-white shadow-md animate-pulse border-white/60`
                  : 'bg-white/80 border-slate-200 text-slate-500 opacity-60'
              }`}
            >
              <span className="text-xl">{hero.avatar}</span>
              <div className="text-left leading-tight truncate">
                <div className="text-[10px] font-black truncate">{hero.name}</div>
                <div className="text-[9px] font-medium opacity-90 truncate">
                  {isReady ? 'กดสกิล! ⚡' : `${hero.currentCooldown}s`}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Groovy / Health Bar & Live Progress & Score */}
      <div className="w-full max-w-2xl px-2 mb-2 flex items-center gap-2 sm:gap-3">
        {/* Health Bar */}
        <div className="flex-1 bg-slate-200 rounded-full h-3.5 overflow-hidden border border-slate-300 relative">
          <div
            className={`h-full transition-all duration-200 ${
              health > 50
                ? 'bg-gradient-to-r from-[#95D58B] to-[#B4E578]'
                : health > 25
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
            }`}
            style={{ width: `${health}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-800 drop-shadow-xs">
            HP {health}% {shieldCharges > 0 && `(🛡️ x${shieldCharges})`} {feverTimer > 0 && `(🔥 FEVER x1.5)`}
          </div>
        </div>

        {/* Live Song Timer & Progress */}
        <div className="px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/40 flex items-center gap-1 shadow-xs">
          <Clock className="w-3 h-3 text-[#B4E578]" />
          <span>
            {formatTime(songElapsedSec)} / {formatTime(songDurationSec)}
          </span>
        </div>

        {/* Live Score Display */}
        <div className="px-3 py-0.5 rounded-full bg-slate-900 text-yellow-300 font-mono font-black text-xs border border-yellow-400/50 shadow-xs">
          ⭐ {score.toLocaleString()}
        </div>
      </div>

      {/* MAIN RHYTHM RUNWAY ARENA (เฉพาะจอในภาพ 1 ตามคำขอของผู้ใช้) */}
      <div
        ref={arenaContainerRef}
        className={`relative w-full max-w-2xl bg-gradient-to-b from-[#111928] via-[#0b101c] to-black rounded-3xl border-2 border-[#95D58B] shadow-2xl overflow-hidden flex flex-col justify-end select-none ${
          isFullscreen ? 'h-[85vh] max-w-5xl' : 'h-[460px] sm:h-[500px]'
        }`}
      >
        {/* ปุ่มขยายหน้าจอให้เป็นเต็มจอเฉพาะจอในภาพ 1 (Dedicated Arena Fullscreen Button) */}
        <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
          {/* Quick Line Height Indicator / Adjuster */}
          <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-emerald-400/30 text-[10px] text-emerald-300 font-bold">
            <ArrowUp className="w-3 h-3 text-[#B4E578]" />
            <span>เส้นกด: ~5 ซม. ({judgmentLineOffset}px)</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white border-2 border-[#95D58B] flex items-center gap-1.5 text-xs font-black shadow-lg backdrop-blur-sm cursor-pointer transition-all hover:scale-105 active:scale-95 group"
            title={isFullscreen ? 'ย่อหน้าจอกลับ' : 'ขยายจอเกมนี้ให้เต็มจอ'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-[#B4E578] group-hover:scale-110 transition-transform" />
                <span>ย่อจอปกติ</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-[#B4E578] group-hover:scale-110 transition-transform" />
                <span>ขยายเต็มจอ</span>
              </>
            )}
          </button>
        </div>

        {/* Speed Shift Gimmick Banner */}
        {activeSpeedGimmick && (
          <div className="absolute top-10 inset-x-0 z-40 flex justify-center animate-bounce">
            <span className="bg-rose-600 text-yellow-200 font-black px-4 py-1 rounded-full border-2 border-yellow-300 text-xs sm:text-sm tracking-wider shadow-2xl">
              {activeSpeedGimmick}
            </span>
          </div>
        )}

        {/* 4 Track Runway Lanes */}
        <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
          {[0, 1, 2, 3].map((laneIndex) => (
            <div
              key={laneIndex}
              className={`h-full border-r border-white/5 relative flex flex-col items-center justify-end transition-colors ${
                laneHits[laneIndex] ? 'bg-white/10' : ''
              }`}
            >
              <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-white/20" />
            </div>
          ))}
        </div>

        {/* Flowing Rhythm Notes Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {notes.map((note) => {
            const progress = (nowMs - note.spawnTime) / travelDuration;
            if (progress < 0 || progress > 1.25) return null;

            const laneLeftPercent = note.lane * 25;

            // Note center lands EXACTLY on the raised green line when progress === 1.0!
            const topStyle = `calc(${progress} * (100% - ${judgmentLineOffset}px))`;

            let opacity = 1;
            if (note.gimmick === 'hidden' && progress > 0.35 && progress < 0.78) {
              opacity = 0.05;
            } else if (note.gimmick === 'sudden' && progress < 0.45) {
              opacity = 0;
            }

            return (
              <React.Fragment key={note.id}>
                {/* Simultaneous Dual Note Connecting Sync Bar (Beam across lanes) */}
                {note.isDual && note.pairedLane !== undefined && note.lane < note.pairedLane && (
                  <div
                    className="absolute z-15 pointer-events-none flex items-center justify-center transition-opacity"
                    style={{
                      top: topStyle,
                      left: `${note.lane * 25 + 12.5}%`,
                      width: `${(note.pairedLane - note.lane) * 25}%`,
                      transform: 'translateY(-50%)',
                      opacity
                    }}
                  >
                    <div className="w-full h-2.5 sm:h-3 bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 rounded-full shadow-[0_0_18px_rgba(250,204,21,1)] border border-white flex items-center justify-center">
                      <span className="text-[7px] sm:text-[8px] font-black tracking-widest text-slate-950 uppercase">
                        ⚡ DUAL SYNC ⚡
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Note Container */}
                <div
                  className="absolute z-20 flex flex-col items-center justify-center transition-opacity select-none"
                  style={{
                    top: topStyle,
                    left: `${laneLeftPercent}%`,
                    width: '25%',
                    transform: 'translateY(-50%)',
                    opacity
                  }}
                >
                  {/* Long Hold Note Body Beam (Stretching up to the tail) */}
                  {note.type === 'hold' && (
                    <div
                      className="absolute w-6 sm:w-8 bg-gradient-to-t from-emerald-400/90 via-[#95D58B]/70 to-teal-400/80 rounded-t-2xl shadow-[0_0_18px_rgba(52,211,153,0.85)] border-x-2 border-t-2 border-white/80 pointer-events-none flex flex-col items-center justify-around overflow-hidden"
                      style={{
                        bottom: '50%',
                        height: `${Math.min(260, Math.max(70, ((note.holdDuration || 1500) / travelDuration) * 260))}px`
                      }}
                    >
                      <span className="text-[9px] font-black text-slate-950 tracking-tighter animate-pulse">▲</span>
                      <span className="text-[9px] font-black text-slate-950 tracking-tighter animate-pulse">▲</span>
                      <div className="absolute top-0 inset-x-0 h-2 bg-yellow-300 border-b border-white rounded-t-xl" />
                    </div>
                  )}

                  {/* Main Note Puck */}
                  <div
                    className={`relative flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-2xl border-2 shadow-lg transition-transform ${
                      note.isDual
                        ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 border-white shadow-amber-400/80 scale-105 ring-2 ring-yellow-200'
                        : note.type === 'flick'
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 border-yellow-300 shadow-pink-500/60 scale-105'
                        : note.type === 'hold'
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-[#95D58B] border-white shadow-emerald-400/70 scale-105'
                        : note.type === 'drag'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 border-white shadow-amber-400/50'
                        : note.isGolden
                        ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 border-white shadow-amber-400/70 scale-105'
                        : 'bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] border-white/90 shadow-[#95D58B]/50'
                    }`}
                  >
                    <img
                      src={MOLE_IMAGE_URL}
                      alt="ตัวการ์ตูนปืนเขียว"
                      className="w-5 h-5 sm:w-7 sm:h-7 object-contain drop-shadow-md rounded-full bg-white/40 p-0.5"
                    />
                    <span className="text-[9px] sm:text-[10px] font-black tracking-tight text-slate-950 uppercase ml-1">
                      {note.isDual
                        ? 'DUAL ⚡'
                        : note.type === 'flick'
                        ? 'FLICK ⬆️'
                        : note.type === 'hold'
                        ? 'HOLD'
                        : note.type === 'drag'
                        ? 'SLIDE'
                        : note.isGolden
                        ? 'CRIT ⭐'
                        : 'TAP'}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Dynamic Combo & Judgment Display */}
        <div className="absolute inset-x-0 top-[20%] flex flex-col items-center justify-center pointer-events-none z-10">
          {combo > 2 && (
            <div className="text-center animate-bounce">
              <div className="text-3xl sm:text-5xl font-black font-mono text-white tracking-widest drop-shadow-[0_4px_12px_rgba(180,229,120,0.8)]">
                {combo}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-[#B4E578] tracking-widest uppercase">
                COMBO ดิว้า!
              </div>
            </div>
          )}

          {lastJudgment && (
            <div
              key={lastJudgment.id}
              className="mt-2 text-center animate-mole-emerge font-black text-lg sm:text-2xl drop-shadow-lg"
            >
              {lastJudgment.type === 'PERFECT' && (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-[#B4E578]">
                  PERFECT! ✨ {lastJudgment.text}
                </span>
              )}
              {lastJudgment.type === 'GREAT' && <span className="text-yellow-400">GREAT! ⭐</span>}
              {lastJudgment.type === 'GOOD' && <span className="text-[#95D58B]">GOOD 👍</span>}
              {lastJudgment.type === 'MISS' && <span className="text-rose-500">MISS ❌</span>}
            </div>
          )}
        </div>

        {/* ยกเส้นสีเขียวในภาพที่สองขึ้นมาด้านบนประมาณ 5เซ็น (~180px) - เส้นตรงเรียบ ไม่เอียงไปเอียงมา 100% */}
        <div
          className="absolute inset-x-0 h-2 bg-gradient-to-r from-[#a8e063] via-[#b6e354] to-[#9ad651] shadow-[0_0_24px_rgba(182,227,84,0.95)] z-20 pointer-events-none"
          style={{
            bottom: `${judgmentLineOffset}px`,
            transform: 'none'
          }}
        >
          {/* Target Receptors for all 4 Lanes on the elevated straight judgment line */}
          <div className="absolute -top-4 inset-x-0 grid grid-cols-4 pointer-events-none">
            {[0, 1, 2, 3].map((laneIdx) => (
              <div key={laneIdx} className="flex flex-col items-center justify-center">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center transition-all ${
                    laneHits[laneIdx] || holdingLanes[laneIdx]
                      ? 'border-white bg-[#b6e354]/60 scale-125 shadow-[0_0_20px_rgba(255,255,255,0.95)]'
                      : 'border-[#b6e354]/90 bg-black/70 shadow-[0_0_12px_rgba(182,227,84,0.7)]'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-black font-mono text-white drop-shadow-md">
                    {formatKeyName(laneKeys[laneIdx])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Interactive Tap Pads at Bottom of Runway */}
        <div className="relative h-[72px] grid grid-cols-4 z-30 bg-slate-950/95 border-t border-white/20 select-none touch-manipulation">
          {laneKeys.map((key, i) => (
            <button
              key={`${key}-${i}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleLanePress(i);
              }}
              onPointerUp={() => handleLaneRelease(i)}
              className={`h-full flex flex-col items-center justify-center border-r border-white/10 active:scale-95 transition-all cursor-pointer touch-manipulation ${
                laneHits[i]
                  ? 'bg-gradient-to-t from-[#B4E578] to-[#95D58B] text-slate-950 font-black shadow-inner'
                  : holdingLanes[i]
                  ? 'bg-emerald-500/40 text-yellow-300 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <span className="text-base sm:text-lg font-black font-mono leading-none">
                {formatKeyName(key)}
              </span>
              <span className="text-[9px] text-[#B4E578] font-bold mt-0.5">LANE {i + 1}</span>
            </button>
          ))}
        </div>

        {/* Start Game Modal / Overlay (Image 1) - Game strictly starts when user clicks Start */}
        {!isPlaying && !showSummaryModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 z-40">
            <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border-2 border-[#95D58B] text-center max-w-sm w-full flex flex-col items-center animate-mole-emerge text-slate-900 shadow-2xl relative">
              {/* Fullscreen indicator button on top of modal */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="ขยายเต็มจอ"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border border-[#C3E895] flex items-center justify-center text-2xl shadow-md mb-2">
                <Music className="w-6 h-6 text-slate-900" />
              </div>

              <h3 className="text-lg font-black text-slate-900">
                พร้อมท้าทายจังหวะดนตรี!
              </h3>
              <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                โน้ตจะไหลลงมาตามจังหวะร้องเพลง YouTube เริ่มเล่นเมื่อกดเริ่มดิว้า! ยกเส้นกดขึ้น 5 ซม. สบายมือ ชั่ยคร๊าฟ
              </p>

              {/* Mode & Fullscreen Quick Buttons */}
              <div className="w-full flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={() => setIsMvMode((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isMvMode
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{isMvMode ? 'โหมดชม MV (Bot เล่นแทน)' : 'เล่นด้วยตัวเอง'}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 flex items-center gap-1 cursor-pointer"
                  title="ขยายเต็มจอ"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
                </button>
              </div>

              {/* Primary Start Button */}
              <button
                onClick={startGame}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-[#95D58B]/40 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#C3E895]"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>เริ่มท้าทายจังหวะเพลง!</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helper Keyboard Tip & Custom Keybind Footer */}
      <div className="w-full max-w-2xl mt-2.5 p-3 bg-white/95 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <span className="text-base">🎹</span>
          <span>
            ปุ่มที่ตั้งไว้:{' '}
            {laneKeys.map((k, i) => (
              <span key={i} className="mx-0.5">
                <strong className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 dark:bg-slate-800 dark:border-slate-700">
                  {formatKeyName(k)}
                </strong>
                {i < 3 ? ',' : ''}
              </span>
            ))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Line Height Nudge Controls */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="text-slate-600 font-medium">เส้นกด:</span>
            <button
              onClick={() => setJudgmentLineOffset((prev) => Math.max(80, prev - 15))}
              className="px-1.5 py-0.5 bg-white hover:bg-slate-200 rounded font-black text-slate-800 cursor-pointer"
              title="ลดเส้นกดลง"
            >
              -
            </button>
            <span className="font-mono font-bold text-emerald-700">{judgmentLineOffset}px</span>
            <button
              onClick={() => setJudgmentLineOffset((prev) => Math.min(260, prev + 15))}
              className="px-1.5 py-0.5 bg-white hover:bg-slate-200 rounded font-black text-slate-800 cursor-pointer"
              title="ยกเส้นกดขึ้น"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className="text-[11px] text-emerald-800 bg-[#D1EBA0] hover:bg-[#B4E578] px-3 py-1 rounded-lg border border-[#95D58B] font-bold cursor-pointer transition-colors"
          >
            ⚙️ เปลี่ยนปุ่มกดเอง
          </button>
        </div>
      </div>

      {/* สรุปคะแนนพร้อมคอมโบเมื่อเพลงเล่นจนจบ (COMPACT, EASY-TO-CLOSE SCORE MODAL) */}
      {showSummaryModal && (
        <div
          onClick={() => setShowSummaryModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 sm:p-5 max-w-[340px] sm:max-w-sm w-full border-2 border-[#95D58B] shadow-2xl text-slate-900 animate-mole-emerge relative overflow-hidden"
          >
            {/* Top-Right Easy Close Button */}
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-black text-sm flex items-center justify-center transition-all cursor-pointer z-10 active:scale-95 shadow-xs"
              title="ปิดหน้าต่างสรุปคะแนน"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3 pr-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border border-[#C3E895] flex items-center justify-center text-xl shadow-xs flex-shrink-0">
                🏆
              </div>
              <div className="leading-tight truncate">
                <h3 className="text-base font-black text-slate-950">
                  🎉 สรุปคะแนนเพลงจบแล้ว
                </h3>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {currentTrack.name}
                </p>
              </div>
            </div>

            {/* Compact Grade & Score Banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white shadow-inner mb-3">
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-black font-mono tracking-wider drop-shadow-md ${gradeColor}`}>
                  {grade}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                    คะแนนรวม
                  </div>
                  <div className="text-lg font-black text-white font-mono">
                    ⭐ {score.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-amber-300 font-bold">
                  คอมโบสูงสุด
                </div>
                <div className="text-base font-black text-yellow-300 font-mono flex items-center justify-end gap-0.5">
                  <Flame className="w-4 h-4 fill-current text-amber-400" />
                  <span>{maxCombo}</span>
                </div>
              </div>
            </div>

            {/* Stats Breakdown 4 Columns */}
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs mb-3">
              <div className="bg-purple-50 p-1.5 rounded-xl border border-purple-200">
                <div className="text-[9px] font-black text-purple-700">PERFECT</div>
                <div className="font-mono font-black text-sm text-slate-900">{stats.perfect}</div>
              </div>
              <div className="bg-amber-50 p-1.5 rounded-xl border border-amber-200">
                <div className="text-[9px] font-black text-amber-700">GREAT</div>
                <div className="font-mono font-black text-sm text-slate-900">{stats.great}</div>
              </div>
              <div className="bg-emerald-50 p-1.5 rounded-xl border border-emerald-200">
                <div className="text-[9px] font-black text-emerald-700">GOOD</div>
                <div className="font-mono font-black text-sm text-slate-900">{stats.good}</div>
              </div>
              <div className="bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                <div className="text-[9px] font-black text-rose-700">MISS</div>
                <div className="font-mono font-black text-sm text-slate-900">{stats.miss}</div>
              </div>
            </div>

            {/* Rewards */}
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-around text-[11px] font-bold text-emerald-900 mb-3">
              <span>🪙 +{earnedCoinsInRound.toLocaleString()} เหรียญ</span>
              <span>⭐ +{earnedPointsInRound.toLocaleString()} แต้ม</span>
              <span className="font-mono text-emerald-700">{accuracy}% แม่นยำ</span>
            </div>

            {/* Action Buttons: Close or Play Again */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-95 text-center"
              >
                ✕ ปิดหน้าต่าง
              </button>

              <button
                onClick={startGame}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] text-slate-950 font-black text-xs shadow-md shadow-[#95D58B]/30 hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#C3E895]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เล่นอีกครั้ง</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keybind Settings Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border-2 border-[#95D58B] shadow-2xl text-slate-800 animate-mole-emerge">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  ตั้งค่าปุ่มกดตามใจชอบ (Key Bindings)
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setListeningLane(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              คลิกที่เลนเพื่อกดปุ่มบนคีย์บอร์ดที่ต้องการ หรือเลือกรูปแบบปุ่มสำเร็จรูปด้านล่างดิว้า!
            </p>

            {/* 4 Lanes Key Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {laneKeys.map((key, idx) => (
                <button
                  key={idx}
                  onClick={() => setListeningLane(idx)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    listeningLane === idx
                      ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 scale-105'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-bold mb-1">
                    เลน {idx + 1}
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-800">
                    {listeningLane === idx ? 'กดปุ่ม...' : formatKeyName(key)}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <div className="text-xs font-bold text-slate-700 mb-1.5">
                เลือกรูปแบบสำเร็จรูป:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {KEY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => saveCustomKeys(preset.keys)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-100 border border-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset to Default & Done */}
            <div className="flex items-center justify-between pt-3 border-t">
              <button
                onClick={() => saveCustomKeys(DEFAULT_LANE_KEYS)}
                className="text-xs text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตเป็นค่าเริ่มต้น
              </button>

              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setListeningLane(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                บันทึกและปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
