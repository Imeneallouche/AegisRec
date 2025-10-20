#!/usr/bin/env python3
"""
build_mitre_ics_kg.py

Reads an Excel file with the MITRE ATT&CK for ICS sheets (as described by the user)
and populates a Neo4j knowledge graph with nodes and relationships.

Author: ChatGPT (GPT-5 Thinking mini)
"""

import argparse
import os
import re
import sys
import math
from typing import List, Dict, Any, Optional
import pandas as pd
from neo4j import GraphDatabase, basic_auth

# -------------------------
# Utilities
# -------------------------
def parse_list_field(val: Any) -> List[str]:
    """Parse list-like cell values into a list of strings.
    Accepts semicolon or comma separated or already a list.
    """
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if x is not None and str(x).strip() != ""]
    s = str(val).strip()
    if s == "":
        return []
    # Try splitting on semicolons first (MITRE exports often use ';')
    if ";" in s:
        parts = [p.strip() for p in s.split(";") if p.strip() != ""]
        return parts
    # fallback split on commas
    if "," in s:
        parts = [p.strip() for p in s.split(",") if p.strip() != ""]
        return parts
    return [s]

def sanitize_rel_type(s: str) -> str:
    """Create a safe uppercased relationship type for Neo4j from arbitrary mapping_type."""
    if not s or (isinstance(s, float) and math.isnan(s)):
        return "RELATED_TO"
    s = str(s).strip()
    # Remove problematic characters and convert to uppercase underscores
    s = re.sub(r"[^\w\s/+-]", " ", s)
    s = s.replace("/", " ")
    parts = re.split(r'[\s\-\+]+', s)
    parts = [p for p in parts if p]
    if not parts:
        return "RELATED_TO"
    return "_".join(p.upper() for p in parts)

def sanitize_label(s: str) -> str:
    return re.sub(r"[^\w]", "_", s.strip()).upper()

def node_key_from_row(row: Dict[str, Any], id_col_candidates=("ID", "Id", "id")) -> Optional[str]:
    for c in id_col_candidates:
        if c in row and not (isinstance(row[c], float) and math.isnan(row[c])):
            return str(row[c]).strip()
    return None

# -------------------------
# Neo4j helpers
# -------------------------
class Neo4jKG:
    def __init__(self, uri: str, user: str, password: str, max_retry=3):
        self._driver = GraphDatabase.driver(uri, auth=basic_auth(user, password))
        self.max_retry = max_retry

    def close(self):
        self._driver.close()

    def run(self, cypher: str, params: Dict[str, Any] = None):
        if params is None:
            params = {}
        # Simple retry
        attempt = 0
        while True:
            try:
                with self._driver.session() as session:
                    return session.run(cypher, **params)
            except Exception as e:
                attempt += 1
                if attempt >= self.max_retry:
                    raise
                print(f"[WARN] query failed, retrying ({attempt}/{self.max_retry}): {e}")

    def create_constraints(self, label_to_idprop: Dict[str, str]):
        """Create uniqueness constraints for labels on id prop"""
        for label, prop in label_to_idprop.items():
            q = f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.{prop} IS UNIQUE"
            print(f"[INFO] Creating constraint: {q}")
            self.run(q)

    def merge_node(self, label: str, key: str, props: Dict[str, Any]):
        """MERGE node with label and unique key property 'id' (or chosen key)."""
        # Use parameterized MERGE
        cy = f"""
        MERGE (n:{label} {{id: $id}})
        SET n += $props
        RETURN n.id
        """
        params = {"id": key, "props": props}
        self.run(cy, params)

    def merge_relationship(self, from_label: str, from_id: str, rel_type: str, to_label: str, to_id: str, rel_props: Dict[str, Any] = None):
        """MERGE relationship between nodes using id properties. Adds rel_props if provided."""
        if rel_props is None:
            rel_props = {}
        cy = f"""
        MATCH (a:{from_label} {{id: $from_id}})
        MATCH (b:{to_label} {{id: $to_id}})
        MERGE (a)-[r:`{rel_type}`]->(b)
        SET r += $rel_props
        RETURN a.id, type(r), b.id
        """
        params = {"from_id": from_id, "to_id": to_id, "rel_props": rel_props}
        self.run(cy, params)

