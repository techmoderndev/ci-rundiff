# Roadmap

Roadmap items are hypotheses, not delivery promises.

## 0.0.x — local evidence spike

- [x] Compare two local text logs
- [x] Normalize common volatile CI values
- [x] Emit exact evidence in text and JSON
- [x] Classify conservatively, including unknown
- [x] Validate against first public fail/pass run pair
- [x] Validate against two additional public fail/pass run pairs
- [x] Validate a public setup/environment fail/pass run pair
- [ ] Validate a public cache-service or cache-corruption fail/pass run pair
- [ ] Improve alignment for inserted and removed lines

## 0.1 — GitHub Actions read-only adapter

- [x] Accept failed and passed run IDs with optional attempt numbers
- [x] Verify repository, workflow identity, run conclusions, and commit SHA equality
- [x] Download selected job logs with existing GitHub credentials
- [x] Match one failed job to its successful rerun by exact name
- [x] Align workflow identity, exact job names, and repaired step metadata
- [ ] Produce a Markdown evidence bundle

## Later, only with maintainer evidence

- GitHub Action wrapper
- Redaction helpers
- Issue comment output with explicit human confirmation
- Additional CI providers

## Explicit non-goals

- Automatic code changes
- Autonomous pull requests
- Hosted log retention
- Guaranteed root-cause detection
- Mandatory LLM usage
