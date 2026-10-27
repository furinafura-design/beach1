import React from 'react';
import { AVAILABLE_HAMMERS } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Hammer, HammerId, UserProfile } from '../types/game';
import { ShoppingBag, Zap, Check, Gauge, Coins, Sparkles, ShieldCheck } from 'lucide-react';

interface ShopModalProps {
  profile: UserProfile;
  onUpdateProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  onOpenWheel?: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ profile, onUpdateProfile, onOpenWheel }) => {
  // Speed upgrade cost calculation: base 100 * level
  const nextSpeedCost = profile.hammerSpeedLevel * 120;
  const isMaxSpeed = profile.hammerSpeedLevel >= 10;
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Buy Hammer
  const handleBuyHammer = (hammer: Hammer) => {
    if (profile.coins < hammer.price) {
      setErrorMessage(`เหรียญไม่พอดิว้า! อะไรว้า มีแค่ ${profile.coins} เหรียญ แต่ค้อนนี้ราคา ${hammer.price} เหรียญ ชั่ยคร๊าฟ`);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    soundManager.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      coins: prev.coins - hammer.price,
      ownedHammerIds: [...prev.ownedHammerIds, hammer.id],
      equippedHammerId: hammer.id
    }));
  };

  // Equip Hammer
  const handleEquipHammer = (hammerId: HammerId) => {
    soundManager.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      equippedHammerId: hammerId
    }));
  };

  // Upgrade Hammer Speed
  const handleUpgradeSpeed = () => {
    if (isMaxSpeed) return;
    if (profile.coins < nextSpeedCost) {
      setErrorMessage(`เหรียญไม่พอดิว้า! อะไรว้า ต้องการ ${nextSpeedCost} เหรียญเพื่ออัปเกรดความเร็ว ชั่ยคร๊าฟ`);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    soundManager.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      coins: prev.coins - nextSpeedCost,
      hammerSpeedLevel: prev.hammerSpeedLevel + 1
    }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Shop Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white p-5 sm:p-6 rounded-3xl shadow-lg shadow-emerald-600/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              คลังอาวุธและช่างตีเหล็กดิว้า
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">ร้านค้าค้อนและโรงอัปเกรด</h2>
          <p className="text-xs sm:text-sm text-emerald-50 mt-1 max-w-md">
            ซื้อค้อนไปฟาดแชงเบี้ยให้ตูดระเบิดดิว้า! อะไรว้า ชั่ยคร๊าฟ ยิ่งอัปค้อนยิ่งปลดล็อกสกิลเทพ
          </p>
        </div>

        {/* User Balance Display */}
        <div className="flex items-center gap-2">
          <div className="bg-white/15 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/25 flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-yellow-300 animate-pulse" />
            <div>
              <div className="text-[10px] text-emerald-100 font-medium">เหรียญทอง</div>
              <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">
                {profile.coins.toLocaleString()}
              </div>
            </div>
          </div>

          {onOpenWheel && (
            <button
              onClick={onOpenWheel}
              className="bg-purple-600/80 hover:bg-purple-600 border border-purple-300 text-white p-2.5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-md active:scale-95"
              title="หมุนวงล้อดิว้า"
            >
              <span className="text-xl">🎡</span>
              <span className="text-[10px] font-bold">วงล้อ</span>
            </button>
          )}
        </div>
      </div>

      {/* Error / Alert Message */}
      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-3 rounded-2xl text-xs font-bold animate-in fade-in flex items-center gap-2 shadow-xs">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Speed Upgrade Station Card */}
      <div className="bg-white/95 p-5 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-xs">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                อัปเกรดความเร็วค้อน (Hammer Speed)
                <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-mono font-bold">
                  Lv. {profile.hammerSpeedLevel} / 10
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ช่วยให้ค้อนเหวี่ยงได้รวดเร็วขึ้น เพิ่มความแม่นยำในการทุบ และลดดีเลย์การคลิก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isMaxSpeed ? (
              <span className="px-4 py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300">
                ⭐ เลเวลสูงสุดแล้ว
              </span>
            ) : (
              <button
                onClick={handleUpgradeSpeed}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                อัปเกรด ({nextSpeedCost.toLocaleString()} 🪙)
              </button>
            )}
          </div>
        </div>

        {/* Speed Level Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(profile.hammerSpeedLevel / 10) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>ระดับ 1 (ปกติ)</span>
            <span className="font-semibold text-emerald-700">ความเร็วทุบ: +{((profile.hammerSpeedLevel - 1) * 10)}%</span>
            <span>ระดับ 10 (สูงสุด)</span>
          </div>
        </div>

        {/* Milestone Unlocks per Level */}
        <div className="mt-4 pt-3 border-t border-emerald-100">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> สกิลพิเศษที่ปลดล็อกตามเลเวลค้อน (กด [F] หรือปุ่มหน้าจอ):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Lv 2: Proc */}
            <div className={`p-2.5 rounded-xl border text-xs transition-all ${
              profile.hammerSpeedLevel >= 2
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px]">🎲 สุ่มสกิลเสริม</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  profile.hammerSpeedLevel >= 2 ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  Lv.2
                </span>
              </div>
              <p className="text-[10px] leading-tight opacity-90">
                โอกาส 25% ตีแล้วสุ่มแจกแต้ม/เหรียญโบนัสทันที
              </p>
            </div>

            {/* Lv 4: Bomb */}
            <div className={`p-2.5 rounded-xl border text-xs transition-all ${
              profile.hammerSpeedLevel >= 4
                ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px]">💣 สกิลระเบิด</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  profile.hammerSpeedLevel >= 4 ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  Lv.4
                </span>
              </div>
              <p className="text-[10px] leading-tight opacity-90">
                กด [F] หรือปุ่มระเบิด ทุบกวาดตุ่นทั้งโต๊ะในพริบตา
              </p>
            </div>

            {/* Lv 6: Multiplier x3 */}
            <div className={`p-2.5 rounded-xl border text-xs transition-all ${
              profile.hammerSpeedLevel >= 6
                ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px]">✨ คะแนนคูณ 3</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  profile.hammerSpeedLevel >= 6 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  Lv.6
                </span>
              </div>
              <p className="text-[10px] leading-tight opacity-90">
                กด [F] หรือปุ่มคูณ 3 คะแนนพุ่ง x3 เต็มคาราเบล
              </p>
            </div>

            {/* Lv 8: Dog Frenzy (Multi-mole in one hole) */}
            <div className={`p-2.5 rounded-xl border text-xs transition-all ${
              profile.hammerSpeedLevel >= 8
                ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px]">🐕 สกิลหมาหมู่</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  profile.hammerSpeedLevel >= 8 ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  Lv.8
                </span>
              </div>
              <p className="text-[10px] leading-tight opacity-90">
                กด [F] หรือปุ่มหมาหมู่ ตุ่นโผล่หลายตัวแออัดในรูเดียว!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hammers List */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500" /> ค้อนทั้งหมดในคอลเลกชัน
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_HAMMERS.map((hammer) => {
            const isOwned = profile.ownedHammerIds.includes(hammer.id);
            const isEquipped = profile.equippedHammerId === hammer.id;

            return (
              <div
                key={hammer.id}
                className={`p-4 sm:p-5 rounded-3xl bg-white border-2 transition-all flex flex-col justify-between ${
                  isEquipped
                    ? 'border-emerald-500 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-200'
                    : isOwned
                    ? 'border-emerald-100 hover:border-emerald-300'
                    : 'border-slate-200/80 hover:border-emerald-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-3xl shadow-xs">
                        {hammer.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{hammer.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {hammer.cooldownSeconds > 0 ? (
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-semibold">
                              คูลดาวน์ {hammer.cooldownSeconds}s
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                              ไม่มีคูลดาวน์
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEquipped && (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-xs">
                        <Check className="w-3.5 h-3.5" /> ติดตั้งอยู่
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 mb-3 leading-relaxed">
                    {hammer.description}
                  </p>

                  {/* Skill Badge */}
                  <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100 text-xs mb-4">
                    <div className="font-bold text-emerald-900 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      สกิล: {hammer.skillName}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      {hammer.skillDescription}
                    </div>
                    {hammer.cooldownSeconds > 0 && (
                      <div className="text-[10px] text-slate-400 mt-1 italic">
                        *หากติดคูลดาวน์ ค้อนจะทำหน้าที่ตีปกติ
                      </div>
                    )}
                  </div>
                </div>

                {/* Buy or Equip Action Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {!isOwned && (
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <span>ราคา:</span>
                        <span className="text-sm font-bold text-amber-600 font-mono">
                          {hammer.price.toLocaleString()} 🪙
                        </span>
                      </div>
                    )}
                  </div>

                  {isEquipped ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-default"
                    >
                      กำลังใช้งาน
                    </button>
                  ) : isOwned ? (
                    <button
                      onClick={() => handleEquipHammer(hammer.id)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      เลือกใช้งาน
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyHammer(hammer)}
                      disabled={profile.coins < hammer.price}
                      className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                        profile.coins >= hammer.price
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 cursor-pointer active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      ซื้อค้อนนี้
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
