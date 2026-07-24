# Changelog

All notable changes will be documented here.

The format follows Keep a Changelog, and the project intends to follow Semantic
Versioning after the first stable public contract.

## Unreleased

### Added

- Local failed/passed log comparison
- Read-only GitHub Actions run adapter using existing `gh` credentials
- Run conclusion, workflow identity, and commit SHA verification before log download
- Exact repaired-job matching with pagination for workflows over 100 jobs
- Deterministic normalization for common CI noise
- Exact evidence windows
- Conservative category hints
- Text and JSON CLI output
- Unique failure-signal selection before raw normalized divergence
- Four public rerun validation notes covering test, dependency verification, network timeout, and setup environment evidence
- Category-specific successful counterpart evidence for validated dependency and network failures
- Windows file-lock evidence and a successful setup counterpart
