#!/usr/bin/env python3
"""
extract_mitigations.py
Query Neo4j for mitigations related to a list of technique IDs.
"""

import argparse, json
from neo4j import GraphDatabase

def connect(uri, user, pwd):
    return GraphDatabase.driver(uri, auth=(user, pwd))

def fetch_mitigations_for_techniques(driver, technique_ids):
    q = """
    UNWIND $tech_ids AS tid
    OPTIONAL MATCH (m:Mitigation)-[:MITIGATED_BY]->(t:Technique {id: tid})
    WITH tid, collect(m) as ms1
    OPTIONAL MATCH (t2:Technique {id: tid})-[:MITIGATES]->(m2:Mitigation)
    WITH tid, ms1 + collect(m2) as allms
    UNWIND allms AS mnode
    WHERE mnode IS NOT NULL
    WITH DISTINCT mnode, tid
    RETURN mnode.id AS mitigation_id,
           mnode.name AS name,
           mnode.description AS description,
           collect(DISTINCT tid) AS mitigates
    """
    out = {}
    with driver.session() as s:
        results = s.run(q, tech_ids=technique_ids)
        for r in results:
            mid = r["mitigation_id"] or r["name"] or "<no-id>"
            out[mid] = {
                "id": mid,
                "name": r["name"],
                "description": r["description"],
                "mitigates": r["mitigates"] or []
            }
    return out

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--uri", required=True)
    p.add_argument("--user", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--techniques", required=True)
    p.add_argument("--out", default="observed_mitigations.json")
    args = p.parse_args()

    techs = [t.strip() for t in args.techniques.split(",") if t.strip()]
    drv = connect(args.uri, args.user, args.password)
    try:
        mitigations = fetch_mitigations_for_techniques(drv, techs)
    finally:
        drv.close()
    with open(args.out, "w") as f:
        json.dump({"techniques": techs, "mitigations": mitigations}, f, indent=2)
    print("Wrote", args.out)

if __name__ == "__main__":
    main()
