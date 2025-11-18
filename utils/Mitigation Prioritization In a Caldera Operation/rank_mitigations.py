#!/usr/bin/env python3
"""
rank_mitigations.py
Takes mitigations JSON (or technique list) and ranks mitigations using WSM.
"""

import argparse, json, yaml, pandas as pd, numpy as np
from tabulate import tabulate
from neo4j import GraphDatabase

def load_config(path="config.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def compute_weights(techniques, config_weights, weight_source="uniform", technique_counts=None):
    if weight_source == "explicit":
        if not config_weights:
            raise ValueError("explicit weights requested but none provided")
        w = {t: float(config_weights.get(t, 0.0)) for t in techniques}
        s = sum(w.values())
        if s == 0:
            return {t: 1.0/len(techniques) for t in techniques}
        return {t: w[t]/s for t in techniques}
    elif weight_source == "frequency":
        if not technique_counts:
            technique_counts = {t: 1 for t in techniques}
        total = sum(technique_counts.get(t,1) for t in techniques)
        return {t: technique_counts.get(t,1)/total for t in techniques}
    else:
        return {t: 1.0/len(techniques) for t in techniques}

def build_decision_matrix(mitigations, techniques):
    tech_to_m = {t: [] for t in techniques}
    for mid, m in mitigations.items():
        for t in m.get("mitigates", []):
            if t in tech_to_m:
                tech_to_m[t].append(mid)
    rows = []
    for mid, m in mitigations.items():
        row = {}
        for t in techniques:
            mids_for_t = tech_to_m.get(t, [])
            if mid in mids_for_t and len(mids_for_t) > 0:
                row[t] = 1.0 / len(mids_for_t)
            else:
                row[t] = 0.0
        rows.append((mid, row))
    df = pd.DataFrame([r[1] for r in rows], index=[r[0] for r in rows])
    df.index.name = "mitigation_id"
    return df

def rank_with_wsm(df, weights):
    wvec = np.array([weights[c] for c in df.columns])
    scores = df.values.dot(wvec)
    out = df.copy()
    out["score"] = scores
    explanations = []
    for i, mid in enumerate(out.index):
        contribs = []
        for j, t in enumerate(df.columns):
            val = df.iat[i, j]
            if val > 0:
                contrib = val * weights[t]
                contribs.append(f"{t}:{contrib:.4f}")
        explanations.append("; ".join(contribs) if contribs else "")
    out["explanation"] = explanations
    out = out.sort_values("score", ascending=False)
    return out

def to_output(out_df, mitigations, out_csv=None, out_json=None):
    table = []
    for mid, row in out_df.iterrows():
        table.append({
            "mitigation_id": mid,
            "name": mitigations[mid].get("name"),
            "score": float(row["score"]),
            "covers": mitigations[mid].get("mitigates"),
            "explanation": row["explanation"]
        })
    df = pd.DataFrame(table)
    if out_csv:
        df.to_csv(out_csv, index=False)
    if out_json:
        df.to_json(out_json, orient="records", indent=2)
    return df

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="config.yaml")
    p.add_argument("--input_json", default=None)
    p.add_argument("--techniques", default=None)
    p.add_argument("--out_csv", default="ranked_mitigations.csv")
    p.add_argument("--out_json", default="ranked_mitigations.json")
    args = p.parse_args()

    cfg = load_config(args.config)
    ranking_cfg = cfg.get("ranking", {})
    weight_source = ranking_cfg.get("weight_source", "uniform")
    if args.input_json:
        data = json.load(open(args.input_json))
        techniques = data.get("techniques", [])
        mitigations = data.get("mitigations", {})
    else:
        if not args.techniques:
            raise SystemExit("Provide --input_json or --techniques")
        techniques = [t.strip() for t in args.techniques.split(",") if t.strip()]
        neo = cfg.get("neo4j", {})
        drv = GraphDatabase.driver(neo["uri"], auth=(neo["user"], neo["password"]))
        from extract_mitigations import fetch_mitigations_for_techniques
        try:
            mitigations = fetch_mitigations_for_techniques(drv, techniques)
        finally:
            drv.close()

    df = build_decision_matrix(mitigations, techniques)
    config_weights = cfg.get("ranking", {}).get("technique_weights", {}) or {}
    weights = compute_weights(techniques, config_weights, weight_source)
    out_df = rank_with_wsm(df, weights)
    res_df = to_output(out_df, mitigations, out_csv=args.out_csv, out_json=args.out_json)
    print(tabulate(res_df[["mitigation_id","name","score"]].values, headers=["mitigation_id","name","score"]))
    print(f"Wrote: {args.out_csv}, {args.out_json}")

if __name__ == "__main__":
    main()
