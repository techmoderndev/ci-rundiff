# CI RunDiff

Local-first evidence for CI runs that fail and then pass on rerun.

CI RunDiff compares failed and successful logs, removes common CI noise, and
shows the first observed divergence with exact source lines. It does not upload
logs, require a test reporter, or claim to know the root cause.

> Project status: early technical spike. File-to-file comparison and a
> read-only GitHub Actions run adapter with exact job and step alignment work.

## Why

When the same commit fails and then passes, maintainers often have to compare
large logs manually. Existing tools commonly explain one failed run or build a
hosted flaky-test history. CI RunDiff explores a narrower workflow:

- compare a fail/pass pair;
- normalize timestamps, runner paths, UUIDs, temporary paths, and ports;
- show the first meaningful observed difference;
- prefer an exact failure signal that exists only in the failed log;
- preserve exact evidence lines;
- keep all data local.

## Quick start

Requirements: Node.js 20 or newer. There are no runtime dependencies.

    git clone https://github.com/techmoderndev/ci-rundiff.git
    cd ci-rundiff
    npm test
    node src/cli.js compare test/fixtures/failed.log test/fixtures/passed.log

JSON output:

    node src/cli.js compare test/fixtures/failed.log test/fixtures/passed.log --json

Markdown evidence bundle:

    node src/cli.js compare test/fixtures/failed.log test/fixtures/passed.log --markdown

Compare two attempts of a public GitHub Actions rerun:

    node src/cli.js github denoland/deno 30007963907@1 30007963907@2 \
      --job "test specs (1/2) debug windows-x86_64"

The GitHub command requires the
[GitHub CLI](https://cli.github.com/) with credentials that can read the
repository. It verifies run conclusions, workflow identity, and commit SHA
equality, finds a job that changed from failure to success, and downloads only
those two job logs. If more than one job was repaired, pass its exact name with
`--job`. If multiple steps in that job changed from failure to success, select
one with `--step`.

Expected summary:

    Same commit: unknown
    Status: difference-found
    Category: network
    Confidence: observed-difference

The CLI reports `Same commit: unknown` for local files because raw logs do not
contain trusted run metadata. The GitHub command reports `yes` only after
verifying SHA equality through run metadata.

## Current scope

Included in the spike:

- local text-log comparison;
- deterministic normalization;
- exact failed/passed evidence windows;
- unique failure-signal detection before raw line divergence;
- read-only GitHub Actions metadata and job-log download through `gh`;
- exact failed-to-passed job matching, including workflows with over 100 jobs;
- repaired-step alignment using GitHub step metadata and original job line
  numbers;
- bounded insertion/removal alignment with conservative ambiguity fallback;
- self-contained Markdown evidence output for issues, pull requests, or local
  records;
- conservative categories: network, dependency, cache, environment, test,
  and unknown;
- text and JSON output.

The `cache` hint has an additional guard: a normal cache miss is not a failure.
For downstream missing-command/module signals, CI RunDiff requires a nearby
cache restore in the failed log and a cache miss in the successful log. This is
still observed evidence, not a root-cause claim.

Not included:

- automatic fixes or pull requests;
- hosted dashboards;
- external log storage;
- AI-generated root-cause claims.

## Design principles

1. Evidence before explanation.
2. Unknown is a valid result.
3. Local by default.
4. Deterministic core behavior.
5. Small, reviewable changes.

Read [the design note](docs/design.md), [roadmap](ROADMAP.md), and
[contribution guide](CONTRIBUTING.md) before proposing a large change.

## Public validation

The comparison behavior has been checked against four public fail/pass rerun
pairs from [Vitest](docs/validation/vitest-run-30004792472.md),
[Home Assistant](docs/validation/home-assistant-run-29870812002.md), and
[InvenTree](docs/validation/inventree-run-30080724775.md), plus a Windows
toolchain setup rerun from [Deno](docs/validation/deno-run-30007963907.md). The
repository keeps the evidence notes and public run identifiers, not the full CI
logs. See the generated-style
[Deno Markdown evidence bundle](docs/examples/deno-run-30007963907.md) for a
complete output example. The
[cache evidence retention note](docs/validation/cache-evidence-retention-note.md)
records a public historical pattern, the recent-run scan, and why live cache
validation remains open.

## Security and privacy

The CLI reads local files or downloads selected job logs through the existing
`gh` authentication context. Downloaded logs stay in process memory; CI RunDiff
does not persist or upload them. CI logs can contain secrets even after
platform masking, so review evidence output before sharing it. Report security
issues according to [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