# -------------------------
# Ingest functions
# -------------------------
def row_to_props(row: pd.Series, keep_cols: List[str]) -> Dict[str, Any]:
    props: Dict[str, Any] = {}
    for c in keep_cols:
        if c in row:
            v = row[c]
            if isinstance(v, float) and math.isnan(v):
                continue
            # Keep strings, lists for parsed fields as strings or lists
            props[c.lower().replace(" ", "_")] = v
    return props

def ingest_techniques(df: pd.DataFrame, kg: Neo4jKG):
    label = "Technique"
    for idx, r in df.iterrows():
        # Unique key
        key = str(r.get("ID") or r.get("Id") or r.get("id") or "").strip()
        if key == "":
            print(f"[WARN] skipping technique row {idx} with missing ID")
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID") or r.get("STIX_ID") or r.get("stix id") or r.get("stix_id") or None,
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "detection": r.get("detection"),
            "platforms": parse_list_field(r.get("platforms")),
            "data_sources": parse_list_field(r.get("data sources") or r.get("data_sources") or r.get("data sources")),
            "tactics": parse_list_field(r.get("tactics")),
            "contributors": parse_list_field(r.get("contributors")),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        # Remove None values
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)

def ingest_tactics(df: pd.DataFrame, kg: Neo4jKG):
    label = "Tactic"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID") or r.get("STIX_ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version")
        }
        props = {k: v for k, v in props.items() if v is not None}
        kg.merge_node(label, key, props)

def ingest_software(df: pd.DataFrame, kg: Neo4jKG):
    label = "Software"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "platforms": parse_list_field(r.get("platforms")),
            "aliases": parse_list_field(r.get("aliases")),
            "type": r.get("type"),
            "contributors": parse_list_field(r.get("contributors")),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)

def ingest_groups(df: pd.DataFrame, kg: Neo4jKG):
    label = "Group"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "contributors": parse_list_field(r.get("contributors")),
            "associated_groups": parse_list_field(r.get("associated groups")),
            "associated_groups_citations": parse_list_field(r.get("associated groups citations")),
            "relationship_citations": parse_list_field(r.get("relationship citations")),
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)
        # create associated group edges
        for assoc in parse_list_field(r.get("associated groups")):
            # We don't necessarily have ID of associated groups; ideally MITRE supplies IDs in that column.
            # We'll try to interpret assoc as ID if it matches an ID-like pattern, else create a placeholder node.
            assoc_key = assoc
            # create placeholder group if missing
            kg.merge_node("Group", assoc_key, {"name": assoc})
            kg.merge_relationship("Group", key, "ASSOCIATED_WITH", "Group", assoc_key, {"source": "group.associated_groups"})

def ingest_campaigns(df: pd.DataFrame, kg: Neo4jKG):
    label = "Campaign"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "associated_campaigns": parse_list_field(r.get("associated campaigns")),
            "first_seen": r.get("first seen"),
            "first_seen_citation": r.get("first seen citation"),
            "last_seen": r.get("last seen"),
            "last_seen_citation": r.get("last seen citation"),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)
        for assoc in parse_list_field(r.get("associated campaigns")):
            assoc_key = assoc
            kg.merge_node("Campaign", assoc_key, {"name": assoc})
            kg.merge_relationship("Campaign", key, "ASSOCIATED_WITH", "Campaign", assoc_key, {"source": "campaign.associated_campaigns"})

