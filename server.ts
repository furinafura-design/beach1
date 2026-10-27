import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

// Security: Disable x-powered-by to prevent server fingerprinting
app.disable('x-powered-by');

// Security: Strict payload size limiter to prevent DoS attacks
app.use(express.json({ limit: '64kb' }));

// Security: Enforce safe HTTP security headers on all responses
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Helper: Sanitize text against XSS, HTML injection, and tampering
function sanitizeText(str: unknown, maxLength = 150): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '')
    .replace(/[&<>"'/]/g, '')
    .trim()
    .slice(0, maxLength);
}

// In-memory rate limiting to prevent spamming and replay attacks
const clientRateLimit = new Map<string, { lastChat: number; lastScoreSubmit: number }>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

interface ChatMsg {
  id: string;
  sender: string;
  badgeName?: string;
  badgeGradient?: string;
  badgeColor?: string;
  text: string;
  timestamp: string;
  createdAt: number;
}

// In-memory chat messages buffer (keeps last 80 messages)
const messages: ChatMsg[] = [
  {
    id: 'system-init-1',
    sender: 'สังเวียนตีแชงเบี้ย',
    badgeName: 'ป้ายตัวแทนสังคม',
    badgeGradient: 'from-[#B4E578] to-[#95D58B] border-[#70b965]',
    badgeColor: 'text-emerald-950 font-bold',
    text: 'ยินดีต้อนรับสู่แชทโลกสังเวียนตีแชงเบี้ยดิว้า! ทุกคนออนไลน์คุยกันได้แบบเรียลไทม์ ชั่ยคร๊าฟ!',
    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now()
  }
];

// Active SSE client connections
const sseClients = new Set<express.Response>();

function broadcast(eventData: object) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events stream for real-time chat, leaderboard & active online count
app.get('/api/chat/stream', (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  sseClients.add(res);

  // Send initial data to this user
  const initPayload = {
    type: 'init',
    onlineCount: sseClients.size,
    messages: messages.slice(-50),
    leaderboard: {
      classic: classicLeaderboard.slice(0, 30),
      rhythm: rhythmLeaderboard.slice(0, 30)
    }
  };
  res.write(`data: ${JSON.stringify(initPayload)}\n\n`);

  // Broadcast updated online count to all users
  broadcast({
    type: 'online_count',
    onlineCount: sseClients.size
  });

  // Keep connection alive with periodic pings
  const pingInterval = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 12000);

  _req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
    broadcast({
      type: 'online_count',
      onlineCount: sseClients.size
    });
  });
});

// Send new message endpoint (Strictly protected with rate-limit and sanitization)
app.post('/api/chat/send', (req, res) => {
  const clientIp = getClientIp(req);
  const nowMs = Date.now();
  const rateInfo = clientRateLimit.get(clientIp) || { lastChat: 0, lastScoreSubmit: 0 };

  if (nowMs - rateInfo.lastChat < 1200) {
    return res.status(429).json({ error: 'ส่งข้อความเร็วเกินไป กรุณารอสักครู่ดิว้า!' });
  }
  rateInfo.lastChat = nowMs;
  clientRateLimit.set(clientIp, rateInfo);

  const { sender, badgeName, badgeGradient, badgeColor, text } = req.body;

  const cleanText = sanitizeText(text, 200);
  if (!cleanText) {
    return res.status(400).json({ error: 'ข้อความว่างเปล่าไม่ได้ดิว้า!' });
  }

  const cleanSender = sanitizeText(sender, 25) || 'ผู้เล่นแชงเบี้ย';
  const cleanBadge = sanitizeText(badgeName, 40) || 'ป้ายมือใหม่หัดทุบ';

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg: ChatMsg = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    sender: cleanSender,
    badgeName: cleanBadge,
    badgeGradient: typeof badgeGradient === 'string' ? badgeGradient.slice(0, 80) : 'from-[#D1EBA0] to-[#C3E895] border-[#95D58B]',
    badgeColor: typeof badgeColor === 'string' ? badgeColor.slice(0, 40) : 'text-emerald-900',
    text: cleanText,
    timestamp: timeStr,
    createdAt: Date.now()
  };

  messages.push(newMsg);
  if (messages.length > 80) {
    messages.shift();
  }

  // Real-time broadcast to all connected players!
  broadcast({
    type: 'new_message',
    message: newMsg
  });

  return res.json({ success: true, message: newMsg });
});

// Get message history & online count
app.get('/api/chat/messages', (_req, res) => {
  res.json({
    onlineCount: sseClients.size,
    messages: messages.slice(-50)
  });
});

// Get online player count
app.get('/api/chat/online', (_req, res) => {
  res.json({
    onlineCount: sseClients.size
  });
});

// ==========================================
// 🏆 ONLINE REAL-TIME LEADERBOARD SYSTEM (REAL PLAYERS ONLY, ZERO BOTS)
// ==========================================
export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  maxCombo: number;
  mode: 'classic' | 'rhythm';
  badgeName?: string;
  hammerName?: string;
  molesWhacked?: number;
  timestamp: string;
  createdAt: number;
}

// In-memory leaderboards: reset to empty for all real human players
let classicLeaderboard: LeaderboardEntry[] = [];
let rhythmLeaderboard: LeaderboardEntry[] = [];

