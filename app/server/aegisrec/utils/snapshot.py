"""Serialize ORM detection rows into the shape expected by the React client."""

from __future__ import annotations

from typing import Any

from aegisrec.models.site import AlertRecord, AttackChainRecord, MitigationRecord


def normalize_alert_payload(p: dict[str, Any]) -> dict[str, Any]:
    """Map raw ICS engine / ES alert documents to the orchestrator-shaped UI model."""
    out = dict(p)
    eid = out.get("id") or out.get("detection_id")
    if eid is not None:
        out["id"] = str(eid)

    if not out.get("assetId") and out.get("asset_id") is not None:
        out["assetId"] = str(out["asset_id"])

    if not out.get("datacomponent"):
        dc = out.get("datacomponent_id")
        if dc:
            out["datacomponent"] = str(dc)

    if not out.get("message"):
        msg = out.get("log_message") or out.get("evidence_snippet") or out.get("triggering_log")
        out["message"] = str(msg or "")[:2000]

    if not out.get("timestamp"):
        ts = out.get("@timestamp")
        if ts:
            out["timestamp"] = str(ts)

    tech_ids: list[str] = []
    tact_ids: list[str] = []
    tech = out.get("technique")
    if isinstance(tech, dict):
        tid = tech.get("technique_id")
        if tid:
            tech_ids.append(str(tid))
        tact_ids.extend(str(x) for x in (tech.get("tactics") or []) if x)
    for alt in out.get("alternative_techniques") or []:
        if isinstance(alt, dict) and alt.get("technique_id"):
            tech_ids.append(str(alt["technique_id"]))
            tact_ids.extend(str(x) for x in (alt.get("tactics") or []) if x)
    if tech_ids and not out.get("techniqueIds"):
        out["techniqueIds"] = list(dict.fromkeys(tech_ids))
    if tact_ids and not out.get("tacticIds"):
        out["tacticIds"] = list(dict.fromkeys(tact_ids))

    if not out.get("severity"):
        tier = str(out.get("confidence_tier") or "").lower()
        if tier == "high":
            out["severity"] = "high"
        elif tier == "medium":
            out["severity"] = "medium"
        elif tier == "low":
            out["severity"] = "low"
        else:
            out["severity"] = "medium"

    if not out.get("chainId"):
        cid = out.get("correlation_group_id")
        if cid:
            out["chainId"] = str(cid)
        else:
            cids = out.get("chain_ids")
            if isinstance(cids, list) and cids:
                out["chainId"] = str(cids[0])

    if out.get("layerA") is None:
        la = out.get("layer_a")
        if isinstance(la, dict):
            out["layerA"] = la
        else:
            sim = float(out.get("similarity_score") or 0)
            out["layerA"] = {
                "pTruePositive": min(0.99, max(0.0, sim)),
                "decision": "keep",
                "usedSafetyRail": False,
                "driftAlarm": False,
            }

    if out.get("layerC") is None:
        lc = out.get("layer_c")
        if isinstance(lc, dict):
            out["layerC"] = lc
        else:
            out["layerC"] = {
                "action": "monitor",
                "confidence": float(out.get("similarity_score") or 0),
                "rationale": str(out.get("gate_reason") or "ICS detection engine (pre-orchestrator alert)."),
                "usedSafetyRail": False,
                "avarHit": False,
            }

    if out.get("layerB") is None:
        lb = out.get("layer_b")
        if isinstance(lb, dict):
            out["layerB"] = lb
        else:
            out["layerB"] = {
                "chainId": out.get("chainId"),
                "confidence": float(out.get("similarity_score") or 0),
                "techniques": list(out.get("techniqueIds") or []),
                "tactics": list(out.get("tacticIds") or []),
            }

    if out.get("layerD") is None and out.get("layer_d") is None:
        out["layerD"] = {"ready": False}
    elif out.get("layer_d") and out.get("layerD") is None:
        out["layerD"] = out["layer_d"]

    if out.get("signalScore") is None and out.get("similarity_score") is not None:
        out["signalScore"] = float(out["similarity_score"])

    if not out.get("rawLog") and out.get("triggering_log"):
        out["rawLog"] = str(out["triggering_log"])[:4000]

    if not out.get("srcIps"):
        out["srcIps"] = []
    if not out.get("destIps"):
        out["destIps"] = []

    return out


