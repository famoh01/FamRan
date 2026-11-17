# 🎮 FamRan — เกมแรน โมบาย (Fam Ai · Campus Wars)

เกมอาร์เคดแนว "โรงเรียนป่วน" — เล่นบนมือถือแนวตั้งด้วยนิ้วอย่างเดียว
**มีไฟล์ APK พร้อมติดตั้ง** และเล่นบนเว็บได้ (ออฟไลน์ 100%)

> เกมนี้ **สร้างใหม่ทั้งหมด** ด้วย HTML5 Canvas + WebView wrapper
> ไม่ได้คอมไพล์จากโปรเจกต์ Unity `RanMobileCampusWars.rar`
> (รายละเอียดใน [docs/LIMITS-TH.md](docs/LIMITS-TH.md))

---

## 📥 ดาวน์โหลด / ติดตั้ง

### มือถือ Android (แนะนำ)
**[`releases/FamAi_CampusWars.apk`](releases/FamAi_CampusWars.apk)** — 170 KB
- Android **7.0 ขึ้นไป** (minSdk 24 / targetSdk 34)
- เซ็นด้วย APK Signature Scheme **v2 + v3**
- ออฟไลน์ 100% · ไม่มีโฆษณา · ไม่เก็บข้อมูล

**วิธีติดตั้ง**
1. ดาวน์โหลด `FamAi_CampusWars.apk` ลงมือถือ
2. เปิดไฟล์ → ถามให้ "อนุญาตติดตั้งจากแหล่งที่ไม่รู้จัก" → อนุญาต
3. กดติดตั้ง → เปิดแอป **Fam Ai Campus Wars**

### เล่นบนเว็บ / PWA
```bash
cd game/www
python3 -m http.server 8080
# เปิด http://localhost:8080
```
ติดตั้งเป็น PWA ได้ (Add to Home Screen) — มี `manifest.webmanifest` + service worker

---

## 🎯 วิธีเล่น

| ปุ่ม | การทำงาน |
|---|---|
| **จอยซ้าย** | ลากนิ้วเพื่อเดิน (พื้นที่ทั้งครึ่งซ้ายล่างใช้ได้) |
| **ปุ่ม ⚔️ ใหญ่ขวา** | กดค้าง = โจมตีต่อเนื่อง |
| **ปุ่มสกิล 2 ปุ่ม** | ปลดที่ Lv.2 และ Lv.4 (มีวงแหวนคูลดาวน์) |
| **🧪** | กินยาฟื้นเลือด |
| **⏸** | พัก / ร้านค้า / เควสต์ / ตั้งค่า |
| **ปุ่ม Back** | พักเกม → เมนู → ออก (กด 3 ครั้ง) |

### ตัวละคร 3 สาย
| สาย | HP | ATK | จุดเด่น | สกิล |
|---|---|---|---|---|
| 🗡️ นักรบ | 150 | 12 | ฟันแรง ระยะสั้น | ฟันคมหิน / โล่พสุธา |
| 🔮 จอมเวท | 105 | 15 | ยิงไกล AoE | ลูกไฟ / วงเวทน้ำแข็ง |
| 🏹 นักธนู | 112 | 11 | เร็ว ระยะไกลสุด | ฝนลูกศร / ก้าวลม |

### ด่าน 3 + บอส 3
1. **ลานหน้าโรงเรียน** → หัวหน้าแก๊งปี 3 (620 HP)
2. **อาคารเรียน A** → ครูใหญ่เงา (1,500 HP)
3. **ดาดฟ้าเงามืด** → ราชาโรงเรียน (3,200 HP)

มี **6 เควสต์** · ร้านค้าอัปเกรดอาวุธ/เกราะ · เซฟอัตโนมัติ (localStorage)

---

## 📁 โครงสร้าง

```
FamRan/
├─ releases/
│  └─ FamAi_CampusWars.apk          # ⭐ APK พร้อมติดตั้ง
├─ game/
│  └─ www/                          # เกมเว็บ (ซอร์สหลัก)
│     ├─ index.html                 # UI + HUD + CSS
│     └─ src/
│        ├─ data.js                 # คลาส / ศัตรู / ด่าน / เควสต์ / ร้านค้า
│        ├─ engine.js               # game loop, AI, สกิล, เซฟ, renderer
│        ├─ ui.js                   # เมนู / HUD / ร้านค้า / เควสต์
│        └─ audio.js                # WebAudio SFX (สังเคราะห์เอง)
├─ android/                         # ตัวห่อ APK (WebView shell)
│  ├─ AndroidManifest.xml
│  ├─ src/com/famai/campuswars/MainActivity.java
│  ├─ res/                           # ไอคอน + theme
│  ├─ assets/www/                    # สำเนาเกมที่ฝังใน APK
│  └─ build_apk.sh                   # สคริปต์ build ทั้งหมด (aapt2/javac/d8/zipalign/apksigner)
├─ client-pc/                        # (สำรอง) GoldenG-MCL LastChaos PC client
│  ├─ client-core/                   # ไคลเอนต์ PC 214 ไฟล์
│  └─ tools/                         # fam_dta.py + set_ip.py
└─ docs/
   ├─ BUILD-TH.md                    # วิธี build APK เอง
   ├─ LIMITS-TH.md                   # ข้อจำกัด (Unity / APK / ลิขสิทธิ์)
   └─ CLIENT-PC-TH.md                # หมายเหตุฝั่ง PC
```

---

## 🔨 Build APK เอง

ต้องมี: **JDK 11** + **Android SDK build-tools 34** + **platform android-34**

```bash
cd android
./build_apk.sh
# → ../releases/FamAi_CampusWars.apk
```

สคริปต์ทำให้ครบ 7 ขั้น: `aapt2 compile` → `aapt2 link` → `javac` → `d8` → `zipalign` → `apksigner`

รายละเอียดใน [docs/BUILD-TH.md](docs/BUILD-TH.md)

---

## 🎨 ปรับเกม

| อยากปรับ | แก้ที่ |
|---|---|
| ยาก/ง่าย | `game/www/src/data.js` → `ENEMIES[x].hp / atk` |
| ตัวละครแรงเกิน | `game/www/src/data.js` → `CLASSES[x].hp / atk / spd` |
| เพิ่มด่าน | `ZONES[]` + `ENEMIES{}` + `QUESTS[]` |
| เปลี่ยนชื่อแบรนด์ | `BRAND` / `TITLE` ใน `data.js` + `<title>` ใน `index.html` |
| สี/ธีม | CSS variables ที่ต้น `index.html` |

หลังแก้ ต้องรัน `android/build_apk.sh` ใหม่เพื่อสร้าง APK

---

## ⚖️ ลิขสิทธิ์

- โค้ดเกม (`game/`, `android/`) — เขียนขึ้นใหม่ในงานนี้ ใช้/แก้/แจกได้อิสระ
- `client-pc/` — ไคลเอนต์ LastChaos (GoldenG-MCL) ที่แพร่ในฟอรัม **ไม่มีไลเซนส์** ใช้เพื่อการศึกษาเท่านั้น
- ลิขสิทธิ์เกม LastChaos/Campus Wars เป็นของเจ้าของเดิม

---

Made with 🌙 by **Fam Ai** · repo: [famoh01/FamRan](https://github.com/famoh01/FamRan)
