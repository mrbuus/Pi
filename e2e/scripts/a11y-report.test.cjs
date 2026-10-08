"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { readReport } = require("./a11y-report.cjs");
function withReport(data, check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-a11y-report-"));
  const file = path.join(dir, "report.json");
  try {
    fs.writeFileSync(file, JSON.stringify(data));
    check(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const audit = {
  key: "mobile|PUBLIC|/synthetic",
  route: "/synthetic",
  recording: true,
  fingerprints: [],
};
function report(outcome = "expected", unexpected = 0) {
  return {
    stats: { unexpected },
    errors: [],
    suites: [
      {
        specs: [
          {
            title: "synthetic audit",
            tests: [
              {
                projectName: "mobile",
                status: outcome,
                expectedStatus: outcome === "unexpected" ? "failed" : "passed",
                results: [
                  {
                    status: "passed",
                    attachments: [
                      {
                        name: "a11y-result",
                        body: Buffer.from(JSON.stringify(audit)).toString(
                          "base64",
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
const cli = (file) =>
  spawnSync(process.execPath, [path.join(__dirname, "a11y-report.cjs"), file], {
    encoding: "utf8",
  });
test("unexpected passing tests cannot make the report CLI green", () => {
  withReport(report("unexpected", 1), (file) => {
    assert.equal(readReport(file).failures.length, 1);
    assert.equal(cli(file).status, 1);
  });
});
test("a zero-audit report cannot masquerade as complete evidence", () => {
  withReport({ stats: { unexpected: 0 }, errors: [], suites: [] }, (file) => {
    assert.match(readReport(file).evidenceErrors[0], /No accessibility/);
    assert.equal(cli(file).status, 1);
  });
});
test("summaries retain recording mode and successful runner outcomes", () => {
  withReport(report(), (file) => {
    const summary = readReport(file);
    assert.equal(summary.audits[0].recording, true);
    assert.equal(summary.completedAudits, 1);
    assert.equal(cli(file).status, 0);
  });
});
