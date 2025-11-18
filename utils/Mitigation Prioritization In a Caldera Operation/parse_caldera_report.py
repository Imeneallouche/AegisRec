#!/usr/bin/env python3
"""
parse_caldera_report.py
Parse op.json and extract technique IDs that were successfully executed.
"""

import argparse, json, re

def try_add(t, seen, out):
    if not t:
        return
    if isinstance(t, (list, tuple)):
        for x in t:
            try_add(x, seen, out)
        return
    s = str(t).strip()
    if not s:
        return
    if s not in seen:
        seen.add(s)
        out.append(s)

def extract_techniques_from_report(report):
    techniques = []
    seen = set()

    # Look into common arrays
    candidate_lists = []
    if isinstance(report, dict):
        for k, v in report.items():
            if isinstance(v, list):
                candidate_lists.append(v)
    else:
        candidate_lists.append(report)

    # parse entries
    for lst in candidate_lists:
        for entry in lst:
            if isinstance(entry, dict):
                # check for ability object
                ability = entry.get("ability") or entry.get("ability_ref") or entry.get("ability_name") or entry.get("ability_info")
                status = entry.get("status") or entry.get("result") or entry.get("state")
                # prefer only successful ones if status exists
                consider = True
                if status:
                    st = str(status).lower()
                    consider = any(k in st for k in ("success","completed","ok","0"))
                if ability and isinstance(ability, dict):
                    # technique fields in ability
                    for key in ("technique", "technique_id", "techniqueIds","techniques", "ATT&CK"):
                        if key in ability and ability[key]:
                            if consider:
                                try_add(ability[key], seen, techniques)
                            break
                # sometimes technique is at entry level
                for key in ("technique", "technique_id", "attack_id"):
                    if key in entry and entry[key]:
                        if consider:
                            try_add(entry[key], seen, techniques)
                # fallback: search strings in entry for T#### pattern
                for v in entry.values():
                    if isinstance(v, str):
                        for m in re.findall(r'(T\d{4}(?:\.\d+)?)', v):
                            try_add(m, seen, techniques)
            elif isinstance(entry, str):
                for m in re.findall(r'(T\d{4}(?:\.\d+)?)', entry):
                    try_add(m, seen, techniques)

    # final fallback: search entire json
    if not techniques:
        js = json.dumps(report)
        for m in re.findall(r'(T\d{4}(?:\.\d+)?)', js):
            try_add(m, seen, techniques)
    return techniques

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="infile", required=True)
    p.add_argument("--out", dest="outfile", default="techniques.txt")
    args = p.parse_args()
    data = json.load(open(args.infile))
    techs = extract_techniques_from_report(data)
    print("Found techniques:", techs)
    with open(args.outfile, "w") as f:
        for t in techs:
            f.write(t + "\n")
    print("Wrote to", args.outfile)

if __name__ == "__main__":
    main()
