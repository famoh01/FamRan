/* =========================================================
   Fam Ai · Campus Wars — game data (classes, enemies, zones)
   ========================================================= */

export const VERSION = '1.0.0';

export const BRAND = 'Fam Ai';
export const TITLE = 'Campus Wars';

export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'นักรบ', en: 'Warrior', icon: '🗡️', color: '#ff9f43', color2: '#ffd166',
    desc: 'เลือดหนา ฟันหนัก ระยะสั้น เหมาะกับสายบุก',
    hp: 150, atk: 12, spd: 112, range: 62, cd: 0.36, crit: 0.10, projectile: false,
    skills: [
      { id: 'w1', name: 'ฟันคมหิน', icon: '💥', cd: 6, lv: 2, desc: 'ฟันกวาดรอบตัว 220% + กระเด็น' },
      { id: 'w2', name: 'โล่พสุธา', icon: '🛡️', cd: 15, lv: 4, desc: 'โล่กัน 60% 4 วิ + ฟื้นเลือด 25%' },
    ],
  },
  mage: {
    id: 'mage', name: 'จอมเวท', en: 'Mage', icon: '🔮', color: '#7c5cff', color2: '#b39dff',
    desc: 'ดาเมจไกล ระเบิดเป็นวง แต่เลือดบาง',
    hp: 105, atk: 15, spd: 118, range: 165, cd: 0.52, crit: 0.08, projectile: 'bolt',
    skills: [
      { id: 'm1', name: 'ลูกไฟ', icon: '🔥', cd: 5, lv: 2, desc: 'ยิงลูกไฟระเบิดAoE 190%' },
      { id: 'm2', name: 'วงเวทน้ำแข็ง', icon: '❄️', cd: 14, lv: 4, desc: 'แช่แข็งรอบตัว 2.5 วิ + 130%' },
    ],
  },
  archer: {
    id: 'archer', name: 'นักธนู', en: 'Archer', icon: '🏹', color: '#2ecc71', color2: '#a8f0c6',
    desc: 'ยิงไว ระยะไกลสุด วิ่งเร็ว',
    hp: 112, atk: 11, spd: 132, range: 195, cd: 0.40, crit: 0.14, projectile: 'arrow',
    skills: [
      { id: 'a1', name: 'ฝนลูกศร', icon: '🎯', cd: 5, lv: 2, desc: 'ยิง 3 ดอกเป็นพัด 150%' },
      { id: 'a2', name: 'ก้าวลม', icon: '💨', cd: 10, lv: 4, desc: 'พุ่งตัว + เร็วขึ้น 3 วิ' },
    ],
  },
};

export const ENEMIES = {
  bully:  { name: 'นักเลงรุ่นพี่', hp: 46,  atk: 6,  spd: 70,  range: 42, cd: 1.1, xp: 12, gold: 8,  r: 15, color: '#e05555', color2: '#ffb3b3' },
  thug:   { name: 'นักเลงหัวโจก', hp: 95,  atk: 11, spd: 88,  range: 46, cd: 1.0, xp: 24, gold: 16, r: 17, color: '#c0392b', color2: '#ff8a80' },
  ranged: { name: 'มือปืนลูกดอก', hp: 62,  atk: 9,  spd: 62,  range: 230, cd: 1.8, xp: 26, gold: 18, r: 15, color: '#8e44ad', color2: '#d8a7ff', proj: true },
  boss1:  { name: 'หัวหน้าแก๊งปี 3', hp: 620,  atk: 18, spd: 92,  range: 66, cd: 1.2, xp: 240, gold: 220, r: 30, color: '#ff7043', color2: '#ffd8a8', boss: true },
  boss2:  { name: 'ครูใหญ่เงา',      hp: 1500, atk: 25, spd: 96,  range: 70, cd: 1.1, xp: 650, gold: 520, r: 34, color: '#5c6bc0', color2: '#b0bfff', boss: true },
  boss3:  { name: 'ราชาโรงเรียน',    hp: 3200, atk: 34, spd: 100, range: 74, cd: 1.0, xp: 1500, gold: 1200, r: 38, color: '#d81b60', color2: '#ff9ecb', boss: true },
};

