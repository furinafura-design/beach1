import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { MOLE_IMAGE_URL } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Difficulty, JudgmentType, RhythmNote, UserProfile } from '../types/game';
import { Music, Play, Pause, Youtube, Sparkles, Sliders, Volume2, Eye, EyeOff, Award, Flame } from 'lucide-react';

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
    speedMultiplier: 1.5,
    intervalMultiplier: 0.35,
    activeLanes: [0, 1, 2, 3],
    scoreMultiplier: 2.2,
    color: 'bg-rose-50 text-rose-800 border-rose-300'
  }
};

const PRESET_TRACKS = [
  {
    name: '🔥 เพลงแนะนำประจำสังเวียน (H3ynKWEboA8) ดิว้า!',
    url: 'https://youtu.be/H3ynKWEboA8?si=7KtV6EmYMvR2EAzR',
    bpm: 145
  },
  {
    name: 'Electro Anime Pop (BPM 135)',
    url: 'https://www.youtube.com/watch?v=fKopy74weus',
    bpm: 135
  },
  {
    name: 'Vocaloid High Beat (BPM 160)',
    url: 'https://www.youtube.com/watch?v=tNkZsRW7h2c',
    bpm: 160
  },
  {
    name: 'Chill Melodic Hop (BPM 90)',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    bpm: 90
  }
];

const LANE_KEYS = ['D', 'F', 'J', 'K'];
const LANE_COLORS = [
  { border: 'border-[#95D58B]', bg: 'bg-[#95D58B]/20', glow: 'shadow-[#95D58B]/50', text: 'text-[#5a9c51]' },
  { border: 'border-[#B4E578]', bg: 'bg-[#B4E578]/20', glow: 'shadow-[#B4E578]/50', text: 'text-[#689c2c]' },
  { border: 'border-[#B7E658]', bg: 'bg-[#B7E658]/20', glow: 'shadow-[#B7E658]/50', text: 'text-[#7da924]' },
  { border: 'border-[#C3E895]', bg: 'bg-[#C3E895]/20', glow: 'shadow-[#C3E895]/50', text: 'text-[#5a9c51]' },
];

function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match && match[1] ? match[1] : null;
}

