import test from "node:test";
import assert from "node:assert/strict";
import { formatMarkdown } from "../src/format.js";

function resultFixture() {
  return {
    sameCommit: "yes",
    status: "difference-found",
    strategy: "unique-failure-signal",
    confidence: "observed-difference",
    category: "environment",
    alignment: null,
    firstDivergence: { failedLine: 42, passedLine: 84 },
    failedEvidence: [{ lineNumber: 42, text: "error: file is locked" }],
    passedEvidence: [{ lineNumber: 84, text: "setup completed" }],
    source: {
      repository: "owner/repo",
      workflowId: 7,
      commitSha: "abc123",
      comparisonScope: "step",
      step: {
        name: "install",
        failedLines: [40, 45],
        passedLines: [80, 85],
      },
      failed: { runId: 100, attempt: 1, jobId: 11, jobName: "test" },
      passed: { runId: 100, attempt: 2, jobId: 22, jobName: "test" },
    },
  };
}

test("formats a self-contained GitHub Markdown evidence bundle", () => {
  const markdown = formatMarkdown(resultFixture());

  assert.match(markdown, /^# CI RunDiff evidence/m);
  assert.match(markdown, /Repository: \[owner\/repo\]/);
  assert.match(markdown, /\| Category \| environment \|/);
  assert.match(markdown, /failed L42, passed L84/);
  assert.match(markdown, /Step lines: failed L40–45; passed L80–85/);
  assert.match(markdown, /    L42: error: file is locked/);
  assert.match(markdown, /not root-cause claims/);
});

test("formats bounded alignment metadata and escapes table separators", () => {
  const result = resultFixture();
  result.category = "unknown|manual";
  result.alignment = {
    failedLinesSkipped: 2,
    passedLinesSkipped: 1,
    lookahead: 20,
  };
  const markdown = formatMarkdown(result);

  assert.match(markdown, /\| Category \| unknown\\\|manual \|/);
  assert.match(markdown, /2 failed \/ 1 passed lines skipped/);
});
