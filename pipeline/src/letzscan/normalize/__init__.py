"""Provider-shaped values to canonical values.

These helpers exist because every one of them is a bug the previous
implementation hit at least once: day-first dates parsed as month-first,
thousands separators silently truncating a number, a statistical suppression
marker turning into zero.

Learn each rule once, here, rather than per connector.
"""

from letzscan.normalize.numbers import SUPPRESSION_MARKERS, parse_number
from letzscan.normalize.periods import parse_year, period_from_iso_date

__all__ = [
    "SUPPRESSION_MARKERS",
    "parse_number",
    "parse_year",
    "period_from_iso_date",
]