export const RhythmGame: React.FC<RhythmGameProps> = ({ profile, onUpdateProfile }) => {
  const [youtubeInput, setYoutubeInput] = useState<string>('https://youtu.be/H3ynKWEboA8?si=7KtV6EmYMvR2EAzR');
  const [currentVideoId, setCurrentVideoId] = useState<string>('H3ynKWEboA8');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [bpm, setBpm] = useState<number>(145);
  const [hiSpeed, setHiSpeed] = useState<number>(1.5); // 1.0x to 3.0x
  const [showVideo, setShowVideo] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Gameplay state
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [lastJudgment, setLastJudgment] = useState<{ type: JudgmentType; id: number } | null>(null);
  const [laneHits, setLaneHits] = useState<boolean[]>([false, false, false, false]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const noteSpawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notesRef = useRef<RhythmNote[]>([]);
  const startTimeRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);

  const diffConfig = RHYTHM_DIFFICULTY[difficulty];

  // Note travel duration from top to judgment line in ms (adjusted for speed & difficulty)
  const travelDurationMs = Math.floor(1800 / (hiSpeed * diffConfig.speedMultiplier));

  // Keep notesRef in sync with notes
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (noteSpawnTimerRef.current) clearInterval(noteSpawnTimerRef.current);
    };
  }, []);

  // PostMessage helper to control YouTube iframe
  const sendYouTubeCommand = useCallback((func: 'playVideo' | 'pauseVideo' | 'unMute') => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: '' }),
        '*'
      );
    } catch {
      // Ignore cross-origin error if any
    }
  }, []);

  // Handle Load YouTube Video
  const handleLoadVideo = () => {
    const id = extractYoutubeVideoId(youtubeInput);
    if (id) {
      setCurrentVideoId(id);
      setIsPlaying(false);
      sendYouTubeCommand('pauseVideo');
    } else {
      alert('กรุณากรอกลิงก์ YouTube ที่ถูกต้อง เช่น https://www.youtube.com/watch?v=... หรือ youtu.be/...');
    }
  };

  // Spawn note in rhythmic lyrical/vocal beat patterns adapted to difficulty
  const spawnRhythmBeat = useCallback(() => {
    const now = Date.now();
    const targetHitTime = now + travelDurationMs;
    beatCountRef.current += 1;
    const b = beatCountRef.current;

    const newNotes: RhythmNote[] = [];
    const isGolden = Math.random() < (difficulty === 'insane' ? 0.28 : 0.15);

    // Pick active lanes based on chosen difficulty
    const lanesPool = diffConfig.activeLanes;
    const primaryLane = lanesPool[(b * 3 + Math.floor(Math.random() * lanesPool.length)) % lanesPool.length];

    newNotes.push({
      id: Math.random().toString(),
      lane: primaryLane,
      spawnTime: now,
      targetTime: targetHitTime,
      isGolden,
      isHit: false,
      isMissed: false
    });

    // Melodic accents / vocal hooks:
    // Easy: strictly single notes
    // Medium: double note every 4th or 6th beat
    // Insane: double note and syncopated rapid notes on vocal rushes
    if (difficulty === 'medium' && b % 4 === 0) {
      const secondaryLane = (primaryLane + 2) % 4;
      newNotes.push({
        id: Math.random().toString(),
        lane: secondaryLane,
        spawnTime: now,
        targetTime: targetHitTime,
        isGolden: false,
        isHit: false,
        isMissed: false
      });
    } else if (difficulty === 'insane' && (b % 3 === 0 || b % 5 === 0)) {
      const remainingLanes = lanesPool.filter((l) => l !== primaryLane);
      const secondaryLane = remainingLanes[Math.floor(Math.random() * remainingLanes.length)];
      newNotes.push({
        id: Math.random().toString(),
        lane: secondaryLane,
        spawnTime: now,
        targetTime: targetHitTime,
        isGolden: Math.random() < 0.3,
        isHit: false,
        isMissed: false
      });
    }

    setNotes((prev) => [...prev, ...newNotes]);
  }, [diffConfig.activeLanes, difficulty, travelDurationMs]);

  // Game Loop (60fps update of falling notes and miss checks)
  const gameLoop = useCallback(() => {
    const now = Date.now();

    setNotes((prevNotes) => {
      let missedCount = 0;
      const updated = prevNotes
        .map((n) => {
          // Check if note passed judgment line by more than 160ms without being hit
          if (!n.isHit && !n.isMissed && now > n.targetTime + 160) {
            missedCount++;
            return { ...n, isMissed: true };
          }
          return n;
        })
        // Remove notes that are well past the screen
        .filter((n) => now <= n.targetTime + 400 && (!n.isHit || now <= n.targetTime + 100));

      if (missedCount > 0) {
        soundManager.playProsekaTap('MISS');
        setCombo(0);
        setLastJudgment({ type: 'MISS', id: Date.now() });
      }

      return updated;
    });

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Toggle Start / Pause (auto plays / pauses YouTube music!)
  const togglePlayGame = () => {
    if (isPlaying) {
      setIsPlaying(false);
      sendYouTubeCommand('pauseVideo');
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (noteSpawnTimerRef.current) clearInterval(noteSpawnTimerRef.current);
    } else {
      setIsPlaying(true);
      setNotes([]);
      setScore(0);
      setCombo(0);
      startTimeRef.current = Date.now();
      beatCountRef.current = 0;

      // Automatically start playing the YouTube video as requested!
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('playVideo');

      // Start animation loop
      animFrameRef.current = requestAnimationFrame(gameLoop);

      // Start note spawn rhythm synced with BPM and difficulty
      const beatMs = (60 / bpm) * 1000 * diffConfig.intervalMultiplier;
      noteSpawnTimerRef.current = setInterval(() => {
        spawnRhythmBeat();
      }, beatMs);
    }
  };

  // Handle Lane Press (Keyboard or Touch)
  const handleLanePress = useCallback(
    (laneIndex: number) => {
      if (!isPlaying) return;

      // Flash lane lighting
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
      }, 140);

      const now = Date.now();
      // Find candidate notes in this lane that have not been hit/missed
      const candidates = notesRef.current.filter(
        (n) => n.lane === laneIndex && !n.isHit && !n.isMissed
      );

      if (candidates.length === 0) return;

      // Find closest note to judgment line
      let closestNote: RhythmNote | null = null;
      let minDiff = Infinity;

      for (const note of candidates) {
        const diff = Math.abs(now - note.targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }

      if (!closestNote) return;

      // Judgment thresholds (Project SEKAI standard)
      let judgment: JudgmentType | null = null;
      let points = 0;

      if (minDiff <= 55) {
        judgment = 'PERFECT';
        points = closestNote.isGolden ? 800 : 500;
      } else if (minDiff <= 110) {
        judgment = 'GREAT';
        points = closestNote.isGolden ? 550 : 350;
      } else if (minDiff <= 170) {
        judgment = 'GOOD';
        points = 200;
      } else if (minDiff <= 230) {
        // Late or early hit outside window
        judgment = 'MISS';
      }

      if (!judgment) return;

      soundManager.playProsekaTap(judgment);

      // Mark note as hit
      const targetId = closestNote.id;
      setNotes((prev) =>
        prev.map((n) => (n.id === targetId ? { ...n, isHit: true } : n))
      );

      // Update combo & score
      if (judgment === 'MISS') {
        setCombo(0);
      } else {
        setCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });

        const scaledPoints = Math.floor(points * diffConfig.scoreMultiplier);
        setScore((prev) => prev + scaledPoints + Math.floor(combo * 10));

        // Update profile EXP and Coins silently without popups
        onUpdateProfile((prev) => {
          const gainedExp = Math.floor(scaledPoints / 15);
          let newExp = prev.currentExp + gainedExp;
          let newLevel = prev.level;
          let newMaxExp = prev.maxExp;

          while (newExp >= newMaxExp && newLevel < 100) {
            newExp -= newMaxExp;
            newLevel += 1;
            newMaxExp = Math.floor(100 + Math.pow(newLevel, 1.8) * 35);
          }

          return {
            ...prev,
            coins: prev.coins + Math.floor(scaledPoints / 30),
            points: (prev.points ?? 0) + scaledPoints,
            currentExp: newLevel >= 100 ? 0 : newExp,
            level: newLevel,
            maxExp: newMaxExp,
            totalMolesWhacked: prev.totalMolesWhacked + 1
          };
        });
      }

      setLastJudgment({ type: judgment, id: Date.now() });
    },
    [combo, diffConfig.scoreMultiplier, isPlaying, onUpdateProfile]
  );

  // Keyboard controls listener (D, F, J, K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toUpperCase();
      if (key === 'D') handleLanePress(0);
      if (key === 'F') handleLanePress(1);
      if (key === 'J') handleLanePress(2);
      if (key === 'K') handleLanePress(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLanePress]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Rhythm Mode Top Controls & YouTube Embed Header */}
      <div className="w-full max-w-2xl bg-white/95 p-4 sm:p-5 rounded-3xl border-2 border-[#95D58B] shadow-sm mb-4 select-none">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] flex items-center justify-center text-slate-900 shadow-xs border border-[#C3E895]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                โหมดดนตรีสไตล์โปรเจ็คเซไก
                <span className="text-[10px] font-bold bg-[#D1EBA0] text-emerald-950 px-2 py-0.5 rounded-md border border-[#95D58B]">
                  ไหลตามจังหวะร้องดิว้า!
                </span>
              </h2>
              <p className="text-xs text-emerald-800 font-medium">
                ตัวการ์ตูนปืนเขียวไหลลงมาตามจังหวะร้องดิว้า! อะไรว้า ชั่ยคร๊าฟ กด D, F, J, K หรือแตะบนหน้าจอ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Difficulty Selector in Header */}
            <div className="flex items-center gap-1 bg-emerald-50/80 p-1 rounded-xl border border-emerald-100">
              {(['easy', 'medium', 'insane'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  disabled={isPlaying}
                  onClick={() => setDifficulty(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    difficulty === d
                      ? RHYTHM_DIFFICULTY[d].color + ' shadow-xs border font-extrabold scale-102'
                      : 'text-slate-600 hover:text-slate-900 opacity-70'
                  } ${isPlaying ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {RHYTHM_DIFFICULTY[d].label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowVideo((prev) => !prev)}
              className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              title="ซ่อน/แสดงวิดีโอ YouTube"
            >
              {showVideo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{showVideo ? 'ซ่อนวิดีโอ' : 'แสดงวิดีโอ'}</span>
            </button>
          </div>
        </div>

        {/* YouTube Input Box */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="วางลิงก์เพลง YouTube ที่นี่..."
              className="flex-1 bg-slate-50 border border-emerald-200 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm rounded-xl px-3 py-2 text-slate-800 outline-none font-mono"
            />
            <button
              onClick={handleLoadVideo}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex-shrink-0"
            >
              โหลดเพลง
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 font-medium">เพลงแนะนำ:</span>
            {PRESET_TRACKS.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setYoutubeInput(t.url);
                  const id = extractYoutubeVideoId(t.url);
                  if (id) {
                    setCurrentVideoId(id);
                    setBpm(t.bpm);
                    setIsPlaying(false);
                    sendYouTubeCommand('pauseVideo');
                  }
                }}
                className="text-[10px] bg-emerald-50/80 hover:bg-[#D1EBA0] text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Embedded YouTube Player with ref for instant autoplay */}
        {showVideo && currentVideoId && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-emerald-200 bg-black aspect-video max-h-[220px] mx-auto relative shadow-inner">
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=0&enablejsapi=1&origin=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.origin : ''
              )}`}
              title="YouTube Music Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Hi-Speed & Start Bar */}
        <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* BPM */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">BPM:</span>
              <input
                type="range"
                min="70"
                max="210"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-20 accent-emerald-600 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-emerald-800 bg-[#D1EBA0] px-1.5 py-0.5 rounded-md border border-[#95D58B]">
                {bpm}
              </span>
            </div>

            {/* Hi-Speed Setting (Project SEKAI feature) */}
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">ความเร็วโน้ต:</span>
              <select
                value={hiSpeed}
                onChange={(e) => setHiSpeed(Number(e.target.value))}
                className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 font-bold text-emerald-900 outline-none cursor-pointer"
              >
                <option value={1.0}>1.0x (สบายๆ)</option>
                <option value={1.5}>1.5x (มาตรฐาน)</option>
                <option value={2.0}>2.0x (เซไกโปร)</option>
                <option value={2.5}>2.5x (ความเร็วแสง)</option>
              </select>
            </div>
          </div>

          <button
            onClick={togglePlayGame}
            className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] text-slate-950 border border-[#95D58B] hover:scale-102'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" /> หยุดเล่น
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" /> เริ่มท้าทายจังหวะเซไก!
              </>
            )}
          </button>
        </div>
      </div>

      {/* Project SEKAI Runway Arena */}
      <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl border-4 border-[#95D58B] shadow-2xl p-3 sm:p-4 relative overflow-hidden select-none">
        {/* HUD: Score and Combo */}
        <div className="w-full flex items-center justify-between text-white px-2 py-1 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#B4E578] font-bold">SCORE:</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">MAX COMBO:</span>
            <span className="text-sm font-bold text-amber-400 font-mono">{maxCombo}x</span>
          </div>
        </div>

        {/* 4-Lane Track Area */}
        <div
          className="relative w-full h-[380px] sm:h-[440px] bg-gradient-to-b from-slate-900/60 to-black rounded-2xl overflow-hidden border border-emerald-500/20"
          style={{
            perspective: '550px'
          }}
        >
          {/* Subtle runway grid lines */}
          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
            {LANE_KEYS.map((key, i) => (
              <div
                key={key}
                className={`relative h-full border-r border-white/10 transition-colors ${
                  laneHits[i] ? 'bg-gradient-to-t from-[#B4E578]/30 via-[#B4E578]/10 to-transparent' : ''
                }`}
              >
                {/* Light pillar wave when hit */}
                {laneHits[i] && (
                  <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[#B7E658]/40 via-[#B4E578]/15 to-transparent animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Falling Character Notes */}
          <div className="absolute inset-0 pointer-events-none">
            {notes.map((note) => {
              const now = Date.now();
              const progress = Math.max(0, (now - note.spawnTime) / travelDurationMs);
              if (progress > 1.25 || note.isHit) return null;

              // Top position from 0% (top horizon) to 84% (judgment line)
              const topPercent = progress * 84;
              const leftPercent = note.lane * 25;

              return (
                <div
                  key={note.id}
                  className="absolute w-[25%] flex flex-col items-center pointer-events-none transition-opacity"
                  style={{
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                    opacity: note.isMissed ? 0.3 : 1
                  }}
                >
                  {/* Proseka Style Note Bar with Character Face */}
                  <div
                    className={`relative w-[86%] py-1 rounded-xl flex items-center justify-center gap-1.5 shadow-lg border-2 ${
                      note.isGolden
                        ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 border-yellow-200 shadow-yellow-400/50'
                        : 'bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] border-white/80 shadow-[#95D58B]/50'
                    }`}
                  >
                    {/* Character Avatar Icon inside Note */}
                    <img
                      src={MOLE_IMAGE_URL}
                      alt="ลาว"
                      className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-md rounded-full bg-white/40 p-0.5"
                    />
                    <span className="text-[10px] font-black tracking-tight text-slate-900 uppercase">
                      {note.isGolden ? 'CRIT ⭐' : 'TAP'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Dynamic Combo Display (Proseka style) */}
          <div className="absolute inset-x-0 top-[28%] flex flex-col items-center justify-center pointer-events-none z-10">
            {combo > 2 && (
              <div className="text-center animate-bounce">
                <div className="text-3xl sm:text-5xl font-black font-mono text-white tracking-widest drop-shadow-[0_4px_12px_rgba(180,229,120,0.8)]">
                  {combo}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-[#B4E578] tracking-widest uppercase">
                  COMBO
                </div>
              </div>
            )}

            {/* Last Judgment Popup Feedback */}
            {lastJudgment && (
              <div
                key={lastJudgment.id}
                className="mt-2 text-center animate-mole-emerge font-black text-lg sm:text-2xl drop-shadow-lg"
              >
                {lastJudgment.type === 'PERFECT' && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-[#B4E578]">
                    PERFECT! ✨
                  </span>
                )}
                {lastJudgment.type === 'GREAT' && (
                  <span className="text-yellow-400">GREAT! ⭐</span>
                )}
                {lastJudgment.type === 'GOOD' && (
                  <span className="text-[#95D58B]">GOOD 👍</span>
                )}
                {lastJudgment.type === 'MISS' && (
                  <span className="text-rose-500">MISS ❌</span>
                )}
              </div>
            )}
          </div>

          {/* Glowing Judgment Line at bottom (เส้นตัดสินจังหวะ) */}
          <div className="absolute bottom-[64px] inset-x-0 h-2 bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] shadow-[0_0_16px_rgba(180,229,120,0.9)] z-20 pointer-events-none" />

          {/* 4 Interactive Tap Pads at Bottom of Runway */}
          <div className="absolute bottom-0 inset-x-0 h-[64px] grid grid-cols-4 z-30 bg-slate-950/80 border-t border-white/20 select-none touch-manipulation">
            {LANE_KEYS.map((key, i) => (
              <button
                key={key}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleLanePress(i);
                }}
                className={`h-full flex flex-col items-center justify-center border-r border-white/10 active:scale-95 transition-all cursor-pointer touch-manipulation ${
                  laneHits[i]
                    ? 'bg-gradient-to-t from-[#B4E578] to-[#95D58B] text-slate-950 font-black shadow-inner'
                    : 'bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                <span className="text-base sm:text-lg font-black font-mono leading-none">
                  {key}
                </span>
                <span className="text-[9px] text-[#B4E578] font-bold mt-0.5">
                  LANE {i + 1}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Game Overlay when not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 z-40">
            <div className="bg-white/95 p-6 rounded-3xl border-2 border-[#95D58B] text-center max-w-sm flex flex-col items-center animate-mole-emerge">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border border-[#C3E895] flex items-center justify-center text-3xl shadow-lg mb-2">
                <Music className="w-7 h-7 text-slate-900" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                แดนซ์ ลาวเนรคุณ
              </h3>
              <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                ตัวการ์ตูนจะไหลลงมาตามจังหวะคำร้องเพลง YouTube จะเริ่มเล่นอัตโนมัติเมื่อกดเริ่ม!
              </p>

              {/* Difficulty Selection in Modal */}
              <div className="w-full mb-4">
                <div className="text-[11px] font-bold text-slate-700 mb-1.5 text-left">
                  เลือกระดับความยาก:
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['easy', 'medium', 'insane'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        difficulty === d
                          ? RHYTHM_DIFFICULTY[d].color + ' ring-2 ring-emerald-400 font-black shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-black">{RHYTHM_DIFFICULTY[d].label}</div>
                      <div className="text-[9px] opacity-80 mt-0.5 font-medium leading-tight">
                        {d === 'easy' ? '2 เลน' : d === 'medium' ? '4 เลน' : 'สปีดโหด'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={togglePlayGame}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#95D58B] via-[#B4E578] to-[#B7E658] text-slate-950 font-black text-base shadow-lg shadow-[#95D58B]/40 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#C3E895]"
              >
                <Play className="w-5 h-5 fill-slate-950" /> เริ่มท้าทายจังหวะเพลง! (เปิดเพลงอัตโนมัติ)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helper Keyboard Tip Footer */}
      <div className="w-full max-w-xl mt-3 p-3 bg-white/90 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">🎹</span>
          <span>
            ปุ่มคีย์บอร์ดลัด: <strong className="font-mono bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">D</strong>, <strong className="font-mono bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">F</strong>, <strong className="font-mono bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">J</strong>, <strong className="font-mono bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">K</strong>
          </span>
        </div>
        <span className="text-[11px] text-emerald-700 font-bold bg-[#D1EBA0] px-2 py-0.5 rounded-md border border-[#95D58B]">
          สัมผัสหน้าจอมือถือได้
        </span>
      </div>
    </div>
  );
};
