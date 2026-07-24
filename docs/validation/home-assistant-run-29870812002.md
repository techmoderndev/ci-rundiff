# Validation 002 — Home Assistant Codecov verification rerun

**Date:** 24 July 2026  
**Public source:** [home-assistant/core Actions run 29870812002](https://github.com/home-assistant/core/actions/runs/29870812002)  
**Commit:** `95bdcd9cbbc8c249331ad098214b3532ef63a41d`

## Pair

- Attempt 1: failed
- Attempt 2: passed
- Job: `Upload test coverage to Codecov (partial suite)`
- Failed job ID: `88770973602`
- Passed job ID: `88772049509`

Both jobs belong to the same workflow run and commit SHA. Logs were downloaded
through the public job-log API and processed locally. Full logs are not stored
in this repository.

## Observed difference

The failed attempt could not import the Codecov uploader verification key. GPG
reported no valid OpenPGP data, no public key, and an unverifiable signature.

The successful attempt imported the key, reported a good signature, and
completed the CLI integrity check.

## Result

- Real fail/pass pair: confirmed
- Same workflow run and SHA: confirmed
- Failure category: dependency
- Evidence strategy: unique failure signal
- Passed counterpart: CLI integrity verified
- Full log retention: none

The category describes the observed dependency-verification stage. It does not
claim a deeper root cause for why the key import failed.
