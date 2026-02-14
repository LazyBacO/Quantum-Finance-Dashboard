import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.env.PLAYWRIGHT_JSON_REPORT || 'playwright-report/results.json';
const outputPath = process.env.AC_STATUS_OUTPUT || 'ac_status.md';

function collectTests(node, tests = []) {
  if (!node || typeof node !== 'object') {
    return tests;
  }

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

function toAcStatusMap(tests) {
  const acStatuses = new Map();

  for (const test of tests) {
    const sourceText = `${test.title || ''} ${test.location?.file || ''}`;
    const tags = [...sourceText.matchAll(/@AC-(\d+)/g)].map((match) => `AC-${match[1]}`);

    if (tags.length === 0) {
      continue;
    }

    const results = Array.isArray(test.results) ? test.results : [];
    const hasFailure = results.some((result) => !['passed', 'skipped'].includes(result.status));
    const status = hasFailure ? 'FAIL' : 'PASS';

    for (const ac of tags) {
      const previous = acStatuses.get(ac);
      if (previous === 'FAIL') {
        continue;
      }
      acStatuses.set(ac, status);
    }
  }

  return acStatuses;
}

function buildMarkdown(acStatuses) {
  const rows = ['AC | Status', '---|---'];
  const sortedKeys = [...acStatuses.keys()].sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    rows.push(`${key} | ${acStatuses.get(key)}`);
  }

  if (sortedKeys.length === 0) {
    rows.push('N/A | NO_TAGGED_TEST_FOUND');
  }

  return rows.join('\n');
}

function buildPrComment(acStatuses) {
  const sortedKeys = [...acStatuses.keys()].sort((a, b) => a.localeCompare(b));
  const lines = ['### Acceptance Tests'];

  if (sortedKeys.length === 0) {
    lines.push('Aucun test tagué @AC trouvé.');
    return lines.join('\n');
  }

  for (const ac of sortedKeys) {
    lines.push(`- ${ac} ${acStatuses.get(ac)}`);
  }

  return lines.join('\n');
}

if (!fs.existsSync(reportPath)) {
  const missingMessage = `Playwright report not found at ${reportPath}`;
  console.error(missingMessage);
  fs.writeFileSync(outputPath, 'AC | Status\n---|---\nN/A | REPORT_NOT_FOUND\n', 'utf8');
  fs.writeFileSync('ac_pr_comment.md', `### Acceptance Tests\n- N/A REPORT_NOT_FOUND\n`, 'utf8');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const tests = collectTests(report);
const acStatuses = toAcStatusMap(tests);
const markdown = buildMarkdown(acStatuses);
const prComment = buildPrComment(acStatuses);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${markdown}\n`, 'utf8');
fs.writeFileSync('ac_pr_comment.md', `${prComment}\n`, 'utf8');

console.log(markdown);
