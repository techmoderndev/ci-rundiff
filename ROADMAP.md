# Roadmap

Roadmap items are hypotheses, not delivery promises.

## 0.0.x — local evidence spike

- [x] Compare two local text logs
- [x] Normalize common volatile CI values
- [x] Emit exact evidence in text and JSON
- [x] Classify conservatively, including unknown
- [ ] Validate against three public fail/pass run pairs
- [ ] Improve alignment for inserted and removed lines

## 0.1 — GitHub Actions read-only adapter

- [ ] Accept failed and passed run IDs
- [ ] Verify repository and commit SHA equality
- [ ] Download logs with existing GitHub credentials
- [ ] Align workflows, jobs, and steps
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
