#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { compareLogs } from "./compare.js";
import { compareGitHubRuns } from "./github.js";

const HELP = `ci-rundiff — compare a failed and successful CI log locally

Usage:
  ci-rundiff compare <failed.log> <passed.log> [--json]
  ci-rundiff github <owner/repo> <failed-run[@attempt]> <passed-run[@attempt]> [--job <name>] [--json]
  ci-rundiff --help

The github command uses your existing gh CLI credentials, verifies that both
runs use the same commit, and downloads only the selected job logs. Full logs
remain in memory and are not written to disk by CI RunDiff.`;

function formatEvidence(lines) {
  if (lines.length === 0) return "  (none)";
  return lines.map(({ lineNumber, text }) => `  L${lineNumber}: ${text}`).join("\n");
}

function formatText(result, failedPath, passedPath) {
  const divergence = result.firstDivergence
    ? `failed L${result.firstDivergence.failedLine ?? "EOF"}, passed L${result.firstDivergence.passedLine ?? "EOF"}`
    : "none";

  return [
    `Compared: ${basename(failedPath)} ↔ ${basename(passedPath)}`,
    `Same commit: ${result.sameCommit}`,
    `Status: ${result.status}`,
    `Strategy: ${result.strategy}`,
    `First meaningful divergence: ${divergence}`,
    `Category: ${result.category}`,
    `Confidence: ${result.confidence}`,
    "Failed evidence:",
    formatEvidence(result.failedEvidence),
    "Passed evidence:",
    formatEvidence(result.passedEvidence),
  ].join("\n");
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function positionalArgs(args, valueOptions = []) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (valueOptions.includes(args[index])) {
      index += 1;
    } else if (!args[index].startsWith("--")) {
      values.push(args[index]);
    }
  }
  return values;
}

function formatGitHubText(result) {
  const { source } = result;
  const failedLabel = `${source.failed.runId}@${source.failed.attempt} job ${source.failed.jobId}`;
  const passedLabel = `${source.passed.runId}@${source.passed.attempt} job ${source.passed.jobId}`;
  return [
    `Repository: ${source.repository}`,
    `Commit: ${source.commitSha}`,
    `Job: ${source.failed.jobName}`,
    formatText(result, failedLabel, passedLabel),
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const command = args[0];

  if (command === "compare") {
    const paths = positionalArgs(args.slice(1));
    if (paths.length !== 2) {
      throw new Error(`compare requires exactly two log files\n\n${HELP}`);
    }

    const [failedPath, passedPath] = paths;
    const [failedText, passedText] = await Promise.all([
      readFile(failedPath, "utf8"),
      readFile(passedPath, "utf8"),
    ]);
    const result = compareLogs(failedText, passedText);

    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(formatText(result, failedPath, passedPath));
    return;
  }

  if (command === "github") {
    const positionals = positionalArgs(args.slice(1), ["--job"]);
    if (positionals.length !== 3) {
      throw new Error(`github requires repository, failed run, and passed run\n\n${HELP}`);
    }
    const [repository, failed, passed] = positionals;
    const result = await compareGitHubRuns({
      repository,
      failed,
      passed,
      job: optionValue(args, "--job"),
    });

    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(formatGitHubText(result));
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${HELP}`);
}

main().catch((error) => {
  console.error(`ci-rundiff: ${error.message}`);
  process.exitCode = 1;
});
