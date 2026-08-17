"""Command line entry point.

Deliberately thin: argparse, no framework. Each subcommand is a few lines over
a library function that is tested on its own.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from letzscan import __version__
from letzscan.catalog import validate_catalog
from letzscan.connectors import CONNECTORS
from letzscan.connectors.base import utc_now
from letzscan.contracts.schemas import validate_entity
from letzscan.publish import build_release, write_release


def _cmd_validate_catalog(_args: argparse.Namespace) -> int:
    problems = validate_catalog()
    if problems:
        print("Catalogue validation failed:\n", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1
    print("Catalogue is valid.")
    return 0


def _cmd_list_connectors(_args: argparse.Namespace) -> int:
    if not CONNECTORS:
        print("No connectors registered.")
        return 0
    for connector_id in sorted(CONNECTORS):
        print(connector_id)
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    connector = CONNECTORS.get(args.connector)
    if connector is None:
        print(
            f"Unknown connector {args.connector!r}. Known: {', '.join(sorted(CONNECTORS))}",
            file=sys.stderr,
        )
        return 1

    result = connector.fetch()

    # Every record is validated against the canonical contract before it can be
    # written anywhere. A connector that drifts fails here, not in a browser.
    for observation in result.observations:
        validate_entity("observation", observation.to_payload())

    now = utc_now()
    # Release ids are canonical identifiers: lowercase, sortable, no separators
    # that would break a URL or an object key.
    release_id = f"{args.connector}-{now.strftime('%Y%m%d-%H%M%S')}"
    release = build_release(release_id, now.isoformat().replace("+00:00", "Z"), [result])

    out_dir = Path(args.out) / release_id
    manifest = write_release(release, out_dir)

    observations_path = out_dir / "observations.json"
    observations_path.write_text(
        json.dumps([o.to_payload() for o in result.observations], indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"{len(result.observations)} observations -> {observations_path}")
    print(f"release manifest -> {manifest}")
    for warning in result.warnings:
        print(f"warning: {warning}", file=sys.stderr)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="letzscan", description=__doc__)
    parser.add_argument("--version", action="version", version=__version__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser(
        "validate-catalog", help="Validate catalog/ against the canonical schemas."
    )
    validate.set_defaults(func=_cmd_validate_catalog)

    listing = subparsers.add_parser("list-connectors", help="List registered connectors.")
    listing.set_defaults(func=_cmd_list_connectors)

    run = subparsers.add_parser("run", help="Run one connector and write a draft release.")
    run.add_argument("connector")
    run.add_argument("--out", default=".out", help="Output directory (default: .out)")
    run.set_defaults(func=_cmd_run)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result: int = args.func(args)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
