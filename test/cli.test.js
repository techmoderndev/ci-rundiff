import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

function runCli(...args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

test("prints help without treating it as an error", () => {
  const result = runCli("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /ci-rundiff github/);
  assert.equal(result.stderr, "");
});

test("prints the package version", () => {
  const result = runCli("--version");
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "0.0.1");
  assert.equal(result.stderr, "");
});

test("rejects unknown options instead of silently ignoring them", () => {
  const result = runCli("compare", "failed.log", "passed.log", "--bogus");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option: --bogus/);
});

test("rejects GitHub-only options on local comparison", () => {
  const result = runCli("compare", "failed.log", "passed.log", "--job", "test");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option: --job/);
});

test("reports missing option values before making a GitHub request", () => {
  const result = runCli(
    "github",
    "owner/repo",
    "123@1",
    "123@2",
    "--job",
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--job requires a value/);
});