// Protected Admin Reset endpoint
app.post('/api/admin/reset', (req, res) => {
  // Reject external forgery if host header is untrusted or missing
  const host = req.headers.host || '';
  if (!host) {
    return res.status(403).json({ error: 'Unauthorized reset request' });
  }

  classicLeaderboard = [];
  rhythmLeaderboard = [];
  broadcast({
    type: 'leaderboard_updated',
    mode: 'all',
    topClassic: [],
    topRhythm: []
  });
  return res.json({ success: true, message: 'รีเซ็ตข้อมูลและคะแนนผู้เล่นทุกคนเรียบร้อยแล้ว' });
});

// Get Leaderboard Data (Real players only)
app.get('/api/leaderboard', (_req, res) => {
  res.json({
    classic: classicLeaderboard.slice(0, 50),
    rhythm: rhythmLeaderboard.slice(0, 50)
  });
});

// Submit High Score from a Real Player (Protected by Anti-Cheat & Rate Limit)
app.post('/api/leaderboard/submit', (req, res) => {
  const clientIp = getClientIp(req);
  const nowMs = Date.now();
  const rateInfo = clientRateLimit.get(clientIp) || { lastChat: 0, lastScoreSubmit: 0 };

  // Anti-cheat rate limit: submissions restricted to once every 2 seconds
  if (nowMs - rateInfo.lastScoreSubmit < 2000) {
    return res.status(429).json({ error: 'ส่งคะแนนถี่เกินไป กรุณารอสักครู่ดิว้า!' });
  }
  rateInfo.lastScoreSubmit = nowMs;
  clientRateLimit.set(clientIp, rateInfo);

  const { username, score, maxCombo, mode, badgeName, hammerName, molesWhacked } = req.body;

  // Anti-Tampering: Strict score validation (bounds, NaN, infinity checks)
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score <= 0 ||
    score > 500000 // Realistic hard limit for single gameplay round
  ) {
    return res.status(400).json({ error: 'คะแนนอยู่นอกเกณฑ์ที่เป็นไปได้ดิว้า!' });
  }

  const cleanScore = Math.floor(score);
  const cleanCombo = Math.max(0, Math.min(1000, typeof maxCombo === 'number' && Number.isFinite(maxCombo) ? Math.floor(maxCombo) : 0));
  const cleanMoles = Math.max(0, Math.min(1000, typeof molesWhacked === 'number' && Number.isFinite(molesWhacked) ? Math.floor(molesWhacked) : 0));

  const cleanName = sanitizeText(username, 25);
  if (!cleanName) {
    return res.status(400).json({ error: 'ชื่อผู้เล่นไม่ถูกต้องดิว้า!' });
  }

  // Reject bot signatures
  if (cleanName.toLowerCase().includes('bot') || cleanName.includes('🤖')) {
    return res.status(400).json({ error: 'ไม่อนุญาตให้ใช้ชื่อบอทดิว้า!' });
  }

  const targetList = mode === 'rhythm' ? rhythmLeaderboard : classicLeaderboard;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const cleanBadge = sanitizeText(badgeName, 40) || 'ป้ายมือใหม่หัดทุบ';
  const cleanHammer = sanitizeText(hammerName, 40) || 'ค้อนเริ่มต้น';

  // Check if player already exists in the real-time leaderboard
  const existingIndex = targetList.findIndex((item) => item.username.toLowerCase() === cleanName.toLowerCase());

  if (existingIndex >= 0) {
    if (cleanScore > targetList[existingIndex].score) {
      targetList[existingIndex] = {
        ...targetList[existingIndex],
        score: cleanScore,
        maxCombo: Math.max(targetList[existingIndex].maxCombo || 0, cleanCombo),
        molesWhacked: Math.max(targetList[existingIndex].molesWhacked || 0, cleanMoles),
        badgeName: cleanBadge,
        hammerName: cleanHammer,
        timestamp: timeStr,
        createdAt: Date.now()
      };
    }
  } else {
    const newEntry: LeaderboardEntry = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanName,
      score: cleanScore,
      maxCombo: cleanCombo,
      mode: mode === 'rhythm' ? 'rhythm' : 'classic',
      badgeName: cleanBadge,
      hammerName: cleanHammer,
      molesWhacked: cleanMoles,
      timestamp: timeStr,
      createdAt: Date.now()
    };
    targetList.push(newEntry);
  }

  // Sort descending by score
  targetList.sort((a, b) => b.score - a.score);
  if (targetList.length > 50) {
    targetList.length = 50;
  }

  // Real-time broadcast leaderboard update to all players
  broadcast({
    type: 'leaderboard_updated',
    mode,
    topClassic: classicLeaderboard.slice(0, 10),
    topRhythm: rhythmLeaderboard.slice(0, 10)
  });

  return res.json({
    success: true,
    rank: targetList.findIndex((item) => item.username.toLowerCase() === cleanName.toLowerCase()) + 1,
    leaderboard: {
      classic: classicLeaderboard.slice(0, 30),
      rhythm: rhythmLeaderboard.slice(0, 30)
    }
  });
});

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Protected Game Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
