# Design note

## Product boundary

CI RunDiff reports observed differences. It must not present a heuristic label
as a verified root cause.

The intended GitHub Actions flow is:

1. Accept one failed and one passed run ID.
2. Verify that both runs use the same commit SHA.
3. Download logs through the user's existing GitHub credentials.
4. Align workflow, job, and step structure.
5. Normalize volatile values deterministically.
6. Find the first meaningful divergence.
7. Emit exact evidence in text, Markdown, or JSON.

## Current spike

The local comparison implements steps 5–7 for two text files. The GitHub
adapter implements steps 1–3 and exact job-name matching for a failure that
becomes successful. Line comparison first looks for the earliest failure signal
that is absent from the successful log, then falls back to normalized line
divergence.

Run specifications use `RUN_ID@ATTEMPT`. This supports GitHub's rerun model,
where attempts share a run ID, and also permits two distinct run IDs when they
share a commit. If multiple jobs change from failure to success, the adapter
requires an exact `--job` name instead of guessing.

Full step alignment remains future work.

## Evidence selection

Failure-only evidence is preferred over generic environment differences. For
example, a rerun may use another Azure region, process ID, or timing while the
decision-relevant evidence is a later test timeout. CI RunDiff reports the
earliest unique failure signal and pairs it with an exact successful summary
when available. If no such signal exists, it falls back to the first normalized
line difference and labels the strategy in the output.

## Trust model

- Input logs remain local.
- Categories are heuristic hints.
- Exact original lines accompany every result.
- Unknown is preferred over unsupported certainty.
- GitHub tokens will be read from the environment or existing tooling, never
  persisted by CI RunDiff.

## Module boundaries

- `src/normalize.js`: deterministic removal of volatile values
- `src/compare.js`: divergence detection, evidence windows, conservative tags
- `src/github.js`: read-only GitHub metadata validation and job-log retrieval
- `src/cli.js`: command parsing, local file I/O, and output formatting

GitHub-specific code stays behind an injected API boundary so the comparison
core and adapter behavior remain testable without network access.
