# CI RunDiff

Local-first evidence for CI runs that fail and then pass on rerun.

CI RunDiff compares failed and successful logs, removes common CI noise, and
shows the first observed divergence with exact source lines. It does not upload
logs, require a test reporter, or claim to know the root cause.

> Project status: early technical spike. The file-to-file comparison works;
> direct GitHub Actions run-ID support is not implemented yet.

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

Expected summary:

    Same commit: unknown
    Status: difference-found
    Category: network
    Confidence: observed-difference

The CLI reports `Same commit: unknown` for local files because raw logs do not
contain trusted run metadata. A future GitHub Actions adapter will verify SHA
equality before comparison.

## Current scope

Included in the spike:

- local text-log comparison;
- deterministic normalization;
- exact failed/passed evidence windows;
- unique failure-signal detection before raw line divergence;
- conservative categories: network, dependency, cache, environment, test,
  and unknown;
- text and JSON output.

Not included:

- GitHub authentication or run download;
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
logs.

## Security and privacy

The current CLI reads local files and writes only to standard output. CI logs
can contain secrets even after platform masking, so review output before
sharing it. Report security issues according to [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
