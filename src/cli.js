#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { compareLogs } from "./compare.js";
import { formatGitHubText, formatMarkdown, formatText } from "./format.js";
import { compareGitHubRuns } from "./github.js";

const HELP = `ci-rundiff — compare a failed and successful CI log locally

Usage:
  ci-rundiff compare <failed.log> <passed.log> [--json | --markdown]
  ci-rundiff github <owner/repo> <failed-run[@attempt]> <passed-run[@attempt]> [--job <name>] [--step <name>] [--json | --markdown]
  ci-rundiff --help

The github command uses your existing gh CLI credentials, verifies that both
runs use the same commit, and downloads only the selected job logs. Full logs
remain in memory and are not written to disk by CI RunDiff.`;

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

function outputMode(args) {
  const modes = ["--json", "--markdown"].filter((flag) => args.includes(flag));
  if (modes.length > 1) throw new Error("Choose only one output mode: --json or --markdown.");
  return modes[0] ?? "text";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const command = args[0];
  const mode = outputMode(args);

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

    if (mode === "--json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (mode === "--markdown") {
      console.log(formatMarkdown(result, {
        failed: basename(failedPath),
        passed: basename(passedPath),
      }));
      return;
    }

    console.log(formatText(result, basename(failedPath), basename(passedPath)));
    return;
  }

  if (command === "github") {
    const positionals = positionalArgs(args.slice(1), ["--job", "--step"]);
    if (positionals.length !== 3) {
      throw new Error(`github requires repository, failed run, and passed run\n\n${HELP}`);
    }
    const [repository, failed, passed] = positionals;
    const result = await compareGitHubRuns({
      repository,
      failed,
      passed,
      job: optionValue(args, "--job"),
      step: optionValue(args, "--step"),
    });

    if (mode === "--json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (mode === "--markdown") {
      console.log(formatMarkdown(result));
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
