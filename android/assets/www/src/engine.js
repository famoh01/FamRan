/* =========================================================
   Fam Ai · Campus Wars — core engine (canvas 2D, touch-first)
   ========================================================= */
import { CLASSES, ENEMIES, ZONES, QUESTS, SHOP, xpNeeded, BRAND, TITLE } from './data.js';
import { sfx } from './audio.js';
import UI from './ui.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const now = () => performance.now() / 1000;

export class Game {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pxPerUnit = 26;
    this.cam = { x: 0, y: 0 };
    this.keys = {};
    this.state = 'boot';
    this.zoneIndex = 0;
    this.zone = ZONES[0];
    this.enemies = [];
    this.projs = [];
    this.pickups = [];
    this.blasts = [];
    this.floaters = [];
    this.particles = [];
    this.time = 0;
    this.shake = 0;
    this.kills = { total: 0 };
    this.stats = { dealt: 0, taken: 0, runs: 0 };
    this.quests = QUESTS.map((q) => ({ ...q, prog: 0, done: false }));
    this.joystick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, knob: 0 };
    this.attackHeld = false;
    this.player = null;
    this.boss = null;
    this.autobtnFlash = 0;
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /* ---------------------------------------------------------- boot */
  boot(save) {
    this.save = save;
    this.resize();
    this.loop = this.loop.bind(this);
    this.lastT = now();
    requestAnimationFrame(this.loop);
  }

  resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(320, window.innerHeight);
    this.W = w; this.H = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.floor(w * this.dpr);
    this.cv.height = Math.floor(h * this.dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.pxPerUnit = clamp(Math.round(Math.min(w, h) / 20), 17, 26);
    this.worldZoom = this.pxPerUnit / 26;
    this.recalcLayout();
  }

  recalcLayout() {
    const L = (this.layout = {});
    L.jr = Math.round(Math.min(this.W, this.H) * 0.145);      // joystick radius
    L.jx = L.jr + 26;
    L.jy = this.H - L.jr - 26;
    L.atkR = Math.round(clamp(Math.min(this.W, this.H) * 0.105, 40, 62));
    L.atkX = this.W - L.atkR - 22;
    L.atkY = this.H - L.atkR - 28 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-b')) || 0);
    const sr = (L.sr = Math.round(L.atkR * 0.62));
    L.s1 = { x: L.atkX - (L.atkR + sr + 14), y: L.atkY, r: sr };
    L.s2 = { x: L.s1.x, y: L.atkY - (sr * 2 + 16), r: sr };
    L.pot = { x: L.atkX, y: L.atkY - (L.atkR + sr + 12), r: Math.round(sr * 0.88) };
  }

  /* -------------------------------------------------------- input */
  bindInput() {
    const cv = this.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    const local = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    cv.addEventListener('pointerdown', (e) => {
      if (this.state !== 'play') return;
      cv.setPointerCapture?.(e.pointerId);
      const p = local(e), L = this.layout;
      // attack button (+ hold)
      if (Math.hypot(p.x - L.atkX, p.y - L.atkY) < L.atkR + 8) {
        this.attackHeld = true; this.attackPointer = e.pointerId; this.tryAttack(true);
        this.autobtnFlash = .15; return;
      }
      // skill buttons
      if (Math.hypot(p.x - L.s1.x, p.y - L.s1.y) < L.s1.r + 10) { this.castSkill(0); return; }
      if (Math.hypot(p.x - L.s2.x, p.y - L.s2.y) < L.s2.r + 10) { this.castSkill(1); return; }
      if (Math.hypot(p.x - L.pot.x, p.y - L.pot.y) < L.pot.r + 10) { this.usePotion(); return; }
      // joystick
      if (!this.joystick.active) {
        this.joystick = { active: true, id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, vx: 0, vy: 0, knob: 0 };
      }
    });

    cv.addEventListener('pointermove', (e) => {
      const p = local(e), j = this.joystick;
      if (j.active && e.pointerId === j.id) {
        const dx = p.x - j.ox, dy = p.y - j.oy, d = Math.hypot(dx, dy);
        const max = this.layout.jr;
        const k = d > max ? max / d : 1;
        j.x = j.ox + dx * k; j.y = j.oy + dy * k;
        const n = Math.hypot(j.x - j.ox, j.y - j.oy) / max;
        j.knob = n;
        if (d > 4) { const m = Math.hypot(dx, dy); j.vx = dx / m; j.vy = dy / m; } else { j.vx = j.vy = 0; }
      }
    });

    const up = (e) => {
      if (this.joystick.active && e.pointerId === this.joystick.id) {
        this.joystick.active = false; this.joystick.vx = this.joystick.vy = 0; this.joystick.knob = 0;
      }
      if (this.attackHeld && e.pointerId === this.attackPointer) this.attackHeld = false;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);

    // keyboard (desktop testing)
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') { this.attackHeld = true; e.preventDefault(); }
      if (e.key === '1') this.castSkill(0);
      if (e.key === '2') this.castSkill(1);
      if (e.key === 'e' || e.key === 'E') this.usePotion();
      if (e.key === 'Escape') this.pause();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === ' ') this.attackHeld = false;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.pause(); });
  }

  /* --------------------------------------------------------- flow */
  newGame(clsId) {
    this.player = this.makePlayer(clsId);
    this.quests = QUESTS.map((q) => ({ ...q, prog: 0, done: false }));
    this.kills = { total: 0 };
    this.gold = 0;
    this.potions = 2;
    this.zoneIndex = 0;
    this.stats = { dealt: 0, taken: 0, runs: 0 };
    this.enterZone(0);
    this.state = 'play';
    this.persist();
    UI.toast(`${BRAND} · ${CLASSES[clsId].name} พร้อมลุย!`, 'rgba(124,92,255,.92)');
  }

  makePlayer(clsId) {
    const c = CLASSES[clsId];
    return {
      cls: c, x: 0, y: 10, r: 16, face: 1, anim: 0, moving: false,
      hp: c.hp, maxHp: c.hp, atk: c.atk, spd: c.spd,
      cd: 0, cds: [0, 0], shield: 0, haste: 0, inv: 0, hurtFlash: 0,
      lv: 1, xp: 0, buffs: [],
    };
  }

  enterZone(i, spawn) {
    this.zoneIndex = i;
    this.zone = ZONES[i];
    this.enemies = []; this.projs = []; this.pickups = []; this.blasts = []; this.floaters = []; this.particles = [];
    this.boss = null;
    const z = this.zone;
    this.map = buildMap(z);
    const p = this.player;
    p.x = spawn ? spawn.x : this.map.spawn.x;
    p.y = spawn ? spawn.y : this.map.spawn.y;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
    p.inv = Math.max(p.inv, 1.2);   // spawn protection
    this.cam.x = p.x; this.cam.y = p.y;
    this.spawnWave();
    // keep the entry spot clear so the player is never buried on spawn
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 5.5) { const a = Math.atan2(e.y - p.y, e.x - p.x) || 0; e.x = p.x + Math.cos(a) * 6; e.y = p.y + Math.sin(a) * 6; }
    }
    UI.showZone(z, i);
    this.persist();
  }

  spawnWave() {
    const z = this.zone;
    const n = z.density;
    // boss stands at the far end of the map
    const bp = { x: (z.bossAt.x - 0.5) * z.size.w, y: (z.bossAt.y - 0.5) * z.size.h };
    const boss = this.spawnEnemy(z.boss, bp.x, bp.y);
    boss.guard = true;
    for (let i = 0; i < n; i++) {
      const kind = pick(z.spawns);
      const s = this.freeSpot(kind === 'ranged' ? 260 : 220);
      this.spawnEnemy(kind, s.x, s.y);
    }
  }

  freeSpot(minFromPlayer = 200) {
    for (let tries = 0; tries < 60; tries++) {
      const x = rand(-this.map.halfW + 2, this.map.halfW - 2);
      const y = rand(-this.map.halfH + 2, this.map.halfH - 2);
      if (this.map.blocked(x, y, 1)) continue;
      const p = this.player;
      if (Math.hypot(x - p.x, y - p.y) < minFromPlayer / this.pxPerUnit) continue;
      return { x, y };
    }
    return { x: 0, y: 0 };
  }

  spawnEnemy(kind, x, y) {
    const t = ENEMIES[kind];
    const scale = 1 + this.zoneIndex * 0.12;
    const e = {
      kind, type: t, x, y, hp: t.hp * scale, maxHp: t.hp * scale,
      atk: t.atk * scale, cd: rand(0.2, 1.0), r: t.r, hurt: 0, slow: 0, stun: 0,
      face: 1, anim: 0, wander: Math.random() * TAU, boss: !!t.boss, windup: 0, hitDone: false,
    };
    this.enemies.push(e);
    if (e.kind === this.zone.boss) this.boss = e;
    return e;
  }

  /* --------------------------------------------------------- loop */
  loop(t) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0, t / 1000 - this.lastT));
    this.lastT = t / 1000;
    if (this.state === 'play') {
      this.playTime = (this.playTime || 0) + dt;
      try { this.update(dt); }
      catch (err) { this.errCount = (this.errCount || 0) + 1; if (this.errCount < 4) console.error('[update]', err); }
    } else this.time += dt * 0.2;
    this.render(dt);
  }

  update(dt) {
    this.time += dt;
    const p = this.player;
    this.bossBarT = Math.max(0, (this.bossBarT || 0) - dt);

    // ----- movement input
    let mx = 0, my = 0;
    const j = this.joystick;
    if (j.active && j.knob > 0.12) { const k = Math.min(1, j.knob * 1.15); mx = j.vx * k; my = j.vy * k; }
    else {
      const K = this.keys;
      if (K['a'] || K['arrowleft']) mx -= 1;
      if (K['d'] || K['arrowright']) mx += 1;
      if (K['w'] || K['arrowup']) my -= 1;
      if (K['s'] || K['arrowdown']) my += 1;
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    }
    p.moving = Math.abs(mx) + Math.abs(my) > 0.05;
    p.haste = Math.max(0, p.haste - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.inv = Math.max(0, p.inv - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt * 3);

    const spd = p.spd * (p.haste > 0 ? 1.45 : 1) * (this.pxPerUnit / 26);
    if (p.moving) {
      const nx = p.x + mx * spd * dt / this.pxPerUnit;
      const ny = p.y + my * spd * dt / this.pxPerUnit;
      if (!this.map.blocked(nx, p.y, (p.r / this.pxPerUnit) * 0.55)) p.x = nx;
      if (!this.map.blocked(p.x, ny, (p.r / this.pxPerUnit) * 0.55)) p.y = ny;
      if (mx !== 0) p.face = mx > 0 ? 1 : -1;
      p.anim += dt * 9;
    } else p.anim += dt * 2.2;

    // ----- camera follow (dead-zone lerp)
    const lead = p.moving ? 1.2 : 0.4;
    this.cam.x += (p.x + mx * lead - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (p.y + my * lead - this.cam.y) * Math.min(1, dt * 6);
    const hw = this.map.halfW - this.W / this.pxPerUnit / 2;
    const hh = this.map.halfH - this.H / this.pxPerUnit / 2;
    if (hw > 0) this.cam.x = clamp(this.cam.x, -hw, hw); else this.cam.x = 0;
    if (hh > 0) this.cam.y = clamp(this.cam.y, -hh, hh); else this.cam.y = 0;

    // ----- cooldowns
    p.cd = Math.max(0, p.cd - dt);
    p.cds[0] = Math.max(0, p.cds[0] - dt);
    p.cds[1] = Math.max(0, p.cds[1] - dt);
    if (this.attackHeld) this.tryAttack(false);

    // ----- enemies
    const alive = [];
    for (const e of this.enemies) {
      e.cd -= dt; e.hurt = Math.max(0, e.hurt - dt * 4);
      e.stun = Math.max(0, e.stun - dt); e.slow = Math.max(0, e.slow - dt);
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      e.anim += dt * (e.stun > 0 ? 0 : 6);
      if (e.stun > 0) { alive.push(e); continue; }

      const t = e.type;
      const inRange = d <= (t.range / this.pxPerUnit) * 0.9;
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0 && !e.hitDone) {
          e.hitDone = true;
          this.enemyStrike(e);
        }
      } else if (!inRange) {
        const spdE = t.spd * (e.slow > 0 ? 0.45 : 1) * (this.pxPerUnit / 26);
        const dx = (p.x - e.x), dy = (p.y - e.y), m = Math.hypot(dx, dy) || 1;
        const step = spdE * dt / this.pxPerUnit;
        const wob = e.kind === 'bully' ? Math.sin(this.time * 2 + e.wander) * 0.25 : 0;
        const nx = e.x + (dx / m + wob * (dy / m)) * step;
        const ny = e.y + (dy / m - wob * (dx / m)) * step;
        if (!this.map.blocked(nx, e.y, e.r / this.pxPerUnit)) e.x = nx;
        if (!this.map.blocked(e.x, ny, e.r / this.pxPerUnit)) e.y = ny;
        if (dx !== 0) e.face = dx > 0 ? 1 : -1;
      } else if (e.cd <= 0) {
        e.cd = t.cd;
        if (t.proj) { this.enemyShoot(e); }
        else { e.windup = e.boss ? 0.55 : 0.45; e.hitDone = false; this.addBlast(e.x, e.y, (t.range / this.pxPerUnit) * 1.15, 'warn', 0.45); }
      }
      alive.push(e);
    }
    // gentle separation
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      for (let k = i + 1; k < alive.length; k++) {
        const b = alive[k];
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = (a.r + b.r) / this.pxPerUnit * 1.15;
        const d2v = dx * dx + dy * dy;
        if (d2v > 0.0001 && d2v < rr * rr) {
          const d = Math.sqrt(d2v), push = (rr - d) * 0.6;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
    this.enemies = alive;

    // ----- projectiles
    for (const pr of this.projs) {
      pr.life -= dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.life <= 0) { pr.dead = true; continue; }
      if (this.map.blocked(pr.x, pr.y, 0.2)) { pr.dead = true; continue; }
      if (pr.hostile) {
        if (p.inv <= 0 && Math.hypot(pr.x - p.x, pr.y - p.y) < (p.r + 8) / this.pxPerUnit) {
          this.damagePlayer(pr.dmg); pr.dead = true;
        }
      } else {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < (e.r + 8) / this.pxPerUnit) {
            this.damageEnemy(e, pr.dmg, pr.crit);
            if (pr.aoe) this.aoeDamage(pr.x, pr.y, pr.aoe, pr.dmg * 0.6);
            pr.dead = true; break;
          }
        }
      }
    }
    this.projs = this.projs.filter((x) => !x.dead);

    // ----- blasts (visual + delayed aoe)
    for (const b of this.blasts) {
      b.t += dt;
      if (b.aoe && !b.fired && b.t >= b.delay * 0.55) {
        b.fired = true;
        if (b.hostile) { if (Math.hypot(p.x - b.x, p.y - b.y) < b.r && p.inv <= 0) this.damagePlayer(b.dmg); }
        else this.aoeDamage(b.x, b.y, b.r, b.dmg);
      }
      if (b.t > b.delay) b.dead = true;
    }
    this.blasts = this.blasts.filter((b) => !b.dead);

    // ----- pickups (magnet)
    for (const q of this.pickups) {
      const dd = Math.hypot(p.x - q.x, p.y - q.y);
      if (dd < 2.4) {
        const m = dd || 1;
        q.x += (p.x - q.x) / m * dt * 3.2; q.y += (p.y - q.y) / m * dt * 3.2;
      }
      if (dd < 0.7) { q.dead = true; this.collect(q); }
    }
    this.pickups = this.pickups.filter((q) => !q.dead);

    // ----- floaters / particles / shake
    for (const f of this.floaters) { f.t += dt; f.y -= dt * 1.6; if (f.t > 0.9) f.dead = true; }
    this.floaters = this.floaters.filter((f) => !f.dead);
    for (const pa of this.particles) { pa.t += dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += pa.g * dt; if (pa.t > pa.life) pa.dead = true; }
    this.particles = this.particles.filter((x) => !x.dead);
    this.shake = Math.max(0, this.shake - dt * 22);
    if (this.clearT > 0) {
      this.clearT -= dt;
      if (this.clearT <= 0) { this.clearT = 0; this.zoneClearScreen(); }
    }
    this.hudT = (this.hudT || 0) + dt;
    if (this.hudT > 0.25) { this.hudT = 0; try { UI.hud(); } catch (e) {} }

    // ----- regen + death check
    p.hp = Math.min(p.maxHp, p.hp + (this.zoneIndex >= 0 ? 0.6 : 0) * dt);
    if (p.hp <= 0) this.gameOver();
  }

  /* --------------------------------------------------------- combat */
  nearestEnemy(maxDist) {
    const p = this.player;
    if (!p) return null;
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = dist2(e, p);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  tryAttack(fromTap) {
    const p = this.player;
    if (!p || p.cd > 0) return;
    p.cd = p.cls.cd;
    const target = this.nearestEnemy(p.cls.range / this.pxPerUnit);
    if (p.face === 0) p.face = 1;
    if (target) {
      const dx = target.x - p.x, dy = target.y - p.y;
      const ang = Math.atan2(dy, dx);
      // face the target when it is in range; keeps aiming readable on phone
      if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
      if (p.cls.projectile) {
        this.shootPlayer(ang, target);
      } else {
        this.meleeSwing(ang, target);
      }
    } else {
      this.meleeSwing(p.face > 0 ? 0 : Math.PI, null, true);
    }
    sfx.hit(p.cls.id);
  }

  meleeSwing(ang, target, whiff) {
    const p = this.player;
    this.addBlast(p.x + Math.cos(ang) * 0.55, p.y + Math.sin(ang) * 0.55, 0.85, 'slash', 0.18);
    if (whiff) return;
    const rng = (p.cls.range + 6) / this.pxPerUnit;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const er = e.r / this.pxPerUnit;
      if (d > rng + er) continue;
      const a2 = Math.atan2(e.y - p.y, e.x - p.x);
      let diff = Math.abs(((a2 - ang + Math.PI * 3) % TAU) - Math.PI);
      if (diff < 1.15) this.damageEnemy(e, this.rollDamage(), this.wasCrit());
    }
  }

  shootPlayer(ang, target) {
    const p = this.player;
    const isArrow = p.cls.projectile === 'arrow';
    this.projs.push({
      x: p.x + Math.cos(ang) * 0.5, y: p.y + Math.sin(ang) * 0.5,
      vx: Math.cos(ang) * (isArrow ? 15 : 12), vy: Math.sin(ang) * (isArrow ? 15 : 12),
      life: 1.4, dmg: this.rollDamage(), crit: this.wasCrit(), hostile: false,
      kind: isArrow ? 'arrow' : 'bolt', aoe: 0,
    });
  }

  castSkill(i) {
    const p = this.player;
    if (!p || this.state !== 'play') return;
    const sk = p.cls.skills[i];
    if (!sk) return;
    if (p.lv < sk.lv) { UI.toast(`สกิลนี้ปลดที่ Lv.${sk.lv}`, 'rgba(220,120,60,.92)'); return; }
    if (p.cds[i] > 0) return;
    p.cds[i] = sk.cd;
    const near = this.nearestEnemy(4.2);
    const ang = near ? Math.atan2(near.y - p.y, near.x - p.x) : (p.face > 0 ? 0 : Math.PI);
    const cls = p.cls.id;

    if (cls === 'warrior') {
      if (i === 0) {
        this.addBlast(p.x, p.y, 2.2, 'shock', 0.4);
        this.aoeDamage(p.x, p.y, 2.2, p.atk * 2.2);
        this.shake = 7; sfx.skill();
      } else {
        p.shield = 4; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25);
        this.addBlast(p.x, p.y, 1.6, 'shield', 0.7);
        sfx.buff();
      }
    } else if (cls === 'mage') {
      if (i === 0) {
        this.projs.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, life: 1.6, dmg: p.atk * 1.9, hostile: false, kind: 'fire', aoe: 2.0 });
        sfx.skill();
      } else {
        this.addBlast(p.x, p.y, 2.6, 'ice', 0.6);
        for (const e of this.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 2.6) { e.stun = 2.5; this.damageEnemy(e, p.atk * 1.3, false); }
        sfx.skill();
      }
    } else {
      if (i === 0) {
        for (const off of [-0.28, 0, 0.28]) {
          this.projs.push({ x: p.x, y: p.y, vx: Math.cos(ang + off) * 16, vy: Math.sin(ang + off) * 16, life: 1.2, dmg: p.atk * 1.5, hostile: false, kind: 'arrow' });
        }
        sfx.skill();
      } else {
        p.haste = 3; p.inv = 0.4;
        this.particles.push(...burst(p.x, p.y, 14, '#a8f0c6', this));
        sfx.buff();
      }
    }
    this.persist();
  }

  rollDamage() {
    const p = this.player;
    const jitter = rand(0.9, 1.12);
    return Math.max(1, Math.round(p.atk * jitter * (p.shield > 0 ? 1 : 1)));
  }
  wasCrit() { return Math.random() < this.player.cls.crit; }

  aoeDamage(x, y, r, dmg) {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (Math.hypot(e.x - x, e.y - y) <= r + e.r / this.pxPerUnit) this.damageEnemy(e, dmg, false);
    }
  }

  damageEnemy(e, dmg, crit) {
    const p = this.player;
    const final = Math.max(1, Math.round(dmg));
    e.hp -= final;
    e.hurt = 1;
    this.stats.dealt += final;
    this.floaters.push({ x: e.x + rand(-.2, .2), y: e.y - e.r / 10, v: final, t: 0, crit, kind: 'dmg' });
    this.particles.push(...burst(e.x, e.y, crit ? 8 : 4, e.type.color2, this));
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true;
    const t = e.type;
    this.kills.total++;
    this.gold = (this.gold || 0) + Math.round(t.gold * (1 + this.zoneIndex * 0.15));
    this.giveXp(t.xp);
    this.particles.push(...burst(e.x, e.y, t.boss ? 40 : 10, t.color, this));
    if (t.boss) { this.shake = 12; sfx.boss(); }
    else sfx.kill();
    if (Math.random() < (t.boss ? 1 : 0.22)) this.pickups.push({ x: e.x, y: e.y, kind: 'bag', t: 0 });
    if (Math.random() < 0.18) this.pickups.push({ x: e.x + rand(-.3, .3), y: e.y, kind: 'coin', t: 0 });
    this.enemies = this.enemies.filter((x) => x !== e);
    if (this.boss === e) this.boss = null;
    this.questEvent('kill', e.kind);
    if (t.boss) {
      this.questEvent('boss', this.zoneIndex);
      this.clearT = 2.4;
      UI.toast('👑 บอสพ่ายแล้ว! เคลียร์ด่านสำเร็จ', 'rgba(124,92,255,.95)');
    }
    this.persist();
  }

  enemyStrike(e) {
    const p = this.player;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d <= (e.type.range / this.pxPerUnit) * 1.25 && p.inv <= 0) this.damagePlayer(e.atk);
    this.addBlast(e.x, e.y, (e.type.range / this.pxPerUnit) * 1.1, 'hit', 0.2);
  }

  enemyShoot(e) {
    const p = this.player;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    this.projs.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 7.5, vy: Math.sin(ang) * 7.5, life: 2.4, dmg: e.atk, hostile: true, kind: 'dart' });
  }

  damagePlayer(dmg) {
    const p = this.player;
    if (p.inv > 0) return;
    let d = dmg * (p.shield > 0 ? 0.4 : 1);
    d = Math.max(1, Math.round(d));
    p.hp -= d; this.stats.taken += d;
    p.inv = 0.45; p.hurtFlash = 1;
    this.shake = 5; sfx.hurt();
    this.floaters.push({ x: p.x, y: p.y - 0.9, v: -d, t: 0, kind: 'hurt' });
    this.particles.push(...burst(p.x, p.y, 6, '#ff6b6b', this));
  }

  giveXp(n) {
    const p = this.player;
    p.xp += n;
    let need = xpNeeded(p.lv);
    while (p.xp >= need) {
      p.xp -= need; p.lv++;
      p.maxHp += 14; p.hp = p.maxHp; p.atk += 2.2;
      need = xpNeeded(p.lv);
      this.floaters.push({ x: p.x, y: p.y - 1.6, v: 'LEVEL UP!', t: 0, kind: 'level' });
      this.addBlast(p.x, p.y, 2.2, 'level', 0.8);
      UI.toast(`⬆️ เลเวล ${p.lv}! เก่งขึ้นแล้ว`, 'rgba(46,204,113,.92)');
      sfx.level();
    }
    UI.hud();
  }

  collect(q) {
    if (q.kind === 'bag') {
      this.gold = (this.gold || 0) + 5;
      this.questEvent('bag', this.zoneIndex);
      UI.hud();
      sfx.pick();
    } else {
      this.gold = (this.gold || 0) + 8;
      UI.hud(); sfx.pick();
    }
  }

  usePotion() {
    const p = this.player;
    if (!p) return;
    if (!this.potions) { UI.toast('ยาฟื้นเลือดหมดแล้ว — ซื้อที่ร้านค้า', 'rgba(220,120,60,.92)'); return; }
    if (p.hp >= p.maxHp) return;
    this.potions--;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
    this.floaters.push({ x: p.x, y: p.y - 1, v: '+HP', t: 0, kind: 'heal' });
    this.particles.push(...burst(p.x, p.y, 10, '#7cf2a6', this));
    UI.hud(); sfx.pick();
  }

  /* -------------------------------------------------------- quests */
  questEvent(type, value) {
    let changed = false;
    for (const q of this.quests) {
      if (q.done || q.type !== type) continue;
      if (type === 'kill' && q.zone !== this.zoneIndex) continue;
      if (type === 'bag' && q.zone !== this.zoneIndex) continue;
      if (type === 'boss' && q.target !== this.zoneIndex) continue;
      q.prog++;
      if (q.prog >= q.need) { q.done = true; this.questReward(q); }
      changed = true;
    }
    if (changed) { UI.hud(); this.persist(); }
  }

  questReward(q) {
    this.gold = (this.gold || 0) + q.gold;
    this.giveXp(q.xp);
    UI.toast(`✅ เควสต์สำเร็จ: ${q.text} (+${q.xp} XP, +${q.gold}G)`, 'rgba(46,204,113,.94)');
    sfx.quest();
  }

  zoneClearScreen() {
    const last = this.zoneIndex >= ZONES.length - 1;
    this.state = 'pause';
    try { UI.showClear(this, last); } catch (e) { console.warn(e); }
  }

  nextZone() {
    if (this.zoneIndex >= ZONES.length - 1) {
      this.state = 'win';
      this.persist();
      try { UI.showVictory(this); } catch (e) { console.warn(e); }
      return;
    }
    this.state = 'play';
    this.enterZone(this.zoneIndex + 1);
    this.lastT = now();
    try { UI.show('play'); } catch (e) {}
  }

  buy(id) {
    const item = SHOP.find((s) => s.id === id);
    if (!item) return false;
    let price = item.price;
    if (id === 'weapon') price = (item.base || 150) + (this.player.atkUp || 0) * (item.step || 120);
    if (id === 'armor') price = (item.base || 140) + (this.player.armorUp || 0) * (item.step || 110);
    if ((this.gold || 0) < price) { UI.toast('เงินไม่พอ 🌙', 'rgba(220,120,60,.92)'); return false; }
    this.gold -= price;
    if (id === 'potion') this.potions = (this.potions || 0) + 1;
    else if (id === 'elixir') { this.player.hp = this.player.maxHp; }
    else if (id === 'weapon') { this.player.atk += 3; this.player.atkUp = (this.player.atkUp || 0) + 1; }
    else if (id === 'armor') { this.player.maxHp += 18; this.player.hp += 18; this.player.armorUp = (this.player.armorUp || 0) + 1; }
    UI.hud(); this.persist(); sfx.pick();
    return true;
  }

  /* --------------------------------------------------------- save */
  persist() {
    if (!this.player) return;
    const p = this.player;
    const data = {
      v: 1, cls: p.cls.id, lv: p.lv, xp: p.xp, hp: p.hp, atk: p.atk, maxHp: p.maxHp,
      atkUp: p.atkUp || 0, armorUp: p.armorUp || 0, gold: this.gold || 0, potions: this.potions || 0,
      zone: this.zoneIndex, kills: this.kills.total, stats: this.stats,
      quests: this.quests.map(({ id, prog, done }) => ({ id, prog, done })),
    };
    try { localStorage.setItem('famai.campuswars.save', JSON.stringify(data)); } catch (e) {}
    this.save?.write(data);
  }

  loadFrom(data) {
    if (!data || !CLASSES[data.cls]) return false;
    this.gold = data.gold || 0;
    this.potions = data.potions || 0;
    this.zoneIndex = clamp(data.zone || 0, 0, ZONES.length - 1);
    this.kills = { total: data.kills || 0 };
    this.stats = data.stats || { dealt: 0, taken: 0, runs: 0 };
    this.player = this.makePlayer(data.cls);
    Object.assign(this.player, {
      lv: data.lv || 1, xp: data.xp || 0, maxHp: data.maxHp || this.player.maxHp,
      hp: data.hp || this.player.maxHp, atk: data.atk || this.player.atk,
      atkUp: data.atkUp || 0, armorUp: data.armorUp || 0,
    });
    if (data.quests) {
      for (const q of this.quests) {
        const s = data.quests.find((x) => x.id === q.id);
        if (s) { q.prog = s.prog; q.done = s.done; }
      }
    }
    this.state = 'play';
    this.enterZone(this.zoneIndex);
    return true;
  }

  reset() {
    try { localStorage.removeItem('famai.campuswars.save'); } catch (e) {}
    this.save?.clear();
    this.state = 'menu';
    this.player = null;
  }

  pause() { if (this.state === 'play') { this.state = 'pause'; this.notify('pause'); } }
  resume() { if (this.state === 'pause') { this.state = 'play'; this.lastT = now(); this.notify('play'); } }
  notify(screen) { try { UI.show(screen); } catch (err) { console.warn('[ui]', screen, err); } }

  gameOver() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    this.stats.runs++;
    sfx.dead();
    try { UI.showDead(this); } catch (err) { console.warn('[ui] dead', err); }
    this.persist();
  }

  respawn() {
    const p = this.player;
    p.hp = p.maxHp;
    this.enterZone(this.zoneIndex);
    this.state = 'play';
  }

  /* --------------------------------------------------------- fx ---- */
  addBlast(x, y, r, kind, delay, dmg, hostile) {
    this.blasts.push({ x, y, r, kind, t: 0, delay, dmg: dmg || 0, hostile: !!hostile, aoe: !!dmg });
  }
  screenToWorld(x, y) {
    return {
      x: (x - this.W / 2) / this.pxPerUnit + this.cam.x,
      y: (y - this.H / 2) / this.pxPerUnit + this.cam.y,
    };
  }

  /* -------------------------------------------------------- render */
  render(dt) {
    const ctx = this.ctx, W = this.W, H = this.H, S = this.pxPerUnit;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sh = this.shake;
    const sx = sh ? rand(-sh, sh) : 0, sy = sh ? rand(-sh, sh) : 0;

    drawBackground(ctx, this.zone, this.time, W, H);

    if (!this.player) { return; }

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(S * (this.worldZoom || 1), S * (this.worldZoom || 1));
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawMap(ctx);
    // pickups below actors
    for (const q of this.pickups) drawPickup(ctx, q, this.time);
    // shadow blasts first (telegraphs)
    for (const b of this.blasts) if (b.kind === 'warn') drawBlast(ctx, b);
    // actors sorted by y (fake depth)
    const actors = this.enemies.map((e) => ({ y: e.y, e })).sort((a, b) => a.y - b.y);
    for (const a of actors) drawEnemy(ctx, a.e, this.time);
    drawPlayer(ctx, this.player, this.time, this);   // player on top for touch readability
    // projectiles
    for (const pr of this.projs) drawProj(ctx, pr);
    for (const b of this.blasts) if (b.kind !== 'warn') drawBlast(ctx, b);
    for (const pa of this.particles) {
      const al = 1 - pa.t / pa.life;
      ctx.globalAlpha = Math.max(0, al);
      ctx.fillStyle = pa.color;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.r * al, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) drawFloater(ctx, f, S);
    ctx.restore();

    // night blade vignette
    if (this.player.hp / this.player.maxHp < 0.3) {
      const a = 0.18 + Math.sin(this.time * 6) * 0.05;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,40,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    if (this.state === 'play' || this.state === 'pause') this.drawHUDControls(ctx);
  }

  drawMap(ctx) {
    const m = this.map;
    ctx.fillStyle = this.zone.bg;
    ctx.fillRect(-m.halfW, -m.halfH, m.halfW * 2, m.halfH * 2);
    // path
    ctx.fillStyle = this.zone.accent;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(-1.8, -m.halfH, 3.6, m.halfH * 2);
    ctx.globalAlpha = 1;
    // walls / props
    for (const w of m.blocks) {
      ctx.fillStyle = this.zone.wall;
      roundRect(ctx, w.x, w.y, w.w, w.h, 0.25); ctx.fill();
      ctx.fillStyle = this.zone.wallTop;
      roundRect(ctx, w.x, w.y, w.w, Math.min(0.35, w.h * 0.4), 0.2); ctx.fill();
    }
    // spawn mark
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 0.12;
    ctx.beginPath(); ctx.arc(m.spawn.x, m.spawn.y, 1.2, 0, TAU); ctx.stroke();
  }

  drawHUDControls(ctx) {
    const L = this.layout, t = this.time;
    // joystick
    const j = this.joystick;
    const ox = j.active ? j.ox : L.jx, oy = j.active ? j.oy : L.jy;
    ctx.save();
    ctx.globalAlpha = j.active ? 0.95 : 0.5;
    ctx.beginPath(); ctx.arc(ox, oy, L.jr, 0, TAU);
    ctx.fillStyle = 'rgba(12,16,28,.42)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.stroke();
    const kx = j.active ? j.x : ox, ky = j.active ? j.y : oy;
    const kg = ctx.createRadialGradient(kx, ky - 6, 2, kx, ky, L.jr * 0.46);
    kg.addColorStop(0, '#cfd8ff'); kg.addColorStop(1, '#7c5cff');
    ctx.beginPath(); ctx.arc(kx, ky, L.jr * 0.46, 0, TAU); ctx.fillStyle = kg; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(L.jr * 0.42)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('✥', ox, oy + 1);
    ctx.restore();

    // attack button
    const pulse = 1 + Math.sin(t * 3.2) * 0.02;
    ctx.save();
    const ag = ctx.createRadialGradient(L.atkX, L.atkY - L.atkR * 0.3, 4, L.atkX, L.atkY, L.atkR);
    ag.addColorStop(0, '#8b6dff'); ag.addColorStop(1, '#4a2fbf');
    ctx.beginPath(); ctx.arc(L.atkX, L.atkY, L.atkR * pulse, 0, TAU);
    ctx.fillStyle = ag; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    ctx.font = `${Math.round(L.atkR * 0.72)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText('⚔️', L.atkX, L.atkY + 2);
    ctx.restore();

    // skill buttons
    const p = this.player;
    for (let i = 0; i < 2; i++) {
      const b = i === 0 ? L.s1 : L.s2, sk = p.cls.skills[i];
      const locked = p.lv < sk.lv;
      const cd = p.cds[i], ready = cd <= 0 && !locked;
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fillStyle = locked ? 'rgba(40,44,60,.55)' : ready ? 'rgba(30,180,120,.85)' : 'rgba(24,28,44,.75)';
      ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = ready ? 'rgba(180,255,220,.9)' : 'rgba(255,255,255,.22)'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(b.r * 0.85)}px system-ui`;
      ctx.globalAlpha = locked ? 0.45 : 1;
      ctx.fillText(locked ? '🔒' : sk.icon, b.x, b.y + 1);
      ctx.globalAlpha = 1;
      if (cd > 0) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd / sk.cd));
        ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
      }
      if (locked) {
        ctx.font = '11px system-ui'; ctx.fillStyle = '#ffd166';
        ctx.fillText('Lv.' + sk.lv, b.x, b.y + b.r + 12);
      }
      ctx.restore();
    }

    // potion
    const b = L.pot;
    ctx.save();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = 'rgba(46,204,113,.22)'; ctx.fill();
    ctx.strokeStyle = 'rgba(168,240,198,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `${Math.round(b.r * 0.9)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🧪', b.x, b.y + 1);
    ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText('x' + (this.potions || 0), b.x, b.y + b.r - 3);
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- map */
function buildMap(zone) {
  const halfW = zone.size.w / 2, halfH = zone.size.h / 2;
  const blocks = [];
  const P = 1; // padding from edge
  const add = (x, y, w, h) => blocks.push({ x, y, w, h });
  // border walls
  add(-halfW, -halfH, halfW * 2, P);
  add(-halfW, halfH - P, halfW * 2, P);
  add(-halfW, -halfH, P, halfH * 2);
  add(halfW - P, -halfH, P, halfH * 2);

  const rand = (a, b) => a + Math.random() * (b - a);
  if (zone.theme === 'yard') {
    for (let i = 0; i < 6; i++) {
      const w = rand(2.2, 3.6), h = rand(1.6, 2.6);
      add(rand(-halfW + 3, -2.6), rand(-halfH + 4, halfH - 6), w, h);
      add(rand(2.6, halfW - 3 - w), rand(-halfH + 4, halfH - 6), w, h);
    }
  } else if (zone.theme === 'building') {
    // corridor with rooms
    add(-halfW + 2, -halfH + 6, halfW * 2 - 4, 1.2);   // wall
    for (let i = 0; i < 7; i++) {
      const y = -halfH + 9 + i * 4.4;
      add(-halfW + 2.4, y, rand(3, 5), 1.6);
      add(halfW - 2.4 - rand(3, 5) * 1, y + 1.2, rand(3, 5), 1.6);
    }
  } else {
    // rooftop: crates + vents
    for (let i = 0; i < 12; i++) {
      const s = rand(1.2, 2.4);
      add(rand(-halfW + 2, halfW - 2 - s), rand(-halfH + 3, halfH - 3 - s), s, s);
    }
  }
  const blocked = (x, y, r = 0) => {
    if (Math.abs(x) + r > halfW || Math.abs(y) + r > halfH) return true;
    for (const b of blocks) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  };
  return { halfW, halfH, blocks, blocked, spawn: { x: 0, y: halfH - 5.5 } };
}

