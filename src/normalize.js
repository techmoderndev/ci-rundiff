const ANSI_ESCAPE = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const ISO_TIMESTAMP = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const UNIX_WORKSPACE = /\/home\/runner\/work\/[^/\s]+\/[^/\s]+\//g;
const WINDOWS_WORKSPACE = /[A-Z]:\\a\\[^\\\s]+\\[^\\\s]+\\/gi;
const TEMP_PATH = /(?:\/tmp|\/var\/folders)\/[^\s]+/g;
const LOCAL_PORT = /\b(?:localhost|127\.0\.0\.1):(\d{2,5})\b/g;

export function normalizeLine(line) {
  return line
    .replace(ANSI_ESCAPE, "")
    .replace(ISO_TIMESTAMP, "<TIMESTAMP>")
    .replace(UUID, "<UUID>")
    .replace(UNIX_WORKSPACE, "<WORKSPACE>/")
    .replace(WINDOWS_WORKSPACE, "<WORKSPACE>\\")
    .replace(TEMP_PATH, "<TEMP_PATH>")
    .replace(LOCAL_PORT, "localhost:<PORT>")
    .replace(/[ \t]+$/g, "");
}

export function toLogLines(text) {
  const original = text.replace(/\r\n/g, "\n").split("\n");
  return original.map((line, index) => ({
    lineNumber: index + 1,
    original: line,
    normalized: normalizeLine(line),
  }));
}
