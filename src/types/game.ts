export type Difficulty = 'easy' | 'medium' | 'insane';

export type HammerId = 'basic_hammer' | 'double_whack' | 'board_sweeper' | 'tiger_lady' | 'golden_star';

export interface Hammer {
  id: HammerId;
  name: string;
  description: string;
  skillName: string;
  skillDescription: string;
  cooldownSeconds: number; // Cooldown for special ability
  icon: string;
  price: number;
  owned: boolean;
  color: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  icon: string;
  bgGradient: string;
  textColor: string;
}

export interface UserProfile {
  username: string;
  equippedBadgeId: string;
  level: number;
  currentExp: number;
  maxExp: number;
  coins: number;
  equippedHammerId: HammerId;
  hammerSpeedLevel: number; // 1 to 10
  totalMolesWhacked: number;
  highestScore: number;
  highestCombo: number;
  unlockedBadgeIds: string[];
  ownedHammerIds: HammerId[];
}

export interface MoleHole {
  id: number;
  isActive: boolean;
  isHit: boolean;
  hitCount: number;
  popType: 'normal' | 'golden' | 'fast';
  pointsValue: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  badgeName?: string;
  badgeGradient?: string;
  badgeColor?: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
  avatarSeed?: string;
}

export interface ScorePopup {
  id: string;
  holeIndex: number;
  text: string;
  color: string;
  scale?: number;
}

export type JudgmentType = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export interface RhythmNote {
  id: string;
  lane: number; // 0, 1, 2, 3
  targetTime: number; // timestamp in ms when note should be hit
  spawnTime: number;
  isGolden: boolean;
  isHit: boolean;
  isMissed: boolean;
}
