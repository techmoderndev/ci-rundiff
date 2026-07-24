import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLine, toLogLines } from "../src/normalize.js";

test("normalizes volatile CI values", () => {
  const line = "2026-07-23T10:20:30.123Z /home/runner/work/demo/demo/out 123e4567-e89b-12d3-a456-426614174000 localhost:43121";
  assert.equal(
    normalizeLine(line),
    "<TIMESTAMP> <WORKSPACE>/out <UUID> localhost:<PORT>",
  );
});

test("preserves original evidence and line numbers", () => {
  assert.deepEqual(toLogLines("one\ntwo"), [
    { lineNumber: 1, original: "one", normalized: "one" },
    { lineNumber: 2, original: "two", normalized: "two" },
  ]);
});
