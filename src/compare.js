import { toLogLines } from "./normalize.js";

const CATEGORY_RULES = [
  ["network", /\b(?:ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|DNS|TLS|certificate|socket hang up|TimeoutError|ReadTimeoutError|Read timed out)\b/i],
  ["dependency", /(?:npm ERR!|ERR_PNPM|dependency resolution|could not resolve|no matching distribution|registry\.|no valid OpenPGP data|No public key|Could not verify signature)/i],
  ["cache", /\b(?:cache miss|cache hit|restore key|failed to restore cache|corrupt cache)\b/i],
  ["environment", /(?:permission denied|EACCES|command not found|no such file or directory|runner image|being used by another process|os error 32)/i],
  ["test", /(?:AssertionError|Test failed|Tests? failed|\b\d+\s+failed\b|Expected:|Received:|\bFAIL\b)/i],
];

const FAILURE_SIGNAL = /(?:##\[error\]|AssertionError|Test failed|Tests? failed|\b\d+\s+failed\b|npm ERR!|ERR_PNPM|ELIFECYCLE|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|TimeoutError|ReadTimeoutError|Read timed out|no valid OpenPGP data|No public key|Could not verify signature|permission denied|EACCES|command not found|being used by another process|os error 32|Process completed with exit code [1-9]\d*)/i;
const TEST_PASS_SUMMARY = /(?:Test Files|Tests)\s+.*\b\d+\s+passed\b/i;
const NETWORK_PASS_SUMMARY = /(?:^|[\s>])OK\s*$/i;
const DEPENDENCY_PASS_SUMMARY = /(?:Good signature|CLI integrity verified|codecov:\s*OK)/i;
const ENVIRONMENT_PASS_SUMMARY = /(?:Rust is installed now|toolchain installed|setup completed)/i;
const GENERAL_PASS_SUMMARY = /(?:Process completed with exit code 0|conclusion=success|\b(?:success|succeeded)\b)/i;
const PASS_SUMMARIES = {
  dependency: DEPENDENCY_PASS_SUMMARY,
  environment: ENVIRONMENT_PASS_SUMMARY,
  network: NETWORK_PASS_SUMMARY,
  test: TEST_PASS_SUMMARY,
};

export function classifyEvidence(lines) {
  const evidence = lines.map((line) => line.normalized ?? line.original).join("\n");
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(evidence))?.[0] ?? "unknown";
}

function evidenceWindow(lines, index, context, lineOffset = 0) {
  const start = Math.max(0, index - context);
  const end = Math.min(lines.length, index + context + 1);
  return lines.slice(start, end).map(({ lineNumber, original }) => ({
    lineNumber: lineNumber + lineOffset,
    text: original,
  }));
}

function findUniqueFailureSignal(failed, passed) {
  const passedLines = new Set(passed.map((line) => line.normalized));
  return failed.findIndex(
    (line) => FAILURE_SIGNAL.test(line.normalized) && !passedLines.has(line.normalized),
  );
}

function findPassedCounterpart(passed, category) {
  const preferred = PASS_SUMMARIES[category] ?? GENERAL_PASS_SUMMARY;
  for (let index = passed.length - 1; index >= 0; index -= 1) {
    if (preferred.test(passed[index].normalized)) return index;
  }
  return -1;
}

export function compareLogs(failedText, passedText, options = {}) {
  const context = options.context ?? 2;
  const failedLineOffset = options.failedLineOffset ?? 0;
  const passedLineOffset = options.passedLineOffset ?? 0;
  const failed = toLogLines(failedText);
  const passed = toLogLines(passedText);
  const sharedLength = Math.min(failed.length, passed.length);

  let index = 0;
  while (index < sharedLength && failed[index].normalized === passed[index].normalized) {
    index += 1;
  }

  const identical = index === sharedLength && failed.length === passed.length;
  if (identical) {
    return {
      sameCommit: "unknown",
      status: "no-meaningful-difference",
      strategy: "normalized-equality",
      confidence: "observed-difference",
      category: "unknown",
      firstDivergence: null,
      failedEvidence: [],
      passedEvidence: [],
    };
  }

  const signalIndex = findUniqueFailureSignal(failed, passed);
  if (signalIndex >= 0) {
    const category = classifyEvidence(failed.slice(signalIndex, signalIndex + context + 3));
    const counterpartIndex = findPassedCounterpart(passed, category);
    const passedIndex = counterpartIndex >= 0
      ? counterpartIndex
      : Math.min(signalIndex, passed.length - 1);
    return {
      sameCommit: "unknown",
      status: "difference-found",
      strategy: "unique-failure-signal",
      confidence: "observed-difference",
      category,
      firstDivergence: {
        failedLine: failed[signalIndex].lineNumber + failedLineOffset,
        passedLine: passedIndex >= 0
          ? passed[passedIndex].lineNumber + passedLineOffset
          : null,
      },
      failedEvidence: evidenceWindow(failed, signalIndex, context, failedLineOffset),
      passedEvidence: passedIndex >= 0
        ? evidenceWindow(passed, passedIndex, context, passedLineOffset)
        : [],
    };
  }

  const failedEvidence = evidenceWindow(failed, index, context, failedLineOffset);
  const passedEvidence = evidenceWindow(passed, index, context, passedLineOffset);

  return {
    sameCommit: "unknown",
    status: "difference-found",
    strategy: "first-normalized-divergence",
    confidence: "observed-difference",
    category: classifyEvidence(failed.slice(index, index + context + 3)),
    firstDivergence: {
      failedLine: failed[index] ? failed[index].lineNumber + failedLineOffset : null,
      passedLine: passed[index] ? passed[index].lineNumber + passedLineOffset : null,
    },
    failedEvidence,
    passedEvidence,
  };
}
