/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');

const playwrightReportPath = process.env.PLAYWRIGHT_JSON_REPORT || 'playwright-report/results.json';
const acResultsPath = process.env.AC_RESULTS_PATH || 'ac-results.json';

function collectTests(node, tests = []) {
  if (!node || typeof node !== 'object') return tests;

  if (Array.isArray(node.tests)) {
    tests.push(...node.tests);
  }

  if (Array.isArray(node.suites)) {
    for (const suite of node.suites) {
      collectTests(suite, tests);
    }
  }

  return tests;
}

function normalizeResult(test) {
  const results = Array.isArray(test.results) ? test.results : [];
  const hasFailure = results.some((run) => ['failed', 'timedOut', 'interrupted'].includes(run.status));
  const hasSkipped = results.length > 0 && results.every((run) => run.status === 'skipped');
  if (hasFailure) return 'fail';
  if (hasSkipped) return 'skip';
  return 'pass';
}

if (!fs.existsSync(playwrightReportPath)) {
  fs.writeFileSync(acResultsPath, '[]\n', 'utf8');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(playwrightReportPath, 'utf8'));
const tests = collectTests(report);
const statuses = new Map();

for (const test of tests) {
  const source = `${test.title || ''} ${(test.location && test.location.file) || ''}`;
  const tags = [...source.matchAll(/@AC-\d+/g)].map((match) => match[0]);

  if (tags.length === 0) continue;

  const status = normalizeResult(test);
  for (const tag of tags) {
    const previous = statuses.get(tag);
    if (previous === 'fail') continue;
    if (previous === 'skip' && status === 'pass') {
      statuses.set(tag, status);
      continue;
    }
    statuses.set(tag, previous || status);
  }
}

const entries = [...statuses.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([ac, status]) => ({ ac, status }));

fs.writeFileSync(acResultsPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(entries, null, 2));