/* ------------------------------------------------------------- draw */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBackground(ctx, zone, t, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(zone.bg, 0.55));
  g.addColorStop(0.55, zone.bg);
  g.addColorStop(1, shade(zone.bg, -0.35));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars / lamps
  ctx.save();
  const seed = zone.id * 7.3;
  for (let i = 0; i < 46; i++) {
    const x = ((i * 977 + seed * 131) % 1000) / 1000 * W;
    const y = ((i * 613 + seed * 419) % 700) / 700 * H * 0.62;
    const a = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8 + i));
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = '#dfe7ff';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, k = Math.abs(amt);
  r = Math.round(r + (f - r) * k); g = Math.round(g + (f - g) * k); b = Math.round(b + (f - b) * k);
  return `rgb(${r},${g},${b})`;
}

function drawPlayer(ctx, p, t, game) {
  const bob = Math.sin(p.anim) * 0.09;
  const c = p.cls;
  ctx.save();
  ctx.translate(p.x, p.y);
  // shadow
  ctx.beginPath(); ctx.ellipse(0, 0.15, 0.55, 0.22, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fill();
  // shield ring
  if (p.shield > 0) {
    ctx.beginPath(); ctx.arc(0, -0.1, 0.95, 0, TAU);
    ctx.strokeStyle = 'rgba(120,200,255,.8)'; ctx.lineWidth = 0.12; ctx.stroke();
  }
  if (p.inv > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.6;

  const bodyY = -0.55 + bob;
  // legs
  const swing = p.moving ? Math.sin(p.anim) * 0.22 : 0;
  ctx.strokeStyle = shade(c.color, -0.45); ctx.lineWidth = 0.18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.12, -0.28); ctx.lineTo(-0.12 + swing, 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.12, -0.28); ctx.lineTo(0.12 - swing, 0.02); ctx.stroke();

  // torso
  const bg = ctx.createLinearGradient(0, bodyY - 0.5, 0, bodyY + 0.45);
  bg.addColorStop(0, c.color2); bg.addColorStop(1, c.color);
  roundRect(ctx, -0.30, bodyY - 0.38, 0.60, 0.68, 0.2);
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 0.05; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();

  // head
  ctx.beginPath(); ctx.arc(0, bodyY - 0.58, 0.26, 0, TAU);
  ctx.fillStyle = '#ffd9b3'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.04; ctx.stroke();
  // hair
  ctx.beginPath(); ctx.arc(0, bodyY - 0.66, 0.26, Math.PI, TAU);
  ctx.fillStyle = '#2a2333'; ctx.fill();

  // eyes
  ctx.fillStyle = '#2a2333';
  ctx.beginPath(); ctx.arc(p.face * 0.07, bodyY - 0.6, 0.045, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.face * 0.17, bodyY - 0.6, 0.045, 0, TAU); ctx.fill();

  // weapon
  const wSwing = Math.sin(p.anim * 1.6) * 0.25;
  ctx.save();
  ctx.translate(p.face * 0.34, bodyY - 0.05);
  ctx.rotate((p.face > 0 ? -0.5 : Math.PI + 0.5) + wSwing * (p.moving ? 1 : 0.4));
  if (c.id === 'warrior') {
    ctx.fillStyle = '#dfe6f5'; ctx.fillRect(-0.04, -0.62, 0.09, 0.62);
    ctx.fillStyle = '#b98a4b'; ctx.fillRect(-0.08, -0.05, 0.17, 0.16);
  } else if (c.id === 'mage') {
    ctx.strokeStyle = '#b98a4b'; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.lineTo(0, -0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.62, 0.12, 0, TAU);
    ctx.fillStyle = '#b39dff'; ctx.fill();
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5);
    ctx.beginPath(); ctx.arc(0, -0.62, 0.2, 0, TAU); ctx.fillStyle = '#7c5cff'; ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = '#b98a4b'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.arc(0, -0.05, 0.3, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#e8eefc'; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(0.26, -0.3); ctx.lineTo(0.26, 0.2); ctx.stroke();
  }
  ctx.restore();
  if (p.hurtFlash > 0) {
    ctx.globalAlpha = p.hurtFlash * 0.5;
    ctx.beginPath(); ctx.arc(0, -0.4, 0.7, 0, TAU); ctx.fillStyle = '#ff4d4d'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnemy(ctx, e, t) {
  const ty = e.type;
  const bob = Math.sin(e.anim) * 0.08;
  const S = 1 + (e.r / 34) * 0.55;              // silhouette scale
  ctx.save();
  ctx.translate(e.x, e.y);

  // shadow
  ctx.beginPath(); ctx.ellipse(0, 0.12, 0.5 * S, 0.2 * S, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();

  const bodyY = -0.5 * S + bob;
  const hurt = e.hurt > 0;

  // legs
  const swing = Math.sin(e.anim) * 0.16;
  ctx.strokeStyle = 'rgba(12,8,18,.75)'; ctx.lineWidth = 0.16 * S; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.12 * S, -0.22 * S); ctx.lineTo(-0.12 * S + swing, 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.12 * S, -0.22 * S); ctx.lineTo(0.12 * S - swing, 0.02); ctx.stroke();

  // torso
  const bg = ctx.createLinearGradient(0, bodyY - 0.4 * S, 0, bodyY + 0.4 * S);
  bg.addColorStop(0, hurt ? '#ffffff' : ty.color2);
  bg.addColorStop(1, hurt ? '#ffd0d0' : ty.color);
  roundRect(ctx, -0.28 * S, bodyY - 0.34 * S, 0.56 * S, 0.62 * S, 0.22 * S);
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 0.05; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();

  // arms
  ctx.strokeStyle = hurt ? '#ffd0d0' : ty.color; ctx.lineWidth = 0.13 * S;
  ctx.beginPath(); ctx.moveTo(-0.26 * S, bodyY - 0.14 * S); ctx.lineTo(-0.42 * S, bodyY + 0.12 * S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.26 * S, bodyY - 0.14 * S); ctx.lineTo(0.44 * S, bodyY + 0.06 * S); ctx.stroke();

  // weapon in hand (bat / dart)
  ctx.save();
  ctx.translate(0.44 * S, bodyY + 0.04 * S);
  ctx.rotate(e.face > 0 ? 0.5 : -0.5);
  if (ty.boss) {
    ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.05, -0.9, 0.11, 0.9);
  } else if (ty.proj) {
    ctx.strokeStyle = '#e8eefc'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.lineTo(0, -0.3); ctx.stroke();
  } else {
    ctx.fillStyle = '#a97142'; roundRect(ctx, -0.05, -0.55, 0.11, 0.62, 0.05); ctx.fill();
    ctx.fillStyle = '#8a5a30'; roundRect(ctx, -0.08, -0.62, 0.17, 0.14, 0.05); ctx.fill();
  }
  ctx.restore();

  // head
  const hy = bodyY - 0.56 * S;
  ctx.beginPath(); ctx.arc(0, hy, 0.26 * S, 0, TAU);
  ctx.fillStyle = hurt ? '#fff' : '#f0c9a8'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.04; ctx.stroke();
  // hair / cap
  ctx.beginPath(); ctx.arc(0, hy - 0.05 * S, 0.26 * S, Math.PI * 0.98, TAU * 0.99);
  ctx.fillStyle = ty.boss ? '#3a0f22' : '#241a2b'; ctx.fill();
  // eyes
  const ex = e.face * 0.05 * S;
  ctx.fillStyle = ty.boss ? '#ff5252' : '#1a1024';
  ctx.beginPath(); ctx.arc(ex - 0.085 * S, hy + 0.02 * S, 0.05 * S, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 0.085 * S, hy + 0.02 * S, 0.05 * S, 0, TAU); ctx.fill();
  // angry brows
  ctx.strokeStyle = '#1a1024'; ctx.lineWidth = 0.035 * S;
  ctx.beginPath(); ctx.moveTo(ex - 0.15 * S, hy - 0.09 * S); ctx.lineTo(ex - 0.03 * S, hy - 0.04 * S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex + 0.15 * S, hy - 0.09 * S); ctx.lineTo(ex + 0.03 * S, hy - 0.04 * S); ctx.stroke();

  if (ty.boss) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(-0.3 * S, hy - 0.24 * S); ctx.lineTo(-0.19 * S, hy - 0.44 * S); ctx.lineTo(-0.08 * S, hy - 0.26 * S);
    ctx.lineTo(0, hy - 0.5 * S); ctx.lineTo(0.08 * S, hy - 0.26 * S); ctx.lineTo(0.19 * S, hy - 0.44 * S);
    ctx.lineTo(0.3 * S, hy - 0.24 * S); ctx.closePath(); ctx.fill();
  }
  if (e.stun > 0) {
    ctx.font = `${0.5 * S}px system-ui`; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166'; ctx.fillText('💫', 0, hy - 0.7 * S);
  }
  ctx.restore();

  // hp bar
  if (e.hp < e.maxHp || ty.boss) {
    const w = (ty.boss ? 2.0 : 0.72) * S;
    const x = e.x - w / 2, y = e.y - (0.9 * S) - 0.55;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, x, y, w, 0.15, 0.075); ctx.fill();
    ctx.fillStyle = ty.boss ? '#ff7043' : '#ff5a5a';
    roundRect(ctx, x, y, w * Math.max(0, e.hp / e.maxHp), 0.15, 0.075); ctx.fill();
  }
}

