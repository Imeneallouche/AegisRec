#!/usr/bin/env python3
"""
wait_for_report.py
Poll for operation report to be available. Writes op_report.json when found.
"""

import argparse, requests, time
from urllib.parse import urljoin

def headers(api_key):
    h = {"Accept": "application/json"}
    if api_key:
        h["KEY"] = api_key
    return h

def try_fetch_report(base, op_id, api_key):
    url = urljoin(base, f"/api/v2/operations/{op_id}/report")
    try:
        resp = requests.get(url, headers=headers(api_key), timeout=10)
        if resp.ok:
            return resp.json()
        # try POST fallback
        resp = requests.post(url, headers=headers(api_key), timeout=10)
        if resp.ok:
            return resp.json()
    except Exception:
        return None
    return None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--op", required=True)
    p.add_argument("--api-key", default="")
    p.add_argument("--out", default="op.json")
    p.add_argument("--timeout", type=int, default=300, help="seconds to wait")
    p.add_argument("--interval", type=int, default=5, help="poll interval seconds")
    args = p.parse_args()

    base = args.base.rstrip("/")
    api_key = args.api_key or None
    deadline = time.time() + args.timeout
    print(f"Waiting for report of operation {args.op} ...")
    while time.time() < deadline:
        rep = try_fetch_report(base, args.op, api_key)
        if rep:
            import json
            with open(args.out, "w") as f:
                json.dump(rep, f, indent=2)
            print("Wrote report to", args.out)
            return
        time.sleep(args.interval)
    raise SystemExit("Timeout waiting for operation report")

if __name__ == "__main__":
    main()
