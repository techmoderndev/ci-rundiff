function formatEvidenceText(lines) {
  if (lines.length === 0) return "  (none)";
  return lines.map(({ lineNumber, text }) => `  L${lineNumber}: ${text}`).join("\n");
}

function divergenceText(result) {
  return result.firstDivergence
    ? `failed L${result.firstDivergence.failedLine ?? "EOF"}, `
      + `passed L${result.firstDivergence.passedLine ?? "EOF"}`
    : "none";
}

function tableValue(value) {
  return String(value ?? "none").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function indentedEvidence(lines) {
  if (lines.length === 0) return "    (none)";
  return lines
    .map(({ lineNumber, text }) => `    L${lineNumber}: ${text}`)
    .join("\n");
}

function githubSourceLines(source) {
  const repositoryUrl = `https://github.com/${source.repository}`;
  const failedRunUrl = `${repositoryUrl}/actions/runs/${source.failed.runId}`;
  const passedRunUrl = `${repositoryUrl}/actions/runs/${source.passed.runId}`;
  return [
    `- Repository: [${source.repository}](${repositoryUrl})`,
    `- Commit: \`${source.commitSha}\``,
    `- Workflow ID: \`${source.workflowId}\``,
    `- Job: ${source.failed.jobName}`,
    `- Scope: ${source.comparisonScope}`,
    ...(source.step ? [`- Step: ${source.step.name}`] : []),
    ...(source.step ? [
      `- Step lines: failed L${source.step.failedLines[0]}–${source.step.failedLines[1]}; `
      + `passed L${source.step.passedLines[0]}–${source.step.passedLines[1]}`,
    ] : []),
    `- Failed: [run ${source.failed.runId}, attempt ${source.failed.attempt}](${failedRunUrl}), job \`${source.failed.jobId}\``,
    `- Passed: [run ${source.passed.runId}, attempt ${source.passed.attempt}](${passedRunUrl}), job \`${source.passed.jobId}\``,
  ];
}

export function formatText(result, failedLabel, passedLabel) {
  return [
    `Compared: ${failedLabel} ↔ ${passedLabel}`,
    `Same commit: ${result.sameCommit}`,
    `Status: ${result.status}`,
    `Strategy: ${result.strategy}`,
    `First meaningful divergence: ${divergenceText(result)}`,
    `Category: ${result.category}`,
    `Confidence: ${result.confidence}`,
    "Failed evidence:",
    formatEvidenceText(result.failedEvidence),
    "Passed evidence:",
    formatEvidenceText(result.passedEvidence),
  ].join("\n");
}

export function formatGitHubText(result) {
  const { source } = result;
  const failedLabel = `${source.failed.runId}@${source.failed.attempt} job ${source.failed.jobId}`;
  const passedLabel = `${source.passed.runId}@${source.passed.attempt} job ${source.passed.jobId}`;
  return [
    `Repository: ${source.repository}`,
    `Commit: ${source.commitSha}`,
    `Job: ${source.failed.jobName}`,
    `Scope: ${source.comparisonScope}`,
    ...(source.step ? [`Step: ${source.step.name}`] : []),
    formatText(result, failedLabel, passedLabel),
  ].join("\n");
}

export function formatMarkdown(result, labels = {}) {
  const sourceLines = result.source
    ? githubSourceLines(result.source)
    : [
        `- Failed input: ${labels.failed ?? "failed log"}`,
        `- Passed input: ${labels.passed ?? "passed log"}`,
      ];
  const alignment = result.alignment
    ? `${result.alignment.failedLinesSkipped} failed / `
      + `${result.alignment.passedLinesSkipped} passed lines skipped`
    : "none";

  return [
    "# CI RunDiff evidence",
    "",
    "> Observed log differences only. Category labels are heuristic and are not root-cause claims.",
    "",
    "## Source",
    "",
    ...sourceLines,
    "",
    "## Summary",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Same commit | ${tableValue(result.sameCommit)} |`,
    `| Status | ${tableValue(result.status)} |`,
    `| Strategy | ${tableValue(result.strategy)} |`,
    `| Category | ${tableValue(result.category)} |`,
    `| Confidence | ${tableValue(result.confidence)} |`,
    `| First meaningful divergence | ${tableValue(divergenceText(result))} |`,
    `| Bounded alignment | ${tableValue(alignment)} |`,
    "",
    "## Failed evidence",
    "",
    indentedEvidence(result.failedEvidence),
    "",
    "## Passed evidence",
    "",
    indentedEvidence(result.passedEvidence),
    "",
  ].join("\n");
}
