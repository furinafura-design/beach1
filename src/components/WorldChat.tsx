import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BADGES_LIST } from '../utils/constants';
import { loadChatMessages, saveChatMessages } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { ChatMessage, UserProfile } from '../types/game';
import { MessageSquare, Send, Users, Smile, Wifi, RefreshCw } from 'lucide-react';

interface WorldChatProps {
  profile: UserProfile;
}

export const WorldChat: React.FC<WorldChatProps> = ({ profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages());
  const [inputVal, setInputVal] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const equippedBadge =
    BADGES_LIST.find((b) => b.id === profile.equippedBadgeId) || BADGES_LIST[0];

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to SSE endpoint for real-time global online chat
  useEffect(() => {
    let isMounted = true;

    // Fetch initial chat history
    fetch('/api/chat/messages')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.onlineCount !== undefined) {
          setOnlineCount(Math.max(1, data.onlineCount));
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const formatted: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id || Math.random().toString(),
            sender: m.sender,
            badgeName: m.badgeName,
            badgeGradient: m.badgeGradient,
            badgeColor: m.badgeColor,
            text: m.text,
            timestamp: m.timestamp,
            isSelf: m.sender === profile.username
          }));
          setMessages(formatted);
          saveChatMessages(formatted);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch initial chat messages, using offline cache', err);
      });

    // Establish Server-Sent Events stream
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/chat/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'init') {
            if (payload.onlineCount !== undefined) {
              setOnlineCount(Math.max(1, payload.onlineCount));
            }
            if (Array.isArray(payload.messages)) {
              const formatted: ChatMessage[] = payload.messages.map((m: any) => ({
                id: m.id || Math.random().toString(),
                sender: m.sender,
                badgeName: m.badgeName,
                badgeGradient: m.badgeGradient,
                badgeColor: m.badgeColor,
                text: m.text,
                timestamp: m.timestamp,
                isSelf: m.sender === profile.username
              }));
              setMessages(formatted);
              saveChatMessages(formatted);
            }
          } else if (payload.type === 'online_count') {
            if (payload.onlineCount !== undefined) {
              setOnlineCount(Math.max(1, payload.onlineCount));
            }
          } else if (payload.type === 'new_message' && payload.message) {
            const m = payload.message;
            const newMsg: ChatMessage = {
              id: m.id || Math.random().toString(),
              sender: m.sender,
              badgeName: m.badgeName,
              badgeGradient: m.badgeGradient,
              badgeColor: m.badgeColor,
              text: m.text,
              timestamp: m.timestamp,
              isSelf: m.sender === profile.username
            };

            setMessages((prev) => {
              // Avoid duplicate if same id exists
              if (prev.some((existing) => existing.id === newMsg.id)) {
                return prev;
              }
              const updated = [...prev, newMsg];
              saveChatMessages(updated);
              return updated;
            });
          }
        } catch (e) {
          console.error('Failed to parse SSE payload', e);
        }
      };

      es.onerror = () => {
        if (isMounted) setIsConnected(false);
      };
    } catch (e) {
      console.warn('EventSource connection error:', e);
    }

    return () => {
      isMounted = false;
      if (es) {
        es.close();
      }
    };
  }, [profile.username]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isSending) return;

    soundManager.playWhack('normal');
    setIsSending(true);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;

    const messagePayload = {
      sender: profile.username,
      badgeName: equippedBadge.name,
      badgeGradient: equippedBadge.bgGradient,
      badgeColor: equippedBadge.textColor,
      text: trimmed,
      timestamp: timeStr
    };

    setInputVal('');

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });

      if (!res.ok) {
        throw new Error('Failed to broadcast message');
      }
    } catch (err) {
      console.warn('Chat send network fallback to local state:', err);
      // Fallback local update if network is momentarily disconnected
      const fallbackMsg: ChatMessage = {
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
        const updated = [...prev, fallbackMsg];
        saveChatMessages(updated);
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReaction = (reaction: string) => {
    setInputVal((prev) => prev + reaction);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[75vh] sm:h-[680px] bg-white/95 rounded-3xl border-2 border-[#95D58B] shadow-lg shadow-[#95D58B]/10 overflow-hidden">
      {/* Chat Room Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#95D58B] via-[#B4E578] to-[#B7E658] border border-[#95D58B] flex items-center justify-center text-emerald-950 shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>แชทโลกสังเวียนตีแชงเบี้ย</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              ผู้เล่นจริงทุกคนสามารถสื่อสารและพิมพ์คุยกันได้แบบออนไลน์สด ดิว้า! อะไรว้า ชั่ยคร๊าฟ
            </p>
          </div>
        </div>

        {/* Real Online Players Counter Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-white px-3.5 py-1.5 rounded-xl border-2 border-[#95D58B] shadow-xs">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="font-extrabold">ผู้เล่นออนไลน์จริง: {onlineCount} คน</span>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fbf9]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <MessageSquare className="w-12 h-12 text-[#95D58B] mb-2 opacity-60" />
            <h4 className="font-bold text-slate-700 text-sm">ยังไม่มีข้อความในห้องแชท</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              พิมพ์ส่งข้อความคุยกับผู้เล่นคนจริงที่ออนไลน์อยู่ตอนนี้ได้เลยดิว้า! ชั่ยคร๊าฟ
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.isSelf || msg.sender === profile.username;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-full`}
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
                    isSelf
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md shadow-emerald-600/15'
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
          <Smile className="w-3.5 h-3.5 text-emerald-600" /> อีโมจิดิว้า:
        </span>
        {['🔨', '🔥', '🐯', '⚡', '🎉', '🌶️', '👑', '🤣', '💥', 'ดิว้า!', 'ชั่ยคร๊าฟ'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 transition-colors flex-shrink-0 cursor-pointer font-medium text-slate-700"
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
          placeholder={`พิมพ์ข้อความสื่อสารออนไลน์ในนาม [${profile.username}]...`}
          maxLength={150}
          className="flex-1 bg-slate-50 border border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isSending}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            inputVal.trim() && !isSending
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{isSending ? 'กำลังส่ง...' : 'ส่ง'}</span>
        </button>
      </form>
    </div>
  );
};
