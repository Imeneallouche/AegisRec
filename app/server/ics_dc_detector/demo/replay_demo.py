"""
demo/replay_demo.py
────────────────────
Self-contained demonstration script.

Replays `sample_logs.ndjson` through the full detection pipeline
WITHOUT requiring a live Elasticsearch cluster.  Output is printed
to stdout as newline-delimited JSON alerts.

Run from the project root:
    python demo/replay_demo.py

Optional flags:
    --file PATH        alternate ndjson file to replay
    --threshold 0.5    lower similarity threshold for demo purposes
    --pretty           pretty-print JSON output
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click
from rich.console import Console
from rich.json import JSON as RichJSON
from rich.table import Table

from config.settings import settings
from src.correlation.deduplicator import Deduplicator
from src.correlation.temporal_window import TemporalWindow
from src.engine.matcher import Matcher
from src.loaders.dc_loader import DataComponentRegistry
from src.observability.logging_setup import configure_logging
from src.output.alert_model import Alert
from src.output.sink import SinkDispatcher, StdoutSink
from src.pipeline import Pipeline

DEMO_DIR = Path(__file__).parent
DEFAULT_LOG_FILE = DEMO_DIR / "sample_logs.ndjson"
DEFAULT_DC_DIR = DEMO_DIR.parent / "datacomponents"

console = Console()


@click.command()
@click.option("--file", "log_file", default=str(DEFAULT_LOG_FILE),
              help="NDJSON log file to replay")
@click.option("--dc-dir", default=str(DEFAULT_DC_DIR),
              help="DataComponent JSON directory")
@click.option("--threshold", default=0.50, type=float,
              help="Similarity threshold (0-1)")
@click.option("--pretty/--no-pretty", default=True,
              help="Pretty-print alerts with Rich")
@click.option("--quiet", is_flag=True, help="Suppress startup banners")
def main(
    log_file: str,
    dc_dir: str,
    threshold: float,
    pretty: bool,
    quiet: bool,
) -> None:
    """Replay a local NDJSON log file through the ICS DC detection engine."""
    asyncio.run(_run(log_file, dc_dir, threshold, pretty, quiet))


async def _run(
    log_file: str,
    dc_dir: str,
    threshold: float,
    pretty: bool,
    quiet: bool,
) -> None:
    configure_logging("WARNING")  # suppress INFO noise in demo

    # Override threshold
    settings.similarity_threshold = threshold

    # Load DataComponents
    dc_path = Path(dc_dir)
    if not quiet:
        console.rule("[bold cyan]ICS DataComponent Detection Engine – Demo")
        console.print(f"[dim]DC directory : [/]{dc_path}")
        console.print(f"[dim]Log file     : [/]{log_file}")
        console.print(f"[dim]Threshold    : [/]{threshold}")
        console.print()

    registry = DataComponentRegistry(dc_path)
    if not quiet:
        console.print(
            f"[green]✓[/] Loaded [bold]{len(registry.all)}[/] DataComponents: "
            + ", ".join(dc.id for dc in registry.all)
        )

    # Build engine
    matcher = Matcher()
    with console.status("[bold yellow]Building detection engines (Stage 1/2/3)…"):
        await matcher.build(registry)

    if not quiet:
        console.print("[green]✓[/] Aho-Corasick / Regex / Embedding engines ready")
        console.print()

    dedup = Deduplicator()
    await dedup.load()
    window = TemporalWindow()

    collected_alerts: list[Alert] = []

    class CollectSink:
        async def open(self): pass
        async def close(self): pass
        async def emit(self, alert: Alert):
            collected_alerts.append(alert)

    dispatcher = SinkDispatcher(sinks=[CollectSink(), StdoutSink()])  # type: ignore
    pipeline = Pipeline(matcher, dedup, window, dispatcher)

    # Replay
    total_docs = 0
    with open(log_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                source = json.loads(line)
            except json.JSONDecodeError:
                continue
            hit = {
                "_id": f"demo-{total_docs}",
                "_index": "demo-replay",
                "_source": source,
            }
            await pipeline.process_hit(hit)
            total_docs += 1

    # Summary
    if not quiet and pretty:
        console.rule("[bold cyan]Summary")
        console.print(
            f"[green]{total_docs}[/] documents processed → "
            f"[bold yellow]{len(collected_alerts)}[/] alerts emitted"
        )
        if collected_alerts:
            _render_summary_table(collected_alerts)

    if not quiet:
        console.print()
        console.rule("[dim]End of replay")


def _render_summary_table(alerts: list[Alert]) -> None:
    table = Table(title="Detected DataComponents", show_lines=True)
    table.add_column("Detection ID", style="dim", width=12)
    table.add_column("DataComponent", style="cyan")
    table.add_column("DC ID", style="magenta")
    table.add_column("Score", style="yellow", justify="right")
    table.add_column("Asset", style="green")
    table.add_column("Strategy", style="dim")

    for a in sorted(alerts, key=lambda x: x.similarity_score, reverse=True):
        table.add_row(
            a.detection_id[:8] + "…",
            a.datacomponent,
            a.datacomponent_id or "—",
            f"{a.similarity_score:.3f}",
            a.asset_id or "—",
            a.detection_metadata.get("strategy", "—"),
        )

    console.print(table)


if __name__ == "__main__":
    main()
