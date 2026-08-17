"""Numeric parsing that refuses to invent values."""

from __future__ import annotations

import re

#: Markers upstream statistical offices use for a withheld value. They mean
#: "we are not telling you", never "zero".
SUPPRESSION_MARKERS: frozenset[str] = frozenset({":", "-", "..", ".", "n/a", "na", "c", "x"})

# `\s` already covers U+00A0 and U+202F for str patterns, which is what French
# and Swiss formatted numbers use as a thousands separator.
_THOUSANDS = re.compile(r"[\s']")


def parse_number(raw: str | int | float | None) -> float | None:
    """Parse an upstream numeric cell.

    Returns ``None`` when the value is absent or suppressed — the caller records
    the appropriate :class:`~letzscan.contracts.models.ObservationStatus`.
    Raises ``ValueError`` for a value that is present but unparseable, so a
    format change fails loudly instead of thinning the dataset.

    Handles the separators actually seen in Luxembourg distributions:
    ``12 345``, ``12'345``, ``12.345,6`` (fr/de) and ``12,345.6`` (en).
    """
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw)

    text = _THOUSANDS.sub("", str(raw).strip())
    if not text or text.lower() in SUPPRESSION_MARKERS:
        return None

    has_comma = "," in text
    has_dot = "." in text
    if has_comma and has_dot:
        # The rightmost separator is the decimal one.
        decimal_sep = "," if text.rfind(",") > text.rfind(".") else "."
        thousands_sep = "." if decimal_sep == "," else ","
        text = text.replace(thousands_sep, "").replace(decimal_sep, ".")
    elif has_comma:
        text = text.replace(",", ".")

    try:
        return float(text)
    except ValueError as exc:
        msg = f"Unparseable numeric value {raw!r}"
        raise ValueError(msg) from exc
