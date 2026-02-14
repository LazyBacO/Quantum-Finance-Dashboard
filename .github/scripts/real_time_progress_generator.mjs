import fs from 'node:fs';

function labelStatus(status) {
  const normalized = (status || 'unknown').toLowerCase();
  if (['success', 'pass', 'passed'].includes(normalized)) return 'PASS ✅';
  if (['failure', 'fail', 'failed', 'cancelled', 'timed_out'].includes(normalized)) return 'FAIL ❌';
  if (['in_progress', 'queued', 'requested'].includes(normalized)) return 'RUNNING ⏳';
  return 'UNKNOWN ⚪';
}

function buildSummary() {
  const date = new Date().toISOString();
  const latestCommit = process.env.LATEST_COMMIT || 'unknown';
  const ciStatus = process.env.CI_STATUS || 'unknown';
  const e2eStatus = process.env.E2E_STATUS || 'unknown';
  const acStatus = process.env.AC_STATUS || 'unknown';

  return [
    '<!-- OPENNOVA_REALTIME_PROGRESS -->',
    '# OpenNova - Real-time progress',
    '',
    `Date: ${date}`,
    '',
    '## Last commit',
    latestCommit,
    '',
    '## CI status',
    `- ${labelStatus(ciStatus)}`,
    '',
    '## E2E status',
    `- ${labelStatus(e2eStatus)}`,
    '',
    '## AC status',
    `- ${labelStatus(acStatus)}`,
    '',
  ].join('\n');
}

const content = buildSummary();
fs.writeFileSync('progress_summary.txt', content, 'utf8');
console.log(content);
