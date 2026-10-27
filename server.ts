import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());

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
app.get('/api/chat/stream', (req, res) => {
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

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
    broadcast({
      type: 'online_count',
      onlineCount: sseClients.size
    });
  });
});

// Send new message endpoint (Strictly real players only!)
app.post('/api/chat/send', (req, res) => {
  const { sender, badgeName, badgeGradient, badgeColor, text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'ข้อความว่างเปล่าไม่ได้ดิว้า!' });
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg: ChatMsg = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    sender: (sender && String(sender).trim()) || 'ผู้เล่นแชงเบี้ย',
    badgeName: badgeName || 'ป้ายมือใหม่หัดทุบ',
    badgeGradient: badgeGradient || 'from-[#D1EBA0] to-[#C3E895] border-[#95D58B]',
    badgeColor: badgeColor || 'text-emerald-900',
    text: text.trim().slice(0, 200),
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
// 🏆 ONLINE REAL-TIME LEADERBOARD SYSTEM
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

const classicLeaderboard: LeaderboardEntry[] = [
  {
    id: 'lead-c-1',
    username: 'เซียนทุบครกอั่งศิลา',
    score: 28500,
    maxCombo: 48,
    mode: 'classic',
    badgeName: 'ป้ายแชงเบี้ยสูญพันธุ์ (เวลตัน)',
    hammerName: 'ครกหินตำแหลก (ครก)',
    molesWhacked: 124,
    timestamp: 'วันนี้',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'lead-c-2',
    username: 'สิงห์รถถังถล่มรู',
    score: 24200,
    maxCombo: 39,
    mode: 'classic',
    badgeName: 'ป้ายนักล่าแชงเบี้ย',
    hammerName: 'รถถังประจัญบาน (รถถัง)',
    molesWhacked: 108,
    timestamp: 'วันนี้',
    createdAt: Date.now() - 7200000
  },
  {
    id: 'lead-c-3',
    username: 'มนต์รักเมียหลวง',
    score: 21900,
    maxCombo: 34,
    mode: 'classic',
    badgeName: 'ป้ายตัวแทนสังคม',
    hammerName: 'เมียหลวงพิโรธ (เมีย)',
    molesWhacked: 95,
    timestamp: 'วันนี้',
    createdAt: Date.now() - 10800000
  }
];

const rhythmLeaderboard: LeaderboardEntry[] = [
  {
    id: 'lead-r-1',
    username: 'เทพเจ้ากดค้างริทึม',
    score: 89400,
    maxCombo: 182,
    mode: 'rhythm',
    badgeName: 'ป้ายแชงเบี้ยสูญพันธุ์ (เวลตัน)',
    hammerName: 'ค้อนดาวทองพาสเทล',
    timestamp: 'วันนี้',
    createdAt: Date.now() - 1800000
  },
  {
    id: 'lead-r-2',
    username: 'เซไกสายกดคู่',
    score: 76500,
    maxCombo: 145,
    mode: 'rhythm',
    badgeName: 'ป้ายนักล่าแชงเบี้ย',
    hammerName: 'ปืนใหญ่พระกาฬ (ปืนใหญ่)',
    timestamp: 'วันนี้',
    createdAt: Date.now() - 5400000
  },
  {
    id: 'lead-r-3',
    username: 'จอมขมังเวทย์ไข่หมา',
    score: 64200,
    maxCombo: 112,
    mode: 'rhythm',
    badgeName: 'ป้ายปรุงลาบ',
    hammerName: 'ไข่หมาในตำนาน (ไข่หมา)',
    timestamp: 'วันนี้',
    createdAt: Date.now() - 9000000
  }
];

// Get Leaderboard Data
app.get('/api/leaderboard', (_req, res) => {
  res.json({
    classic: classicLeaderboard.slice(0, 50),
    rhythm: rhythmLeaderboard.slice(0, 50)
  });
});

// Submit High Score from a Real Player
app.post('/api/leaderboard/submit', (req, res) => {
  const { username, score, maxCombo, mode, badgeName, hammerName, molesWhacked } = req.body;

  if (!username || typeof score !== 'number' || score <= 0) {
    return res.status(400).json({ error: 'ข้อมูลคะแนนไม่ถูกต้องดิว้า!' });
  }

  const cleanName = String(username).trim().slice(0, 25) || 'ผู้เล่นแชงเบี้ย';
  const targetList = mode === 'rhythm' ? rhythmLeaderboard : classicLeaderboard;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find if player already has an entry
  const existingIndex = targetList.findIndex((item) => item.username.toLowerCase() === cleanName.toLowerCase());

  if (existingIndex >= 0) {
    if (score > targetList[existingIndex].score) {
      targetList[existingIndex] = {
        ...targetList[existingIndex],
        score,
        maxCombo: Math.max(targetList[existingIndex].maxCombo || 0, maxCombo || 0),
        molesWhacked: Math.max(targetList[existingIndex].molesWhacked || 0, molesWhacked || 0),
        badgeName: badgeName || targetList[existingIndex].badgeName,
        hammerName: hammerName || targetList[existingIndex].hammerName,
        timestamp: timeStr,
        createdAt: Date.now()
      };
    }
  } else {
    const newEntry: LeaderboardEntry = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanName,
      score,
      maxCombo: maxCombo || 0,
      mode: mode === 'rhythm' ? 'rhythm' : 'classic',
      badgeName: badgeName || 'ป้ายมือใหม่หัดทุบ',
      hammerName: hammerName || 'ค้อนไม้โง่ๆ',
      molesWhacked: molesWhacked || 0,
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
    console.log(`🎮 Game Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