def ingest_assets(df: pd.DataFrame, kg: Neo4jKG):
    label = "Asset"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "platforms": parse_list_field(r.get("platforms")),
            "sectors": parse_list_field(r.get("sectors")),
            "related_assets": parse_list_field(r.get("related assets")),
            "related_assets_sectors": parse_list_field(r.get("related assets sectors")),
            "related_assets_description": parse_list_field(r.get("related assets description")),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)
        # link related assets if present
        for related in parse_list_field(r.get("related assets")):
            related_key = related
            kg.merge_node("Asset", related_key, {"name": related})
            kg.merge_relationship("Asset", key, "RELATED_TO", "Asset", related_key, {"source": "asset.related_assets"})

def ingest_mitigations(df: pd.DataFrame, kg: Neo4jKG):
    label = "Mitigation"
    for idx, r in df.iterrows():
        key = str(r.get("ID") or "").strip()
        if key == "":
            continue
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "url": r.get("url"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "domain": r.get("domain"),
            "version": r.get("version"),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)

def ingest_datasources(df: pd.DataFrame, kg: Neo4jKG):
    label = "Datasource"
    for idx, r in df.iterrows():
        # Some datasources sheet uses 'ID' column or 'name' as ID - use STIX ID if present else Name
        key = None
        if "ID" in r and not (isinstance(r["ID"], float) and math.isnan(r["ID"])):
            key = str(r["ID"])
        elif "STIX ID" in r and not (isinstance(r["STIX ID"], float) and math.isnan(r["STIX ID"])):
            key = str(r["STIX ID"])
        else:
            key = str(r.get("name") or f"datasource_{idx}")
        props = {
            "id": key,
            "stix_id": r.get("STIX ID"),
            "name": r.get("name"),
            "description": r.get("description"),
            "collection_layers": parse_list_field(r.get("collection layers")),
            "platforms": parse_list_field(r.get("platforms")),
            "created": r.get("created"),
            "modified": r.get("modified"),
            "type": r.get("type"),
            "version": r.get("version"),
            "url": r.get("url"),
            "contributors": parse_list_field(r.get("contributors"))
        }
        props = {k: v for k, v in props.items() if v is not None and v != []}
        kg.merge_node(label, key, props)

def ingest_matrix(sheet: pd.DataFrame, kg: Neo4jKG, tactics_sheet: pd.DataFrame, techniques_sheet: pd.DataFrame):
    """
    Matrix sheet: columns are tactic names, rows have techniques (cells may be empty or contain technique IDs).
    We'll iterate columns (tactics) and create Tactic -> USES -> Technique edges for each technique cell found.
    """
    # Map tactic name -> tactic ID if possible
    tactic_name_to_id = {}
    if tactics_sheet is not None:
        for idx, r in tactics_sheet.iterrows():
            tactic_name = str(r.get("name") or r.get("NAME") or "").strip()
            tactic_id = str(r.get("ID") or tactic_name)
            tactic_name_to_id[tactic_name] = tactic_id

    # Map technique lookup: name or ID -> technique ID
    technique_name_to_id = {}
    if techniques_sheet is not None:
        for idx, r in techniques_sheet.iterrows():
            t_id = str(r.get("ID") or "").strip()
            t_name = str(r.get("name") or "").strip()
            if t_name:
                technique_name_to_id[t_name] = t_id
            if t_id:
                technique_name_to_id[t_id] = t_id

    # Iterate matrix
    for col in sheet.columns:
        tactic_raw = col
        tactic_name = str(tactic_raw).strip()
        tactic_id = tactic_name_to_id.get(tactic_name, tactic_name)
        # ensure tactic node exists
        kg.merge_node("Tactic", tactic_id, {"name": tactic_name})
        # For each row cell
        for idx, cell_val in sheet[tactic_raw].items():
            if cell_val is None or (isinstance(cell_val, float) and math.isnan(cell_val)):
                continue
            # cells may contain technique IDs or names; parse lists too
            for val in parse_list_field(cell_val):
                val = str(val).strip()
                if val == "":
                    continue
                # Determine technique id
                technique_id = technique_name_to_id.get(val, val)
                # create technique placeholder if missing
                kg.merge_node("Technique", technique_id, {"name": val})
                # Create Tactic -> USES -> Technique
                kg.merge_relationship("Tactic", tactic_id, "USES", "Technique", technique_id, {"source": "matrix_sheet", "matrix_column": tactic_name})

