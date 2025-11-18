#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./run_pipeline.sh --techniques T1082,T1016,T1059 --agents <agent_id1,agent_id2> [--adversary-id <id>] [--config config.yaml]
#
# Example:
# ./run_pipeline.sh --techniques T1082,T1016,T1059 --agents agent-uuid-1

CONFIG=${CONFIG:-config.yaml}
BASE=$(yq e '.caldera.base' $CONFIG 2>/dev/null || python3 -c "import yaml,sys;print(yaml.safe_load(open('config.yaml'))['caldera']['base'])")
API_KEY=$(yq e '.caldera.api_key' $CONFIG 2>/dev/null || python3 -c "import yaml,sys;print(yaml.safe_load(open('config.yaml'))['caldera'].get('api_key',''))")

# parse CLI args
ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --techniques) TECHS="$2"; shift 2 ;;
    --agents) AGENTS="$2"; shift 2 ;;
    --adversary-id) ADV_ID="$2"; shift 2 ;;
    --config) CONFIG="$2"; shift 2 ;;
    *) echo "Unknown arg $1"; exit 1 ;;
  esac
done

if [ -z "${TECHS:-}" ] && [ -z "${ADV_ID:-}" ]; then
  echo "Provide --techniques or --adversary-id"; exit 1
fi
if [ -z "${AGENTS:-}" ]; then
  echo "Provide --agents <comma-list>"; exit 1
fi

echo "Starting pipeline"
echo "Caldera base: $BASE"
echo "Techniques: ${TECHS:-<from-adversary>}"
echo "Agents: $AGENTS"

# 1) start operation
if [ -n "${ADV_ID:-}" ]; then
  echo "Using provided adversary id: $ADV_ID"
  OP_JSON=$(python3 - <<PY
import sys, json, requests
base="${BASE}"
api_key="${API_KEY}"
adv="${ADV_ID}"
agents="${AGENTS}".split(",")
hdr={}
if api_key:
  hdr={"KEY":api_key}
payload={"name":"auto-op","adversary":adv,"agents":agents,"planner_name":"atomic"}
r=requests.post(base.rstrip("/")+"/api/v2/operations", headers=hdr, json=payload, timeout=20)
r.raise_for_status()
print(json.dumps(r.json()))
PY
)
else
  echo "Creating temp adversary with techniques: $TECHS"
  OP_JSON=$(python3 - <<PY
import sys, json, requests
base="${BASE}"
api_key="${API_KEY}"
techs=[t.strip() for t in "${TECHS}".split(",") if t.strip()]
hdr = {"Accept":"application/json"}
if api_key:
  hdr["KEY"]=api_key

# create temp adversary
abilities=[]
import uuid
for tid in techs:
    aid=f"tmp-{tid}-{uuid.uuid4().hex[:6]}"
    cmd = {"T1082":"uname -a; echo '---'; cat /etc/os-release || true",
           "T1016":"ip -br a; echo '---'; ss -tunap || true",
           "T1059":"echo 'Listing /tmp'; ls -la /tmp || true"}.get(tid, f"echo 'run {tid}'; uname -a || true")
    abilities.append({"id":aid,"name":f"tmp-{tid}","platform":"linux","executor":"sh","command":cmd,"tactic":"discovery","technique":tid})
adv_payload={"name":"temp-auto","description":"temp adv","abilities":abilities}
r=requests.post(base.rstrip("/")+"/api/v2/adversaries", headers=hdr, json=adv_payload, timeout=20)
r.raise_for_status()
adv_id = r.json().get("id") or r.json().get("adversary_id") or r.json().get("uuid")
# start op
payload={"name":"auto-op","adversary":adv_id,"agents":("${AGENTS}").split(","),"planner_name":"atomic"}
r2=requests.post(base.rstrip("/")+"/api/v2/operations", headers=hdr, json=payload, timeout=20)
r2.raise_for_status()
print(json.dumps(r2.json()))
PY
)
fi

echo "Operation creation response:"
echo "$OP_JSON" | jq .

# extract operation id
OP_ID=$(echo "$OP_JSON" | jq -r '.id // .operation_id // .uuid // .op_id // .operation' | head -n1)
echo "Operation id: $OP_ID"

# 2) wait for report (uses wait_for_report.py)
python3 wait_for_report.py --base "$BASE" --op "$OP_ID" --api-key "$API_KEY" --out op.json --timeout 300 --interval 5

# 3) parse techniques
python3 parse_caldera_report.py --in op.json --out techniques.txt

# 4) fetch mitigations from Neo4j
NEO_URI=$(python3 - <<PY
import yaml,sys
cfg=yaml.safe_load(open("${CONFIG}"))
print(cfg['neo4j']['uri'])
PY
)
NEO_USER=$(python3 - <<PY
import yaml,sys
cfg=yaml.safe_load(open("${CONFIG}"))
print(cfg['neo4j']['user'])
PY
)
NEO_PWD=$(python3 - <<PY
import yaml,sys
cfg=yaml.safe_load(open("${CONFIG}"))
print(cfg['neo4j']['password'])
PY
)
TECHS_CSV=$(paste -sd, techniques.txt)
python3 extract_mitigations.py --uri "$NEO_URI" --user "$NEO_USER" --password "$NEO_PWD" --techniques "$TECHS_CSV" --out observed_mitigations.json

# 5) rank mitigations
python3 rank_mitigations.py --config "$CONFIG" --input_json observed_mitigations.json --out_csv ranked_mitigations.csv --out_json ranked_mitigations.json

echo "Pipeline complete. Top mitigations:"
head -n 20 ranked_mitigations.csv
