# 🛠️ วิธีติดตั้งและรัน FamRan (ไคลเอนต์ GoldenG-MCL)

## 1) สิ่งที่ต้องมี

- Windows 7/10/11 (64-bit แนะนำ) — **LC.exe เป็นโปรแกรม 32-bit**
- Visual C++ Redistributable x86 → มีใน `client-core/AppHelp/VC_redist.x86.exe`
- DirectX 9 (มี `client-core/Bin/dx9.dll` มาด้วยแล้ว)
- Python 3 (เฉพาะตอนแก้ IP ด้วยสคริปต์)

## 2) ติดตั้ง

```bash
git clone https://github.com/famoh01/FamRan.git
cd FamRan
```

ถ้าติดตั้ง VC++ Redist:
```
client-core\AppHelp\VC_redist.x86.exe
```

## 3) ตั้ง IP ให้ชี้ไปที่เซิร์ฟเวอร์

```bash
python tools/set_ip.py 127.0.0.1 7777
```

## 4) เข้าเกม

- ดับเบิลคลิก **`GMCL.bat`** (สคริปต์เดิมของไคลเอนต์) หรือ
- ดับเบิลคลิก **`LC.exe`**

## 5) ถ้าเปิดไม่ติด

| อาการ | สาเหตุที่พบบ่อย | วิธีแก้ |
| --- | --- | --- |
| ค้างหน้าโลโก้ | IP ใน `sl.dta` ไม่ตรงเซิร์ฟเวอร์ / เซิร์ฟเวอร์ไม่เปิด | ตรวจ `sl.dta` + เปิด LoginServer 7777 |
| เด้งทันที (ไม่มีหน้าต่าง) | ขาด VC++ Redist x86 | ติดตั้ง `AppHelp/VC_redist.x86.exe` |
| ขึ้น error DLL | ขาด DirectX 9 / ไฟล์ใน `Bin/` | คัดลอกทั้ง `Bin/` ไปข้าง `LC.exe` |
| ตัวอักษรเป็นสี่เหลี่ยม | ขาดฟอนต์ไทย | คัดลอก `Local/th/*.tex` จากตัวเกมเต็ม |
| เกมไม่เห็นแมพ | ขาด `Data/World/...` | ดูหัวข้อ "ดึงไฟล์ Data เพิ่ม" |

## 6) ดึงไฟล์ Data เพิ่ม (ถ้าต้องการครบ)

repo นี้ไม่รวม `Data/` (~6.9 GB) เพราะเกินข้อจำกัด GitHub ให้ทำอย่างใดอย่างหนึ่ง:

```bash
# แตกจาก RAR ต้นฉบับ (มีแค่โฟลเดอร์ข้อมูล)
unrar x GoldenG-MCL.rar "GoldenG-MCL/Data/*" FamRan/client-core/
```

หรือใช้ 7-Zip บน Windows:
1. เปิด `GoldenG-MCL.rar`
2. เลือกโฟลเดอร์ `GoldenG-MCL/Data`
3. ลากไปวางใน `FamRan/client-core/`

## 7) คำสั่งที่มีประโยชน์

```bash
python tools/fam_dta.py show client-core/sl.dta       # ดู IP ปัจจุบัน
python tools/fam_dta.py set  client-core/sl.dta "test 127.0.0.1 7777" client-core/sl.dta
python tools/set_ip.py 192.168.1.50 7777              # ตั้ง IP วง LAN
```