def ingest_relationships(df: pd.DataFrame, kg: Neo4jKG):
    """
    relationships sheet columns:
    source ID ,source name, source ref ,source type ,mapping type, target ID, target name, target ref, target type, mapping description, STIX ID ,created, last modified
    We'll create nodes if missing (using source type/target type as label heuristics), then create relationships using mapping type as relation name.
    """
    for idx, r in df.iterrows():
        src_id = None
        tgt_id = None
        # attempt to get source and target IDs
        for c in ("source ID","source id","source_id","sourceId","sourceId "):
            if c in r and not (isinstance(r[c], float) and math.isnan(r[c])):
                src_id = str(r[c]).strip()
                break
        if not src_id:  # fallback to source name
            src_id = str(r.get("source name") or r.get("source_name") or f"src_{idx}")

        for c in ("target ID","target id","target_id","targetId"):
            if c in r and not (isinstance(r[c], float) and math.isnan(r[c])):
                tgt_id = str(r[c]).strip()
                break
        if not tgt_id:
            tgt_id = str(r.get("target name") or r.get("target_name") or f"tgt_{idx}")

        src_type = str(r.get("source type") or r.get("source_type") or "").strip() or "Unknown"
        tgt_type = str(r.get("target type") or r.get("target_type") or "").strip() or "Unknown"

        # Normalize label names to title case labels used earlier
        # e.g., "attack-pattern" -> Technique, "tool" -> Software, "identity" -> Group? try some heuristics
        def normalize_label(type_str: str) -> str:
            t = type_str.lower()
            if "technique" in t or "attack-pattern" in t:
                return "Technique"
            if "tactic" in t:
                return "Tactic"
            if "software" in t or "tool" in t:
                return "Software"
            if "group" in t or "intrusion-set" in t or "actor" in t:
                return "Group"
            if "campaign" in t:
                return "Campaign"
            if "malware" in t:
                return "Software"
            if "vulnerability" in t:
                return "Vulnerability"
            if "mitigation" in t or "course-of-action" in t:
                return "Mitigation"
            if "datasource" in t or "data source" in t:
                return "Datasource"
            if "asset" in t or "device" in t or "system" in t:
                return "Asset"
            # fallback
            return sanitize_label(type_str).capitalize()

        src_label = normalize_label(src_type)
        tgt_label = normalize_label(tgt_type)

        # create minimal nodes if not present
        kg.merge_node(src_label, src_id, {"name": r.get("source name")})
        kg.merge_node(tgt_label, tgt_id, {"name": r.get("target name")})

        mapping_type = r.get("mapping type") or r.get("mapping_type") or r.get("mappingtype") or r.get("mapping type ")
        rel_type = sanitize_rel_type(mapping_type)

        rel_props = {
            "mapping_description": r.get("mapping description"),
            "stix_id": r.get("STIX ID"),
            "created": r.get("created"),
            "last_modified": r.get("last modified") or r.get("last_modified"),
            "source_ref": r.get("source ref"),
            "target_ref": r.get("target ref"),
            "relationship_citations": parse_list_field(r.get("relationship citations"))
        }
        rel_props = {k: v for k, v in rel_props.items() if v is not None and v != []}

        kg.merge_relationship(src_label, src_id, rel_type, tgt_label, tgt_id, rel_props)

        # If mapping_type implies common ATT&CK relations, also create canonical relations
        mt = (mapping_type or "").lower()
        # mapping hints
        if "mitigat" in mt or "course-of-action" in mt:
            kg.merge_relationship("Technique", src_id, "MITIGATED_BY", "Mitigation", tgt_id, {"source": "relationships_sheet"} )
        if "uses" == mt or "uses" in mt:
            # If groups use software, or group uses technique, we attempt canonicalization:
            if src_label == "Group" and tgt_label == "Software":
                kg.merge_relationship("Group", src_id, "USES_SOFTWARE", "Software", tgt_id, {"source": "relationships_sheet"})
            elif src_label == "Group" and tgt_label == "Technique":
                kg.merge_relationship("Group", src_id, "USES", "Technique", tgt_id, {"source": "relationships_sheet"})
            elif src_label == "Software" and tgt_label == "Technique":
                kg.merge_relationship("Software", src_id, "APPLIES_TECHNIQUE", "Technique", tgt_id, {"source": "relationships_sheet"})

