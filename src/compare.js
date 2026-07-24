import { toLogLines } from "./normalize.js";

const CATEGORY_RULES = [
  ["network", /\b(?:ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|DNS|TLS|certificate|socket hang up)\b/i],
  ["dependency", /(?:npm ERR!|ERR_PNPM|dependency resolution|could not resolve|no matching distribution|registry\.)/i],
  ["cache", /\b(?:cache miss|cache hit|restore key|failed to restore cache|corrupt cache)\b/i],
  ["environment", /(?:permission denied|EACCES|command not found|no such file or directory|runner image)/i],
  ["test", /(?:AssertionError|Test failed|Tests? failed|Expected:|Received:|\bFAIL\b)/i],
];

export function classifyEvidence(lines) {
  const evidence = lines.map((line) => line.original).join("\n");
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(evidence))?.[0] ?? "unknown";
}

function evidenceWindow(lines, index, context) {
  const start = Math.max(0, index - context);
  const end = Math.min(lines.length, index + context + 1);
  return lines.slice(start, end).map(({ lineNumber, original }) => ({ lineNumber, text: original }));
}

export function compareLogs(failedText, passedText, options = {}) {
  const context = options.context ?? 2;
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
      confidence: "observed-difference",
      category: "unknown",
      firstDivergence: null,
      failedEvidence: [],
      passedEvidence: [],
    };
  }

  const failedEvidence = evidenceWindow(failed, index, context);
  const passedEvidence = evidenceWindow(passed, index, context);

  return {
    sameCommit: "unknown",
    status: "difference-found",
    confidence: "observed-difference",
    category: classifyEvidence(failed.slice(index, index + context + 3)),
    firstDivergence: {
      failedLine: failed[index]?.lineNumber ?? null,
      passedLine: passed[index]?.lineNumber ?? null,
    },
    failedEvidence,
    passedEvidence,
  };
}
