/**
 * Emit JSON Schema for every canonical entity into `schemas/`.
 *
 * The Zod definitions in `packages/contracts/src` are the single source of
 * truth. The generated JSON Schemas are what the Python pipeline and the
 * catalogue validator consume, which is how the two languages stay aligned.
 *
 *   npm run schemas:build   regenerate
 *   npm run schemas:check   fail if the committed files are stale (CI gate)
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { CANONICAL_SCHEMAS } from '../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const outDir = join(repoRoot, 'schemas');

const checkOnly = process.argv.includes('--check');

const BASE_URI = 'https://letzscan.lu/schemas';

function render(name: string, schema: z.ZodType): string {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
    // Input semantics: a field with a declared default is optional and carries
    // its default. Catalogue files are hand-authored, so they must not be forced
    // to restate every default; a fully populated emitted artifact still
    // validates. Unknown keys are rejected either way, which is what stops a
    // provider field name leaking into a canonical record.
    io: 'input',
  });
  const document = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE_URI}/${name}.schema.json`,
    ...jsonSchema,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

const expected = new Map<string, string>();
for (const [name, schema] of Object.entries(CANONICAL_SCHEMAS)) {
  expected.set(`${name}.schema.json`, render(name, schema));
}

if (checkOnly) {
  const problems: string[] = [];
  let onDisk: string[] = [];
  try {
    onDisk = readdirSync(outDir).filter((f) => f.endsWith('.schema.json'));
  } catch {
    problems.push(`schemas/ is missing. Run: npm run schemas:build`);
  }

  for (const file of onDisk) {
    if (!expected.has(file)) problems.push(`schemas/${file} has no canonical entity`);
  }
  for (const [file, content] of expected) {
    let actual: string;
    try {
      actual = readFileSync(join(outDir, file), 'utf8');
    } catch {
      problems.push(`schemas/${file} is missing`);
      continue;
    }
    if (actual.replace(/\r\n/g, '\n') !== content) {
      problems.push(`schemas/${file} is out of date`);
    }
  }

  if (problems.length > 0) {
    console.error('Generated schemas are stale:\n');
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('\nRun: npm run schemas:build');
    process.exit(1);
  }
  console.log(`schemas/ is up to date (${expected.size} canonical entities).`);
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [file, content] of expected) {
    writeFileSync(join(outDir, file), content, 'utf8');
  }
  console.log(`Wrote ${expected.size} schemas to schemas/`);
}
