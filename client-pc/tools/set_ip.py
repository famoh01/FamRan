# -*- coding: utf-8 -*-
"""
set_ip.py — ตั้งค่า IP/พอร์ตให้ client ในโฟลเดอร์ client-core
ใช้:  python set_ip.py 127.0.0.1 7777
      python set_ip.py 110.164.203.233 7777 http://110.164.203.233/lc_update/

หมายเหตุ: IP ฝั่งเซิร์ฟเวอร์และฝั่งผู้เล่น "ต้องตรงกัน" ไม่งั้นเปิดเกมแล้วจะไม่ติด
"""
import sys, subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
core = root / "client-core"
dta = Path(__file__).resolve().parent / "fam_dta.py"

if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

ip, port = sys.argv[1], sys.argv[2]
url = sys.argv[3] if len(sys.argv) > 3 else f"http://{ip}/lc_update/"

subprocess.check_call([sys.executable, str(dta), "set", str(core / "sl.dta"), f"test {ip} {port}", str(core / "sl.dta")])
subprocess.check_call([sys.executable, str(dta), "set", str(core / "lccnct.dta"), url, str(core / "lccnct.dta")])
print()
subprocess.check_call([sys.executable, str(dta), "show", str(core / "sl.dta")])
subprocess.check_call([sys.executable, str(dta), "show", str(core / "lccnct.dta")])
