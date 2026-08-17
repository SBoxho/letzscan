from __future__ import annotations

from datetime import date

import pytest

from letzscan.normalize import parse_number, parse_year
from letzscan.normalize.periods import parse_day_first_date


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("12 345", 12345.0),
        ("12 345", 12345.0),  # noqa: RUF001 - no-break space, a real separator upstream
        ("12 345", 12345.0),  # noqa: RUF001 - narrow no-break space, ditto
        ("1'204", 1204.0),
        ("12.345,6", 12345.6),
        ("12,345.6", 12345.6),
        ("7,5", 7.5),
        (42, 42.0),
        (3.5, 3.5),
    ],
)
def test_parse_number_handles_the_separators_producers_actually_use(
    raw: str | int | float, expected: float
) -> None:
    assert parse_number(raw) == expected


@pytest.mark.parametrize("marker", [":", "-", "..", "n/a", "", None])
def test_suppressed_values_become_none_never_zero(marker: str | None) -> None:
    assert parse_number(marker) is None


def test_unparseable_value_fails_loudly() -> None:
    with pytest.raises(ValueError, match="Unparseable"):
        parse_number("about twelve thousand")


def test_parse_year() -> None:
    assert parse_year("2025") == "2025"
    assert parse_year(2025) == "2025"
    with pytest.raises(ValueError, match="four-digit year"):
        parse_year("25")


def test_dotted_dates_are_read_day_first() -> None:
    assert parse_day_first_date("08.07.2026") == date(2026, 7, 8)
    assert parse_day_first_date("08/07/2026") == date(2026, 7, 8)


def test_iso_dates_are_never_reinterpreted_as_day_first() -> None:
    assert parse_day_first_date("2026-07-08") == date(2026, 7, 8)


def test_unrecognised_date_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unrecognised date"):
        parse_day_first_date("July 8th")
