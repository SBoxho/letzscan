"""Canonical to canonical.

Rates, shares, ranks, change over time, "is this normal" comparisons against a
historical distribution. Every derivation is a pure function over canonical
observations with a fixture test, so a number on the site can always be traced
back to an input and a formula.

Rules for anything added here:
  - a derived observation keeps ``source_id`` and gains a derived
    ``indicator_id``; it never silently claims to be an upstream measurement;
  - a missing operand yields a missing result, never zero and never a guess;
  - an indicator whose ``aggregation`` is ``none`` may not be summed or averaged
    across geographies.

Empty until the first derivation is needed.
"""
