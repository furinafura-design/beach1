import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { MOLE_IMAGE_URL } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Difficulty, JudgmentType, RhythmNote, UserProfile, NoteType, RhythmHero } from '../types/game';
import { DEFAULT_PROFILE } from '../utils/storage';
import {
  Music,
  Play,
  Pause,
  Sparkles,
  Flame,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  Eye,
  EyeOff,
  Trophy,
  Clock,
  ArrowUp,
  Zap,
  Sliders,
  RefreshCw
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
    intervalMultiplier: number;
    activeLanes: number[];
    scoreMultiplier: number;
    color: string;
  }
> = {
  easy: {
    label: 'ง่าย',
    subLabel: '2 เลน โน้ตจังหวะหลัก ชิลๆ ชั่ยคร๊าฟ',
    intervalMultiplier: 1.0,
    activeLanes: [1, 2],
    scoreMultiplier: 1.0,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  medium: {
    label: 'ปานกลาง',
    subLabel: '4 เลน โน้ตตามคำร้องเพลงดิว้า ชั่ยคร๊าฟ',
    intervalMultiplier: 0.5,
    activeLanes: [0, 1, 2, 3],
    scoreMultiplier: 1.5,
    color: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  insane: {
    label: 'ยากมหาโหด',
    subLabel: 'Master จังหวะรัวแน่น นิ้วไว ชั่ยคร๊าฟ',
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

// Speed presets from 0.5x to 20x as requested
const SPEED_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0];

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
  // Keybinds state
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

  // Speed multiplier state (0.5 to 20x)
  const [noteSpeed, setNoteSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rhythm_note_speed');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.5 && val <= 20) return val;
      }
    } catch {
      // fallback
    }
    return 2.0; // Default comfortable rhythm speed
  });

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState<string>('');
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [customBpm, setCustomBpm] = useState<number>(140);
  const [showCustomUrlPanel, setShowCustomUrlPanel] = useState<boolean>(false);
  const [customUrlFeedback, setCustomUrlFeedback] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showSpeedControls, setShowSpeedControls] = useState<boolean>(false);
  const [listeningLane, setListeningLane] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState<boolean>(true);

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

  // Lane input visual state
  const [laneHits, setLaneHits] = useState<boolean[]>([false, false, false, false]);
  const [holdingLanes, setHoldingLanes] = useState<boolean[]>([false, false, false, false]);
  const [lastJudgment, setLastJudgment] = useState<{ type: JudgmentType; id: number; text?: string } | null>(null);

  // Reset confirmation notification
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({ perfect: 0, great: 0, good: 0, miss: 0 });

  // Refs
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const songStartTimeRef = useRef<number>(0);
  const activeBpmRef = useRef<number>(145);
  const noteSpeedRef = useRef<number>(noteSpeed);
  noteSpeedRef.current = noteSpeed;

  const diffConfig = RHYTHM_DIFFICULTY[difficulty];

  // Travel duration in milliseconds based on user speed (0.5x to 20x)
  // At 1.0x: 2000ms, at 0.5x: 4000ms, at 2.0x: 1000ms, at 10x: 200ms, at 20x: 100ms
  const travelDuration = Math.round(2000 / noteSpeed);

  // Save speed setting
  const updateNoteSpeed = (speed: number) => {
    const clamped = Math.min(20, Math.max(0.5, Math.round(speed * 10) / 10));
    setNoteSpeed(clamped);
    try {
      localStorage.setItem('rhythm_note_speed', String(clamped));
    } catch {
      // ignore
    }
  };

  // Helper to extract clean YouTube Embed Video ID
  const getEmbedUrl = useCallback((urlStr: string) => {
    try {
      let videoId = 'H3ynKWEboA8';
      const clean = urlStr.trim();
      if (clean.includes('youtu.be/')) {
        videoId = clean.split('youtu.be/')[1].split('?')[0].split('&')[0];
      } else if (clean.includes('youtube.com/shorts/')) {
        videoId = clean.split('youtube.com/shorts/')[1].split('?')[0].split('&')[0];
      } else if (clean.includes('youtube.com/watch')) {
        const urlObj = new URL(clean);
        videoId = urlObj.searchParams.get('v') || 'H3ynKWEboA8';
      } else if (clean.includes('youtube.com/embed/')) {
        videoId = clean.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
      } else if (clean.length === 11 && !clean.includes('/') && !clean.includes('.')) {
        videoId = clean;
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&controls=1&mute=0&origin=${window.location.origin}`;
    } catch {
      return `https://www.youtube.com/embed/H3ynKWEboA8?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&controls=1&mute=0`;
    }
  }, [isPlaying]);

  const handleApplyCustomUrl = () => {
    const raw = customInputUrl.trim();
    if (!raw) {
      setCustomUrlFeedback('⚠️ กรุณากรอกหรือวางลิงก์ YouTube ก่อนดิว้า!');
      return;
    }
    const hasYt = raw.includes('youtube.com') || raw.includes('youtu.be') || (raw.length === 11 && !raw.includes('/'));
    if (!hasYt) {
      setCustomUrlFeedback('⚠️ ลิงก์ต้องเป็นของ YouTube เช่น https://youtu.be/... หรือ https://www.youtube.com/watch?v=...');
      return;
    }
    setCustomYoutubeUrl(raw);
    setCustomUrlFeedback('✅ โหลดเพลง YouTube สำเร็จแล้ว! พร้อมกดเริ่มเล่น');
    soundManager.playLevelUp();
    setTimeout(() => setCustomUrlFeedback(null), 3500);
  };

  const handleClearCustomUrl = () => {
    setCustomYoutubeUrl('');
    setCustomInputUrl('');
    setCustomUrlFeedback('คืนค่าเป็นเพลงมาตรฐานแล้ว');
    setTimeout(() => setCustomUrlFeedback(null), 2500);
  };

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

  // Fullscreen Toggle for the Arena
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        setIsFullscreen(true);
        if (arenaContainerRef.current?.requestFullscreen) {
          try {
            await arenaContainerRef.current.requestFullscreen();
          } catch {
            // CSS fixed fallback works seamlessly
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

  // Browser fullscreen change listener
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

  // YouTube message listener
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

  // Song timer & auto-completion
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

  // Start Game
  const startGame = () => {
    const track = PRESET_TRACKS[selectedTrackIndex] || PRESET_TRACKS[0];
    const dur = customYoutubeUrl.trim() ? 240 : (track.duration || 156);
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
    activeBpmRef.current = customYoutubeUrl.trim() ? customBpm : (track.bpm || 145);
  };

  // Stop / Pause Game
  const stopGame = () => {
    setIsPlaying(false);
    setNotes([]);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Reset player money, coins, and score across all players
  const handleResetAllPlayerData = async () => {
    if (!window.confirm('คุณต้องการรีเซ็ตเงินและคะแนนของผู้เล่นทุกคนให้เป็น 0 เริ่มต้นใหม่หรือไม่?')) {
      return;
    }
    try {
      // 1. Reset local profile state
      onUpdateProfile(() => ({
        ...DEFAULT_PROFILE,
        coins: 0,
        points: 0,
        highestScore: 0,
        highestCombo: 0,
        totalMolesWhacked: 0
      }));

      // 2. Call server reset endpoint
      await fetch('/api/admin/reset', { method: 'POST' });

      setResetFeedback('✅ รีเซ็ตเงินและคะแนนผู้เล่นทุกคนเป็น 0 สำเร็จ!');
      setTimeout(() => setResetFeedback(null), 3500);
      soundManager.playCoin();
    } catch (e) {
      console.warn('Failed to call server reset:', e);
      setResetFeedback('✅ รีเซ็ตเงินและคะแนนในเครื่องสำเร็จ!');
      setTimeout(() => setResetFeedback(null), 3500);
    }
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

  // Hero Cooldown loop
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

  // Evaluate note hit (Human player only!)
  const evaluateHit = useCallback(
    (judgment: JudgmentType, noteType: NoteType = 'tap', isCrit = false, isDualHit = false) => {
      if (judgment === 'MISS') {
        if (shieldCharges > 0) {
          setShieldCharges((prev) => prev - 1);
          soundManager.playProsekaTap('GOOD');
          setLastJudgment({ type: 'GOOD', id: Date.now(), text: '🛡️ เกราะช่วยไว้!' });
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

      if (isDualHit) {
        soundManager.playDualHit();
      } else if (noteType === 'hold') {
        soundManager.playSlide();
      } else {
        soundManager.playProsekaTap(judgment);
      }

      const baseScore = judgment === 'PERFECT' ? 1200 : judgment === 'GREAT' ? 800 : 400;
      const feverMult = feverTimer > 0 ? 1.5 : 1.0;
      const critMult = isCrit ? 2.0 : 1.0;
      const dualMult = isDualHit ? 1.5 : 1.0;
      const earned = Math.round(baseScore * diffConfig.scoreMultiplier * feverMult * critMult * dualMult);

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

      // Rewards
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

      setLastJudgment({
        type: judgment,
        id: Date.now(),
        text: isDualHit
          ? '⚡ กดพร้อมกัน! DUAL HIT ✨'
          : noteType === 'hold'
          ? '✨ กดค้างสำเร็จ!'
          : undefined
      });
    },
    [combo, diffConfig.scoreMultiplier, feverTimer, maxCombo, onUpdateProfile, score, shieldCharges]
  );

  // Lane Key Press (Press down)
  const handleLanePress = useCallback(
    (laneIndex: number) => {
      // Visual feedback
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

      // Hit window: scaled slightly with speed for natural rhythm game feel
      const currentSpeed = noteSpeedRef.current;
      const hitWindowMs = Math.min(280, Math.max(120, 240 / Math.sqrt(currentSpeed)));
      const now = performance.now();

      setNotes((prevNotes) => {
        let evaluated = false;
        let isSimultaneousHit = false;

        const updated = prevNotes.map((note) => {
          if (evaluated || note.lane !== laneIndex || note.isHit || note.isMissed) {
            return note;
          }

          const diff = Math.abs(now - note.targetTime);
          if (diff <= hitWindowMs) {
            evaluated = true;
            let judgment: JudgmentType = 'GOOD';
            const perfectThreshold = hitWindowMs * 0.35;
            const greatThreshold = hitWindowMs * 0.65;

            if (diff <= perfectThreshold) judgment = 'PERFECT';
            else if (diff <= greatThreshold) judgment = 'GREAT';

            // Check if this is a simultaneous dual note!
            if (note.isDual && note.pairedLane !== undefined) {
              const paired = prevNotes.find(
                (p) => p.lane === note.pairedLane && Math.abs(p.targetTime - note.targetTime) < 60
              );
              if (paired && (paired.isHit || laneHits[note.pairedLane])) {
                isSimultaneousHit = true;
              }
            }

            // 1. กดค้าง (Hold Note): Player begins holding down
            if (note.type === 'hold') {
              setHoldingLanes((h) => {
                const next = [...h];
                next[laneIndex] = true;
                return next;
              });
              soundManager.playSlide();
              setLastJudgment({ type: judgment, id: Date.now(), text: 'กำลังกดค้าง... 🔥' });
              return { ...note, isHolding: true, holdProgress: 0.1 };
            }

            // 2. กดธรรมดา / กดพร้อมกัน (Tap or Simultaneous Dual Hit)
            evaluateHit(judgment, 'tap', note.isGolden, isSimultaneousHit || note.isDual);
            return { ...note, isHit: true };
          }
          return note;
        });

        return updated;
      });
    },
    [evaluateHit, laneHits]
  );

  // Lane Key Release (Handles กดค้าง Hold note completion)
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
            const holdEndTime = note.holdEndTargetTime || (note.targetTime + (note.holdDuration || 1200));
            const diffFromEnd = Math.abs(now - holdEndTime);

            // Successfully held until the end of the note tail
            if (now >= holdEndTime - 280 || diffFromEnd <= 280) {
              evaluateHit('PERFECT', 'hold', note.isGolden);
              return { ...note, isHit: true, isHolding: false, holdCompleted: true };
            } else {
              // Released too early! Miss!
              evaluateHit('MISS');
              setLastJudgment({ type: 'MISS', id: Date.now(), text: 'หลุดกดค้าง! ⚠️' });
              return { ...note, isMissed: true, isHolding: false };
            }
          }
          return note;
        });
      });
    },
    [evaluateHit]
  );

  // Keyboard Event Listeners
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

  // Main Note Spawning & Game Loop (Strictly 3 note types: กดธรรมดา, กดพร้อมกัน, กดค้าง)
  useEffect(() => {
    if (!isPlaying) return;

    const activeLanes = diffConfig.activeLanes;
    const currentSpeed = noteSpeed;
    const currentTravelTime = Math.round(2000 / currentSpeed);

    const gameLoop = (currentTime: number) => {
      const bpm = activeBpmRef.current;
      const beatInterval = (60 / bpm) * 1000 * diffConfig.intervalMultiplier;

      // Spawn notes on rhythm beats
      if (currentTime - lastSpawnTimeRef.current >= beatInterval) {
        lastSpawnTimeRef.current = currentTime;

        const isGolden = goldenBuffRemaining > 0 || Math.random() < 0.12;
        if (goldenBuffRemaining > 0) {
          setGoldenBuffRemaining((prev) => Math.max(0, prev - 1));
        }

        const roll = Math.random();

        // 1. กดพร้อมกัน (Simultaneous / Double note) ~ 22% chance
        const canSpawnDual = difficulty !== 'easy' && activeLanes.length >= 2;
        if (canSpawnDual && roll < 0.22) {
          const shuffled = [...activeLanes].sort(() => Math.random() - 0.5);
          const laneA = Math.min(shuffled[0], shuffled[1]);
          const laneB = Math.max(shuffled[0], shuffled[1]);
          const targetTime = currentTime + currentTravelTime;

          const dualNoteA: RhythmNote = {
            id: `${currentTime}-dual-A-${Math.random()}`,
            lane: laneA,
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'tap',
            isDual: true,
            pairedLane: laneB
          };

          const dualNoteB: RhythmNote = {
            id: `${currentTime}-dual-B-${Math.random()}`,
            lane: laneB,
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'tap',
            isDual: true,
            pairedLane: laneA
          };

          setNotes((prev) => [...prev, dualNoteA, dualNoteB]);
        }
        // 2. กดค้าง (Hold / Long note) ~ 20% chance
        else if (roll < 0.42) {
          const randomLane = activeLanes[Math.floor(Math.random() * activeLanes.length)];
          const holdDuration = 1200 + Math.floor(Math.random() * 1000); // 1.2s - 2.2s sustain
          const targetTime = currentTime + currentTravelTime;

          const holdNote: RhythmNote = {
            id: `${currentTime}-hold-${Math.random()}`,
            lane: randomLane,
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'hold',
            holdDuration,
            holdEndTargetTime: targetTime + holdDuration
          };

          setNotes((prev) => [...prev, holdNote]);
        }
        // 3. กดธรรมดา (Normal / Tap note) ~ 58% chance
        else {
          const randomLane = activeLanes[Math.floor(Math.random() * activeLanes.length)];
          const targetTime = currentTime + currentTravelTime;

          const tapNote: RhythmNote = {
            id: `${currentTime}-tap-${Math.random()}`,
            lane: randomLane,
            spawnTime: currentTime,
            targetTime,
            isGolden,
            isHit: false,
            isMissed: false,
            type: 'tap'
          };

          setNotes((prev) => [...prev, tapNote]);
        }
      }

      // Update falling notes and check misses (NO BOTS, 100% PLAYER DRIVEN)
      setNotes((prevNotes) => {
        const updated: RhythmNote[] = [];

        for (const note of prevNotes) {
          if (note.isHit) continue;

          // While player is holding a hold note
          if (note.type === 'hold' && note.isHolding) {
            const holdEndTime = note.holdEndTargetTime || (note.targetTime + (note.holdDuration || 1200));

            // Completed hold successfully
            if (currentTime >= holdEndTime) {
              evaluateHit('PERFECT', 'hold', note.isGolden);
              setLastJudgment({ type: 'PERFECT', id: Date.now(), text: '✨ กดค้างสำเร็จ 100%!' });
              continue;
            }

            // Still holding
            updated.push(note);
            continue;
          }

          // Check if unhit note has passed the judgment line (Miss)
          const missThreshold = Math.min(260, Math.max(130, 220 / Math.sqrt(currentSpeed)));
          if (!note.isHit && !note.isMissed && currentTime > note.targetTime + missThreshold) {
            evaluateHit('MISS');
            updated.push({ ...note, isMissed: true });
            continue;
          }

          // Remove old missed notes after they leave screen
          if (currentTime > note.targetTime + 450 && !note.isHolding) {
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
  }, [isPlaying, diffConfig, difficulty, goldenBuffRemaining, noteSpeed, evaluateHit]);

  const nowMs = performance.now();

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Grade & Accuracy
  const totalNotes = stats.perfect + stats.great + stats.good + stats.miss;
  const accuracy =
    totalNotes > 0
      ? Math.round(((stats.perfect * 100 + stats.great * 80 + stats.good * 50) / (totalNotes * 100)) * 1000) / 10
      : 100;

  let grade = 'C';
  let gradeColor = 'text-slate-400';
  if (accuracy >= 95 && stats.miss === 0) {
    grade = 'SSS';
    gradeColor = 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-[#B4E578]';
  } else if (accuracy >= 90) {
    grade = 'SS';
    gradeColor = 'text-yellow-400';
  } else if (accuracy >= 80) {
    grade = 'S';
    gradeColor = 'text-[#95D58B]';
  } else if (accuracy >= 70) {
    grade = 'A';
    gradeColor = 'text-emerald-400';
  } else if (accuracy >= 55) {
    grade = 'B';
    gradeColor = 'text-amber-400';
  }

  return (
    <div
      className={`w-full flex flex-col items-center select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-2 sm:p-4 overflow-y-auto' : 'relative'
      }`}
    >
      {/* Reset Confirmation Banner */}
      {resetFeedback && (
        <div className="fixed top-4 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2 border-2 border-emerald-300 animate-bounce">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{resetFeedback}</span>
        </div>
      )}

      {/* Top Header Card */}
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
                <span>โหมดดนตรีริทึม (เล่นจริง ไร้บอท)</span>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                  ⚡ SPEED {noteSpeed.toFixed(1)}x
                </span>
              </h2>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                ลูกเล่น 3 แบบ: <strong>กดธรรมดา</strong>, <strong>กดพร้อมกัน (Dual)</strong>, <strong>กดค้าง (Hold)</strong> ตามจังหวะเพลง
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* Custom YouTube Link Button */}
            <button
              onClick={() => setShowCustomUrlPanel((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                customYoutubeUrl.trim() || showCustomUrlPanel
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
              }`}
              title="ใส่ลิงก์เพลงใน YouTube เอง"
            >
              <Music className="w-3.5 h-3.5" />
              <span>ใส่ลิงก์เพลง</span>
            </button>

            {/* Speed Control Toggle Button */}
            <button
              onClick={() => setShowSpeedControls((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showSpeedControls
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
              title="ปรับความเร็วโน้ต (0.5x ถึง 20x)"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>ความเร็ว ({noteSpeed}x)</span>
            </button>

            {/* Key Settings Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
              title="ตั้งค่าปุ่มกดเอง"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งปุ่มกด</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isFullscreen
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isFullscreen ? 'ย่อจอปกติ' : 'ขยายเต็มจอ'}
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

        {/* CUSTOM YOUTUBE SONG URL INPUT CARD */}
        <div className={`p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 border-2 border-rose-200 mb-2.5 ${showCustomUrlPanel || customYoutubeUrl ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-950">
              <Music className="w-4 h-4 text-rose-600" />
              <span>ใส่ลิงก์เพลงจาก YouTube (เล่นเพลงโปรดของคุณได้ตามใจชอบ):</span>
            </div>
            {customYoutubeUrl && (
              <button
                onClick={handleClearCustomUrl}
                className="text-[11px] text-rose-700 hover:text-rose-900 underline font-bold cursor-pointer"
              >
                ✕ คืนค่าเพลงเริ่มต้น
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="วางลิงก์ YouTube ที่นี่ เช่น https://youtu.be/... หรือ https://www.youtube.com/watch?v=..."
                value={customInputUrl}
                onChange={(e) => setCustomInputUrl(e.target.value)}
                disabled={isPlaying}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-rose-300 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-rose-400 font-mono shadow-inner"
              />
            </div>

            <button
              onClick={handleApplyCustomUrl}
              disabled={isPlaying}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>โหลดเพลงนี้!</span>
            </button>
          </div>

          {/* Custom BPM Adjuster */}
          <div className="mt-2 pt-2 border-t border-rose-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[11px]">จังหวะเพลง (BPM):</span>
              <div className="flex items-center gap-1">
                {[100, 128, 140, 160].map((bpmVal) => (
                  <button
                    key={bpmVal}
                    onClick={() => setCustomBpm(bpmVal)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      customBpm === bpmVal
                        ? 'bg-rose-600 text-white border-rose-700 font-black'
                        : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {bpmVal} BPM
                  </button>
                ))}
              </div>
            </div>

            {customYoutubeUrl && (
              <div className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1">
                <span>✅ กำลังใช้เพลงจากลิงก์ YouTube ของคุณ</span>
              </div>
            )}
          </div>

          {customUrlFeedback && (
            <div className="mt-1.5 text-xs font-bold text-rose-700 animate-pulse">
              {customUrlFeedback}
            </div>
          )}
        </div>

        {/* SPEED SELECTOR PANEL (0.5x ถึง 20x) */}
        <div className={`p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 mb-2.5 ${showSpeedControls ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>ความเร็วเพลง / โน้ต (เลือกได้ 0.5x ถึง 20x):</span>
              <span className="font-mono bg-amber-200 px-2 py-0.5 rounded-lg text-amber-900 font-black">
                {noteSpeed.toFixed(1)}x
              </span>
            </div>

            {/* Fine stepper */}
            <div className="flex items-center gap-1">
              <button
                disabled={noteSpeed <= 0.5}
                onClick={() => updateNoteSpeed(noteSpeed - 0.5)}
                className="w-6 h-6 rounded-lg bg-white border border-amber-300 text-amber-900 font-black text-xs hover:bg-amber-100 disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-xs"
                title="ลดความเร็ว -0.5x"
              >
                -
              </button>
              <button
                disabled={noteSpeed >= 20}
                onClick={() => updateNoteSpeed(noteSpeed + 0.5)}
                className="w-6 h-6 rounded-lg bg-white border border-amber-300 text-amber-900 font-black text-xs hover:bg-amber-100 disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-xs"
                title="เพิ่มความเร็ว +0.5x"
              >
                +
              </button>
            </div>
          </div>

          {/* Preset Buttons 0.5x to 20x */}
          <div className="flex flex-wrap items-center gap-1">
            {SPEED_PRESETS.map((spd) => (
              <button
                key={spd}
                onClick={() => updateNoteSpeed(spd)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  Math.abs(noteSpeed - spd) < 0.05
                    ? 'bg-amber-600 text-white font-black shadow-xs scale-105'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Slider from 0.5 to 20 */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-amber-800 font-bold">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={noteSpeed}
              onChange={(e) => updateNoteSpeed(parseFloat(e.target.value))}
              className="flex-1 accent-amber-600 cursor-pointer h-1.5 bg-amber-200 rounded-lg"
            />
            <span className="text-[10px] text-amber-800 font-bold">20.0x</span>
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

      {/* Health Bar, Timer & Live Score */}
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

        {/* Live Song Timer */}
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

      {/* MAIN RHYTHM RUNWAY ARENA */}
      <div
        ref={arenaContainerRef}
        className={`relative w-full max-w-2xl bg-gradient-to-b from-[#111928] via-[#0b101c] to-black rounded-3xl border-2 border-[#95D58B] shadow-2xl overflow-hidden flex flex-col justify-end select-none ${
          isFullscreen ? 'h-[85vh] max-w-5xl' : 'h-[460px] sm:h-[500px]'
        }`}
      >
        {/* Arena Top Indicators */}
        <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
          {/* Note Speed Indicator */}
          <div className="flex items-center gap-1 bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-xl font-mono text-[10px] font-black shadow-md border border-amber-300">
            <Zap className="w-3 h-3 fill-slate-950" />
            <span>{noteSpeed.toFixed(1)}x</span>
          </div>

          {/* Line Height Indicator */}
          <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-emerald-400/30 text-[10px] text-emerald-300 font-bold">
            <ArrowUp className="w-3 h-3 text-[#B4E578]" />
            <span>เส้นกด: {judgmentLineOffset}px</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white border-2 border-[#95D58B] flex items-center gap-1.5 text-xs font-black shadow-lg backdrop-blur-sm cursor-pointer transition-all hover:scale-105 active:scale-95 group"
            title={isFullscreen ? 'ย่อหน้าจอกลับ' : 'ขยายเต็มจอ'}
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

        {/* Flowing Rhythm Notes (Strictly: กดธรรมดา, กดพร้อมกัน, กดค้าง) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {notes.map((note) => {
            const progress = (nowMs - note.spawnTime) / travelDuration;
            if (progress < 0 || progress > 1.25) return null;

            const laneLeftPercent = note.lane * 25;
            const topStyle = `calc(${progress} * (100% - ${judgmentLineOffset}px))`;

            return (
              <React.Fragment key={note.id}>
                {/* 1. กดพร้อมกัน: Connecting Sync Beam across the two paired lanes */}
                {note.isDual && note.pairedLane !== undefined && note.lane < note.pairedLane && (
                  <div
                    className="absolute z-15 pointer-events-none flex items-center justify-center transition-opacity"
                    style={{
                      top: topStyle,
                      left: `${note.lane * 25 + 12.5}%`,
                      width: `${(note.pairedLane - note.lane) * 25}%`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="w-full h-3 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 rounded-full shadow-[0_0_20px_rgba(250,204,21,1)] border-2 border-white flex items-center justify-center">
                      <span className="text-[8px] font-black tracking-widest text-slate-950 uppercase">
                        ⚡ กดพร้อมกัน ⚡
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
                    transform: 'translateY(-50%)'
                  }}
                >
                  {/* 2. กดค้าง: Long Hold Track Ribbon extending up to the tail */}
                  {note.type === 'hold' && (
                    <div
                      className="absolute w-7 sm:w-9 bg-gradient-to-t from-emerald-400/90 via-[#95D58B]/70 to-teal-400/80 rounded-t-2xl shadow-[0_0_20px_rgba(52,211,153,0.9)] border-x-2 border-t-2 border-white pointer-events-none flex flex-col items-center justify-around overflow-hidden"
                      style={{
                        bottom: '50%',
                        height: `${Math.min(280, Math.max(70, ((note.holdDuration || 1200) / travelDuration) * 280))}px`
                      }}
                    >
                      <span className="text-[9px] font-black text-slate-950 tracking-tighter animate-pulse">▼ กดค้าง ▼</span>
                      <div className="absolute top-0 inset-x-0 h-2.5 bg-yellow-300 border-b border-white rounded-t-xl" />
                    </div>
                  )}

                  {/* 3. Note Head Puck */}
                  <div
                    className={`relative flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-2xl border-2 shadow-lg transition-transform ${
                      note.isDual
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border-white shadow-amber-400/90 scale-105 ring-2 ring-yellow-200'
                        : note.type === 'hold'
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-[#95D58B] border-white shadow-emerald-400/80 scale-105'
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
                      {note.isDual ? 'กดคู่ ⚡' : note.type === 'hold' ? 'กดค้าง' : 'กด'}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Combo & Judgment Display */}
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

        {/* Elevated Judgment Line (~5 cm / 180px from bottom) */}
        <div
          className="absolute inset-x-0 h-2.5 bg-gradient-to-r from-[#a8e063] via-[#b6e354] to-[#9ad651] shadow-[0_0_24px_rgba(182,227,84,0.95)] z-20 pointer-events-none"
          style={{
            bottom: `${judgmentLineOffset}px`,
            transform: 'none'
          }}
        >
          {/* Target Receptors for all 4 Lanes */}
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
                  ? 'bg-emerald-500/40 text-yellow-300 font-black ring-2 ring-emerald-300'
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

        {/* Start Game Modal / Overlay */}
        {!isPlaying && !showSummaryModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 z-40">
            <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border-2 border-[#95D58B] text-center max-w-sm w-full flex flex-col items-center animate-mole-emerge text-slate-900 shadow-2xl relative">
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
              <p className="text-xs text-slate-600 mt-1 mb-2 leading-relaxed">
                โน้ต 3 แบบ: <strong>กดธรรมดา</strong>, <strong>กดพร้อมกัน (Dual)</strong>, <strong>กดค้าง (Hold)</strong>
              </p>

              {/* Speed summary badge in modal */}
              <div className="flex items-center gap-1.5 mb-3 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                <Zap className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                <span>ความเร็วโน้ตที่ตั้งไว้: <strong>{noteSpeed.toFixed(1)}x</strong></span>
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

      {/* Helper Keyboard Tip & Reset All Data Button */}
      <div className="w-full max-w-2xl mt-2.5 p-3 bg-white/95 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <span className="text-base">🎹</span>
          <span>
            ปุ่มกด:{' '}
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
          {/* Reset All Player Data Button */}
          <button
            onClick={handleResetAllPlayerData}
            className="text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
            title="รีเซ็ตเงินและคะแนนของผู้เล่นทุกคนให้เริ่มใหม่"
          >
            <RefreshCw className="w-3 h-3" />
            <span>รีเซ็ตเงิน & คะแนน</span>
          </button>

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
            ⚙️ ตั้งปุ่มกด
          </button>
        </div>
      </div>

      {/* สรุปคะแนนเพลงจบแล้ว */}
      {showSummaryModal && (
        <div
          onClick={() => setShowSummaryModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 sm:p-5 max-w-[340px] sm:max-w-sm w-full border-2 border-[#95D58B] shadow-2xl text-slate-900 animate-mole-emerge relative overflow-hidden"
          >
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
                  {currentTrack.name} (ความเร็ว {noteSpeed.toFixed(1)}x)
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

            {/* Action Buttons */}
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
