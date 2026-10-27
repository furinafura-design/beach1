import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types/game';
import { soundManager } from '../utils/audio';
import { Sparkles, Bomb, Coins, Trash2, Award, RefreshCw, Volume2, ShieldAlert } from 'lucide-react';

interface WheelModalProps {
  profile: UserProfile;
  onUpdateProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  onClose?: () => void;
  onTriggerBombInGame?: () => void;
}

interface WheelSegment {
  id: string;
  type: 'bomb' | 'coins' | 'points' | 'trash' | 'ahmah';
  title: string;
  shortLabel: string;
  subText: string;
  icon: string;
  color: string;
  textColor: string;
  amount?: number;
}

const SPIN_COST = 300; // Cost in Points

const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 'bomb_1',
    type: 'bomb',
    title: 'ระเบิดบึ้มตูดแชงเบี้ย',
    shortLabel: 'ระเบิด x1',
    subText: 'ได้ระเบิดบึ้มดิว้า! เอาไปกด [B] หรือปุ่มระเบิดบึ้มทั้งกระดาน ชั่ยคร๊าฟ',
    icon: '💣',
    color: '#F43F5E',
    textColor: '#FFFFFF',
    amount: 1
  },
  {
    id: 'coins_500',
    type: 'coins',
    title: 'ได้เงินทองก้อนโต',
    shortLabel: '+500 เหรียญ',
    subText: 'ได้เงิน 500 เหรียญดิว้า! รวยเละเอาไปอัปเกรดค้อนชั่ยคร๊าฟ',
    icon: '💰',
    color: '#FBBF24',
    textColor: '#78350F',
    amount: 500
  },
  {
    id: 'trash_1',
    type: 'trash',
    title: 'ได้ขยะเปียก',
    shortLabel: 'ได้ขยะ',
    subText: 'อะไรว้า! ได้ขยะดิว้า ชั่ยคร๊าฟ! แต่เอาไปสะสมโชว์เพื่อนได้',
    icon: '🗑️',
    color: '#94A3B8',
    textColor: '#0F172A'
  },
  {
    id: 'points_2000',
    type: 'points',
    title: 'แจ็กพอตคะแนนมหาศาล',
    shortLabel: '+2,000 แต้ม',
    subText: 'ได้คะแนน 2,000 แต้มอะไรว้า! แจ็กพอตแตกกระจายดิว้า ชั่ยคร๊าฟ',
    icon: '⭐',
    color: '#B7E658', // TOA green accent
    textColor: '#14532D',
    amount: 2000
  },
  {
    id: 'ahmah',
    type: 'ahmah',
    title: 'ได้อาม่าถือไม้เรียว',
    shortLabel: 'ได้อาม่า 👵',
    subText: 'อาม่ามาแล้วดิว้า! ลื้อทำอะไรว้า! ไม้เรียวสั่นสะท้านแจกอั่งเปา +800 เหรียญ ชั่ยคร๊าฟ',
    icon: '👵',
    color: '#EC4899',
    textColor: '#FFFFFF',
    amount: 800
  },
  {
    id: 'bomb_2',
    type: 'bomb',
    title: 'ระเบิดคู่ตูดระเบิด',
    shortLabel: 'ระเบิด x2',
    subText: 'ได้ระเบิดคู่ 2 ลูกดิว้า! สังเวียนราบเป็นหน้ากลอง ชั่ยคร๊าฟ',
    icon: '🧨',
    color: '#FB7185',
    textColor: '#FFFFFF',
    amount: 2
  },
  {
    id: 'coins_1000',
    type: 'coins',
    title: 'ได้เงินก้อนใหญ่',
    shortLabel: '+1,000 เหรียญ',
    subText: 'ได้เงิน 1,000 เหรียญจุใจดิว้า! รวยจัดเต็มชั่ยคร๊าฟ',
    icon: '🪙',
    color: '#F59E0B',
    textColor: '#FFFFFF',
    amount: 1000
  },
  {
    id: 'trash_2',
    type: 'trash',
    title: 'ได้ขยะลอยน้ำ',
    shortLabel: 'ได้ขยะ',
    subText: 'อะไรว้า ได้ขยะอีกแล้วดิว้า ชั่ยคร๊าฟ! ดวงกุดอะไรเบอร์นี้',
    icon: '👞',
    color: '#CBD5E1',
    textColor: '#334155'
  }
];

