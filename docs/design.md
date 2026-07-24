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

The first spike implements steps 5–7 for two local text files. Line comparison
is intentionally simple and may treat inserted lines as a divergence. Job and
step alignment belongs in a later adapter and must be validated with public run
pairs before it is merged.

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
- `src/cli.js`: local file I/O and output formatting

Future GitHub-specific code should live behind an adapter so the comparison
core remains provider-independent and testable without network access.
