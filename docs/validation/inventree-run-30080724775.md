# Validation 003 — InvenTree HTTP read-timeout rerun

**Date:** 24 July 2026  
**Public source:** [inventree/InvenTree Actions run 30080724775](https://github.com/inventree/InvenTree/actions/runs/30080724775)  
**Commit:** `218d6de91f10f8836a26238b512c48b5ff52ec20`

## Pair

- Attempt 1: failed
- Attempt 2: passed
- Job: `Tests - inventree-python`
- Failed job ID: `89441698909`
- Passed job ID: `89448996112`

Both jobs belong to the same workflow run and commit SHA. Logs were downloaded
through the public job-log API and processed locally. Full logs are not stored
in this repository.

## Observed difference

The failed attempt ended one API test with `TimeoutError`,
`urllib3.exceptions.ReadTimeoutError`, and
`requests.exceptions.ReadTimeout` against a local HTTP test server.

The successful attempt ran the same 103-test suite to `OK`. Its log also
contains an intentionally handled read-timeout from another test, so matching a
timeout word anywhere in the log would be incorrect. CI RunDiff instead selects
the earliest failure signal absent from the passed log and pairs it with the
final successful test summary.

## Result

- Real fail/pass pair: confirmed
- Same workflow run and SHA: confirmed
- Failure category: network
- Evidence strategy: unique failure signal
- Passed counterpart: `OK`
- Full log retention: none

The category describes the observed HTTP read-timeout evidence. It does not
claim that an external network service caused the failure.