function drawProj(ctx, pr) {
  ctx.save();
  ctx.translate(pr.x, pr.y);
  const ang = Math.atan2(pr.vy, pr.vx);
  ctx.rotate(ang);
  if (pr.kind === 'arrow') {
    ctx.strokeStyle = '#d7f7e0'; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(0.25, 0); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0.32, 0); ctx.lineTo(0.14, -0.09); ctx.lineTo(0.14, 0.09); ctx.closePath(); ctx.fill();
  } else if (pr.kind === 'bolt') {
    const g = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.2);
    g.addColorStop(0, '#fff'); g.addColorStop(1, pr.hostile ? '#b06bff' : '#7c5cff');
    ctx.beginPath(); ctx.arc(0, 0, 0.16, 0, TAU); ctx.fillStyle = g; ctx.fill();
  } else if (pr.kind === 'fire') {
    const g = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.26);
    g.addColorStop(0, '#fff6c4'); g.addColorStop(1, '#ff7a18');
    ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, TAU); ctx.fillStyle = g; ctx.fill();
  } else {
    ctx.fillStyle = pr.hostile ? '#ff9ecb' : '#fff';
    ctx.beginPath(); ctx.moveTo(0.2, 0); ctx.lineTo(-0.12, -0.07); ctx.lineTo(-0.12, 0.07); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawBlast(ctx, b) {
  const k = Math.min(1, b.t / b.delay);
  ctx.save();
  if (b.kind === 'warn') {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = `rgba(255,70,70,${0.10 + 0.12 * Math.sin(b.t * 18)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,90,${0.5 * (1 - k) + 0.3})`; ctx.lineWidth = 0.09;
    ctx.stroke();
  } else if (b.kind === 'slash') {
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.7 + k * 0.5), -0.9, 0.9); ctx.stroke();
  } else if (b.kind === 'shock') {
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k, 0, TAU); ctx.stroke();
  } else if (b.kind === 'ice') {
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k, 0, TAU); ctx.stroke();
  } else if (b.kind === 'shield') {
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 0.14;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.6 + k * 0.4), 0, TAU); ctx.stroke();
  } else if (b.kind === 'level') {
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#7cf2a6'; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k * 0.6, 0, TAU); ctx.stroke();
  } else {
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.4 + k * 0.6), 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
  }
  ctx.restore();
}

