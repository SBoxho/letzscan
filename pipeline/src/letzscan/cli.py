"""Command line entry point.

Deliberately thin: argparse, no framework. Each subcommand is a few lines over
a library function that is tested on its own.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from letzscan import __version__
from letzscan.catalog import load_catalog, validate_catalog
from letzscan.connectors import CONNECTORS
from letzscan.connectors.base import utc_now
from letzscan.contracts.models import ReleaseOutput
from letzscan.contracts.schemas import validate_entity
from letzscan.publish import (
    build_release,
    publish_observations,
    sha256_bytes,
    write_latest_pointer,
    write_release,
)


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


def _resolve(connector_id: str):
    connector = CONNECTORS.get(connector_id)
    if connector is None:
        print(
            f"Unknown connector {connector_id!r}. Known: {', '.join(sorted(CONNECTORS))}",
            file=sys.stderr,
        )
    return connector


def _release_id(connector_id: str, now: datetime) -> str:
    # Release ids are canonical identifiers: lowercase, sortable, no separators
    # that would break a URL or an object key.
    return f"{connector_id}-{now.strftime('%Y%m%d-%H%M%S')}"


def _report_warnings(warnings: list[str]) -> None:
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)


def _cmd_run(args: argparse.Namespace) -> int:
    connector = _resolve(args.connector)
    if connector is None:
        return 1

    result = connector.fetch()

    # Every record is validated against the canonical contract before it can be
    # written anywhere. A connector that drifts fails here, not in a browser.
    for observation in result.observations:
        validate_entity("observation", observation.to_payload())

    now = utc_now()
    release_id = _release_id(args.connector, now)
    out_dir = Path(args.out) / release_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write first, then checksum what was actually written: a manifest that
    # describes bytes nobody wrote is worse than no manifest.
    body = (
        json.dumps([o.to_payload() for o in result.observations], indent=2, ensure_ascii=False)
        + "\n"
    ).encode("utf-8")
    observations_path = out_dir / "observations.json"
    observations_path.write_bytes(body)

    release = build_release(
        release_id,
        now.isoformat().replace("+00:00", "Z"),
        [result],
        outputs=[
            ReleaseOutput(
                path="observations.json",
                sha256=sha256_bytes(body),
                bytes=len(body),
                content_type="application/json",
            )
        ],
    )
    manifest = write_release(release, out_dir)

    print(f"{len(result.observations)} observations -> {observations_path}")
    print(f"release manifest -> {manifest}")
    _report_warnings(result.warnings)
    return 0


def _cmd_publish(args: argparse.Namespace) -> int:
    """Build the artifacts the browser reads, then advance `latest`."""
    connector = _resolve(args.connector)
    if connector is None:
        return 1

    geographies_of = getattr(connector, "geographies", None)
    dataset_id = getattr(connector, "DATASET_ID", None) or getattr(
        sys.modules[type(connector).__module__], "DATASET_ID", None
    )
    geography_set_id = getattr(sys.modules[type(connector).__module__], "GEOGRAPHY_SET_ID", None)
    if geographies_of is None or dataset_id is None or geography_set_id is None:
        print(
            f"Connector {args.connector!r} does not publish a place dataset "
            "(it declares no gazetteer, dataset id or geography set).",
            file=sys.stderr,
        )
        return 1

    valid_from = _geography_set_valid_from(geography_set_id)
    if valid_from is None:
        print(
            f"catalog/geographies/{geography_set_id}.yaml has no valid_from.",
            file=sys.stderr,
        )
        return 1

    result = connector.fetch()
    for observation in result.observations:
        validate_entity("observation", observation.to_payload())

    observations = result.observations
    if args.since:
        # Used to generate the small snapshot committed for local development.
        # It narrows the periods published, never the places: every commune still
        # resolves, so "unknown place" and "no data here" stay distinguishable.
        observations = [o for o in observations if o.period >= args.since]
        if not observations:
            print(f"No observations at or after {args.since!r}.", file=sys.stderr)
            return 1

    now = utc_now()
    release_id = _release_id(args.connector, now)
    destination = Path(args.out)

    outputs = publish_observations(
        destination=destination,
        release_id=release_id,
        observations=observations,
        geographies=geographies_of(valid_from),
        dataset_id=dataset_id,
        geography_set_id=geography_set_id,
    )

    release = build_release(
        release_id, now.isoformat().replace("+00:00", "Z"), [result], outputs=outputs
    )
    release = release.model_copy(update={"status": "published"})

    write_release(release, destination / release_id)
    # Last, and only once everything above validated: a failed build must not be
    # able to change what users see.
    pointer = write_latest_pointer(destination, release)

    print(f"{len(outputs)} artifacts -> {destination / release_id}")
    print(f"latest pointer -> {pointer}")
    _report_warnings(result.warnings)
    return 0


def _geography_set_valid_from(geography_set_id: str) -> str | None:
    for entry in load_catalog():
        if entry.directory == "geographies" and entry.id == geography_set_id:
            value = entry.data.get("valid_from")
            return value.isoformat() if hasattr(value, "isoformat") else value
    return None


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

    publish = subparsers.add_parser(
        "publish", help="Build the published artifacts the browser reads."
    )
    publish.add_argument("connector")
    publish.add_argument("--out", default=".out/published", help="Output directory")
    publish.add_argument(
        "--since",
        help="Publish only periods at or after this one (e.g. 2024). Used for the "
        "small snapshot committed for local development.",
    )
    publish.set_defaults(func=_cmd_publish)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result: int = args.func(args)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
