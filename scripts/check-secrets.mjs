#!/usr/bin/env node
/**
 * Cheap credential-hygiene gate.
 *
 * It is deliberately narrow: it catches the two mistakes that are easy to make
 * and expensive to undo in a public repository.
 *
 *   1. A file that is supposed to hold local secrets got committed
 *      (.env, .dev.vars, service-account JSON, key material).
 *   2. A high-entropy provider credential was pasted into a tracked file.
 *
 * It is not a replacement for a real scanner. When the repository goes public,
 * enable GitHub secret scanning and push protection as well.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const FORBIDDEN_PATHS = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /(^|\/)\.dev\.vars$/,
  /(^|\/)\.dev\.vars\.(?!example$)[^/]+$/,
  /(^|\/)[^/]*service-account[^/]*\.json$/,
  /\.(pem|p12|pfx|key|keystore)$/,
];

const SECRET_PATTERNS = [
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: 'Assigned secret-looking literal',
    re: /\b(?:api[_-]?key|access[_-]?id|accessid|secret|token|password|passwd)\b\s*[:=]\s*['"][A-Za-z0-9/+_-]{24,}['"]/i,
  },
];

// Files that legitimately document the *shape* of a credential.
const ALLOWLIST = [
  /(^|\/)\.env\.example$/,
  /(^|\/)\.dev\.vars\.example$/,
  /(^|\/)scripts\/check-secrets\.mjs$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)uv\.lock$/,
  /(^|\/)SECURITY\.md$/,
];

const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|zip|gz|parquet|pmtiles|pdf)$/i;
const MAX_BYTES = 512 * 1024;

/**
 * Tracked files plus untracked-but-not-ignored ones, so a secret is caught
 * before it is committed rather than after.
 */
function candidateFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' },
  );
  return [...new Set(out.split('\0').filter(Boolean))];
}

const problems = [];

for (const file of candidateFiles()) {
  if (ALLOWLIST.some((re) => re.test(file))) continue;

  if (FORBIDDEN_PATHS.some((re) => re.test(file))) {
    problems.push(`${file}: local-secret file is tracked by git`);
    continue;
  }

  if (BINARY_EXT.test(file)) continue;
  let size;
  try {
    size = statSync(file).size;
  } catch {
    continue; // deleted but still indexed
  }
  if (size > MAX_BYTES) continue;

  const content = readFileSync(file, 'utf8');
  for (const { name, re } of SECRET_PATTERNS) {
    const match = re.exec(content);
    if (match) {
      const line = content.slice(0, match.index).split('\n').length;
      problems.push(`${file}:${line}: possible ${name}`);
    }
  }
}

if (problems.length > 0) {
  console.error('Credential hygiene check failed:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    '\nSecrets belong in Cloudflare secrets (wrangler secret put) or GitHub Actions secrets.\n' +
      'If this is a false positive, add the file to the allowlist in scripts/check-secrets.mjs.',
  );
  process.exit(1);
}

console.log(`Credential hygiene check passed (${candidateFiles().length} files scanned).`);
