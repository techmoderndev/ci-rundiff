# Contributing

Thanks for considering a contribution. CI RunDiff is in an early evidence
gathering phase, so small changes with a real failing/passing example are more
useful than broad rewrites.

## Before opening code

1. Search existing issues and discussions.
2. Open an issue for behavior changes or new integrations.
3. Remove secrets and personal data from every shared log.
4. Prefer the smallest reproducible fail/pass fixture.

## Local development

    npm test
    npm run check
    node src/cli.js compare test/fixtures/failed.log test/fixtures/passed.log

The project intentionally has no runtime dependencies. A new dependency must
have a clear maintenance and security justification.

## Pull requests

- Keep one concern per pull request.
- Add or update tests for behavior changes.
- Preserve exact evidence and the ability to return unknown.
- Do not add telemetry, external uploads, or token persistence.
- Update documentation when public behavior changes.

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
