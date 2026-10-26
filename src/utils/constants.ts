import { Badge, Hammer } from '../types/game';

export const MOLE_IMAGE_URL = 'https://i.postimg.cc/TPwDPSR8/6a0ae77a7e26ef6a8f7f2345ee63aacb.png';

export const AVAILABLE_HAMMERS: Hammer[] = [
  {
    id: 'basic_hammer',
    name: 'ค้อนไม้โง่ๆ',
    description: 'ค้อนเริ่มต้นประจำตัว น้ำหนักเบา โง่',
    skillName: 'ทุบพลังโง่ (Power Smash)',
    skillDescription: 'ทุบเป้าหมายทันทีพร้อมรับแต้มพิเศษ +300 แต้ม (คูลดาวน์ 8 วินาที)',
    cooldownSeconds: 8,
    icon: '🔨',
    price: 0,
    owned: true,
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'double_whack',
    name: 'ค้อนล่าไวเบิ้ลสอง',
    description: 'ค้อนคู่พายุหมุน ฟาดหนึ่งครั้งได้แต้มคูณ 2 ทันที หรือทุบพร้อมกันสองหลุม',
    skillName: 'พายุหมุนทุบเบิ้ล (Double Storm)',
    skillDescription: 'ทุบตัวแชงเบี้ย 2 หลุมพร้อมกันทันทีและรับแต้มเบิ้ล (คูลดาวน์ 12 วินาที)',
    cooldownSeconds: 12,
    icon: '⚡',
    price: 350,
    owned: false,
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'board_sweeper',
    name: 'ค้อนเฆี่ยนแชงเบี้ย',
    description: 'ทุบทีพ่อตาย กดสกิล [F] หรือกดปุ่ม เพื่อทุบเรียบทั้งโต๊ะทุกหลุมพร้อมกัน!',
    skillName: 'ทุบกวาดโต๊ะ (Board Wipe)',
    skillDescription: 'ทุบตัวตุ่นที่โผล่ขึ้นมาทั้งหมดในกระดานทันที (คูลดาวน์ 18 วินาที)',
    cooldownSeconds: 18,
    icon: '🌪️',
    price: 800,
    owned: false,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'tiger_lady',
    name: 'ค้อนแม่เสือสาว',
    description: 'ทุบแล้วเซ็กซี่ ฟาดแล้วเปิดโหมดแต้มคูณสาม (x3)',
    skillName: 'คำรามคูณสาม (x3 Multiplier)',
    skillDescription: 'เปิดโหมดพลังเสือ ฟาดตุ่นได้แต้ม x3 นาน 8 วินาที (คูลดาวน์ 15 วินาที)',
    cooldownSeconds: 15,
    icon: '🐯',
    price: 1500,
    owned: false,
    color: 'from-rose-400 to-pink-500'
  },
  {
    id: 'golden_star',
    name: 'ค้อนดาวทองพาสเทล',
    description: 'ค้อนแห่งเกียรติยศ คนใช้ฉลาดขึ้น เพิ่มเหรียญรางวัลพิเศษ 50% ทุกการทุบ',
    skillName: 'โปรยเหรียญทอง (Lucky Gold)',
    skillDescription: 'รับเหรียญทองทันที +150 เหรียญและเพิ่มแต้มพิเศษ (คูลดาวน์ 14 วินาที)',
    cooldownSeconds: 14,
    icon: '⭐',
    price: 3000,
    owned: false,
    color: 'from-yellow-400 to-amber-500'
  }
];

export const BADGES_LIST: Badge[] = [
  {
    id: 'badge_novice',
    name: 'ป้ายมือใหม่หัดทุบ',
    description: 'เริ่มต้นเส้นทางการเป็นนักทุบแชงเบี้ย',
    requiredLevel: 1,
    icon: '🌱',
    bgGradient: 'from-[#D1EBA0] to-[#C3E895] border-[#95D58B]',
    textColor: 'text-emerald-900'
  },
  {
    id: 'badge_lvl5',
    name: 'ป้ายไม่ชอบหน้าแชงเบี้ย',
    description: 'ปลดล็อกเมื่อถึงเลเวล 5 (เห็นหน้าไอ้แชงเบี้ยแล้วต้องฟาด)',
    requiredLevel: 5,
    icon: '💢',
    bgGradient: 'from-[#C3E895] to-[#B4E578] border-[#95D58B]',
    textColor: 'text-emerald-950 font-bold'
  },
  {
    id: 'badge_lvl25',
    name: 'ป้ายตัวแทนสังคม',
    description: 'ปลดล็อกเมื่อถึงเลเวล 25 ผู้ผดุงความยุติธรรมประจำเซิร์ฟ',
    requiredLevel: 25,
    icon: '🏛️',
    bgGradient: 'from-[#B4E578] to-[#95D58B] border-[#70b965]',
    textColor: 'text-emerald-950 font-bold'
  },
  {
    id: 'badge_lvl50',
    name: 'ป้ายปรุงลาบ',
    description: 'ปลดล็อกเมื่อถึงเลเวล 50 เชฟมือทองรสแซ่บนัวสะท้านโต๊ะ',
    requiredLevel: 50,
    icon: '🌶️',
    bgGradient: 'from-amber-100 to-[#D1EBA0] border-amber-300',
    textColor: 'text-amber-950 font-bold'
  },
  {
    id: 'badge_lvl75',
    name: 'ป้ายนักล่าแชงเบี้ย',
    description: 'ปลดล็อกเมื่อถึงเลเวล 75 ยอดนักทุบระดับพระกาฬแห่งสังเวียน',
    requiredLevel: 75,
    icon: '🎯',
    bgGradient: 'from-[#B7E658] to-[#95D58B] border-[#79bf6d]',
    textColor: 'text-slate-900 font-bold'
  },
  {
    id: 'badge_lvl100',
    name: 'ป้ายแชงเบี้ยสูญพันธุ์ (เวลตัน)',
    description: 'ปลดล็อกเมื่อถึงเลเวล 100 ไร้เทียมทาน ปราบแชงเบี้ยจนเกลี้ยงสังเวียน',
    requiredLevel: 100,
    icon: '👑',
    bgGradient: 'from-[#B7E658] via-[#C3E895] to-[#D1EBA0] border-[#95D58B] shadow-sm',
    textColor: 'text-emerald-950 font-black'
  }
];

// Difficulty settings (snappy, low-delay arcade tuning)
export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'ง่าย',
    stayDurationMs: 950,
    spawnIntervalMs: 800,
    maxSimultaneous: 2,
    pointsPerHit: 100,
    expPerHit: 25,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300'
  },
  medium: {
    label: 'ปานกลาง',
    stayDurationMs: 680,
    spawnIntervalMs: 550,
    maxSimultaneous: 3,
    pointsPerHit: 150,
    expPerHit: 40,
    color: 'bg-amber-50 text-amber-700 border-amber-300'
  },
  insane: {
    label: 'ยากมหาโหด',
    stayDurationMs: 440,
    spawnIntervalMs: 380,
    maxSimultaneous: 4,
    pointsPerHit: 250,
    expPerHit: 70,
    color: 'bg-rose-50 text-rose-700 border-rose-300'
  }
};
