/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');

const acResultsPath = process.env.AC_RESULTS_PATH || 'ac-results.json';
const markdownOutputPath = process.env.AC_STATUS_OUTPUT || 'ac_status.md';
const prCommentPath = process.env.AC_PR_COMMENT_OUTPUT || 'ac_pr_comment.md';
const badgeJsonPath = process.env.AC_BADGE_JSON_OUTPUT || 'docs/qa-dashboard/ac-status.json';

function normalizeStatus(status) {
  const value = String(status || 'unknown').toLowerCase();
  if (['pass', 'passed', 'success', 'ok'].includes(value)) return 'PASS';
  if (['fail', 'failed', 'failure', 'error', 'timed_out', 'cancelled'].includes(value)) return 'FAIL';
  if (['skipped', 'skip'].includes(value)) return 'SKIP';
  return 'UNKNOWN';
}

function readResults() {
  if (!fs.existsSync(acResultsPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(acResultsPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Unable to parse ${acResultsPath}:`, error);
    return [];
  }
}

function buildTable(results) {
  const lines = ['| Acceptance Criteria | Status |', '|---|---|'];

  if (results.length === 0) {
    lines.push('| N/A | REPORT_NOT_FOUND |');
    return lines.join('\n');
  }

  for (const item of results) {
    lines.push(`| ${item.ac} | ${normalizeStatus(item.status)} |`);
  }

  return lines.join('\n');
}

function computeOverall(results) {
  if (results.length === 0) return 'unknown';
  const statuses = results.map((item) => normalizeStatus(item.status));
  if (statuses.some((status) => status === 'FAIL')) return 'fail';
  if (statuses.some((status) => status === 'UNKNOWN')) return 'unknown';
  if (statuses.every((status) => status === 'SKIP')) return 'unknown';
  return 'pass';
}

function writeFile(path, content) {
  fs.mkdirSync(require('node:path').dirname(path), { recursive: true });
  fs.writeFileSync(path, content, 'utf8');
}

const results = readResults();
const table = buildTable(results);
const overall = computeOverall(results);
const message = overall === 'pass' ? 'passing' : overall === 'fail' ? 'failing' : 'unknown';
const color = overall === 'pass' ? 'brightgreen' : overall === 'fail' ? 'red' : 'lightgrey';

writeFile(markdownOutputPath, `${table}\n`);
writeFile(prCommentPath, `### Acceptance Tests\n\n${table}\n`);
writeFile(
  badgeJsonPath,
  `${JSON.stringify({ schemaVersion: 1, label: 'AC', message, color }, null, 2)}\n`,
);

console.log(table);
