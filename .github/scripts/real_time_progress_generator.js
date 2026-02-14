import fs from 'node:fs';
import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function buildSummary() {
  const date = new Date().toISOString();
  const branch = run('git branch --show-current');
  const latestCommit = run('git log -1 --pretty=format:"%h - %s (%an, %ad)" --date=iso-strict');
  const recentCommits = run('git log -5 --pretty=format:"- %h - %s (%an, %ad)" --date=short');

  return [
    '<!-- OPENNOVA_REALTIME_PROGRESS -->',
    '# OpenNova - Real-time progress',
    '',
    `Date: ${date}`,
    `Branch: ${branch}`,
    '',
    '## Last commit',
    latestCommit,
    '',
    '## Recent commits',
    recentCommits || '- No commits found',
    '',
    '## CI status',
    '- Placeholder: CI status integration pending.',
    '',
  ].join('\n');
}

const content = buildSummary();
fs.writeFileSync('progress_summary.txt', content, 'utf8');
console.log(content);
