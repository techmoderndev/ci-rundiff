import test from "node:test";
import assert from "node:assert/strict";
import { findRepairedStepPair, sliceLogForStep } from "../src/steps.js";

test("finds the only step that changed from failure to success", () => {
  const failedJob = {
    steps: [
      { number: 1, name: "checkout", conclusion: "success" },
      { number: 2, name: "install", conclusion: "failure" },
    ],
  };
  const passedJob = {
    steps: [
      { number: 1, name: "checkout", conclusion: "success" },
      { number: 2, name: "install", conclusion: "success" },
    ],
  };

  const pair = findRepairedStepPair(failedJob, passedJob);
  assert.equal(pair.failed.name, "install");
  assert.equal(pair.passed.number, 2);
});

test("requires an exact step when multiple steps were repaired", () => {
  const failedJob = {
    steps: [
      { number: 1, name: "install", conclusion: "failure" },
      { number: 2, name: "test", conclusion: "failure" },
    ],
  };
  const passedJob = {
    steps: [
      { number: 1, name: "install", conclusion: "success" },
      { number: 2, name: "test", conclusion: "success" },
    ],
  };

  assert.throws(
    () => findRepairedStepPair(failedJob, passedJob),
    /Multiple steps changed from failure to success.*Use --step/,
  );
  assert.equal(findRepairedStepPair(failedJob, passedJob, "test").failed.number, 2);
});

test("slices a job log by GitHub step timestamps and preserves its line span", () => {
  const log = [
    "2026-07-23T10:00:00.000Z checkout",
    "2026-07-23T10:00:05.000Z install start",
    "2026-07-23T10:00:06.000Z npm ERR! ECONNRESET",
    "2026-07-23T10:00:07.800Z install end",
    "2026-07-23T10:00:08.000Z cleanup",
  ].join("\n");
  const step = {
    started_at: "2026-07-23T10:00:05Z",
    completed_at: "2026-07-23T10:00:07Z",
  };

  assert.deepEqual(sliceLogForStep(log, step), {
    text: [
      "2026-07-23T10:00:05.000Z install start",
      "2026-07-23T10:00:06.000Z npm ERR! ECONNRESET",
      "2026-07-23T10:00:07.800Z install end",
    ].join("\n"),
    startLine: 2,
    endLine: 4,
  });
});

test("narrows a timestamp slice with GitHub debug step boundaries", () => {
  const log = [
    "2026-07-23T10:00:05.000Z evaluating step",
    "2026-07-23T10:00:05.100Z ##[debug]Starting: install",
    "2026-07-23T10:00:06.000Z npm ERR! ECONNRESET",
    "2026-07-23T10:00:07.100Z ##[debug]Finishing: install",
    "2026-07-23T10:00:07.800Z evaluating next step",
  ].join("\n");
  const step = {
    name: "install",
    started_at: "2026-07-23T10:00:05Z",
    completed_at: "2026-07-23T10:00:07Z",
  };

  assert.deepEqual(sliceLogForStep(log, step), {
    text: [
      "2026-07-23T10:00:05.100Z ##[debug]Starting: install",
      "2026-07-23T10:00:06.000Z npm ERR! ECONNRESET",
      "2026-07-23T10:00:07.100Z ##[debug]Finishing: install",
    ].join("\n"),
    startLine: 2,
    endLine: 4,
  });
});
