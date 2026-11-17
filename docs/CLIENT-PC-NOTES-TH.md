# 📋 บันทึกจากไฟล์จริง (ตรวจแล้ว)

## ข้อมูลไฟล์ต้นฉบับ

| รายการ | ค่า |
| --- | --- |
| ชื่อไฟล์ | `GoldenG-MCL.rar` |
| ขนาด | 4,708,304,359 ไบต์ (4.38 GiB) |
| ฟอร์แมต | RAR5 |
| จำนวน entry | 61,735 (+โฟลเดอร์) |
| โฟลเดอร์บนสุด | `GoldenG-MCL/` |

## สรุปโครงสร้าง

| โฟลเดอร์ | จำนวนไฟล์ | ขนาด |
| --- | --- | --- |
| `Data/` | 58,420 | ~6,919 MB |
| `Ska/` | 1,729 | 164 MB |
| root (`*.exe`, `*.dta`, `*.bat` …) | 622 | 76 MB |
| `Texture/` | 204 | 38.7 MB |
| `Bin/` | 30 | 29 MB |
| `Local/` | 295 | 21.7 MB |
| `AppHelp/` | 2 | 13.2 MB |

นามสกุลไฟล์ที่พบบ่อย: `.tex` 19,351 · `.bm` 16,128 · `.smc` 9,021 · `.bmc` 6,925 ·
`.wav` 1,661 · `.bs` 1,376 · `.ba` 1,373 · `.tbn` 1,297 · `.aml` 847 · `.mdl` 218 ·
`.ecl` 174 · `.wld` 69

## ไฟล์หลักที่ตรวจสอบแล้ว

| ไฟล์ | ชนิด | หมายเหตุ |
| --- | --- | --- |
| `LC.exe` | PE32 GUI, i386, 1,658,880 B | ตัวเปิดเกม (ไม่ใช่ .NET) |
| `LC-Version.exe` | PE32 .NET assembly, 57,856 B | ตัวตรวจเวอร์ชัน |
| `GMCL.bat` | text | `start Bin\Nksp fkzktlfgod!` |
| `vtm.brn` | binary 4 B | ค่า `0x1E 00 00 00` |
| `ModEXT.txt` | text 2 B | `MP` |
| `Bin/Engine.dll` | DLL | 12,953,600 B (เอนจินหลัก) |
| `Bin/EntitiesMP.dll` | DLL | 2,628,096 B |
| `Bin/GameMP.dll`, `EngineGUI.dll` | DLL | โมดูลเกม/UI |
| `Bin/Ultra.dll`, `DBGA.dll`, `XPva03.dll` | DLL | มีในไคลเอนต์เดิม (ห้ามลบ) |
| `Data/map.dta`, `Data/help1.dta` | dta | ข้อมูลแมพ/ช่วยเหลือ |

## ค่าที่ถอดรหัสได้จากไฟล์

```
sl.dta      (44 B, key=0x64)  →  "test 110.164.203.233 7777"
lccnct.dta  (50 B, key=0x2d)  →  "http://143.20.142.33/lc_update/"
```

⚠️ `sl.dta` กับ `lccnct.dta` **ชี้คนละ IP** (`110.164.203.233` vs `143.20.142.33`)
นี่คือสาเหตุคลาสสิกที่เกม "เปิดติดแต่ค้างตอนอัปเดต" — ควรตั้งให้เป็น IP เดียวกัน
ด้วย `python tools/set_ip.py <IP> 7777`

## สิ่งที่ไม่มีในไฟล์

- ❌ ไม่มี `.apk` / `.aab` / keystore — เป็นไคลเอนต์ **PC เท่านั้น**
- ❌ ไม่มีไฟล์เซิร์ฟเวอร์ (LoginServer/Connector/GameServer) — ต้องหาแยก
- ❌ ไม่มีฐานข้อมูล SQL / ไลเซนส์
- ❌ ไม่มี Unity project — คนละตัวกับ `RanMobileCampusWars.rar` (KlassX/Campus Wars)
