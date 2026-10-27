export type Difficulty = 'easy' | 'medium' | 'insane';

export type HammerId =
  | 'basic_hammer'
  | 'double_whack'
  | 'board_sweeper'
  | 'tiger_lady'
  | 'golden_star'
  | 'mortar'
  | 'tank'
  | 'cannon'
  | 'dog_egg'
  | 'wife';

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
  points: number; // Spendable score points for Lucky Wheel
  bombsCount: number; // Number of bombs available to use
  trashItems: string[]; // Funny junk items collected from wheel
  ahmahCount: number; // Number of times Ah-Mah was summoned
}

export interface MoleHole {
  id: number;
  isActive: boolean;
  isHit: boolean;
  hitCount: number;
  popType: 'normal' | 'golden' | 'fast';
  pointsValue: number;
  moleCount?: number; // Multi-mole stack for dog frenzy skill
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

export type NoteType = 'tap' | 'hold' | 'flick' | 'drag';
export type NoteGimmick = 'none' | 'hidden' | 'sudden' | 'speed_shift';
export type FlickDirection = 'up' | 'left' | 'right';

export interface RhythmNote {
  id: string;
  lane: number; // 0, 1, 2, 3
  targetTime: number; // timestamp in ms when note head should be hit
  spawnTime: number;
  isGolden: boolean;
  isHit: boolean;
  isMissed: boolean;
  type?: NoteType;
  holdDuration?: number; // duration in ms for hold notes
  holdEndTargetTime?: number; // target time for hold tail
  isHolding?: boolean; // player is actively holding down
  holdProgress?: number; // 0 to 1
  holdTicksCount?: number;
  holdCompleted?: boolean;
  isDual?: boolean; // simultaneous note with another lane!
  pairedLane?: number; // paired lane index
  flickDir?: FlickDirection;
  gimmick?: NoteGimmick;
  speedMod?: number;
}

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

export interface RhythmHero {
  id: string;
  name: string;
  role: string;
  avatar: string;
  skillName: string;
  skillDesc: string;
  cooldown: number;
  currentCooldown: number;
  icon: string;
  color: string;
}
