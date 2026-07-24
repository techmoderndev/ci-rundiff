import test from "node:test";
import assert from "node:assert/strict";
import { classifyEvidence, compareLogs } from "../src/compare.js";

test("ignores normalized timestamp differences", () => {
  const failed = "2026-07-23T10:00:00Z setup complete\nall good";
  const passed = "2026-07-23T10:01:00Z setup complete\nall good";
  assert.equal(compareLogs(failed, passed).status, "no-meaningful-difference");
});

test("finds the first observed divergence with exact evidence", () => {
  const failed = "checkout\ninstall\nnpm ERR! ECONNRESET from registry.npmjs.org\nend";
  const passed = "checkout\ninstall\npackages installed\nend";
  const result = compareLogs(failed, passed, { context: 1 });

  assert.equal(result.status, "difference-found");
  assert.equal(result.strategy, "unique-failure-signal");
  assert.equal(result.category, "network");
  assert.deepEqual(result.firstDivergence, { failedLine: 3, passedLine: 3 });
  assert.equal(result.failedEvidence[1].text, "npm ERR! ECONNRESET from registry.npmjs.org");
});

test("prefers a unique failed-test signal over earlier environment differences", () => {
  const failed = [
    "Azure Region: eastus2",
    "setup complete",
    "file-watching.test.ts (10 tests | 1 failed)",
    "Error: Timeout when waiting for report",
  ].join("\n");
  const passed = [
    "Azure Region: northcentralus",
    "setup complete",
    "Test Files 168 passed",
    "Tests 1255 passed",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 1 });
  assert.equal(result.strategy, "unique-failure-signal");
  assert.equal(result.category, "test");
  assert.deepEqual(result.firstDivergence, { failedLine: 3, passedLine: 4 });
  assert.equal(result.failedEvidence[1].text, "file-watching.test.ts (10 tests | 1 failed)");
  assert.equal(result.passedEvidence[1].text, "Tests 1255 passed");
});

test("uses unknown when no category rule matches", () => {
  assert.equal(classifyEvidence([{ original: "unexpected output" }]), "unknown");
});
