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

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Filter to only messages sent by real users (where isSelf is true or manually sent)
    if (Array.isArray(parsed)) {
      return parsed.filter((m: ChatMessage) => m.isSelf);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages.slice(-50)));
  } catch (e) {
    console.error('Failed to save chat', e);
  }
}
