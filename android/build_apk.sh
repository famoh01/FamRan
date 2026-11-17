#!/usr/bin/env bash
set -euo pipefail
SDK=/home/user/.cache/android/sdk
BT=$SDK/build-tools/34.0.0
PLAT=$SDK/platforms/android-34/android.jar
export JAVA_HOME=/usr/lib/jvm/jdk-11
PATH=$JAVA_HOME/bin:$PATH
APP="$(cd "$(dirname "$0")" && pwd)"
OUT=$APP/out
rm -rf "$OUT"; mkdir -p "$OUT/res" "$OUT/classes" "$OUT/dex"

echo "[1/7] aapt2 compile resources"
"$BT/aapt2" compile --dir "$APP/res" -o "$OUT/res.zip"

echo "[2/7] aapt2 link"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLAT" \
  --manifest "$APP/AndroidManifest.xml" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0.0 \
  -A "$APP/assets" \
  "$OUT/res.zip"

echo "[3/7] javac"
find "$APP/src" -name '*.java' > "$OUT/sources.txt"
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$PLAT" -classpath "$PLAT" \
  -d "$OUT/classes" @"$OUT/sources.txt" 2>&1 | grep -v 'bootstrap class path' || true

echo "[4/7] d8 -> classes.dex"
find "$OUT/classes" -name '*.class' > "$OUT/classes.txt"
"$BT/d8" --lib "$PLAT" --min-api 24 --output "$OUT/dex" @"$OUT/classes.txt"

echo "[5/7] add dex into apk"
cd "$OUT" && cp base.apk unsigned.apk
(cd dex && zip -q -X ../unsigned.apk classes.dex)

echo "[6/7] zipalign"
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "[7/7] sign"
KS=$APP/famai.keystore
if [ ! -f "$KS" ]; then
  keytool -genkeypair -v -keystore "$KS" -storepass famai2026 -keypass famai2026 \
    -alias famai -keyalg RSA -keysize 2048 -validity 10950 \
    -dname "CN=Fam Ai, OU=Games, O=Fam Ai, L=Ranong, C=TH" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:famai2026 --key-pass pass:famai2026 \
  --min-sdk-version 24 --v1-signing-enabled true --v2-signing-enabled true \
  --out "$(dirname "$APP")/releases/FamAi_CampusWars.apk" "$OUT/aligned.apk"

"$BT/apksigner" verify --print-certs "$(dirname "$APP")/releases/FamAi_CampusWars.apk" | head -8
ls -l "$(dirname "$APP")/releases/FamAi_CampusWars.apk"
echo "BUILD OK"
