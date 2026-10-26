import { BADGES_LIST } from './constants';
import { ChatMessage, UserProfile } from '../types/game';

const STORAGE_KEY_PROFILE = 'whack_mole_pastel_profile_v2';
const STORAGE_KEY_CHAT = 'whack_mole_pastel_chat_v2';

export function calculateMaxExp(level: number): number {
  if (level >= 100) return 999999;
  return Math.floor(100 + Math.pow(level, 1.8) * 35);
}

const DEFAULT_PROFILE: UserProfile = {
  username: 'นักทุบพาสเทล',
  equippedBadgeId: 'badge_novice',
  level: 1,
  currentExp: 0,
  maxExp: calculateMaxExp(1),
  coins: 100,
  equippedHammerId: 'basic_hammer',
  hammerSpeedLevel: 1,
  totalMolesWhacked: 0,
  highestScore: 0,
  highestCombo: 0,
  unlockedBadgeIds: ['badge_novice'],
  ownedHammerIds: ['basic_hammer']
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile to localStorage', e);
  }
}

export function checkAndUnlockBadges(profile: UserProfile): { updatedProfile: UserProfile; newBadges: string[] } {
  const newBadges: string[] = [];
  const updatedUnlocked = [...profile.unlockedBadgeIds];

  BADGES_LIST.forEach((b) => {
    if (profile.level >= b.requiredLevel && !updatedUnlocked.includes(b.id)) {
      updatedUnlocked.push(b.id);
      newBadges.push(b.name);
    }
  });

  return {
    updatedProfile: {
      ...profile,
      unlockedBadgeIds: updatedUnlocked
    },
    newBadges
  };
}

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'c1',
    sender: 'จอมยุทธ์เขียว',
    badgeName: 'ป้ายตัวแทนสังคม',
    badgeGradient: 'from-blue-100 to-indigo-100 border-blue-300',
    badgeColor: 'text-blue-900',
    text: 'ยินดีต้อนรับสู่สังเวียนตุ่นปืนเขียว! วันนี้ใครขึ้นเวล 50 บ้างแล้วครับ?',
    timestamp: '11:20'
  },
  {
    id: 'c2',
    sender: 'น้องมิ้นต์สุดคิ้วท์',
    badgeName: 'ป้ายหน้าตาเอาเรื่อง',
    badgeGradient: 'from-teal-100 to-cyan-100 border-teal-300',
    badgeColor: 'text-teal-900',
    text: 'ค้อนแม่เสือสาวแต้มคูณสามแรงมากก จังหวะบอสโผล่รีบกดเลยแต้มพุ่งสุดๆ 🐯🔥',
    timestamp: '11:24'
  },
  {
    id: 'c3',
    sender: 'บีทมาสเตอร์99',
    badgeName: 'ป้ายมือใหม่หัดทุบ',
    badgeGradient: 'from-emerald-100 to-teal-100 border-emerald-300',
    badgeColor: 'text-emerald-800',
    text: 'โหมดเพลง YouTube ใส่เพลงร็อคแล้วตุ่นเด้งดึ๋งตามบีทมันส์มากกก 555',
    timestamp: '11:30'
  }
];

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT);
    if (!raw) return INITIAL_CHAT_MESSAGES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CHAT_MESSAGES;
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
}

export function saveChatMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages.slice(-50)));
  } catch (e) {
    console.error('Failed to save chat', e);
  }
}