def normalize_chain_payload(p: dict[str, Any]) -> dict[str, Any]:
    """Map correlation group summaries from the ICS engine to chain cards in the UI."""
    out = dict(p)
    gid = out.get("id") or out.get("group_id")
    if gid is not None:
        out["id"] = str(gid)
    out.setdefault("name", f"Correlation group {gid}")
    out.setdefault("status", "active")
    out.setdefault("severity", "medium")

    if not out.get("startedAt") and out.get("first_timestamp"):
        out["startedAt"] = str(out["first_timestamp"])
    if not out.get("lastSeenAt") and out.get("last_timestamp"):
        out["lastSeenAt"] = str(out["last_timestamp"])

    if out.get("alertsCount") is None:
        ec = out.get("event_count")
        out["alertsCount"] = int(ec) if ec is not None else 0

    if out.get("confidence") is None:
        agg = out.get("aggregate_score")
        try:
            out["confidence"] = min(1.0, max(0.0, float(agg))) if agg is not None else 0.5
        except (TypeError, ValueError):
            out["confidence"] = 0.5

    seq = out.get("technique_sequence") or []
    if isinstance(seq, list) and seq:
        if not out.get("techniques"):
            out["techniques"] = [str(x) for x in seq]
    out.setdefault("techniques", [])
    out.setdefault("tactics", [])

    if not out.get("targetAssets"):
        aid = out.get("asset_id")
        if aid:
            out["targetAssets"] = [str(aid)]

    out.setdefault("targetAssets", [])
    out.setdefault("attackerAssets", [])

    if not out.get("summary"):
        ntech = len(out.get("techniques") or [])
        nev = int(out.get("alertsCount") or 0)
        out["summary"] = (
            f"Engine correlation group with {nev} events"
            + (f" spanning {ntech} attributed techniques." if ntech else ".")
        )

    if out.get("killChainProgress") is None:
        depth = int(out.get("chain_depth") or 0)
        out["killChainProgress"] = min(1.0, depth / 8.0) if depth else 0.15

    out.setdefault("steps", [])

    return out


def normalize_mitigation_payload(p: dict[str, Any]) -> dict[str, Any]:
    out = dict(p)
    if not out.get("title"):
        out["title"] = str(out.get("name") or out.get("summary") or "Mitigation plan")[:200]
    if not out.get("rationale"):
        rationale = str(out.get("description") or out.get("details") or "").strip()
        out["rationale"] = rationale[:2000] if rationale else "No rationale captured."
    if not out.get("priority"):
        out["priority"] = "medium"
    out.setdefault("status", "proposed")
    out.setdefault("requiresHumanApproval", True)
    out.setdefault("appliesToTechniques", [])
    out.setdefault("appliesToAssets", [])
    out.setdefault("appliesToZones", [])
    out.setdefault("alertIds", [])
    if not out.get("chainId") and out.get("chain_id"):
        out["chainId"] = str(out["chain_id"])
    return out


def chain_to_client(row: AttackChainRecord) -> dict[str, Any]:
    p = dict(row.payload)
    eid = p.get("id") or row.external_id
    if eid:
        p["id"] = str(eid)
    p["persistedRecordId"] = row.id
    return normalize_chain_payload(p)


def alert_to_client(row: AlertRecord) -> dict[str, Any]:
    p = dict(row.payload)
    eid = p.get("id") or row.external_id
    if eid:
        p["id"] = str(eid)
    p["persistedRecordId"] = row.id
    return normalize_alert_payload(p)


def mitigation_to_client(row: MitigationRecord) -> dict[str, Any]:
    p = dict(row.payload)
    mid = p.get("id") or row.external_id
    if mid:
        p["id"] = str(mid)
    p["persistedRecordId"] = row.id
    p["status"] = "implemented" if row.applied else (p.get("status") or "proposed")
    return normalize_mitigation_payload(p)