const FUNNY_TRASH_LIST = [
  'รองเท้าแตะช้างดาวขาดข้างเดียว (มีคราบโคลน)',
  'ซองผงชูรสฉีกแล้วแต่ยังมีผงติดอยู่หน่อยนึง',
  'กระป๋องปลากระป๋องบุบแต่มีกลิ่นหอมปลาร้า',
  'ถุงก๊อบแก๊บเปียกน้ำลายแชงเบี้ย',
  'ก้านกล้วยหัก 1 ท่อน (ใช้แทนดาบไม่ได้)',
  'ก้างปลาทูแม่กลองเค็มปี๋',
  'ขวดน้ำเปล่าบิดเบี้ยวแต่ปิดฝาแน่น',
  'กล่องโฟมเปล่ามีเศษกะเพรา 1 ใบ'
];

export const WheelModal: React.FC<WheelModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
  onTriggerBombInGame
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [resultItem, setResultItem] = useState<{
    segment: WheelSegment;
    extraTrash?: string;
  } | null>(null);
  const [showAhMahOverlay, setShowAhMahOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<'wheel' | 'inventory'>('wheel');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTickAngleRef = useRef(0);

  const numSegments = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / numSegments;

  // Draw the Wheel onto Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    // Draw outer golden/pastel rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#C3E895';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#95D58B';
    ctx.stroke();

    // Outer decorative dots
    const totalDots = 24;
    for (let i = 0; i < totalDots; i++) {
      const angle = (i * 2 * Math.PI) / totalDots;
      const dotX = centerX + (radius + 4) * Math.cos(angle);
      const dotY = centerY + (radius + 4) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#B7E658';
      ctx.fill();
    }
    ctx.restore();

    // Draw segments
    WHEEL_SEGMENTS.forEach((segment, i) => {
      const startAngle = (i * segmentAngle * Math.PI) / 180;
      const endAngle = ((i + 1) * segmentAngle * Math.PI) / 180;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Text and Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segmentAngle * Math.PI) / 360);
      ctx.textAlign = 'right';
      ctx.fillStyle = segment.textColor;
      ctx.font = 'bold 15px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 3;

      // Draw Icon + Short Label
      const displayText = `${segment.icon} ${segment.shortLabel}`;
      ctx.fillText(displayText, radius - 18, 5);
      ctx.restore();

      ctx.restore();
    });

    // Draw Center Circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#95D58B';
    ctx.stroke();

    // Inner icon
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '22px sans-serif';
    ctx.fillText('🎯', centerX, centerY);
    ctx.restore();
  }, [segmentAngle]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Spin handler
  const handleSpin = () => {
    if (isSpinning) return;

    const currentPoints = profile.points ?? 0;
    if (currentPoints < SPIN_COST) {
      soundManager.playWhack('normal');
      return;
    }

    // Deduct spin points
    onUpdateProfile((prev) => ({
      ...prev,
      points: Math.max(0, (prev.points ?? 0) - SPIN_COST)
    }));

    setIsSpinning(true);
    setResultItem(null);
    setShowAhMahOverlay(false);

    // Pick target segment randomly
    const targetIndex = Math.floor(Math.random() * numSegments);
    const targetSegment = WHEEL_SEGMENTS[targetIndex];

    // Compute rotation angle
    // Top pointer is at 270 degrees (or -90 deg). We want targetSegment center under pointer.
    // In our drawing, segment 0 starts at angle 0.
    // Pointer is at the top (angle 270° in canvas coords or 0° straight up if rotated).
    // Let's align pointer at top (12 o'clock = 270 deg in canvas math).
    const targetSegmentCenterDeg = targetIndex * segmentAngle + segmentAngle / 2;
    // To bring targetSegmentCenterDeg to 270° (top):
    const currentModulo = rotationAngle % 360;
    const extraRounds = 360 * (5 + Math.floor(Math.random() * 3)); // 5-7 full spins
    const finalAngle =
      rotationAngle -
      currentModulo +
      extraRounds +
      (270 - targetSegmentCenterDeg) +
      (Math.random() * 10 - 5); // slight jitter

    const startTime = performance.now();
    const duration = 4000; // 4 seconds spin
    const startAngle = rotationAngle;

    lastTickAngleRef.current = startAngle;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAng = startAngle + (finalAngle - startAngle) * easeOut;
      setRotationAngle(currentAng);

      // Play tick sound every segment pass
      if (Math.abs(currentAng - lastTickAngleRef.current) >= segmentAngle * 0.7) {
        soundManager.playTick();
        lastTickAngleRef.current = currentAng;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        setRotationAngle(finalAngle);

        // Apply reward
        handleReward(targetSegment);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  // Apply Reward
  const handleReward = (segment: WheelSegment) => {
    let extraTrashName = '';

    if (segment.type === 'bomb') {
      const count = segment.amount || 1;
      soundManager.playBomb();
      onUpdateProfile((prev) => ({
        ...prev,
        bombsCount: (prev.bombsCount ?? 0) + count
      }));
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else if (segment.type === 'coins') {
      const amount = segment.amount || 500;
      soundManager.playCoin();
      onUpdateProfile((prev) => ({
        ...prev,
        coins: prev.coins + amount
      }));
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 }
      });
    } else if (segment.type === 'points') {
      const pts = segment.amount || 2000;
      soundManager.playLevelUp();
      onUpdateProfile((prev) => ({
        ...prev,
        points: (prev.points ?? 0) + pts
      }));
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 }
      });
    } else if (segment.type === 'trash') {
      soundManager.playWhack('normal');
      const randomTrash = FUNNY_TRASH_LIST[Math.floor(Math.random() * FUNNY_TRASH_LIST.length)];
      extraTrashName = randomTrash;
      onUpdateProfile((prev) => ({
        ...prev,
        trashItems: [...(prev.trashItems ?? []), randomTrash]
      }));
    } else if (segment.type === 'ahmah') {
      soundManager.playAhmah();
      setShowAhMahOverlay(true);
      const bonusCoins = segment.amount || 800;
      onUpdateProfile((prev) => ({
        ...prev,
        coins: prev.coins + bonusCoins,
        ahmahCount: (prev.ahmahCount ?? 0) + 1
      }));
      confetti({
        particleCount: 120,
        spread: 120,
        origin: { y: 0.4 }
      });
    }

    setResultItem({
      segment,
      extraTrash: extraTrashName
    });
  };

  const currentPoints = profile.points ?? 0;
  const currentBombs = profile.bombsCount ?? 0;
  const trashItems = profile.trashItems ?? [];
  const ahmahCount = profile.ahmahCount ?? 0;

  return (
    <div className="bg-white/95 rounded-3xl border-2 border-emerald-200/80 p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] flex items-center justify-center text-xl shadow-md border border-[#C3E895]">
            🎡
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-emerald-950 flex items-center gap-2">
              วงล้อดิว้า เสี่ยงโชคตูดระเบิด
              <span className="text-xs bg-[#D1EBA0] text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-[#95D58B]">
                ชั่ยคร๊าฟ
              </span>
            </h2>
            <p className="text-xs text-emerald-700 font-medium">
              เอาคะแนนไปหมุนวงล้อได้ว่าจะได้ไอเทมอะไร ระเบิดได้เงิน ได้คะแนน ได้ขยะ ได้อาม่า ดิว้า!
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-emerald-50 p-1 rounded-xl border border-emerald-200/60">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'wheel'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-emerald-700 hover:text-emerald-950'
            }`}
          >
            🎡 หมุนวงล้อ
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'inventory'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-emerald-700 hover:text-emerald-950'
            }`}
          >
            🎒 คลังไอเทม ({currentBombs + trashItems.length})
          </button>
        </div>
      </div>

      {/* Profile Resource Quick Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-2.5 flex items-center gap-2.5">
          <span className="text-2xl">⭐</span>
          <div>
            <div className="text-[10px] text-purple-700 font-bold">คะแนนสะสม (สำหรับหมุน)</div>
            <div className="text-sm sm:text-base font-black text-purple-900 font-mono">
              {currentPoints.toLocaleString()} <span className="text-xs">แต้ม</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-2.5 flex items-center gap-2.5">
          <span className="text-2xl">💰</span>
          <div>
            <div className="text-[10px] text-amber-700 font-bold">เหรียญทอง</div>
            <div className="text-sm sm:text-base font-black text-amber-900 font-mono">
              {profile.coins.toLocaleString()} <span className="text-xs">เหรียญ</span>
            </div>
          </div>
        </div>

        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-2.5 flex items-center gap-2.5">
          <span className="text-2xl">💣</span>
          <div>
            <div className="text-[10px] text-rose-700 font-bold">ระเบิดในคลัง (กด [B] ในเกม)</div>
            <div className="text-sm sm:text-base font-black text-rose-900 font-mono">
              {currentBombs} <span className="text-xs">ลูก</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-2.5 flex items-center gap-2.5">
          <span className="text-2xl">👵</span>
          <div>
            <div className="text-[10px] text-emerald-700 font-bold">อาม่ามาเยือนสะสม</div>
            <div className="text-sm sm:text-base font-black text-emerald-900 font-mono">
              {ahmahCount} <span className="text-xs">ครั้ง</span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'wheel' ? (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-2">
          {/* Wheel Graphic Container */}
          <div className="relative flex flex-col items-center">
            {/* Pointer at the top (12 o'clock) pointing DOWN */}
            <div className="absolute -top-3 z-20 flex flex-col items-center drop-shadow-md">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 -mt-7 border-2 border-white"></div>
            </div>

            {/* Rotating Canvas */}
            <div className="p-2 rounded-full bg-gradient-to-tr from-[#95D58B] via-emerald-100 to-[#B4E578] shadow-2xl border-4 border-white">
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="rounded-full shadow-inner transition-transform duration-75"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />
            </div>

            {/* Spin Button */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={handleSpin}
                disabled={isSpinning || currentPoints < SPIN_COST}
                className={`px-8 py-3.5 rounded-2xl font-black text-base sm:text-lg flex items-center gap-2.5 transition-all shadow-lg active:scale-95 ${
                  isSpinning
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : currentPoints < SPIN_COST
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 text-white hover:brightness-105 hover:shadow-emerald-500/30 border-2 border-emerald-300'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning
                  ? 'กำลังหมุนลุ้นระเบิดดิว้า...'
                  : currentPoints < SPIN_COST
                  ? `คะแนนไม่พอ (ต้องการ ${SPIN_COST} แต้ม)`
                  : `หมุนวงล้อดิว้า (${SPIN_COST} แต้ม)`}
              </button>

              <p className="text-[11px] text-emerald-800/80 font-medium mt-1.5">
                {currentPoints < SPIN_COST
                  ? 'อะไรว้า แต้มหมด! ไปทุบแชงเบี้ยในโหมดคลาสสิกหรือเล่นโหมดเพลงเพื่อหาแต้มดิว้า ชั่ยคร๊าฟ'
                  : 'กดหมุนแล้วรอลุ้นว่าจะได้ระเบิด ได้เงิน ได้คะแนน ได้ขยะ หรือได้อาม่า ชั่ยคร๊าฟ!'}
              </p>
            </div>
          </div>

          {/* Outcome & Rewards Display Side Panel */}
          <div className="flex-1 w-full max-w-md flex flex-col gap-3">
            {/* Latest Result Banner */}
            {resultItem ? (
              <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-4xl animate-bounce">{resultItem.segment.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-700">
                      ผลลัพธ์รอบนี้: {resultItem.segment.title}
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-950">
                      {resultItem.segment.shortLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 text-xs text-slate-700 bg-white/90 p-2.5 rounded-xl border border-emerald-100 font-medium">
                  {resultItem.segment.subText}
                  {resultItem.extraTrash && (
                    <div className="mt-1.5 text-amber-800 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      🗑️ ขยะที่ได้รับ: "{resultItem.extraTrash}" (อะไรว้า ชั่ยคร๊าฟ!)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/50 border border-dashed border-emerald-200 rounded-2xl p-4 text-center">
                <span className="text-3xl">🎁</span>
                <h4 className="text-sm font-bold text-emerald-900 mt-1">
                  กดปุ่มหมุนเพื่อลุ้นไอเทมดิว้า!
                </h4>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  ระเบิดได้เงิน ได้คะแนน ได้ขยะ ได้อาม่า ลุ้นกันสดๆ ชั่ยคร๊าฟ
                </p>
              </div>
            )}

            {/* List of possible rewards description */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-3 shadow-2xs">
              <h4 className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ของรางวัลในวงล้อดิว้า (มีอะไรบ้างว้า):
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 bg-rose-50/60 rounded-lg border border-rose-100">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    💣 ระเบิดบึ้มแชงเบี้ย
                  </span>
                  <span className="text-rose-700 text-[11px]">สะสมลูกระเบิด กดใช้ระเบิดทั้งกระดาน</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-amber-50/60 rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    💰 ได้เงิน 500 - 1,000
                  </span>
                  <span className="text-amber-700 text-[11px]">เหรียญทอง เอาไปซื้อค้อนอัปเวล</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    ⭐ ได้คะแนน 2,000 แต้ม
                  </span>
                  <span className="text-emerald-700 text-[11px]">แจ็กพอตแต้มสะสม หมุนต่อได้ยาวๆ</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-slate-100/70 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    🗑️ ได้ขยะ
                  </span>
                  <span className="text-slate-600 text-[11px]">ของไร้สาระดิว้า อะไรว้า ชั่ยคร๊าฟ</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-pink-50/70 rounded-lg border border-pink-200">
                  <span className="font-bold text-pink-900 flex items-center gap-1.5">
                    👵 ได้อาม่า
                  </span>
                  <span className="text-pink-700 text-[11px]">อาม่าแจกอั่งเปา +800 และบัฟพิเศษ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Inventory / Junk Showcase Tab */
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bombs Shelf */}
            <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                  <Bomb className="w-4 h-4 text-rose-500" />
                  คลังลูกระเบิด ({currentBombs} ลูก)
                </h3>
                {onTriggerBombInGame && currentBombs > 0 && (
                  <button
                    onClick={() => {
                      if (currentBombs > 0) {
                        onUpdateProfile((prev) => ({
                          ...prev,
                          bombsCount: Math.max(0, (prev.bombsCount ?? 0) - 1)
                        }));
                        soundManager.playBomb();
                        onTriggerBombInGame();
                      }
                    }}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-xl shadow-xs transition-colors flex items-center gap-1"
                  >
                    💥 จุดระเบิดทดสอบ
                  </button>
                )}
              </div>
              <p className="text-xs text-rose-700 mb-3">
                ระเบิดที่ได้จากวงล้อดิว้า สามารถนำไปกดปุ่มระเบิดในเกม หรือกดปุ่ม [B] เพื่อบึ้มตัวแชงเบี้ยทั้งหมดในกระดานทันที ชั่ยคร๊าฟ!
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.min(24, currentBombs) }).map((_, i) => (
                  <span
                    key={i}
                    className="text-2xl p-1.5 bg-white rounded-xl border border-rose-200 shadow-2xs animate-pulse"
                    title={`ระเบิดลูกที่ ${i + 1}`}
                  >
                    💣
                  </span>
                ))}
                {currentBombs === 0 && (
                  <div className="text-xs text-rose-500 italic p-3 bg-white/60 rounded-xl w-full text-center">
                    ยังไม่มีระเบิดอะไรว้า! ไปหมุนวงล้อดิว้า ชั่ยคร๊าฟ
                  </div>
                )}
              </div>
            </div>

            {/* Ah-Mah Blessings */}
            <div className="bg-pink-50/70 border-2 border-pink-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-pink-900 flex items-center gap-1.5 mb-2">
                <span className="text-lg">👵</span>
                ศาลอาม่าประจำสังเวียน (อาม่ามา {ahmahCount} ครั้ง)
              </h3>
              <p className="text-xs text-pink-700 mb-3">
                เมื่อหมุนได้อาม่า อาม่าจะด่าแชงเบี้ยให้ตูดระเบิดดิว้า! พร้อมแจกอั่งเปาเหรียญทองฟรี 800 เหรียญ ชั่ยคร๊าฟ
              </p>
              <div className="p-3 bg-white rounded-xl border border-pink-200 text-xs text-pink-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-pink-950">
                  <span>🧧</span> คำสอนอาม่า: "ลื้อฟาดแชงเบี้ยให้ไวๆ หน่อยสิว้า! อย่ามัวแต่อู้ ชั่ยคร๊าฟ"
                </div>
                <div>ได้รับเหรียญอั่งเปาสะสมจากอาม่าแล้ว: <b>{(ahmahCount * 800).toLocaleString()}</b> เหรียญ</div>
              </div>
            </div>
          </div>

          {/* Junk Collection / Trash Showcase */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <Trash2 className="w-4 h-4 text-slate-500" />
              ตู้โชว์ขยะที่หมุนได้ ({trashItems.length} ชิ้น)
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              หมุนวงล้อแล้วดวงกุดได้ขยะอะไรว้า! สะสมไว้ดูเล่นดิว้า ชั่ยคร๊าฟ
            </p>

            {trashItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {trashItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 text-xs text-slate-700"
                  >
                    <span className="text-xl">🗑️</span>
                    <span className="font-medium line-clamp-2">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                ยังไม่มีขยะในคลังเลยดิว้า! หมุนวงล้อดูสิว้า อาจจะได้รองเท้าแตะขาด ชั่ยคร๊าฟ
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ah-Mah Special Pop-up Overlay */}
      {showAhMahOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-rose-50 via-white to-pink-50 border-4 border-pink-400 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative">
            <button
              onClick={() => setShowAhMahOverlay(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-lg"
            >
              ✕
            </button>
            <div className="text-6xl animate-bounce mb-2">👵💥🧹</div>
            <h3 className="text-xl font-black text-rose-950">
              อาม่ามาแล้วดิว้า!
            </h3>
            <div className="inline-block bg-pink-100 text-pink-800 text-xs font-bold px-2.5 py-1 rounded-full border border-pink-300 mt-1 mb-3">
              ลื้อทำอะไรว้า! ชั่ยคร๊าฟ
            </div>
            <p className="text-xs text-slate-700 bg-white/90 p-3 rounded-2xl border border-pink-200 text-left font-medium leading-relaxed">
              "อาม่าเห็นลื้อฟาดแชงเบี้ยแล้วมันไม่ได้ดั่งใจดิว้า! เอาไม้เรียวอาม่าไปฟาดให้ตูดระเบิดไปเลย ชั่ยคร๊าฟ! อาม่าให้อั่งเปา 800 เหรียญทอง รีบเอาไปซื้อค้อนใหม่เดี๋ยวนี้!"
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowAhMahOverlay(false)}
                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black rounded-xl shadow-md hover:brightness-105 active:scale-95 transition-all text-sm"
              >
                กราบขอบพระคุณอาม่าดิว้า ชั่ยคร๊าฟ! 🧧
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
