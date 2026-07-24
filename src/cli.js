#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { compareLogs } from "./compare.js";

const HELP = `ci-rundiff — compare a failed and successful CI log locally

Usage:
  ci-rundiff compare <failed.log> <passed.log> [--json]
  ci-rundiff --help

The current spike accepts downloaded text logs. GitHub Actions run IDs are
planned but not implemented yet. No log data leaves this machine.`;

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
    `First meaningful divergence: ${divergence}`,
    `Category: ${result.category}`,
    `Confidence: ${result.confidence}`,
    "Failed evidence:",
    formatEvidence(result.failedEvidence),
    "Passed evidence:",
    formatEvidence(result.passedEvidence),
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  if (args[0] !== "compare") {
    throw new Error(`Unknown command: ${args[0]}\n\n${HELP}`);
  }

  const paths = args.slice(1).filter((arg) => !arg.startsWith("--"));
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
}

main().catch((error) => {
  console.error(`ci-rundiff: ${error.message}`);
  process.exitCode = 1;
});
