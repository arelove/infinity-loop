// Print the CHANGELOG.md section for a given version.
//   node .github/scripts/changelog.mjs 1.1.0
// A leading "v" is stripped, so a git tag like "v1.1.0" works too.
// If the version is not found, falls back to the first released section
// (the topmost "## [x.y.z]" after "## [Unreleased]").
import { readFileSync } from 'node:fs';

const wanted = (process.argv[2] || '').replace(/^v/, '').trim();
const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);

const isHeading = (l) => /^##\s+\[/.test(l);
const isUnreleased = (l) => /\[unreleased\]/i.test(l);

let start = -1;
if (wanted) {
  start = lines.findIndex((l) => isHeading(l) && l.includes(`[${wanted}]`));
}
if (start === -1) {
  start = lines.findIndex((l) => isHeading(l) && !isUnreleased(l));
}

let body = '';
if (start !== -1) {
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(isHeading);
  body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

process.stdout.write((body || 'See CHANGELOG.md for details.') + '\n');
