# Exploratory notebooks

Research and discovery work. **Never production lineage.**

If a notebook computes something the site publishes, that computation belongs in
`pipeline/src/letzscan/` with tests. A notebook explains an analysis; it does
not run a build.

## Rules

- **Strip outputs before committing.** Stored outputs are what turned the
  previous repository's history into tens of megabytes of images.
- **State the input release** at the top of each notebook, so a reader knows
  which data produced these numbers.
- **Publish large results as artifacts**, not in git history.
- **Delete a notebook** that only duplicates production ETL.

## Stripping outputs

```bash
uv run --directory ../../pipeline python -m pip install nbstripout   # once
nbstripout --install --attributes ../../.gitattributes
```

`.gitattributes` already marks `*.ipynb` as non-diffable so a review is not
drowned by JSON churn.
