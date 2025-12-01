"""
mitigation_prioritizer.py

Inputs:
- test_ability.xlsx  (sheet 'Sheet1' or first sheet)
    required columns: Ability Name, Ability Description, Tactic, Technique ID, Technique name
- technique_priority_scores.xlsx (sheet 'Priority Scores' or first sheet)
    required columns: Technique ID, Priority_Score_Normalized
- Neo4j instance (uri, user, password, optional database)
    The script queries Neo4j to fetch mitigations linked to each technique.
    If Neo4j is not available, you may provide 'technique_mitigations.csv' with columns:
      Technique_ID, Mitigation_ID, Mitigation_Name

Outputs:
- output/prioritized_mitigations.xlsx (sheets: Mitigation Scores, Technique->Mitigations, Missing Techniques, Config)
- output/prioritized_mitigations.csv (full ranked list)
- output/technique_mitigations_lookup.csv (raw mapping pulled from Neo4j or fallback csv)

Usage:
  python mitigation_prioritizer.py \
    --abilities input/test_ability.xlsx \
    --tech_scores input/technique_priority_scores.xlsx \
    --neo4j_uri bolt://localhost:7687 \
    --neo4j_user neo4j \
    --neo4j_pass mypass \
    --outdir output

If Neo4j is not available:
  python mitigation_prioritizer.py \
    --abilities input/test_ability.xlsx \
    --tech_scores input/technique_priority_scores.xlsx \
    --fallback_mappings input/technique_mitigations.csv \
    --outdir output

Dependencies:
  pip install pandas numpy openpyxl neo4j
"""

import os
import argparse
import logging
from typing import List, Dict, Tuple, Optional
import pandas as pd
import numpy as np

# optional Neo4j driver
try:
    from neo4j import GraphDatabase, basic_auth
    NEO4J_AVAILABLE = True
except Exception:
    NEO4J_AVAILABLE = False

# -------------------------
# Logging configuration
# -------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mitigation_prioritizer")


# -------------------------
# Neo4j helper functions (ADAPTED FOR YOUR SCHEMA)
# -------------------------
def connect_neo4j(uri: str, user: str, password: str, database: Optional[str] = None):
    """
    Create and return a neo4j driver instance. Caller is responsible for closing driver.
    """
    if not NEO4J_AVAILABLE:
        raise RuntimeError("neo4j-driver is not installed. Install with: pip install neo4j")

    driver = GraphDatabase.driver(uri, auth=basic_auth(user, password))
    return driver


def fetch_mitigations_from_neo4j(driver, technique_ids: List[str], database: Optional[str] = None,
                                 batch_size: int = 50) -> pd.DataFrame:
    """
    Query Neo4j for Mitigation nodes that MITIGATE Technique nodes.
    Assumes:
      - Technique nodes have property 'ID' (string), e.g. "T1059"
      - Mitigation nodes are labeled :Mitigation (but will accept any node connected with MITIGATES)
      - Relation type between mitigation and technique is 'MITIGATES' (direction-agnostic)

    Returns DataFrame columns: Technique_ID, Mitigation_ID, Mitigation_Name
    """
    technique_ids = list(dict.fromkeys([str(t).strip() for t in technique_ids if pd.notna(t) and str(t).strip()]))

    results = []
    logger.info("Querying Neo4j for mitigations (schema: Mitigation -- MITIGATES -- Technique) ...")

    # Cypher: undirected MITIGATES relationship and technique property 'ID'
    cypher = """
    MATCH (m)-[r:MITIGATES]-(t:Technique)
    WHERE t.id = $tid
    RETURN DISTINCT
      $tid AS queried_tid,
      coalesce(m.ID, m.id, m.mitigation_id, m.mitre_id, m.name, m.title) AS mitigation_id,
      coalesce(m.name, m.title, '') AS mitigation_name
    """

    with driver.session(database=database) as session:
        for i in range(0, len(technique_ids), batch_size):
            batch = technique_ids[i:i + batch_size]
            for tid in batch:
                try:
                    records = session.run(cypher, tid=tid)
                    fetched_any = False
                    for rec in records:
                        fetched_any = True
                        mitigation_id = rec["mitigation_id"]
                        mitigation_name = rec["mitigation_name"]
                        if mitigation_id is None:
                            continue
                        results.append({
                            "Technique_ID": tid,
                            "Mitigation_ID": str(mitigation_id).strip(),
                            "Mitigation_Name": str(mitigation_name).strip() if mitigation_name else ""
                        })
                    if not fetched_any:
                        logger.debug(f"No mitigations returned from Neo4j for technique {tid}")
                except Exception as e:
                    logger.warning(f"Neo4j query failed for technique {tid}: {e}")
                    # continue; we'll handle missing technique mappings downstream

    df = pd.DataFrame(results)
    if df.empty:
        logger.warning("No mitigation mappings were retrieved from Neo4j (empty DataFrame).")
    else:
        logger.info(f"Retrieved {len(df)} technique->mitigation links from Neo4j (may include duplicates).")
    return df


