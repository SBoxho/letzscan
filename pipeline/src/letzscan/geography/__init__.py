"""Gazetteers, boundary versions, crosswalks and geometry preparation.

Rules for anything added here:
  - official codes are join keys; names are presentation and never joined on;
  - a boundary change produces a new geography set plus an explicit crosswalk,
    it does not mutate the previous set;
  - adjacent polygons are simplified together (shared arcs), because
    independently simplifying neighbours is what produces slivers and gaps;
  - coordinates are reprojected to WGS84 once, at ingest.

Empty until the first geography set is built.
"""