function drawPickup(ctx, q, t) {
  const bob = Math.sin(t * 3 + q.x) * 0.08;
  ctx.save();
  ctx.translate(q.x, q.y + bob);
  ctx.beginPath(); ctx.ellipse(0, 0.22, 0.28, 0.1, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
  if (q.kind === 'bag') {
    roundRect(ctx, -0.22, -0.3, 0.44, 0.42, 0.1);
    ctx.fillStyle = '#e8b04b'; ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,10,.6)'; ctx.lineWidth = 0.04; ctx.stroke();
    ctx.strokeStyle = '#8a5a20'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(0, -0.3, 0.11, Math.PI, TAU); ctx.stroke();
  } else {
    const g = ctx.createRadialGradient(0, -0.08, 0.01, 0, -0.08, 0.2);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#e8a41b');
    ctx.beginPath(); ctx.arc(0, -0.08, 0.17, 0, TAU); ctx.fillStyle = g; ctx.fill();
  }
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4 + q.y);
  ctx.beginPath(); ctx.arc(0, -0.05, 0.34, 0, TAU);
  ctx.fillStyle = q.kind === 'bag' ? '#ffd166' : '#ffe37a'; ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFloater(ctx, f, S) {
  const k = f.t / 0.9;
  ctx.save();
  ctx.globalAlpha = 1 - k * k;
  ctx.textAlign = 'center';
  if (f.kind === 'dmg') {
    ctx.font = `${f.crit ? 0.72 : 0.52}px system-ui`;
    ctx.fillStyle = f.crit ? '#ffd166' : '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 0.07;
    ctx.strokeText(String(f.v), f.x, f.y); ctx.fillText(String(f.v), f.x, f.y);
  } else if (f.kind === 'hurt') {
    ctx.font = '0.56px system-ui'; ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 0.06;
    ctx.strokeText(String(f.v), f.x, f.y); ctx.fillText(String(f.v), f.x, f.y);
  } else if (f.kind === 'heal') {
    ctx.font = '0.5px system-ui'; ctx.fillStyle = '#7cf2a6'; ctx.fillText(f.v, f.x, f.y);
  } else {
    ctx.font = '0.6px system-ui'; ctx.fillStyle = '#7cf2a6';
    ctx.fillText(f.v, f.x, f.y);
  }
  ctx.restore();
}

function burst(x, y, n, color, game) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rand(0.6, 3.2);
    out.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6,
      g: -2.2, r: rand(0.05, 0.14), color, t: 0, life: rand(0.35, 0.75), dead: false,
    });
  }
  return out;
}
