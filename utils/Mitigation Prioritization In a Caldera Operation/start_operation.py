#!/usr/bin/env python3
"""
start_operation.py
Start a Caldera operation. Either supply --adversary_id OR supply --techniques (comma-separated TIDs).
If techniques are supplied, a temporary adversary is created (non-destructive discovery abilities).
Outputs operation id.
"""

import argparse, requests, json, uuid, time
from urllib.parse import urljoin

def headers(api_key):
    h = {"Accept": "application/json"}
    if api_key:
        h["KEY"] = api_key
    return h

def create_temp_adversary(base, api_key, techniques):
    """
    Create a temporary adversary containing simple discovery abilities mapped to technique IDs.
    Returns adversary_id.
    """
    url = urljoin(base, "/api/v2/adversaries")
    # Build simple abilities: map each technique to a safe command (discovery)
    abilities = []
    for i, tid in enumerate(techniques):
        aid = f"tmp-{tid}-{uuid.uuid4().hex[:6]}"
        # Use simple commands for common techniques. If unknown, use a generic echo that includes tid.
        cmd = {"T1082": "uname -a; echo '---'; cat /etc/os-release || true",
               "T1016": "ip -br a; echo '---'; ss -tunap || true",
               "T1059": "echo 'Listing /tmp'; ls -la /tmp || true"
               }.get(tid, f"echo 'Running ability for {tid}'; uname -a || true")
        ability = {
            "id": aid,
            "name": f"tmp-{tid}",
            "platform": "linux",
            "executor": "sh",
            "command": cmd,
            "tactic": "discovery",
            "technique": tid
        }
        abilities.append(ability)
    payload = {
        "name": f"temp-adversary-{uuid.uuid4().hex[:6]}",
        "description": "Temporary adversary created by start_operation.py",
        "abilities": abilities
    }
    resp = requests.post(url, headers=headers(api_key), json=payload, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    # Caldera may return the created adversary object; try to extract id
    adv_id = data.get("id") or data.get("adversary_id") or data.get("uuid") or data.get("adversary", {}).get("id")
    return adv_id

def start_operation(base, api_key, adversary_id, agent_ids, name=None, planner="atomic"):
    url = urljoin(base, "/api/v2/operations")
    payload = {
        "name": name or f"auto-op-{uuid.uuid4().hex[:6]}",
        "adversary": adversary_id,
        "agents": agent_ids,
        "planner_name": planner
    }
    resp = requests.post(url, headers=headers(api_key), json=payload, timeout=20)
    resp.raise_for_status()
    return resp.json()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--api-key", default="")
    p.add_argument("--adversary-id", default=None)
    p.add_argument("--techniques", default=None, help="Comma-separated TIDs if you want to create a temp adversary")
    p.add_argument("--agents", required=True, help="Comma-separated agent IDs to target")
    p.add_argument("--name", default=None)
    args = p.parse_args()

    base = args.base.rstrip("/")
    api_key = args.api_key or None
    agent_ids = [a.strip() for a in args.agents.split(",") if a.strip()]

    adv_id = args.adversary_id
    temp_created = False
    if not adv_id:
        if not args.techniques:
            raise SystemExit("Either --adversary-id or --techniques must be provided")
        techniques = [t.strip() for t in args.techniques.split(",") if t.strip()]
        print("Creating temporary adversary with techniques:", techniques)
        adv_id = create_temp_adversary(base, api_key, techniques)
        temp_created = True
        print("Temporary adversary id:", adv_id)

    # start operation
    print("Starting operation with adversary:", adv_id, "agents:", agent_ids)
    op_resp = start_operation(base, api_key, adv_id, agent_ids, name=args.name)
    # try to extract op id
    op_id = op_resp.get("id") or op_resp.get("operation_id") or op_resp.get("op_id") or op_resp.get("uuid")
    print("Operation response:", json.dumps(op_resp, indent=2))
    print("Operation id:", op_id)
    # if temporary adversary created, we keep it (or optionally delete); for safety, keep it and leave cleanup to user
    if temp_created:
        print("Note: temporary adversary was created. Remove manually via Caldera UI or API if desired.")
    if not op_id:
        raise SystemExit("Could not determine operation id from Caldera response")
    print(op_id)

if __name__ == "__main__":
    main()
