# ⚠️ ข้อจำกัดที่ต้องบอกตรง ๆ

## 1. ทำไมไม่ build จากโปรเจกต์ Unity ที่ส่งมา

ไฟล์ `RanMobileCampusWars.rar` (3.2 GB) คือ **AssetRipper decompile** ของโปรเจกต์ Unity
**KlassX / Campus Wars**:

| รายการ | ค่า |
|---|---|
| Unity version | `6000.3.25f1` (rev `e1dba0a9aba4`) |
| Render pipeline | URP `17.3.0` |
| ฉาก | 89 `.unity` |
| สคริปต์ C# | 4,201 ไฟล์ใน `Assembly-CSharp` |
| ขนาดโปรเจกต์ | ~8.8 GB (หลังแตก) |
| Build target | Android · IL2CPP · ARM64 · `com.klab.klassx.selfhost` |
| ต้องมี | Unity Editor 6000.3 + License + Android NDK + Unity Android module |

**เครื่องที่ทำงานนี้ไม่มี Unity** และไม่มีไลเซนส์ → คอมไพล์โปรเจกต์นั้นเป็น APK ไม่ได้

## 2. สิ่งที่ให้ไปแทนคืออะไร

เกม **HTML5 Canvas เขียนใหม่ทั้งหมด** (2,000+ บรรทัด) ทำตามคอนเซปต์ของ Campus Wars:

- โรงเรียนป่วน · นักเรียนสู้กับแก๊ง · 3 ด่าน · 3 บอส
- 3 สายตัวละคร · 6 สกิล · 6 เควสต์ · ร้านค้า · ระบบเลเวล
- บังคับด้วยนิ้วเดียว เหมาะกับมือถือแนวตั้ง

แล้วห่อด้วย **WebView shell** เป็น APK จริงที่ติดตั้งได้

> ⚠️ **ไม่ได้ใช้** asset / โมเดล / โมชัน / ฉาก จากโปรเจกต์ Unity ต้นฉบับ

## 3. ข้อเท็จจริงของ APK

| หัวข้อ | ค่า |
|---|---|
| Package | `com.famai.campuswars` |
| ชื่อแอป | Fam Ai Campus Wars |
| ขนาด | 170 KB |
| minSdk / targetSdk | 24 (Android 7.0) / 34 (Android 14) |
| Architecture | universal (ไม่มี native code — WebView) |
| การเซ็น | APK Signature Scheme v2 + v3 (debug keystore) |
| อินเทอร์เน็ต | **ไม่ต้องใช้** — เกมออฟไลน์ |
| Permissions | ไม่มี (ไม่ขอสิทธิ์ใด ๆ) |

> APK เซ็นด้วยคีย์ทดสอบของงานนี้ เหมาะใช้งานเอง/แจกเพื่อน
> ถ้าจะขึ้น Play Store ต้องสร้างคีย์ของตัวเอง + ทำนโยบาย Google

## 4. สิ่งที่ไม่มี

- ❌ ไม่มี `.apk` หรือ keystore ในไฟล์ RAR ต้นฉบับ (เป็นซอร์สโค้ดอย่างเดียว)
- ❌ ไม่มีระบบเซิร์ฟเวอร์/ล็อกอิน/ผู้เล่นหลายคน
- ❌ ไม่มีระบบซื้อของในเกม (ไม่มี IAP)
- ❌ ไม่มีแอสเซ็ตจาก Unity ต้นฉบับ

## 5. ลิขสิทธิ์

- โค้ดเกม + APK shell: เขียนใหม่ในงานนี้ → ใช้ได้อิสระ
- ต้นฉบับ `KlassX / Campus Wars` + `GoldenG-MCL / LastChaos`: **ไม่มีไลเซนส์มาให้**
  → ถ้าจะใช้เชิงพาณิชย์ต้องตรวจสิทธิ์กับเจ้าของเดิมก่อน