# -------------------------
# Pipeline functions (unchanged / lightly adapted)
# -------------------------
def load_ability_list(path: str) -> pd.DataFrame:
    """Load test_ability.xlsx and return DataFrame containing the abilities with Technique_ID column."""
    logger.info(f"Loading ability list from: {path}")
    df = pd.read_excel(path, sheet_name=0, engine="openpyxl")
    # Attempt to locate technique id column
    technique_col = None
    for c in df.columns:
        if c.lower().strip() in ('technique id', 'techniqueid', 'technique_id', 'technique'):
            technique_col = c
            break
    if technique_col is None:
        # try heuristic: column values containing pattern 'T' + digits
        for c in df.columns:
            sample = df[c].dropna().astype(str).head(50).tolist()
            if any(s.strip().upper().startswith("T") and any(ch.isdigit() for ch in s) for s in sample):
                technique_col = c
                logger.info(f"Inferred technique id column: {c}")
                break

    if technique_col is None:
        raise ValueError("Could not find a 'Technique ID' column in the abilities file.")

    df['Technique_ID'] = df[technique_col].astype(str).str.strip()
    unique_techs = df['Technique_ID'].dropna().unique().tolist()
    logger.info(f"Found {len(unique_techs)} unique Technique IDs in ability list.")
    return df


def load_technique_scores(path: str) -> pd.DataFrame:
    """Load technique_priority_scores.xlsx and extract Technique ID and Priority_Score_Normalized."""
    logger.info(f"Loading technique scores from: {path}")
    try:
        df = pd.read_excel(path, sheet_name='Priority Scores', engine="openpyxl")
    except Exception:
        df = pd.read_excel(path, sheet_name=0, engine="openpyxl")

    col_candidates = {c.lower().strip(): c for c in df.columns}
    tid_col = col_candidates.get('technique id') or col_candidates.get('technique_id') or col_candidates.get('techniqueid') or col_candidates.get('technique')
    score_col = col_candidates.get('priority_score_normalized') or col_candidates.get('priority score normalized') or col_candidates.get('priority_score') or col_candidates.get('priority score')

    if tid_col is None or score_col is None:
        possible_tid = [c for c in df.columns if 'technique' in c.lower() and 'id' in c.lower()]
        possible_score = [c for c in df.columns if 'priority' in c.lower() and ('score' in c.lower() or 'normalized' in c.lower())]
        if possible_tid:
            tid_col = possible_tid[0]
        if possible_score:
            score_col = possible_score[0]

    if tid_col is None or score_col is None:
        raise ValueError("Could not find Technique ID and Priority_Score_Normalized columns in technique_priority_scores.xlsx")

    df_out = df[[tid_col, score_col]].copy()
    df_out.columns = ['Technique_ID', 'Priority_Score_Normalized']
    df_out['Technique_ID'] = df_out['Technique_ID'].astype(str).str.strip()
    df_out['Priority_Score_Normalized'] = pd.to_numeric(df_out['Priority_Score_Normalized'], errors='coerce').fillna(0.0)
    logger.info(f"Loaded {len(df_out)} technique scores.")
    return df_out


