// Local read-only verification: node src/document-import/inspect-docx.cjs /absolute/book.docx ...
require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const { previewDocx } = require('./docx-parser');
function flatten(blocks) { return blocks.flatMap(b => b.rows ? [b, ...flatten(b.rows.flat(2))] : [b]); }
(async () => {
  if (!process.argv.slice(2).length) throw new Error('Provide one or more local DOCX paths.');
  for (const filename of process.argv.slice(2)) {
    try {
      const preview = await previewDocx(fs.readFileSync(filename), path.basename(filename));
      const blocks = flatten(preview.blocks); const counts = {};
      for (const warning of [...preview.warnings, ...blocks.flatMap(b => b.warnings)]) counts[warning.code] = (counts[warning.code] ?? 0) + 1;
      console.log(JSON.stringify({ filename: path.basename(filename), blocks: blocks.length, equationCount: preview.equationCount, warnings: counts }));
    } catch (error) { process.exitCode = 1; console.log(JSON.stringify({ filename: path.basename(filename), rejected: error.message })); }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
