# 🔑 กฎสำคัญ: IP ฝั่งเซิร์ฟเวอร์ ต้องตรงกับ IP ฝั่งผู้เล่น

ถ้า IP ไม่ตรงกัน **เปิดเกมแล้วจะค้างที่หน้าโลโก้ / ขึ้น "cannot connect"** ทันที

## ไฟล์ที่เก็บค่า IP ในไคลเอนต์

| ไฟล์ | เก็บอะไร | ตัวอย่างที่ถูกต้อง |
| --- | --- | --- |
| `client-core/sl.dta` | IP + พอร์ตของ LoginServer | `test 110.164.203.233 7777` |
| `client-core/lccnct.dta` | URL ของตัวอัปเดต (HTTP) | `http://110.164.203.233/lc_update/` |

> `sl.dta`/`lccnct.dta` **ไม่ได้เป็น plain text** — เข้ารหัสด้วย rolling-key cipher
> (19 ไบต์แรกเป็น header, key = ไบต์ที่ 10) ต้องใช้ `tools/fam_dta.py` ในการแก้

## วิธีแก้ IP (แนะนำ)

```bash
python tools/set_ip.py <IP> <PORT> [URL อัปเดต]

# ตัวอย่าง
python tools/set_ip.py 127.0.0.1 7777
python tools/set_ip.py 110.164.203.233 7777 http://110.164.203.233/lc_update/
```

## ตรวจสอบผลลัพธ์

```bash
python tools/fam_dta.py show client-core/sl.dta      # → test <IP> <PORT>
python tools/fam_dta.py show client-core/lccnct.dta  # → http://<IP>/lc_update/
```

## ค่าเริ่มต้นใน repo นี้ (ตามไฟล์ต้นฉบับ)

```
sl.dta      →  test 110.164.203.233 7777
lccnct.dta  →  http://110.164.203.233/lc_update/
```

⚠️ IP `110.164.203.233` เป็น IP สาธารณะของเจ้าของไฟล์เดิม — **ไม่ใช่เซิร์ฟเวอร์ของคุณ**
ถ้าไม่มีเซิร์ฟเวอร์ที่ IP นี้ เกมจะ **ไม่ติด** ต้องเปลี่ยนเป็น IP เครื่องคุณเอง

## กรณีเล่นในเครื่องเดียว (localhost)

```bash
python tools/set_ip.py 127.0.0.1 7777 http://127.0.0.1/lc_update/
```
แล้วเปิดเซิร์ฟเวอร์ (LoginServer 7777, Connector 4006, GameServer 4101 ฯลฯ)
บนเครื่องเดียวกัน

## กรณีเล่นกับเพื่อนผ่านอินเทอร์เน็ต

1. เปิดพอร์ตบนเราเตอร์: `7777` (login), `4006` (connector), `4101` (game)
2. ตั้ง IP ใน `sl.dta` เป็น **IP สาธารณะ** ของคุณ
3. ตั้ง IP เดียวกันในไฟล์ config ฝั่งเซิร์ฟเวอร์
4. ให้เพื่อนโหลด `client-core` ไปรัน — `sl.dta` ที่ฝังมาแล้วจะชี้มาที่คุณ