# -------------------------
# Post-processing canonical relationships
# -------------------------
def create_canonical_relations_from_technique_fields(techniques_df: pd.DataFrame, kg: Neo4jKG):
    """
    For each Technique row, check 'data sources' -> create Datasource -[:DETECTS]-> Technique
                        'tactics' -> Tactic -[:USES]-> Technique
                        'platforms' -> add as tag to technique node
                        'detection' -> store on technique node
    """
    for idx, r in techniques_df.iterrows():
        t_id = str(r.get("ID") or "").strip()
        if not t_id:
            continue
        # Data sources
        for ds in parse_list_field(r.get("data sources") or r.get("data_sources") or r.get("data sources")):
            ds_key = ds
            kg.merge_node("Datasource", ds_key, {"name": ds})
            kg.merge_relationship("Datasource", ds_key, "DETECTS", "Technique", t_id, {"source": "technique.data_sources"})

        # tactics
        for t in parse_list_field(r.get("tactics")):
            tactic_key = t
            kg.merge_node("Tactic", tactic_key, {"name": t})
            kg.merge_relationship("Tactic", tactic_key, "USES", "Technique", t_id, {"source": "technique.tactics"})

        # platforms are stored as technique properties already by node merge step

def create_technique_mitigation_links_from_relationships(kg: Neo4jKG, mitigations_df: pd.DataFrame, techniques_df: pd.DataFrame):
    """
    MITRE sometimes provides explicit relationships in 'relationships' sheet for mitigations;
    but also we can search in relationships to link Technique -> MITIGATED_BY -> Mitigation if mapping types found.
    This function is a placeholder if further mapping is needed. Currently most are created in ingest_relationships().
    """
    pass

