const LOG_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s/;

function matchingStepPairs(failedJob, passedJob) {
  if (!Array.isArray(failedJob.steps) || !Array.isArray(passedJob.steps)) return [];

  const failedSteps = failedJob.steps.filter((step) => step.conclusion === "failure");
  const passedSteps = passedJob.steps.filter((step) => step.conclusion === "success");

  return failedSteps.flatMap((failed) => {
    const matches = passedSteps.filter((passed) => passed.name === failed.name);
    return matches.length === 1 ? [{ failed, passed: matches[0] }] : [];
  });
}

export function findRepairedStepPair(failedJob, passedJob, requestedName = null) {
  const pairs = matchingStepPairs(failedJob, passedJob);

  if (requestedName) {
    const requested = pairs.filter(({ failed }) => failed.name === requestedName);
    if (requested.length !== 1) {
      throw new Error(
        `Step "${requestedName}" must exist exactly once as failure and once as success.`,
      );
    }
    return requested[0];
  }

  if (pairs.length === 0) return null;
  if (pairs.length > 1) {
    const names = pairs.map(({ failed }) => failed.name).join(", ");
    throw new Error(`Multiple steps changed from failure to success: ${names}. Use --step.`);
  }
  return pairs[0];
}

export function sliceLogForStep(logText, step) {
  const startedAt = Date.parse(step.started_at);
  const completedAt = Date.parse(step.completed_at);
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) return null;
  const completedSecondEnd = completedAt + 999;

  const lines = logText.replace(/\r\n/g, "\n").split("\n");
  let firstIndex = -1;
  let lastIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const match = LOG_TIMESTAMP.exec(lines[index]);
    if (!match) continue;
    const timestamp = Date.parse(match[1]);
    if (timestamp >= startedAt && timestamp <= completedSecondEnd) {
      if (firstIndex < 0) firstIndex = index;
      lastIndex = index;
    }
  }

  if (firstIndex < 0) return null;
  const startingMarker = `##[debug]Starting: ${step.name}`;
  const finishingMarker = `##[debug]Finishing: ${step.name}`;
  const markerStart = lines.findIndex(
    (line, index) => index >= firstIndex && index <= lastIndex && line.includes(startingMarker),
  );
  const markerEnd = lines.findIndex(
    (line, index) => index >= markerStart && index <= lastIndex && line.includes(finishingMarker),
  );
  if (markerStart >= 0 && markerEnd >= markerStart) {
    firstIndex = markerStart;
    lastIndex = markerEnd;
  }

  return {
    text: lines.slice(firstIndex, lastIndex + 1).join("\n"),
    startLine: firstIndex + 1,
    endLine: lastIndex + 1,
  };
}
