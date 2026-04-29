"""Serialize ORM detection rows into the shape expected by the React client."""

from __future__ import annotations

from typing import Any

from aegisrec.models.site import AlertRecord, AttackChainRecord, MitigationRecord


def chain_to_client(row: AttackChainRecord) -> dict[str, Any]:
    p = dict(row.payload)
    eid = p.get("id") or row.external_id
    if eid:
        p["id"] = eid
    p["persistedRecordId"] = row.id
    return p


def alert_to_client(row: AlertRecord) -> dict[str, Any]:
    p = dict(row.payload)
    eid = p.get("id") or row.external_id
    if eid:
        p["id"] = eid
    p["persistedRecordId"] = row.id
    return p


def mitigation_to_client(row: MitigationRecord) -> dict[str, Any]:
    p = dict(row.payload)
    mid = p.get("id") or row.external_id
    if mid:
        p["id"] = mid
    p["persistedRecordId"] = row.id
    p["status"] = "implemented" if row.applied else (p.get("status") or "proposed")
    return p