# -------------------------
# Main entry
# -------------------------
def main():
    parser = argparse.ArgumentParser(description="Build MITRE ATT&CK ICS Knowledge Graph (Neo4j)")
    parser.add_argument("--excel", required=True, help="Path to Excel file containing MITRE ATT&CK ICS sheets")
    parser.add_argument("--neo4j-uri", required=False, default=os.environ.get("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--neo4j-user", required=False, default=os.environ.get("NEO4J_USER", "neo4j"))
    parser.add_argument("--neo4j-pass", required=False, default=os.environ.get("NEO4J_PASS", "neo4j"))
    args = parser.parse_args()

    excel_path = args.excel
    if not os.path.exists(excel_path):
        print(f"[ERR] Excel file not found: {excel_path}")
        sys.exit(1)

    print("[INFO] Reading Excel file...")
    xls = pd.read_excel(excel_path, sheet_name=None, engine="openpyxl")

    # Normalize sheet retrieval
    def get_sheet(name_options: List[str]):
        for n in name_options:
            if n in xls:
                return xls[n]
            # try case-insensitive match
            for k in xls.keys():
                if k.strip().lower() == n.strip().lower():
                    return xls[k]
        return None

    techniques_df = get_sheet(["techniques","Techniques","Sheet1","Sheet 1"])
    tactics_df = get_sheet(["tactics","Tactics","sheet2","Sheet2"])
    software_df = get_sheet(["software","Software","sheet3","Sheet3"])
    groups_df = get_sheet(["groups","Groups","sheet4","Sheet4"])
    campaigns_df = get_sheet(["campaigns","Campaigns","sheet5","Sheet5"])
    assets_df = get_sheet(["assets","Assets","sheet6","Sheet6"])
    mitigations_df = get_sheet(["mitigations","Mitigations","sheet7","Sheet7"])
    matrix_df = get_sheet(["matrix","Matrix","sheet8","Sheet8"])
    relationships_df = get_sheet(["relationships","Relationships","sheet9","Sheet9"])
    datasources_df = get_sheet(["datasources","Datasources","sheet10","Sheet10"])

    print("[INFO] Connecting to Neo4j...")
    kg = Neo4jKG(args.neo4j_uri, args.neo4j_user, args.neo4j_pass)

    print("[INFO] Creating constraints...")
    # basic label->id property constraints (add more if desired)
    kg.create_constraints({
        "Technique": "id",
        "Tactic": "id",
        "Software": "id",
        "Group": "id",
        "Campaign": "id",
        "Asset": "id",
        "Mitigation": "id",
        "Datasource": "id"
    })

    # Ingest nodes
    if techniques_df is not None:
        print("[INFO] Ingesting Techniques...")
        ingest_techniques(techniques_df, kg)
    else:
        print("[WARN] Techniques sheet not found")

    if tactics_df is not None:
        print("[INFO] Ingesting Tactics...")
        ingest_tactics(tactics_df, kg)
    else:
        print("[WARN] Tactics sheet not found")

    if software_df is not None:
        print("[INFO] Ingesting Software...")
        ingest_software(software_df, kg)
    else:
        print("[WARN] Software sheet not found")

    if groups_df is not None:
        print("[INFO] Ingesting Groups...")
        ingest_groups(groups_df, kg)
    else:
        print("[WARN] Groups sheet not found")

    if campaigns_df is not None:
        print("[INFO] Ingesting Campaigns...")
        ingest_campaigns(campaigns_df, kg)
    else:
        print("[WARN] Campaigns sheet not found")

    if assets_df is not None:
        print("[INFO] Ingesting Assets...")
        ingest_assets(assets_df, kg)
    else:
        print("[WARN] Assets sheet not found")

    if mitigations_df is not None:
        print("[INFO] Ingesting Mitigations...")
        ingest_mitigations(mitigations_df, kg)
    else:
        print("[WARN] Mitigations sheet not found")

    if datasources_df is not None:
        print("[INFO] Ingesting Datasources...")
        ingest_datasources(datasources_df, kg)
    else:
        print("[WARN] Datasources sheet not found")

    # Create canonical relations from technique fields: datasource->detects->technique, tactic->uses->technique
    if techniques_df is not None:
        print("[INFO] Creating canonical relations from Technique fields...")
        create_canonical_relations_from_technique_fields(techniques_df, kg)

    # Ingest matrix relationships to ensure Tactic -> USES -> Technique links
    if matrix_df is not None:
        print("[INFO] Ingesting Matrix relationships (Tactic -> USES -> Technique)...")
        ingest_matrix(matrix_df, kg, tactics_df, techniques_df)
    else:
        print("[WARN] Matrix sheet not found")

    # Ingest explicit relationships sheet (source->target) - this is important to include all relations
    if relationships_df is not None:
        print("[INFO] Ingesting explicit Relationships sheet...")
        ingest_relationships(relationships_df, kg)
    else:
        print("[WARN] Relationships sheet not found")

    # Post processing
    print("[INFO] Post-processing / creating canonical derived links (if any)...")
    create_technique_mitigation_links_from_relationships(kg, mitigations_df, techniques_df)

    print("[INFO] Done. Closing connection.")
    kg.close()
    print("[INFO] Knowledge graph build complete.")

if __name__ == "__main__":
    main()
