import React, { useState, useEffect, useRef } from 'react';
import { BADGES_LIST } from '../utils/constants';
import { loadChatMessages, saveChatMessages } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { ChatMessage, UserProfile } from '../types/game';
import { MessageSquare, Send, Users, Sparkles, Smile } from 'lucide-react';

interface WorldChatProps {
  profile: UserProfile;
}

export const WorldChat: React.FC<WorldChatProps> = ({ profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages());
  const [inputVal, setInputVal] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const equippedBadge =
    BADGES_LIST.find((b) => b.id === profile.equippedBadgeId) || BADGES_LIST[0];

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    soundManager.playWhack('normal');

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: profile.username,
      badgeName: equippedBadge.name,
      badgeGradient: equippedBadge.bgGradient,
      badgeColor: equippedBadge.textColor,
      text: trimmed,
      timestamp: timeStr,
      isSelf: true
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveChatMessages(updated);
      return updated;
    });

    setInputVal('');
  };

  const handleQuickReaction = (reaction: string) => {
    setInputVal((prev) => prev + reaction);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[75vh] sm:h-[680px] bg-white/95 rounded-3xl border border-emerald-100 shadow-md overflow-hidden">
      {/* Chat Room Header */}
      <div className="px-5 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              แชทโลกนักทุบตุ่น (Global Lounge)
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </h2>
            <p className="text-xs text-slate-500">
              พูดคุย แลกเปลี่ยนเทคนิคค้อน และอวดป้ายฉายาสุดเท่
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200">
          <Users className="w-3.5 h-3.5" />
          <span className="font-semibold">ออนไลน์: 42 คน</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fbf9]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <MessageSquare className="w-12 h-12 text-emerald-300 mb-2 opacity-60" />
            <h4 className="font-bold text-slate-700 text-sm">ยังไม่มีข้อความในห้องแชท</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              พิมพ์ส่งข้อความคุยกับผู้เล่นคนจริงในห้องแชทโลกได้เลย!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'} max-w-full`}
              >
                {/* Sender Name & Badge Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-xs font-bold text-slate-700">{msg.sender}</span>
                  {msg.badgeName && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-lg border bg-gradient-to-r ${
                        msg.badgeGradient || 'from-emerald-50 to-teal-50 border-emerald-200'
                      } ${msg.badgeColor || 'text-emerald-800'}`}
                    >
                      {msg.badgeName}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[85%] sm:max-w-[70%] break-words shadow-xs leading-relaxed ${
                    msg.isSelf
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-emerald-100 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-4 py-2 bg-emerald-50/50 border-t border-emerald-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 flex-shrink-0">
          <Smile className="w-3.5 h-3.5 text-emerald-600" /> อีโมจิเร็ว:
        </span>
        {['🔨', '🔥', '🐯', '⚡', '🎉', '🌶️', '👑', '🤣'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="text-sm px-2 py-0.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 transition-colors flex-shrink-0 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Message Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-emerald-100 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`พิมพ์ข้อความในนาม [${profile.username}]...`}
          maxLength={150}
          className="flex-1 bg-slate-50 border border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            inputVal.trim()
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          ส่ง
        </button>
      </form>
    </div>
  );
};
