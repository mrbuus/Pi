"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkTitles } = require("./check-formula-titles.cjs");

test("different slugs in separate sections cannot share a database name", () => {
  assert.throws(
    () =>
      checkTitles([
        {
          file: "first.json",
          formulas: [{ slug: "first", title: "Synthetic shared title" }],
        },
        {
          file: "second.json",
          formulas: [{ slug: "second", title: "Synthetic shared title" }],
        },
      ]),
    /Duplicate formula title.*first.json#first and second.json#second/,
  );
});
test("distinct titles remain valid and all entries are counted", () => {
  assert.equal(
    checkTitles([
      {
        file: "first.json",
        formulas: [{ slug: "first", title: "Synthetic one" }],
      },
      {
        file: "second.json",
        formulas: [{ slug: "second", title: "Synthetic two" }],
      },
    ]),
    2,
  );
});
test("missing titles cannot evade the uniqueness check", () => {
  assert.throws(
    () =>
      checkTitles([
        { file: "first.json", formulas: [{ slug: "missing", title: " " }] },
      ]),
    /title is missing/,
  );
});
