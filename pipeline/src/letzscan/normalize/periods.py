"""Period parsing.

Luxembourg distributions publish ``08.07.2026`` meaning 8 July. Parsing that as
month-first corrupts the value silently, which is why date handling is a shared
helper with tests rather than a per-connector convenience.
"""

from __future__ import annotations

import re
from datetime import date

_YEAR = re.compile(r"^\s*(\d{4})\s*$")
_DAY_FIRST = re.compile(r"^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$")
_ISO = re.compile(r"^\s*(\d{4})-(\d{2})-(\d{2})\s*$")


def parse_year(raw: str | int) -> str:
    """Return a canonical ``YYYY`` period."""
    match = _YEAR.match(str(raw))
    if not match:
        msg = f"Expected a four-digit year, got {raw!r}"
        raise ValueError(msg)
    return match.group(1)


def period_from_iso_date(value: date) -> str:
    """Return a canonical ``YYYY-MM-DD`` period."""
    return value.isoformat()


def parse_day_first_date(raw: str) -> date:
    """Parse ``DD.MM.YYYY`` / ``DD/MM/YYYY`` and ISO ``YYYY-MM-DD``.

    Day-first is assumed for the dotted and slashed forms because that is what
    Luxembourg producers publish. Ambiguity is not guessed: an ISO string is
    only ever read as ISO.
    """
    iso = _ISO.match(raw)
    if iso:
        return date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))

    day_first = _DAY_FIRST.match(raw)
    if not day_first:
        msg = f"Unrecognised date {raw!r}"
        raise ValueError(msg)

    day, month, year = (int(part) for part in day_first.groups())
    return date(year, month, day)
