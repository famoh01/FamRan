# -*- coding: utf-8 -*-
"""
fam_dta.py - standalone editor for sl.dta / lccnct.dta (Fam Ai kit)

No dependencies, Python 3.x. Drop this file into the client folder.

IMPORTANT: both builds (ServerSide / PlayerSide) MUST contain the SAME IP,
and that IP must match the IP the server binds. If they differ the game
will not connect. Edit [FamAi] IP in FamAi_Config.ini in BOTH folders,
then run `refresh` in BOTH folders.

Usage
-----
  python fam_dta.py show sl.dta
  python fam_dta.py show lccnct.dta
  python fam_dta.py set sl.dta "test 127.0.0.1 7777" sl.dta
  python fam_dta.py set lccnct.dta "http://127.0.0.1/lc_update/" lccnct.dta
  python fam_dta.py refresh          # reads FamAi_Config.ini and rewrites both

Format (classic LastChaos rolling-key cipher)
--------------------------------------------
  bytes  0..18  : 19-byte header, kept unchanged. key = header[10]
  bytes 19..end : ASCII payload
      decrypt : p = (c - key) & 255 ; key = c
      encrypt : c = (p + key) & 255 ; key = c
"""
import configparser
import sys
from pathlib import Path

HEADER_LEN = 19


def decrypt(raw):
    hdr, enc = raw[:HEADER_LEN], raw[HEADER_LEN:]
    if len(hdr) < HEADER_LEN:
        raise ValueError("file too short")
    key = hdr[10]
    out = bytearray()
    for c in enc:
        p = (c - key) & 255
        out.append(p)
        key = c
    return bytes(hdr), bytes(out)


def encrypt(hdr, text):
    key = hdr[10]
    out = bytearray()
    for p in text:
        c = (p + key) & 255
        out.append(c)
        key = c
    return bytes(hdr) + bytes(out)


def rebuild(raw, text):
    hdr, _ = decrypt(raw)
    return encrypt(hdr, text.encode("ascii"))


def write(path, data):
    Path(path).write_bytes(data)


def refresh(ini="FamAi_Config.ini"):
    cp = configparser.ConfigParser(inline_comment_prefixes=(";", "#"))
    cp.read(ini, encoding="utf-8-sig")
    if not cp.has_section("FamAi"):
        raise SystemExit("ERROR: %s not found / invalid" % ini)
    g = lambda o, d: cp.get("FamAi", o).strip() if cp.has_option("FamAi", o) else d
    ip = g("IP", "127.0.0.1")
    port = g("Port", "7777")  # EP4 2015 / OllyBaru LoginServer default
    host = g("UpdateHost", ip)
    path = g("UpdatePath", "/lc_update/")
    jobs = [("sl.dta", "test %s %s" % (ip, port)),
            ("lccnct.dta", "http://%s%s" % (host, path))]
    for name, payload in jobs:
        p = Path(name)
        if not p.is_file():
            print("  SKIP %s (not found)" % name)
            continue
        old = p.read_bytes()
        new = rebuild(old, payload)
        # keep a one-time backup
        bak = Path(name + ".famai-bak")
        if not bak.exists():
            write(bak, old)
        write(p, new)
        print("  %-12s -> %s" % (name, payload))
    print("Done. Backups: *.famai-bak")


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help", "help"):
        print(__doc__)
        return
    cmd = argv[1].lower()
    if cmd == "show":
        for f in argv[2:]:
            hdr, txt = decrypt(Path(f).read_bytes())
            print("%-14s key=0x%02x  %s" % (f, hdr[10], txt.decode("ascii", "replace")))
    elif cmd == "set" and len(argv) >= 4:
        src, text = argv[2], argv[3]
        out = argv[4] if len(argv) > 4 else src
        write(out, rebuild(Path(src).read_bytes(), text))
        print("wrote %s -> %s" % (out, text))
    elif cmd == "refresh":
        refresh(argv[2] if len(argv) > 2 else "FamAi_Config.ini")
    else:
        print("unknown command. run: python fam_dta.py help")


if __name__ == "__main__":
    main(sys.argv)
