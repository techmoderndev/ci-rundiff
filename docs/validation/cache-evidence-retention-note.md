# Cache evidence retention note

Status: useful public evidence, but not counted as live run validation.

The public flaky-build research catalog documents a
`react-native-video/react-native-video` comparison from 11 March 2024. Its
screenshots show:

- failed side: `Cache restored successfully`, followed shortly by
  `error Command "eslint" not found.`;
- successful side: `Cache not found for input keys`, followed by a fresh
  dependency installation.

Source:
[Understanding and Detecting Flaky Builds in GitHub Actions](https://flaky-build.github.io/).

GitHub no longer exposes those historical job logs through the Actions API.
Therefore this repository uses the narrow observable pattern as a regression
fixture but leaves the roadmap's live public cache fail/pass validation item
open.

On 24 July 2026, a read-only scan checked recent repaired runs across public
repositories including ESLint, Expo, Gradle, Home Assistant, Jest, VS Code,
Node.js, pnpm, Rust, Storybook, typescript-eslint, Next.js, Vite, Vitest, and
Yarn. No accessible pair met all of these conditions:

1. the same job changed from failure to success;
2. a cache restore occurred within 120 lines before a downstream missing
   command/module or archive-integrity failure;
3. the successful comparison contained an explicit cache miss.

A Deno candidate was rejected after direct comparison: its repaired step failed
while uploading an artifact with `ENOTFOUND`; cache activity elsewhere in the
job was unrelated.
