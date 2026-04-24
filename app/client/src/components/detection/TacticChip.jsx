import Badge from "../ui/Badge";
import { tacticOf } from "../../data/detectionSample";

export default function TacticChip({ id, size = "xs" }) {
  const t = tacticOf(id);
  return (
    <Badge tone={t.tone || "slate"} size={size} title={t.id}>
      {t.name}
    </Badge>
  );
}

export function TechniqueChip({ id, size = "xs" }) {
  return (
    <Badge tone="indigo" size={size} title={`MITRE ATT&CK for ICS — ${id}`}>
      {id}
    </Badge>
  );
}

export function DataComponentChip({ id, size = "xs" }) {
  if (!id) return null;
  return (
    <Badge tone="slate" size={size} title={id}>
      {id}
    </Badge>
  );
}

export function AssetChip({ id, size = "xs" }) {
  return (
    <Badge tone="sky" size={size} title={id}>
      {id}
    </Badge>
  );
}