export const ZONES = [
  {
    id: 0, name: 'ลานหน้าโรงเรียน', sub: 'Campus Yard', theme: 'yard',
    size: { w: 26, h: 44 }, boss: 'boss1', spawns: ['bully', 'bully', 'bully', 'thug'], density: 16,
    bossAt: { x: 0.5, y: 0.10 },
    bg: '#20351f', accent: '#3f6b3a', wall: '#2b4a2b', wallTop: '#4c7a45',
  },
  {
    id: 1, name: 'อาคารเรียน A', sub: 'School Building', theme: 'building',
    size: { w: 28, h: 46 }, boss: 'boss2', spawns: ['thug', 'thug', 'ranged', 'bully'], density: 20,
    bossAt: { x: 0.5, y: 0.10 },
    bg: '#1b2436', accent: '#2f4463', wall: '#243044', wallTop: '#3d5375',
  },
  {
    id: 2, name: 'ดาดฟ้าเงามืด', sub: 'Shadow Rooftop', theme: 'roof',
    size: { w: 30, h: 48 }, boss: 'boss3', spawns: ['thug', 'ranged', 'thug', 'ranged', 'bully'], density: 24,
    bossAt: { x: 0.5, y: 0.10 },
    bg: '#241a2e', accent: '#43305a', wall: '#2e2340', wallTop: '#4d3a68',
  },
];

export const QUESTS = [
  { id: 'q1', zone: 0, text: 'จัดการนักเลงรุ่นพี่', type: 'kill', target: 5, need: 5, xp: 60, gold: 60 },
  { id: 'q2', zone: 0, text: 'เก็บกระเป๋านักเรียน', type: 'bag', target: 3, need: 3, xp: 80, gold: 90 },
  { id: 'q3', zone: 0, text: 'ปราบหัวหน้าแก๊งปี 3', type: 'boss', target: 1, need: 1, xp: 150, gold: 200 },
  { id: 'q4', zone: 1, text: 'เคลียร์ทางเดินอาคาร A', type: 'kill', target: 8, need: 8, xp: 180, gold: 160 },
  { id: 'q5', zone: 1, text: 'ปราบครูใหญ่เงา', type: 'boss', target: 2, need: 1, xp: 320, gold: 420 },
  { id: 'q6', zone: 2, text: 'พิชิตดาดฟ้าเงามืด', type: 'boss', target: 3, need: 1, xp: 700, gold: 900 },
];

export const SHOP = [
  { id: 'potion', name: 'ยาฟื้นเลือด', icon: '🧪', price: 30, desc: 'ฟื้น HP 50%' },
  { id: 'elixir', name: 'ยาวิเศษ', icon: '⚗️', price: 120, desc: 'ฟื้น HP เต็มทันที' },
  { id: 'weapon', name: 'อัปเกรดอาวุธ', icon: '⚔️', desc: '+3 ATK ถาวร', base: 150, step: 120 },
  { id: 'armor', name: 'อัปเกรดเกราะ', icon: '🛡️', desc: '+18 HP ถาวร', base: 140, step: 110 },
];

export const TIPS = [
  'กดปุ่ม 🗡️ ค้างไว้เพื่อโจมตีต่อเนื่อง',
  'หลบวงแดงใต้เท้าศัตรู — นั่นคือการโจมตีที่กำลังจะลง',
  'เก็บกระเป๋านักเรียนที่ศัตรูทำตกเพื่อทำเควสต์',
  'อัปเกรดอาวุธ/เกราะที่ร้านค้าเมื่อมีเงินพอ',
  'เกมบันทึกอัตโนมัติทุกครั้งที่เปลี่ยนฉาก',
];

export const xpNeeded = (lv) => Math.floor(45 * Math.pow(lv, 1.34));
