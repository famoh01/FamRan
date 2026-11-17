/* =========================================================
   Fam Ai · Campus Wars — DOM UI layer (screens, HUD, menus)
   ========================================================= */
import { CLASSES, ZONES, SHOP, QUESTS, TIPS, xpNeeded, BRAND, TITLE } from './data.js';
import { sfx } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => (n | 0).toLocaleString('en-US');

const UI = {
  game: null,
  screen: 'boot',

  build() {
    if (this.el) return;
    this.el = {
      screens: $$('.screen'),
      hpbar: $('#hp-fill'), hptxt: $('#hp-text'), mpbar: $('#xp-fill'), lvtxt: $('#lv-text'),
      gold: $('#gold'), potions: $('#potion-count'), questTitle: $('#quest-title'),
      questFill: $('#quest-fill'), questProg: $('#quest-prog'),
      toast: $('#toast'), boss: $('#boss-wrap'), bossfill: $('#boss-fill'), bossname: $('#boss-name'),
      hud: $('#hud'),
    };
  },

  init(game) {
    this.game = game;
    this.build();
    this.bindMenus();
    setTimeout(() => this.show('menu'), 550);
    this.rotateTip();
  },

  show(name) {
    this.screen = name;
    this.build();
    for (const s of this.el.screens) s.classList.toggle('active', s.dataset.screen === name);
    this.el.hud.classList.toggle('hidden', !(name === 'play' || name === 'pause'));
    document.body.classList.toggle('in-game', name === 'play');
    if (name === 'menu') this.refreshMenu();
    if (name === 'play') this.hud();
    if (name === 'pause') this.refreshPause();
    sfx.ui();
  },

  /* ------------------------------------------------------- menus */
  bindMenus() {
    const g = this.game;

    // class picker
    $$('#class-list .class-card').forEach((card) => {
      card.addEventListener('click', () => {
        $$('#class-list .class-card').forEach((c) => c.classList.remove('sel'));
        card.classList.add('sel');
        const id = card.dataset.cls;
        $('#class-detail').innerHTML = renderClassDetail(CLASSES[id]);
        $('#btn-continue').disabled = false;
        this.picked = id;
        sfx.ui();
      });
    });
    $('#btn-continue').addEventListener('click', () => {
      if (!this.picked) return;
      sfx.unlock();
      this.show('play');
      g.newGame(this.picked);
    });
    $('#btn-newgame').addEventListener('click', () => { this.show('classpick'); this.picked = null; $('#btn-continue').disabled = true; $$('#class-list .class-card').forEach((c) => c.classList.remove('sel')); $('#class-detail').innerHTML = ''; });
    $('#btn-resume').addEventListener('click', () => { this.show('play'); if (g.state !== 'play') { g.state = 'play'; g.lastT = performance.now() / 1000; } });
    $('#btn-settings').addEventListener('click', () => { this.show('settings'); this.refreshSettings(); });
    $('#btn-about').addEventListener('click', () => this.show('about'));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => { this.show('menu'); }));

    // pause
    $('#btn-pause').addEventListener('click', () => g.pause());
    $('#p-resume').addEventListener('click', () => { g.resume(); this.show('play'); });
    $('#p-shop').addEventListener('click', () => { this.show('shop'); this.refreshShop(); });
    $('#p-quests').addEventListener('click', () => { this.show('quests'); this.refreshQuests(); });
    $('#p-settings').addEventListener('click', () => { this.show('settings'); this.refreshSettings(); });
    $('#p-quit').addEventListener('click', () => { g.pause(); this.show('menu'); });

    // shop / quests
    $('#shop-close').addEventListener('click', () => { this.show(g.state === 'pause' ? 'pause' : 'play'); if (g.state === 'pause') this.refreshPause(); });
    $('#quests-close').addEventListener('click', () => { this.show(g.state === 'pause' ? 'pause' : 'play'); if (g.state === 'pause') this.refreshPause(); });
    $('#shop-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-buy]');
      if (!b) return;
      if (g.buy(b.dataset.buy)) this.refreshShop();
    });

    // settings
    $('#set-mute').addEventListener('change', (e) => { sfx.setMuted(e.target.checked); this.saveSettings(); });
    $('#set-vibe').addEventListener('change', () => this.saveSettings());
    $('#set-reset').addEventListener('click', () => {
      if (confirm('ล้างเซฟทั้งหมด แล้วเริ่มใหม่?')) { g.reset(); this.show('menu'); }
    });

    // zone clear / victory
    $('#c-next').addEventListener('click', () => g.nextZone());
    $('#c-shop2').addEventListener('click', () => { this.show('shop'); this.refreshShop(); });
    $('#v-again').addEventListener('click', () => { this.show('classpick'); });
    $('#v-menu').addEventListener('click', () => this.show('menu'));

    // dead screen
    $('#d-retry').addEventListener('click', () => { g.respawn(); this.show('play'); });
    $('#d-menu').addEventListener('click', () => { this.show('menu'); });

    // zones switch (dev/test helper in shop list header)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F2' && g.state === 'play') { g.enterZone((g.zoneIndex + 1) % ZONES.length); }
    });
  },

  refreshMenu() {
    const g = this.game;
    const save = this.loadSave();
    const box = $('#continue-box');
    if (save && CLASSES[save.cls]) {
      const c = CLASSES[save.cls];
      box.innerHTML = `
        <div class="save-line">
          <div class="save-badge" style="--c1:${c.color};--c2:${c.color2}">${c.icon}</div>
          <div>
            <div class="save-name">${c.name} · Lv.${save.lv}</div>
            <div class="save-sub">${ZONES[save.zone || 0].name} · ${fmt(save.gold || 0)} 🌙 · ${fmt(save.kills || 0)} กำจัด</div>
          </div>
        </div>`;
      box.classList.remove('hidden');
      $('#btn-resume').classList.remove('hidden');
      $('#btn-resume').style.display = 'flex';
    } else {
      box.innerHTML = '';
      box.classList.add('hidden');
      $('#btn-resume').classList.add('hidden');
      $('#btn-resume').style.display = 'none';
    }
    $('#menu-tip').textContent = TIPS[(Math.random() * TIPS.length) | 0];
  },

  refreshPause() {
    const g = this.game, p = g.player;
    if (!p) return;
    $('#pause-stats').innerHTML = `
      <div><b>${p.cls.name}</b></div>
      <div>Lv.${p.lv} · ATK ${Math.round(p.atk)} · HP ${Math.round(p.maxHp)}</div>
      <div>${fmt(g.gold || 0)} 🌙 · ${fmt(g.kills.total)} กำจัด · ${ZONES[g.zoneIndex].name}</div>`;
  },

  refreshShop() {
    const g = this.game, p = g.player;
    $('#shop-gold').textContent = fmt(g.gold || 0);
    const wPrice = 150 + (p.atkUp || 0) * 120;
    const aPrice = 140 + (p.armorUp || 0) * 110;
    $('#shop-list').innerHTML = SHOP.map((s) => {
      const price = s.id === 'weapon' ? wPrice : s.id === 'armor' ? aPrice : s.price;
      const can = (g.gold || 0) >= price;
      const lvTxt = s.id === 'weapon' ? `Lv.${(p.atkUp || 0) + 1}` : s.id === 'armor' ? `Lv.${(p.armorUp || 0) + 1}` : '';
      return `<button class="shop-row ${can ? '' : 'poor'}" data-buy="${s.id}">
        <span class="shop-ico">${s.icon}</span>
        <span class="shop-txt"><b>${s.name}</b><i>${s.desc}${lvTxt ? ' · ' + lvTxt : ''}</i></span>
        <span class="shop-price">${fmt(price)} 🌙</span>
      </button>`;
    }).join('');
  },

  refreshQuests() {
    const g = this.game;
    const list = $('#quest-list');
    list.innerHTML = g.quests.map((q) => {
      const done = q.done;
      const active = !done && q.zone === g.zoneIndex;
      return `<div class="quest-row ${done ? 'done' : active ? 'active' : 'locked'}">
        <div class="q-check">${done ? '✅' : active ? '▸' : '🔒'}</div>
        <div class="q-main"><b>${q.text}</b>
          <div class="q-bar"><i style="width:${Math.min(100, (q.prog / q.need) * 100)}%"></i></div>
          <i class="q-sub">${Math.min(q.prog, q.need)}/${q.need} · +${q.xp} XP · +${q.gold} 🌙</i>
        </div>
      </div>`;
    }).join('');
  },

  refreshSettings() {
    $('#set-mute').checked = sfx.isMuted();
    const s = this.loadSettings();
    $('#set-vibe').checked = s.vibe !== false;
  },
  saveSettings() {
    const s = { mute: $('#set-mute').checked, vibe: $('#set-vibe').checked };
    try { localStorage.setItem('famai.campuswars.settings', JSON.stringify(s)); } catch (e) {}
    sfx.setMuted(s.mute);
  },
  loadSettings() {
    try { return JSON.parse(localStorage.getItem('famai.campuswars.settings') || '{}'); } catch (e) { return {}; }
  },
  loadSave() {
    try { return JSON.parse(localStorage.getItem('famai.campuswars.save') || 'null'); } catch (e) { return null; }
  },

  /* --------------------------------------------------------- HUD */
  hud() {
    const g = this.game, p = g.player;
    if (!p) return;
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this.el.hpbar.style.width = (hpPct * 100).toFixed(1) + '%';
    this.el.hpbar.style.background = hpPct > 0.5 ? 'linear-gradient(90deg,#2ecc71,#7cf2a6)' : hpPct > 0.25 ? 'linear-gradient(90deg,#f5a623,#ffd166)' : 'linear-gradient(90deg,#e74c3c,#ff7676)';
    this.el.hptxt.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;
    const need = xpNeeded(p.lv);
    this.el.mpbar.style.width = Math.min(100, (p.xp / need) * 100).toFixed(1) + '%';
    this.el.lvtxt.textContent = 'Lv.' + p.lv;
    this.el.gold.textContent = fmt(g.gold || 0);
    this.el.potions.textContent = 'x' + (g.potions || 0);
    // current quest
    const q = g.quests.find((x) => !x.done && x.zone === g.zoneIndex) || g.quests.find((x) => !x.done);
    if (q) {
      this.el.questTitle.textContent = q.text;
      this.el.questFill.style.width = Math.min(100, (q.prog / q.need) * 100) + '%';
      this.el.questProg.textContent = `${Math.min(q.prog, q.need)}/${q.need}`;
    } else {
      this.el.questTitle.textContent = 'ครบทุกเควสต์แล้ว! 🎉';
      this.el.questFill.style.width = '100%';
      this.el.questProg.textContent = '100%';
    }
    // boss bar
    const boss = g.boss;
    if (boss && boss.hp > 0) {
      this.el.boss.classList.remove('hidden');
      this.el.bossfill.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
      this.el.bossname.textContent = boss.type.name;
    } else this.el.boss.classList.add('hidden');
  },

  showZone(zone, i) {
    const b = $('#zone-card');
    b.innerHTML = `<div class="z-name">${zone.name}</div>
      <div class="z-sub">${zone.sub} · ด่าน ${i + 1}/${ZONES.length}</div>
      <div class="z-boss">${zone.id === ZONES.length - 1 ? '⚠️ บอสใหญ่รออยู่ที่ปลายทาง' : '👑 บอส: ' + (zone.boss === 'boss1' ? 'หัวหน้าแก๊งปี 3' : 'ครูใหญ่เงา')}</div>`;
    b.classList.remove('hidden');
    b.classList.add('show');
    clearTimeout(this._zt);
    this._zt = setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.classList.add('hidden'), 500); }, 1900);
  },

  toast(msg, bg = 'rgba(30,36,54,.94)') {
    const t = this.el.toast;
    t.textContent = msg;
    t.style.background = bg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 2100);
  },

  rotateTip() {
    const el = $('#loading-tip');
    let i = 0;
    this._tip = setInterval(() => {
      if (!el || this.screen !== 'boot') return clearInterval(this._tip);
      el.textContent = TIPS[i++ % TIPS.length];
    }, 1400);
  },

  showClear(g, last) {
    $('#clear-title').textContent = last ? 'ด่านสุดท้ายเคลียร์แล้ว!' : `เคลียร์ ${ZONES[g.zoneIndex].name} แล้ว!`;
    $('#clear-sub').textContent = last ? 'ราชาโรงเรียนพ่าย… แต่ยังมีมุมมืดให้ลุยอีก' : 'ประตูสู่ด่านถัดไปเปิดแล้ว';
    $('#clear-stats').innerHTML = `
      <div><b>${g.player.cls.name}</b> · Lv.${g.player.lv}</div>
      <div>กำจัดทั้งหมด ${fmt(g.kills.total)} · 🌙 ${fmt(g.gold || 0)}</div>
      <div>ดาเมจ ${fmt(g.stats.dealt)} · รับ ${fmt(g.stats.taken)}</div>`;
    $('#c-next').textContent = last ? '▶ ดูบทสรุป' : `▶ ไป ${ZONES[g.zoneIndex + 1].name}`;
    this.show('clear');
  },

  showVictory(g) {
    $('#victory-stats').innerHTML = `
      <div><b>${g.player.cls.name}</b> · Lv.${g.player.lv}</div>
      <div>กำจัด ${fmt(g.kills.total)} · 🌙 ${fmt(g.gold || 0)}</div>
      <div>ดาเมจรวม ${fmt(g.stats.dealt)} · รับไป ${fmt(g.stats.taken)}</div>
      <div>เล่นไป ${Math.round(g.playTime || 0)} วินาที</div>`;
    this.show('victory');
  },

  showDead(g) {
    $('#dead-stats').innerHTML = `
      <div class="ds"><b>${ZONES[g.zoneIndex].name}</b></div>
      <div class="ds">เลเวล ${g.player.lv} · กำจัด ${fmt(g.kills.total)} · 🌙 ${fmt(g.gold || 0)}</div>
      <div class="ds small">ดาเมจที่ทำได้ ${fmt(g.stats.dealt)} · รับไป ${fmt(g.stats.taken)}</div>`;
    this.show('dead');
  },
};

function renderClassDetail(c) {
  return `<div class="cd">
    <div class="cd-head"><span class="cd-ico" style="--c1:${c.color};--c2:${c.color2}">${c.icon}</span>
      <div><b>${c.name}</b><i>${c.en}</i></div></div>
    <p class="cd-desc">${c.desc}</p>
    <div class="cd-stats">
      <div><span>HP</span><b>${c.hp}</b></div>
      <div><span>ATK</span><b>${c.atk}</b></div>
      <div><span>SPD</span><b>${c.spd}</b></div>
      <div><span>RANGE</span><b>${c.range}</b></div>
    </div>
    <div class="cd-skills">${c.skills.map((s) => `<div class="sk"><span>${s.icon}</span><div><b>${s.name}</b><i>Lv.${s.lv} · ${s.desc}</i></div></div>`).join('')}</div>
  </div>`;
}

export { UI };
export default UI;
