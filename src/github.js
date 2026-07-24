import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { compareLogs } from "./compare.js";
import { findRepairedStepPair, sliceLogForStep } from "./steps.js";

const execFileAsync = promisify(execFile);
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RUN_SPEC_PATTERN = /^(\d+)(?:@([1-9]\d*))?$/;

async function ghApi(endpoint) {
  try {
    const { stdout } = await execFileAsync("gh", ["api", endpoint], {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    throw new Error(`GitHub API request failed for ${endpoint}: ${detail}`);
  }
}

async function defaultApiJson(endpoint) {
  const response = await ghApi(endpoint);
  try {
    return JSON.parse(response);
  } catch {
    throw new Error(`GitHub API returned invalid JSON for ${endpoint}`);
  }
}

export function parseRunSpec(value) {
  const match = RUN_SPEC_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid run specification: ${value}. Use RUN_ID or RUN_ID@ATTEMPT.`);
  }
  return {
    runId: Number(match[1]),
    attempt: match[2] ? Number(match[2]) : null,
  };
}

function validateRepository(repository) {
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new Error(`Invalid repository: ${repository}. Use OWNER/REPO.`);
  }
}

function runEndpoint(repository, spec) {
  const base = `repos/${repository}/actions/runs/${spec.runId}`;
  return spec.attempt ? `${base}/attempts/${spec.attempt}` : base;
}

function jobsEndpoint(repository, spec, page) {
  return `${runEndpoint(repository, spec)}/jobs?per_page=100&page=${page}`;
}

async function listJobs(repository, spec, apiJson) {
  const jobs = [];
  let page = 1;

  while (true) {
    const response = await apiJson(jobsEndpoint(repository, spec, page));
    if (!Array.isArray(response.jobs)) {
      throw new Error(`GitHub API returned invalid jobs data for run ${spec.runId}`);
    }
    jobs.push(...response.jobs);

    const total = Number(response.total_count ?? jobs.length);
    if (jobs.length >= total || response.jobs.length < 100) return jobs;
    page += 1;
  }
}

function requireConclusion(metadata, expected, label) {
  if (metadata.conclusion !== expected) {
    throw new Error(
      `${label} run ${metadata.id} attempt ${metadata.run_attempt} has conclusion `
      + `${metadata.conclusion ?? "unknown"}; expected ${expected}.`,
    );
  }
}

function findJobPair(failedJobs, passedJobs, requestedName) {
  const failedByName = failedJobs.filter((job) => job.conclusion === "failure");
  const passedByName = passedJobs.filter((job) => job.conclusion === "success");

  if (requestedName) {
    const failed = failedByName.filter((job) => job.name === requestedName);
    const passed = passedByName.filter((job) => job.name === requestedName);
    if (failed.length !== 1 || passed.length !== 1) {
      throw new Error(
        `Job "${requestedName}" must exist exactly once as failure and once as success.`,
      );
    }
    return { failed: failed[0], passed: passed[0] };
  }

  const passedNames = new Map(passedByName.map((job) => [job.name, job]));
  const pairs = failedByName
    .filter((job) => passedNames.has(job.name))
    .map((failed) => ({ failed, passed: passedNames.get(failed.name) }));

  if (pairs.length === 0) {
    throw new Error("No job changed from failure to success between the selected runs.");
  }
  if (pairs.length > 1) {
    const names = pairs.map(({ failed }) => failed.name).join(", ");
    throw new Error(`Multiple jobs changed from failure to success: ${names}. Use --job.`);
  }
  return pairs[0];
}

export async function compareGitHubRuns(options, dependencies = {}) {
  const {
    repository,
    failed: failedValue,
    passed: passedValue,
    job: requestedJob,
    step: requestedStep,
  } = options;
  validateRepository(repository);

  const failedSpec = parseRunSpec(failedValue);
  const passedSpec = parseRunSpec(passedValue);
  const apiJson = dependencies.apiJson ?? defaultApiJson;
  const apiText = dependencies.apiText ?? ghApi;

  const [failedRun, passedRun] = await Promise.all([
    apiJson(runEndpoint(repository, failedSpec)),
    apiJson(runEndpoint(repository, passedSpec)),
  ]);

  requireConclusion(failedRun, "failure", "Failed");
  requireConclusion(passedRun, "success", "Passed");

  if (!failedRun.head_sha || failedRun.head_sha !== passedRun.head_sha) {
    throw new Error(
      `Run commit mismatch: ${failedRun.head_sha ?? "unknown"} != `
      + `${passedRun.head_sha ?? "unknown"}.`,
    );
  }
  if (!failedRun.workflow_id || failedRun.workflow_id !== passedRun.workflow_id) {
    throw new Error(
      `Run workflow mismatch: ${failedRun.workflow_id ?? "unknown"} != `
      + `${passedRun.workflow_id ?? "unknown"}.`,
    );
  }

  const [failedJobs, passedJobs] = await Promise.all([
    listJobs(repository, failedSpec, apiJson),
    listJobs(repository, passedSpec, apiJson),
  ]);
  const pair = findJobPair(failedJobs, passedJobs, requestedJob);

  const [failedText, passedText] = await Promise.all([
    apiText(`repos/${repository}/actions/jobs/${pair.failed.id}/logs`),
    apiText(`repos/${repository}/actions/jobs/${pair.passed.id}/logs`),
  ]);
  const stepPair = findRepairedStepPair(pair.failed, pair.passed, requestedStep);
  const failedStepLog = stepPair ? sliceLogForStep(failedText, stepPair.failed) : null;
  const passedStepLog = stepPair ? sliceLogForStep(passedText, stepPair.passed) : null;
  const alignedStep = failedStepLog && passedStepLog ? stepPair : null;
  const result = alignedStep
    ? compareLogs(failedStepLog.text, passedStepLog.text, {
        failedLineOffset: failedStepLog.startLine - 1,
        passedLineOffset: passedStepLog.startLine - 1,
      })
    : compareLogs(failedText, passedText);

  return {
    ...result,
    sameCommit: "yes",
    source: {
      provider: "github-actions",
      repository,
      workflowId: failedRun.workflow_id,
      commitSha: failedRun.head_sha,
      comparisonScope: alignedStep ? "step" : "job",
      step: alignedStep ? {
        name: alignedStep.failed.name,
        failedNumber: alignedStep.failed.number,
        passedNumber: alignedStep.passed.number,
        failedLines: [failedStepLog.startLine, failedStepLog.endLine],
        passedLines: [passedStepLog.startLine, passedStepLog.endLine],
      } : null,
      failed: {
        runId: failedRun.id,
        attempt: failedRun.run_attempt,
        jobId: pair.failed.id,
        jobName: pair.failed.name,
      },
      passed: {
        runId: passedRun.id,
        attempt: passedRun.run_attempt,
        jobId: pair.passed.id,
        jobName: pair.passed.name,
      },
    },
  };
}
