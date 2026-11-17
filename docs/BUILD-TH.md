# 🔨 วิธี Build APK เอง

## สิ่งที่ต้องติดตั้ง

```bash
# 1) JDK 11 (ห้ามใช้ JDK 21 — d8 ใน build-tools 34 มีบั๊กกับ class จาก javac 21)
sudo apt install openjdk-11-jdk-headless

# 2) Android SDK command-line tools + build-tools 34 + platform 34
mkdir -p ~/android-sdk && cd ~/android-sdk
curl -LO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip -d cmdline-tools
export ANDROID_HOME=$PWD
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
yes | cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME --licenses
cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME \
  "platforms;android-34" "build-tools;34.0.0"
```

## Build

```bash
cd android
# แก้ SDK path ใน build_apk.sh บรรทัด 3 ถ้าติดตั้งที่อื่น
./build_apk.sh
```

ขั้นตอนที่สคริปต์ทำ:

| # | คำสั่ง | ทำอะไร |
|---|---|---|
| 1 | `aapt2 compile` | แปลง res/ → res.zip |
| 2 | `aapt2 link` | รวม resource + manifest + assets/www |
| 3 | `javac` | คอมไพล์ MainActivity.java (Java 8 bytecode) |
| 4 | `d8` | แปลง .class → classes.dex |
| 5 | `zip` | ใส่ classes.dex เข้า APK |
| 6 | `zipalign -p 4` | จัดเรียงไฟล์ให้ Android โหลดเร็ว |
| 7 | `apksigner` | เซ็น v1+v2+v3 ด้วย famai.keystore |

## แก้เกมแล้ว build ใหม่

```bash
# 1) แก้โค้ดใน game/www/
# 2) sync เข้า android assets
rm -rf android/assets && mkdir -p android/assets/www
cp -r game/www/* android/assets/www/
# 3) build
cd android && ./build_apk.sh
```

## ตรวจสอบ APK

```bash
# ข้อมูลแพ็กเกจ
$ANDROID_HOME/build-tools/34.0.0/aapt dump badging releases/FamAi_CampusWars.apk | head

# ตรวจลายเซ็น
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose releases/FamAi_CampusWars.apk
```

## ⚠️ บทเรียนที่เจอตอน build (บันทึกไว้)

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| `cannot find symbol setAllowFileAccessFromFileURLs` | เมธอดอยู่บน `WebSettings` ไม่ใช่ `WebView` | `s.setAllowFileAccessFromFileURLs(true)` |
| `metafactory ... Unable to find method` | javac 21 + `-source 8` เจอ lambda | ใช้ anonymous class หรือ javac 11 |
| `d8 NullPointerException String.length()` | **javac 21** สร้าง class ที่ build-tools 34 แปลงไม่ได้ | **ใช้ JDK 11 คอมไพล์** |
| `unmappable character US-ASCII` | คอมเมนต์มีอักขระ `·` | เพิ่ม `-encoding UTF-8` หรือเปลี่ยนเป็น ASCII |
