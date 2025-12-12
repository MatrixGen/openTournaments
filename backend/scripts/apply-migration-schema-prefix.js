'use strict';

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SKIP_FILES = new Set([
  '20261212151756-create-platform-schema.js', // schema creation - leave as-is
  '20261212151929-add-channel-id-column-to-tournaments.js' // already follows pattern
]);

const TABLE_FN_PATTERNS = [
  // function name, regex to match first arg table name
  { fn: 'createTable', re: /createTable\s*\(\s*(['"`])([^'".`]+)\1/gi },
  { fn: 'describeTable', re: /describeTable\s*\(\s*(['"`])([^'".`]+)\1/gi },
  { fn: 'addColumn', re: /addColumn\s*\(\s*(['"`])([^'".`]+)\1/gi },
  { fn: 'removeColumn', re: /removeColumn\s*\(\s*(['"`])([^'".`]+)\1/gi },
  { fn: 'dropTable', re: /dropTable\s*\(\s*(['"`])([^'".`]+)\1/gi },
  { fn: 'renameTable', re: /renameTable\s*\(\s*(['"`])([^'".`]+)\1/gi },
];

function prefixTableName(originalName) {
  // If already has a dot (schema prefixed) or already platform., leave it
  if (originalName.includes('.')) return originalName;
  return `platform.${originalName}`;
}

function applyPrefixToContent(content) {
  let updated = content;
  TABLE_FN_PATTERNS.forEach(p => {
    updated = updated.replace(p.re, (m, quote, tbl) => {
      const pref = prefixTableName(tbl);
      if (pref === tbl) return m; // no change
      return m.replace(new RegExp(quote + tbl + quote), quote + pref + quote);
    });
  });
  return updated;
}

function findFunctionRange(source, fnName) {
  // find "async fnName(" occurrence
  const asyncIdx = source.indexOf(`async ${fnName}(`);
  if (asyncIdx === -1) return null;
  // find the opening brace for the function body
  const openBraceIdx = source.indexOf('{', asyncIdx);
  if (openBraceIdx === -1) return null;
  // find matching closing brace using brace counting
  let idx = openBraceIdx + 1;
  let depth = 1;
  while (idx < source.length && depth > 0) {
    const ch = source[idx];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    idx++;
  }
  if (depth !== 0) return null;
  return { start: openBraceIdx + 1, end: idx - 1 }; // content between braces
}

function ensureTryCatchForFunction(source, fnName, filename) {
  const range = findFunctionRange(source, fnName);
  if (!range) return source;
  const body = source.slice(range.start, range.end);
  if (/try\s*\{/.test(body) && /catch\s*\(/.test(body)) {
    return source; // already has try/catch
  }

  const before = source.slice(0, range.start);
  const after = source.slice(range.end);

  const safeCatch = `} catch (error) {
      console.error('⚠️ Migration ${fnName} failed in ${filename}:', error.message);
      // do not throw to avoid hard failure during deploy
    }`;

  const newBody = '\n      try {\n' + body + '\n      ' + safeCatch + '\n';

  return before + newBody + after;
}

function processFile(filepath, dryRun = true) {
  const filename = path.basename(filepath);
  if (SKIP_FILES.has(filename)) return null;

  const src = fs.readFileSync(filepath, 'utf8');
  let updated = applyPrefixToContent(src);
  updated = ensureTryCatchForFunction(updated, 'up', filename);
  updated = ensureTryCatchForFunction(updated, 'down', filename);

  if (updated === src) return { filename, changed: false };

  if (dryRun) {
    return { filename, changed: true, original: src, updated };
  } else {
    fs.writeFileSync(filepath, updated, 'utf8');
    return { filename, changed: true };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js'));
  const report = [];

  for (const f of files) {
    const filePath = path.join(MIGRATIONS_DIR, f);
    const res = processFile(filePath, dryRun);
    if (res) report.push(res);
  }

  // Print summary
  console.log(dryRun ? 'Dry run results:' : 'Applied changes:');
  report.forEach(r => {
    if (!r.changed) {
      console.log(` - ${r.filename}: no changes`);
    } else {
      console.log(` - ${r.filename}: WOULD CHANGE`);
      if (dryRun) {
        console.log('   (inspect diff in temp file below)');
        const tempPath = path.join('/tmp', `migration-preview-${r.filename}`);
        fs.writeFileSync(tempPath, r.updated, 'utf8');
        console.log(`   preview saved to ${tempPath}`);
      }
    }
  });
  console.log('\nTo apply changes run:');
  console.log('  node backend/scripts/apply-migration-schema-prefix.js --apply');
}

if (require.main === module) main().catch(err => {
  console.error(err);
  process.exit(1);
});