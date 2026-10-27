import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, UserProfile } from '../types/game';
import { Trophy, Medal, Sparkles, RefreshCw, Flame, Music, Gamepad2, Users, Shield } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface OnlineLeaderboardProps {
  profile: UserProfile;
}

export const OnlineLeaderboard: React.FC<OnlineLeaderboardProps> = ({ profile }) => {
  const [activeMode, setActiveMode] = useState<'classic' | 'rhythm'>('classic');
  const [classicList, setClassicList] = useState<LeaderboardEntry[]>([]);
  const [rhythmList, setRhythmList] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLeaderboard = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (data.classic) setClassicList(data.classic);
        if (data.rhythm) setRhythmList(data.rhythm);
      }
    } catch (err) {
      console.warn('Failed to fetch online leaderboard', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Auto-update on SSE stream events
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/chat/stream');
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'init' && payload.leaderboard) {
            if (payload.leaderboard.classic) setClassicList(payload.leaderboard.classic);
            if (payload.leaderboard.rhythm) setRhythmList(payload.leaderboard.rhythm);
          } else if (payload.type === 'leaderboard_updated') {
            fetchLeaderboard();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  // Strictly real human players only (no bots allowed in leaderboard!)
  const rawList = activeMode === 'classic' ? classicList : rhythmList;
  const currentList = rawList.filter(
    (item) =>
      Boolean(item.username) &&
      !item.username.toLowerCase().includes('bot') &&
      !item.username.includes('🤖') &&
      !item.username.startsWith('[BOT]')
  );
  const topThree = currentList.slice(0, 3);
  const restList = currentList.slice(3);

  // User's own entry in this list
  const userRankIndex = currentList.findIndex(
    (item) => item.username.toLowerCase() === profile.username.toLowerCase()
  );
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white p-5 sm:p-6 rounded-3xl shadow-lg shadow-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-xl">
              <Trophy className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>สถิติเฉพาะคนจริงๆ เท่านั้น 100% (ไม่มีบอท)</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">สถิติผู้เล่นที่ทำได้เยอะสุด (Online Ranking)</h2>
          <p className="text-xs sm:text-sm text-amber-50 mt-1 max-w-md">
            แสดงเฉพาะสถิติของคนจริงๆ ที่เข้ามาเล่นเท่านั้น ไม่มีระบบบอทปั๊มคะแนนหรือจำลองสถิติใดๆ ทั้งสิ้น ใครอยู่อันดับ 1 คือเทพเจ้าแห่งสังเวียนตัวจริง ชั่ยคร๊าฟ!
          </p>
        </div>

        {/* Live sync status & refresh */}
        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/25">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span>ออนไลน์สด</span>
          </div>
          <button
            onClick={() => {
              soundManager.playCoin();
              fetchLeaderboard();
            }}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-all cursor-pointer active:scale-95"
            title="รีเฟรชอันดับสถิติ"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => {
            soundManager.playCoin();
            setActiveMode('classic');
          }}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeMode === 'classic'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-102'
              : 'bg-white text-slate-700 hover:bg-emerald-50 border border-emerald-100'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>โหมดคลาสสิก (Whack-a-Mole)</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            {classicList.length} คน
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playCoin();
            setActiveMode('rhythm');
          }}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeMode === 'rhythm'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-102'
              : 'bg-white text-slate-700 hover:bg-purple-50 border border-purple-100'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>โหมดเพลง YouTube (Rhythm)</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            {rhythmList.length} คน
          </span>
        </button>
      </div>

      {/* User's Current Standing Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-3xl border-2 border-emerald-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
            {userRank ? `#${userRank}` : '―'}
          </div>
          <div>
            <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <span>อันดับของคุณ:</span>
              <span className="font-bold">{profile.username}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full border border-emerald-300">
                Lv. {profile.level}
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-800">
              {userRank
                ? `ติดอันดับที่ ${userRank} ของสังเวียนออนไลน์ดิว้า!`
                : 'ยังไม่ติดอันดับ เล่นจบเพื่อส่งสถิติเข้าสังเวียนดิว้า!'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-medium">คะแนนสูงสุดของคุณ</div>
          <div className="text-base sm:text-lg font-black text-emerald-700 font-mono">
            {profile.highestScore.toLocaleString()} แต้ม
          </div>
          <div className="text-[10px] text-slate-400">
            คอมโบสูงสุด: {profile.highestCombo} Hit
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Rank 2 (Silver) */}
          {topThree[1] && (
            <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-100 to-white p-4 rounded-3xl border-2 border-slate-300 shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-2 left-2 text-xs font-black bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300">
                🥈 อันดับ 2
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 border-2 border-slate-400 flex items-center justify-center text-3xl shadow-inner my-2">
                🥈
              </div>
              <h3 className="font-bold text-slate-900 text-sm truncate max-w-[160px]">
                {topThree[1].username}
              </h3>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                {topThree[1].hammerName || 'อาวุธระดับเทพ'}
              </div>
              <div className="text-lg font-black text-slate-800 font-mono mt-2">
                {topThree[1].score.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                คอมโบ {topThree[1].maxCombo} Hit
              </div>
            </div>
          )}

          {/* Rank 1 (Gold Champion) */}
          {topThree[0] && (
            <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-100 via-yellow-50 to-white p-5 rounded-3xl border-3 border-amber-400 shadow-xl shadow-amber-500/15 flex flex-col items-center text-center relative overflow-hidden sm:-translate-y-2">
              <div className="absolute top-2 left-2 text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <span>👑 แชมป์อันดับ 1</span>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-300 to-orange-400 border-3 border-amber-400 flex items-center justify-center text-4xl shadow-lg my-2 animate-bounce">
                🥇
              </div>
              <h3 className="font-black text-slate-950 text-base sm:text-lg truncate max-w-[180px]">
                {topThree[0].username}
              </h3>
              <div className="text-xs text-amber-900 font-semibold mt-0.5 truncate max-w-[180px]">
                {topThree[0].badgeName || 'ป้ายแชงเบี้ยสูญพันธุ์'}
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono mt-2">
                {topThree[0].score.toLocaleString()} แต้ม
              </div>
              <div className="text-xs text-amber-900 font-bold bg-amber-200/70 px-3 py-1 rounded-full mt-1.5 border border-amber-300">
                🔥 สูงสุด {topThree[0].maxCombo} คอมโบดิว้า!
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] && (
            <div className="order-3 bg-gradient-to-b from-amber-50 to-white p-4 rounded-3xl border-2 border-amber-300 shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-2 left-2 text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                🥉 อันดับ 3
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-200 to-orange-100 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-inner my-2">
                🥉
              </div>
              <h3 className="font-bold text-slate-900 text-sm truncate max-w-[160px]">
                {topThree[2].username}
              </h3>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                {topThree[2].hammerName || 'อาวุธประจำตัว'}
              </div>
              <div className="text-lg font-black text-slate-800 font-mono mt-2">
                {topThree[2].score.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                คอมโบ {topThree[2].maxCombo} Hit
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Rankings List Table */}
      <div className="bg-white/95 rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>ตารางอันดับสถิติออนไลน์</span>
          <span>คะแนน / คอมโบ</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {currentList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              ยังไม่มีสถิติในหมวดนี้ เล่นจบเพื่อเป็นผู้บุกเบิกคนแรกดิว้า!
            </div>
          ) : (
            currentList.map((entry, idx) => {
              const isCurrentUser = entry.username.toLowerCase() === profile.username.toLowerCase();
              const rankNum = idx + 1;

              return (
                <div
                  key={entry.id || idx}
                  className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                    isCurrentUser ? 'bg-emerald-50/80 font-bold' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                        rankNum === 1
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : rankNum === 2
                          ? 'bg-slate-300 text-slate-800'
                          : rankNum === 3
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rankNum}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {entry.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.2 rounded-md font-bold">
                            คุณ
                          </span>
                        )}
                        {entry.badgeName && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded-md border border-slate-200 hidden sm:inline">
                            {entry.badgeName}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {entry.hammerName && <span>⚔️ {entry.hammerName}</span>}
                        {entry.molesWhacked !== undefined && entry.molesWhacked > 0 && (
                          <span>• ทุบ {entry.molesWhacked} ตัว</span>
                        )}
                        <span>• {entry.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black font-mono text-emerald-800">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      คอมโบ {entry.maxCombo} Hit
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
