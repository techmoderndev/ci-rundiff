import test from "node:test";
import assert from "node:assert/strict";
import { compareGitHubRuns, parseRunSpec } from "../src/github.js";

function fakeGitHub({
  failedSha = "abc123",
  passedSha = "abc123",
  failedJobs = [{ id: 11, name: "test", conclusion: "failure" }],
  passedJobs = [{ id: 22, name: "test", conclusion: "success" }],
} = {}) {
  const responses = new Map([
    ["repos/owner/repo/actions/runs/100/attempts/1", {
      id: 100,
      run_attempt: 1,
      conclusion: "failure",
      head_sha: failedSha,
      workflow_id: 7,
    }],
    ["repos/owner/repo/actions/runs/100/attempts/2", {
      id: 100,
      run_attempt: 2,
      conclusion: "success",
      head_sha: passedSha,
      workflow_id: 7,
    }],
    ["repos/owner/repo/actions/runs/100/attempts/1/jobs?per_page=100&page=1", {
      total_count: failedJobs.length,
      jobs: failedJobs,
    }],
    ["repos/owner/repo/actions/runs/100/attempts/2/jobs?per_page=100&page=1", {
      total_count: passedJobs.length,
      jobs: passedJobs,
    }],
  ]);

  const downloaded = [];
  return {
    downloaded,
    apiJson: async (endpoint) => {
      assert.ok(responses.has(endpoint), `unexpected JSON endpoint: ${endpoint}`);
      return responses.get(endpoint);
    },
    apiText: async (endpoint) => {
      downloaded.push(endpoint);
      return endpoint.includes("/11/")
        ? "setup\nnpm ERR! ECONNRESET from registry.npmjs.org\nexit"
        : "setup\npackages installed successfully\nexit";
    },
  };
}

test("parses run IDs with optional attempts", () => {
  assert.deepEqual(parseRunSpec("123"), { runId: 123, attempt: null });
  assert.deepEqual(parseRunSpec("123@4"), { runId: 123, attempt: 4 });
  assert.throws(() => parseRunSpec("123@0"), /Invalid run specification/);
});

test("verifies SHA and compares the only repaired job", async () => {
  const github = fakeGitHub();
  const result = await compareGitHubRuns({
    repository: "owner/repo",
    failed: "100@1",
    passed: "100@2",
  }, github);

  assert.equal(result.sameCommit, "yes");
  assert.equal(result.category, "network");
  assert.equal(result.source.commitSha, "abc123");
  assert.equal(result.source.failed.jobId, 11);
  assert.equal(result.source.passed.jobId, 22);
  assert.deepEqual(github.downloaded, [
    "repos/owner/repo/actions/jobs/11/logs",
    "repos/owner/repo/actions/jobs/22/logs",
  ]);
});

test("rejects mismatched commits before downloading logs", async () => {
  const github = fakeGitHub({ passedSha: "different" });
  await assert.rejects(
    compareGitHubRuns({
      repository: "owner/repo",
      failed: "100@1",
      passed: "100@2",
    }, github),
    /Run commit mismatch/,
  );
  assert.deepEqual(github.downloaded, []);
});

test("rejects different workflows before downloading logs", async () => {
  const github = fakeGitHub();
  const originalApiJson = github.apiJson;
  github.apiJson = async (endpoint) => {
    const response = await originalApiJson(endpoint);
    if (endpoint.endsWith("/attempts/2")) return { ...response, workflow_id: 8 };
    return response;
  };

  await assert.rejects(
    compareGitHubRuns({
      repository: "owner/repo",
      failed: "100@1",
      passed: "100@2",
    }, github),
    /Run workflow mismatch/,
  );
  assert.deepEqual(github.downloaded, []);
});

test("requires an exact job name when multiple jobs were repaired", async () => {
  const github = fakeGitHub({
    failedJobs: [
      { id: 11, name: "linux", conclusion: "failure" },
      { id: 12, name: "windows", conclusion: "failure" },
    ],
    passedJobs: [
      { id: 21, name: "linux", conclusion: "success" },
      { id: 22, name: "windows", conclusion: "success" },
    ],
  });

  await assert.rejects(
    compareGitHubRuns({
      repository: "owner/repo",
      failed: "100@1",
      passed: "100@2",
    }, github),
    /Multiple jobs changed from failure to success.*Use --job/,
  );
});

test("uses an explicitly requested repaired job", async () => {
  const github = fakeGitHub({
    failedJobs: [
      { id: 11, name: "linux", conclusion: "failure" },
      { id: 12, name: "windows", conclusion: "failure" },
    ],
    passedJobs: [
      { id: 21, name: "linux", conclusion: "success" },
      { id: 22, name: "windows", conclusion: "success" },
    ],
  });

  const result = await compareGitHubRuns({
    repository: "owner/repo",
    failed: "100@1",
    passed: "100@2",
    job: "windows",
  }, github);

  assert.equal(result.source.failed.jobId, 12);
  assert.equal(result.source.passed.jobId, 22);
});

test("paginates workflows with more than one hundred jobs", async () => {
  const metadata = {
    "repos/owner/repo/actions/runs/100/attempts/1": {
      id: 100,
      run_attempt: 1,
      conclusion: "failure",
      head_sha: "abc123",
      workflow_id: 7,
    },
    "repos/owner/repo/actions/runs/100/attempts/2": {
      id: 100,
      run_attempt: 2,
      conclusion: "success",
      head_sha: "abc123",
      workflow_id: 7,
    },
  };
  const filler = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1000,
    name: `unchanged-${index}`,
    conclusion: "success",
  }));
  const requested = [];
  const apiJson = async (endpoint) => {
    requested.push(endpoint);
    if (metadata[endpoint]) return metadata[endpoint];
    const failed = endpoint.includes("/attempts/1/");
    const page = endpoint.endsWith("page=2") ? 2 : 1;
    if (page === 1) return { total_count: 101, jobs: filler };
    return {
      total_count: 101,
      jobs: [{
        id: failed ? 11 : 22,
        name: "repaired",
        conclusion: failed ? "failure" : "success",
      }],
    };
  };
  const apiText = async (endpoint) => (
    endpoint.includes("/11/")
      ? "npm ERR! ECONNRESET\nProcess completed with exit code 1"
      : "packages installed successfully"
  );

  const result = await compareGitHubRuns({
    repository: "owner/repo",
    failed: "100@1",
    passed: "100@2",
  }, { apiJson, apiText });

  assert.equal(result.source.failed.jobName, "repaired");
  assert.ok(requested.some((endpoint) => endpoint.endsWith("page=2")));
});
