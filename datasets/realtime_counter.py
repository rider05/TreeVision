"""Realtime dataset counter for TreeVision — writes docs/tracker_data.json every --interval seconds
and optionally serves it via --serve (http://localhost:8000/docs/dataset-tracker.html).

Usage:
  python datasets/realtime_counter.py                 # CLI poll every 2s, prints table
  python datasets/realtime_counter.py --interval 1    # faster
  python datasets/realtime_counter.py --serve         # also serves tracker + JSON (recommended)
  python datasets/realtime_counter.py --serve --port 8000

Tracker: open docs/dataset-tracker.html via http://localhost:8000/docs/dataset-tracker.html
         enable "Auto realtime 2s" — it fetches docs/tracker_data.json in realtime.
"""
import argparse, json, time, sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dataset" / "raw"
ATTR = ROOT / "dataset" / "ATTRIBUTION.csv"
MANIFEST = ROOT / "dataset" / "SPLIT_MANIFEST.csv"
OUT = ROOT / "docs" / "tracker_data.json"

def scan():
    counts = Counter()
    total = 0
    if RAW.exists():
        for p in RAW.iterdir():
            if not p.is_dir(): continue
            n = sum(1 for f in p.iterdir() if f.is_file() and f.suffix.lower() in {".jpg",".jpeg",".png"})
            counts[p.name] = n
            total += n
    attr_n = 0
    if ATTR.exists():
        try: attr_n = sum(1 for _ in open(ATTR, encoding="utf-8", errors="ignore"))-1
        except: pass
    split_n = 0
    if MANIFEST.exists():
        try: split_n = sum(1 for _ in open(MANIFEST, encoding="utf-8", errors="ignore"))-1
        except: pass
    return counts, total, attr_n, split_n

def write_json(counts, total, attr_n, split_n):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"updated": time.strftime("%Y-%m-%d %H:%M:%S"), "total": total, "counts": dict(counts), "attribution_rows": attr_n, "splits": split_n}
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload

def print_table(counts, total, attr_n, split_n):
    target = 400
    done = sum(1 for v in counts.values() if v>=target)
    print(f"\r[{time.strftime('%H:%M:%S')}] total {total:5d} | {len(counts)} spp | {done} >=400 | attr {attr_n} | splits {split_n}  ", end="")
    # detailed per-species line on change
    return total

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=float, default=2.0)
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()

    if args.serve:
        import threading, http.server, socketserver
        handler = http.server.SimpleHTTPRequestHandler
        # serve from ROOT so docs/tracker_data.json and dataset/ATTRIBUTION.csv are reachable
        class CORSHandler(handler):
            def end_headers(self):
                self.send_header("Cache-Control","no-store")
                self.send_header("Access-Control-Allow-Origin","*")
                super().end_headers()
        # watcher thread
        def watcher():
            last = -1
            while True:
                c,t,a,s = scan()
                write_json(c,t,a,s)
                if t != last:
                    print_table(c,t,a,s)
                    last = t
                time.sleep(args.interval)
        threading.Thread(target=watcher, daemon=True).start()
        print(f"Serving {ROOT} at http://localhost:{args.port}/")
        print(f"Open tracker: http://localhost:{args.port}/docs/dataset-tracker.html  -> enable Auto realtime 2s")
        with socketserver.TCPServer(("", args.port), CORSHandler) as httpd:
            httpd.serve_forever()
    else:
        last = -1
        try:
            while True:
                c,t,a,s = scan()
                write_json(c,t,a,s)
                if t != last:
                    print(f"[{time.strftime('%H:%M:%S')}] total {t:5d} | spp {len(c)} | attr {a} | splits {s}")
                    # print top 5
                    for k,v in sorted(c.items(), key=lambda x: -x[1])[:5]:
                        print(f"  {k:15s} {v:4d}")
                    last = t
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nstop")

if __name__ == "__main__":
    main()
