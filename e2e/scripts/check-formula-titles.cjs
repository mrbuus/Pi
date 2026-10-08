#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");

// Explicit public formula inventory. Never glob sibling/private import data.
const sections = [
  "numbers-algebra",
  "equations-inequalities",
  "functions-exp-log",
  "trigonometry",
  "sequences-combinatorics-probability",
  "calculus",
  "plane-geometry",
  "solid-geometry-vectors-coordinates",
];
function checkTitles(documents) {
  const seen = new Map();
  let count = 0;
  for (const { file, formulas } of documents) {
    if (!Array.isArray(formulas))
      throw Error(`${file}: formulas must be an array`);
    for (const formula of formulas) {
      const location = `${file}#${formula.slug}`;
      if (typeof formula.title !== "string" || !formula.title.trim())
        throw Error(`${location}: title is missing`);
      // Match the exact case-sensitive name written by seed-formulas.cjs.
      // Different slugs still collide with Formula.name @unique.
      const previous = seen.get(formula.title);
      if (previous)
        throw Error(
          `Duplicate formula title ${JSON.stringify(formula.title)}: ${previous} and ${location}`,
        );
      seen.set(formula.title, location);
      count++;
    }
  }
  return count;
}
function checkDirectory(directory) {
  const documents = sections.map((section) => {
    const file = `${section}.json`;
    const document = JSON.parse(
      fs.readFileSync(path.join(directory, file), "utf8"),
    );
    if (document.section?.slug !== section)
      throw Error(`${file}: section slug does not match filename`);
    return { file, formulas: document.formulas };
  });
  return { sections: documents.length, formulas: checkTitles(documents) };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3)
      throw Error(
        "Usage: node scripts/check-formula-titles.cjs [formula-directory]",
      );
    const result = checkDirectory(
      process.argv[2] ??
        path.resolve(__dirname, "../../api/prisma/data/formulas"),
    );
    console.log(
      `Unique formula titles: ${result.formulas} formulas across ${result.sections} sections`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { checkTitles, checkDirectory, sections };
