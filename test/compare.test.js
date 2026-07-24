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

test("pairs a failed signature verification with successful integrity evidence", () => {
  const failed = [
    "Downloading Codecov uploader",
    "gpg: no valid OpenPGP data found.",
    "gpg: Can't check signature: No public key",
    "Could not verify signature",
    "Process completed with exit code 1",
  ].join("\n");
  const passed = [
    "Downloading Codecov uploader",
    "gpg: Good signature from Codecov Uploader",
    "codecov: OK",
    "CLI integrity verified",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 1 });
  assert.equal(result.strategy, "unique-failure-signal");
  assert.equal(result.category, "dependency");
  assert.deepEqual(result.firstDivergence, { failedLine: 2, passedLine: 4 });
  assert.equal(result.passedEvidence[1].text, "CLI integrity verified");
});

test("classifies a unique HTTP read timeout as network evidence", () => {
  const failed = [
    "Running API tests",
    "TimeoutError: timed out",
    "urllib3.exceptions.ReadTimeoutError: Read timed out",
    "FAILED (errors=1)",
  ].join("\n");
  const passed = [
    "Running API tests",
    "Ran 103 tests",
    "OK",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 1 });
  assert.equal(result.strategy, "unique-failure-signal");
  assert.equal(result.category, "network");
  assert.deepEqual(result.firstDivergence, { failedLine: 2, passedLine: 3 });
  assert.equal(result.passedEvidence[1].text, "OK");
});

test("pairs a Windows setup file lock with successful installation evidence", () => {
  const failed = [
    "Starting: Pre-install rustup 1.28.2",
    "Detected broken rustup 1.29.0, replacing with 1.28.2",
    "error: could not remove rustup.exe: The process cannot access the file because it is being used by another process. (os error 32)",
    "Process completed with exit code 1",
  ].join("\n");
  const passed = [
    "Starting: Pre-install rustup 1.28.2",
    "Detected broken rustup 1.29.0, replacing with 1.28.2",
    "info: skipping toolchain installation",
    "Rust is installed now. Great!",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 1 });
  assert.equal(result.strategy, "unique-failure-signal");
  assert.equal(result.category, "environment");
  assert.deepEqual(result.firstDivergence, { failedLine: 3, passedLine: 4 });
  assert.equal(result.passedEvidence[1].text, "Rust is installed now. Great!");
});

test("preserves original job line numbers for aligned step slices", () => {
  const result = compareLogs(
    "setup\nnpm ERR! ECONNRESET\nexit",
    "setup\npackages installed successfully\nexit",
    { context: 1, failedLineOffset: 40, passedLineOffset: 80 },
  );

  assert.deepEqual(result.firstDivergence, { failedLine: 42, passedLine: 82 });
  assert.equal(result.failedEvidence[1].lineNumber, 42);
  assert.equal(result.passedEvidence[1].lineNumber, 82);
});

test("skips a bounded failed-only insertion before reporting the real divergence", () => {
  const failed = [
    "setup",
    "runner diagnostic only",
    "install",
    "unexpected state",
    "cleanup",
  ].join("\n");
  const passed = [
    "setup",
    "install",
    "ready",
    "cleanup",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 0 });
  assert.equal(result.strategy, "bounded-line-alignment");
  assert.deepEqual(result.alignment, {
    failedLinesSkipped: 1,
    passedLinesSkipped: 0,
    lookahead: 20,
  });
  assert.deepEqual(result.firstDivergence, { failedLine: 4, passedLine: 3 });
});

test("skips a bounded passed-only insertion before reporting the real divergence", () => {
  const failed = [
    "setup",
    "install",
    "unexpected state",
    "cleanup",
  ].join("\n");
  const passed = [
    "setup",
    "runner diagnostic only",
    "install",
    "ready",
    "cleanup",
  ].join("\n");

  const result = compareLogs(failed, passed, { context: 0 });
  assert.equal(result.strategy, "bounded-line-alignment");
  assert.deepEqual(result.alignment, {
    failedLinesSkipped: 0,
    passedLinesSkipped: 1,
    lookahead: 20,
  });
  assert.deepEqual(result.firstDivergence, { failedLine: 3, passedLine: 4 });
});

test("keeps the first divergence when inserted lines never resynchronize", () => {
  const result = compareLogs(
    "setup\nfailed-only trailing detail",
    "setup",
    { context: 0 },
  );

  assert.equal(result.strategy, "first-normalized-divergence");
  assert.equal(result.alignment, null);
  assert.deepEqual(result.firstDivergence, { failedLine: 2, passedLine: null });
});

test("does not guess when both sides have plausible resynchronization anchors", () => {
  const result = compareLogs(
    "setup\nalpha\nbeta\ncleanup",
    "setup\nbeta\nalpha\ncleanup",
    { context: 0 },
  );

  assert.equal(result.strategy, "first-normalized-divergence");
  assert.equal(result.alignment, null);
  assert.deepEqual(result.firstDivergence, { failedLine: 2, passedLine: 2 });
});