def build_decision_matrix_and_score(technique_list: List[str],
                                    tech_weights: pd.Series,
                                    technique_to_mitigations: Dict[str, List[Tuple[str, str]]]) -> pd.DataFrame:
    """
    Build decision matrix and compute mitigation scores:
     - For each technique T_j with k_j mitigations, m_ij = 1 / k_j for each mitigation
     - score(M_i) = sum_j w_j * m_ij
    """
    logger.info("Building decision matrix and computing mitigation scores...")

    # normalize tech_weights to a dict
    if isinstance(tech_weights, pd.DataFrame):
        tw = tech_weights.set_index('Technique_ID')['Priority_Score_Normalized'].to_dict()
    elif isinstance(tech_weights, pd.Series):
        if tech_weights.index.name == 'Technique_ID' or tech_weights.name == 'Priority_Score_Normalized':
            tw = tech_weights.to_dict()
        else:
            tw = tech_weights.to_dict()
    elif isinstance(tech_weights, dict):
        tw = tech_weights
    else:
        raise ValueError("tech_weights must be DataFrame/Series/dict")

    mitigation_entries = {}
    for tid in technique_list:
        mids = technique_to_mitigations.get(tid, [])
        k_j = len(mids)
        for mid, mname in mids:
            if mid not in mitigation_entries:
                mitigation_entries[mid] = {'Mitigation_Name': mname, 'Techniques': []}
            mitigation_entries[mid]['Techniques'].append(tid)

    if not mitigation_entries:
        logger.warning("No mitigations were found for the provided techniques.")
        return pd.DataFrame(columns=['Mitigation_ID', 'Mitigation_Name', 'Raw_Score', 'Normalized_Score', 'Rank', 'Support_Count', 'Supporting_Techniques'])

    mitigation_scores = []
    for mid, info in mitigation_entries.items():
        supporting_techs = info['Techniques']
        raw_score = 0.0
        for tid in supporting_techs:
            w_j = float(tw.get(tid, 0.0))
            k_j = len(technique_to_mitigations.get(tid, []))
            if k_j == 0:
                continue
            m_ij = 1.0 / float(k_j)
            raw_score += w_j * m_ij
        mitigation_scores.append({
            'Mitigation_ID': mid,
            'Mitigation_Name': info['Mitigation_Name'],
            'Raw_Score': raw_score,
            'Supporting_Techniques': supporting_techs,
            'Support_Count': len(supporting_techs)
        })

    mit_df = pd.DataFrame(mitigation_scores)
    if mit_df['Raw_Score'].max() - mit_df['Raw_Score'].min() == 0:
        mit_df['Normalized_Score'] = 0.0
    else:
        minv, maxv = mit_df['Raw_Score'].min(), mit_df['Raw_Score'].max()
        mit_df['Normalized_Score'] = (mit_df['Raw_Score'] - minv) / (maxv - minv)

    mit_df = mit_df.sort_values(['Normalized_Score', 'Raw_Score', 'Support_Count'], ascending=[False, False, False]).reset_index(drop=True)
    mit_df['Rank'] = mit_df['Normalized_Score'].rank(method='min', ascending=False).astype(int)
    logger.info(f"Computed scores for {len(mit_df)} unique mitigations.")
    return mit_df[['Mitigation_ID', 'Mitigation_Name', 'Raw_Score', 'Normalized_Score', 'Rank', 'Support_Count', 'Supporting_Techniques']]


