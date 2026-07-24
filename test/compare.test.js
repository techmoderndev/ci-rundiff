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
  assert.equal(result.category, "network");
  assert.deepEqual(result.firstDivergence, { failedLine: 3, passedLine: 3 });
  assert.equal(result.failedEvidence[1].text, "npm ERR! ECONNRESET from registry.npmjs.org");
});

test("uses unknown when no category rule matches", () => {
  assert.equal(classifyEvidence([{ original: "unexpected output" }]), "unknown");
});
