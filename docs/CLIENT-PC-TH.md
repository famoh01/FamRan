# 🖥️ client-pc — GoldenG-MCL (LastChaos PC)

> โฟลเดอร์นี้เป็น **ของสำรอง** — ไม่เกี่ยวกับเกมมือถือ
> เก็บไว้เพราะเป็นไคลเอนต์เกม "แรน" เวอร์ชัน PC ที่ผู้ใช้อัปโหลดมา (4.7 GB)

## มีอะไร

```
client-pc/
├─ client-core/     # 214 ไฟล์ (~45 MB): LC.exe, Bin/, Classes/, Data/ (map.dta, help1.dta)
└─ tools/
   ├─ fam_dta.py    # ถอด/เข้ารหัส sl.dta & lccnct.dta
   └─ set_ip.py     # ตั้ง IP ในคำสั่งเดียว
```

## ค่า IP ที่ตรวจพบในไฟล์ต้นฉบับ

```
sl.dta      →  test 110.164.203.233 7777
lccnct.dta  →  http://143.20.142.33/lc_update/
```

⚠️ **สองไฟล์ชี้คนละ IP** — นี่คือสาเหตุคลาสสิกที่เกม "เปิดติดแต่ค้างตอนอัปเดต"
แก้ให้ตรงกันด้วย:

```bash
python client-pc/tools/set_ip.py 127.0.0.1 7777
```

## ข้อจำกัด

- `LC.exe` เป็น PE32 (Windows x86) → **รันบนมือถือไม่ได้**
- `Data/` เต็ม (~6.9 GB, 58,420 ไฟล์) **ไม่รวมใน repo** เพราะเกินเพดาน GitHub
  (ไฟล์เดี่ยวสูงสุด 100 MB, แนะนำ ≤ 50 MB, repo ≤ 1 GB)
- ไม่มีไฟล์เซิร์ฟเวอร์ (LoginServer/Connector/GameServer) — ต้องหาแยก
- ไม่มีไลเซนส์ → เพื่อการศึกษาเท่านั้น

รายละเอียดเพิ่ม:
- [CLIENT-PC-SETUP-TH.md](CLIENT-PC-SETUP-TH.md) — วิธีติดตั้ง/รัน
- [CLIENT-PC-IP-TH.md](CLIENT-PC-IP-TH.md) — กฎ "IP ต้องตรงกัน"
- [CLIENT-PC-NOTES-TH.md](CLIENT-PC-NOTES-TH.md) — ค่าที่ตรวจได้จริงจากไฟล์
