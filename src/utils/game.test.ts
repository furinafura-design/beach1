import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaxExp, checkAndUnlockBadges } from './storage.ts';
import { BADGES_LIST, DIFFICULTY_CONFIG } from './constants.ts';
import { UserProfile } from '../types/game.ts';

test('calculateMaxExp calculates progression properly', () => {
  const exp1 = calculateMaxExp(1);
  const exp5 = calculateMaxExp(5);
  const exp50 = calculateMaxExp(50);
  const exp100 = calculateMaxExp(100);

  assert.ok(exp1 > 0);
  assert.ok(exp5 > exp1);
  assert.ok(exp50 > exp5);
  assert.equal(exp100, 999999);
});

test('checkAndUnlockBadges unlocks milestone badges at specific levels', () => {
  const mockProfile: UserProfile = {
    username: 'นักทุบ',
    equippedBadgeId: 'badge_novice',
    level: 50,
    currentExp: 0,
    maxExp: 1000,
    coins: 500,
    equippedHammerId: 'basic_hammer',
    hammerSpeedLevel: 1,
    totalMolesWhacked: 200,
    highestScore: 5000,
    highestCombo: 20,
    unlockedBadgeIds: ['badge_novice'],
    ownedHammerIds: ['basic_hammer'],
    points: 1000,
    bombsCount: 1,
    trashItems: [],
    ahmahCount: 0
  };

  const { updatedProfile, newBadges } = checkAndUnlockBadges(mockProfile);

  // Level 50 should unlock badge_lvl5, badge_lvl25, badge_lvl50
  assert.ok(updatedProfile.unlockedBadgeIds.includes('badge_lvl5'));
  assert.ok(updatedProfile.unlockedBadgeIds.includes('badge_lvl25'));
  assert.ok(updatedProfile.unlockedBadgeIds.includes('badge_lvl50'));
  assert.ok(!updatedProfile.unlockedBadgeIds.includes('badge_lvl75'));
  assert.ok(!updatedProfile.unlockedBadgeIds.includes('badge_lvl100'));
  assert.ok(newBadges.length >= 3);
});

test('DIFFICULTY_CONFIG contains valid 3 tiers', () => {
  assert.ok(DIFFICULTY_CONFIG.easy.stayDurationMs > DIFFICULTY_CONFIG.medium.stayDurationMs);
  assert.ok(DIFFICULTY_CONFIG.medium.stayDurationMs > DIFFICULTY_CONFIG.insane.stayDurationMs);
  assert.equal(DIFFICULTY_CONFIG.easy.label, 'ง่าย');
  assert.equal(DIFFICULTY_CONFIG.medium.label, 'ปานกลาง');
  assert.equal(DIFFICULTY_CONFIG.insane.label, 'ยากมหาโหด');
});