# -------------------------
# Main orchestration
# -------------------------
def run_pipeline(args):
    os.makedirs(args.outdir, exist_ok=True)

    # 1) load ability list
    abilities_df = load_ability_list(args.abilities)
    used_techniques = list(abilities_df['Technique_ID'].dropna().astype(str).str.strip().unique())
    logger.info(f"Techniques used in operation: {used_techniques}")

    # 2) load technique scores
    tech_scores_df = load_technique_scores(args.tech_scores)
    tech_scores_map = tech_scores_df.set_index('Technique_ID')['Priority_Score_Normalized'].to_dict()

    # warn about missing technique scores
    missing_scores = [t for t in used_techniques if t not in tech_scores_map]
    if missing_scores:
        logger.warning(f"{len(missing_scores)} technique(s) missing in technique scores: {missing_scores}")
        for t in missing_scores:
            tech_scores_map[t] = 0.0

    # 3) Extract mitigations from Neo4j OR fallback mapping
    technique_mit_df = pd.DataFrame()
    if args.fallback_mappings:
        logger.info("Loading fallback technique->mitigation mappings from CSV.")
        technique_mit_df = pd.read_csv(args.fallback_mappings)
        # normalize columns to Technique_ID, Mitigation_ID, Mitigation_Name if possible
        cols_lower = {c.lower(): c for c in technique_mit_df.columns}
        if 'technique_id' not in cols_lower:
            # try to rename heuristically
            for k in ('technique', 'technique id', 'techniqueid'):
                if k in cols_lower:
                    technique_mit_df = technique_mit_df.rename(columns={cols_lower[k]: 'Technique_ID'})
                    break
        if 'mitigation_id' not in cols_lower:
            for k in ('mitigation', 'mitigation id', 'mitigationid'):
                if k in cols_lower:
                    technique_mit_df = technique_mit_df.rename(columns={cols_lower[k]: 'Mitigation_ID'})
                    break
        if 'mitigation_name' not in cols_lower:
            for k in ('mitigation name', 'name', 'title'):
                if k in cols_lower:
                    technique_mit_df = technique_mit_df.rename(columns={cols_lower[k]: 'Mitigation_Name'})
                    break
        technique_mit_df['Technique_ID'] = technique_mit_df['Technique_ID'].astype(str).str.strip()
        technique_mit_df['Mitigation_ID'] = technique_mit_df['Mitigation_ID'].astype(str).str.strip()
    else:
        if not NEO4J_AVAILABLE:
            raise RuntimeError("neo4j-driver not installed and no fallback mapping provided. Install neo4j or provide --fallback_mappings.")
        driver = connect_neo4j(args.neo4j_uri, args.neo4j_user, args.neo4j_pass, args.neo4j_db)
        try:
            technique_mit_df = fetch_mitigations_from_neo4j(driver, used_techniques, database=args.neo4j_db)
        finally:
            driver.close()

    # mapping technique -> list of (mitigation_id, mitigation_name)
    technique_to_mitigations = {}
    if not technique_mit_df.empty:
        for _, row in technique_mit_df.iterrows():
            tid = str(row['Technique_ID']).strip()
            mid = str(row['Mitigation_ID']).strip()
            mname = str(row.get('Mitigation_Name', '')).strip() if 'Mitigation_Name' in technique_mit_df.columns else ''
            technique_to_mitigations.setdefault(tid, []).append((mid, mname))
    else:
        logger.warning("No technique->mitigation mappings available. Exiting pipeline with empty results.")
        empty_out_path = os.path.join(args.outdir, 'prioritized_mitigations_empty.xlsx')
        pd.DataFrame().to_excel(empty_out_path)
        return

    # 4) Build decision matrix and apply WSM
    mit_df = build_decision_matrix_and_score(used_techniques, pd.Series(tech_scores_map), technique_to_mitigations)

    # 5) Export outputs
    out_xlsx = os.path.join(args.outdir, args.output_file)
    out_csv = os.path.join(args.outdir, args.output_csv)
    lookup_csv = os.path.join(args.outdir, 'technique_mitigations_lookup.csv')
    missing_csv = os.path.join(args.outdir, 'missing_techniques.csv')

    logger.info(f"Exporting results to {out_xlsx} and {out_csv} ...")
    with pd.ExcelWriter(out_xlsx, engine='openpyxl') as writer:
        mit_df.to_excel(writer, sheet_name='Mitigation Scores', index=False)
        mapping_rows = []
        for tid, mids in technique_to_mitigations.items():
            for mid, mname in mids:
                mapping_rows.append({'Technique_ID': tid, 'Mitigation_ID': mid, 'Mitigation_Name': mname})
        mapping_df = pd.DataFrame(mapping_rows)
        mapping_df.to_excel(writer, sheet_name='Technique->Mitigations', index=False)
        if missing_scores:
            pd.DataFrame({'Missing_Technique_ID': missing_scores}).to_excel(writer, sheet_name='Missing Techniques', index=False)
        config_summary = {
            'Parameter': ['Abilities file', 'Technique scores file', 'Neo4j URI (or fallback csv)', 'Number of techniques used', 'Number of unique mitigations found'],
            'Value': [args.abilities, args.tech_scores, args.fallback_mappings if args.fallback_mappings else args.neo4j_uri, len(used_techniques), len(mit_df)]
        }
        pd.DataFrame(config_summary).to_excel(writer, sheet_name='Config Summary', index=False)

    mit_df.to_csv(out_csv, index=False)
    mapping_df.to_csv(lookup_csv, index=False)
    if missing_scores:
        pd.DataFrame({'Missing_Technique_ID': missing_scores}).to_csv(missing_csv, index=False)

    logger.info("✓ Pipeline finished successfully.")
    logger.info(f"  Excel output: {out_xlsx}")
    logger.info(f"  CSV output:   {out_csv}")
    logger.info(f"  Lookup CSV:   {lookup_csv}")
    if missing_scores:
        logger.info(f"  Missing techniques saved to: {missing_csv}")


# -------------------------
# CLI
# -------------------------
def parse_args():
    p = argparse.ArgumentParser(description="Prioritize mitigations for a Caldera operation using MCDM/WSM")
    p.add_argument("--abilities", required=True, help="Path to test_ability.xlsx (abilities from Caldera)")
    p.add_argument("--tech_scores", required=True, help="Path to technique_priority_scores.xlsx")
    p.add_argument("--neo4j_uri", default="bolt://localhost:7687", help="Neo4j URI (bolt://host:port)")
    p.add_argument("--neo4j_user", default="neo4j", help="Neo4j username")
    p.add_argument("--neo4j_pass", default="", help="Neo4j password")
    p.add_argument("--neo4j_db", default=None, help="Neo4j database name (optional)")
    p.add_argument("--fallback_mappings", default=None, help="Path to CSV technique_mitigations.csv if Neo4j not used")
    p.add_argument("--outdir", default="output", help="Directory to write outputs")
    p.add_argument("--output_file", default="prioritized_mitigations.xlsx", help="Excel output file name")
    p.add_argument("--output_csv", default="prioritized_mitigations.csv", help="CSV output file name")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_pipeline(args)